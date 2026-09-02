#!/usr/bin/env node
/**
 * PRIMA Scholar Search MCP Server v2.1.0
 *
 * A Model Context Protocol server for searching academic literature
 * across 10 databases: PubMed, arXiv, Semantic Scholar, CrossRef,
 * OpenAlex, CORE, Europe PMC, ERIC, bioRxiv/medRxiv, and DBLP.
 *
 * 5-tool surface: wizard, search, get_paper, citations, full_text.
 * Recency-aware: date-window filtering, venue filtering, DOI exclusion
 * and selectable sort order on scholar_search.
 *
 * @author PRIMA Contributors
 * @version 2.1.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { PubMedClient } from "./pubmed-client.js";
import { ArxivClient } from "./arxiv-client.js";
import { SemanticScholarClient } from "./semantic-scholar-client.js";
import { CrossRefClient } from "./crossref-client.js";
import { OpenAlexClient } from "./openalex-client.js";
import { CoreClient } from "./core-client.js";
import { EuropePmcClient } from "./europepmc-client.js";
import { EricClient } from "./eric-client.js";
import { BiorxivClient } from "./biorxiv-client.js";
import { DblpClient } from "./dblp-client.js";
import { TOOLS } from "./tools.js";
import {
  CitationStyle,
  FiltersApplied,
  Paper,
  SourceName,
  ALL_SOURCES,
  SearchOptions,
  SearchResult,
  SortMode,
  SORT_MODES,
} from "./types.js";
import { compareDateDesc, deduplicateByDoi, normaliseDoi, normaliseIsoForCompare, todayIso } from "./utils.js";
import { runWizard } from "./wizard.js";

// ── Citation Filtering ───────────────────────────────────────────────

function filterCitations(paper: Paper, style?: CitationStyle): Paper {
  if (!style) return paper;
  const citation = paper.citations[style];
  return { ...paper, citations: citation ? { [style]: citation } : {} };
}

function filterPapersCitations(papers: Paper[], style?: CitationStyle): Paper[] {
  if (!style) return papers;
  return papers.map((p) => filterCitations(p, style));
}

// ── Client Initialisation ────────────────────────────────────────────

const pubmedClient = new PubMedClient();
const arxivClient = new ArxivClient();
const semanticClient = new SemanticScholarClient();
const crossrefClient = new CrossRefClient();
const openalexClient = new OpenAlexClient();
const coreClient = new CoreClient();
const europepmcClient = new EuropePmcClient();
const ericClient = new EricClient();
const biorxivClient = new BiorxivClient();
const dblpClient = new DblpClient();

// Source routing map
const SOURCE_CLIENTS: Record<SourceName, { search: (q: string, o?: SearchOptions) => Promise<Paper[]>; getPaper: (id: string) => Promise<Paper> }> = {
  pubmed: pubmedClient,
  arxiv: arxivClient,
  semantic_scholar: semanticClient,
  crossref: crossrefClient,
  openalex: openalexClient,
  core: coreClient,
  europe_pmc: europepmcClient,
  eric: ericClient,
  biorxiv: biorxivClient,
  dblp: dblpClient,
};

// Sources that require API keys
const API_KEY_SOURCES: Record<string, { envVar: string; url: string }> = {
  core: { envVar: "CORE_API_KEY", url: "https://core.ac.uk/services/api" },
};

// ── MCP Server ───────────────────────────────────────────────────────

const server = new Server(
  {
    name: "prima-scholar-search-mcp",
    version: "2.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── Wizard ───────────────────────────────────────────────
      case "scholar_wizard": {
        const query = args?.query as string;
        if (!query) throw new McpError(ErrorCode.InvalidParams, "query is required");

        const result = runWizard(query);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      // ── Search ───────────────────────────────────────────────
      case "scholar_search": {
        const query = args?.query as string;
        if (!query) throw new McpError(ErrorCode.InvalidParams, "query is required");

        const maxResults = (args?.max_results as number) ?? 10;
        const sources = (args?.sources as SourceName[]) ?? ALL_SOURCES;
        const openAccessOnly = (args?.open_access_only as boolean) ?? false;
        const yearFrom = args?.year_from as number | undefined;
        const yearTo = args?.year_to as number | undefined;
        const citationStyle = args?.citation_style as CitationStyle | undefined;

        const publishedAfter = parseIsoDateArg(args?.published_after, "published_after");
        const sortBy = parseSortByArg(args?.sort_by);
        // Newest-first scans cap at today by default: CrossRef and OpenAlex carry
        // placeholder future dates (2035, 2121, 2026-12-31) that would otherwise lead.
        const publishedBefore =
          parseIsoDateArg(args?.published_before, "published_before") ??
          (sortBy === "date" ? todayIso() : undefined);
        const venues = parseStringArrayArg(args?.venues, "venues");
        const excludeDois = parseStringArrayArg(args?.exclude_dois, "exclude_dois");

        const searchOptions: SearchOptions = {
          maxResults,
          yearFrom,
          yearTo,
          openAccessOnly,
          publishedAfter,
          publishedBefore,
          sortBy,
          venues,
          excludeDois,
        };

        const results = await aggregatedSearch(query, sources, searchOptions);

        if (citationStyle) {
          results.papers = filterPapersCitations(results.papers, citationStyle);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        };
      }

      // ── Get Paper ────────────────────────────────────────────
      case "scholar_get_paper": {
        const id = args?.id as string;
        if (!id) throw new McpError(ErrorCode.InvalidParams, "id is required");
        const citationStyle = args?.citation_style as CitationStyle | undefined;

        const paper = await routeGetPaper(id);
        const filtered = citationStyle ? filterCitations(paper, citationStyle) : paper;

        return {
          content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
        };
      }

      // ── Citations ────────────────────────────────────────────
      case "scholar_citations": {
        const paperId = args?.paper_id as string;
        if (!paperId) throw new McpError(ErrorCode.InvalidParams, "paper_id is required");

        const direction = (args?.direction as string) ?? "citations";
        const maxResults = (args?.max_results as number) ?? 10;

        let papers: Paper[];
        if (direction === "references") {
          papers = await semanticClient.getReferences(paperId, { maxResults });
        } else {
          papers = await semanticClient.getCitations(paperId, { maxResults });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  papers,
                  totalResults: papers.length,
                  direction,
                  source: "semantic_scholar",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // ── Full Text ────────────────────────────────────────────
      case "scholar_full_text": {
        const id = args?.id as string;
        if (!id) throw new McpError(ErrorCode.InvalidParams, "id is required");

        const fullText = await retrieveFullText(id);

        return {
          content: [{ type: "text", text: JSON.stringify(fullText, null, 2) }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, `Scholar search error: ${message}`);
  }
});

// ── Argument Parsing ─────────────────────────────────────────────────

const ISO_DATE_ARG = /^\d{4}(-\d{2}(-\d{2})?)?$/;

function parseIsoDateArg(value: unknown, name: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !ISO_DATE_ARG.test(value.trim())) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${name} must be an ISO date: YYYY-MM-DD, YYYY-MM or YYYY (got ${JSON.stringify(value)})`
    );
  }
  return value.trim();
}

function parseSortByArg(value: unknown): SortMode | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !SORT_MODES.includes(value as SortMode)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `sort_by must be one of ${SORT_MODES.join(", ")} (got ${JSON.stringify(value)})`
    );
  }
  return value as SortMode;
}

function parseStringArrayArg(value: unknown, name: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new McpError(ErrorCode.InvalidParams, `${name} must be an array of strings`);
  }
  const cleaned = (value as string[]).map((v) => v.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

// ── Result Filtering and Sorting ─────────────────────────────────────

/**
 * Keep a paper only when its publication date could fall inside the
 * inclusive [publishedAfter, publishedBefore] window. Partial dates are
 * padded generously so a paper is dropped only when it is certainly
 * outside the window; papers with no date information are kept.
 */
