# ProofNest — UI/UX Guidelines & Design System

---

## 1. Visual Identity & Design Principles

ProofNest is built with a clean, focused, utility-first user experience. The application prioritizes high legibility, responsive accessibility, and confidence in record verification.

### Core Principles
1. **Calm and Reassuring:** Financial records and expired warranties can cause anxiety; the interface uses balanced slate tones, clear visual hierarchy, and unambiguous status colors.
2. **Explicit Verification States:** OCR and AI data are visually differentiated with distinct badges and review modals until the user explicitly confirms them.
3. **Frictionless Ingestion:** Drag-and-drop document upload with instantaneous feedback.
4. **Accessible by Default:** High-contrast text, clear focus rings, and full keyboard navigation.

---

## 2. Color Palette & Semantic Tokens

```
+-------------------------------------------------------------------------------+
| PRIMARY BRAND (OCEAN BLUE)                                                    |
| brand-50:  #f0f7ff   brand-100: #e0effe   brand-500: #0284c7 (Primary Brand)  |
| brand-600: #0369a1   brand-700: #075985   brand-900: #0c4a6e                  |
+-------------------------------------------------------------------------------+
| NEUTRAL SURFACES & TEXT (SLATE)                                               |
| slate-50:  #f8fafc (App BG)    slate-100: #f1f5f9 (Card BG)  slate-200: #e2e8f0|
| slate-400: #94a3b8 (Muted Text)slate-700: #334155 (Subhead)  slate-900: #0f172a|
+-------------------------------------------------------------------------------+
| SEMANTIC ALERTS                                                               |
| Success: #10b981 (Active Warranty / Confirmed Document)                       |
| Warning: #f59e0b (Expiring Soon < 30 Days / Review Required)                  |
| Danger:  #ef4444 (Expired Warranty / Overdue Return / Destructive Action)     |
+-------------------------------------------------------------------------------+
```

---

## 3. Typography & Scale

The system uses **Inter** for all UI body text and headings, paired with **JetBrains Mono** for serial numbers, currency values, and document IDs.

| Role | Tailwind Class | Font Size / Line Height | Weight | Example Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `text-2xl sm:text-3xl` | 24px / 32px (Desktop: 30px / 36px) | Bold (700) | Dashboard Header |
| **Section Title** | `text-xl` | 20px / 28px | Semibold (600) | Product Detail Sections |
| **Card Header** | `text-base` | 16px / 24px | Semibold (600) | Stat Card Labels |
| **Body Text** | `text-sm` | 14px / 20px | Regular (400) | Table rows, descriptions |
| **Caption / Meta**| `text-xs` | 12px / 16px | Medium (500) | Timestamps, badge labels |
| **Mono Data** | `font-mono text-sm` | 14px / 20px | Medium (500) | Serial numbers, Prices |

---

## 4. Reusable Component Specifications

### 4.1 Buttons
- **Primary Action:** Solid Ocean Blue (`bg-brand-600 hover:bg-brand-700 text-white shadow-sm rounded-lg px-4 py-2 font-medium`).
- **Secondary / Outline:** Bordered Slate (`border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg px-4 py-2 font-medium`).
- **Destructive:** Solid Red (`bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 font-medium`).
- **Disabled State:** Reduced opacity (`opacity-50 cursor-not-allowed pointer-events-none`).

### 4.2 Status Badges & Pills
- **Active Warranty:** `bg-emerald-100 text-emerald-800 border-emerald-200` ("Active - 18 months left")
- **Warranty Expiring Soon:** `bg-amber-100 text-amber-800 border-amber-200` ("Expiring in 12 days")
- **Warranty Expired:** `bg-slate-100 text-slate-600 border-slate-200` ("Warranty Expired")
- **Review Required (OCR):** `bg-blue-100 text-brand-700 border-brand-200 animate-pulse` ("Review Extracted Data")

### 4.3 Data Cards & Panels
- Surface: Clean white card with subtle border and elevation (`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`).

---

## 5. User Experience States

### 5.1 Loading Skeletons
To avoid jarring layout shifts, all data views (cards, tables, detail views) display animated Tailwind shimmer skeletons (`animate-pulse bg-slate-200 dark:bg-slate-700 rounded`) while network requests are pending.

### 5.2 Empty States
When a collection contains no items, the UI renders an illustrated empty state container with:
1. Friendly graphic icon.
2. Explanatory heading (e.g. *"No products added yet"*).
3. Contextual description (e.g. *"Start organizing your purchases by adding a product manually or scanning an invoice."*).
4. Direct Call-to-Action button (`+ Add Your First Product`).

### 5.3 Destructive Confirmation Modals
Destructive actions (e.g., deleting a product, removing an uploaded invoice) require explicit confirmation:
- Red warning header with danger icon.
- Clear summary of affected sub-entities (*"Deleting this product will permanently delete 2 repair records and 1 scheduled warranty deadline."*).
- Explicit checkbox or double-click confirmation before the delete request fires.

---

## 6. Accessibility (WCAG 2.1 AA) Standards

- **Color Contrast:** All body text meets or exceeds the 4.5:1 contrast ratio against background surfaces.
- **Keyboard Navigation:** All interactive elements (buttons, inputs, modal dialogs) support Tab navigation, Enter selection, and Escape key dismissal.
- **Screen Reader Support:** Accessible ARIA attributes (`aria-expanded`, `aria-haspopup`, `aria-live="polite"` for live OCR status updates) are applied across dynamic widgets.
- **Form Validation:** Error messages are announced and displayed directly below the invalid input field in high-contrast red text.

