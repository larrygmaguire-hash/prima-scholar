/**
 * MCP Tool Definitions for PRIMA Scholar Search.
 *
 * Each tool defines its name, description, and input schema.
 * Read-only tools for academic search across multiple APIs.
 */

export const TOOLS = [
  {
    name: "scholar_search",
    description:
      "Search across multiple academic databases simultaneously (PubMed, arXiv, Semantic Scholar, CrossRef). Returns deduplicated results sorted by citation count. Use this for broad literature discovery.",
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
            "Maximum results per source. Default 10. Total results may be up to max_results × number of sources before deduplication.",
        },
        sources: {
          type: "array",
          items: {
            type: "string",
            enum: ["pubmed", "arxiv", "semantic_scholar", "crossref"],
          },
          description:
            "Which databases to search. Default: all four. Specify a subset to narrow scope.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "pubmed_search",
    description:
      "Search PubMed for biomedical and life sciences literature. Supports PubMed query syntax including MeSH terms, field tags, and boolean operators.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "PubMed search query. Supports field tags like [Title], [Author], [MeSH Terms] and boolean operators AND, OR, NOT.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return. Default 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "pubmed_get_paper",
    description:
      "Get full metadata for a single PubMed article by its PMID. Returns title, authors, abstract, journal, DOI, and APA7 citation.",
    inputSchema: {
      type: "object",
      properties: {
        pmid: {
          type: "string",
          description: "PubMed ID (numeric string, e.g. '38123456').",
        },
      },
      required: ["pmid"],
    },
  },
  {
    name: "arxiv_search",
    description:
      "Search arXiv for preprints in physics, mathematics, computer science, quantitative biology, quantitative finance, statistics, and other fields.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for arXiv papers.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return. Default 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "arxiv_get_paper",
    description:
      "Get full metadata for a single arXiv paper by its arXiv ID. Returns title, authors, abstract, categories, and APA7 citation.",
    inputSchema: {
      type: "object",
      properties: {
        arxiv_id: {
          type: "string",
          description: "arXiv paper ID (e.g. '2301.12345' or 'cs.AI/0301001').",
        },
      },
      required: ["arxiv_id"],
    },
  },
  {
    name: "semantic_search",
    description:
      "Search Semantic Scholar's academic graph for papers across all disciplines. Returns citation counts and links to the Semantic Scholar knowledge graph.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for academic papers.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return. Default 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "semantic_get_paper",
    description:
      "Get full metadata for a single paper from Semantic Scholar. Accepts multiple ID formats: Semantic Scholar ID, DOI:10.xxx/xxx, ARXIV:2301.12345, or PMID:38123456.",
    inputSchema: {
      type: "object",
      properties: {
        paper_id: {
          type: "string",
          description:
            "Paper identifier. Can be a Semantic Scholar ID, DOI (prefix with 'DOI:'), arXiv ID (prefix with 'ARXIV:'), or PubMed ID (prefix with 'PMID:').",
        },
      },
      required: ["paper_id"],
    },
  },
  {
    name: "semantic_citations",
    description:
      "Get papers that cite the given paper. Useful for forward citation tracking — finding newer work that builds on a known paper.",
    inputSchema: {
      type: "object",
      properties: {
        paper_id: {
          type: "string",
          description:
            "Paper identifier (Semantic Scholar ID, DOI:xxx, ARXIV:xxx, or PMID:xxx).",
        },
        max_results: {
          type: "number",
          description: "Maximum number of citing papers to return. Default 10.",
        },
      },
      required: ["paper_id"],
    },
  },
  {
    name: "semantic_references",
    description:
      "Get papers referenced by the given paper. Useful for backward citation tracking — finding the foundational work a paper builds on.",
    inputSchema: {
      type: "object",
      properties: {
        paper_id: {
          type: "string",
          description:
            "Paper identifier (Semantic Scholar ID, DOI:xxx, ARXIV:xxx, or PMID:xxx).",
        },
        max_results: {
          type: "number",
          description:
            "Maximum number of referenced papers to return. Default 10.",
        },
      },
      required: ["paper_id"],
    },
  },
  {
    name: "crossref_search",
    description:
      "Search CrossRef for scholarly works by metadata. CrossRef indexes DOIs and metadata from most major publishers worldwide.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query for scholarly works.",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results to return. Default 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "crossref_resolve_doi",
    description:
      "Resolve a DOI to its full metadata via CrossRef. Returns title, authors, journal, publication date, abstract (if available), and APA7 citation.",
    inputSchema: {
      type: "object",
      properties: {
        doi: {
          type: "string",
          description:
            "The DOI to resolve (e.g. '10.1038/nature12373'). Can include or omit the 'https://doi.org/' prefix.",
        },
      },
      required: ["doi"],
    },
  },
];