function withinDateWindow(paper: Paper, publishedAfter?: string, publishedBefore?: string): boolean {
  if (!publishedAfter && !publishedBefore) return true;

  const lowerBound = publishedAfter ? normaliseIsoForCompare(publishedAfter, "lower") : undefined;
  const upperBound = publishedBefore ? normaliseIsoForCompare(publishedBefore, "upper") : undefined;

  if (paper.publishedDate) {
    // Latest possible day for this paper must reach the lower bound, and the
    // earliest possible day must not pass the upper bound.
    const paperLatest = normaliseIsoForCompare(paper.publishedDate, "upper");
    const paperEarliest = normaliseIsoForCompare(paper.publishedDate, "lower");
    if (lowerBound && paperLatest < lowerBound) return false;
    if (upperBound && paperEarliest > upperBound) return false;
    return true;
  }

  if (paper.year && paper.year > 0) {
    const lowerYear = lowerBound ? Number(lowerBound.substring(0, 4)) : undefined;
    const upperYear = upperBound ? Number(upperBound.substring(0, 4)) : undefined;
    if (lowerYear !== undefined && paper.year < lowerYear) return false;
    if (upperYear !== undefined && paper.year > upperYear) return false;
    return true;
  }

  // No date information at all: keep rather than silently drop.
  return true;
}

