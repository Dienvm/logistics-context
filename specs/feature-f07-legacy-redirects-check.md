---
title: Generate legacy redirects from the CSV and check them
type: feature
status: approved
owner_repo: both
roadmap: F-07
priority: must-have
blocked_by_questions: []
updated: 2026-10-21
---

## Feature: Generate legacy redirects from the CSV and check them

### Problem Statement

The old WordPress site has indexed and linked URLs that must keep working. `43logistics.vn/data/redirect-map.csv` has 63 rows (rule 13, `05` "Redirects & legacy URLs"), which classify exclusively into **43 exact redirects, 8 kept URLs, 6 gone URLs and 6 wildcard rules**. F-06 already answers the 410s and the `?page_id`/`?p` links in `proxy.ts`. The 43 exact 301 rows aren't served yet, so every old route, blog, category, tag, date and sitemap URL currently 404s. There's also no `pnpm check:redirects`, which `AGENTS.md` §9 requires on **every PR**, so nothing stops a later change from breaking a legacy URL.

The F-06 note in the roadmap row adds a constraint: with `skipTrailingSlashRedirect`, config `redirects()` run **before** `proxy.ts`, so a slash-less legacy URL (`/dich-vu/gui-hang-di-singapore`) must be matched by the generated rule itself to stay one hop.

Roadmap row `docs/context/10-roadmap.md` F-07. Its *Accept* currently reads "all 63 rows pass against `next start`". F-07 **amends it** to: `pnpm check:redirects` against `next start` reports **0 FAIL**, and every row is either PASS or a **named deferral**:
- PENDING page (its destination or kept page is built by an S-task);
- PENDING A-04 (uploads, attachment slugs);
- SKIPPED L-02 (host rules).

Default mode never claims that every row passes. Full legacy-URL availability is proven by `--strict` at L-01 and the deployed-host run at L-02.

Owner decisions (2026-10-21):
1. A **keep row** answers without redirecting. While its page is unbuilt, a 404 is PENDING; `--strict` requires a real 200 and becomes mandatory at launch (L-01).
2. The **`/wp-content/uploads/*` → Storage rewrite moves to A-04** (no Supabase project yet). F-07 reports that row as PENDING (A-04).

   Owner note recorded for A-04: old WordPress URLs such as `wp-upload` won't appear on the new site, which is a migration to an agency-style site like quynam.vn plus an admin dashboard. A-04 confirms whether old upload URLs are preserved at all.
3. **Legacy-ID params on non-root legacy URLs are bypassed** (e.g. `/home1/?page_id=705`). They're honoured in one hop only on the root entries `/`, `/vi` and `/index.php`, which WordPress used. Elsewhere they're ordinary params, and the resulting second hop is an accepted exception: not supported, not checked.

### Proposed Solution

Every old WordPress URL either lands on its new page in one 301, keeps answering at the same address, or says "Gone". This holds with or without the trailing slash, and ordinary query strings (e.g. UTM) survive. The one exception is owner decision 3. A reviewer or CI runs `pnpm check:redirects` against a running build and gets one line per CSV row. The run fails if any row is wrong, and reports what is pending (unbuilt pages, Storage, host-level rules) separately, without passing it silently.

### Acceptance Criteria

**Parsing (one source, pure)**

- [ ] Given `data/redirect-map.csv`, then a pure parser `parseRedirectCsv(text)` in `modules/seo/domain/redirect-csv.ts` reads it, handling RFC 4180 quotes, embedded commas and doubled quotes. The parser imports no framework or Zod.
- [ ] Given the parsed rows, then a Zod schema in `modules/seo/application/redirect-rules.ts` validates them:
  - the header is exactly `old_url,new_url_vi,new_url_en,status_code,notes`;
  - `status_code ∈ {200, 301, 410}`;
  - exact (non-wildcard) old URLs are `https://43logistics.vn/…` paths;
  - every 301 row has a `new_url_vi` on the same origin;
  - no exact source appears twice.

  The validated rows are classified into: **`redirect` (43)**, **`keep` (8)**, **`gone` (6)** and **`wildcard` (6)**, with the wildcard owner listed in the next criterion. A malformed CSV fails `pnpm build` and `check:redirects` with the line number and field.
