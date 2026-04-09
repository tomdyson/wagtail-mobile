export function markdownPayload(md: string): { format: string; content: string } {
  return { format: "markdown", content: md };
}
