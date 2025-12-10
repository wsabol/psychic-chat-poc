# Sub-Processor Documentation

**Organization**: Psychic Chat Inc.  
**Document Date**: December 10, 2025  
**Last Updated**: December 10, 2025  
**Version**: 1.0  
**Regulatory Reference**: GDPR Article 28, CCPA § 1798.100(ag)

---

## 1. Introduction

This document lists all Sub-Processors (Data Processors) used by Psychic Chat to process personal data. Sub-Processors are third-party services that have access to user personal data on our behalf.

**Legal Requirement**: GDPR Article 28(2) requires explicit prior consent before engaging sub-processors.

---

## 2. Sub-Processor List

### 2.1 Authentication & Identity

#### **Firebase Authentication (Google Cloud)**

| Property | Details |
|----------|---------|
| **Service Name** | Firebase Authentication |
| **Provider** | Google Cloud (subsidiary: Alphabet Inc.) |
| **Purpose** | User identity management, password hashing, OAuth 2.0 provider |
| **Data Processed** | Email address, user ID, password hash, phone number (optional) |
| **Location** | US (United States) |
| **DPA Status** | ✅ EU-US Data Processing Agreement in place |
| **Security** | SOC 2 Type II, ISO 27001, encryption at rest & transit |
| **Retention** | Per Google's standard retention (account deletion removes data) |
| **User Rights** | Can request data deletion through Google |
| **Certifications** | ✅ SOC 2 Type II, ✅ ISO 27001, ✅ HIPAA (optional) |
| **Sub-Processors** | Google Cloud Infrastructure (see below) |

**Data Flow**:
```
User Email → Psychic Chat API → Firebase → Google Cloud
```

**Contract**: Standard Firebase Data Processing Addendum (DPA) - Available at https://firebase.google.com/terms/data-processing-addendum

---

### 2.2 Cloud Infrastructure & Storage

#### **Google Cloud Platform (GCP)**

| Property | Details |
|----------|---------|
| **Service Name** | Google Cloud Platform (Compute Engine, Cloud SQL, Cloud Storage) |
| **Provider** | Google Cloud (Alphabet Inc.) |
| **Purpose** | Database hosting, server compute, backup storage |
| **Data Processed** | All user personal data (encrypted at rest) |
| **Location** | US (us-central1 region) |
| **DPA Status** | ✅ EU-US Data Processing Agreement in place |
| **Security** | Encryption at rest (AES-256), encryption in transit (TLS 1.3) |
| **Compliance** | SOC 2 Type II, ISO 27001, FedRAMP (moderate) |
| **Backups** | Encrypted daily backups, 7-day retention |
| **User Rights** | Can export/delete data via Psychic Chat |

**Note**: Data is encrypted before transmission to GCP. GCP does not have access to unencrypted PII.

---

#### **Railway.app** (Infrastructure Hosting)

| Property | Details |
|----------|---------|
| **Service Name** | Railway.app (Development & Staging) |
| **Provider** | Railway.app |
| **Purpose** | Container orchestration, application hosting |
| **Data Processed** | Application code, configuration, environment variables |
| **Location** | US (various US regions) |
| **DPA Status** | ✅ Standard Terms (DPA available upon request) |
| **Security** | Docker containerization, network isolation, HTTPS |
| **Compliance** | SOC 2, encryption in transit |

**Note**: Development environment only. Production uses GCP.

---

### 2.3 Email & Communication

#### **SendGrid**

| Property | Details |
|----------|---------|
| **Service Name** | SendGrid Email Delivery |
| **Provider** | SendGrid (Twilio subsidiary) |
| **Purpose** | Transactional email (verification codes, password resets, re-engagement emails) |
| **Data Processed** | Email address, verification codes, user ID |
| **Location** | US (United States) |
| **DPA Status** | ✅ Data Processing Addendum (DPA) signed |
| **Security** | SOC 2 Type II, TLS 1.2+, encryption at rest |
| **Retention** | Email logs retained for 30 days (per Twilio policy) |
| **User Rights** | Users can unsubscribe, request deletion |
| **Sub-Processor** | Twilio (parent company) handles infrastructure |

**Data Flow**:
```
User Email → Psychic Chat API → SendGrid API → Email Provider
```

**Contract**: Twilio Data Processing Addendum - Available at https://www.twilio.com/legal/dpa

---

#### **Twilio**

