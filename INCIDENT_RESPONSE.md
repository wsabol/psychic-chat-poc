# Incident Response Plan

**Organization**: Psychic Chat Inc.  
**Document Date**: December 10, 2025  
**Last Updated**: December 10, 2025  
**Version**: 1.0  
**Regulatory References**: GDPR Article 33, CCPA § 1798.150, PIPEDA Section 7.2

---

## 1. Executive Summary

This Incident Response Plan outlines procedures for identifying, responding to, and reporting data breaches and security incidents affecting personal data. The plan ensures compliance with regulatory requirements, minimizes impact, and maintains user trust.

**Key Response Timelines**:
- 🔴 **Immediate**: Alert incident response team (upon detection)
- 🟡 **1-4 hours**: Investigation & containment
- 🟠 **24 hours**: Determine breach severity & impact
- 🟠 **72 hours**: Notify authorities (if required by law)
- 🟡 **30 days**: Notify affected users

---

## 2. Definitions

### 2.1 Data Breach

A "Data Breach" is:
- **Unauthorized access** to personal data
- **Accidental disclosure** of personal data
- **Loss or theft** of personal data
- **Unauthorized modification** of personal data
- **Unavailability** of personal data for extended period

**Examples**:
- ✅ Database hack exposing emails
- ✅ Leaked credentials (password, API key)
- ✅ Accidental public upload of backup files
- ✅ Ransomware attack making data inaccessible
- ✅ Employee exfiltrating customer data
- ❌ Spam email (no breach)
- ❌ Denial of service (not data breach unless data exposed)

### 2.2 Personal Data Breach vs. Security Incident

| Type | Requires Notification | Example |
|------|----------------------|---------|
| **Data Breach** | ✅ Yes (72h) | Database hacked, data exposed |
| **Security Incident** | ❌ No | Failed login attempt, malware detected but blocked |
| **Close Call** | ❌ No | Vulnerability discovered before exploitation |

---

## 3. Incident Response Team

### 3.1 Roles & Responsibilities

| Role | Name | Title | Contact | On-Call |
|------|------|-------|---------|---------|
| **Incident Commander** | [Name] | CTO / Security Lead | [Phone] | 24/7 |
| **Privacy Officer** | [Name] | Privacy Officer | [Phone] | 24/7 |
| **Legal Officer** | [Name] | General Counsel | [Phone] | Business Hours |
| **Communications** | [Name] | PR / Communications | [Phone] | 24/7 |
| **Technical Lead** | [Name] | Senior Backend Engineer | [Phone] | 24/7 |
| **Database Admin** | [Name] | DBA | [Phone] | On-Call |
| **Forensics** | [Name] | Security Consultant (external) | [Phone] | On-Call |

### 3.2 Escalation Matrix

```
Detection
    ↓
[Level 1: Engineer] Investigation (1 hour)
    ↓
[Level 2: Tech Lead] Containment (decision to escalate)
    ↓
[Level 3: Incident Commander] Breach assessment (notify team)
    ↓
[Level 4: Privacy Officer] Legal/regulatory notification
    ↓
[Level 5: CEO] Public communications & PR
```

---

## 4. Detection & Reporting

### 4.1 How Breaches Are Detected

**Automated Alerts**:
- ✅ Failed login attempts (>5 in 5 minutes)
- ✅ Unusual data access patterns
- ✅ Large data exports (planned: monitoring enabled)
- ✅ Database connection from unauthorized IP
- ✅ SSL certificate errors
- ✅ Failed backup operations
- ✅ Memory/storage anomalies

**Manual Detection**:
- ⚠️ User reports suspicious activity
- ⚠️ Security researcher reports vulnerability
- ⚠️ Third-party notification (e.g., Firebase breach notice)
- ⚠️ Ransom note / breach threat
- ⚠️ News/media reporting on company breach

**Investigation Questions**:
1. What data was exposed?
2. How many users affected?
3. When did the breach occur?
4. How was it discovered?
5. Is the breach ongoing?
6. What's the severity level?

### 4.2 Reporting Procedure

**Immediate Actions** (Upon Detection):

```
Detected? → Report to Incident Commander → 
                ↓
            Gather Evidence → 
                ↓
            Assess Severity → 
                ↓
            Notify Response Team →
                ↓
            Begin Investigation
```

**Who to Report**:
- **24/7**: Incident Commander (emergency line)
- **Email**: security@psychicchat.app (triggers alert)
- **Slack**: #security-incidents channel
- **Phone**: [On-call number for CTO]

---

## 5. Incident Classification

### 5.1 Severity Levels

