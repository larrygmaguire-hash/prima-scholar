---
name: literature-watch
description: Scan academic databases for papers published since the last run on your standing topics and write a dated digest
user_invocable: true
arguments:
  - name: since
    description: Optional ISO date (YYYY-MM-DD) to override the last-run date
    required: false
  - name: dry-run
    description: Pass --dry-run to write the digest without importing to the library or updating state
    required: false
---

# /literature-watch

Invoke the `literature-watch` skill with the arguments given. If `.claude/literature-watch/config.md` does not exist, stop and offer to create it from `skills/literature-watch/references/config-template.md`, asking for the Interest paragraph and the first two topic groups.
