// src/utils.jsx
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function createPageUrl(path) {
  return `/${path.toLowerCase()}`; // Ex: "/cadastro" ou "/dashboard"
}
