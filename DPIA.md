# Data Protection Impact Assessment (DPIA)

**Organization**: Psychic Chat Inc.  
**Processing Activity**: Psychic Chat Platform - User Data Processing  
**Date Completed**: December 10, 2025  
**Last Updated**: December 10, 2025  
**Assessment Version**: 1.0  
**Responsible Party**: Privacy Officer  

---

## 1. Executive Summary

This Data Protection Impact Assessment (DPIA) evaluates the data protection risks associated with the Psychic Chat platform, a subscription-based astrology and chat service. The assessment demonstrates that with implemented safeguards, residual risks are LOW to MEDIUM and acceptable.

**Overall Risk Level**: 🟢 **LOW** (After Mitigation)  
**Recommendation**: ✅ **APPROVED - Processing May Proceed**

---

## 2. Scope & Description of Processing

### 2.1 What Data Do We Process?

**Personal Data Categories**:
- **Identity Data**: First name, last name, email address
- **Contact Data**: Phone number (for 2FA)
- **Demographic Data**: Birth date, birth city, birth timezone, birth country, sex/gender
- **Service Data**: Chat messages, astrology readings, horoscope data
- **Technical Data**: IP addresses, user agent (device info), login timestamps
- **Behavioral Data**: User interactions, message history, feature usage

**Special Categories**:
- Pseudonymized data (user IDs are not personally identifiable)
- No biometric data
- No health data (explicitly blocked by guardrail)

### 2.2 Why Do We Process It? (Legal Basis)

**Primary Legal Basis**: Legitimate Interest (GDPR Article 6(1)(f))
- Providing personalized astrology services
- Improving service quality
- Detecting fraud and abuse
- Ensuring platform security

**Secondary Legal Basis**: Consent (GDPR Article 6(1)(a))
- Explicit consent for data analysis
- Explicit consent for astrology readings

**Data Protection**: Data minimization principle applied - only necessary data collected.

### 2.3 Who Are the Data Subjects?

- **Active Users**: People with active accounts using the platform
- **Temporary Users**: Anonymous visitors using demo/trial features
- **Deleted Users**: Users in grace period (30 days) or anonymized (1-2 years)

**Estimated Data Subjects**: ~500 active users (development stage)

### 2.4 Recipients of Data

**Internal**:
- Oracle AI system (chat processing)
- Backend API (user profile management)
- Astrology calculation engine

**External**:
- **Firebase** (User authentication) - Google subsidiary, EU-US Data Processing Agreement
- **SendGrid** (Email delivery) - for verification codes, password resets
- **Twilio** (SMS/2FA) - for two-factor authentication codes
- **OpenAI** (Chat completions) - for Oracle AI responses
- **Stripe** (Payments) - if subscription model added

---

## 3. Necessity & Proportionality Analysis

### 3.1 Is Data Processing Necessary?

| Data Type | Purpose | Necessary? | Justification |
|-----------|---------|-----------|---------------|
| Email | Authentication, password reset | ✅ Yes | Essential for account management |
| First/Last Name | Personalization, address preferences | ✅ Yes | Improves user experience |
| Birth Data | Astrology calculations | ✅ Yes | Core service requirement |
| Phone Number | 2FA, security | ✅ Yes | Required for account security |
| IP Address | Fraud detection, abuse prevention | ✅ Yes | Platform security |
| Chat Messages | Service delivery, personalization | ✅ Yes | Core service requirement |
| User Agent | Security, device tracking | ✅ Yes | Detects unauthorized access |

**Conclusion**: All data is necessary and proportionate.

### 3.2 Data Minimization

**What We Don't Collect**:
- ❌ Credit card numbers (Stripe handles tokenized payments)
- ❌ Health data (explicitly blocked by guardrail)
- ❌ Location data beyond timezone
- ❌ Browsing history
- ❌ Third-party data

**What We Do Minimize**:
- ✅ No cookies for tracking
- ✅ No cross-site tracking
- ✅ No data sharing with advertisers
- ✅ No data enrichment from third parties

---

## 4. Risk Assessment

### 4.1 Risk Scenarios

#### Risk 1: Unauthorized Access (Data Breach)
**Severity**: 🔴 CRITICAL | **Likelihood**: 🟡 MEDIUM | **Overall Risk**: 🟠 HIGH

**What Could Happen**:
- Attacker gains database access (SQL injection, weak credentials)
- Personal data (email, birth date, messages) exposed
- Users' privacy violated, potential identity theft