function matchesVenue(paper: Paper, venues: string[]): boolean {
  const journal = (paper.journal ?? "").toLowerCase();
  const publisher = (paper.publisher ?? "").toLowerCase();
  return venues.some((v) => {
    const term = v.toLowerCase();
    return term.length > 0 && (journal.includes(term) || publisher.includes(term));
  });
}

function compareCitationsDesc(a: Paper, b: Paper): number {
  const aCount = a.citationCount ?? -1;
  const bCount = b.citationCount ?? -1;
  return bCount - aCount;
}

/**
 * Interleave papers round-robin across sources, preserving each source's own
 * rank order: source 1 rank 1, source 2 rank 1, ..., source 1 rank 2, ...
 */
function interleaveBySourceRank(papers: Paper[], rankOf: WeakMap<Paper, number>): Paper[] {
  const bySource = new Map<string, Paper[]>();
  for (const paper of papers) {
    const bucket = bySource.get(paper.source) ?? [];
    bucket.push(paper);
    bySource.set(paper.source, bucket);
  }
  for (const bucket of bySource.values()) {
    bucket.sort((a, b) => (rankOf.get(a) ?? Number.MAX_SAFE_INTEGER) - (rankOf.get(b) ?? Number.MAX_SAFE_INTEGER));
  }

  const buckets = [...bySource.values()];
  const interleaved: Paper[] = [];
  let depth = 0;
  while (interleaved.length < papers.length) {
    for (const bucket of buckets) {
      if (depth < bucket.length) interleaved.push(bucket[depth]);
    }
    depth++;
  }
  return interleaved;
}

function sortPapers(papers: Paper[], sortBy: SortMode, rankOf: WeakMap<Paper, number>): Paper[] {
  switch (sortBy) {
    case "citations":
      return [...papers].sort(compareCitationsDesc);
    case "date":
      return [...papers].sort((a, b) => {
        const byDate = compareDateDesc(a.publishedDate, b.publishedDate, a.year, b.year);
        return byDate !== 0 ? byDate : compareCitationsDesc(a, b);
      });
    case "relevance":
      return interleaveBySourceRank(papers, rankOf);
    case "open_access":
    default:
      // Original behaviour: OA first, then citation count descending
      return [...papers].sort((a, b) => {
        if (a.openAccess && !b.openAccess) return -1;
        if (!a.openAccess && b.openAccess) return 1;
        return compareCitationsDesc(a, b);
      });
  }
}

