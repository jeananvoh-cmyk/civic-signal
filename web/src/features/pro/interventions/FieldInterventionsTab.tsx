import { useState, useMemo } from "react";
import {
  HardHat,
  Search,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Calendar,
  Filter,
  Wrench,
  ChevronRight,
  Eye,
  Camera,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FieldIntervention } from "./types";

interface FieldInterventionsTabProps {
  interventions: FieldIntervention[];
  onSelectIntervention: (intervention: FieldIntervention) => void;
  availableTeams?: string[];
  className?: string;
}

export const FieldInterventionsTab = ({
  interventions,
  onSelectIntervention,
  availableTeams = [],
  className = "",
}: FieldInterventionsTabProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = interventions.length;
    const inProgress = interventions.filter(
      (i) => i.status === "processing" || i.interventionStatus === "in_progress"
    ).length;
    const unassigned = interventions.filter(
      (i) => !i.interventionTeam && i.status !== "resolved"
    ).length;
    const pendingReview = interventions.filter(
      (i) => i.repairStatus === "pending_review"
    ).length;
    const resolved = interventions.filter((i) => i.status === "resolved").length;

    return { total, inProgress, unassigned, pendingReview, resolved };
  }, [interventions]);

  // Filtrage combiné
  const filteredInterventions = useMemo(() => {
    return interventions.filter((item) => {
      if (selectedTeamFilter !== "all" && item.interventionTeam !== selectedTeamFilter) {
        return false;
      }
      if (selectedStatusFilter === "in_progress" && item.status !== "processing" && item.interventionStatus !== "in_progress") {
        return false;
      }
      if (selectedStatusFilter === "unassigned" && (item.interventionTeam || item.status === "resolved")) {
        return false;
      }
      if (selectedStatusFilter === "pending_proof" && item.repairStatus !== "pending_review") {
        return false;
      }
      if (selectedStatusFilter === "resolved" && item.status !== "resolved") {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = item.description?.toLowerCase().includes(q);
        const matchQuartier = item.quartier?.toLowerCase().includes(q);
        const matchOT = (item.interventionWorkOrder || item.operatorReference)?.toLowerCase().includes(q);
        const matchTeam = item.interventionTeam?.toLowerCase().includes(q);
        if (!matchDesc && !matchQuartier && !matchOT && !matchTeam) return false;
      }

      return true;
    });
  }, [interventions, selectedTeamFilter, selectedStatusFilter, searchQuery]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── KPI BANNER ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Chantiers en cours</span>
            <HardHat className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-extrabold text-foreground">{metrics.inProgress}</p>
          <p className="text-[10px] text-muted-foreground">Brigades actives sur site</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>À affecter</span>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-extrabold text-foreground">{metrics.unassigned}</p>
          <p className="text-[10px] text-muted-foreground">En attente d'Ordre de Travail</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Preuves à valider</span>
            <FileCheck2 className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xl font-extrabold text-foreground">{metrics.pendingReview}</p>
          <p className="text-[10px] text-muted-foreground">Photos après travaux</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold">
            <span>Clôturés certifiés</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-foreground">{metrics.resolved}</p>
          <p className="text-[10px] text-muted-foreground">Réparations confirmées</p>
        </div>
      </div>

      {/* ── BARRE DE FILTRES ET RECHERCHE ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-card/80 p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par N° OT, brigade, quartier ou mot-clé..."
            className="pl-8 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtre par Brigade */}
          {availableTeams.length > 0 && (
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="text-xs h-9 rounded-lg border border-input bg-background px-2.5 text-foreground"
            >
              <option value="all">Toutes les brigades</option>
              {availableTeams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          )}

          {/* Filtre par Statut */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs h-9 rounded-lg border border-input bg-background px-2.5 text-foreground"
          >
            <option value="all">Tous les états</option>
            <option value="in_progress">Chantiers en cours</option>
            <option value="unassigned">Sans équipe assignée</option>
            <option value="pending_proof">Preuves en revue</option>
            <option value="resolved">Clôturés</option>
          </select>
        </div>
      </div>

      {/* ── LISTE DES INTERVENTIONS ── */}
      {filteredInterventions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <HardHat className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-semibold text-foreground">Aucune intervention correspondante</p>
          <p className="text-xs text-muted-foreground">
            Modifiez vos filtres ou effectuez une nouvelle recherche.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredInterventions.map((item) => {
            const otNumber = item.interventionWorkOrder || item.operatorReference;
            const hasProofPhotos = item.repairPhotos && item.repairPhotos.length > 0;
            const isResolved = item.status === "resolved";

            return (
              <div
                key={item.reportId}
                className="rounded-xl border border-border bg-card p-4 space-y-3 transition-colors hover:border-primary/40 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {otNumber ? (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {otNumber}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        Sans OT
                      </span>
                    )}

                    <Badge variant="outline" className="text-xs capitalize font-medium">
                      {item.serviceType}
                    </Badge>

                    {item.childReportsCount && item.childReportsCount > 0 ? (
                      <Badge className="text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                        <Layers className="h-3 w-3 mr-1" />
                        {item.childReportsCount} signalements regroupés
                      </Badge>
                    ) : null}

                    {item.repairStatus === "pending_review" && (
                      <Badge className="text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 flex items-center gap-1">
                        <Camera className="h-3 w-3" />
                        <span>Preuve en attente de validation</span>
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isResolved
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                        : item.status === "processing"
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                        : "bg-blue-500/10 text-blue-600 border border-blue-500/30"
                    }`}>
                      {isResolved
                        ? "Clôturé ✓"
                        : item.status === "processing"
                        ? "Chantier en cours"
                        : "Signalé"}
                    </span>
                  </div>
                </div>

                {/* Description & Localisation */}
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    {item.description}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="font-medium text-foreground">{item.commune}</span>
                    {item.quartier ? <span>· {item.quartier}</span> : null}
                    <span>· Signalé le {new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                  </p>
                </div>

                {/* Brigade assignée et métadonnées terrain */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <HardHat className="h-3.5 w-3.5 text-primary" />
                      {item.interventionTeam || "Équipe non assignée"}
                    </span>
                    {item.interventionStartedAt && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        Débuté le {new Date(item.interventionStartedAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectIntervention(item)}
                      className="text-xs gap-1.5 h-8 font-semibold text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Timeline & Preuves</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FieldInterventionsTab;
