/**
 * MCP Tool Definitions for PRIMA Scholar Search v2.
 *
 * Five tools: wizard, search, get_paper, citations, full_text.
 * All backend routing happens inside the server, not at the tool level.
 */

export const TOOLS = [
  {
    name: "scholar_wizard",
    description:
      "Analyse a research query and generate structured guidance questions before searching. " +
      "Returns detected disciplines, suggested sources, and questions for the user (discipline focus, " +
      "open access preference, date range, preprint inclusion). Call this BEFORE scholar_search " +
      "to help the user refine their search. If the user has not been through the wizard, ask them: " +
      "(1) discipline, (2) open access preference, (3) date range, (4) preprint preference — before calling scholar_search.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The user's raw research query or topic.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "scholar_search",
    description:
      "Search across multiple academic databases simultaneously, with recency scanning " +
      "(published_after + sort_by: date) for 'what is new since DATE on X'. Returns deduplicated " +
      "results sorted by open access status (OA first) then citation count by default; other sort " +
      "modes, a publication date window, venue filtering and DOI exclusion are available. Each result " +
      "includes an openAccess flag, openAccessUrl where available, and publishedDate where the source " +
      "supplies one. Searches up to 10 databases: PubMed, arXiv, Semantic Scholar, CrossRef, OpenAlex, " +
      "CORE, Europe PMC, ERIC, bioRxiv/medRxiv, and DBLP. " +
      "IMPORTANT: Before calling this tool, the user should have been guided through scholar_wizard " +
      "or asked: (1) their discipline, (2) whether they want open access only, (3) date range, " +
      "(4) whether to include preprints, (5) whether they want newest-first.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query — keywords, phrases, or boolean expressions.",
        },
        max_results: {
          type: "number",
          description:
            "Maximum results per source. Default 10. Total results may be higher before deduplication.",
        },
        sources: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "pubmed", "arxiv", "semantic_scholar", "crossref",
              "openalex", "core", "europe_pmc", "eric", "biorxiv", "dblp",
            ],
          },
          description:
            "Which databases to search. Default: determined by wizard or all available. " +
            "Specify a subset to narrow scope.",
        },
        open_access_only: {
          type: "boolean",
          description:
            "If true, only return open access papers. If false (default), return all papers " +
            "with OA papers sorted first and gated papers labelled as secondary.",
        },
        year_from: {
          type: "number",
          description: "Earliest publication year to include. Optional.",
        },
        year_to: {
          type: "number",
          description: "Latest publication year to include. Optional.",
        },
        published_after: {
          type: "string",
          description:
            "Only papers published on or after this date (ISO YYYY-MM-DD; YYYY-MM and YYYY accepted). " +
            "Use for 'what is new since my last search'. Finer than year_from and preferred over it. " +
            "Pushed to the source APIs where supported and re-checked client-side for every source.",
        },
        published_before: {
          type: "string",
          description:
            "Only papers published on or before this date (ISO YYYY-MM-DD; YYYY-MM and YYYY accepted). " +
            "Finer than year_to and preferred over it. Combine with published_after for a closed window. " +
            "Defaults to today when sort_by is date, so placeholder future dates from publishers do not lead.",
        },
        sort_by: {
          type: "string",
          enum: ["open_access", "citations", "date", "relevance"],
          description:
            "Result ordering. 'open_access' (default) puts OA papers first then citation count, " +
            "preserving earlier behaviour. 'citations' orders by citation count descending. 'date' orders " +
            "newest first by publishedDate (falling back to year) and is the right choice for recency " +
            "scans, because new papers have few citations and would sink under the default. 'relevance' " +
            "keeps each source's own ranking and interleaves sources round-robin.",
        },
        venues: {
          type: "array",
          items: { type: "string" },
          description:
            "Case-insensitive substring match on journal or publisher name, e.g. " +
            "['Journal of Applied Psychology', 'NBER', 'SSRN']. Applied after retrieval, so combine " +
            "with a higher max_results.",
        },
        exclude_dois: {
          type: "array",
          items: { type: "string" },
          description:
            "DOIs to drop from results, e.g. papers already in your library. Prefixes such as " +
            "'https://doi.org/' and 'doi:' are normalised away before matching.",
        },
        citation_style: {
          type: "string",
          description:
            "Citation format: apa7, harvard, chicago, vancouver, ieee, mla. Default: all styles returned.",
          enum: ["apa7", "harvard", "chicago", "vancouver", "ieee", "mla"],
        },
      },
      required: ["query"],
    },
  },
  {
    name: "scholar_get_paper",
    description:
      "Get full metadata for a single paper by its identifier. Accepts DOIs, PubMed IDs (PMID:xxx), " +
      "arXiv IDs (ARXIV:xxx), Semantic Scholar IDs, OpenAlex IDs (W-prefix or URL), CORE IDs, " +
      "Europe PMC IDs, ERIC IDs, and DBLP keys. The server automatically routes to the correct backend.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Paper identifier. Formats: DOI (10.xxx/xxx), PMID:38123456, ARXIV:2301.12345, " +
            "Semantic Scholar ID, OpenAlex ID (W1234567890), CORE ID, ERIC ID (EJ/ED number), " +
            "DBLP key. Plain DOIs are also accepted without a prefix.",
        },
        citation_style: {
          type: "string",
          description:
            "Citation format: apa7, harvard, chicago, vancouver, ieee, mla. Default: all styles.",
          enum: ["apa7", "harvard", "chicago", "vancouver", "ieee", "mla"],
        },
      },
      required: ["id"],
    },
  },
  {
    name: "scholar_citations",
    description:
      "Get papers that cite or are referenced by a given paper. Useful for forward citation " +
      "tracking (finding newer work that builds on a known paper) and backward citation tracking " +
      "(finding the foundational work a paper builds on). Uses Semantic Scholar and OpenAlex citation graphs.",
    inputSchema: {
      type: "object",
      properties: {
        paper_id: {
          type: "string",
          description:
            "Paper identifier (Semantic Scholar ID, DOI:xxx, ARXIV:xxx, or PMID:xxx).",
        },
        direction: {
          type: "string",
          enum: ["citations", "references"],
          description:
            "Direction: 'citations' for papers citing this one (forward), " +
            "'references' for papers this one cites (backward). Default: citations.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results. Default 10.",
        },
      },
      required: ["paper_id"],
    },
  },
  {
    name: "scholar_full_text",
    description:
      "Retrieve the full text of an open access paper where available. Queries CORE and Europe PMC " +
      "for full-text content. Returns the text content or a direct download URL. Only works for papers " +
      "that are flagged as fullTextAvailable in search results.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Paper identifier — CORE ID, PMC ID, DOI, or any ID from a search result " +
            "where fullTextAvailable was true.",
        },
      },
      required: ["id"],
    },
  },
];
