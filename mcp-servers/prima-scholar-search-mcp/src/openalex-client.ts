/**
 * OpenAlex API client.
 *
 * Queries the OpenAlex REST API for scholarly works across all disciplines.
 * No authentication required. Set OPENALEX_MAILTO env var for the polite pool
 * (higher rate limits and priority).
 *
 * API docs: https://docs.openalex.org/
 */

import { Paper, SearchOptions, ScholarClient } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations } from "./utils.js";

const BASE_URL = "https://api.openalex.org";

export class OpenAlexClient implements ScholarClient {
  private rateLimiter = new RateLimiter(10, 1000);
  private mailto: string | undefined;

  constructor() {
    this.mailto = process.env.OPENALEX_MAILTO ?? process.env.CROSSREF_MAILTO;
  }

  private buildUrl(path: string, params: URLSearchParams): string {
    if (this.mailto) {
      params.set("mailto", this.mailto);
    }
    return `${BASE_URL}${path}?${params}`;
  }

  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      search: query,
      per_page: String(maxResults),
      sort: "cited_by_count:desc",
    });

    // Year filter
    if (options?.yearFrom || options?.yearTo) {
      const from = options?.yearFrom ?? 1900;
      const to = options?.yearTo ?? new Date().getFullYear();
      params.set("filter", `publication_year:${from}-${to}`);
    }

    // OA filter
    if (options?.openAccessOnly) {
      const existing = params.get("filter");
      const oaFilter = "is_oa:true";
      params.set("filter", existing ? `${existing},${oaFilter}` : oaFilter);
    }

    const url = this.buildUrl("/works", params);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenAlex search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenAlexWorksResponse;
    return (data.results ?? []).map((work) => this.mapToPaper(work));
  }

  async getPaper(id: string): Promise<Paper> {
    await this.rateLimiter.acquire();

    // Accept OpenAlex ID, DOI, or other external IDs
    let path: string;
    if (id.startsWith("W") || id.startsWith("https://openalex.org/")) {
      path = `/works/${id.replace("https://openalex.org/", "")}`;
    } else if (id.includes("10.")) {
      path = `/works/doi:${id}`;
    } else {
      path = `/works/${id}`;
    }

    const params = new URLSearchParams();
    const url = this.buildUrl(path, params);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenAlex get paper failed: ${response.status} ${response.statusText}`);
    }

    const work = (await response.json()) as OpenAlexWork;
    return this.mapToPaper(work);
  }

  private mapToPaper(work: OpenAlexWork): Paper {
    const authors = (work.authorships ?? []).map((a) => ({
      name: a.author?.display_name ?? "Unknown",
      affiliations: a.institutions?.map((i) => i.display_name).filter(Boolean) as string[],
    }));

    const doi = work.doi?.replace("https://doi.org/", "") ?? undefined;

    const paper: Omit<Paper, "citations"> = {
      title: work.title ?? "Untitled",
      authors,
      abstract: reconstructAbstract(work.abstract_inverted_index) ?? "",
      year: work.publication_year ?? 0,
      journal: work.primary_location?.source?.display_name ?? undefined,
      volume: work.biblio?.volume ?? undefined,
      issue: work.biblio?.issue ?? undefined,
      pages: work.biblio?.first_page
        ? work.biblio.last_page
          ? `${work.biblio.first_page}-${work.biblio.last_page}`
          : work.biblio.first_page
        : undefined,
      publisher: work.primary_location?.source?.host_organization_name ?? undefined,
      doi,
      url: work.primary_location?.landing_page_url ?? work.id ?? "",
      source: "openalex",
      sourceId: work.id ?? "",
      citationCount: work.cited_by_count ?? undefined,
      keywords: work.keywords?.map((k) => k.keyword ?? k.display_name).filter(Boolean) as string[],
      openAccess: work.open_access?.is_oa ?? false,
      openAccessUrl: work.open_access?.oa_url ?? undefined,
      fullTextAvailable: !!(work.open_access?.oa_url),
    };

    return { ...paper, citations: formatAllCitations(paper) };
  }
}

// ── OpenAlex Response Types ──────────────────────────────────────────

interface OpenAlexWorksResponse {
  results: OpenAlexWork[];
  meta?: { count: number };
}

interface OpenAlexWork {
  id: string;
  title?: string;
  publication_year?: number;
  doi?: string;
  authorships?: {
    author?: { display_name?: string };
    institutions?: { display_name?: string }[];
  }[];
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: {
    source?: {
      display_name?: string;
      host_organization_name?: string;
    };
    landing_page_url?: string;
  };
  open_access?: {
    is_oa?: boolean;
    oa_url?: string;
  };
  cited_by_count?: number;
  biblio?: {
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
  };
  keywords?: { keyword?: string; display_name?: string }[];
}

/**
 * OpenAlex stores abstracts as inverted indexes.
 * Reconstruct the abstract text from the inverted index.
 */
function reconstructAbstract(invertedIndex?: Record<string, number[]>): string | null {
  if (!invertedIndex) return null;

  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }

  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, word]) => word).join(" ");
}