| Property | Details |
|----------|---------|
| **Service Name** | Twilio SMS & 2FA Service |
| **Provider** | Twilio Inc. |
| **Purpose** | SMS messages (future), Two-Factor Authentication |
| **Data Processed** | Phone number, SMS content, user ID |
| **Location** | US (United States) |
| **DPA Status** | ✅ Data Processing Addendum (DPA) in place |
| **Security** | SOC 2 Type II, ISO 27001, encryption at rest |
| **Retention** | SMS logs per Twilio standard retention policy |
| **User Rights** | Can opt-out of 2FA, request deletion |

**Note**: Currently used for development. May be enabled for SMS 2FA in production.

---

### 2.4 AI & Chat Processing

#### **OpenAI (ChatGPT / GPT-4)**

| Property | Details |
|----------|---------|
| **Service Name** | OpenAI API (GPT-4, text-davinci-003) |
| **Provider** | OpenAI L.P. |
| **Purpose** | Oracle AI chatbot responses, text generation |
| **Data Processed** | User chat messages (not including PII) |
| **Location** | US (United States) |
| **DPA Status** | ✅ Data Processing Addendum in place |
| **Security** | SOC 2 Type II, encryption at rest & transit |
| **Retention** | Per OpenAI policy (30 days default, can be reduced) |
| **API Usage** | Configured with data privacy setting enabled |
| **User Rights** | Can request data deletion from OpenAI |

**Data Minimization**: Only chat messages sent (no email, phone, or birth data).

**Contract**: OpenAI Data Processing Addendum - https://openai.com/policies/terms-of-use

**Privacy Setting**: `disable_chat_history: false` (messages used to improve models)

---

### 2.5 Payment Processing

#### **Stripe** (Future)

| Property | Details |
|----------|---------|
| **Service Name** | Stripe Payment Processing |
| **Provider** | Stripe Inc. |
| **Purpose** | Subscription billing, payment processing |
| **Data Processed** | Name, email, billing address (tokenized card) |
| **Location** | US (United States) with EU processing option |
| **DPA Status** | ✅ Data Processing Addendum in place |
| **Security** | PCI DSS Level 1, SOC 2 Type II, encryption at rest |
| **Retention** | Per PCI compliance (varies by request type) |
| **User Rights** | Can delete payment methods, request history |

**Note**: Currently not integrated. To be added when subscription feature launches.

---

## 3. Data Flow Diagram

```
User Personal Data Flow:

┌─────────────────────────────────────────────────────────────────┐
│                    Psychic Chat Platform                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Psychic Chat API (Encrypted)                  │   │
│  │  • User Authentication                                   │   │
│  │  • Chat Message Processing                               │   │
│  │  • Data Export/Delete                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
        │                      │                        │
        ├──────────────────────┼────────────────────────┤
        │                      │                        │
        ▼                      ▼                        ▼
   ┌──────────┐          ┌────────────┐         ┌──────────────┐
   │ Firebase │          │ Google     │         │ SendGrid     │
   │ (Auth)   │          │ Cloud      │         │ (Email)      │
   │ ------   │          │ (Storage)  │         │ --------     │
   │ Email    │          │ -------    │         │ Email        │
   │ User ID  │          │ All Data   │         │              │
   │          │          │ (Encrypted)│         │              │
   └──────────┘          └────────────┘         └──────────────┘
        │                      │                        │
        └──────────────────────┼────────────────────────┘
                               │
                        ┌──────▼──────┐
                        │ OpenAI      │
                        │ (Chat API)  │
                        │ --------    │
                        │ Chat Msgs   │
                        │ (No PII)    │
                        └─────────────┘
```

---

## 4. Data Transfer Mechanisms

### 4.1 US to EU Data Transfers

**Current Mechanism**: EU-US Data Processing Agreements (DPA) / Standard Contractual Clauses (SCCs)

**Providers with US Locations**:
- ✅ Firebase (Google) - DPA signed
- ✅ Google Cloud - DPA signed
- ✅ SendGrid (Twilio) - DPA signed
- ✅ OpenAI - DPA signed

**Safeguards**:
- ✅ Encryption at rest (AES-256)
- ✅ Encryption in transit (TLS 1.3)
- ✅ Minimized data transfer (only necessary data)
- ✅ Standard Contractual Clauses (SCCs) in DPAs

**Schrems II Compliance**:
- Assessed supplementary technical measures
- Encryption provides additional safeguard against surveillance
- Can challenge US government requests through legal channels
- Data minimization reduces exposure

---

### 4.2 Data Transfer Minimization

| Service | Data Transferred | Justification |
|---------|------------------|---------------|
| Firebase | Email only | Required for authentication |
| GCP | All data (encrypted) | Required for secure storage |
| SendGrid | Email only | Required for transactional emails |
| OpenAI | Chat messages only | Chat processing (no PII sent) |
| Twilio | Phone number only | Required for 2FA |

