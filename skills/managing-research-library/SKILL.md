---
name: managing-research-library
description: Import documents, organise collections, search and manage the local research library. Use when asked to "import this paper", "add to library", "search my library", "organise research", "create a collection", "tag documents", or "library stats".
---

# Managing Research Library

## When to Use

- User wants to import a paper, PDF, or document into the library
- User asks to search, browse, or list documents in the library
- User wants to create or manage collections
- User asks to tag, update, or delete documents
- User wants library statistics or an overview of stored research
- User asks to organise research materials after a search session

## When NOT to Use

- User wants to search academic databases for new papers — use `researching-topics`
- User wants to write prose with citations — use `writing-with-citations`
- User is asking about files that are not research documents (e.g., project files, client documents)

## Workflow

1. **Determine operation type** from the user's request:

### Import

- Accept file path or DOI from user
- Detect file type (PDF, DOCX, TXT, MD)
- Call `library_import` with the file path
- If DOI is available, enrich metadata via `crossref_resolve_doi`
- Confirm import with extracted metadata: title, authors, year, type
- Suggest tagging or collection assignment

### Import from Search

- After a `researching-topics` session, offer to import selected papers
- Call `library_import_from_search` with search result identifiers
- Confirm each import with metadata summary

### Search

- Take query from user
- Call `library_search` with the query
- Present results with: title, authors, year, tags, collections, document ID
- Offer follow-up actions: view full details, add to collection, tag

### Browse

- Call `library_list` with optional filters: collection, tag, year, document type
- Present results in a table
- Offer sorting by date added, year, title, or citation count

### Organise

- **Create collection:** Ask for name and description, call `library_create_collection`
- **Add to collection:** Take document ID(s) and collection name, call `library_add_to_collection`
- **Tag documents:** Take document ID(s) and tag(s), call `library_tag`
- **Bulk organise:** For 3+ documents, process sequentially with confirmation

### View Details

- Call `library_get_document` with document ID
- Present full metadata, abstract, tags, collections, and notes

### Update

- Take document ID and fields to change
- Call `library_update` with new metadata
- Confirm changes

### Delete

- **Action Checkpoint:** Confirm document title and ID before deletion
- Call `library_delete` only after explicit user confirmation
- Deletion is permanent

### Stats

- Call `library_stats`
- Present summary: total documents, documents by type, documents by year, top tags, collection sizes

2. **Auto-enrich metadata** when DOI is available. Call `crossref_resolve_doi` to fill in authors, year, journal, and generate APA7 citation string.

3. **Present results clearly** with document IDs visible for follow-up actions.

## Output Format

### Import Confirmation

```
Imported: [Title]
Authors: [Author list]
Year: [Year]
Type: [PDF/DOCX/etc.]
DOI: [DOI if available]
Document ID: [ID]

Suggested tags: [auto-suggested based on content]
```

### Library Search Results

```
| # | Title | Authors | Year | Tags | Collection | ID |
|---|-------|---------|------|------|------------|----|
```

### Library Stats

```
## Library Statistics

- **Total documents:** [count]
- **By type:** PDF: [n], DOCX: [n], Other: [n]
- **Collections:** [count]
- **Most used tags:** [top 5]
- **Date range:** [earliest year] - [latest year]
```

## Examples

**User:** "Import this paper" [provides file path]
- Call `library_import` with the path
- If PDF, extract metadata
- Confirm import, suggest tags

**User:** "Search my library for attachment theory"
- Call `library_search` with "attachment theory"
- Present matching documents with IDs
- Offer to view details or organise

**User:** "Create a collection for my thesis literature review"
- Call `library_create_collection` with name "Thesis Literature Review"
- Confirm creation
- Ask if user wants to add existing documents

**User:** "How many papers do I have?"
- Call `library_stats`
- Present summary

**User:** "Tag documents 12, 15, and 23 as 'motivation'"
- Call `library_tag` for each document with tag "motivation"
- Confirm all three tagged

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Import fails | Unsupported file type or corrupted file | Check file type against supported formats in `references/import-formats.md` |
| No metadata extracted | PDF has no embedded metadata | Manually provide title/author or use DOI for enrichment via `crossref_resolve_doi` |
| Search returns nothing | Query too specific or library is empty | Broaden search terms, check `library_stats` to confirm documents exist |
| Duplicate import | Same paper imported twice | Search library by title before importing; use DOI matching when available |
| Cannot find document ID | ID not displayed in previous output | Run `library_search` or `library_list` to retrieve current IDs |
| Collection not found | Name mismatch or not yet created | Run `library_list_collections` to see existing collections |
