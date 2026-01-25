# HIPAA Compliance Checklist
**Project**: Centurion Unified Fitness Platform
**Date**: 2026-01-25
**Compliance Officer**: [To Be Assigned]
**Version**: 1.0

---

## Executive Summary

This checklist provides a comprehensive guide to achieving and maintaining HIPAA (Health Insurance Portability and Accountability Act) compliance for the Centurion fitness platform.

**PHI Scope**: The platform stores and processes Protected Health Information including:
- Weight, height, body measurements
- Sleep quality and duration data
- Perceived stress levels
- Heart rate and workout metrics (HealthKit)
- Health-related notes from coaches and clients

**Compliance Status**: 🟡 **Partial** (Technical safeguards implemented, administrative and organizational requirements in progress)

---

## HIPAA Overview

### What is HIPAA?

The Health Insurance Portability and Accountability Act (HIPAA) is a federal law that establishes national standards for protecting sensitive patient health information.

### Who Must Comply?

- **Covered Entities**: Health plans, healthcare providers, healthcare clearinghouses
- **Business Associates**: Vendors/contractors who handle PHI on behalf of covered entities
- **Centurion's Status**: **Business Associate** (fitness platform handling PHI for coaches/nutritionists)

### Key Requirements

1. **Privacy Rule**: How PHI can be used and disclosed
2. **Security Rule**: Technical safeguards for ePHI (electronic PHI)
3. **Breach Notification Rule**: Procedures when PHI is compromised
4. **Enforcement Rule**: Penalties for non-compliance

### Penalties for Non-Compliance

| Violation Type | Penalty Per Violation | Annual Maximum |
|----------------|----------------------|----------------|
| Unknowing | $100 - $50,000 | $1.5M |
| Reasonable Cause | $1,000 - $50,000 | $1.5M |
| Willful Neglect (corrected) | $10,000 - $50,000 | $1.5M |
| Willful Neglect (not corrected) | $50,000 | $1.5M |

---

## PHI Identification

### What is PHI?

Protected Health Information (PHI) includes any health information that can be linked to an individual, including:

### PHI in Centurion Platform

| Data Model | PHI Fields | Sensitivity | Why It's PHI |
|------------|------------|-------------|--------------|
| **Entry** | weight, sleepQuality, perceivedStress, notes | HIGH | Health metrics linked to individual |
| **HealthKitWorkout** | heartRate, calories, distance, duration | HIGH | Biometric health data |
| **SleepRecord** | totalSleep, deepSleep, remSleep, coreSleep | HIGH | Sleep health information |
| **CoachNote** | notes (about client health) | HIGH | Health observations by provider |
| **User** | name, email, birthDate | MEDIUM | Demographic identifiers |
| **OnboardingData** | currentWeight, targetWeight, activityLevel | HIGH | Health status information |

### Not PHI (De-identified Data)

- Aggregate statistics (e.g., "Average weight loss: 5 lbs")
- Anonymized analytics (no user identifiers)
- System logs without user data

---

## HIPAA Security Rule Compliance

### Administrative Safeguards (20 Requirements)

#### 1. Security Management Process

- [ ] **Risk Assessment** (§164.308(a)(1)(ii)(A))
  - Status: ✅ **Complete** (Security Baseline Report dated 2026-01-25)
  - Evidence: `/docs/SECURITY_BASELINE_REPORT.md`
  - Next Review: 2026-04-25 (90 days)

- [ ] **Risk Management** (§164.308(a)(1)(ii)(B))
  - Status: 🟡 **In Progress**
  - Action: Implement Priority 1-2 actions from baseline report
  - Deadline: Before production launch

- [ ] **Sanction Policy** (§164.308(a)(1)(ii)(C))
  - Status: ❌ **Missing**
  - Action: Document policy for workforce members who violate security policies
  - Template: See "Sanction Policy Template" below

- [ ] **Information System Activity Review** (§164.308(a)(1)(ii)(D))
  - Status: 🟡 **Partial** (Audit logs implemented, review process needed)
  - Action: Establish weekly review of audit logs for PHI access
  - Tools: Prisma Studio, custom admin dashboard

#### 2. Assigned Security Responsibility

- [ ] **Security Official** (§164.308(a)(2))
  - Status: ❌ **Missing**
  - Action: Designate individual responsible for HIPAA compliance
  - Recommendation: Platform owner or senior developer

#### 3. Workforce Security

