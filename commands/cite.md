---
name: cite
description: Look up a paper by DOI or title and return a formatted APA7 citation
user_invocable: true
arguments:
  - name: query
    description: A DOI (e.g., 10.1234/example) or paper title to look up
    required: true
---

# /cite — Quick Citation Lookup

Look up a paper and return a clean APA7 citation ready to paste.

## Detect Query Type

Determine whether the query is a DOI or a title:
- **DOI:** The query contains a `10.` prefix followed by a slash (e.g., `10.1037/pspa0000123`). Treat as a DOI.
- **Title:** Anything else. Treat as a title search.

## Check Library First

Before searching external databases, call `library_search` with the query. If the paper is already in the local library, note this in the output:

> This paper is already in your library (ID: [document_id]).

## DOI Lookup

If the query is a DOI:
1. Call `crossref_resolve_doi` with the DOI
2. Format the result as an APA7 citation
3. Return the citation

## Title Search

If the query is a title:
1. Call `scholar_search` with the title, setting `max_results` to 3
2. Present the matches as a numbered list with title, authors, year, and source
3. Let the user pick which paper they want
4. Return the APA7 citation for the selected paper

## Output Format

Return only the formatted citation, clean and ready to paste. No additional commentary unless the paper was found in the library (note that separately).

Example output:

> Deci, E. L., & Ryan, R. M. (2000). The "what" and "why" of goal pursuits: Human needs and the self-determination of behaviour. *Psychological Inquiry*, *11*(4), 227–268. https://doi.org/10.1207/S15327965PLI1104_01
>
> *Already in your library (ID: doc_abc123)*
