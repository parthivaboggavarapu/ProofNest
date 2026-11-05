# ProofNest — Technical Risk Register & Mitigation Matrix

---

## 1. Risk Evaluation Framework

Risks are categorized across four operational domains: **Security**, **Data Integrity & AI**, **Architecture & Performance**, and **Team Execution**.

- **Likelihood:** Low (1), Medium (2), High (3)
- **Impact:** Low (1), Medium (2), Critical (3)
- **Risk Score:** Likelihood x Impact (1 to 9). Scores >= 6 require active architectural guardrails.

---

## 2. Risk Assessment Matrix

| ID | Domain | Risk Description | Likelihood | Impact | Score | Mitigation Strategy | Contingency Plan | Owner |
| :---: | :---: | :--- | :---: | :---: | :---: | :--- | :--- | :---: |
| **RSK-01** | Security | **Cross-Tenant Data Leakage (IDOR):** User accesses another user's products or documents via manipulated ID. | 2 | 3 | **6** | All queries enforce `{ userId: req.user.id }`. Automated integration tests verify 404 on cross-user queries. | Immediate session revocation, access audit, patch query. | Member 4 (Backend) |
| **RSK-02** | Security | **Malicious File Upload:** Executable disguised as PDF uploaded and executed on server. | 2 | 3 | **6** | Magic byte inspection (`file-type`), 10 MB size gate, non-executable UUID storage, private bucket streaming. | Isolate storage bucket, delete tainted file, patch MIME filter. | Member 4 (Backend) |
| **RSK-03** | AI/Data | **AI Assistant Hallucination:** LLM invents nonexistent warranty dates or repair costs. | 3 | 2 | **6** | Strict prompt template instructing model to answer only from retrieved context; mandatory citation of record IDs. | Assistant falls back to explicit missing-information response. | Member 6 (AI/Docs) |
| **RSK-04** | Data | **OCR Error Pollution:** Misread invoice dates or prices committed into verified product records. | 3 | 2 | **6** | Mandatory human-in-the-loop review modal. Extracted fields remain in `review_required` until explicit confirmation. | User can edit or delete product record at any time. | Member 6 (AI) / Member 3 (FE) |
| **RSK-05** | Reliability| **Duplicate Reminder Spam:** Scheduled cron job triggers multiple notifications for the same deadline. | 2 | 2 | **4** | Idempotency check: verify `lastNotifiedAt !== today` before creating notification; database lock flag. | Batch-delete duplicate notification records via script. | Member 4 (Backend) |
| **RSK-06** | Data | **Financial Calculation Drift:** Discrepancy between logged repairs and reported total costs. | 1 | 3 | **3** | Dynamic aggregation query directly over stored repair records. Denormalized counters strictly prohibited. | Recalculate dynamic aggregation on read; zero persisted counter drift. | Member 5 (Database) |
| **RSK-07** | Team | **Merge Conflicts & Desynchronization:** 6 developers modifying shared routes, App.jsx, or models simultaneously. | 3 | 2 | **6** | Strict module ownership matrix; trunk-based workflow with short-lived branches; daily standup syncs on shared files. | Project Lead arbitrates conflict and performs supervised merge. | Member 1 (Project Lead) |
| **RSK-08** | Security | **Accidental Secret Leakage:** Developer commits `.env` file or cloud API keys to GitHub. | 2 | 3 | **6** | Robust `.gitignore`, `.env.example` templates, pre-commit secret scanning, GitHub Actions secret leak detection. | Immediately revoke and rotate leaked keys; purge git history if required. | Member 1 (Project Lead) |
| **RSK-09** | Performance| **Large PDF Processing Bottleneck:** High-resolution multi-page invoice hangs server event loop. | 2 | 2 | **4** | Offload OCR processing to asynchronous worker; page limit (max 5 pages for invoice extraction); timeout guard (30s). | Mark extraction status as `failed` with user-friendly retry message. | Member 6 (AI/Testing) |
| **RSK-10** | Storage | **Disk Exhaustion from Uploads:** High volume of uploads fills local disk during development. | 2 | 2 | **4** | 10 MB per-file cap; cleanup script for unconfirmed or orphaned uploads older than 7 days. | Migrate to cloud object storage (S3/R2) via `StorageAdapter`. | Member 4 (Backend) |
