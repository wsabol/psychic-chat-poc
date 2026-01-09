# Database Schema Catalog
**Last Updated:** 2026-01-09
**Purpose:** Complete reference of all tables, columns, and their purposes for recovery and debugging

---

## Table: messages
**Purpose:** Stores encrypted chat messages (no plaintext content)
**Indexes:** user_id_hash, created_at

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Unique message identifier |
| role | VARCHAR(50) | - | Message sender (user/assistant) |
| content_encrypted | BYTEA | - | Encrypted message content |
| user_id_hash | VARCHAR(255) | - | Hashed user ID for message ownership |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Message creation time |

---

## Table: user_personal_info
**Purpose:** Core user account data with encrypted personal information and onboarding tracking
**Indexes:** email_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | User account ID |
| user_id | VARCHAR(50) | UNIQUE NOT NULL | Firebase user ID |
| email_hash | VARCHAR(64) | UNIQUE | Hashed email for lookups |
| password_hash | VARCHAR(255) | - | Password hash (for legacy) |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| email_verified_at | TIMESTAMP | - | When email was verified |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |
| is_suspended | BOOLEAN | DEFAULT FALSE | Account suspension status |
| suspension_end_date | TIMESTAMP | - | When suspension ends |
| deletion_requested_at | TIMESTAMP | - | When deletion was requested |
| deletion_status | VARCHAR(50) | - | Deletion status (requested/completed) |
| anonymization_date | TIMESTAMP | - | When anonymized |
| final_deletion_date | TIMESTAMP | - | Final deletion date |
| deletion_reason | VARCHAR(255) | - | Reason for deletion |
| subscription_status | VARCHAR(50) | - | Current subscription status |
| current_period_start | INTEGER | - | Subscription period start (Unix timestamp) |
| current_period_end | INTEGER | - | Subscription period end (Unix timestamp) |
| plan_name | VARCHAR(100) | - | Stripe plan name |
| price_amount | INTEGER | - | Price in cents |
| price_interval | VARCHAR(20) | - | Billing interval (month/year) |
| onboarding_step | VARCHAR(100) | - | Current onboarding step |
| onboarding_completed | BOOLEAN | DEFAULT FALSE | Onboarding completion flag |
| onboarding_started_at | TIMESTAMP | - | When onboarding started |
| onboarding_completed_at | TIMESTAMP | - | When onboarding completed |
| first_name_encrypted | BYTEA | - | Encrypted first name |
| last_name_encrypted | BYTEA | - | Encrypted last name |
| birth_date_encrypted | BYTEA | - | Encrypted birth date |
| birth_time_encrypted | BYTEA | - | Encrypted birth time |
| birth_city_encrypted | BYTEA | - | Encrypted birth city |
| birth_province_encrypted | BYTEA | - | Encrypted birth province/state |
| birth_country_encrypted | BYTEA | - | Encrypted birth country |
| birth_timezone_encrypted | BYTEA | - | Encrypted timezone |
| sex_encrypted | BYTEA | - | Encrypted gender |
| familiar_name_encrypted | BYTEA | - | Encrypted preferred name |
| phone_number_encrypted | BYTEA | - | Encrypted phone number |
| email_encrypted | BYTEA | - | Encrypted email |
| stripe_customer_id_encrypted | BYTEA | - | Encrypted Stripe customer ID |
| stripe_subscription_id_encrypted | BYTEA | - | Encrypted Stripe subscription ID |

---

## Table: user_astrology
**Purpose:** User's astrological data (sun, moon, rising signs, degrees)
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Record ID |
| user_id_hash | VARCHAR(255) | UNIQUE | Hashed user ID |
| zodiac_sign | VARCHAR(50) | - | Sun sign |
| astrology_data | JSONB | - | Full astrology JSON (sun, moon, rising with degrees) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last calculation update |

---

## Table: user_2fa_settings
**Purpose:** Two-factor authentication configuration
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Record ID |
| user_id_hash | VARCHAR(255) | UNIQUE NOT NULL | Hashed user ID |
| enabled | BOOLEAN | DEFAULT true | 2FA enabled status |
| phone_number_encrypted | BYTEA | - | Encrypted phone number for SMS |
| backup_phone_number_encrypted | BYTEA | - | Encrypted backup phone |
| method | VARCHAR(20) | DEFAULT 'sms' | 2FA method (sms/totp) |
| persistent_session | BOOLEAN | DEFAULT false | Allow persistent sessions |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Configuration creation |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last modification |

---

## Table: user_2fa_codes
**Purpose:** Active 2FA codes for verification
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Code ID |
| user_id_hash | VARCHAR(255) | NOT NULL | Hashed user ID |
| code | VARCHAR(10) | NOT NULL | Verification code |
| code_type | VARCHAR(50) | - | Code type (sms/email/backup) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Code generation time |
| expires_at | TIMESTAMP | - | Code expiration |
| used | BOOLEAN | DEFAULT false | Whether code was used |

