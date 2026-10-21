---
title: Generate legacy redirects from the CSV and check them
type: feature
status: draft
owner_repo: both
roadmap: F-07
priority: must-have
blocked_by_questions: []
updated: 2026-10-21
---

## Feature: Generate legacy redirects from the CSV and check them

### Problem Statement

The old WordPress site has indexed and linked URLs that must keep working: 46 permanent redirects, 8 kept URLs, 8 gone URLs, plus 6 wildcard rules, all listed in `43logistics.vn/data/redirect-map.csv` (rule 13, `05` "Redirects & legacy URLs"). F-06 already answers the 410s and the `?page_id`/`?p` links in `proxy.ts`. The 43 exact 301 rows aren't served yet, so every old route, blog, category, tag, date and sitemap URL currently 404s. There's also no `pnpm check:redirects`, which `AGENTS.md` §9 requires on **every PR**, so nothing stops a later change from breaking a legacy URL.

The F-06 note in the roadmap row adds a constraint: with `skipTrailingSlashRedirect`, config `redirects()` run **before** `proxy.ts`, so a slash-less legacy URL (`/dich-vu/gui-hang-di-singapore`) must be matched by the generated rule itself to stay one hop.

Roadmap row `docs/context/10-roadmap.md` F-07. *Accept:* all 63 rows pass against `next start`.

Owner decisions (2026-10-21):
1. A **200 ("keep URL") row passes when the URL is served without a redirect and isn't 410**: a real 200, or a 404 while its page is still unbuilt. `--strict` requires a real 200, and becomes mandatory at launch (L-01).
2. The **`/wp-content/uploads/*` → Storage rewrite moves to A-04** (no Supabase project yet). F-07 reports that row as *pending (A-04)*.

### Proposed Solution

Every old WordPress URL either lands on its new page in one 301, keeps answering at the same address, or says "Gone". This holds with or without the trailing slash, and query strings survive. A reviewer or CI runs `pnpm check:redirects` against a running build and gets one line per CSV row. The run fails if any row is wrong, and reports what is pending (unbuilt pages, Storage, host-level rules) separately, without passing it silently.

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
  | `/?attachment_id=*  và attachment slug` | `proxy.ts` (new in F-07): `?attachment_id=` on `/`, `/vi`, `/index.php` → 301 `/`, other params kept. Attachment *slugs* (arbitrary old image-page URLs) can't be enumerated and fall through to the localized 404 (noted) | checked |
  | `/wp-admin/*  /wp-login.php  /xmlrpc.php` | `proxy.ts` gone paths (F-06) | checked |
  | `/wp-json/*` | `proxy.ts` gone paths (F-06) | checked |
  | `/wp-content/uploads/*` | Storage rewrite | **pending (A-04)** |
  | `http://…/*  và www.43logistics.vn/*` | host/CDN, one hop to `https://43logistics.vn` | **skipped locally (L-02)** |

  A CSV wildcard row without a known handler fails validation.

**Generated redirects** (`next.config.ts`)

- [ ] Given `next.config.ts`, then `redirects()` returns the rules built from the 43 `redirect` rows by `buildNextRedirects(rows)` (pure, application layer), each with **`statusCode: 301`** (not `permanent: true`, which would emit 308; see `05`).
  - Non-file sources (last segment without a dot) are emitted **with and without** the trailing slash, so `/home1` and `/home1/` both reach `/` in one hop.
  - File-like sources (`/sitemap_index.xml`, `/sitemap.rss`, …) are emitted exactly as written.
  - Destinations are root-relative paths, taken from `new_url_vi`.
- [ ] Given a request to a redirect row's source with a query string (e.g. `/home1/?utm_source=x`), then the `Location` keeps it (`/?utm_source=x`). Next does this by default; the check script verifies it on one row per category.
- [ ] Given the generated rules, then none overlaps a `proxy.ts` responsibility. No source is `/`, `/vi…`, `/en…`, a gone path or an admin path; the builder throws if one would. `keep` and `gone` rows produce no config rule.

**`pnpm check:redirects`** (`scripts/check-redirects.ts`, a script, not a test suite; ADR 0004)

- [ ] Given `pnpm check:redirects [--base http://localhost:3100] [--strict]`, then it loads the CSV through the same parser and schema. For each row it requests the URL with `redirect: "manual"` and checks:
  - **`redirect`:** status **301**, `Location` equals the destination (relative or same-origin absolute), and requesting the `Location` returns **no further 3xx**. Its final status is recorded: 200 passes; 404 passes as *pending page* in default mode and fails with `--strict`. The slash-less variant of a non-file source is checked the same way, as is the query-string sample per category.
  - **`keep`:** no 3xx and not 410. 200 passes; 404 is *pending page* in default mode and fails with `--strict`.
  - **`gone`:** status **410**, for the slash and slash-less forms.
  - **`wildcard`**, by handler:
    - `/?page_id=705` → 301 `/gui-hang-di-singapore/`, and `/?p=3570` → 301 `/kinh-nghiem/mon-hang-khong-duoc-gui-sang-han-quoc/`;
    - `/?attachment_id=123` → 301 `/`;
    - `/wp-admin/`, `/wp-login.php`, `/xmlrpc.php`, `/wp-json/` → 410;
    - uploads → *pending (A-04)*; http/www → *skipped (L-02)*.
