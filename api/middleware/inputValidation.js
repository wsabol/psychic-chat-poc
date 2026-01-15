/**
 * Input Validation & Sanitization Middleware
 * Prevents:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL Injection
 * - Command Injection
 * - Invalid data types
 * - Oversized payloads
 */

/**
 * Sanitize string input (remove potential XSS vectors)
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>\"']/g, char => ({
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }[char]))
    .trim();
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters' };
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);

  if (!hasUppercase || !hasLowercase) {
    return { valid: false, reason: 'Password must include uppercase and lowercase letters' };
  }

  if (!hasNumbers) {
    return { valid: false, reason: 'Password must include numbers' };
  }

  return { valid: true };
}

/**
 * Validate phone number format
 */
export function validatePhone(phone) {
  // Basic validation: +1 (123) 456-7890 or +1-123-456-7890
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s]?[0-9]{3}[-\s]?[0-9]{4,6}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate URL format
 */
export function validateURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON structure
 */
export function validateJSON(jsonString) {
  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Express middleware to validate request payload
 */
export function validateRequestPayload(req, res, next) {
  // Check Content-Type
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const contentType = req.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return res.status(400).json(
        res, 'Invalid Content-Type. Expected application/json'
      );
    }
  }

  // Check payload size (5MB limit)
  const maxSize = 5 * 1024 * 1024;
  const contentLength = parseInt(req.get('content-length') || 0);
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Payload too large. Maximum size is 5MB'
    });
  }

  // Check for suspicious patterns in URL
  const url = req.originalUrl.toLowerCase();
  const suspiciousPatterns = [
    'union select',
    'drop table',
    'exec(',
    'eval(',
    'script>',
    'onerror=',
    'onclick=',
    '../',
    '..%2f'
  ];

  for (const pattern of suspiciousPatterns) {
    if (url.includes(pattern)) {
      return res.status(400).json(
        res, 'Invalid request'
      );
    }
  }

  next();
}

/**
 * Validate and sanitize user input object
 */
export function validateUserInput(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;  // Skip optional fields
    }

    // Type check
    if (rules.type) {
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`${field} must be a string`);
        continue;
      }
      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`${field} must be a number`);
        continue;
      }
      if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${field} must be a boolean`);
        continue;
      }
      if (rules.type === 'email' && !validateEmail(value)) {
        errors.push(`${field} must be a valid email`);
        continue;
      }
      if (rules.type === 'phone' && !validatePhone(value)) {
        errors.push(`${field} must be a valid phone number`);
        continue;
      }
    }

    // Length check
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${field} must be at most ${rules.maxLength} characters`);
    }

    // Pattern check (regex)
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} has invalid format`);
    }

    // Custom validator
    if (rules.validate && !rules.validate(value)) {
      errors.push(`${field} is invalid`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize user object (remove sensitive fields)
 */
export function sanitizeUserObject(user) {
  const sanitized = { ...user };

  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.email_encrypted;
  delete sanitized.phone_number_encrypted;
  delete sanitized.api_key;
  delete sanitized.api_secret;
  delete sanitized.session_token;
  delete sanitized.refresh_token;

  return sanitized;
}

/**
 * Validate API request object
 */
export const API_REQUEST_SCHEMA = {
  email: {
    type: 'email',
    required: false,
    maxLength: 255
  },
  password: {
    type: 'string',
    required: false,
    minLength: 8,
    maxLength: 255
  },
  firstName: {
    type: 'string',
    required: false,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  lastName: {
    type: 'string',
    required: false,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'-]+$/
  },
  phoneNumber: {
    type: 'phone',
    required: false,
    maxLength: 20
  },
  message: {
    type: 'string',
    required: false,
    maxLength: 5000
  },
  birthDate: {
    type: 'string',
    required: false,
    pattern: /^\d{4}-\d{2}-\d{2}$/  // YYYY-MM-DD
  }
};

/**
 * Rate limiting by IP (basic implementation)
 */
export function rateLimit(requests = {}, maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    // Clean old entries
    for (const key in requests) {
      if (now - requests[key][0] > windowMs) {
        delete requests[key];
      }
    }

    // Initialize or update request count
    if (!requests[ip]) {
      requests[ip] = [now];
    } else {
      requests[ip].push(now);
    }

    // Check limit
    if (requests[ip].length > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    next();
  };
}

export default {
  sanitizeString,
  validateEmail,
  validatePassword,
  validatePhone,
  validateURL,
  validateJSON,
  validateRequestPayload,
  validateUserInput,
  sanitizeUserObject,
  rateLimit
};

