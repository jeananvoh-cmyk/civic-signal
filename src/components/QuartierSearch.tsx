import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, MapPin } from "lucide-react";

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
    ? quartiers.filter((q) => q.toLowerCase().includes(search.toLowerCase()))
    : quartiers;

  const displayValue = value === "__other" ? "Autre quartier..." : value;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
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
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value ? displayValue : "Tapez ou sélectionnez le quartier"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg animate-fade-in">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Chercher un quartier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto overscroll-contain p-1">
            {filtered.length === 0 && search ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                <MapPin className="h-5 w-5 mx-auto mb-1 opacity-40" />
                Aucun quartier trouvé
              </div>
            ) : (
              filtered.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSelect(q)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
                    value === q
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  {value === q && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  <span className={value === q ? "" : "pl-5"}>{q}</span>
                </button>
              ))
            )}

            {/* "Autre quartier" option */}
            <button
              type="button"
              onClick={() => handleSelect("__other")}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm border-t border-border mt-1 pt-2 transition-colors ${
                value === "__other"
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {value === "__other" && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
              <span className={value === "__other" ? "" : "pl-5"}>Autre quartier…</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
