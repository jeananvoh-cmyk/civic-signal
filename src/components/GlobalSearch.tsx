import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Zap, Droplets, Wrench, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  service_type: string;
  report_category: string;
  description: string;
  commune: string;
  quartier: string;
  status: string;
  created_at: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = `%${query.trim()}%`;
      const { data } = await supabase
        .from("reports")
        .select("id, service_type, report_category, description, commune, quartier, status, created_at")
        .or(`description.ilike.${q},commune.ilike.${q},quartier.ilike.${q}`)
        .order("created_at", { ascending: false })
        .limit(8);
      setResults((data as SearchResult[]) ?? []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (r: SearchResult) => {
    navigate(`/signalement/${r.id}`);
    onClose();
  };

  const serviceIcon = (r: SearchResult) => {
    if (r.report_category === "infrastructure") return <Wrench className="h-4 w-4 text-teal-500 shrink-0" />;
    if (r.service_type === "electricity") return <Zap className="h-4 w-4 text-amber-500 shrink-0" />;
    return <Droplets className="h-4 w-4 text-blue-500 shrink-0" />;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 px-4 bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par commune, quartier, description…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto divide-y divide-border">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                >
                  {serviceIcon(r)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {r.commune}{r.quartier ? ` · ${r.quartier}` : ""}
                      <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${r.status === "resolved" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.status === "resolved" ? "Résolu" : "Actif"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun signalement trouvé pour &ldquo;{query}&rdquo;
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-5 text-center text-xs text-muted-foreground">
            Tapez au moins 2 caractères pour rechercher
          </div>
        )}
      </motion.div>
    </div>
  );
}
