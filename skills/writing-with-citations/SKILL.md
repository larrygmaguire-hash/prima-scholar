---
name: writing-with-citations
description: Draft academic prose with inline APA7 citations and a reference list, drawing from the research library and academic databases. Use when asked to "write with citations", "draft a section with references", "academic writing", "write a literature review section", or "cite as I write".
---

# Writing with Citations

## When to Use

- User asks to write a section, paragraph, or document with academic citations
- User wants a literature review section drafted
- User requests academic prose with references
- User asks to "cite as I write" or "add references to this"
- User has research findings and wants them turned into structured prose

## When NOT to Use

- User wants to search for papers without writing — use `researching-topics`
- User wants to import or organise documents — use `managing-research-library`
- User wants non-academic content (blog posts, marketing copy, scripts) — standard content creation applies
- User wants citation formatting only without prose — provide APA7 guidance directly from `references/apa7-quick-reference.md`

## Workflow

1. **Get the writing brief.** Ask the user for:
   - Topic or section heading
   - Target length (word count or paragraph count)
   - Audience: academic, business, or general
   - Existing outline or structure (if any)
   - Preferred citation style (default: APA7, alternatives available — see `references/citation-styles.md`)

2. **Search for relevant sources.**
   - First: `library_search` for previously imported papers
   - If insufficient: `scholar_search` across academic databases
   - Target 5-15 sources depending on section length

3. **Select sources.** Choose the most relevant papers based on:
   - Direct relevance to the topic
   - Recency and citation count
   - Methodological quality (meta-analyses and systematic reviews weighted higher)
   - Diversity of perspectives (avoid citing only one research group)

4. **Draft prose.**
   - Integrate sources naturally into the argument
   - Use inline APA7 citations: (Author, Year)
   - Maintain scholarly tone while remaining accessible
   - Apply confidence tags where empirical claims are made
   - Follow the synthesis patterns in `references/synthesis-patterns.md` (shared with `researching-topics`)

5. **Generate reference list.** Format all cited works in APA7 at the end of the draft. See `references/apa7-quick-reference.md` for formatting rules.

6. **Review Checkpoint.** Present draft for user approval.
   - Approve: write final version to disk
   - Revise: apply changes, re-present
   - Reject: discard and discuss alternative approach

7. **Write to disk.** Save final version at user-specified location or `~/Documents/Agent Outputs/[project-id]/`.

## Output Format

```markdown
# [Section Title]

[Prose with inline citations throughout]

[Each major claim supported by at least one citation]

[Contradictory evidence noted where relevant]

---

## References

Author, A. A., & Author, B. B. (Year). Title of article. *Journal Name*, *volume*(issue), pages. https://doi.org/xxxxx

[Full APA7 reference list]
```

## Examples

**User:** "Write a 500-word section on the role of psychological safety in team performance"
- Search library for "psychological safety", "team performance"
- If insufficient, search Semantic Scholar and PubMed
- Draft section citing Edmondson (1999), Google's Project Aristotle findings, recent meta-analyses
- Present with Review Checkpoint

**User:** "Draft a literature review paragraph on growth mindset interventions in education"
- Search for Dweck, Yeager, mindset intervention studies
- Write 150-200 words citing 3-5 key studies
- Note conflicting evidence (e.g., Sisk et al., 2018 meta-analysis)
- Apply MEDIUM confidence tag

**User:** "Write about attachment theory in organisational leadership, cite as you go"
- Search library first, then databases
- Draft iteratively, citing Bowlby, Hazan & Shaver, Popper & Mayseless
- Build reference list as the section develops

**User:** "I need a section on AI adoption barriers with Harvard referencing"
- Note non-default citation style
- Consult `references/citation-styles.md` for Harvard format
- Draft with Harvard in-text style (Author Year) and corresponding reference list format

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Cannot find enough sources | Topic too niche or library too small | Broaden search terms; run a `researching-topics` session first to populate the library |
| Citations do not match reference list | Mismatch between in-text and reference entries | Cross-check every in-text citation against the reference list before presenting |
| User wants a non-APA7 style | Different academic convention required | Check `references/citation-styles.md` for the requested style and adapt formatting |
| Tone too formal for audience | Business or general audience specified | Reduce jargon, use shorter sentences, integrate citations more conversationally |
| Draft too long or too short | Word count estimate was off | Adjust source count — fewer sources for shorter sections, more for longer |
| User has specific papers they want cited | Papers may not be in library | Import them first via `managing-research-library`, then use in the draft |
