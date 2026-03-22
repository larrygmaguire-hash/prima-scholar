/**
 * Text and Markdown file importer
 */

import fs from "fs";
import path from "path";

export function importTextFile(filePath: string): {
  title: string;
  content: string;
  fileType: string;
} {
  const raw = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();
  const fileType = ext === ".md" ? "markdown" : "text";

  // Extract title from first markdown heading or use filename
  let title: string;
  if (ext === ".md") {
    const headingMatch = raw.match(/^#\s+(.+)$/m);
    title = headingMatch ? headingMatch[1].trim() : path.basename(filePath, ext);
  } else {
    title = path.basename(filePath, ext);
  }

  return { title, content: raw, fileType };
}