**Principle**: Only necessary data transferred, always encrypted.

---

## 5. Sub-Processor Obligations

### 5.1 Data Processing Agreements (DPA)

All Sub-Processors have signed or agreed to Data Processing Agreements that include:

✅ **Mandatory Provisions** (GDPR Article 28):

1. Processing only on documented instructions
2. Confidentiality of staff
3. Security measures (encryption, access control, audit logging)
4. Sub-sub-processor authorization
5. Assistance with data subject rights
6. Assistance with compliance obligations
7. Deletion/return of data on termination
8. Audit rights for Psychic Chat
9. Notification of breaches within 72 hours
10. International transfer safeguards (SCCs)

---

### 5.2 Incident Response

**Sub-Processor Breach Notification**:
- Provider notifies Psychic Chat within **72 hours** (or as contractually required)
- Psychic Chat notifies users within **72 hours** (if required by law)
- Incident response procedures documented in `INCIDENT_RESPONSE.md`

---

## 6. Sub-Processor Changes

### 6.1 Notification Process

When adding or changing Sub-Processors:

1. **Assessment**: Evaluate data processing practices
2. **Review**: Ensure DPA terms are acceptable
3. **Notification**: Inform users (if processing changes materially)
4. **Documentation**: Update this file
5. **Approval**: Legal/Privacy team sign-off

### 6.2 User Consent

- **Current Policy**: Users implicitly consent to listed Sub-Processors
- **Transparency**: Privacy Policy lists all Sub-Processors
- **Opt-out**: If users object, can request alternative processing method

---

## 7. Compliance Certifications

### 7.1 Provider Security Certifications

| Provider | SOC 2 | ISO 27001 | FedRAMP | HIPAA |
|----------|-------|-----------|---------|-------|
| Google Cloud | ✅ Type II | ✅ Yes | ✅ Moderate | ✅ Yes |
| Firebase | ✅ Type II | ✅ Yes | ✅ N/A | ✅ Yes |
| SendGrid | ✅ Type II | ✅ Yes | ❌ No | ✅ Yes |
| Twilio | ✅ Type II | ✅ Yes | ❌ No | ✅ Yes |
| OpenAI | ✅ Type II | ✅ Yes | ❌ No | ❌ No |

---

## 8. Risk Assessment

### 8.1 Sub-Processor Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Data Breach** | 🔴 High | Encryption, DPA, incident response |
| **Unauthorized Access** | 🟡 Medium | Access controls, audit logging |
| **Outage/Service Loss** | 🟡 Medium | SLA terms, redundancy, backups |
| **Regulatory Non-Compliance** | 🟡 Medium | DPA, SOC2/ISO27001 certification |
| **Secret Government Access** | 🟡 Medium | Encryption, legal challenge rights |

---

## 9. User Rights & Sub-Processors

### 9.1 How Users Can Exercise Rights with Sub-Processors

**Data Subject Right**: **Right to Access**
- User can request copy of all data at any time
- Psychic Chat exports from GCP, Firebase, and other sources
- Data export includes all sub-processor data

**Data Subject Right**: **Right to Deletion**
- User can request account deletion
- Psychic Chat sends deletion requests to all sub-processors
- Firebase and GCP implement deletion automatically
- SendGrid/Twilio deletes via API

**Data Subject Right**: **Right to Rectification**
- User can update personal information
- Changes propagate to all sub-processors
- Correction logged in audit trail

---

## 10. Documentation & Records

### 10.1 Current Inventory

| Document | Status | Location |
|----------|--------|----------|
| DPA - Google | ✅ Signed | Google Cloud Console |
| DPA - SendGrid | ✅ Signed | Twilio Legal Portal |
| DPA - OpenAI | ✅ Signed | OpenAI Dashboard |
| Security Audits | ✅ Reviewed | Internal Records |
| Incident Response | ✅ Documented | `INCIDENT_RESPONSE.md` |

---

## 11. Contact & Questions

**For questions about Sub-Processors**:

| Topic | Contact |
|-------|---------|
| General | privacy@psychicchat.app |
| Data Protection | dpo@psychicchat.app |
| Incidents | security@psychicchat.app |
| Legal | legal@psychicchat.app |

---

## 12. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 10, 2025 | Initial documentation |

---

**Document Created**: December 10, 2025  
**Status**: ✅ APPROVED  
**Next Review**: December 10, 2026 (or upon significant change)  
**Confidentiality**: Internal Use Only
