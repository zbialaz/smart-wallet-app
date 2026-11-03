/** "  iFood  " / "IFOOD" / "ífood" → "ifood" (sem acento, minúsculo, sem espaços nas pontas). */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

