---
name: scholar
description: Start a research session — search academic databases, review results, and synthesise findings
user_invocable: true
arguments:
  - name: topic
    description: The research topic or question
    required: false
---

# /scholar — Research Session

Start a structured research session across academic databases.

## Gathering the Topic

If a topic was provided as an argument, use it directly.

If no topic was provided, ask:

> What would you like to research?

Wait for the user's response before proceeding.

## Scope Preferences

Once the topic is established, ask for scope preferences as a brief numbered list:

1. **Depth:** Quick scan (top 5 results) or Comprehensive (top 15+)?
2. **Sources:** All databases, or specific ones (PubMed, arXiv, Semantic Scholar, CrossRef)?
3. **Date range:** Any, or limit to recent N years?

Wait for the user's answers before proceeding.

## Executing the Research

Invoke the `researching-topics` skill with the gathered parameters:
- The research topic/question
- Depth preference (determines `max_results` per search)
- Selected databases (determines which search tools to call)
- Date range filter (passed to search tools where supported)

## After Research Completes

Present the synthesised findings to the user.

Then offer:

> Would you like to import any of these papers to your library?

If yes, use `library_import_from_search` to import selected papers. Offer to add tags or assign to a collection after import.
