# ProofNest — Future Enhancements & Post-MVP Roadmap

---

## 1. Scope Boundary Notice

The capabilities documented in this file are **strictly post-MVP enhancements**. 

They represent high-value opportunities identified in the original ProofNest concept presentation, but they are deliberately isolated from the initial release to maintain team velocity, minimize security surface area, and guarantee a solid core foundation.

```
+-------------------------------------------------------------------------+
|                        POST-MVP FEATURE ROADMAP                         |
+-------------------------------------------------------------------------+
| 1. External Calendar Synchronization (Google Calendar, iCal, Outlook)   |
| 2. Direct Email Invoice Ingestion (OAuth Gmail / Microsoft 365)         |
| 3. Multi-User Household Account Sharing & RBAC                          |
| 4. Automated Warranty Claim Document Generation Packs                   |
| 5. Product Resale Valuation & Macro Spending Analytics                  |
| 6. Public Product Recall & Consumer Safety Alert Scraping               |
+-------------------------------------------------------------------------+
```

---

## 2. Detailed Enhancement Specifications

### 2.1 Google Calendar & External iCal Synchronization
- **Description:** Allow users to synchronize confirmed warranty expirations, return cutoffs, and maintenance schedules directly to their personal Google Calendar or export via subscription webcal (`.ics`) feed.
- **Required Additional Infrastructure:**
  - OAuth 2.0 Google Calendar API integration (`https://www.googleapis.com/auth/calendar.events`).
  - Webcal subscription token generator for Apple Calendar / Outlook.
  - Background synchronization worker to reflect date changes made inside ProofNest.
- **Security Considerations:** Requires secure token storage for Google OAuth refresh tokens and restricted calendar scope to avoid accessing user's private calendar events.

### 2.2 Direct Email Invoice Ingestion
- **Description:** Instead of manually uploading invoices, users can authorize ProofNest to scan incoming emails for purchase receipts or forward receipts to a personalized inbound address (`user-inbox@invoices.proofnest.app`).
- **Required Additional Infrastructure:**
  - Inbound email processing webhook (e.g. SendGrid Inbound Parse or AWS SES).
  - OAuth 2.0 Gmail / Microsoft Graph API integration with restricted read-only email filter (`subject:invoice OR subject:receipt`).
  - Automated PDF attachment extractor feeding directly into the `DocumentExtractor` pipeline.
- **Security Considerations:** High sensitivity. Requires strict OAuth verification and Google Security Assessment audit. All extracted receipts still enter `review_required` state for mandatory human confirmation.

### 2.3 Multi-User Household Account Sharing & Permissions (RBAC)
- **Description:** Enable family members or roommates to share an inventory of common household products (refrigerator, HVAC, television) while keeping personal devices private.
- **Required Additional Infrastructure:**
  - `Household` and `HouseholdMember` collections in MongoDB.
  - Role-Based Access Control (RBAC): `Owner` (full control, billing), `Editor` (add/edit products and repairs), `Viewer` (read-only access).
  - Activity audit log tracking which household member made modifications.

### 2.4 One-Click Warranty Claim Document Generation Pack
- **Description:** When a product breaks, users can generate a standardized "Warranty Claim Pack" (a single bundled PDF containing product metadata, serial number photo, proof of purchase invoice, and complete repair history).
- **Required Additional Infrastructure:**
  - Server-side PDF generation engine (Puppeteer / PDFKit).
  - Standardized manufacturer claim letter templates.
  - ZIP or merged multi-page PDF compilation worker.

### 2.5 Product Resale Valuation & Macro Spending Analytics
- **Description:** Provide users with estimated current market values for their electronics and appliances based on historical depreciation curves and secondary marketplace API data (eBay / Swappa).
- **Required Additional Infrastructure:**
  - Third-party pricing feed integration.
  - Depreciation algorithm based on product category, age, and condition.
  - Data visualization charts showing cumulative household asset value and depreciation over time.

### 2.6 Public Product Recall & Consumer Safety Alerts
- **Description:** Automatically notify users if any product in their inventory is subject to an active safety recall or defect warning.
- **Required Additional Infrastructure:**
  - Integration with public consumer safety APIs (U.S. Consumer Product Safety Commission - CPSC API, European Safety Gate).
  - Background brand and model matching worker.
  - High-priority safety notification push alerts.

