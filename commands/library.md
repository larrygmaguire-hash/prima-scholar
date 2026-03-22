---
name: library
description: Manage your research library — import documents, search, browse collections, view stats
user_invocable: true
arguments:
  - name: action
    description: "Action to perform: import, search, collections, stats, tags"
    required: false
  - name: query
    description: "Search query, file path, or collection name depending on action"
    required: false
---

# /library — Research Library Management

Central hub for managing the research library.

## No Action Specified

If no action was provided, display this menu:

**Research Library**

Available actions:
1. `/library import [file path]` — Import a PDF, Word doc, or text file
2. `/library search [query]` — Search across all documents
3. `/library collections` — View and manage collections
4. `/library stats` — Library statistics
5. `/library tags` — View all tags

Wait for the user to choose an action.

## Action: import

Call `library_import` with the file path provided in the query argument.

After a successful import:
1. Confirm the import with the document title and assigned ID
2. Offer to add tags: "Would you like to add any tags?"
3. If tags provided, call `library_tag` to apply them
4. Offer to assign to a collection: "Would you like to add this to a collection?"
5. If yes, call `library_list_collections` to show available collections, then call `library_add_to_collection` with the user's choice. Offer to create a new collection if none exist or none are suitable.

## Action: search

Call `library_search` with the query argument.

Present results in a structured format showing:
- Document title
- Document ID
- Authors and year
- Tags (if any)
- A brief snippet or abstract excerpt

If no results found, suggest broadening the search terms or checking spelling.

## Action: collections

Call `library_list_collections`.

Present as a table:

| Collection | Documents | Description |
|------------|-----------|-------------|
| [name]     | [count]   | [description] |

After displaying, offer two options:
- "Browse a collection — tell me which one"
- "Create a new collection — give me a name and description"

If the user wants to browse, call `library_search` filtered by that collection. If the user wants to create, call `library_create_collection` with the provided name and description.

## Action: stats

Call `library_stats`.

Present a formatted summary including:
- Total documents in library
- Documents by type (PDF, article, etc.)
- Top tags with counts
- Number of collections
- Recent imports (if available)

## Action: tags

Call `library_stats` and extract the `topTags` data.

Present all tags with their document counts, sorted by frequency. Offer to filter the library by a specific tag if the user wants to explore.
