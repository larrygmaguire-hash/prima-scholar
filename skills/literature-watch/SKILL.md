---
name: literature-watch
description: "Run a recurring scan of academic databases for papers published since the last check on a fixed set of topics, screen them for relevance, and write a dated digest with APA7 references. Use for \"what is new in the literature on X\", \"run the literature watch\", \"weekly paper scan\", or when /literature-watch is invoked. One-off topic research goes to researching-topics; appraising papers already in hand goes to analysing-research."
---

# Literature Watch

A recurring recency scan. Where `researching-topics` answers one question once, this skill watches a standing set of topics and reports only what is new since the last run.

## Requirements

- PRIMA Scholar Search MCP 2.1.0 or later (`published_after`, `sort_by`, `exclude_dois` on `scholar_search`).
- PRIMA Scholar Library MCP (the library is the memory of what has been seen).
- A workspace config at `.claude/literature-watch/config.md` and a state file at `.claude/literature-watch/state.json`. Create both from `references/config-template.md` on first run.

## Workflow

1. **Load config and state.** Read `.claude/literature-watch/config.md` (topic groups, sources, venues, screening rules, digest folder) and `.claude/literature-watch/state.json` (`lastRun`, `seenDois`). If the command carried `since YYYY-MM-DD`, use that. Otherwise use `lastRun`. On a first run with neither, use 14 days before today.

2. **Confirm the run window** in one line: "Scanning [N] topic groups for papers published since [date]." No further questions unless the config is missing.

3. **Dispatch the scan** to the `literature-watch-agent` subagent. The prompt carries: the config path, the `since` date, the most recent 150 DOIs from `seenDois` (as the `exclude_dois` argument), the digest output path `[digestDir]/YYYY-MM-DD-literature-watch.md`, and the sidecar path `[digestDir]/YYYY-MM-DD-literature-watch-selected.json`. The agent searches, screens, writes the digest and the sidecar, imports the selected papers to the library, and returns only the two paths plus counts.

4. **Update state** from the sidecar with Bash and jq: set `lastRun` to today, append the selected and screened-out DOIs to `seenDois` (cap 2,000, oldest dropped), append a run record `{date, since, found, selected}` to `runs` (cap 52). Never edit the state file with an editor tool.

5. **Report** in five lines or fewer: digest path, papers found, papers selected, the top two or three titles, and any source errors the agent reported. Do not paste the digest into the conversation.

## Dry Run

`--dry-run` performs steps 1 to 3 but the agent skips library import and step 4 is skipped. The digest is still written, with `(dry run)` in its header.

## Screening Standard

The agent applies the rules in the config. Defaults when the config is silent:

- **Include** empirical studies, systematic reviews and meta-analyses, substantive theory or conceptual papers in the listed venues, and working papers from the listed series.
- **Exclude** technical machine-learning papers with no workplace, labour or organisational dimension, clinical AI unless the subject is clinicians' work, education technology unless the subject is workforce or professional learning, opinion pieces without argument or data, anything already in the library.
- **Preprints** are included only when `include_preprints: true` and are labelled as preprints in the digest.

## Digest Format

Follow `references/digest-template.md`. Group papers under the config's theme headings, one entry per paper: APA7 reference, evidence type, one-sentence finding written in hedged language drawn from the abstract, one sentence on relevance to the config's stated interest, and a link (open-access URL where available, otherwise the DOI). Close with an "Also Surfaced, Not Selected" list of titles so the reader can audit the screen. All headings in Title Case. No em dashes, colons or semicolons in prose.

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Every result is old | `sort_by` left at default | The agent must pass `sort_by: "date"` on every scan call |
| Same papers every week | `exclude_dois` not passed or state not updated | Check step 4 ran; check the sidecar lists DOIs |
| Empty scan | `since` too recent for indexing lag | Databases index with a lag of days to weeks; widen with `since` or accept a quiet week |
| Venue sweep returns nothing | Venue names do not match the source's journal string | Use short distinctive substrings ("Applied Psychology", not the full title) |
| Tool not found: `published_after` | Server older than 2.1.0 | Rebuild the search server and restart Claude Code |
