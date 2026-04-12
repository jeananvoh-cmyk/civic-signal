import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Zap, Droplets, Wrench, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COMMUNE_COLORS } from "@/lib/communes";

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

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const q = `%${query.trim()}%`;
      const { data } = await supabase
        .from("reports")
        .select("id, service_type, report_category, description, commune, quartier, status, created_at")
        .or(`description.ilike.${q},commune.ilike.${q},quartier.ilike.${q}`)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      setResults(data ?? []);
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (id: string) => {
    navigate(`/signalement/${id}`);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher par commune, quartier ou description…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-h-[60vh] overflow-y-auto divide-y divide-border"
            >
              {results.map((r) => {
                const color = COMMUNE_COLORS[r.commune] || "#888";
                const isElec = r.service_type === "electricity";
                const isInfra = r.report_category === "infrastructure";
                const Icon = isInfra ? Wrench : isElec ? Zap : Droplets;
                return (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent transition-colors"
                  >
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: color + "20" }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{r.description}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {r.commune}{r.quartier ? ` · ${r.quartier}` : ""}
                        <span className="ml-auto text-[10px]">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun signalement actif trouvé pour « {query} »
          </div>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <div className="px-4 py-4 text-xs text-muted-foreground text-center">
            Tapez au moins 2 caractères pour rechercher
          </div>
        )}
      </motion.div>
    </div>
  );
}