- [ ] **Authorization and Supervision** (§164.308(a)(3)(ii)(A))
  - Status: ✅ **Complete** (RBAC system with CLIENT, COACH, ADMIN roles)
  - Evidence: `/lib/permissions.ts`, middleware.ts

- [ ] **Workforce Clearance** (§164.308(a)(3)(ii)(B))
  - Status: ⚠️ **Not Applicable** (solo developer, no workforce)
  - Note: Required if hiring employees/contractors

- [ ] **Termination Procedures** (§164.308(a)(3)(ii)(C))
  - Status: ⚠️ **Not Applicable** (no employees to terminate)
  - Note: Required if hiring workforce members
  - Procedure: Revoke database access, invalidate API keys, disable accounts

#### 4. Information Access Management

- [ ] **Access Authorization** (§164.308(a)(4)(ii)(B))
  - Status: ✅ **Complete** (Role-based permissions, ownership validation)
  - Evidence: API routes check `isCoach()`, `isAdmin()`, cohort ownership

- [ ] **Access Establishment and Modification** (§164.308(a)(4)(ii)(C))
  - Status: ✅ **Complete** (Admin can grant/revoke roles via `/api/admin/users/[id]/roles`)
  - Evidence: `/app/api/admin/users/[id]/roles/route.ts`

#### 5. Security Awareness and Training

- [ ] **Security Reminders** (§164.308(a)(5)(ii)(A))
  - Status: ⚠️ **Not Applicable** (solo developer)
  - Note: Required if hiring workforce

- [ ] **Protection from Malicious Software** (§164.308(a)(5)(ii)(B))
  - Status: ✅ **Complete** (Vercel hosting with DDoS protection)
  - Tools: Vercel security, npm audit for dependencies

- [ ] **Log-in Monitoring** (§164.308(a)(5)(ii)(C))
  - Status: 🟡 **In Progress** (Login events logged, monitoring dashboard needed)
  - Action: Create admin dashboard for failed login attempts
  - Evidence: `logAuthEvent()` in `/lib/audit.ts`

- [ ] **Password Management** (§164.308(a)(5)(ii)(D))
  - Status: 🟡 **Partial** (bcrypt hashing, weak policy)
  - Action: Strengthen password requirements (12+ chars, complexity)
  - Evidence: Updated in `/docs/RECOMMENDED_AUTH_CONFIG.md`

#### 6. Security Incident Procedures

- [ ] **Response and Reporting** (§164.308(a)(6)(ii))
  - Status: ❌ **Missing**
  - Action: Document incident response plan (see "Incident Response Plan Template")
  - Deadline: Before production launch

#### 7. Contingency Plan

- [ ] **Data Backup Plan** (§164.308(a)(7)(ii)(A))
  - Status: ✅ **Complete** (Railway PostgreSQL automatic backups)
  - Backup Frequency: Daily
  - Retention: 7 days (configurable to 30 days)
  - Recovery Time: < 1 hour

- [ ] **Disaster Recovery Plan** (§164.308(a)(7)(ii)(B))
  - Status: 🟡 **Partial** (Database backups, no documented procedure)
  - Action: Document recovery steps (see "Disaster Recovery Template")

- [ ] **Emergency Mode Operation Plan** (§164.308(a)(7)(ii)(C))
  - Status: ❌ **Missing**
  - Action: Define how to continue operations during system outage
  - Recommendation: Read-only mode, static status page

- [ ] **Testing and Revision** (§164.308(a)(7)(ii)(D))
  - Status: ❌ **Missing**
  - Action: Schedule annual DR drill
  - Deadline: Within 90 days of launch

- [ ] **Applications and Data Criticality Analysis** (§164.308(a)(7)(ii)(E))
  - Status: ✅ **Complete** (Database is critical, API is critical, frontend recoverable)
  - RTO (Recovery Time Objective): 4 hours
  - RPO (Recovery Point Objective): 24 hours

#### 8. Evaluation

- [ ] **Periodic Technical and Non-technical Evaluation** (§164.308(a)(8))
  - Status: 🟡 **In Progress** (Initial assessment complete, periodic review needed)
  - Action: Schedule quarterly security reviews
  - Next Review: 2026-04-25

#### 9. Business Associate Contracts