**Affected Parties**:
- Users (privacy violation, identity theft risk)
- Organization (reputational damage, fines up to €20M or 4% revenue - GDPR)

**Mitigations**:
- ✅ AES-256 encryption at rest (all PII encrypted in database)
- ✅ TLS 1.3 encryption in transit (HTTPS everywhere)
- ✅ Strong authentication (JWT + 2FA)
- ✅ Database firewall (isolated network, no public access)
- ✅ Regular security audits
- ✅ Intrusion detection system (planned Phase 5)

**Residual Risk After Mitigation**: 🟢 LOW

---

#### Risk 2: Health Data Misuse (Liability)
**Severity**: 🔴 CRITICAL | **Likelihood**: 🟢 LOW | **Overall Risk**: 🟡 MEDIUM

**What Could Happen**:
- User discusses health symptoms with chatbot
- AI provides medical advice (not qualified)
- User relies on bad advice, health worsens
- Organization liable for damages

**Affected Parties**:
- Users (health harm, trust violation)
- Organization (lawsuits, regulatory action, fines)

**Mitigations**:
- ✅ Health content guardrail (blocks 80+ health keywords)
- ✅ Clear disclaimer in ToS (Section 10: "No Medical Advice")
- ✅ Data retention policy (auto-delete health discussions)
- ✅ User consent for chat analysis
- ✅ Audit log tracks all blocked messages

**Residual Risk After Mitigation**: 🟢 LOW

---

#### Risk 3: Unauthorized Data Processing
**Severity**: 🟡 MEDIUM | **Likelihood**: 🟢 LOW | **Overall Risk**: 🟡 MEDIUM

**What Could Happen**:
- Data used for purposes not disclosed (e.g., AI model training)
- User consent violated
- Regulatory investigation (GDPR Article 6)

**Affected Parties**:
- Users (privacy rights violated)
- Organization (fines up to €20M, processing ban)

