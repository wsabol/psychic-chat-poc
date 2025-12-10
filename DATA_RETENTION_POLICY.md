# Data Retention Policy

**Effective Date**: December 10, 2025  
**Last Updated**: December 10, 2025  
**Version**: 1.0

---

## 1. Purpose

This Data Retention Policy outlines how long Psychic Chat retains user data and describes the retention schedule for different data categories. It ensures compliance with GDPR, CCPA, PIPEDA, and LGPD requirements while providing users with control over their personal information.

---

## 2. Retention Principles

- **Data Minimization**: We only retain data necessary to provide services
- **User Control**: Users can request deletion at any time
- **Grace Period**: 30-day recovery window before deletion begins
- **Anonymization**: PII is anonymized at 1-year mark
- **Permanent Deletion**: Complete deletion at 2-year mark
- **Audit Trail**: Deletion events are logged for compliance

---

## 3. Active Account Data Retention

### 3.1 User Profile Data (Indefinite - While Account Active)
**Data Included:**
- First name, last name, email address
- Birth date, birth city, birth timezone, birth country
- Phone number, sex/gender, familiar name
- Address preference

**Retention Period:** Indefinite (until account deletion)  
**Encryption:** AES-256 encrypted at database level  
**Access:** User can view/edit anytime in account settings  
**Deletion:** User initiates via "Delete Account" feature  

### 3.2 Consent Records (Indefinite - While Account Active)
**Data Included:**
- Consent flags (astrology, health data, chat analysis)
- Date consents were provided
- IP address and device information at time of consent
- User agent (browser/device details)

**Retention Period:** Indefinite (until account deletion)  
**Purpose:** Proof of compliance with consent requirements  
**Access:** User can view in account settings  
**Audit:** All consent changes logged  

### 3.3 Chat Messages (2 Years After Account Active)
**Data Included:**
- User messages
- Assistant/Oracle responses
- Timestamps
- Message metadata

**Retention Period:** 
- **While Account Active:** Indefinite
- **After Deletion Request:** 2 years (anonymized after 1 year)

**Encryption:** AES-256 encrypted at database level  
**Anonymization:** User ID replaced with hash at 1-year mark  
**Deletion:** Permanently deleted at 2-year mark  
**Purpose:** Service improvement, chat history for users  

### 3.4 Astrology Readings & Insights (2 Years After Account Active)
**Data Included:**
- Horoscope readings
- Tarot readings
- Birth chart data
- Astrological insights

**Retention Period:**
- **While Account Active:** Indefinite
- **After Deletion Request:** 2 years (anonymized after 1 year)

**Encryption:** AES-256 encrypted  
**Anonymization:** At 1-year mark  
**Deletion:** Permanently deleted at 2-year mark  
**Purpose:** User reference, service improvement  

---

## 4. Account Deletion Timeline

### Phase 1: Deletion Request (Day 0)
**What Happens:**
- User initiates account deletion
- Account marked as `deletion_status = 'pending_deletion'`
- `deletion_requested_at` timestamp recorded
- User receives confirmation email
- 30-day grace period begins

**Data Status:** All data preserved in encrypted form  
**User Access:** Can re-login to cancel deletion  
**Emails:** Receives cancellation link  

### Phase 2: Grace Period (Days 1-30)
**What Happens:**
- User can fully re-login to account
- All data accessible as normal
- If user logs in: deletion cancelled, account reactivated
- If no action: grace period expires

**Data Status:** Unchanged, all data preserved  
**User Access:** Full access if logs in  
**Automatic Action:** None (awaiting user action)  

### Phase 3: Grace Period Expires (Day 31)
**What Happens:**
- If user did not log in: deletion proceeds
- `deletion_status` changes to `pending_deletion`
- Account cannot be accessed
- User data begins anonymization countdown

**Data Status:** Account inaccessible, data preserved  
**User Access:** None (account locked)  
**Email:** Final notice sent (if available)  

### Phase 4: Anonymization (Day 365)
**What Happens:**
- 1-year anniversary of deletion request
- **Re-engagement email sent** to user's email address
  - Subject: "Your Psychic Chat History Will Be Deleted Soon"
  - Offers option to reactivate account
  - Shows date of permanent deletion
- PII begins anonymization
- `anonymization_date` recorded

**Data Anonymized:**
- First name → `DELETED_[user_id]`
- Last name → `DELETED_[user_id]`
- Email → `deleted_[user_id]@deleted.local`
- Phone number → Deleted
- Sex/gender → Deleted
- Familiar name → Deleted
- All encrypted fields set to NULL

**Data NOT Anonymized (for compliance):**
- Chat messages (content anonymized)
- Astrology readings (content anonymized)
- Audit logs (timestamped deletion records)
- Consent records (for compliance audit)

**User Access:** Still none (account locked)  
**Email:** Re-engagement opportunity message  

### Phase 5: Permanent Deletion (Day 730 / 2 Years)
**What Happens:**
- 2-year anniversary of deletion request
- If user did not reactivate: permanent deletion proceeds
- `deletion_status = 'deleted'`
- `final_deletion_date` recorded
- Data permanently removed from active database

**Data Deleted:**
- All anonymized personal information
- All encrypted chat messages
- All encrypted astrology readings
- User profile record (anonymized backup kept for 7 years)

**Data RETAINED (for legal compliance):**
- Anonymized audit log (7 years - legal requirement)
- Anonymized deletion record (indefinite - compliance proof)
- Anonymized consent record (7 years - compliance proof)

**User Access:** None  
**Backups:** Deleted from active backups after 30 days  