- [ ] **Written Contract with Business Associates** (§164.308(b)(1))
  - Status: ❌ **Critical Gap**
  - Required Vendors:
    - [ ] Vercel (hosting provider) - **REQUIRED**
    - [ ] Railway (database provider) - **REQUIRED**
    - [ ] Resend (email service) - **REQUIRED**
    - [ ] Google (OAuth provider) - **REQUIRED**
    - [ ] Apple (OAuth provider, if enabled) - **REQUIRED**
  - Action: Contact vendors to sign Business Associate Agreements (BAAs)
  - Template: See "BAA Requirements" below

---

### Physical Safeguards (4 Requirements)

#### 1. Facility Access Controls

- [ ] **Contingency Operations** (§164.310(a)(2)(i))
  - Status: ✅ **Complete** (Cloud-hosted, Vercel/Railway handle physical security)
  - Evidence: AWS/GCP data centers (SOC 2 certified)

- [ ] **Facility Security Plan** (§164.310(a)(2)(ii))
  - Status: ✅ **Complete** (Vendor responsibility)
  - Evidence: Vercel/Railway security certifications

- [ ] **Access Control and Validation** (§164.310(a)(2)(iii))
  - Status: ✅ **Complete** (Vendor responsibility)
  - Evidence: Data center access logs maintained by AWS/GCP

- [ ] **Maintenance Records** (§164.310(a)(2)(iv))
  - Status: ✅ **Complete** (Vendor responsibility)

#### 2. Workstation Use

- [ ] **Workstation Use Policy** (§164.310(b))
  - Status: 🟡 **Partial** (Developer workstation security needed)
  - Action: Document workstation security policy
  - Requirements:
    - Full disk encryption (FileVault on macOS)
    - Screen lock after 5 minutes
    - Firewall enabled
    - No PHI stored locally

#### 3. Workstation Security

- [ ] **Physical Safeguards for Workstations** (§164.310(c))
  - Status: ✅ **Complete** (Developer follows best practices)
  - Controls:
    - Password-protected laptop
    - No unattended workstation with PHI
    - Encrypted database backups

#### 4. Device and Media Controls

- [ ] **Disposal** (§164.310(d)(2)(i))
  - Status: ✅ **Complete** (No local PHI storage)
  - Policy: Database backups encrypted, deletion via Railway dashboard

- [ ] **Media Re-use** (§164.310(d)(2)(ii))
  - Status: ✅ **Complete** (Cloud-based, no physical media)

- [ ] **Accountability** (§164.310(d)(2)(iii))
  - Status: ✅ **Complete** (Database backups tracked by Railway)

- [ ] **Data Backup and Storage** (§164.310(d)(2)(iv))
  - Status: ✅ **Complete** (Railway automatic backups, encrypted at rest)

---

### Technical Safeguards (8 Requirements)

#### 1. Access Control

- [ ] **Unique User Identification** (§164.312(a)(2)(i))
  - Status: ✅ **Complete** (Email-based unique accounts)
  - Evidence: `User.email` unique constraint in Prisma schema

- [ ] **Emergency Access Procedure** (§164.312(a)(2)(ii))
  - Status: ✅ **Complete** (Admin override email via ADMIN_OVERRIDE_EMAIL env var)
  - Evidence: `/lib/permissions-server.ts` (isAdminWithOverride)

- [ ] **Automatic Logoff** (§164.312(a)(2)(iii))
  - Status: ✅ **Complete** (JWT token expiration after 7 days)
  - Evidence: `session.maxAge` in `/lib/auth.ts`

- [ ] **Encryption and Decryption** (§164.312(a)(2)(iv))
  - Status: 🟡 **Partial** (HTTPS + database encryption, no field-level encryption)
  - Current: TLS 1.3 for transit, PostgreSQL encryption at rest
  - Gap: No field-level encryption for highly sensitive fields
  - Recommendation: Consider encrypting `CoachNote.notes`, `Entry.notes`

#### 2. Audit Controls

- [ ] **Audit Logs for PHI Access** (§164.312(b))
  - Status: 🟡 **In Progress** (Audit log table exists, not consistently used)
  - Action: Implement `logPHIAccess()` in all routes accessing PHI
  - Evidence: `AuditLog` model in Prisma schema, `/lib/audit.ts`
  - **CRITICAL**: Required before production launch

#### 3. Integrity

- [ ] **Mechanism to Authenticate ePHI** (§164.312(c)(1))
  - Status: ✅ **Complete** (Prisma ORM prevents unauthorized modifications)
  - Evidence: Foreign key constraints, unique constraints, cascade deletes

