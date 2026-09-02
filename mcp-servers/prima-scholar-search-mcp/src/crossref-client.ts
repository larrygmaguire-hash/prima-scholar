/**
 * CrossRef API client.
 *
 * Queries the CrossRef REST API for scholarly metadata.
 * No authentication required. Set CROSSREF_MAILTO env var to enter
 * the polite pool for higher rate limits.
 */

import { Paper, SearchOptions, ScholarClient } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations, normaliseDoi, normaliseIsoForCompare, toIsoDate } from "./utils.js";

const BASE_URL = "https://api.crossref.org";

export class CrossRefClient implements ScholarClient {
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

    // Publication date filters. The finer publishedAfter/publishedBefore
    // take precedence over yearFrom/yearTo when both are supplied.
    const filters: string[] = [];
    if (options?.publishedAfter) {
      filters.push(`from-pub-date:${normaliseIsoForCompare(options.publishedAfter, "lower")}`);
    } else if (options?.yearFrom) {
      filters.push(`from-pub-date:${options.yearFrom}-01-01`);
    }
    if (options?.publishedBefore) {
      filters.push(`until-pub-date:${normaliseIsoForCompare(options.publishedBefore, "upper")}`);
    } else if (options?.yearTo) {
      filters.push(`until-pub-date:${options.yearTo}-12-31`);
    }
    if (filters.length > 0) {
      params.set("filter", filters.join(","));
    }

    // Sort. CrossRef defaults to relevance when no sort parameter is given.
    if (options?.sortBy === "date") {
      params.set("sort", "published");
      params.set("order", "desc");
    } else if (options?.sortBy === "citations") {
      params.set("sort", "is-referenced-by-count");
      params.set("order", "desc");
    }

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
   * Get a single paper by DOI.
   */
  async getPaper(id: string): Promise<Paper> {
    return this.resolveDoi(id);
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

    // Extract year and full date from multiple possible date fields
    const dateParts = this.extractDateParts(item);
    const year = dateParts?.[0] ? Number(dateParts[0]) : 0;
    const publishedDate = dateParts ? toIsoDate(dateParts) : undefined;

    const journal = Array.isArray(item["container-title"])
      ? item["container-title"][0]
      : item["container-title"];

    const doi = item.DOI ?? undefined;
    const url = item.URL ?? (doi ? `https://doi.org/${doi}` : "");

    const volume = item.volume ?? undefined;
    const issue = item.issue ?? undefined;
    const pages = item.page ?? undefined;
    const publisher = item.publisher ?? undefined;

    // CrossRef provides licence metadata — check for OA licences
    const licences = item.license ?? [];
    const hasOaLicence = licences.some((l: any) => {
      const licUrl = l.URL ?? "";
      return licUrl.includes("creativecommons.org") || licUrl.includes("/open-access");
    });

    const paper: Paper = {
      title,
      authors,
      abstract,
      year,
      publishedDate,
      journal: journal || undefined,
      volume,
      issue,
      pages,
      publisher,
      doi,
      url,
      source: "crossref",
      sourceId: doi ?? "",
      citationCount:
        typeof item["is-referenced-by-count"] === "number"
          ? item["is-referenced-by-count"]
          : undefined,
      openAccess: hasOaLicence,
      openAccessUrl: hasOaLicence ? url : undefined,
      fullTextAvailable: false, // CrossRef provides metadata, not full text
      citations: {},
    };

    paper.citations = formatAllCitations(paper);
    return paper;
  }

  /**
   * Pick the best available date-parts array. Precedence: published-print,
   * published-online, then the deposit `created` date.
   */
  private extractDateParts(item: any): (number | undefined)[] | undefined {
    const dateParts =
      item["published-print"]?.["date-parts"]?.[0] ??
      item["published-online"]?.["date-parts"]?.[0] ??
      item.created?.["date-parts"]?.[0];

    if (Array.isArray(dateParts) && dateParts[0]) {
      return dateParts;
    }
    return undefined;
  }
}
