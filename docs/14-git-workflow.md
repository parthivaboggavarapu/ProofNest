# ProofNest — Git Workflow & Branching Strategy

---

## 1. Branching Strategy

ProofNest uses a **Trunk-Based Development** workflow with short-lived feature and fix branches. All active development merges into the primary branch: `main`.

```
           feat/product-inventory ───┐
                                     │ (PR + Review + CI)
main ──────●─────────────────────────●──────────────────────────●────────>
           │ (Second Blueprint Commit)                          │
           └──── fix/deadline-idempotency ──────────────────────┘
```

### Branch Naming Conventions
Every branch must be prefixed with its functional purpose:
- `feat/<feature-name>`: New user-facing feature or module (e.g. `feat/product-inventory`, `feat/ocr-extractor`).
- `fix/<bug-name>`: Bug fix (e.g. `fix/repair-cost-currency-grouping`).
- `docs/<doc-name>`: Documentation additions or revisions (e.g. `docs/api-contracts`).
- `chore/<task-name>`: Tooling, dependency updates, or configuration (e.g. `chore/vite-tailwind-setup`).
- `test/<test-suite>`: Unit, integration, or E2E tests (e.g. `test/isolation-suites`).

---

## 2. Commit Message Standards (Conventional Commits)

All commits must follow the **Conventional Commits v1.0.0** specification:

```text
<type>(<scope>): <short description in present tense>

[optional body explaining motivation and technical approach]

[optional footer(s) referencing issue numbers or breaking changes]
```

### Allowed Types:
- `feat`: A new feature for the user or system.
- `fix`: A bug fix.
- `docs`: Documentation changes only.
- `style`: Formatting, missing semi-colons, no code changes.
- `refactor`: Refactoring code without altering external behavior.
- `perf`: Code change that improves performance.
- `test`: Adding missing tests or correcting existing tests.
- `chore`: Build scripts, package manager configs, auxiliary tools.

### Example Commit Messages:
- `feat(products): add ProductService and Mongoose product schema`
- `fix(deadlines): ensure reminder scheduler does not re-notify today`
- `docs: add complete ProofNest project blueprint`
- `test(auth): add tenant isolation integration test suite`

---

## 3. Strict Rules for the Repository Commits

### Commit 1: Initial Commit
- **Hash:** `8f98a61`
- **Scope:** Repository initialization with basic placeholder.
- **Rule:** Immutable. Must never be rewritten, amended, or rebased.

### Commit 2: Project Blueprint & Foundation (Current Deliverable)
- **Message:** `docs: add complete ProofNest project blueprint`
- **Scope:** Complete architecture, schema models, API specifications, UI/UX guidelines, team allocations, development roadmap, acceptance criteria, environment configurations, and project file map.
- **Rule:** Contains all blueprint planning files; contains no partial or incomplete application code.

### Post-Blueprint Commits (Phase 2+)
- Six team members develop features on separate branches.
- Every pull request requires review from the designated module owner and passing automated checks.

---

## 4. Pull Request & Code Review Checklist

Before any PR is merged into `main`, the author and reviewer must verify:
- [ ] **Tenant Isolation:** Every MongoDB query enforces `{ userId: req.user.id }`.
- [ ] **Verification Workflow:** OCR extracted values are never committed without user confirmation.
- [ ] **Dynamic Calculation:** Financial totals are computed from stored records, not mutable counters.
- [ ] **Zero Secrets:** No API keys, credentials, or `.env` files are checked into the commit.
- [ ] **Test Coverage:** Relevant unit or API tests are included and passing.
- [ ] **Documentation Sync:** Any change to schemas or endpoints updates the corresponding file in `docs/`.

---

## 5. Prohibited Git Actions
1. **Never force-push to `main` (`git push --force`).**
2. **Never amend already pushed commits on `main`.**
3. **Never commit untracked `.env` files, JWT secrets, or cloud credentials.**
4. **Never merge a PR with failing test suites.**