- [ ] **Data Integrity Validation** (§164.312(c)(2))
  - Status: ✅ **Complete** (Zod validation on all inputs)
  - Evidence: `/lib/validations.ts`

#### 4. Person or Entity Authentication

- [ ] **Verify Identity of Users** (§164.312(d))
  - Status: ✅ **Complete** (JWT tokens, OAuth, password authentication)
  - Evidence: NextAuth.js v5 with Google/Apple OAuth + credentials provider

#### 5. Transmission Security

- [ ] **Integrity Controls** (§164.312(e)(2)(i))
  - Status: ✅ **Complete** (HTTPS enforced, TLS 1.3)
  - Evidence: Vercel automatic SSL certificates

- [ ] **Encryption** (§164.312(e)(2)(ii))
  - Status: ✅ **Complete** (TLS 1.3 for all API requests)
  - Evidence: Vercel enforces HTTPS, Railway enforces SSL

---

## HIPAA Privacy Rule Compliance

### 1. Notice of Privacy Practices

- [ ] **Provide Notice to Users** (§164.520)
  - Status: ❌ **Missing**
  - Action: Create and publish Privacy Policy
  - Template: See "Privacy Policy Template" below
  - Display: Footer link, signup flow acknowledgment

### 2. Uses and Disclosures

- [ ] **Obtain Authorization for Non-Treatment Uses** (§164.508)
  - Status: ❌ **Missing**
  - Action: Add consent checkbox to signup flow
  - Text: "I consent to sharing my health data with my assigned coach(es)"

- [ ] **Minimum Necessary Standard** (§164.502(b))
  - Status: ✅ **Complete** (API routes only return necessary fields)
  - Evidence: `select` clauses in Prisma queries limit fields

### 3. Individual Rights

- [ ] **Right to Access PHI** (§164.524)
  - Status: 🟡 **Partial** (Clients can view own data, no export feature)
  - Action: Add data export feature (JSON or PDF)
  - Route: `/api/user/export-data`

- [ ] **Right to Amend PHI** (§164.526)
  - Status: ✅ **Complete** (Clients can edit entries, change profile)
  - Evidence: Entry edit feature in client dashboard

- [ ] **Right to Request Restrictions** (§164.522)
  - Status: ❌ **Missing**
  - Action: Allow clients to restrict which coaches see specific data
  - Recommendation: Add "visibility" flag to Entry model

- [ ] **Right to Request Confidential Communications** (§164.522(b))
  - Status: ⚠️ **Not Applicable** (Email-only communication, user controls email)

- [ ] **Right to an Accounting of Disclosures** (§164.528)
  - Status: 🟡 **Partial** (Audit logs exist, no user-facing UI)
  - Action: Create "Access History" page for clients
  - Display: Who accessed my data and when

### 4. Safeguards

- [ ] **Administrative, Physical, and Technical Safeguards** (§164.530(c))
  - Status: 🟡 **In Progress** (Technical safeguards complete, admin/physical partial)
  - See sections above for detailed status

---

## HIPAA Breach Notification Rule

### 1. Breach Determination

- [ ] **Risk Assessment Process** (§164.402)
  - Status: ❌ **Missing**
  - Action: Document breach determination process
  - Template: See "Breach Assessment Worksheet" below

### 2. Individual Notification

- [ ] **Notify Affected Individuals within 60 Days** (§164.404(b))
  - Status: ❌ **Missing**
  - Action: Create breach notification email template
  - Requirements: Must include description, steps taken, mitigation advice

### 3. Media Notification

- [ ] **Notify Media if >500 Individuals Affected** (§164.406)
  - Status: ❌ **Missing**
  - Action: Prepare press release template
  - Trigger: Breach affecting >500 users

### 4. HHS Notification

- [ ] **Notify HHS Secretary** (§164.408)
  - Status: ❌ **Missing**
  - Action: Document HHS notification process
  - Timeline: Within 60 days (if >500 affected) or annually (if <500 affected)
  - Portal: https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf

---

## Implementation Roadmap

### Phase 1: Critical Requirements (Before Launch)

**Estimated Time**: 2 weeks

1. **Implement Audit Logging** (Priority 1)
   - Add `logPHIAccess()` to all routes accessing PHI
   - Test audit log creation
   - Verify logs include all required metadata
   - **Deliverable**: All PHI access logged

2. **Sign Business Associate Agreements** (Priority 1)
   - Contact Vercel, Railway, Resend, Google
   - Review BAA terms
   - Sign and store executed agreements
   - **Deliverable**: Signed BAAs with all vendors

