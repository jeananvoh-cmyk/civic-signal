import { useEffect } from "react";

interface PageMeta {
  title: string;
  description?: string;
  ogImage?: string;
}

const APP_NAME = "SIGNA-CI";
const DEFAULT_DESC = "Signalez les coupures d'eau, d'électricité et les infrastructures défaillantes à Abidjan.";

const setMeta = (property: string, content: string, attr: "name" | "property" = "name") => {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

export const usePageMeta = ({ title, description = DEFAULT_DESC, ogImage }: PageMeta) => {
  useEffect(() => {
    const fullTitle = `${title} — ${APP_NAME}`;
    document.title = fullTitle;

    setMeta("description", description);

    // Open Graph
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    if (ogImage) setMeta("og:image", ogImage, "property");

    // Twitter Card
    setMeta("twitter:card", "summary");
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);

    return () => {
      document.title = APP_NAME;
    };
  }, [title, description, ogImage]);
};
