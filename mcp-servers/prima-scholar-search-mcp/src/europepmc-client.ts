/**
 * Europe PMC API client.
 *
 * Queries the Europe PMC REST API for biomedical and life sciences literature.
 * No authentication required. Broader coverage than PubMed — includes
 * European research council content, preprints, and patents.
 *
 * API docs: https://europepmc.org/RestfulWebService
 */

import { Paper, SearchOptions, ScholarClient } from "./types.js";
import { RateLimiter } from "./rate-limiter.js";
import { formatAllCitations } from "./utils.js";

const BASE_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest";

export class EuropePmcClient implements ScholarClient {
  private rateLimiter = new RateLimiter(10, 1000);

  async search(query: string, options?: SearchOptions): Promise<Paper[]> {
    const maxResults = options?.maxResults ?? 10;
    await this.rateLimiter.acquire();

    let searchQuery = query;

    // Year filter
    if (options?.yearFrom || options?.yearTo) {
      const from = options?.yearFrom ?? 1900;
      const to = options?.yearTo ?? new Date().getFullYear();
      searchQuery += ` PUB_YEAR:[${from} TO ${to}]`;
    }

    // OA filter
    if (options?.openAccessOnly) {
      searchQuery += " OPEN_ACCESS:y";
    }

    const params = new URLSearchParams({
      query: searchQuery,
      format: "json",
      pageSize: String(maxResults),
      resultType: "core",
    });

    const response = await fetch(`${BASE_URL}/search?${params}`);

    if (!response.ok) {
      throw new Error(`Europe PMC search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as EuropePmcResponse;
    return (data.resultList?.result ?? []).map((article) => this.mapToPaper(article));
  }

  async getPaper(id: string): Promise<Paper> {
    await this.rateLimiter.acquire();

    // Accept PMID, PMC ID, or DOI
    let source = "MED";
    let articleId = id;

    if (id.startsWith("PMC")) {
      source = "PMC";
    } else if (id.includes("10.")) {
      // DOI — use search
      return (await this.search(`DOI:"${id}"`, { maxResults: 1 }))[0];
    }

    const params = new URLSearchParams({
      format: "json",
      resultType: "core",
    });

    const response = await fetch(`${BASE_URL}/${source}/${articleId}?${params}`);

    if (!response.ok) {
      throw new Error(`Europe PMC get paper failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as EuropePmcResponse;
    const article = data.resultList?.result?.[0];
    if (!article) {
      throw new Error(`Paper not found: ${id}`);
    }
    return this.mapToPaper(article);
  }

  private mapToPaper(article: EuropePmcArticle): Paper {
    const authors = (article.authorList?.author ?? []).map((a) => ({
      name: `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || "Unknown",
      affiliations: a.affiliation ? [a.affiliation] : undefined,
    }));

    const isOa = article.isOpenAccess === "Y";
    const pmcUrl = article.pmcid
      ? `https://europepmc.org/article/PMC/${article.pmcid}`
      : undefined;
    const pmUrl = `https://europepmc.org/article/MED/${article.pmid ?? article.id}`;

    const paper: Omit<Paper, "citations"> = {
      title: article.title ?? "Untitled",
      authors,
      abstract: article.abstractText ?? "",
      year: article.pubYear ? parseInt(article.pubYear, 10) : 0,
      journal: article.journalTitle ?? undefined,
      volume: article.journalVolume ?? undefined,
      issue: article.issue ?? undefined,
      pages: article.pageInfo ?? undefined,
      publisher: undefined,
      doi: article.doi ?? undefined,
      url: pmcUrl ?? pmUrl,
      source: "europe_pmc",
      sourceId: article.pmid ?? article.id ?? "",
      citationCount: article.citedByCount ?? undefined,
      keywords: article.keywordList?.keyword ?? undefined,
      openAccess: isOa,
      openAccessUrl: isOa ? (pmcUrl ?? pmUrl) : undefined,
      fullTextAvailable: isOa && !!article.pmcid,
    };

    return { ...paper, citations: formatAllCitations(paper) };
  }
}

// ── Europe PMC Response Types ────────────────────────────────────────

interface EuropePmcResponse {
  resultList?: {
    result?: EuropePmcArticle[];
  };
}

interface EuropePmcArticle {
  id?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  title?: string;
  authorList?: {
    author?: {
      firstName?: string;
      lastName?: string;
      affiliation?: string;
    }[];
  };
  abstractText?: string;
  journalTitle?: string;
  journalVolume?: string;
  issue?: string;
  pageInfo?: string;
  pubYear?: string;
  isOpenAccess?: string;
  citedByCount?: number;
  keywordList?: { keyword?: string[] };
}