3. **Create Incident Response Plan** (Priority 1)
   - Document breach response steps
   - Define notification procedures
   - Establish breach assessment process
   - **Deliverable**: Incident response plan document

4. **Publish Privacy Policy** (Priority 1)
   - Draft privacy policy using template
   - Review with legal counsel (recommended)
   - Publish on website
   - Add acknowledgment to signup flow
   - **Deliverable**: Published privacy policy

5. **Designate Security Official** (Priority 2)
   - Assign HIPAA compliance responsibility
   - Document contact information
   - **Deliverable**: Security official designated

6. **Create Sanction Policy** (Priority 2)
   - Document workforce violation procedures
   - Define penalties for policy violations
   - **Deliverable**: Sanction policy document

---

### Phase 2: Enhanced Compliance (Post-Launch)

**Estimated Time**: 4 weeks

7. **Data Export Feature** (Priority 3)
   - Build `/api/user/export-data` endpoint
   - Generate JSON or PDF export
   - Include all PHI associated with user
   - **Deliverable**: Data export functionality

8. **Access History Dashboard** (Priority 3)
   - Create client-facing "Who viewed my data" page
   - Display audit log entries for PHI access
   - Filter by date range, action type
   - **Deliverable**: Access history UI

9. **Disaster Recovery Testing** (Priority 3)
   - Simulate database failure
   - Test backup restoration
   - Document recovery steps
   - **Deliverable**: DR test report

10. **Quarterly Security Review Process** (Priority 4)
    - Schedule recurring security assessments
    - Review audit logs for anomalies
    - Update risk assessment
    - **Deliverable**: Quarterly review calendar

---

### Phase 3: Ongoing Compliance

**Monthly Tasks**:
- Review audit logs for suspicious activity
- Check for software vulnerabilities (`npm audit`)
- Verify BAAs remain valid

**Quarterly Tasks**:
- Conduct security risk assessment
- Review and update policies
- Test disaster recovery procedures
- Train new workforce members (if applicable)

**Annual Tasks**:
- Comprehensive HIPAA compliance audit
- Update Privacy Policy and Terms of Service
- Renew Business Associate Agreements
- Submit HHS breach report (if <500 breaches)

---

## Templates and Resources

### Sanction Policy Template

```markdown
# HIPAA Sanction Policy

**Effective Date**: [Date]
**Policy Owner**: [Security Official Name]

## Purpose
Establish consequences for workforce members who violate HIPAA policies.

## Scope
All employees, contractors, and third parties with access to PHI.

## Violations and Sanctions

| Violation | First Offense | Second Offense | Third Offense |
|-----------|--------------|----------------|---------------|
| Accessing PHI without authorization | Written warning | Suspension | Termination |
| Sharing PHI externally | Suspension | Termination | Legal action |
| Losing device containing PHI | Written warning | Suspension | Termination |
| Failure to report breach | Suspension | Termination | Legal action |
| Intentional HIPAA violation | Termination | Legal action | Criminal prosecution |

## Reporting Procedure
Workforce members must report violations to [Security Official Email] within 24 hours.

## Investigation Process
1. Security official investigates reported violation
2. Interview affected parties
3. Determine severity and appropriate sanction
4. Document decision in personnel file
5. Notify affected individual(s)

## Appeals Process
Workforce members may appeal sanctions within 14 days to [Appeals Contact].

## Documentation
All sanctions must be documented in the employee's personnel file.
```

---

### Incident Response Plan Template