- [ ] Given the run, then it prints one line per check (`PASS|FAIL|PENDING|SKIPPED`, URL, expected, observed) and a summary with counts per class. It **exits 1** if any check is `FAIL`, and 0 otherwise. Its own request errors (server not running) count as `FAIL` with a clear message, never `PASS`.
- [ ] Given the `verify` CI workflow, then after `pnpm build` it starts `pnpm start -p 3100` in the background, waits for readiness (bounded, ≤ 60 s), runs `pnpm check:redirects --base http://localhost:3100`, and stops the server. A failing row fails the PR (AGENTS.md §9 "check:redirects every PR").
- [ ] Given a deliberately broken rule (one CSV destination edited in a scratch copy, or a source removed from the generated list), then the script reports exactly that row as `FAIL` and exits 1. This is recorded in the PR, using a local temporary edit that is then reverted.

**Docs and gates**

- [ ] Given the change, then:
  - `AGENTS.md` §7 marks `pnpm check:redirects` as `exists` (via `/mark-implemented`);
  - `05` documents the generated rules, the check semantics (default vs `--strict`), the attachment rule and the A-04 / L-02 deferrals;
  - the roadmap's **L-01** row requires `pnpm check:redirects --strict` to pass;
  - the **A-04** row owns the uploads rewrite and its check.

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
| app | module domain | `modules/seo/domain/legacy-ids.ts` (attachment param, if the planner needs a helper) |
| app | config | `next.config.ts` (`redirects()`), `package.json` (`check:redirects`) |
| app | scripts | `scripts/check-redirects.ts` (new; may split helpers under `scripts/redirects/`) |
| app | CI | `.github/workflows/verify.yml` (start the server, run the check) |
| app | docs | `AGENTS.md`, `README.md` |
| context | docs | `docs/context/05-seo-and-tracking.md`, `docs/context/10-roadmap.md` (L-01 strict, A-04 uploads) |
| context | lifecycle | `AGENTS.md` §7 `check:redirects` row (via `/mark-implemented`) |

### Golden-rule checks

- **Rule 13 (old URLs):** every CSV row resolves as specified, in one hop. This is checked on every PR in CI.
- **Rule 14 (consent):** redirects set no cookies. The attribution params survive in the query string to the final URL, where F-06 decides.
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
   - in a scratch copy, change one destination → exactly that row FAILs, exit 1;
   - stop the server → every row FAILs, exit 1, with a clear message;
   - corrupt the CSV header → `pnpm build` and the script fail, naming the line and field.

   Revert all of these.
5. **Spot-check by hand** with `curl -s -o /dev/null -L -w '%{num_redirects} %{url_effective} %{http_code}'`:
   - `/dich-vu/gui-hang-di-singapore` (slash-less) → 1 hop to `/gui-hang-di-singapore/`;
   - `/home1/?utm_source=x` → `/?utm_source=x`;
   - `/sitemap_index.xml` → `/sitemap.xml`;
   - `/2023/10/19/` → `/kinh-nghiem/`;
   - `/?attachment_id=5&utm_source=x` → `/?utm_source=x`.
6. **CI:** the `verify` run on the PR shows the check step, and its output is linked in the PR.
7. **Budget:** no client change. Script `transferSize` on `/` is unchanged (148.1 KiB).

**Validation commands:** `pnpm -C 43logistics.vn lint`, `typecheck`, `check:boundaries`, `tokens:check`, `i18n:check`, `build`, `check:redirects`. No consent change; no automated tests (ADR 0004).

### Implementation Hints

- Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md`: `statusCode`, matching, query handling, and how it interacts with `trailingSlash`.
- `next.config.ts` can import the pure builder with a relative import (`./modules/seo/application/redirect-rules`). Read the CSV with `node:fs` at config load, never at request time.
- In the check script, use Node's `fetch` with `redirect: "manual"`. Resolve `Location` against `--base`, and use a bounded concurrency of about 8.
- Lessons from F-06: `curl -L -w '%{num_redirects}'` for hop counts, `--path-as-is` for encoded paths, and kill stale `next-server` processes before measuring.

### Related

- Roadmap: `docs/context/10-roadmap.md` F-07 (L-01 strict gate, A-04 uploads, L-02 host).
- Context: `05-seo-and-tracking.md` ("Redirects & legacy URLs"), `09-migration.md`, `43logistics.vn/data/redirect-map.csv`.
- Specs: `feature-f06-proxy-composition.md` (proxy order, gone paths, legacy IDs, `skipTrailingSlashRedirect`).
- ADRs: 0004 (scripts, not test suites), 0005 (module layers).