---

## Table: audit_log
**Purpose:** Security audit trail of all user actions
**Indexes:** user_id_hash, created_at

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Log entry ID |
| user_id_hash | VARCHAR(255) | - | Hashed user ID |
| action | VARCHAR(100) | - | Action performed (LOGIN_SUCCESS, PASSWORD_CHANGE, etc.) |
| details | JSONB | - | Additional action details |
| ip_address_encrypted | BYTEA | - | Encrypted IP address |
| email_encrypted | BYTEA | - | Encrypted email (if relevant) |
| user_agent_encrypted | BYTEA | - | Encrypted user agent |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Action timestamp |

---

## Table: pending_migrations
**Purpose:** Track temporary users awaiting account migration
**Indexes:** temp_user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Record ID |
| temp_user_id | VARCHAR(50) | - | Temporary user ID |
| temp_user_id_hash | VARCHAR(255) | UNIQUE | Hashed temp user ID |
| email_encrypted | BYTEA | - | Encrypted email for migration |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Temp account creation |
| migrated | BOOLEAN | DEFAULT false | Migration completion status |
| migrated_at | TIMESTAMP | - | When migration completed |

---

## Table: security
**Purpose:** User security settings (phone, recovery methods, password history)
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Record ID |
| user_id_hash | VARCHAR(255) | UNIQUE NOT NULL | Hashed user ID |
| phone_number_encrypted | BYTEA | - | Encrypted primary phone |
| recovery_phone_encrypted | BYTEA | - | Encrypted recovery phone |
| recovery_email_encrypted | BYTEA | - | Encrypted recovery email |
| phone_verified | BOOLEAN | DEFAULT FALSE | Phone verification status |
| recovery_phone_verified | BOOLEAN | DEFAULT FALSE | Recovery phone verification status |
| recovery_email_verified | BOOLEAN | DEFAULT FALSE | Recovery email verification status |
| password_changed_at | TIMESTAMP | - | Last password change |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Settings creation |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |

---

## Table: security_sessions
**Purpose:** Active device sessions with encrypted tokens
**Indexes:** user_id_hash, firebase_token_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Session ID |
| user_id_hash | VARCHAR(255) | UNIQUE | Hashed user ID |
| firebase_token_encrypted | BYTEA | - | Encrypted Firebase token |
| firebase_token_hash | VARCHAR(255) | - | Hashed token for lookup |
| device_name_encrypted | BYTEA | - | Encrypted device name |
| ip_address_encrypted | BYTEA | - | Encrypted IP address |
| user_agent_encrypted | BYTEA | - | Encrypted user agent |
| last_active | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last activity time |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Session creation |

---

## Table: verification_codes
**Purpose:** Email/SMS verification codes during registration/recovery
**Indexes:** user_id_hash, code

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Code ID |
| user_id_hash | VARCHAR(255) | - | Hashed user ID |
| phone_number_encrypted | BYTEA | - | Encrypted phone number |
| email_encrypted | BYTEA | - | Encrypted email |
| code | VARCHAR(6) | NOT NULL | Verification code |
| code_type | VARCHAR(10) | DEFAULT 'sms' | Type (sms/email) |
| attempts | INT | DEFAULT 0 | Verification attempts |
| max_attempts | INT | DEFAULT 3 | Max attempts allowed |
| expires_at | TIMESTAMP | NOT NULL | Code expiration |
| verified_at | TIMESTAMP | - | When verified |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Code generation |

---

## Table: user_violations
**Purpose:** Track policy violations and account discipline
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Violation ID |
| user_id_hash | VARCHAR(255) | NOT NULL | Hashed user ID |
| violation_type | VARCHAR(50) | NOT NULL | Type of violation |
| violation_count | INT | DEFAULT 1 | Number of violations |
| violation_message | TEXT | - | Description of violation |
| severity | VARCHAR(20) | DEFAULT 'warning' | Severity level |
| is_active | BOOLEAN | DEFAULT true | Active status |
| is_account_disabled | BOOLEAN | DEFAULT false | Account disabled status |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Violation date |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |

---

## Table: user_account_lockouts
**Purpose:** Track account lockouts (too many failed logins)
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Lockout ID |
| user_id_hash | VARCHAR(255) | - | Hashed user ID |
| reason | VARCHAR(100) | - | Lockout reason |
| ip_addresses_encrypted | BYTEA | - | Encrypted IP addresses that triggered lockout |
| lock_expires_at | TIMESTAMP | - | When lockout expires |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Lockout creation |

---