```markdown
# HIPAA Breach Incident Response Plan

## 1. Discovery and Initial Response (0-24 hours)

**Actions**:
1. Identify the breach (who, what, when, where, how)
2. Contain the breach (revoke access, isolate systems)
3. Notify security official: [Email/Phone]
4. Do NOT notify users yet (premature notification can cause panic)

**Contact**:
- Security Official: [Name, Email, Phone]
- Legal Counsel: [Name, Email, Phone]
- IT Support: [Name, Email, Phone]

## 2. Breach Assessment (24-48 hours)

**Determine**:
- [ ] Was PHI involved? (If no, HIPAA breach rules don't apply)
- [ ] Number of individuals affected
- [ ] Type of PHI exposed (name, SSN, health records, etc.)
- [ ] Was PHI encrypted? (If yes, may not be breach)
- [ ] Unauthorized acquisition, access, use, or disclosure?

**Risk Assessment**:
Use worksheet below to determine if breach must be reported.

## 3. Mitigation (48-72 hours)

**Actions**:
1. Change passwords/credentials if compromised
2. Patch vulnerabilities
3. Restore from backups if data corrupted
4. Implement additional safeguards
5. Document mitigation steps taken

## 4. Notification (Within 60 days)

### If <500 Individuals Affected:
- Notify individuals within 60 days
- Log breach for annual HHS report
- No media notification required

### If ≥500 Individuals Affected:
- Notify individuals within 60 days
- Notify media (same timeline)
- Notify HHS Secretary immediately
- Prepare public statement

**Notification Must Include**:
- Brief description of breach
- Types of PHI involved
- Steps individuals should take
- Mitigation measures taken
- Contact information for questions

**Email Template**:
```
Subject: Important Security Notice - [Company Name]

Dear [Name],

We are writing to inform you of a recent security incident that may have affected your personal health information.

**What Happened**: [Brief description]

**What Information Was Involved**: [Types of PHI]

**What We Are Doing**: [Mitigation steps]

**What You Can Do**: [Recommended actions for affected individuals]

**Contact Information**: [Security official contact]

We sincerely apologize for this incident and are committed to protecting your information.

Sincerely,
[Company Name]
[Security Official Name]
```

## 5. Post-Incident Review (Within 90 days)

**Conduct**:
- Root cause analysis
- Update security policies
- Implement preventive measures
- Train workforce on lessons learned
- Document findings

**Report**:
Submit incident report to [Security Official] within 90 days.
```

---

### Breach Assessment Worksheet

Use this to determine if a breach occurred:

**Question 1**: Was PHI involved?
- [ ] Yes → Continue to Question 2
- [ ] No → Not a HIPAA breach

**Question 2**: Was there unauthorized acquisition, access, use, or disclosure?
- [ ] Yes → Continue to Question 3
- [ ] No → Not a HIPAA breach

**Question 3**: Was the PHI encrypted to NIST standards?
- [ ] Yes → Likely NOT a breach (low risk exception)
- [ ] No → Continue to Question 4

**Question 4**: Was the breach limited in scope and not likely to pose risk?
- [ ] Yes → May apply low probability exception (document justification)
- [ ] No → This IS a reportable breach

**Risk Factors to Consider**:
- [ ] Nature and extent of PHI involved
- [ ] Unauthorized person who accessed PHI
- [ ] Whether PHI was actually acquired or viewed
- [ ] Extent to which risk has been mitigated

**Conclusion**:
- [ ] **Reportable Breach** → Follow notification procedures
- [ ] **Not a Breach** → Document rationale and archive

---

### Privacy Policy Template

```markdown
# Privacy Policy

**Last Updated**: [Date]

## Introduction
[Company Name] ("we," "us," or "our") respects your privacy and is committed to protecting your personal health information.

## Information We Collect

### Personal Information
- Name and email address
- Date of birth
- Physical measurements (weight, height)

### Health Information (PHI)
- Daily health entries (weight, sleep, stress)
- Workout data from HealthKit
- Sleep records
- Health-related notes

### Usage Information
- Login history
- Device information
- IP address

## How We Use Your Information

### To Provide Services
- Display your health data to you
- Share your data with assigned coaches
- Generate progress charts and analytics

### To Improve Services
- Analyze aggregate trends (anonymized)
- Fix bugs and improve performance

### Legal Compliance
- Comply with HIPAA and other regulations
- Respond to legal requests

## How We Share Your Information

### With Your Coaches
Your assigned coaches can view your health data to provide coaching services.

### With Service Providers (Business Associates)
- Vercel (hosting)
- Railway (database)
- Resend (email)
- Google/Apple (authentication)

All service providers have signed Business Associate Agreements.

### We Do NOT Share
We do NOT sell your data to third parties.

## Your Rights

### Access
You can view all your data in your dashboard.

### Export
You can request a copy of your data by contacting [email].

### Delete
You can delete your account in Settings.

### Restrict
You can request restrictions on who sees your data by contacting [email].

## Data Security
We use industry-standard security measures:
- Encryption in transit (HTTPS/TLS 1.3)
- Encryption at rest (PostgreSQL encryption)
- Role-based access controls
- Audit logging

## Data Retention
We retain your data for as long as you have an active account. Deleted data is permanently removed within 30 days.

## Children's Privacy
Our service is not intended for children under 13.

## Changes to This Policy
We may update this policy. Changes will be posted with a new "Last Updated" date.

## Contact Us
For privacy questions, contact:
[Security Official Name]
[Email]
[Phone]

## Your HIPAA Rights
You have the right to:
- Access your health information
- Request corrections
- Request an accounting of disclosures
- Request restrictions on uses and disclosures
- File a complaint with HHS

To exercise these rights, contact [Security Official Email].
```

