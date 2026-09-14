import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import PhotoGallery from "@/components/PhotoGallery";
import {
  Clock,
  HardHat,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  MapPin,
  ExternalLink,
  Loader2,
  ShieldCheck,
  XCircle,
  Wrench,
} from "lucide-react";
import type { FieldIntervention, WorkOrderActionPayload } from "./types";

interface ResolutionTimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intervention: FieldIntervention | null;
  availableTeams?: string[];
  isSubmitting?: boolean;
  onConfirmAction?: (payload: WorkOrderActionPayload) => void;
}

export const ResolutionTimelineModal = ({
  open,
  onOpenChange,
  intervention,
  availableTeams = [
    "Brigade Voirie & Enrobé (Nids-de-poule)",
    "Liaison CIE Éclairage (Lampadaires)",
    "Équipe Curage & Caniveaux (Hydraulique)",
    "Régie Salubrité & Déchets Urbains",
    "Service Urbanisme & Sécurité Publique",
    "Intervention Moyenne/Basse Tension (CIE)",
    "Brigade Réparation Fuites Réseau (SODECI)",
  ],
  isSubmitting = false,
  onConfirmAction,
}: ResolutionTimelineModalProps) => {
  if (!intervention) return null;

  const isResolved = intervention.status === "resolved";
  const isPendingReview = intervention.repairStatus === "pending_review";
  const isRejectedProof = intervention.repairStatus === "rejected";

  const initialPhotos = (intervention.photoUrls && intervention.photoUrls.length > 0)
    ? intervention.photoUrls
    : intervention.photoUrl ? [intervention.photoUrl] : [];

  const repairPhotos = intervention.repairPhotos || [];

  // Formulaire d'action intégré
  const [team, setTeam] = useState(intervention.interventionTeam || availableTeams[0]);
  const [workOrder, setWorkOrder] = useState(
    intervention.interventionWorkOrder ||
    intervention.operatorReference ||
    `OT-${intervention.commune.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [note, setNote] = useState(intervention.operatorLastNote || "");
  const [resolvedWithTransfer, setResolvedWithTransfer] = useState(
    intervention.resolvedWithTransfer ?? true
  );

  const handleApproveProof = () => {
    if (!onConfirmAction) return;
    onConfirmAction({
      reportId: intervention.reportId,
      status: "resolved",
      interventionTeam: team,
      interventionWorkOrder: workOrder,
      interventionStatus: "completed",
      note: note.trim() || "Réparation validée avec succès sur photo de preuve.",
      resolvedWithTransfer,
      decision: "approve",
    });
  };

  const handleRejectProof = () => {
    if (!onConfirmAction) return;
    onConfirmAction({
      reportId: intervention.reportId,
      status: intervention.status, // Conserver le statut actuel
      interventionTeam: team,
      interventionWorkOrder: workOrder,
      note: note.trim() || "Preuve après travaux insuffisante ou anomalie persistante.",
      decision: "reject",
    });
  };

  const handleUpdateIntervention = (newStatus: string) => {
    if (!onConfirmAction) return;
    onConfirmAction({
      reportId: intervention.reportId,
      status: newStatus,
      interventionTeam: team,
      interventionWorkOrder: workOrder,
      interventionStatus: newStatus === "resolved" ? "completed" : "in_progress",
      note: note.trim(),
      resolvedWithTransfer,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-5">
        <DialogHeader className="space-y-2 border-b border-border/70 pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                #{intervention.ticketCode || intervention.reportId.slice(0, 8)}
              </span>
              <Badge variant="outline" className="text-xs font-semibold capitalize">
                {intervention.serviceType} · {intervention.reportCategory}
              </Badge>
              {intervention.childReportsCount && intervention.childReportsCount > 0 ? (
                <Badge className="text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                  <Layers className="h-3 w-3 mr-1" />
                  {intervention.childReportsCount} signalements regroupés
                </Badge>
              ) : null}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>{intervention.commune}{intervention.quartier ? ` · ${intervention.quartier}` : ""}</span>
            </div>
          </div>

          <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
            {intervention.description}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Suivi opérationnel des travaux municipaux & timeline de résolution avec preuve photo certifiée.
          </DialogDescription>
        </DialogHeader>

        {/* ── TIMELINE CHRONOLOGIQUE DES INTERVENTIONS ── */}
        <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/80">
          
          {/* Étape 1 : Constat Initial */}
          <div className="relative pl-9 space-y-2">
            <div className="absolute left-1.5 top-0.5 h-6 w-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center text-primary text-xs font-bold">
              1
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                1. Signalement & Constat Initial
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(intervention.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40">
              « {intervention.description} »
            </p>
            {initialPhotos.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">Photos constat avant travaux :</p>
                <PhotoGallery photos={initialPhotos} thumbHeight="h-24" className="grid-cols-2 sm:grid-cols-3 max-w-md" />
              </div>
            )}
          </div>

          {/* Étape 2 : Prise en charge & Ordre de Travail (OT) */}
          <div className="relative pl-9 space-y-2">
            <div className={`absolute left-1.5 top-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              intervention.interventionWorkOrder || intervention.operatorReference
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                : "bg-muted border-border text-muted-foreground"
            }`}>
              2
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                2. Prise en charge technique & Ordre de Travail
              </span>
              {(intervention.interventionWorkOrder || intervention.operatorReference) && (
                <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary">
                  {intervention.interventionWorkOrder || intervention.operatorReference}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/40">
              <div>
                <span className="text-muted-foreground block text-[11px]">Brigade / Équipe :</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <HardHat className="h-3.5 w-3.5 text-primary" />
                  {intervention.interventionTeam || "En attente d'affectation"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Délai estimé (ETA) :</span>
                <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {intervention.estimatedResolutionTime
                    ? new Date(intervention.estimatedResolutionTime).toLocaleDateString("fr-FR")
                    : "Non précisé"}
                </span>
              </div>
            </div>
          </div>

          {/* Étape 3 : Intervention terrain en cours */}
          <div className="relative pl-9 space-y-2">
            <div className={`absolute left-1.5 top-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              intervention.status === "processing" || intervention.interventionStatus === "in_progress" || isResolved
                ? "bg-amber-500/10 border-amber-500 text-amber-600"
                : "bg-muted border-border text-muted-foreground"
            }`}>
              3
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                3. Déploiement Terrain & Chantier
              </span>
              <Badge className={`text-[10px] font-bold ${
                isResolved
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : intervention.status === "processing"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}>
                {isResolved
                  ? "Chantier achevé"
                  : intervention.status === "processing"
                  ? "Travaux en cours"
                  : "Planifié"}
              </Badge>
            </div>
            {intervention.interventionStartedAt && (
              <p className="text-xs text-muted-foreground">
                Débuté le {new Date(intervention.interventionStartedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
              </p>
            )}
            {intervention.operatorLastNote && (
              <p className="text-xs italic bg-muted/30 p-2 rounded border border-border/40 text-foreground">
                Note de terrain : « {intervention.operatorLastNote} »
              </p>
            )}
          </div>

          {/* Étape 4 : Preuve de Réparation (Avant / Après) */}
          <div className="relative pl-9 space-y-2">
            <div className={`absolute left-1.5 top-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              repairPhotos.length > 0 || isResolved
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                : isPendingReview
                ? "bg-amber-500/10 border-amber-500 text-amber-600 animate-pulse"
                : "bg-muted border-border text-muted-foreground"
            }`}>
              4
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                4. Preuve de Réparation (Avant / Après)
              </span>
              {isPendingReview && (
                <Badge variant="outline" className="text-[10px] font-bold text-amber-600 border-amber-500/40 bg-amber-500/10">
                  Preuve à modérer ⚠️
                </Badge>
              )}
              {isRejectedProof && (
                <Badge variant="outline" className="text-[10px] font-bold text-destructive border-destructive/40 bg-destructive/10">
                  Preuve refusée
                </Badge>
              )}
            </div>

            {/* Comparatif visuel Avant / Après si photos après travaux disponibles */}
            {repairPhotos.length > 0 ? (
              <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Photo Avant */}
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="bg-destructive/10 px-2.5 py-1 border-b border-destructive/20 text-[10px] font-bold text-destructive flex items-center justify-between">
                      <span>1. Avant travaux</span>
                      <span>{new Date(intervention.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <div className="p-1.5">
                      <PhotoGallery photos={initialPhotos} thumbHeight="h-28" />
                    </div>
                  </div>

                  {/* Photo Après */}
                  <div className="rounded-lg border border-border bg-card overflow-hidden">
                    <div className="bg-emerald-500/10 px-2.5 py-1 border-b border-emerald-500/20 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                      <span>2. Après réparation</span>
                      {intervention.repairDeclaredAt && (
                        <span>{new Date(intervention.repairDeclaredAt).toLocaleDateString("fr-FR")}</span>
                      )}
                    </div>
                    <div className="p-1.5">
                      <PhotoGallery photos={repairPhotos} thumbHeight="h-28" />
                    </div>
                  </div>
                </div>

                {intervention.repairNote && (
                  <p className="text-xs italic text-muted-foreground bg-background/80 p-2 rounded-lg border border-border/50">
                    Preuve déclarée : « {intervention.repairNote} »
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Aucune photo de fin de travaux transmise pour l'instant.
              </div>
            )}
          </div>

          {/* Étape 5 : Clôture & Certification */}
          <div className="relative pl-9 space-y-2">
            <div className={`absolute left-1.5 top-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              isResolved
                ? "bg-emerald-500 border-emerald-600 text-white"
                : "bg-muted border-border text-muted-foreground"
            }`}>
              5
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                5. Clôture & Certification
              </span>
              {isResolved && (
                <Badge className="text-[10px] font-bold bg-emerald-600 text-white">
                  Clôturé ✓
                </Badge>
              )}
            </div>

            {isResolved ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1.5 text-xs text-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>
                    {intervention.resolvedWithTransfer
                      ? "Résolution certifiée suite au transfert SIGNA.ci aux services techniques"
                      : "Résolution spontanée constatée sur le terrain"}
                  </span>
                </div>
                {intervention.resolvedAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Résolu le {new Date(intervention.resolvedAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                En attente d'intervention ou de validation de la preuve par les services compétents.
              </p>
            )}
          </div>
        </div>

        {/* ── FORMULAIRE D'ACTION MUNICIPAL & VALIDATION ── */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-primary" />
            Actions Opérateur / Services Techniques
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px]">Brigade / Équipe assignée :</Label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full text-xs rounded-lg border border-input bg-background p-2 text-foreground"
              >
                {availableTeams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px]">N° Ordre de Travail (OT) :</Label>
              <Input
                value={workOrder}
                onChange={(e) => setWorkOrder(e.target.value)}
                className="text-xs font-mono"
                placeholder="OT-COC-2026-..."
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Note technique ou rapport d'étape :</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Équipe déployée sur site. Réfection du regard en cours..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          {/* Si preuve citoyenne soumise : options de modération */}
          {isPendingReview && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Valider suite au transfert SIGNA.ci ?
                </span>
                <Switch
                  checked={resolvedWithTransfer}
                  onCheckedChange={setResolvedWithTransfer}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {resolvedWithTransfer
                  ? "Attribuera la résolution aux services techniques municipaux / partenaires (impact traçable)."
                  : "Résolution externe ou spontanée."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 border-t border-border/70 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Fermer
          </Button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isPendingReview ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRejectProof}
                  disabled={isSubmitting}
                  className="text-xs font-semibold gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rejeter la preuve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApproveProof}
                  disabled={isSubmitting}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Approuver & Clôturer
                </Button>
              </>
            ) : !isResolved ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleUpdateIntervention("processing")}
                  disabled={isSubmitting}
                  className="text-xs font-semibold gap-1"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Déployer l'équipe (En cours)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleUpdateIntervention("resolved")}
                  disabled={isSubmitting}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Clôturer le chantier (Résolu)
                </Button>
              </>
            ) : (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                Incident certifié et clos
              </Badge>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResolutionTimelineModal;