- [ ] Given the six wildcard rows, then each maps to a **fixed, named handler**, never parsed from the free-text cell:

  | Row | Handler | Status in F-07 |
  | --- | --- | --- |
  | `/?page_id=*  /?p=*` | `proxy.ts` legacy IDs (F-06) | checked |
  | `/?attachment_id=*  và attachment slug` | `proxy.ts` (new in F-07), on the root entries `/`, `/vi` and `/index.php`, with or without the slash, and any `attachment_id` value (empty or repeated included) → 301 `/`. **Precedence:** `page_id` > `p` > `attachment_id`. Any of the three removes all three; other params are kept. Attachment **slugs** (old image-page URLs) aren't enumerable here and are **deferred to A-04**, which can derive them from the media inventory | `?attachment_id` checked; slugs PENDING (A-04) |
  | `/wp-admin/*  /wp-login.php  /xmlrpc.php` | `proxy.ts` gone paths (F-06) | checked |
  | `/wp-json/*` | `proxy.ts` gone paths (F-06) | checked |
  | `/wp-content/uploads/*` | Storage rewrite | **pending (A-04)** |
  | `http://…/*  và www.43logistics.vn/*` | host/CDN, one hop to `https://43logistics.vn` | **skipped locally (L-02)** |

  A CSV wildcard row without a known handler fails validation.

**Generated redirects** (`next.config.ts`)

- [ ] Given `next.config.ts`, then `redirects()` returns the rules built from the 43 `redirect` rows by `buildNextRedirects(rows)` (pure, application layer), each with **`statusCode: 301`** (not `permanent: true`, which would emit 308; see `05`). The parser, schema and builder are imported through **`modules/seo/client.ts`**, never deep-imported. `check:boundaries` adds `next.config.ts` and `scripts/check-redirects.ts` to its inputs.
  - Non-file sources (last segment without a dot) are emitted **with and without** the trailing slash, so `/home1` and `/home1/` both reach `/` in one hop.
  - File-like sources (`/sitemap_index.xml`, `/sitemap.rss`, …) are emitted exactly as written.
  - Destinations are root-relative paths, taken from `new_url_vi`.
- [ ] Given a request to a redirect row's source with an ordinary query string (e.g. `/home1/?utm_source=x`), then the `Location` keeps it (`/?utm_source=x`). Next does this by default; the check script verifies it on one row per category. Legacy-ID params on these sources are exempt (owner decision 3).
- [ ] Given the generated rules, then none overlaps a `proxy.ts` responsibility. No source is `/`, `/vi…`, `/en…`, a gone path or an admin path; the builder throws if one would. `keep` and `gone` rows produce no config rule.

**`pnpm check:redirects`** (`scripts/check-redirects.ts`, a script, not a test suite; ADR 0004)