#### **CRITICAL** 🔴
- **Impact**: 100+ users affected, highly sensitive data (emails, messages, birth dates)
- **Examples**: Full database breach, ransomware attack, customer data on dark web
- **Response Time**: Immediate (within 1 hour)
- **Notification**: Users + authorities (24-72 hours)

#### **HIGH** 🟠
- **Impact**: 10-100 users, sensitive data
- **Examples**: Unauthorized access to chat messages, API key leak
- **Response Time**: Urgent (within 4 hours)
- **Notification**: Authorities if applicable (72 hours), users advised

#### **MEDIUM** 🟡
- **Impact**: 1-10 users, limited data
- **Examples**: Email address leaked, failed authentication attempt, single account compromised
- **Response Time**: 24 hours
- **Notification**: Users (30 days), no public notification

#### **LOW** 🟢
- **Impact**: No user data leaked, security concern only
- **Examples**: Vulnerability found & patched before exploitation, spam attack
- **Response Time**: 5 business days
- **Notification**: Document only, no user notification

### 5.2 Assessment Flowchart

```
Incident Detected
    ↓
Is personal data involved? 
    ├─ NO → Security Incident (not data breach)
    └─ YES → Continue
    ↓
Was data actually exposed to unauthorized parties?
    ├─ NO → Close call / Incident (not breach)
    └─ YES → Data Breach Confirmed
    ↓
How many users affected?
    ├─ 100+ → CRITICAL 🔴
    ├─ 10-100 → HIGH 🟠
    ├─ 1-10 → MEDIUM 🟡
    └─ 0 (containment) → LOW 🟢
```

---

## 6. Investigation Process

### 6.1 Immediate Actions (First 4 Hours)

**Step 1: Preserve Evidence** (30 min)
- ✅ Take snapshots of affected systems
- ✅ Copy audit logs to secure storage
- ✅ Document breach discovery time
- ✅ Check backups for point-in-time restore

**Step 2: Containment** (30 min - 1 hour)
- ✅ **If ongoing**: Isolate affected systems
- ✅ Reset compromised credentials
- ✅ Revoke API keys / OAuth tokens
- ✅ Block suspicious IP addresses
- ✅ Enable enhanced monitoring

**Step 3: Assessment** (1-2 hours)
- ✅ Determine scope: What data? How many users?
- ✅ Verify breach vs. false alarm
- ✅ Document timeline: When? How?
- ✅ Identify root cause
- ✅ Assess ongoing risk

**Step 4: Severity Classification** (2-4 hours)
- ✅ Assign severity level (CRITICAL/HIGH/MEDIUM/LOW)
- ✅ Document impact assessment
- ✅ Present findings to Incident Commander
- ✅ Decide on notification timeline

### 6.2 Detailed Investigation (24-72 Hours)

**Forensic Analysis**:
- Review access logs for unauthorized activity
- Check file integrity (system files, database)
- Analyze network traffic for exfiltration
- Interview staff for suspicious activity
- Review all recent deployments/changes
- Check for persistence (backdoors, rootkits)

**Root Cause Analysis**:
- **Technical**: SQL injection? Weak credentials? Unpatched vulnerability?
- **Procedural**: Missing access control? Weak password policy?
- **Human**: Social engineering? Phishing? Insider threat?

**Timeline Documentation**:
```
[Date] [Time] [Event]
2025-12-10 14:00 Alert triggered: Unusual database queries
2025-12-10 14:05 Engineer reviews logs, confirms unauthorized access
2025-12-10 14:15 Database isolated, API keys revoked
2025-12-10 14:45 Forensics team begins investigation
2025-12-10 16:00 Initial assessment: 50 users affected, customer emails exposed
```

---

## 7. Notification & Communication

### 7.1 Regulatory Notification (GDPR Article 33)

**Authorities to Notify** (if required):

**If Data Breach = Risk to Rights/Freedoms**:
- 🔴 **Notify within 72 hours**: Data protection authority (e.g., ICO)
- 🔴 **Form**: Standardized breach notification form
- 🔴 **Content**: Breach facts, likely impact, measures taken

**Notification Exemptions**:
- ✅ If data encrypted & breach doesn't compromise encryption
- ✅ If breach unlikely to result in risk

**Data Protection Authority Contacts**:
- 🇬🇧 UK: Information Commissioner's Office (ICO)
- 🇪🇺 EU: National DPA (varies by member state)
- 🇨🇦 Canada: Office of the Privacy Commissioner (OPC)
- 🇺🇸 USA: State Attorneys General / FTC

### 7.2 User Notification (GDPR Article 34)

