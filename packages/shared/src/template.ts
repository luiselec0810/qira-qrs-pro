const VARIABLE_RE = /\{\{\s*([a-zA-Z0-9_\-.]+)\s*\}\}/g;

/** Lists unique `{{variable}}` names used in the given strings (RF-04.2). */
export function extractVariables(...inputs: Array<string | null | undefined>): string[] {
  const found = new Set<string>();
  for (const input of inputs) {
    if (!input) continue;
    for (const m of input.matchAll(VARIABLE_RE)) found.add(m[1]!);
  }
  return [...found];
}

export interface TemplateOptions {
  /** Encode substituted values (use for URLs). */
  encode?: boolean;
  /** Keep the placeholder when the variable is missing instead of replacing with "". */
  keepMissing?: boolean;
}

export function applyTemplate(
  template: string,
  row: Record<string, string | undefined>,
  opts: TemplateOptions = {},
): string {
  return template.replace(VARIABLE_RE, (whole, name: string) => {
    const value = row[name];
    if (value === undefined) return opts.keepMissing ? whole : "";
    return opts.encode ? encodeURIComponent(value) : value;
  });
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * RFC 4180 CSV parser: quoted fields, escaped quotes (""), CRLF/LF, and
 * auto-detected delimiter ("," or ";" — common in Spanish-locale Excel exports).
 */
export function parseCsv(text: string): ParsedCsv {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const nonEmpty = records.filter((r) => r.some((v) => v.trim() !== ""));
  const [headerRow = [], ...dataRows] = nonEmpty;
  const headers = headerRow.map((h) => h.trim());
  const rows = dataRows.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
  return { headers, rows };
}
