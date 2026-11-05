# ProofNest — Project Overview

> **Tagline:** Every Purchase, Safely Organized.  
> **Category:** Full-Stack Web Application with AI-assisted document processing and information retrieval.  
> **Status:** Project Blueprint & Foundation Phase (Pre-Implementation).

---

## 1. Executive Summary

**ProofNest** is a specialized personal product-record management platform designed to solve the chronic chaos of post-purchase ownership. Consumers make dozens of purchases every year—ranging from high-end electronics, home appliances, and tools to vehicles and furniture—yet the crucial records associated with these items remain dispersed, fragile, and untracked.

When an appliance fails, an owner often spends hours hunting through email threads, dusty folders, or endless mobile photo reels for a faded receipt. By the time they locate it, the 30-day return window has closed or the warranty expired weeks ago. When repairs are required, costs are paid ad-hoc without any tracking of the lifetime expenditure on the product.

ProofNest bridges this gap by unifying:
1. **Product specifications and metadata** (brand, model, serial number, purchase date, price).
2. **Associated digital documentation** (purchase invoices, warranty certificates, user manuals, repair receipts).
3. **Automated OCR and document information extraction** paired with an uncompromised **human-in-the-loop review and confirmation workflow**.
4. **Smart deadline and reminder tracking** for warranties, return periods, and scheduled service.
5. **Detailed repair history and automated lifetime expenditure calculation**.
6. **A dedicated AI Product Assistant** that answers natural language questions grounded strictly in the user's verified records, complete with source citations.

---

## 2. What ProofNest Is (and What It Is Not)

To maintain strict architectural discipline across our six-developer team, we establish explicit domain boundaries:

```
+-----------------------------------------------------------------------------------+
|                                WHAT PROOFNEST IS                                  |
+-----------------------------------------------------------------------------------+
| * A personal asset lifecycle management system for consumers & household managers |
| * A contextual document locker that anchors files directly to physical products   |
| * An intelligent deadline supervisor protecting return windows and warranties     |
| * An auditable repair and maintenance expense journal                             |
| * A strictly grounded, hallucination-resistant private AI assistant               |
+-----------------------------------------------------------------------------------+

+-----------------------------------------------------------------------------------+
|                              WHAT PROOFNEST IS NOT                                |
+-----------------------------------------------------------------------------------+
| X NOT a generic enterprise warehouse inventory / ERP system                      |
| X NOT an e-commerce platform, store, or shopping cart application                 |
| X NOT an IT asset management / CMDB platform tracking network subnets & servers   |
| X NOT a generic unorganized cloud drive (like a loose Google Drive folder)        |
| X NOT an unverified automated scraping pipeline that writes unreviewed OCR data   |
+-----------------------------------------------------------------------------------+
```

---

## 3. Core Value Proposition

ProofNest transforms physical ownership into structured, actionable digital assets:

- **Time Saved:** Instant retrieval of invoices and manuals during breakdowns, insurance audits, or resale.
- **Financial Protection:** Proactive warnings before return windows and warranty periods expire, preventing missed claims.
- **Lifecycle Insight:** Accurate totals of maintenance expenditures, helping owners make informed "repair vs. replace" decisions.
- **Zero Friction with High Trust:** Fast document intake via OCR with a mandatory user review screen to guarantee 100% data fidelity.
- **Natural Language Discovery:** Instead of browsing tables, users simply ask: *"Which warranties expire next month?"* or *"How much did I spend repairing my phone?"*

---

## 4. Key Metrics and Architectural Goals

| Metric Category | Target Standard | Architectural Measure |
| :--- | :--- | :--- |
| **Data Isolation** | 100% Strict Tenant Boundary | Every database query and file access check is scoped by `userId` extracted from secure JWT cookies. |
| **Data Integrity** | Zero Unverified OCR Data | Extracted data remains in `review_required` state until explicitly confirmed by `POST /api/documents/:id/confirm`. |
| **Calculation Accuracy** | 100% Deterministic Totals | Repair expense totals are computed via MongoDB aggregation pipelines over stored repair records, never manual counters. |
| **AI Grounding** | Zero Fabricated Facts | LLM context is strictly populated with authorized user records; if data is missing, the assistant explicitly reports absence. |
| **API Response Time** | < 250ms for P95 Queries | Compound MongoDB indexing on `{ userId: 1, ... }` and lean projection pipelines. |
| **Document Security** | Signed / Authenticated Downloads | Files are stored under non-guessable UUID keys; downloads are streamed through authorization middleware. |

---

## 5. Blueprint Phase Deliverables

This repository is currently in the **Project Blueprint Phase**. No production application code is committed yet. This blueprint establishes:
- The full business domain and user personas.
- Complete system architecture and data flows.
- Complete Mongoose schemas and relationships.
- Complete REST API contracts and error standards.
- Detailed UI/UX page inventories and design tokens.
- Object-Oriented service class contracts (`ProductService`, `WarrantyTracker`, `RepairHistoryManager`, `DocumentExtractor`).
- Complete security and tenant-isolation blueprints.
- A 14-phase development roadmap with a RACI matrix for our 6-developer engineering team.
- A complete project file map covering every planned file in the repository.

