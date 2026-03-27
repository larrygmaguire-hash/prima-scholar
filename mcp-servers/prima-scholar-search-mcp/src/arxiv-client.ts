/**
 * arXiv API client.
 *
 * Queries the arXiv Atom feed API for preprint metadata.
 * No authentication required.
 */

import { XMLParser } from "fast-xml-parser";
import { Paper, SearchOptions, ScholarClient } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations } from "./utils.js";

const BASE_URL = "http://export.arxiv.org/api/query";

export class ArxivClient implements ScholarClient {
  // arXiv requests 1 request per 3 seconds
  private rateLimiter = new RateLimiter(1, 3000);
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
  }

  /**
   * Search arXiv for papers matching the query.
   */
  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      search_query: `all:${query}`,
      start: "0",
      max_results: String(maxResults),
    });

    const response = await fetch(`${BASE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(
        `arXiv search failed: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();
    return this.parseEntries(xmlText);
  }

  /**
   * Get a single paper by arXiv ID.
   */
  async getPaper(arxivId: string): Promise<Paper> {
    await this.rateLimiter.acquire();

    const params = new URLSearchParams({
      id_list: arxivId,
    });

    const response = await fetch(`${BASE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(
        `arXiv get paper failed: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();
    const papers = this.parseEntries(xmlText);

    if (papers.length === 0) {
      throw new Error(`No paper found for arXiv ID: ${arxivId}`);
    }

    return papers[0];
  }

  private parseEntries(xmlText: string): Paper[] {
    const parsed = this.xmlParser.parse(xmlText);

    let entries = parsed?.feed?.entry;
    if (!entries) return [];
    if (!Array.isArray(entries)) entries = [entries];

    return entries
      .filter((entry: any) => entry.title)
      .map((entry: any) => this.mapToPaper(entry));
  }

  private mapToPaper(entry: any): Paper {
    // Title — clean whitespace and newlines
    const title = String(entry.title ?? "")
      .replace(/\s+/g, " ")
      .trim();

    // Authors — may be single object or array
    const authorData = entry.author;
    let authors: { name: string }[];
    if (!authorData) {
      authors = [];
    } else if (Array.isArray(authorData)) {
      authors = authorData.map((a: any) => ({
        name: String(a.name ?? "").trim(),
      }));
    } else {
      authors = [{ name: String(authorData.name ?? "").trim() }];
    }

    // Abstract
    const abstract = String(entry.summary ?? "")
      .replace(/\s+/g, " ")
      .trim();

    // Year from published date
    const published = String(entry.published ?? "");
    const year = published ? Number(published.substring(0, 4)) : 0;

    // arXiv URL and ID
    const url = this.extractUrl(entry);
    const sourceId = this.extractArxivId(url);

    // DOI if present (arxiv namespace)
    const doi = this.extractDoi(entry);

    // Keywords from category terms
    const keywords = this.extractKeywords(entry);

    // All arXiv papers are open access preprints
    const paper: Paper = {
      title,
      authors,
      abstract,
      year,
      journal: undefined,
      doi,
      url,
      source: "arxiv",
      sourceId,
      keywords: keywords.length > 0 ? keywords : undefined,
      openAccess: true,
      openAccessUrl: url,
      fullTextAvailable: true,
      citations: {},
    };

    paper.citations = formatAllCitations(paper);
    return paper;
  }

  private extractUrl(entry: any): string {
    // The id field contains the arXiv URL
    if (typeof entry.id === "string") return entry.id;

    // Or check link elements for the abstract page
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    for (const link of links) {
      if (link?.["@_type"] === "text/html" || !link?.["@_type"]) {
        return link?.["@_href"] ?? "";
      }
    }
    return "";
  }

  private extractArxivId(url: string): string {
    // Extract ID from URL like http://arxiv.org/abs/2301.12345v1
    const match = url.match(/arxiv\.org\/abs\/(.+?)(?:v\d+)?$/);
    return match ? match[1] : url;
  }

  private extractDoi(entry: any): string | undefined {
    // arXiv DOI is sometimes in arxiv:doi element or link with doi title
    if (entry["arxiv:doi"]) {
      const doi = entry["arxiv:doi"];
      return typeof doi === "string" ? doi : doi["#text"] ?? undefined;
    }

    // Check links for DOI
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    for (const link of links) {
      const href = link?.["@_href"] ?? "";
      if (href.includes("doi.org/")) {
        return href.replace(/^https?:\/\/doi\.org\//, "");
      }
    }

    return undefined;
  }

  private extractKeywords(entry: any): string[] {
    const categories = entry.category;
    if (!categories) return [];

    const cats = Array.isArray(categories) ? categories : [categories];
    return cats
      .map((c: any) => c["@_term"])
      .filter(Boolean) as string[];
  }
}
