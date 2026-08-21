import React, { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Check, Info, AlertCircle, X, ShieldCheck } from "lucide-react";
import { getPadaCode } from "@/lib/pada-codes";
import { searchPadaWays, searchPadaWaysScored, PadaWay, ScoredPadaWay, PADA_BOULEVARDS } from "@/lib/pada-database";
import { Input } from "@/components/ui/input";

export interface PadaAddressData {
  padaWayId?: string;
  wayType?: string;
  officialName?: string;
  formerName?: string;
  doorNumber?: string;
  landmark?: string;
  isCustomWay?: boolean;
  formattedAddress: string;
  padaDoorId?: string;
  isExactDoor?: boolean;
  nearestDoorReference?: string;
}

interface PadaAddressInputProps {
  commune: string;
  quartier?: string;
  value?: PadaAddressData;
  onChange: (data: PadaAddressData) => void;
  accentColor?: string;
}

export function PadaAddressInput({
  commune,
  quartier,
  value,
  onChange,
  accentColor = "#0284C7",
}: PadaAddressInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWay, setSelectedWay] = useState<PadaWay | null>(null);
  const [doorNumber, setDoorNumber] = useState(value?.doorNumber || "");
  const [landmark, setLandmark] = useState(value?.landmark || "");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customWayName, setCustomWayName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedDoorId, setSelectedDoorId] = useState<string | undefined>(value?.padaDoorId);
  const [isExactDoorSelected, setIsExactDoorSelected] = useState<boolean>(value?.isExactDoor || false);

  const padaCode = useMemo(() => getPadaCode(commune), [commune]);

  // Suggestions probabilistes filtrées et triées par score
  const suggestionsScored = useMemo(() => {
    return searchPadaWaysScored(searchTerm, commune, quartier).slice(0, 10);
  }, [searchTerm, commune, quartier]);
  const suggestions = useMemo(() => suggestionsScored.map((s) => s.way), [suggestionsScored]);

  // Met à jour l'adresse formatée parente
  const updateFormattedAddress = (
    way: PadaWay | null,
    door: string,
    mark: string,
    isCustom: boolean,
    customName: string,
    doorId?: string,
    isExact?: boolean
  ) => {
    const wayName = isCustom ? customName.trim() : way?.nom || "";
    let formatted = "";

    if (door.trim()) {
      formatted += `${door.trim()}, `;
    }
    if (wayName) {
      formatted += `${wayName} `;
    }
    formatted += `${padaCode}, Abidjan - ${commune}`;
    if (quartier) {
      formatted += ` (${quartier})`;
    }
    if (mark.trim()) {
      formatted += ` [Repère : ${mark.trim()}]`;
    }

    onChange({
      padaWayId: way?.id,
      wayType: way?.type,
      officialName: isCustom ? customName : way?.nom,
      formerName: way?.ancienNom,
      doorNumber: door.trim() || undefined,
      landmark: mark.trim() || undefined,
      isCustomWay: isCustom,
      formattedAddress: formatted.trim(),
      padaDoorId: doorId,
      isExactDoor: isExact,
    });
  };

  const handleSelectWay = (way: PadaWay, item?: ScoredPadaWay) => {
    let effectiveDoor = doorNumber;
    // Si l'utilisateur avait tapé un numéro (ex: "123" ou "82"), on l'affecte au numéro de porte/bâtiment
    if (/^\d+$/.test(searchTerm.trim()) && !doorNumber) {
      effectiveDoor = searchTerm.trim();
      setDoorNumber(effectiveDoor);
    }

    const exactId = item?.exactDoorId;
    const isExact = item?.isExactDoor || false;
    setSelectedDoorId(exactId);
    setIsExactDoorSelected(isExact);

    setSelectedWay(way);
    setSearchTerm(way.nom);
    setIsDropdownOpen(false);
    setIsCustomMode(false);
    updateFormattedAddress(way, effectiveDoor, landmark, false, "", exactId, isExact);
  };

  const handleDoorChange = (num: string) => {
    setDoorNumber(num);
    updateFormattedAddress(selectedWay, num, landmark, isCustomMode, customWayName, selectedDoorId, isExactDoorSelected);
  };

  const handleLandmarkChange = (mark: string) => {
    setLandmark(mark);
    updateFormattedAddress(selectedWay, doorNumber, mark, isCustomMode, customWayName, selectedDoorId, isExactDoorSelected);
  };

  const handleCustomWayChange = (name: string) => {
    setCustomWayName(name);
    updateFormattedAddress(null, doorNumber, landmark, true, name);
  };

  const handleResetSelection = () => {
    setSelectedWay(null);
    setSelectedDoorId(undefined);
    setIsExactDoorSelected(false);
    setSearchTerm("");
    setIsCustomMode(false);
    setCustomWayName("");
    updateFormattedAddress(null, doorNumber, landmark, false, "");
  };

  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Fermeture au clic à l'extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/20 bg-card p-4 transition-all shadow-xs">
      {/* En-tête PADA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white shadow-xs">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Adressage Officiel PADA
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Code {padaCode}
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Saisissez votre numéro de porte ou le nom de votre voie
            </p>
          </div>
        </div>
      </div>

      {/* Saisie ou Recherche avec dropdown ancré et non intrusif */}
      {!selectedWay && !isCustomMode && (
        <div className="space-y-2">
          <div className="relative" ref={searchContainerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Tapez un N° de porte (ex: 246, 62) ou une voie (ex: Aboudramane, Mitterrand...)"
              className="pl-9 pr-8 text-xs font-medium h-11 bg-background rounded-xl border-border/80 focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Menu déroulant de suggestions ancré et compact */}
            {isDropdownOpen && searchTerm.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-56 overflow-y-auto overscroll-contain rounded-2xl border-2 border-border bg-popover p-1.5 shadow-2xl text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
                {suggestionsScored.length > 0 ? (
                  <div className="space-y-0.5">
                    {suggestionsScored.map((item) => {
                      const way = item.way;
                      const isBoulevard = way.type === "BOULEVARD";
                      const isNumericSearch = /^\d+$/.test(searchTerm.trim());
                      const doorPrefix = isNumericSearch ? `${searchTerm.trim()}, ` : "";

                      return (
                        <button
                          key={way.id}
                          type="button"
                          onClick={() => handleSelectWay(way, item)}
                          className="w-full text-left flex items-start justify-between gap-2 p-2.5 rounded-xl hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white ${
                                  isBoulevard ? "bg-amber-600" : "bg-emerald-600"
                                }`}
                              >
                                {way.type}
                              </span>
                              <span className="font-bold text-foreground truncate group-hover:text-primary">
                                {doorPrefix}{way.nom}
                              </span>

                              {/* Badge Cadastral & Probabilité */}
                              {item.isExactDoor && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                                  <ShieldCheck className="h-3 w-3" /> Plaque PADA Certifiée
                                </span>
                              )}
                              {!item.isExactDoor && item.probabilityLabel === "Haute" && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  🟢 Très probable
                                </span>
                              )}
                              {item.probabilityLabel === "Incompatible" && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                                  ⚠️ N° trop élevé ({way.longueurM}m max)
                                </span>
                              )}
                            </div>

                            {item.matchReason && (
                              <p className="text-[10px] text-primary font-semibold mt-0.5">
                                💡 {item.matchReason}
                              </p>
                            )}

                            {way.ancienNom && !item.matchReason?.includes("Alias") && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                                📍 Ancien nom : <span className="font-semibold">{way.ancienNom}</span>
                              </p>
                            )}
                            {way.quartier && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Quartier : <span className="font-medium text-foreground">{way.quartier}</span>
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5 bg-muted px-2 py-0.5 rounded">
                            {way.commune}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center text-muted-foreground text-xs space-y-1">
                    <p className="font-semibold text-foreground">Aucune voie officielle PADA ne correspond à "{searchTerm}"</p>
                    <p className="text-[11px] text-muted-foreground">Vous pouvez utiliser cette saisie comme nom de voie personnalisé ci-dessous.</p>
                  </div>
                )}

                {/* Option saisie libre / Utiliser comme nom de voie */}
                <div className="border-t border-border mt-1 pt-1 space-y-0.5">
                  {searchTerm.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomWayName(searchTerm.trim());
                        setIsCustomMode(true);
                        setIsDropdownOpen(false);
                        updateFormattedAddress(null, doorNumber, landmark, true, searchTerm.trim());
                      }}
                      className="w-full text-left p-2 rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      Utiliser « {searchTerm.trim()} » comme nom de voie
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl text-primary hover:bg-primary/5 font-semibold text-xs flex items-center gap-1.5"
                  >
                    <span>Autre nom de voie (Saisie manuelle libre)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Puces de suggestion rapide (si quartier sélectionné et champ vide) */}
          {!searchTerm && suggestionsScored.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-semibold text-muted-foreground">
                <span>📍 Voies principales suggérées {quartier ? `(${quartier})` : `(${commune})`} :</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {suggestionsScored.slice(0, 4).map((item) => (
                  <button
                    key={item.way.id}
                    type="button"
                    onClick={() => handleSelectWay(item.way, item)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-muted/60 hover:bg-primary/10 hover:text-primary border border-border/60 hover:border-primary/30 transition-all text-left"
                  >
                    <span className="font-bold">{item.way.nom}</span>
                    {item.way.ancienNom && (
                      <span className="text-[10px] text-muted-foreground font-normal">({item.way.ancienNom})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── APERÇU DE LA PLAQUE OFFICIELLE PADA (Si voie sélectionnée) ── */}
      {selectedWay && (
        <div className="relative overflow-hidden rounded-xl border-2 border-emerald-600/40 bg-gradient-to-br from-emerald-500/10 via-background to-emerald-500/5 p-4 text-foreground shadow-sm animate-in fade-in zoom-in-95 duration-200">
          {/* Header Plaque */}
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase bg-emerald-700 text-white shadow-2xs">
                RÉPUBLIQUE DE CÔTE D'IVOIRE
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 tracking-wide">
                PADA · MINISTÈRE DE LA CONSTRUCTION
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetSelection}
              className="text-xs font-bold text-muted-foreground hover:text-destructive flex items-center gap-1 bg-background/80 px-2 py-0.5 rounded-md border border-border/60 transition-colors"
              title="Changer de voie"
            >
              <X className="h-3.5 w-3.5" />
              Modifier
            </button>
          </div>

          {/* Corps de la plaque */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-2xs ${
                  selectedWay.type === "BOULEVARD" ? "bg-amber-600" : "bg-emerald-600"
                }`}
              >
                {selectedWay.type}
              </span>
              <span className="text-base font-black text-foreground tracking-tight">{selectedWay.nom}</span>
              
              {isExactDoorSelected && (
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="h-3.5 w-3.5" /> Plaque N°{doorNumber} Certifiée
                </span>
              )}
            </div>

            {selectedWay.ancienNom && (
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                🏛️ Ancienne dénomination : <span className="font-bold">{selectedWay.ancienNom}</span>
              </p>
            )}

            {selectedDoorId && (
              <p className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                🎫 Réf. Cadastre PADA : <code>{selectedDoorId}</code>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-xs text-muted-foreground font-semibold border-t border-emerald-500/10">
              <span>📍 Code Postal : <strong className="text-foreground">{padaCode}</strong></span>
              <span>•</span>
              <span>Commune : <strong className="text-foreground">{commune}</strong></span>
              {selectedWay.quartier && (
                <>
                  <span>•</span>
                  <span>Quartier : <strong className="text-foreground">{selectedWay.quartier}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODE SAISIE LIBRE DE SECOURS ── */}
      {isCustomMode && (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              Nom de votre voie ou rue
            </label>
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="text-xs font-semibold text-primary underline"
            >
              Retour au référentiel officiel PADA
            </button>
          </div>
          <Input
            value={customWayName}
            onChange={(e) => handleCustomWayChange(e.target.value)}
            placeholder="Ex: Rue des Jardins, Rue Principale..."
            className="text-xs h-10 bg-background"
            autoFocus
          />
        </div>
      )}

      {/* Champs complémentaires : N° métrique / Porte & Repère visuel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        <div>
          <label className="text-[11px] font-bold text-foreground block mb-1">
            N° de porte / Plaque métrique <span className="font-normal text-muted-foreground">(ex: 246, 62)</span>
          </label>
          <Input
            value={doorNumber}
            onChange={(e) => handleDoorChange(e.target.value)}
            placeholder="Ex: 246, 62, Porte 4..."
            className="text-xs h-10 bg-background rounded-lg"
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-foreground block mb-1">
            Point de repère visible <span className="font-normal text-muted-foreground">(facilite l'arrivée)</span>
          </label>
          <Input
            value={landmark}
            onChange={(e) => handleLandmarkChange(e.target.value)}
            placeholder="Ex: Face Pharmacie Saint-Jean"
            className="text-xs h-10 bg-background rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