## Table: user_consents
**Purpose:** GDPR/Privacy compliance - track T&C and privacy policy acceptance
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Consent record ID |
| user_id_hash | VARCHAR(255) | UNIQUE NOT NULL | Hashed user ID |
| terms_version | VARCHAR(50) | - | T&C version accepted |
| terms_accepted | BOOLEAN | DEFAULT FALSE | T&C acceptance status |
| terms_accepted_at | TIMESTAMP | - | When T&C accepted |
| privacy_version | VARCHAR(50) | - | Privacy policy version accepted |
| privacy_accepted | BOOLEAN | DEFAULT FALSE | Privacy acceptance status |
| privacy_accepted_at | TIMESTAMP | - | When privacy accepted |
| consent_astrology | BOOLEAN | DEFAULT FALSE | Consent for astrology readings |
| consent_chat_analysis | BOOLEAN | DEFAULT FALSE | Consent for chat analysis |
| consent_health_wellness | BOOLEAN | DEFAULT FALSE | Consent for health/wellness data |
| agreed_from_ip_encrypted | BYTEA | - | Encrypted IP address at acceptance |
| user_agent_encrypted | BYTEA | - | Encrypted user agent at acceptance |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |

---

## Table: user_login_attempts
**Purpose:** Simple login attempt tracking
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Attempt ID |
| user_id_hash | VARCHAR(255) | - | Hashed user ID |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Attempt time |

---

## Table: login_attempts
**Purpose:** Detailed login attempt records with encryption
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Attempt ID |
| user_id_hash | VARCHAR(255) | - | Hashed user ID |
| attempt_type | VARCHAR(50) | - | Type (success/failure) |
| email_attempted_encrypted | BYTEA | - | Encrypted email attempted |
| ip_address_encrypted | BYTEA | - | Encrypted IP address |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Attempt time |

---

## Table: user_sessions
**Purpose:** Active user sessions with device tracking
**Indexes:** user_id_hash, session_token_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Session ID |
| user_id_hash | VARCHAR(255) | - | Hashed user ID |
| session_token_hash | VARCHAR(255) | - | Hashed session token |
| device_type | VARCHAR(50) | - | Device type (mobile/desktop) |
| browser_name | VARCHAR(100) | - | Browser name |
| browser_version | VARCHAR(50) | - | Browser version |
| os_name | VARCHAR(100) | - | Operating system |
| os_version | VARCHAR(50) | - | OS version |
| device_name_encrypted | BYTEA | - | Encrypted device name |
| ip_address_encrypted | BYTEA | - | Encrypted IP address |
| user_agent_encrypted | BYTEA | - | Encrypted user agent |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Session creation |
| last_activity_at | TIMESTAMP | - | Last activity time |
| expires_at | TIMESTAMP | - | Session expiration |
| logged_out_at | TIMESTAMP | - | Logout time |
| status | VARCHAR(50) | - | Session status (active/expired) |
| is_2fa_verified | BOOLEAN | DEFAULT false | 2FA verification status |
| suspicious_activity | BOOLEAN | DEFAULT false | Suspicious activity flag |

---

## Table: account_deletion_audit
**Purpose:** Audit trail of account deletions
**Indexes:** user_id_hash

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Audit ID |
| user_id_hash | VARCHAR(255) | - | Hashed user ID |
| deletion_reason | TEXT | - | Reason for deletion |
| ip_address_encrypted | BYTEA | - | Encrypted IP at deletion |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Deletion timestamp |

---

## Table: user_preferences
**Purpose:** User language, voice, and Oracle settings
**Indexes:** user_id_hash, oracle_language, voice_selected

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | SERIAL | PRIMARY KEY | Preference ID |
| user_id_hash | VARCHAR(255) | NOT NULL UNIQUE | Hashed user ID |
| language | VARCHAR(10) | DEFAULT 'en-US' | UI language preference |
| response_type | VARCHAR(20) | DEFAULT 'full' | Response type (full/brief) |
| voice_enabled | BOOLEAN | DEFAULT TRUE | Voice output enabled |
| voice_selected | VARCHAR(50) | DEFAULT 'sophia' | Selected voice name for TTS (e.g., sophia, maya, nova) |
| oracle_language | VARCHAR(10) | DEFAULT 'en-US' | Oracle response language (regional variants: en-US, en-GB, es-MX, es-DO, fr-CA) |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | User timezone for display and notifications |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Preference creation |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last update |

---

## Summary
- **Total Tables:** 21
- **Total Columns:** ~200+
- **All user IDs stored as:** `user_id_hash` (hashed, except in user_personal_info.user_id for Firebase mapping)
- **All sensitive data:** Encrypted (BYTEA columns)
- **Critical encryption:** Messages, personal info, tokens, IP addresses, emails, phone numbers
- **Compliance tracking:** user_consents, audit_log, account_deletion_audit
