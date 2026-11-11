#!/usr/bin/env bash
# Monthly GEO prompt panel, ChatGPT engine, on the owner's Mac (see SKILL.md in this folder).
# Codex CLI answers each prompt with live web search using the owner's ChatGPT login (no API
# key, no extra cost), then scores the answers; the results go to a PR on logistics-context.
#
#   .claude/skills/geo-panel/run-chatgpt.sh [--only P31,P41] [--no-pr]
#
# launchd runs the copy on origin/main (geo-panel-chatgpt.plist.template). Needs codex, gh
# (logged in as Dienvm), git and python3. Long: about 30–40 minutes for 52 prompts.
set -euo pipefail

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
ROOT="${GEO_ROOT:-$HOME/Documents/project/logistics-context}"
ONLY=""
OPEN_PR=1
while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --no-pr) OPEN_PR=0; shift ;;
    *) echo "usage: run-chatgpt.sh [--only P01,P02] [--no-pr]" >&2; exit 2 ;;
  esac
done

say() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
notify() { osascript -e "display notification \"$1\" with title \"GEO panel (ChatGPT)\"" 2>/dev/null || true; }
for cmd in codex gh git python3; do
  command -v "$cmd" >/dev/null || { say "missing $cmd"; notify "Thiếu $cmd, không chạy được"; exit 1; }
done

MONTH="$(TZ=Asia/Ho_Chi_Minh date +%Y-%m)"
DAY="$(TZ=Asia/Ho_Chi_Minh date +%Y-%m-%d)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/43l-geo-XXXXXX")"
mkdir -p "$WORK/empty" "$WORK/answers" "$WORK/logs"
BRANCH="docs/geo-panel-$MONTH-chatgpt"

git -C "$ROOT" fetch -q origin
if git -C "$ROOT" ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  BRANCH="$BRANCH-$(date +%d%H%M)"
fi
git -C "$ROOT" worktree add -q -b "$BRANCH" "$WORK/repo" "${GEO_REF:-origin/main}"
REPO="$WORK/repo"
SKILL="$REPO/.claude/skills/geo-panel"
cleanup() { git -C "$ROOT" worktree remove --force "$REPO" 2>/dev/null || true; }
[ "$OPEN_PR" = 1 ] && trap cleanup EXIT

# Distinct prompts of the template: prompt_id <TAB> prompt.
python3 - "$REPO/data/geo-prompt-panel.csv" "$ONLY" >"$WORK/prompts.tsv" <<'PY'
import csv, sys
only = {p for p in sys.argv[2].split(",") if p}
seen = {}
for row in csv.DictReader(open(sys.argv[1], encoding="utf-8")):
    seen.setdefault(row["prompt_id"], row["prompt"])
for pid, prompt in seen.items():
    if not only or pid in only:
        print(f"{pid}\t{prompt}")
PY
TOTAL="$(wc -l <"$WORK/prompts.tsv" | tr -d ' ')"
say "asking $TOTAL prompts, branch $BRANCH"
[ "$TOTAL" -gt 0 ] || { say "no prompts to ask"; notify "Không có câu hỏi nào để chạy"; exit 1; }

# One fresh Codex session per prompt, from an empty folder (no repository context), 5 min max.
n=0
while IFS=$'\t' read -r pid prompt; do
  n=$((n + 1))
  if (cd "$WORK/empty" && perl -e 'alarm shift; exec @ARGV' 300 \
    codex --search exec -s read-only --skip-git-repo-check --ephemeral \
    -o "$WORK/answers/$pid.md" "$prompt" </dev/null >"$WORK/logs/$pid.log" 2>&1); then
    say "$n/$TOTAL $pid ok"
  else
    say "$n/$TOTAL $pid failed (see $WORK/logs/$pid.log)"
    printf '(no answer: Codex failed or timed out)\n' >"$WORK/answers/$pid.md"
  fi
done <"$WORK/prompts.tsv"

# Answers file for review, and the scoring input.
python3 - "$WORK" "$MONTH" <<'PY'
import json, sys, pathlib
work, month = pathlib.Path(sys.argv[1]), sys.argv[2]
items, md = [], [f"# GEO prompt panel {month} — chatgpt (Codex CLI, web search)\n"]
for line in (work / "prompts.tsv").read_text(encoding="utf-8").splitlines():
    pid, prompt = line.split("\t", 1)
    answer = (work / "answers" / f"{pid}.md").read_text(encoding="utf-8").strip()
    items.append({"prompt_id": pid, "prompt": prompt, "answer": answer})
    md.append(f"## {pid} — {prompt}\n\n{answer}\n")
(work / "answers.json").write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
(work / "answers-all.md").write_text("\n".join(md), encoding="utf-8")
PY