// ── Aggregated Search ────────────────────────────────────────────────

async function aggregatedSearch(
  query: string,
  sources: SourceName[],
  options: SearchOptions
): Promise<SearchResult> {
  const sortBy: SortMode = options.sortBy ?? "open_access";
  const activeSources: SourceName[] = [];
  const missingApiKeys: string[] = [];

  // Check which sources are available
  for (const source of sources) {
    const keyInfo = API_KEY_SOURCES[source];
    if (keyInfo && !process.env[keyInfo.envVar]) {
      missingApiKeys.push(
        `${source}: API key not configured. Set ${keyInfo.envVar} in your environment. ` +
        `Get a free key at ${keyInfo.url}`
      );
      continue;
    }
    activeSources.push(source);
  }

  if (activeSources.length === 0) {
    throw new Error(
      `No sources available. Missing API keys:\n${missingApiKeys.join("\n")}`
    );
  }

  // Fan out to all active sources in parallel
  const searchPromises = activeSources.map(async (source) => {
    const client = SOURCE_CLIENTS[source];
    return client.search(query, options);
  });

  const results = await Promise.allSettled(searchPromises);

  const allPapers: Paper[] = [];
  const successfulSources: string[] = [];
  const errors: string[] = [];

  // Transient per-source rank, used only by the "relevance" sort. Keyed by
  // object identity so nothing is added to the Paper payload.
  const rankOf = new WeakMap<Paper, number>();

  results.forEach((result, index) => {
    const source = activeSources[index];
    if (result.status === "fulfilled") {
      result.value.forEach((paper, rank) => rankOf.set(paper, rank));
      allPapers.push(...result.value);
      successfulSources.push(source);
    } else {
      errors.push(`${source}: ${result.reason?.message ?? String(result.reason)}`);
    }
  });

  if (successfulSources.length === 0) {
    throw new Error(`All sources failed:\n${errors.join("\n")}`);
  }

  // Deduplicate by DOI
  let deduplicated = deduplicateByDoi(allPapers);

  // Filter to OA only if requested
  if (options.openAccessOnly) {
    deduplicated = deduplicated.filter((p) => p.openAccess);
  }

  // 1. Date window (client-side, all sources; catches what the APIs let through)
  if (options.publishedAfter || options.publishedBefore) {
    deduplicated = deduplicated.filter((p) =>
      withinDateWindow(p, options.publishedAfter, options.publishedBefore)
    );
  }

  // 2. Venue filter
  if (options.venues && options.venues.length > 0) {
    deduplicated = deduplicated.filter((p) => matchesVenue(p, options.venues!));
  }

  // 3. DOI exclusion
  let excludedDois = 0;
  if (options.excludeDois && options.excludeDois.length > 0) {
    const excluded = new Set(options.excludeDois.map(normaliseDoi));
    const before = deduplicated.length;
    deduplicated = deduplicated.filter((p) => !p.doi || !excluded.has(normaliseDoi(p.doi)));
    excludedDois = before - deduplicated.length;
  }

  // 4. Sort
  deduplicated = sortPapers(deduplicated, sortBy, rankOf);

  const openAccessCount = deduplicated.filter((p) => p.openAccess).length;
  const gatedCount = deduplicated.length - openAccessCount;

  const filtersApplied: FiltersApplied = {
    ...(options.publishedAfter ? { publishedAfter: options.publishedAfter } : {}),
    ...(options.publishedBefore ? { publishedBefore: options.publishedBefore } : {}),
    ...(options.venues && options.venues.length > 0 ? { venues: options.venues } : {}),
    ...(options.excludeDois && options.excludeDois.length > 0 ? { excludedDois } : {}),
    ...(options.yearFrom ? { yearFrom: options.yearFrom } : {}),
    ...(options.yearTo ? { yearTo: options.yearTo } : {}),
    ...(options.openAccessOnly ? { openAccessOnly: true } : {}),
  };

  return {
    papers: deduplicated,
    totalResults: deduplicated.length,
    openAccessCount,
    gatedCount,
    query,
    sources: successfulSources,
    sortBy,
    ...(Object.keys(filtersApplied).length > 0 ? { filtersApplied } : {}),
    ...(errors.length > 0 ? { errors } : {}),
    ...(missingApiKeys.length > 0 ? { missingApiKeys } : {}),
  };
}

