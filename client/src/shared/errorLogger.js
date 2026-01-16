/**
 * Universal Error Logger - Works in api/, client/, and worker/
 * 
 * Features:
 * - api/: Logs errors to encrypted database
 * - client/: Sends errors to server via beacon (production) or logs (dev)
 * - worker/: Structured logging to stdout (Docker captures it)
 */

let db = null;

// Lazy-load db when needed (inside api/)
async function getDb() {
  if (typeof window === 'undefined' && !db) {
    try {
      const dbModule = await import('./api/shared/db.js').catch(() => null);
      if (dbModule && dbModule.db) db = dbModule.db;
    } catch (e) {
      // db.js might not exist in this environment
    }
  }
  return db;
}

export async function logErrorFromCatch(error, service, context = null, userIdHash = null, ipAddress = null, severity = 'error') {
  try {
    const errorMessage = (error?.message || 'Unknown error').split('\n')[0].substring(0, 500);

    if (typeof window !== 'undefined') {
      return logErrorFromClient({ service, errorMessage, severity, context, stack: error?.stack });
    }

    const database = await getDb();
    if (database) {
      return await logErrorToDB({ service, errorMessage, severity, userIdHash, context, errorStack: error?.stack, ipAddress, database });
    }

    logToStdout(service, errorMessage, severity, context, error?.stack);
  } catch (logError) {
    if (typeof window === 'undefined') {
      console.error('[ERROR-LOGGER]', logError.message);
    }
  }
}

function logErrorFromClient({ service, errorMessage, severity, context, stack }) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${service}] ${severity}: ${errorMessage}`, stack);
    return;
  }

  const errorData = {
    service,
    errorMessage,
    severity,
    context,
    stack: stack ? stack.split('\n').slice(0, 3).join('\n') : undefined,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  try {
    navigator.sendBeacon('/api/logs/error', JSON.stringify(errorData));
  } catch (e) {
    // Silent fail
  }
}

function logToStdout(service, errorMessage, severity, context, stack) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service,
    severity,
    message: errorMessage,
    context,
    environment: 'worker'
  };

  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.error(`[${service}] ${severity}: ${errorMessage}`, context, stack);
  }
}

async function logErrorToDB({
  service, errorMessage, severity = 'error', userIdHash = null, context = null, errorStack = null, ipAddress = null, database
}) {
  if (!database) return;

  try {
    if (!service || !errorMessage) {
      console.error('[ERROR-LOGGER] Missing required fields');
      return;
    }

    const validSeverities = ['error', 'warning', 'critical'];
    const finalSeverity = validSeverities.includes(severity) ? severity : 'error';

    let query = `INSERT INTO error_logs (service, error_message, severity, user_id_hash, context, error_stack_encrypted, ip_address_encrypted) VALUES ($1, $2, $3, $4, $5, ${errorStack ? 'pgp_sym_encrypt($6, $7)' : 'NULL'}, ${ipAddress ? (errorStack ? 'pgp_sym_encrypt($8, $7)' : 'pgp_sym_encrypt($8, $7)') : 'NULL'})`;

    let params = [service, errorMessage, finalSeverity, userIdHash, context];
    if (errorStack) {
      params.push(errorStack);
      params.push(process.env.ENCRYPTION_KEY);
    }
    if (ipAddress) {
      params.push(ipAddress);
      if (!errorStack) params.push(process.env.ENCRYPTION_KEY);
    }

    await database.query(query, params);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ERROR-LOG] ${service} | ${finalSeverity} | ${errorMessage}`);
    }
  } catch (dbError) {
    console.error('[ERROR-LOGGER] DB write failed:', dbError.message);
  }
}

export async function logWarning({ service, message, context = null, userIdHash = null }) {
  await logErrorFromCatch(new Error(message), service, context, userIdHash, null, 'warning');
}

export async function logCritical({ service, errorMessage, context = null, userIdHash = null, errorStack = null }) {
  const error = new Error(errorMessage);
  error.stack = errorStack;
  await logErrorFromCatch(error, service, context, userIdHash, null, 'critical');
}
