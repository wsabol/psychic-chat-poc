/**
 * Universal Error Logger - Works in api/, client/, and worker/
 * 
 * Features:
 * - api/: Logs errors to encrypted database
 * - client/: Sends errors to server via fetch (dev) or beacon (production)
 * - worker/: Structured logging to stdout (Docker captures it)
 */

let db = null;

// Lazy-load db when needed (inside api/ only - skipped in client/worker)
async function getDb() {
  if (typeof window === 'undefined' && !db) {
    try {
      // Only api/ has access to db. Client and worker skip this.
      // Try to require db from parent directory context
      // Using dynamic import to avoid webpack static analysis in client
      const tryLoadDb = async () => {
        try {
          // This will only work if running in api/ context
          const module = await import('./db.js');
          return module.db || null;
        } catch (e) {
          return null;
        }
      };
      db = await tryLoadDb();
    } catch (e) {
      // Silently fail - db.js not available in this context
    }
  }
  return db;
}

export async function logErrorFromCatch(error, service, context = null, userIdHash = null, ipAddress = null, severity = 'error') {
  try {
    // Handle null/undefined error
    if (!error) {
      error = new Error('Unknown error');
    }
    
    // Ensure service is a string, not an object
    const serviceStr = typeof service === 'string' ? service : JSON.stringify(service);
    
    // Extract error message safely
    let errorMessage = 'Unknown error';
    if (error && typeof error === 'object' && error.message) {
      errorMessage = String(error.message).split('\n')[0].substring(0, 500);
    } else if (error && typeof error === 'string') {
      errorMessage = error.split('\n')[0].substring(0, 500);
    } else if (error) {
      errorMessage = String(error).split('\n')[0].substring(0, 500);
    }
    
    // Prevent empty messages
    if (!errorMessage || errorMessage.trim() === '' || errorMessage === '{}') {
      errorMessage = 'Unknown error';
    }

    if (typeof window !== 'undefined') {
      return logErrorFromClient({ service: serviceStr, errorMessage, severity, context, stack: error?.stack });
    }

    const database = await getDb();
    if (database) {
      return await logErrorToDB({ service: serviceStr, errorMessage, severity, userIdHash, context, errorStack: error?.stack, ipAddress, database });
    }

    logToStdout(serviceStr, errorMessage, severity, context, error?.stack);
  } catch (logError) {
    if (typeof window === 'undefined') {
      console.error('[ERROR-LOGGER]', logError.message);
    }
  }
}

function logErrorFromClient({ service, errorMessage, severity, context, stack }) {
  // Always log to console in dev for visibility
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${service}] ${severity}: ${errorMessage}`, stack);
  }

  // Always send to server (both dev and production)
  const errorData = {
    service,
    errorMessage,
    severity,
    context,
    stack: stack ? stack.split('\n').slice(0, 3).join('\n') : undefined,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown'
  };

  try {
    if (process.env.NODE_ENV === 'development') {
      // Dev: use fetch for better error visibility
      fetch('http://localhost:3000/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
        keepalive: true
      }).catch(err => {
        // Silent fail - don't crash if logging fails
      });
    } else {
      // Production: use sendBeacon (doesn't block on unload)
      navigator.sendBeacon('/api/logs/error', JSON.stringify(errorData));
    }
  } catch (e) {
    // Silent fail - logging failure should not crash app
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
        // Ensure service is a string
        const serviceStr = typeof service === 'string' ? service : String(service);
        
        // Validate required fields
        if (!serviceStr) {
          console.error('[ERROR-LOGGER] Missing service name');
          return;
        }
        
        if (!errorMessage || errorMessage === '{}') {
          errorMessage = 'Unknown error';
        }

    const validSeverities = ['error', 'warning', 'critical'];
    const finalSeverity = validSeverities.includes(severity) ? severity : 'error';

    // Simple query - no complex encryption in template
    let query = `
      INSERT INTO error_logs (service, error_message, severity, user_id_hash, context)
      VALUES ($1, $2, $3, $4, $5)
    `;

    let params = [serviceStr, errorMessage || 'Unknown error', finalSeverity, userIdHash, context];

    // Add encrypted stack if present
    if (errorStack && process.env.ENCRYPTION_KEY) {
      query = `
        INSERT INTO error_logs (service, error_message, severity, user_id_hash, context, error_stack_encrypted)
        VALUES ($1, $2, $3, $4, $5, pgp_sym_encrypt($6, $7))
      `;
      params.push(errorStack);
      params.push(process.env.ENCRYPTION_KEY);
    }

    await database.query(query, params);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ERROR-LOG] ${serviceStr} | ${finalSeverity} | ${errorMessage}`);
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
