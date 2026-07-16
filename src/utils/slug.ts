export function slugify(text: string): string {
  return text
    .trim()
    .replace(/\+/g, '')
    .replace(/\s+/g, '_')
}
