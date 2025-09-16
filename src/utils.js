// src/utils.jsx
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * "ListaFolhas" -> "/lista-folhas"
 * "NovaFolha?editId=123" -> "/nova-folha?editId=123"
 */
export function createPageUrl(input) {
  if (!input || typeof input !== "string") return "/";
  const [rawPath, query] = input.split("?");

  const kebab = rawPath
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // camel/Pascal -> kebab
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

  return query ? `/${kebab}?${query}` : `/${kebab}`;
}
