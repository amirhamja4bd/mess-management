export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function uniqueSlug(base: string): string {
  const slug = slugify(base) || "org";
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`.slice(0, 100);
}
