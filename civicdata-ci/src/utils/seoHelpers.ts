/**
 * SEO & OpenGraph Dynamic Meta Tags Manager
 * Dynamically updates document title and social share previews on client-side routing
 */

interface SeoMetadata {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function updateDocumentSeo({
  title,
  description = "Plateforme citoyenne de suivi budgétaire, des investissements publics et annuaire des responsables en Côte d'Ivoire.",
  image = "/images/facebook_cover_suivibudget.jpg",
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = "website",
}: SeoMetadata): void {
  if (typeof document === 'undefined') return;

  // 1. Update Document Title
  const baseTitle = "Suivi Budget Côte d'Ivoire";
  document.title = title ? `${title} | ${baseTitle}` : `${baseTitle} - Transparence des Investissements Publics`;

  // 2. Helper to set or update meta tag
  const setMetaTag = (selector: string, attrName: string, attrValue: string, content: string) => {
    let tag = document.querySelector(selector) as HTMLMetaElement | null;
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attrName, attrValue);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Standard description
  setMetaTag('meta[name="description"]', 'name', 'description', description);

  // OpenGraph (Facebook / WhatsApp / LinkedIn)
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', document.title);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
  setMetaTag('meta[property="og:image"]', 'property', 'og:image', image);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', url);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', type);

  // Twitter Cards
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', document.title);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', image);
}
