import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, MapPin, X } from "lucide-react";

interface QuartierSearchProps {
  quartiers: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function QuartierSearch({ quartiers, value, onChange }: QuartierSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search
    ? quartiers.filter((q) => q.toLowerCase().includes(search.toLowerCase().trim()))
    : quartiers;

  const displayValue = value === "__other" ? "Autre quartier (saisie libre)..." : value;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (q: string) => {
    onChange(q);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-12 w-full items-center justify-between rounded-xl border-2 px-3.5 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          value
            ? "border-primary/40 bg-card font-semibold text-foreground shadow-xs"
            : "border-border bg-card text-muted-foreground hover:border-primary/30"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <MapPin className={`h-4 w-4 shrink-0 ${value ? "text-primary" : "text-muted-foreground"}`} />
          <span className="truncate">
            {value ? displayValue : "Sélectionnez ou tapez le nom du quartier..."}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
      </button>

      {/* Dropdown with instant propositions */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-2xl border-2 border-border bg-popover shadow-xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
          {/* Search input header */}
          <div className="flex items-center gap-2 border-b border-border/80 bg-muted/40 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tapez quelques lettres (ex: Ang, Riv, Bon)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* List of propositions */}
          <div className="max-h-60 overflow-y-auto overscroll-contain p-1.5 space-y-0.5">
            {filtered.length === 0 && search ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                <MapPin className="h-6 w-6 mx-auto mb-1.5 opacity-30 text-primary" />
                <p className="font-semibold text-foreground">Aucun quartier correspondant à "{search}"</p>
                <p className="text-xs mt-1 text-muted-foreground">Vous pouvez choisir l'option "Autre quartier" ci-dessous.</p>
              </div>
            ) : (
              filtered.map((q) => {
                const isSelected = value === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSelect(q)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors text-left ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold shadow-xs"
                        : "text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground/60"}`} />
                      <span className="truncate">{q}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            )}

            {/* "Autre quartier" option */}
            <div className="pt-1 mt-1 border-t border-border">
              <button
                type="button"
                onClick={() => handleSelect("__other")}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors text-left ${
                  value === "__other"
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-muted text-foreground">Autre</span>
                  <span>Autre quartier non répertorié (saisie libre)</span>
                </div>
                {value === "__other" && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
