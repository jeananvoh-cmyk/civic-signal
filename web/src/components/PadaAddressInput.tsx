import React, { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Check, Info, AlertCircle, X } from "lucide-react";
import { getPadaCode } from "@/lib/pada-codes";
import { searchPadaWays, PadaWay, PADA_BOULEVARDS } from "@/lib/pada-database";
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

  const padaCode = useMemo(() => getPadaCode(commune), [commune]);

  // Suggestions filtrées en direct
  const suggestions = useMemo(() => {
    return searchPadaWays(searchTerm, commune, quartier).slice(0, 10);
  }, [searchTerm, commune, quartier]);

  // Met à jour l'adresse formatée parente
  const updateFormattedAddress = (
    way: PadaWay | null,
    door: string,
    mark: string,
    isCustom: boolean,
    customName: string
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
    });
  };

  const handleSelectWay = (way: PadaWay) => {
    setSelectedWay(way);
    setSearchTerm(way.nom);
    setIsDropdownOpen(false);
    setIsCustomMode(false);
    updateFormattedAddress(way, doorNumber, landmark, false, "");
  };

  const handleDoorChange = (num: string) => {
    setDoorNumber(num);
    updateFormattedAddress(selectedWay, num, landmark, isCustomMode, customWayName);
  };

  const handleLandmarkChange = (mark: string) => {
    setLandmark(mark);
    updateFormattedAddress(selectedWay, doorNumber, mark, isCustomMode, customWayName);
  };

  const handleCustomWayChange = (name: string) => {
    setCustomWayName(name);
    updateFormattedAddress(null, doorNumber, landmark, true, name);
  };

  const handleResetSelection = () => {
    setSelectedWay(null);
    setSearchTerm("");
    setIsCustomMode(false);
    setCustomWayName("");
    updateFormattedAddress(null, doorNumber, landmark, false, "");
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-primary/20 bg-card p-4 transition-all shadow-xs">
      {/* En-tête PADA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white font-black text-[10px] shadow-xs">
            🇨🇮
          </span>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Adressage Officiel PADA
              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                Code {padaCode}
              </span>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Sélectionnez votre voie officielle ou tapez un ancien repère
            </p>
          </div>
        </div>
      </div>

      {/* Saisie ou Recherche */}
      {!selectedWay && !isCustomMode && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Rechercher une Rue, Avenue ou Boulevard (ex: Mitterrand, Arafat, Diby...)"
              className="pl-9 pr-8 text-xs font-medium h-11 bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Menu déroulant de suggestions */}
          {isDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg text-xs">
              {suggestions.length > 0 ? (
                suggestions.map((way) => {
                  const isBoulevard = way.type === "BOULEVARD";
                  return (
                    <button
                      key={way.id}
                      type="button"
                      onClick={() => handleSelectWay(way)}
                      className="w-full text-left flex items-start justify-between gap-2 p-2.5 rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white ${
                              isBoulevard ? "bg-amber-600" : "bg-emerald-600"
                            }`}
                          >
                            {way.type}
                          </span>
                          <span className="font-bold text-foreground truncate">{way.nom}</span>
                        </div>
                        {way.ancienNom && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                            📍 Ex : {way.ancienNom}
                          </p>
                        )}
                        {way.quartier && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Quartier : {way.quartier}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {way.commune}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-muted-foreground text-xs">
                  Aucune voie PADA trouvée pour "{searchTerm}"
                </div>
              )}

              {/* Option saisie libre */}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomMode(true);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg text-primary hover:bg-primary/5 font-semibold text-xs flex items-center gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  Je ne trouve pas ma voie (Saisir librement)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── APERÇU DE LA PLAQUE OFFICIELLE PADA (Si voie sélectionnée) ── */}
      {selectedWay && (
        <div className="relative overflow-hidden rounded-xl border-2 border-emerald-600/40 bg-gradient-to-br from-emerald-500/10 via-background to-emerald-500/5 p-3.5 text-foreground shadow-xs">
          {/* Header Plaque */}
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                RÉPUBLIQUE DE CÔTE D'IVOIRE
              </span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">PADA</span>
            </div>
            <button
              type="button"
              onClick={handleResetSelection}
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              title="Changer de voie"
            >
              <X className="h-3.5 w-3.5" />
              Modifier
            </button>
          </div>

          {/* Corps de la plaque */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white shadow-xs ${
                  selectedWay.type === "BOULEVARD" ? "bg-amber-600" : "bg-emerald-600"
                }`}
              >
                {selectedWay.type}
              </span>
              <span className="text-sm font-black text-foreground">{selectedWay.nom}</span>
            </div>

            {selectedWay.ancienNom && (
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                🏛️ Ancienne dénomination : <span className="font-bold">{selectedWay.ancienNom}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground font-semibold">
              <span>📍 Code : <strong className="text-foreground">{padaCode}</strong></span>
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
              className="text-xs text-primary underline"
            >
              Retour à la liste PADA
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            N° de porte / Plaque métrique <span className="font-normal">(optionnel)</span>
          </label>
          <Input
            value={doorNumber}
            onChange={(e) => handleDoorChange(e.target.value)}
            placeholder="Ex: 495, 12, Lot 8"
            className="text-xs h-9 bg-background"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
            Point de repère visible <span className="font-normal">(ex: Pharmacie, École...)</span>
          </label>
          <Input
            value={landmark}
            onChange={(e) => handleLandmarkChange(e.target.value)}
            placeholder="Ex: Face Pharmacie Saint-Jean"
            className="text-xs h-9 bg-background"
          />
        </div>
      </div>
    </div>
  );
}
