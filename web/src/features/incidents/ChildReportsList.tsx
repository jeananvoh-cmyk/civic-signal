import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  MapPin, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  CheckCircle2, 
  Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PhotoGallery from "@/components/PhotoGallery";
import type { ChildReportSummary } from "./types";

interface ChildReportsListProps {
  childrenReports: ChildReportSummary[];
  parentTicketCode?: string | null;
  className?: string;
}

export const ChildReportsList = ({
  childrenReports,
  parentTicketCode,
  className = "",
}: ChildReportsListProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalReports = childrenReports.length;

  if (totalReports === 0) return null;

  const totalImpacted = childrenReports.reduce((sum, r) => sum + (r.impacted_people || 1), 0);
  const totalVerifications = childrenReports.reduce((sum, r) => sum + (r.verifications || 0), 0);

  // Afficher les 2 premiers par défaut si replié
  const displayedReports = isExpanded ? childrenReports : childrenReports.slice(0, 2);

  return (
    <div className={`rounded-2xl border border-border bg-card/60 backdrop-blur-xs p-4 sm:p-5 space-y-4 shadow-sm ${className}`}>
      {/* En-tête de fédération */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">
                Signalements Citoyens Fédérés
              </h3>
              <Badge variant="secondary" className="text-[11px] font-bold bg-primary/10 text-primary border-primary/20">
                {totalReports} citoyen{totalReports > 1 ? "s" : ""} regroupé{totalReports > 1 ? "s" : ""}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fédération territoriale évitant les doublons sur un même transformateur ou une même conduite.
            </p>
          </div>
        </div>

        {/* Métriques d'impact cumulé */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
          <span className="flex items-center gap-1 font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            {totalImpacted} impacté{totalImpacted > 1 ? "s" : ""}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 font-medium text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {totalVerifications} soutien{totalVerifications > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Liste des signalements enfants */}
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {displayedReports.map((child, idx) => {
            const photos = (child.photo_urls && child.photo_urls.length > 0)
              ? child.photo_urls
              : child.photo_url ? [child.photo_url] : [];

            const elapsed = (() => {
              const diffMs = Date.now() - new Date(child.created_at).getTime();
              const mins = Math.floor(diffMs / 60000);
              if (mins < 60) return `il y a ${Math.max(1, mins)} min`;
              const h = Math.floor(mins / 60);
              if (h < 24) return `il y a ${h}h`;
              return `il y a ${Math.floor(h / 24)}j`;
            })();

            return (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="rounded-xl border border-border/80 bg-background/80 p-3 sm:p-3.5 space-y-2.5 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {child.ticket_code && (
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
                        #{child.ticket_code}
                      </span>
                    )}
                    {child.quartier && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 text-primary/70" />
                        {child.quartier}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                      <Clock className="h-3 w-3" />
                      {elapsed}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {child.impacted_people > 1 && (
                      <span className="text-[11px] font-semibold text-foreground/80 bg-secondary/80 px-2 py-0.5 rounded-full border border-border/60">
                        {child.impacted_people} pers.
                      </span>
                    )}
                    <Link
                      to={`/signalement/${child.id}`}
                      className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 font-medium ml-1"
                      title="Voir le détail de cette contribution"
                    >
                      <span>Voir</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Description citoyenne */}
                <p className="text-xs text-foreground/90 leading-relaxed italic bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/40">
                  « {child.description} »
                </p>

                {/* Photos soumises par ce citoyen */}
                {photos.length > 0 && (
                  <div className="pt-1">
                    <PhotoGallery
                      photos={photos}
                      thumbHeight="h-24"
                      className="grid-cols-2 sm:grid-cols-3 max-w-sm"
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bouton Voir plus / replier si plus de 2 signalements */}
      {totalReports > 2 && (
        <div className="pt-1 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-primary hover:bg-primary/5 font-semibold gap-1.5"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Masquer la liste ({totalReports - 2} masqués)
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Voir tous les {totalReports} signalements rattachés à cet incident
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChildReportsList;