---

### Business Associate Agreement (BAA) Requirements

When contracting with vendors, ensure the BAA includes:

**Required Terms**:
1. **Uses and Disclosures**: BA may only use PHI for services specified
2. **Safeguards**: BA must implement appropriate safeguards
3. **Reporting**: BA must report breaches to Covered Entity
4. **Subcontractors**: BA must ensure subcontractors sign BAAs
5. **Access**: BA must provide PHI access to individuals upon request
6. **Accounting**: BA must provide accounting of disclosures
7. **Return or Destroy**: BA must return or destroy PHI upon termination
8. **Indemnification**: BA indemnifies CE for breaches

**Vendors Requiring BAA**:
- ✅ Vercel (hosting)
- ✅ Railway (database)
- ✅ Resend (email)
- ✅ Google (OAuth + potential future services)
- ✅ Apple (OAuth)

**Request Process**:
1. Contact vendor support
2. Request BAA (most SaaS providers have standard BAAs)
3. Review terms with legal counsel (recommended)
4. Sign and store executed BAA
5. Verify BAA annually

---

## Compliance Checklist Summary

### Critical (Must Complete Before Launch)
- [ ] Implement audit logging for all PHI access
- [ ] Sign Business Associate Agreements with all vendors
- [ ] Create and document incident response plan
- [ ] Publish Privacy Policy on website
- [ ] Designate security official
- [ ] Create sanction policy

### High Priority (Within 30 Days of Launch)
- [ ] Build data export feature
- [ ] Create access history dashboard for clients
- [ ] Test disaster recovery procedures
- [ ] Establish quarterly security review schedule

### Medium Priority (Within 90 Days)
- [ ] Conduct DR drill
- [ ] Implement field-level encryption for sensitive notes
- [ ] Add data restriction feature (clients control visibility)
- [ ] Create workforce training materials (if hiring)

### Ongoing
- [ ] Monthly audit log review
- [ ] Quarterly security assessment
- [ ] Annual HIPAA audit
- [ ] Annual BAA renewal

---

## Compliance Score

**Current Status**: 72/100

| Category | Weight | Score | Status |
|----------|--------|-------|--------|
| Technical Safeguards | 40% | 35/40 | 🟢 Good |
| Administrative Safeguards | 30% | 18/30 | 🟡 Partial |
| Physical Safeguards | 10% | 10/10 | 🟢 Complete |
| Privacy Rule | 15% | 6/15 | 🟡 Partial |
| Breach Notification | 5% | 3/5 | 🟡 Partial |

**Target for Production**: ≥90/100

**Actions to Reach 90+**:
1. Implement audit logging (+10 points)
2. Sign all BAAs (+5 points)
3. Publish Privacy Policy (+3 points)
4. Create incident response plan (+2 points)
5. Designate security official (+1 point)
6. Build data export feature (+2 points)

**Total Potential**: 95/100 ✅

---

## Resources

### HIPAA Official Resources
- HHS HIPAA Homepage: https://www.hhs.gov/hipaa
- Security Rule Guidance: https://www.hhs.gov/hipaa/for-professionals/security
- Breach Portal: https://ocrportal.hhs.gov/ocr/breach
- Compliance Checklist: https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html

### Third-Party Tools
- HIPAA Compliance Software: Compliancy Group, HIPAA One
- Risk Assessment Tools: Abyde, Secureframe
- Audit Logging: Logtail, Datadog, Splunk

### Legal Counsel
Recommendation: Consult with healthcare attorney before launch for:
- Privacy Policy review
- BAA template review
- State-specific health data laws (CCPA, GDPR if applicable)

---

## Certification

By signing below, I certify that I have reviewed this HIPAA compliance checklist and commit to implementing all required safeguards before production launch.

**Security Official**: _________________________ Date: _________

**Platform Owner**: _________________________ Date: _________

---

**Document Version**: 1.0
**Last Updated**: 2026-01-25
**Next Review**: 2026-04-25 (90 days)
