/**
 * CrossRef API client.
 *
 * Queries the CrossRef REST API for scholarly metadata.
 * No authentication required. Set CROSSREF_MAILTO env var to enter
 * the polite pool for higher rate limits.
 */

import { Paper, SearchOptions } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations, normaliseDoi } from "./utils.js";

const BASE_URL = "https://api.crossref.org";

export class CrossRefClient {
  private rateLimiter = new RateLimiter(50, 1000);
  private mailto: string | undefined;

  constructor() {
    this.mailto = process.env.CROSSREF_MAILTO;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.mailto) {
      headers["User-Agent"] = `prima-scholar-search-mcp/1.0.0 (mailto:${this.mailto})`;
    }
    return headers;
  }

  /**
   * Search CrossRef for works matching the query.
   */
  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      query,
      rows: String(maxResults),
    });

    const response = await fetch(`${BASE_URL}/works?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`CrossRef search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const items = data?.message?.items ?? [];
    return items.map((item: any) => this.mapToPaper(item));
  }

  /**
   * Resolve a single DOI to its metadata.
   */
  async resolveDoi(doi: string): Promise<Paper> {
    const normDoi = normaliseDoi(doi);
    await this.rateLimiter.acquire();

    const response = await fetch(`${BASE_URL}/works/${encodeURIComponent(normDoi)}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`CrossRef DOI resolution failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.mapToPaper(data.message);
  }

  private mapToPaper(item: any): Paper {
    const title = Array.isArray(item.title) ? item.title[0] ?? "" : item.title ?? "";

    const authors = (item.author ?? []).map((a: any) => ({
      name: [a.given, a.family].filter(Boolean).join(" "),
      affiliations: a.affiliation?.map((aff: any) => aff.name).filter(Boolean),
    }));

    // Strip HTML tags from abstract
    const rawAbstract = item.abstract ?? "";
    const abstract = rawAbstract.replace(/<[^>]*>/g, "").trim();

    // Extract year from multiple possible date fields
    const year = this.extractYear(item);

    const journal = Array.isArray(item["container-title"])
      ? item["container-title"][0]
      : item["container-title"];

    const doi = item.DOI ?? undefined;
    const url = item.URL ?? (doi ? `https://doi.org/${doi}` : "");

    const volume = item.volume ?? undefined;
    const issue = item.issue ?? undefined;
    const pages = item.page ?? undefined;
    const publisher = item.publisher ?? undefined;

    const paper: Paper = {
      title,
      authors,
      abstract,
      year,
      journal: journal || undefined,
      volume,
      issue,
      pages,
      publisher,
      doi,
      url,
      source: "crossref",
      sourceId: doi ?? "",
      citations: {},
    };

    paper.citations = formatAllCitations(paper);
    return paper;
  }

  private extractYear(item: any): number {
    const dateParts =
      item["published-print"]?.["date-parts"]?.[0] ??
      item["published-online"]?.["date-parts"]?.[0] ??
      item.created?.["date-parts"]?.[0];

    if (dateParts && dateParts[0]) {
      return dateParts[0];
    }
    return 0;
  }
}
