-- Create security table for storing encrypted phone/email data
CREATE TABLE IF NOT EXISTS security (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(255),  -- encrypted
  recovery_phone VARCHAR(255),  -- encrypted
  recovery_email VARCHAR(255),  -- encrypted
  phone_verified BOOLEAN DEFAULT FALSE,
  recovery_phone_verified BOOLEAN DEFAULT FALSE,
  recovery_email_verified BOOLEAN DEFAULT FALSE,
  password_changed_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_security_user_id ON security(user_id);

-- Create security_sessions table for device tracking
CREATE TABLE IF NOT EXISTS security_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  firebase_token VARCHAR(1024) NOT NULL,
  device_name VARCHAR(255),  -- e.g., "Toronto, Canada"
  ip_address VARCHAR(45),  -- supports IPv4 and IPv6
  user_agent VARCHAR(500),
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_security_sessions_user_id ON security_sessions(user_id);
CREATE INDEX idx_security_sessions_token ON security_sessions(firebase_token);

-- Create table for OTP verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  phone_number VARCHAR(255),  -- the phone being verified
  email VARCHAR(255),  -- the email being verified
  code VARCHAR(6) NOT NULL,
  code_type ENUM('sms', 'email') NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_verification_user_id (user_id),
  INDEX idx_verification_code (code)
);