**Timing**: Within 30 days of confirming breach (or as soon as practical)

**Required Information**:
- ✅ Name of breach (factual description)
- ✅ Likely consequences for users
- ✅ Measures taken to respond
- ✅ Measures to prevent recurrence
- ✅ Contact point (privacy officer, support)

**Example Notification Email**:

```
Subject: Psychic Chat Security Incident - Action Required

Dear [User],

We are writing to inform you of a security incident that may have affected 
your account information.

What Happened?
On December 10, 2025, we discovered unauthorized access to our database 
between 14:00-14:30 UTC. We immediately isolated the affected systems 
and halted the unauthorized access.

What Information Was Affected?
Based on our investigation, the following information may have been 
accessed:
- Email address
- Birth date & timezone
- Chat message history (encrypted, but encrypted form accessed)

What Are We Doing?
✓ All compromised systems have been isolated and patched
✓ All user passwords have been reset (you'll need to login again)
✓ All API keys and tokens have been revoked
✓ Our security has been enhanced with additional monitoring

What Should You Do?
1. Change your password (if password was your only authentication)
2. Enable two-factor authentication in account settings
3. Review your recent chat history for suspicious activity
4. Contact us if you notice unauthorized account access

Support:
For questions, please contact privacy@psychicchat.app or call 
[support number].

We sincerely apologize for this incident. Your privacy is our top priority.

Psychic Chat Security Team
```

### 7.3 Public Communications

**When to Make Public Statement**:
- 🔴 CRITICAL: Immediately (same day)
- 🟠 HIGH: Within 24 hours
- 🟡 MEDIUM: Within 7 days (or as required by law)
- 🟢 LOW: No public statement needed

**Communication Channels**:
- ✅ Email to all affected users
- ✅ Blog post on website
- ✅ Twitter/social media
- ✅ Press release (for major breaches)
- ✅ Media outreach (for significant breaches)

**Key Messages**:
1. We detected a breach (transparency)
2. Here's what happened (facts, not speculation)
3. Here's the impact (be honest about scope)
4. Here's what we're doing (immediate response)
5. Here's how to protect yourself (actionable steps)
6. We're sorry (accountability)

---

## 8. Recovery & Mitigation

### 8.1 Short-Term Recovery (Days 1-7)

- ✅ Restore systems from clean backups
- ✅ Patch vulnerabilities
- ✅ Validate system integrity
- ✅ Restore service availability
- ✅ Reset affected user credentials
- ✅ Enable enhanced monitoring
- ✅ Complete forensic investigation

### 8.2 Long-Term Mitigation (Weeks 2-12)

- ✅ Implement preventive controls (IDS, WAF)
- ✅ Conduct penetration testing
- ✅ Update security policies
- ✅ Provide staff training
- ✅ Enhance access controls
- ✅ Improve encryption
- ✅ Conduct third-party security audit

### 8.3 Validation & Testing

**Post-Incident Validation**:
- [ ] Systems restored to clean state
- [ ] No remaining backdoors/malware
- [ ] Encryption keys not compromised
- [ ] Backups tested and working
- [ ] Monitoring systems functional
- [ ] Access controls enforced
- [ ] Incident won't recur

---

## 9. Documentation & Reporting

### 9.1 Incident Log

Every incident must be documented:

```
Incident ID: INC-2025-001
Date Detected: December 10, 2025
Severity: CRITICAL
Status: RESOLVED
Users Affected: 50
Data Compromised: Email addresses, chat messages (encrypted)
Root Cause: SQL injection in search endpoint
Detection Method: Automated alert
Response Time: 30 minutes to containment
Time to Resolve: 6 hours
```

### 9.2 Post-Incident Report

Within 7 days of resolution, complete:

**Executive Summary**
- What happened
- Impact (users, systems)
- Root cause
- Response timeline

**Technical Analysis**
- How breach occurred
- Proof of exploitation
- Data affected (with encryption status)
- Duration of unauthorized access

**Response Actions**
- Immediate containment steps
- Recovery process
- Notifications sent
- Regulatory compliance

**Lessons Learned**
- Root cause (not just symptom)
- Preventive measures
- Monitoring improvements
- Training recommendations

**Recommendations**
- Priority improvements
- Timeline for implementation
- Cost estimates
- Owner assignment

---

## 10. Prevention & Hardening

### 10.1 Ongoing Security Measures

**Infrastructure**:
- ✅ Regular vulnerability scans
- ✅ Penetration testing (quarterly)
- ✅ Dependency updates (monthly)
- ✅ Security patches (within 24-48 hours)
- ✅ Firewall rules (principle of least privilege)

