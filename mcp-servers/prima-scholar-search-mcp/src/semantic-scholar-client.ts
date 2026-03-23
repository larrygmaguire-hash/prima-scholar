/**
 * Semantic Scholar Graph API client.
 *
 * Queries the Semantic Scholar academic graph for papers, citations,
 * and references. Optional API key via SEMANTIC_SCHOLAR_KEY env var.
 */

import { Paper, SearchOptions } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations } from "./utils.js";

const BASE_URL = "https://api.semanticscholar.org/graph/v1";
const FIELDS = "title,authors,abstract,year,venue,externalIds,citationCount,url";

export class SemanticScholarClient {
  private rateLimiter: RateLimiter;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.SEMANTIC_SCHOLAR_KEY;
    // 100 requests per 5 minutes without key
    this.rateLimiter = new RateLimiter(100, 5 * 60 * 1000);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }
    return headers;
  }

  /**
   * Search for papers matching the query.
   */
  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      query,
      limit: String(maxResults),
      fields: FIELDS,
    });

    const response = await fetch(`${BASE_URL}/paper/search?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(
        `Semantic Scholar search failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const papers = data?.data ?? [];
    return papers.map((p: any) => this.mapToPaper(p));
  }

  /**
   * Get a single paper by ID.
   * ID can be a Semantic Scholar ID, DOI:xxx, ARXIV:xxx, or PMID:xxx.
   */
  async getPaper(id: string): Promise<Paper> {
    await this.rateLimiter.acquire();

    const response = await fetch(
      `${BASE_URL}/paper/${encodeURIComponent(id)}?fields=${FIELDS}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(
        `Semantic Scholar get paper failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return this.mapToPaper(data);
  }

  /**
   * Get papers that cite the given paper.
   */
  async getCitations(
    paperId: string,
    options?: SearchOptions
  ): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      fields: FIELDS,
      limit: String(maxResults),
    });

    const response = await fetch(
      `${BASE_URL}/paper/${encodeURIComponent(paperId)}/citations?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(
        `Semantic Scholar citations failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const citations = data?.data ?? [];
    return citations
      .map((c: any) => c.citingPaper)
      .filter((p: any) => p && p.title)
      .map((p: any) => this.mapToPaper(p));
  }

  /**
   * Get papers referenced by the given paper.
   */
  async getReferences(
    paperId: string,
    options?: SearchOptions
  ): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      fields: FIELDS,
      limit: String(maxResults),
    });

    const response = await fetch(
      `${BASE_URL}/paper/${encodeURIComponent(paperId)}/references?${params}`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error(
        `Semantic Scholar references failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const references = data?.data ?? [];
    return references
      .map((r: any) => r.citedPaper)
      .filter((p: any) => p && p.title)
      .map((p: any) => this.mapToPaper(p));
  }

  private mapToPaper(item: any): Paper {
    const doi = item.externalIds?.DOI ?? undefined;
    const url = item.url ?? (doi ? `https://doi.org/${doi}` : "");

    const paper: Paper = {
      title: item.title ?? "",
      authors: (item.authors ?? []).map((a: any) => ({ name: a.name ?? "" })),
      abstract: item.abstract ?? "",
      year: item.year ?? 0,
      journal: item.venue || undefined,
      doi,
      url,
      source: "semantic_scholar",
      sourceId: item.paperId ?? "",
      citationCount: item.citationCount ?? undefined,
      citations: {},
    };

    paper.citations = formatAllCitations(paper);
    return paper;
  }
}
