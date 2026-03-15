import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Simple trigram-based similarity score [0..1] */
function trigramSimilarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const na = normalize(a), nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const trigrams = (s: string) => {
    const t = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) t.add(s.slice(i, i + 2));
    return t;
  };
  const ta = trigrams(na), tb = trigrams(nb);
  let common = 0;
  ta.forEach((g) => { if (tb.has(g)) common++; });
  return (2 * common) / (ta.size + tb.size);
}

interface QuartierComboboxProps {
  quartiers: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Allow user to type a custom quartier not in the list */
  allowCustom?: boolean;
  /** If provided, shows a "select all" first option that sets value to "" */
  allOptionLabel?: string;
}

/**
 * Combobox with search for selecting a quartier.
 * On mobile, typing filters the list instantly instead of scrolling through 80+ items.
 * When allowCustom=true, if no match is found the user can add it directly.
 */
export const QuartierCombobox = ({
  quartiers,
  value,
  onChange,
  placeholder = "Sélectionner le quartier",
  disabled = false,
  allowCustom = true,
  allOptionLabel,
}: QuartierComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");

  // The displayed label
  const isCustom = value && !quartiers.includes(value);
  const displayValue = value
    ? isCustom
      ? value
      : quartiers.find((q) => q === value) ?? value
    : "";

  const handleSelect = (q: string) => {
    onChange(q);
    setOpen(false);
    setSearch("");
    setCustomMode(false);
  };

  const handleCustomConfirm = () => {
    const trimmed = customInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setOpen(false);
      setSearch("");
      setCustomMode(false);
      setCustomInput("");
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSearch(""); setCustomMode(false); } }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !displayValue && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width]"
        align="start"
        side="bottom"
        avoidCollisions={false}
      >
        {customMode ? (
          <div className="p-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Saisissez le nom exact de votre quartier
            </p>
            <Input
              autoFocus
              placeholder="Ex: Soweto, Cité Verte..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomConfirm(); if (e.key === "Escape") setCustomMode(false); }}
              maxLength={100}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setCustomMode(false)}>
                Retour
              </Button>
              <Button size="sm" className="flex-1" onClick={handleCustomConfirm} disabled={!customInput.trim()}>
                Confirmer
              </Button>
            </div>
          </div>
        ) : (
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Rechercher un quartier..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-56">
              {(() => {
                const lowerSearch = search.toLowerCase();
                const exact = quartiers.filter((q) => q.toLowerCase().includes(lowerSearch));
                const fuzzy = search.length >= 3 && exact.length === 0
                  ? quartiers
                      .map((q) => ({ q, score: trigramSimilarity(search, q) }))
                      .filter(({ score }) => score >= 0.3)
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 6)
                      .map(({ q }) => q)
                  : [];
                const results = exact.length > 0 ? exact : fuzzy;
                const isFuzzy = exact.length === 0 && fuzzy.length > 0;

                return results.length === 0 ? (
                  <CommandEmpty>
                    {allowCustom ? (
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent rounded"
                        onClick={() => { setCustomMode(true); setCustomInput(search); }}
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter « {search || "autre quartier"} »
                      </button>
                    ) : (
                      <span className="text-muted-foreground">Aucun résultat</span>
                    )}
                  </CommandEmpty>
                ) : (
                  <CommandGroup heading={isFuzzy ? "Suggestions proches" : undefined}>
                    {allOptionLabel && !search && (
                      <CommandItem
                        value="__all__"
                        onSelect={() => handleSelect("")}
                        className="py-2.5 text-muted-foreground"
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === "" ? "opacity-100" : "opacity-0")} />
                        {allOptionLabel}
                      </CommandItem>
                    )}
                    {results.map((q) => (
                      <CommandItem
                        key={q}
                        value={q}
                        onSelect={() => handleSelect(q)}
                        className="py-2.5"
                      >
                        <Check className={cn("mr-2 h-4 w-4", value === q ? "opacity-100" : "opacity-0")} />
                        {q}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })()}
              {allowCustom && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => { setCustomMode(true); setCustomInput(search); }}
                      className="py-2.5 text-muted-foreground"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Autre quartier...
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
};
