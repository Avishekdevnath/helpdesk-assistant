// Split a knowledge doc into section-sized chunks (by markdown heading or Q/A
// block) so a large doc can be partially retrieved/embedded instead of dropped.
// Shared by the vector-embed path and the text-ranking fallback so chunking
// stays identical across both.
export function chunkDoc(value: string): string[] {
  const parts = value
    .split(/\n(?=#{1,4}\s|\*\*Q[:.]?|\bQ:)/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [value];
}
