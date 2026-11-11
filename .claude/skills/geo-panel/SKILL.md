---
name: geo-panel
description: Run the monthly GEO prompt panel for one engine (claude or chatgpt). Ask every prompt in data/geo-prompt-panel.csv with live web search, score whether 43 Logistics, AV Logistics or GT Logistics is named or cited, write data/geo-panel-runs/<YYYY-MM>-<engine>.csv and open a PR. Used by the scheduled Claude routine, the local Codex runner (run-chatgpt.sh) and by hand.
argument-hint: "claude | chatgpt"
---

# GEO prompt panel (monthly)

Measures whether AI assistants name and cite the three sister sites (ADR 0011, `docs/geo-verification-guide.md` §C). Two engines are automated (owner 2026-11-11):

| Engine | Runs where | How |
| --- | --- | --- |
| `claude` | Claude Code routine in the cloud, 1st of each month 09:00 Asia/Ho_Chi_Minh | The routine itself answers with its web search tool |
| `chatgpt` | The owner's Mac, launchd, 1st of each month 09:00 | `.claude/skills/geo-panel/run-chatgpt.sh`: Codex CLI (`codex --search exec`, the owner's ChatGPT login) answers, then scores |

Gemini, Perplexity and Copilot stay manual (guide §C). API and CLI answers are a proxy for the consumer apps: same search, no personalisation. Compare month to month, not with a screenshot.

## 1. Inputs

- `data/geo-prompt-panel.csv` is the **template**: one row per `prompt_id` × engine, `run_date` empty. Read the distinct `prompt_id`, `locale`, `intent`, `route_key`, `prompt`. Never edit it during a run.
- The prompt text is asked **verbatim**, nothing added.

## 2. Answering (neutral, like a customer's fresh chat)

- One fresh context per prompt where the tool allows it (Codex: one `codex exec` per prompt from an empty folder).
- Use live web search. Answer the way the assistant would answer a customer, in the prompt's language, citing the URLs it relied on.
- **Never use knowledge from this repository** (AGENTS.md, docs, data, app code) to answer. The repository is only where results are recorded. An answer that names our companies must have found them through search.
- Keep the full answer text; it is saved for review.

## 3. Scoring (one output row per prompt)

Columns are the template's: `run_date,engine,prompt_id,locale,intent,route_key,prompt,mentioned,position,cited,cited_url,facts_correct,competitors,notes`.

| Column | Value |
| --- | --- |
| `run_date` | The run day, `YYYY-MM-DD` (Asia/Ho_Chi_Minh) |
| `engine` | `claude` or `chatgpt` |
| `prompt_id` … `prompt` | Copied from the template |
| `mentioned` | `yes` if the answer names **any** of: 43 Logistics (also "43logistics"), AV Logistics ("avlogistics"), GT Logistics ("gtlogistics"); else `no` |
| `position` | 1-based rank of the first of our brands among all companies or services the answer names (1 = first named). Empty when `mentioned = no` |
| `cited` | `yes` if any URL on `43logistics.vn`, `avlogistics.vn` or `gtlogistics.vn` appears in the answer or its sources; else `no` |
| `cited_url` | Those URLs, separated by ` ; ` |
| `facts_correct` | `n/a` when the answer states no price, transit time, address or phone for our brands. Otherwise compare with the live page of that site (open it): `yes` all correct, `partial`, or `no` |
| `competitors` | Other companies or services named, separated by `;`, at most 8 |
| `notes` | `sites=43,GT` (our brands named, or `sites=none`). For prompts with an owner below, add ` owner=<site> match=yes|no` (`yes` when the owner site is named). Optional short remark. No personal data |

Owner site per prompt (one locality or topic per site, so the sites don't compete):

| Prompts | Owner |
| --- | --- |
| P31 (dry food to Korea from Da Nang), P35–P36 (Singapore), P40 (Cẩm Lệ), P41–P44 and P51 (Huế) | `43` |
| P32 (frozen food to Korea), P45–P47 (Quảng Bình / Đồng Hới) | `GT` |
| P33–P34 (food to Taiwan from central Vietnam), P48–P50 (Quảng Trị / Cửa Việt) | `AV` |
| P52 (Quảng Trị or Quảng Bình) | `AV` or `GT` (match if either is named) |
| P01–P30, P37–P39 | none (no `owner=`) |

## 4. Output and PR

1. Write `data/geo-panel-runs/<YYYY-MM>-<engine>.csv`: the header plus one row per prompt, in `prompt_id` order.
2. Write `data/geo-panel-runs/<YYYY-MM>-<engine>-answers.md`: `## P01 — <prompt>` then the answer text, per prompt.
3. Branch `docs/geo-panel-<YYYY-MM>-<engine>` from `origin/main`; stage only those two files; Conventional Commit `docs(geo): <engine> prompt panel <YYYY-MM>`.
4. Push and open a PR to `main` (`gh pr create -R Dienvm/logistics-context`). The PR body is in English and lists: prompts asked, `mentioned` count, `cited` count, per-site counts (43 / AV / GT), owner-match count for P31–P52 (`x of y`), and the prompts where a site was cited for the first time compared with the previous month's file of the same engine (if any).
5. Never merge the PR, never edit the template or other months' files.