**Mitigations**:
- ✅ Explicit consent required (users consent before any data use)
- ✅ Privacy Policy clearly states all uses
- ✅ User can withdraw consent anytime
- ✅ Consent audit trail (timestamp, IP, device recorded)
- ✅ Data export available (user can verify what's collected)

**Residual Risk After Mitigation**: 🟢 LOW

---

#### Risk 4: Data Retention Beyond Limit
**Severity**: 🟡 MEDIUM | **Likelihood**: 🟡 MEDIUM | **Overall Risk**: 🟡 MEDIUM

**What Could Happen**:
- User deletes account but data never actually deleted
- Compliance violation (storage limitation principle)
- Data kept for profit (re-selling, model training)

**Affected Parties**:
- Users (data kept beyond necessary period)
- Organization (GDPR violations, fines)

**Mitigations**:
- ✅ Data Retention Policy (max 2 years after deletion request)
- ✅ Automated scheduled deletion job (runs daily at 02:00 UTC)
- ✅ Anonymization at 1-year mark
- ✅ Re-engagement email opportunity at 1-year mark
- ✅ Audit log tracks all deletions
- ✅ Deletion verified in code review

**Residual Risk After Mitigation**: 🟢 LOW

---

#### Risk 5: Data Subject Rights Not Honored
**Severity**: 🟡 MEDIUM | **Likelihood**: 🟢 LOW | **Overall Risk**: 🟢 LOW

**What Could Happen**:
- User requests data export but gets nothing
- User requests deletion but data persists
- Organization ignores access requests

**Affected Parties**:
- Users (cannot exercise rights)
- Organization (GDPR penalties for non-compliance)

**Mitigations**:
- ✅ Data export endpoint (JSON + CSV formats)
- ✅ Account deletion endpoint (30-day grace period, reactivation possible)
- ✅ Audit log tracks all requests
- ✅ SLA: Respond to requests within 30 days
- ✅ Clear process documented in Privacy Policy

**Residual Risk After Mitigation**: 🟢 LOW

---

#### Risk 6: Third-Party Data Breach
**Severity**: 🟡 MEDIUM | **Likelihood**: 🟡 MEDIUM | **Overall Risk**: 🟡 MEDIUM

**What Could Happen**:
- Firebase, SendGrid, or Twilio suffers data breach
- User personal data exposed by third party
- Organization liable for third-party actions

**Affected Parties**:
- Users (data exposed by third party)
- Organization (liable under GDPR for processor selection)

**Mitigations**:
- ✅ Vendor selection (only reputable vendors with SOC2/ISO27001)
- ✅ Data Processing Agreements in place (required by GDPR Article 28)
- ✅ Incident response plan (72-hour notification)
- ✅ Regular vendor security reviews
- ✅ Minimal data shared (Firebase only gets email, not messages)

**Residual Risk After Mitigation**: 🟡 MEDIUM (Third-party dependent)

---

#### Risk 7: Consent Form Manipulation
**Severity**: 🟡 MEDIUM | **Likelihood**: 🟢 LOW | **Overall Risk**: 🟢 LOW

**What Could Happen**:
- Default consent options (all checked)
- Dark patterns in UI (hard to uncheck)
- Confusing language ("I understand the risks")
- Consent not freely given

**Affected Parties**:
- Users (consent not valid, rights violated)
- Organization (GDPR invalidates consent, processing stops)

**Mitigations**:
- ✅ Explicit opt-in (no pre-checked boxes)
- ✅ Clear language (plain English, not legal jargon)
- ✅ Separate checkboxes (not bundled consent)
- ✅ Easy to withdraw (one-click in settings)
- ✅ No penalties for non-consent (all core features work without optional consents)
- ✅ Consent form UI reviewed for accessibility

**Residual Risk After Mitigation**: 🟢 LOW

---

### 4.2 Risk Summary Table

| Risk | Severity | Likelihood | Residual | Status |
|------|----------|-----------|----------|--------|
| Data Breach | 🔴 Critical | 🟡 Medium | 🟢 Low | ✅ Acceptable |
| Health Liability | 🔴 Critical | 🟢 Low | 🟢 Low | ✅ Acceptable |
| Unauthorized Use | 🟡 Medium | 🟢 Low | 🟢 Low | ✅ Acceptable |
| Retention Violation | 🟡 Medium | 🟡 Medium | 🟢 Low | ✅ Acceptable |
| Rights Violation | 🟡 Medium | 🟢 Low | 🟢 Low | ✅ Acceptable |
| Consent Invalid | 🟡 Medium | 🟢 Low | 🟢 Low | ✅ Acceptable |
| Third-Party Breach | 🟡 Medium | 🟡 Medium | 🟡 Medium | ⚠️ Monitor |

---

## 5. Technical & Organizational Measures

### 5.1 Security Measures

**Encryption**:
- ✅ AES-256 encryption for all PII at rest
- ✅ TLS 1.3 for data in transit
- ✅ Encryption key stored in secure environment variables
- ✅ Regular key rotation (quarterly)

**Access Control**:
- ✅ JWT token-based authentication
- ✅ Role-based access control (planned)
- ✅ Account lockout after 5 failed login attempts
- ✅ 2FA required (email codes)
- ✅ Principle of least privilege

**Monitoring**:
- ✅ Comprehensive audit logging (all critical actions)
- ✅ Real-time alerts for failed login attempts (planned)
- ✅ Weekly security log review
- ✅ Automated intrusion detection (planned)

**Network Security**:
- ✅ HTTPS everywhere (no plaintext HTTP)
- ✅ HSTS enabled (force HTTPS)
- ✅ CSP headers configured
- ✅ X-Frame-Options: DENY
- ✅ Database isolated (no public access)

### 5.2 Organizational Measures

**Personnel**:
- ✅ Privacy Officer appointed
- ✅ Data protection training (planned annual)
- ✅ Access controls (need-to-know basis)
- ✅ Confidentiality agreements with all staff

**Processes**:
- ✅ Data minimization by design
- ✅ Privacy by design (encryption default)
- ✅ Regular security audits (planned quarterly)
- ✅ Incident response plan (documented)
- ✅ Data subject rights handling procedures

**Governance**:
- ✅ Privacy Policy (comprehensive)
- ✅ Terms of Service (20 sections)
- ✅ Data Retention Policy (2-year timeline)
- ✅ Sub-processor documentation
- ✅ DPA with all vendors

---

## 6. Compliance Assessment

### 6.1 GDPR Compliance

| Principle | Status | Evidence |
|-----------|--------|----------|
| Lawfulness | ✅ Compliant | Consent + Legitimate Interest documented |
| Fairness | ✅ Compliant | Transparent privacy policy, no dark patterns |
| Transparency | ✅ Compliant | Clear consent form, data export available |
| Purpose Limitation | ✅ Compliant | Explicit purposes stated, consent-based |
| Data Minimization | ✅ Compliant | Only necessary data collected |
| Accuracy | ✅ Compliant | Users can edit/correct all data |
| Storage Limitation | ✅ Compliant | Auto-delete after 2 years, scheduled job |
| Integrity & Confidentiality | ✅ Compliant | Encryption, access controls, audit logs |
| Accountability | ✅ Compliant | DPIA, audit logs, documentation |

**GDPR Status**: ✅ **COMPLIANT**

### 6.2 CCPA Compliance

| Right | Status | Implementation |
|------|--------|-----------------|
| Right to Know | ✅ Met | Data export (JSON/CSV) |
| Right to Delete | ✅ Met | Account deletion with grace period |
| Right to Opt-Out | ✅ Met | Consent management / email unsubscribe |
| No Discrimination | ✅ Met | No penalties for non-consent |

**CCPA Status**: ✅ **COMPLIANT**

### 6.3 PIPEDA Compliance

| Principle | Status | Evidence |
|-----------|--------|----------|
| Accountability | ✅ Met | Privacy Officer, audit logs |
| Identifying Purposes | ✅ Met | Privacy Policy clear |
| Consent | ✅ Met | Explicit consent required |
| Limiting Collection | ✅ Met | Data minimization applied |
| Limiting Use | ✅ Met | Purpose limitation enforced |
| Accuracy | ✅ Met | User correction rights |
| Safeguards | ✅ Met | Encryption, access controls |
| Openness | ✅ Met | Documentation, privacy policy |
| Access | ✅ Met | Data export |
| Challenges | ✅ Met | Contact privacy officer |

**PIPEDA Status**: ✅ **COMPLIANT**

---

## 7. Consultation & Stakeholder Input

### 7.1 Stakeholders Consulted

- ✅ Development Team (security implementation)
- ✅ Privacy Officer (compliance)
- ✅ Legal Team (contract review)

### 7.2 External Expertise

- ✅ GDPR guidelines reviewed (EDPB)
- ✅ Industry best practices assessed
- ✅ Third-party security certifications verified

---

## 8. Decisions & Recommendations

### 8.1 Processing Approval

**Decision**: ✅ **APPROVED - Processing may proceed**

**Justification**:
- All identified risks are at acceptable levels after mitigation
- Necessary security and organizational measures are in place
- Compliance with GDPR, CCPA, PIPEDA demonstrated
- Regular monitoring and audits planned

### 8.2 Conditions & Requirements

1. **Mandatory**:
   - Maintain encryption key security
   - Conduct security audits quarterly
   - Monitor data subject requests
   - Implement incident response procedures
   - Annual staff training on privacy

2. **Recommended**:
   - Deploy intrusion detection system (Phase 5)
   - Implement real-time alerts
   - Conduct penetration testing
   - Establish security bug bounty program
   - Update DPIA annually

3. **Monitoring**:
   - Review audit logs weekly
   - Monitor data breaches (none reported to date)
   - Track data subject requests
   - Monitor compliance with retention policy

---

## 9. Residual Risk Acceptance

### 9.1 Overall Residual Risk Level

**Risk Level**: 🟢 **LOW**

**Justification**:
- All high-risk scenarios have strong mitigations
- Encryption reduces breach impact significantly
- Automated deletion reduces retention risks
- Consent management ensures legitimate processing
- Audit trail enables detection of violations

### 9.2 Risk Acceptance Statement

We accept the residual risks identified in this DPIA. The organization commits to:

1. Maintaining all security measures as documented
2. Monitoring and reviewing risks annually
3. Immediately escalating any security incidents
4. Complying with all data subject requests
5. Implementing Phase 5 advanced hardening (intrusion detection)

---

## 10. Sign-Off & Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Privacy Officer | [Name] | December 10, 2025 | \_\_\_\_\_\_\_\_\_\_ |
| Data Protection Lead | [Name] | December 10, 2025 | \_\_\_\_\_\_\_\_\_\_ |
| Legal Officer | [Name] | December 10, 2025 | \_\_\_\_\_\_\_\_\_\_ |
| CEO/Executive | [Name] | December 10, 2025 | \_\_\_\_\_\_\_\_\_\_ |

---

## 11. Review Schedule

- **Next Review Date**: December 10, 2026
- **Trigger for Review**: 
  - Significant change in processing
  - Security incident
  - New regulation
  - Annual compliance review

---

**DPIA Completed**: December 10, 2025  
**Status**: ✅ APPROVED  
**Version**: 1.0  
**Confidentiality**: Internal Use Only
