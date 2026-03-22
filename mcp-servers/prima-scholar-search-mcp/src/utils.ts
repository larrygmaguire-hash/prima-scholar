/**
 * Utility functions for citation formatting and deduplication.
 */

import { Author, Paper } from "./types.js";

/**
 * Format a single author name in APA7 style: "LastName, F. M."
 * Handles names in "First Last" format by splitting on spaces.
 */
function formatAuthorApa7(author: Author): string {
  const parts = author.name.trim().split(/\s+/);
  if (parts.length === 0) return author.name;
  if (parts.length === 1) return parts[0];

  const lastName = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");

  return `${lastName}, ${initials}`;
}

/**
 * Format a Paper into an APA7 citation string.
 *
 * Handles single author, two authors, and three or more authors.
 * Handles preprints (no journal) and missing DOIs.
 */
export function formatApa7Citation(paper: Paper): string {
  // Format authors
  let authorStr: string;
  if (paper.authors.length === 0) {
    authorStr = "Unknown";
  } else if (paper.authors.length === 1) {
    authorStr = formatAuthorApa7(paper.authors[0]);
  } else if (paper.authors.length === 2) {
    authorStr = `${formatAuthorApa7(paper.authors[0])}, & ${formatAuthorApa7(paper.authors[1])}`;
  } else {
    // APA7 lists up to 20 authors
    const formatted = paper.authors.slice(0, 20).map(formatAuthorApa7);
    const last = formatted.pop();
    authorStr = `${formatted.join(", ")}, & ${last}`;
  }

  // Year
  const yearStr = paper.year ? `(${paper.year})` : "(n.d.)";

  // Title — italicised in APA7 for standalone works, plain for journal articles
  const title = paper.title.replace(/\.$/, "");

  // Build citation
  let citation = `${authorStr} ${yearStr}. ${title}.`;

  if (paper.journal) {
    // Journal article format
    citation += ` ${paper.journal}.`;
  } else if (paper.source === "arxiv") {
    citation += " arXiv.";
  }

  // DOI or URL
  if (paper.doi) {
    const normDoi = normaliseDoi(paper.doi);
    citation += ` https://doi.org/${normDoi}`;
  } else if (paper.url) {
    citation += ` ${paper.url}`;
  }

  return citation;
}

/**
 * Normalise a DOI string: strip common prefixes, lowercase, trim.
 */
export function normaliseDoi(doi: string): string {
  return doi
    .trim()
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

/**
 * Deduplicate papers by DOI.
 *
 * When duplicates are found, prefer the source with more metadata
 * (measured by number of non-null fields).
 */
export function deduplicateByDoi(papers: Paper[]): Paper[] {
  const doiMap = new Map<string, Paper>();
  const noDoi: Paper[] = [];

  for (const paper of papers) {
    if (!paper.doi) {
      noDoi.push(paper);
      continue;
    }

    const normDoi = normaliseDoi(paper.doi);
    const existing = doiMap.get(normDoi);

    if (!existing) {
      doiMap.set(normDoi, paper);
    } else {
      // Prefer the paper with more metadata
      const existingScore = metadataScore(existing);
      const newScore = metadataScore(paper);
      if (newScore > existingScore) {
        doiMap.set(normDoi, paper);
      }
    }
  }

  return [...doiMap.values(), ...noDoi];
}

/**
 * Score a paper by how many metadata fields are populated.
 */
function metadataScore(paper: Paper): number {
  let score = 0;
  if (paper.title) score++;
  if (paper.abstract) score++;
  if (paper.authors.length > 0) score++;
  if (paper.year) score++;
  if (paper.journal) score++;
  if (paper.doi) score++;
  if (paper.citationCount != null) score++;
  if (paper.keywords && paper.keywords.length > 0) score++;
  return score;
}