**Data Security**:
- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Encryption key rotation (quarterly)
- ✅ Database activity monitoring
- ✅ Backup integrity testing

**Access Control**:
- ✅ Strong authentication (JWT + 2FA)
- ✅ Account lockout (5 failed attempts)
- ✅ IP whitelisting (critical systems)
- ✅ Minimal access grants
- ✅ Regular access reviews

**Monitoring & Detection**:
- ✅ Real-time alerting (failed logins, unusual data access)
- ✅ Log aggregation (centralized audit trail)
- ✅ Anomaly detection (AI-powered)
- ✅ Incident response automation (quarantine, alert)

### 10.2 Training & Awareness

- ✅ Annual security training (all staff)
- ✅ Phishing simulation (quarterly)
- ✅ Incident response drills (biannual)
- ✅ Privacy training (annual)
- ✅ Code security review (quarterly)

---

## 11. Communication Contacts

### 11.1 Internal Escalation

| Role | Name | Email | Phone | On-Call |
|------|------|-------|-------|---------|
| Incident Commander | [Name] | [Email] | [Phone] | 24/7 |
| Privacy Officer | [Name] | privacy@psychicchat.app | [Phone] | 24/7 |
| Legal Officer | [Name] | legal@psychicchat.app | [Phone] | Business Hours |

### 11.2 External Contacts

| Recipient | Contact | Purpose |
|-----------|---------|---------|
| UK ICO | https://ico.org.uk/report | GDPR Notification |
| EU DPA | [Member State] | GDPR Notification |
| OPC Canada | privacy@psychicchat.app | PIPEDA Notification |
| Firebase Security | https://firebase.google.com/support | Sub-processor breach |
| SendGrid Support | support@sendgrid.com | Sub-processor breach |

---

## 12. Testing & Exercises

### 12.1 Incident Response Drills

**Quarterly Tabletop Exercise**:
- Simulate breach scenario
- Test team response
- Validate communication procedures
- Identify gaps in plan

**Annual Full-Scale Exercise**:
- Simulate actual breach response
- Test technical recovery
- Practice notifications
- Measure response times

### 12.2 Drill Scenarios

**Scenario 1**: Database breach exposing 500 users
- Kickoff: "SQL injection found in search endpoint"
- Team response within 1 hour
- Full recovery within 6 hours

**Scenario 2**: Ransomware attack
- Kickoff: "All systems encrypted, ransom demand received"
- Containment: Isolate affected systems
- Recovery: Restore from backups

**Scenario 3**: Data exfiltration
- Kickoff: "User reports finding credentials on darkweb"
- Investigation: Scope of data leaked
- Notification: Determine regulatory requirements

---

## 13. Compliance Checklists

### 13.1 GDPR Breach Notification Checklist

- [ ] Breach confirmed (unauthorized access to personal data)
- [ ] Document incident details (what, when, who, how)
- [ ] Assess risk to rights & freedoms
- [ ] **If HIGH RISK**: Notify authority within 72 hours
- [ ] **If HIGH RISK**: Notify users without undue delay
- [ ] Document notification in incident file
- [ ] Follow up with authority if requested
- [ ] Monitor for secondary effects (identity theft, etc.)

### 13.2 CCPA Breach Notification Checklist

- [ ] Breach involves California residents
- [ ] Unencrypted/unredacted personal information accessed
- [ ] Document scope (what data, how many people)
- [ ] Determine notification timeline (as soon as practicable)
- [ ] Notify California Attorney General (if 500+ residents)
- [ ] Notify major media (if 500+ residents)
- [ ] Notify affected individuals
- [ ] Document notification process

### 13.3 PIPEDA Breach Notification Checklist

- [ ] Unauthorized access to personal information
- [ ] Reasonable belief of identity theft risk
- [ ] Document incident (what, when, why)
- [ ] Notify Privacy Commissioner (if material breach)
- [ ] Notify affected individuals
- [ ] Provide guidance on identity protection
- [ ] Document all notifications

---

## 14. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 10, 2025 | Initial incident response plan |

---

## 15. Plan Review & Updates

**Review Schedule**: Annually (December) or upon major incident

**Triggers for Update**:
- Major incident (testing plan effectiveness)
- Regulatory change
- New data processing activity
- Staff changes
- Technology changes

---

**Document Created**: December 10, 2025  
**Status**: ✅ APPROVED  
**Effective Date**: December 10, 2025  
**Confidentiality**: Internal Use Only - RESTRICTED

**Acknowledgment**: All incident response team members must acknowledge receipt and understanding of this plan.