- [ ] Given `pnpm check:redirects [--base <url>] [--strict] [--csv <path>] [--host-checks]`, then:
  - the **default base** is `http://localhost:3100`;
  - each request has a **10 s timeout**, and the whole run has a **120 s deadline**;
  - it loads the CSV, `data/redirect-map.csv` by default or the `--csv` file for negative checks, through the same parser and schema. For each row it requests the URL with `redirect: "manual"` and checks:
  - **`redirect`:** status **301**, `Location` equals the destination (relative or same-origin absolute), and requesting the `Location` returns no further 3xx. The slash-less variant of a non-file source is checked the same way, as is one UTM sample per category.
  - **`keep`:** the URL itself must not redirect.

  **Result table** (exhaustive, used for every final status):

  | Observed | Default mode | `--strict` |
  | --- | --- | --- |
  | 200 | PASS | PASS |
  | 404 on a destination or kept page that isn't built yet | PENDING (page) | FAIL |
  | Any other status (500, 403, a wrong 3xx, a second hop, 410 where not expected), or a request error or timeout | FAIL | FAIL |
  | Deferred handler (uploads, attachment slugs) | PENDING (A-04) | FAIL |
  | Host rules | SKIPPED (L-02), unless `--host-checks` against the deployed domain | FAIL unless run with `--host-checks` |
  - **`gone`:** status **410**, for the slash and slash-less forms.
  - **`wildcard`**, by handler. Every redirect is followed one hop to a final status, using the result table:
    - `/?page_id=705` → 301 `/gui-hang-di-singapore/`;
    - `/?p=3570` → 301 `/kinh-nghiem/mon-hang-khong-duoc-gui-sang-han-quoc/`;
    - `/?attachment_id=123`, `/vi?attachment_id=123`, `/vi/?attachment_id=`, `/index.php?attachment_id=5` → 301 `/`;
    - `/?page_id=705&attachment_id=1` → 301 `/gui-hang-di-singapore/` (precedence);
    - `/?attachment_id=5&utm_source=x` → 301 `/?utm_source=x`;
    - `/wp-admin/`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/` → 410;
    - uploads → PENDING (A-04); http/www → SKIPPED (L-02).
- [ ] Given the run, then it prints one line per check (`PASS|FAIL|PENDING|SKIPPED`, URL, expected, observed) and a summary with counts per class. It **exits 1** if any check is `FAIL`, and 0 otherwise. Its own request errors (server not running) count as `FAIL` with a clear message, never `PASS`.
- [ ] Given the `verify` CI workflow, then after `pnpm build` it starts `pnpm start -p 3100` in the background and runs the check:
  - **readiness:** `GET /` returns 200, polled for at most 60 s;
  - then `pnpm check:redirects`;
  - on failure, the server log is printed;
  - the server is always stopped: a shell `trap` in the same step, or a separate `if: always()` cleanup step.

  A FAIL fails the PR (AGENTS.md §9 "check:redirects every PR").
- [ ] Given the **original** rules being served, then two negative runs behave as follows. Both are recorded in the PR.
  - `pnpm check:redirects --csv <scratch copy with one destination changed>` reports exactly that row's checks as FAIL and exits 1.
  - With the server stopped, every attempted HTTP check is FAIL with a clear message, the deferred labels are unchanged, and the run exits 1.

**Docs and gates**

- [ ] Given the change, then:
  - `AGENTS.md` §7 marks `pnpm check:redirects` as `exists` (via `/mark-implemented`);
  - `05` documents the generated rules, the result table (default vs `--strict`), the attachment rule, the legacy-param exception and the A-04 / L-02 deferrals;
  - the roadmap's **F-07** *Accept* is reworded (0 FAIL, named deferrals);
  - **L-01** requires `pnpm check:redirects --strict` to pass;
  - **L-02** requires `pnpm check:redirects --base https://43logistics.vn --host-checks --strict` against production;
  - **A-04** owns the uploads rewrite (or the owner's decision not to keep old upload URLs) and the attachment-slug redirects.

### Scope

**In scope:**
- The CSV parser, schema, classifier and `buildNextRedirects`.
- `next.config.ts` `redirects()`.
- The `?attachment_id=` handler in the F-06 planner.
- `scripts/check-redirects.ts` and the `check:redirects` script.
- The `verify` workflow step.
- Doc and roadmap updates.

**Out of scope:**
- The `/wp-content/uploads/*` rewrite (A-04).
- `http://`/`www.` canonicalisation (host/CDN, L-02).
- Attachment-slug URLs (not enumerable).
- The DB `redirects` table, admin-managed redirects and the overlap check against it (A-tasks; `05`).
- The EN column (`new_url_en`) as redirects: it documents EN equivalents for hreflang. Old URLs were VI-only, so they redirect to their VI page.
- Building the destination pages (S-tasks).

### Affected Areas

| Repo | Layer | File / Path |
|------|-------|-------------|
| app | module domain | `modules/seo/domain/redirect-csv.ts` (new) |
| app | module application | `modules/seo/application/redirect-rules.ts` (new: schema, classify, `buildNextRedirects`); `modules/seo/application/request-plan.ts` (`?attachment_id=`) |
| app | module entry | `modules/seo/client.ts` (export the parser, schema and builder) |
| app | module domain | `modules/seo/domain/legacy-ids.ts` (attachment param, if the planner needs a helper) |
| app | config | `next.config.ts` (`redirects()`), `package.json` (`check:redirects`; `check:boundaries` inputs) |
| app | scripts | `scripts/check-redirects.ts` (new; may split helpers under `scripts/redirects/`) |
| app | CI | `.github/workflows/verify.yml` (start the server, run the check) |
| app | docs | `AGENTS.md`, `README.md` |
| context | docs | `docs/context/05-seo-and-tracking.md`, `docs/context/10-roadmap.md` (F-07 Accept, L-01 strict, L-02 host run, A-04 uploads + attachment slugs) |
| context | lifecycle | `AGENTS.md` §7 `check:redirects` row (via `/mark-implemented`) |

### Golden-rule checks

- **Rule 13 (old URLs):** every CSV row resolves as specified, in one hop. This is checked on every PR in CI.
- **Rule 14 (consent):** redirects set no cookies. The attribution params survive in the query string to the final URL, where F-06 decides. Verified with the reduced synthetic-consent matrix.
- **Rule 1 (facts):** destinations come only from the CSV; no URL is invented.

### Dependencies & Risks

- **Depends on:**
  - F-06 (proxy: 410s, legacy IDs, one-hop normalisation, `skipTrailingSlashRedirect`);
  - F-03 (routing).

  A-04 later adds the uploads rewrite, and L-02 the host rules.
- **Blocked by questions:** none. The CSV's own `NEEDS CONFIRMATION` notes (the portfolio 410s, Japan→VN, MY/TH→VN) don't change the status codes F-07 serves.
- **Risks:**
  - **Next redirect source matching with `trailingSlash: true` + `skipTrailingSlashRedirect`:** Next may already normalise one form. The builder emits both forms explicitly and de-duplicates, and the check proves one hop for each.
  - **Config `redirects()` vs `proxy.ts` order:** a generated rule that shadowed a proxy branch would bypass it, hence the builder's overlap guard.
  - **CI time:** starting the server and checking about 120 requests adds roughly 30 s.

### Manual Verification Plan

**Scenario:** given `pnpm build && pnpm start -p 3100`, when `pnpm check:redirects` runs, then every row is PASS, or PENDING/SKIPPED with its stated reason, and the exit code is 0.

**Seed needs:** none.

**Steps:**

1. Run `pnpm lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check` and `build`. Record the number of generated rules (43 rows × slash variants, minus de-duplication).
2. Run `pnpm check:redirects` and attach the full output. Expected: 0 FAIL. PENDING = the keep rows and 301 destinations whose pages don't exist yet, plus uploads. SKIPPED = http/www.
3. Run `pnpm check:redirects --strict` and record which rows fail (the expected unbuilt pages). This shows that strict mode distinguishes them.
4. **Negative checks:**
   - serving the original rules, run with `--csv` pointing at a scratch copy with one changed destination → only that row's checks FAIL, exit 1;
   - stop the server → every attempted HTTP check FAILs, exit 1, deferred labels unchanged;
   - corrupt the header in a scratch CSV passed via `--csv` → the script fails, naming the line and field, and `pnpm build` with the corrupted file in place also fails (reverted).
5. **Reduced consent matrix** (F-06 style, synthetic `43l_consent`):
   - `/home1/?utm_source=x` and `/?attachment_id=5&utm_source=x` → 301 with **no** `Set-Cookie`, and the query is kept;
   - the final URL sets `43l_attr` only with `v1.1.…`;
   - absent, `ads=0` and malformed consent → no cookie.
6. **Spot-check by hand** with `curl -s -o /dev/null -L -w '%{num_redirects} %{url_effective} %{http_code}'`:
   - `/dich-vu/gui-hang-di-singapore` (slash-less) → 1 hop to `/gui-hang-di-singapore/`;
   - `/home1/?utm_source=x` → `/?utm_source=x`;
   - `/sitemap_index.xml` → `/sitemap.xml`;
   - `/2023/10/19/` → `/kinh-nghiem/`;
   - `/?attachment_id=5&utm_source=x` → `/?utm_source=x`.
7. **CI:** the `verify` run on the PR shows the check step, and its output is linked in the PR.
8. **Budget:** no client change. Script `transferSize` on `/` is unchanged (148.1 KiB).

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`. Consent matrix: the reduced synthetic one, because the proxy planner changes; banner flows are n/a until S-13. No automated tests (ADR 0004).

### Implementation Hints

- Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md`: `statusCode`, matching, query handling, and how it interacts with `trailingSlash`.
- `next.config.ts` can import the pure builder with a relative import (`./modules/seo/application/redirect-rules`). Read the CSV with `node:fs` at config load, never at request time.
- In the check script, use Node's `fetch` with `redirect: "manual"` and `AbortSignal.timeout(10_000)`. Resolve `Location` against `--base`, and use a bounded concurrency of about 8.
- The list of unbuilt pages (for PENDING) is derived, not hard-coded: a destination or kept page that answers 404 is PENDING in default mode. `--strict` turns every PENDING into FAIL, so nothing can hide.
- Lessons from F-06: `curl -L -w '%{num_redirects}'` for hop counts, `--path-as-is` for encoded paths, and kill stale `next-server` processes before measuring.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-07 (L-01 strict gate, A-04 uploads, L-02 host).
- Context: `05-seo-and-tracking.md` ("Redirects & legacy URLs"), `09-migration.md`, `43logistics.vn/data/redirect-map.csv`.
- Specs: `feature-f06-proxy-composition.md` (proxy order, gone paths, legacy IDs, `skipTrailingSlashRedirect`).
- ADRs: 0004 (scripts, not test suites), 0005 (module layers).
