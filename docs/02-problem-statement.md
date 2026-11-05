# ProofNest — Problem Statement & User Research

---

## 1. The Core Problem

Consumers acquire thousands of dollars worth of physical goods every year—consumer electronics, kitchen appliances, power tools, smart home gadgets, luxury accessories, and furniture. However, the post-purchase records for these assets are severely fragmented across physical and digital silos.

When a device breaks, malfunctions, or reaches the end of its return window, consumers inevitably encounter catastrophic friction:
- Invoices are buried in email spam or archived accounts.
- Paper thermal receipts have faded or been discarded with original packaging.
- Warranty registration periods and return cutoffs pass unnoticed.
- Service histories are forgotten, leading to repeated repairs or warranty claims rejected due to missing proof of purchase.

---

## 2. The Five Pain Points in Detail

### 1. Scattered and Vanishing Documentation
* **The Reality:** Purchase receipts come as paper slips, email PDFs, SMS links, or retailer portal history. Over 60% of paper thermal receipts become illegible within 6 to 12 months.
* **The Consequence:** When filing an insurance claim, warranty request, or police report for a stolen item, the owner cannot prove ownership, serial number, or date of acquisition.

### 2. Missed Deadlines (Financial Penalties)
* **The Reality:** Retail return windows typically range from 14 to 30 days, while manufacturer warranties range from 12 to 36 months. Without proactive reminders, calendar deadlines slip by unnoticed.
* **The Consequence:** Consumers pay out-of-pocket for repairs or replacements that were fully covered under warranty, or they are forced to keep defective merchandise because the return cutoff elapsed 48 hours earlier.

### 3. Untracked Repair Expenses (Blind Spending)
* **The Reality:** Maintenance and servicing are conducted irregularly through various local repair shops, authorized service centers, or online mail-in programs. Repair receipts are rarely filed together.
* **The Consequence:** Owners suffer from the "sunk cost fallacy," repeatedly spending hundreds of dollars servicing an aging appliance when buying a new unit with a fresh warranty would have been cheaper.

### 4. High-Friction Information Retrieval
* **The Reality:** Finding a specific manual to troubleshoot an error code (e.g., "Bosch dishwasher error E15") or finding a serial number printed on the back of a mounted 65-inch OLED TV requires physical labor or endless web searches.
* **The Consequence:** Extreme consumer frustration, lost time, and reliance on unreliable third-party manual mirror sites infected with malware.

### 5. Fragmented Product Lifecycles
* **The Reality:** Current software alternatives are either generic cloud storage drives (Google Drive/Dropbox—which have no schema, dates, or deadline alerts) or enterprise CMDBs/asset trackers (which are bloated with depreciation amortization, barcodes, and subnet tracking).
* **The Consequence:** The consumer is left with no purpose-built tool designed for personal household ownership.

---

## 3. Target User Personas

### Persona A: Marcus — The Gadget & Electronics Enthusiast
- **Demographics:** 28, Software Engineer, owns flagship smartphones, custom PCs, audio gear, smart displays, and mechanical keyboards.
- **Pain Point:** Has dozens of high-value items bought from diverse online retailers (Amazon, B&H, Kickstarter, local stores). Constantly forgets which items have extended warranties or which require maintenance (cleaning, firmware updates).
- **Goal in ProofNest:** Quick invoice upload via OCR, automated warranty countdown, instant access to serial numbers for insurance and resale.

### Persona B: Elena — The Busy Homeowner & Family Manager
- **Demographics:** 42, Operations Director, manages a household with major appliances (refrigerator, HVAC, induction range, robotic vacuums, power tools).
- **Pain Point:** When the HVAC or washer malfunctions, she cannot remember who serviced it last year, what part was replaced, or where the contractor invoice is.
- **Goal in ProofNest:** Single dashboard for all household appliances, repair logs with costs, and instant AI search: *"When did we last service the water heater?"*

### Persona C: Priya — The Small Creative Studio Owner
- **Demographics:** 34, Independent Photographer & Videographer, owns cinema cameras, lenses, lighting rigs, and editing workstations.
- **Pain Point:** Equipment travels frequently and undergoes regular calibration and sensor repairs. Needs immediate proof of purchase for airport customs and fast access to serial numbers for rental insurance.
- **Goal in ProofNest:** Structured inventory, attached PDF invoices, accurate repair expense ledger per lens/camera, and rapid mobile retrieval.

---

## 4. Why Existing Tools Fail

| Solution | Critical Flaw | Why ProofNest Wins |
| :--- | :--- | :--- |
| **Email Search** | Invoices get lost across multiple personal/work inboxes, and physical receipts never enter email. | Centralized repository uniting digital PDFs and scanned paper receipts. |
| **Google Drive / Dropbox** | Dumb file storage. No date awareness, no deadline alerts, no schema, no calculation of repair totals. | Domain-specific entity relationships: Document is tied to Product, Deadlines, and Repairs. |
| **Spreadsheets (Excel/Sheets)** | High manual data-entry burden. No file attachments, no OCR ingestion, no mobile-friendly UX. | Automated OCR extraction with intuitive review modal, instant file downloads, and AI chat. |
| **Enterprise Asset Trackers** | Over-engineered, expensive, enterprise-focused, devoid of consumer warranty and return workflows. | Clean consumer-grade UX tailored to individual and household ownership. |