say "scoring"
{
  echo "You score answers for a monthly GEO panel. Follow section 3 'Scoring' of the rules below exactly,"
  echo "including the owner-site table. Return one row per prompt_id in the JSON shape required."
  echo "For facts_correct, open the live page on our site when the answer states a price, transit"
  echo "time, address or phone for 43 Logistics, AV Logistics or GT Logistics; otherwise use n/a."
  echo
  echo "=== RULES (SKILL.md) ==="
  cat "$SKILL/SKILL.md"
  echo
  echo "=== ANSWERS (JSON) ==="
  cat "$WORK/answers.json"
} >"$WORK/score-prompt.txt"
(cd "$WORK/empty" && perl -e 'alarm shift; exec @ARGV' 1800 \
  codex --search exec -s read-only --skip-git-repo-check --ephemeral \
  --output-schema "$SKILL/score-schema.json" -o "$WORK/scores.json" - \
  <"$WORK/score-prompt.txt" >"$WORK/logs/score.log" 2>&1) || {
  say "scoring failed (see $WORK/logs/score.log)"; notify "Chấm điểm thất bại, xem log"; exit 1; }

# Assemble the run file in the template's columns.
OUT_DIR="$REPO/data/geo-panel-runs"
mkdir -p "$OUT_DIR"
python3 - "$REPO/data/geo-prompt-panel.csv" "$WORK/scores.json" "$OUT_DIR/$MONTH-chatgpt.csv" "$DAY" "$WORK/prompts.tsv" <<'PY'
import csv, json, sys
template, scores_path, out, day, asked = sys.argv[1:6]
asked_ids = [l.split("\t", 1)[0] for l in open(asked, encoding="utf-8").read().splitlines()]
rows = list(csv.DictReader(open(template, encoding="utf-8")))
fields = list(rows[0].keys())
meta = {}
for r in rows:
    meta.setdefault(r["prompt_id"], r)
scores = {s["prompt_id"]: s for s in json.load(open(scores_path, encoding="utf-8"))["rows"]}
with open(out, "w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
    w.writeheader()
    for pid in asked_ids:
        base = {k: meta[pid][k] for k in ("prompt_id", "locale", "intent", "route_key", "prompt")}
        s = scores.get(pid)
        if s is None:
            s = {"mentioned": "", "position": "", "cited": "", "cited_url": "",
                 "facts_correct": "", "competitors": "", "notes": "not scored"}
        w.writerow({**base, "run_date": day, "engine": "chatgpt",
                    **{k: s.get(k, "") for k in ("mentioned", "position", "cited", "cited_url",
                                                 "facts_correct", "competitors", "notes")}})
print(f"wrote {out}")
PY
cp "$WORK/answers-all.md" "$OUT_DIR/$MONTH-chatgpt-answers.md"

SUMMARY="$(python3 - "$OUT_DIR/$MONTH-chatgpt.csv" <<'PY'
import csv, sys
rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8")))
ment = sum(r["mentioned"] == "yes" for r in rows)
cited = sum(r["cited"] == "yes" for r in rows)
sites = {s: sum(f"sites=" in r["notes"] and s in r["notes"].split("sites=")[1].split()[0].split(",") for r in rows) for s in ("43", "AV", "GT")}
owned = [r for r in rows if "owner=" in r["notes"]]
match = sum("match=yes" in r["notes"] for r in owned)
print(f"- Prompts asked: {len(rows)}\n- Mentioned (any of our brands): {ment}\n- Cited (link to one of our sites): {cited}\n"
      f"- Named per site: 43 = {sites['43']}, AV = {sites['AV']}, GT = {sites['GT']}\n"
      f"- Owner site named (P31–P52): {match} of {len(owned)}")
PY
)"
say "$(echo "$SUMMARY" | tr '\n' ' ')"

if [ "$OPEN_PR" = 0 ]; then
  say "--no-pr: results in $OUT_DIR (worktree $REPO kept)"
  exit 0
fi

git -C "$REPO" add "data/geo-panel-runs/$MONTH-chatgpt.csv" "data/geo-panel-runs/$MONTH-chatgpt-answers.md"
git -C "$REPO" commit -q -m "docs(geo): chatgpt prompt panel $MONTH" -m "Automated run of .claude/skills/geo-panel/run-chatgpt.sh (Codex CLI, live web search)."
git -C "$REPO" push -q -u origin "$BRANCH"
URL="$(gh pr create -R Dienvm/logistics-context --base main --head "$BRANCH" \
  --title "docs(geo): chatgpt prompt panel $MONTH" \
  --body "$(printf 'Automated monthly GEO prompt panel, engine `chatgpt` (Codex CLI with live web search on the owner'"'"'s ChatGPT login; a proxy for the ChatGPT app). Rules: `.claude/skills/geo-panel/SKILL.md`.\n\n%s\n\nFiles: `data/geo-panel-runs/%s-chatgpt.csv` and `-answers.md`. Review the scores, then merge.\n' "$SUMMARY" "$MONTH")")"
say "PR: $URL"
notify "Xong: $URL"