// ── Paper ID Routing ─────────────────────────────────────────────────

async function routeGetPaper(id: string): Promise<Paper> {
  // Route based on ID format
  if (id.startsWith("PMID:")) {
    return pubmedClient.getPaper(id.replace("PMID:", ""));
  }
  if (id.startsWith("ARXIV:") || id.startsWith("arxiv:")) {
    return arxivClient.getPaper(id.replace(/^ARXIV:|^arxiv:/, ""));
  }
  if (id.startsWith("W") && /^W\d+$/.test(id)) {
    return openalexClient.getPaper(id);
  }
  if (id.startsWith("https://openalex.org/")) {
    return openalexClient.getPaper(id);
  }
  if (/^(EJ|ED)\d+$/.test(id)) {
    return ericClient.getPaper(id);
  }
  if (id.startsWith("PMC")) {
    return europepmcClient.getPaper(id);
  }

  // DOI — try Semantic Scholar first (has citation data), fall back to CrossRef
  if (id.startsWith("DOI:") || id.startsWith("doi:") || id.includes("10.")) {
    const doiId = id.replace(/^DOI:|^doi:/, "").trim();
    try {
      return await semanticClient.getPaper(`DOI:${doiId}`);
    } catch {
      return await crossrefClient.resolveDoi(doiId);
    }
  }

  // Default: try Semantic Scholar (accepts its own IDs)
  return semanticClient.getPaper(id);
}

// ── Full Text Retrieval ──────────────────────────────────────────────

async function retrieveFullText(id: string): Promise<{
  fullText?: string;
  downloadUrl?: string;
  source: string;
  message?: string;
}> {
  // Try CORE first (has full-text API)
  if (coreClient.isConfigured()) {
    try {
      const coreId = id.replace(/^CORE:/, "");
      const text = await coreClient.getFullText(coreId);
      if (text) {
        return { fullText: text, source: "core" };
      }
    } catch {
      // Fall through to Europe PMC
    }
  }

  // Try Europe PMC for PMC content
  if (id.startsWith("PMC") || id.startsWith("PMID:") || id.includes("10.")) {
    try {
      const paper = await europepmcClient.getPaper(id.replace("PMID:", ""));
      if (paper.fullTextAvailable && paper.openAccessUrl) {
        return {
          downloadUrl: paper.openAccessUrl,
          source: "europe_pmc",
          message: "Full text available via Europe PMC. Use the downloadUrl to access.",
        };
      }
    } catch {
      // Fall through
    }
  }

  // Try arXiv (always has PDF)
  if (id.startsWith("ARXIV:") || id.startsWith("arxiv:") || id.match(/^\d{4}\.\d+/)) {
    const arxivId = id.replace(/^ARXIV:|^arxiv:/, "");
    return {
      downloadUrl: `https://arxiv.org/pdf/${arxivId}`,
      source: "arxiv",
      message: "PDF available from arXiv.",
    };
  }

  // Try bioRxiv/medRxiv
  if (id.includes("10.1101/")) {
    return {
      downloadUrl: `https://doi.org/${id}`,
      source: "biorxiv",
      message: "Preprint available from bioRxiv/medRxiv.",
    };
  }

  return {
    source: "none",
    message:
      "Full text not available through PRIMA Scholar. " +
      "The paper may be behind a paywall. Check your institutional access or the publisher's website.",
  };
}

// ── Start Server ─────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PRIMA Scholar Search MCP Server v2.1.0 running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
