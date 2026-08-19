import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

interface ProfileDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (reason: string, feedback: string) => Promise<void>;
  isDeleting: boolean;
}

const DELETE_REASONS = [
  "Je n'utilise plus l'application",
  "Problème de confidentialité ou de données",
  "Trop de notifications",
  "Difficultés d'utilisation",
  "Autre raison",
];

export const ProfileDeleteDialog: React.FC<ProfileDeleteDialogProps> = ({
  open,
  onOpenChange,
  onConfirmDelete,
  isDeleting,
}) => {
  const [deleteReason, setDeleteReason] = useState(DELETE_REASONS[0]);
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);

  const handleSubmit = async () => {
    await onConfirmDelete(deleteReason, deleteFeedback);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setConfirmStep(false); }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Supprimer mon compte et mes données
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cette action est définitive. Toutes vos données (signalements, corroborations, photos et compte) seront définitivement effacées conformément au RGPD.
          </DialogDescription>
        </DialogHeader>

        {!confirmStep ? (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold mb-2 block">
                Pour quelle raison souhaitez-vous nous quitter ?
              </Label>
              <RadioGroup value={deleteReason} onValueChange={setDeleteReason} className="space-y-2">
                {DELETE_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <RadioGroupItem value={reason} id={`reason-${reason}`} />
                    <Label htmlFor={`reason-${reason}`} className="text-xs font-normal cursor-pointer">
                      {reason}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Remarques ou suggestions (optionnel)</Label>
              <Textarea
                placeholder="Explication complémentaire..."
                value={deleteFeedback}
                onChange={(e) => setDeleteFeedback(e.target.value)}
                maxLength={500}
                className="text-xs resize-none h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmStep(true)}
                className="gap-1 bg-red-600 hover:bg-red-700 font-bold"
              >
                Continuer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs font-bold text-red-800 dark:text-red-300">
                Êtes-vous absolument sûr ?
              </p>
              <p className="text-[11px] text-red-700 dark:text-red-400 mt-1">
                La suppression supprimera immédiatement votre profil et toutes vos contributions.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmStep(false)} disabled={isDeleting}>
                Retour
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSubmit}
                disabled={isDeleting}
                className="gap-1 bg-red-600 hover:bg-red-700 font-bold"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Confirmer la suppression définitive
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDeleteDialog;