---

## 5. Reactivation Timeline

### During Grace Period (Days 1-30)
**User Action:** Login to account  
**Result:** 
- Deletion cancelled immediately
- `deletion_status = 'active'`
- All deletion dates cleared
- Account fully accessible
- Reactivation email sent

### After Grace Period (Days 31+)
**User Action:** Attempt to login  
**Result:** 
- Account locked (deletion in progress)
- Cannot reactivate
- Must contact support
- May be able to recover within next 334 days (until anonymization)

### During Anonymization Period (Days 31-364)
**Support Recovery:** Manual recovery possible  
**Result:**
- Support can reactivate account
- PII restored from backup
- Account fully accessible
- Recovery email confirmation sent

### After Anonymization (Days 365+)
**User Action:** Request recovery  
**Result:**
- Recovery not possible
- PII permanently anonymized
- Cannot restore personal information
- Can create new account instead

---

## 6. Special Data Categories

### 6.1 Audit Logs
**Retention:** 7 years  
**Content:**
- Login attempts (success/failure)
- Password changes
- Profile updates
- Consent changes
- Data exports
- Account deletions
- 2FA events

**Encryption:** Encrypted at rest  
**Anonymization:** User identifying info anonymized at 1-year mark  
**Purpose:** Compliance, investigation, security  
**Deletion:** Automatic after 7 years  

### 6.2 Failed Login Attempts
**Retention:** 90 days  
**Content:**
- Timestamp
- IP address
- User ID
- Failure reason

**Purpose:** Security, account lockout tracking  
**Deletion:** Automatic after 90 days  

### 6.3 Consent Records
**Retention:** 7 years (minimum GDPR requirement)  
**Content:**
- Consent date
- Consent type
- IP address (proof of location)
- User agent (device info)
- Consent changes

**Encryption:** Encrypted  
**Anonymization:** User ID anonymized at 1-year mark  
**Purpose:** Legal compliance, consent proof  

### 6.4 System Backups
**Retention:** 30 days  
**Content:** Complete database snapshots  
**Encryption:** Encrypted in transit and at rest  
**Deletion:** Automatic purge after 30 days  
**Exception:** Encrypted backups retained for 7 years (offline storage)  

---

## 7. Data Subject Rights

### 7.1 Right to Access (GDPR Article 15)
**Request:** `GET /user/export-data/:userId?format=json|csv`  
**Response Time:** Immediate (downloadable file)  
**Data Included:** All personal data in user's account  
**Format:** JSON or CSV  

### 7.2 Right to Deletion (GDPR Article 17)
**Request:** `DELETE /user/delete-account/:userId`  
**Grace Period:** 30 days  
**Anonymization:** 1 year after request  
**Permanent Deletion:** 2 years after request  
**Reactivation:** Possible within grace period  

### 7.3 Right to Correction (GDPR Article 16)
**Request:** User settings → Edit profile  
**Scope:** All user profile fields  
**Encryption:** Updated data re-encrypted  
**Audit:** All changes logged  

### 7.4 Right to Data Portability (GDPR Article 20)
**Request:** `GET /user/export-data/:userId?format=json`  
**Format:** Structured, machine-readable JSON  
**Completeness:** All data including messages and readings  
**Transferability:** Can be imported to other services  

### 7.5 Right to Object (GDPR Article 21)
**Processing:** User can withdraw consent for:
- Chat analysis
- Astrology readings
- Health data discussions

**Method:** Account settings → Consent management  
**Effect:** Future processing stops, past data retained per policy  
**Audit:** Withdrawal logged  

---

## 8. Compliance Summary

### GDPR Compliance
- ✅ Data minimization (only necessary data retained)
- ✅ Purpose limitation (data used for stated purposes)
- ✅ Storage limitation (specific retention periods)
- ✅ Right to access (export endpoint)
- ✅ Right to deletion (30-day grace period)
- ✅ Right to data portability (JSON export)
- ✅ Right to object (consent withdrawal)
- ✅ Data protection by design (encryption)

### CCPA Compliance
- ✅ Consumer right to know (export data)
- ✅ Consumer right to delete (30-day grace, 2-year total)
- ✅ Consumer right to opt-out (consent management)
- ✅ Non-discrimination (no penalties for exercising rights)
- ✅ Data retention limits (max 2 years before deletion)

### PIPEDA Compliance
- ✅ Accountability (detailed audit trail)
- ✅ Consent-based collection (explicit consent required)
- ✅ Accuracy (user correction rights)
- ✅ Safeguards (encryption, access controls)
- ✅ Openness (this policy document)
- ✅ User access (data export)
- ✅ Correction rights (edit profile)
- ✅ Challenges (contact privacy officer)

### LGPD Compliance
- ✅ Legitimate purpose (clear data usage)
- ✅ Necessity (only needed data collected)
- ✅ Transparency (privacy policy + this document)
- ✅ User rights (export, delete, correct)
- ✅ Data security (encryption)
- ✅ Accountability (audit logs)

---

## 9. Contact & Questions

**Privacy Officer:** privacy@psychicchat.app  
**Data Protection:** security@psychicchat.app  
**Legal:** legal@psychicchat.app  

For questions about your data retention or deletion request, please contact our Privacy Officer.

---

## 10. Policy Changes

We may update this policy from time to time. Significant changes will be communicated via email to active users. Continued use of the service constitutes acceptance of updated policies.

---

**Last Updated:** December 10, 2025  
**Version:** 1.0  
**Effective Date:** December 10, 2025
