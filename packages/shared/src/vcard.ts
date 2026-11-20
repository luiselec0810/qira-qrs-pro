export interface VCardData {
  firstName: string;
  lastName?: string;
  title?: string;
  company?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  photoUrl?: string;
  note?: string;
}

/** Escapes text values per RFC 2426 (vCard 3.0). */
function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

/** Folds lines longer than 75 octets (RFC 2426 §2.6). */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 74) parts.push(line.slice(i, i + 74));
  return parts.join("\r\n ");
}

/** RF-05.2: builds a vCard 3.0 document (CRLF line endings). */
export function buildVCard(d: VCardData): string {
  const first = d.firstName.trim();
  const last = (d.lastName ?? "").trim();
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc([first, last].filter(Boolean).join(" "))}`,
  ];
  if (d.company) lines.push(`ORG:${esc(d.company)}`);
  if (d.title) lines.push(`TITLE:${esc(d.title)}`);
  if (d.phone) lines.push(`TEL;TYPE=CELL,VOICE:${esc(d.phone)}`);
  if (d.whatsapp && d.whatsapp !== d.phone) lines.push(`TEL;TYPE=CELL,MSG:${esc(d.whatsapp)}`);
  if (d.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(d.email)}`);
  if (d.website) lines.push(`URL:${esc(d.website)}`);
  if (d.address) lines.push(`ADR;TYPE=WORK:;;${esc(d.address)};;;;`);
  if (d.photoUrl) lines.push(`PHOTO;VALUE=URI:${d.photoUrl}`);
  if (d.note) lines.push(`NOTE:${esc(d.note)}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function vcardFileName(d: VCardData): string {
  const base = [d.firstName, d.lastName].filter(Boolean).join("-").normalize("NFD").replace(/[^\w-]+/g, "");
  return `${base || "contact"}.vcf`;
}

/** wa.me link from any phone format. */
export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
