import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, MapPin, Zap, Droplets, Clock, Eye, Construction } from "lucide-react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, MapPin, Zap, Droplets, Clock, Eye, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/error-utils";
import { logAudit } from "@/lib/audit";
import { format } from "date-fns";
import SignedImage from "@/components/SignedImage";
import CorroborationStatus from "@/components/CorroborationStatus";
import { fr } from "date-fns/locale";

const URGENCY_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "🟢 Faible", variant: "secondary" },
  medium: { label: "🟡 Moyen", variant: "outline" },
  high: { label: "🟠 Élevé", variant: "default" },
  critical: { label: "🔴 Critique", variant: "destructive" },
};

const AdminReportsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: pendingReports = [], isLoading: loadingPending } = useQuery({
    queryKey: ["admin-reports-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("validated", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: validatedReports = [], isLoading: loadingValidated } = useQuery({
    queryKey: ["admin-reports-validated"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("validated", true)
        .order("validated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const validateMutation = useMutation({
    mutationFn: async ({ reportId, validated }: { reportId: string; validated: boolean }) => {
      const { error } = await supabase
        .from("reports")
        .update({
          validated,
          validated_by: validated ? user?.id : null,
          validated_at: validated ? new Date().toISOString() : null,
        })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: (_, { reportId, validated }) => {
      logAudit({
        action: validated ? "report_validated" : "report_rejected",
        target_type: "report",
        target_id: reportId,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-pending"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      toast.success(validated ? "Signalement validé et visible sur la carte" : "Signalement rejeté");
      setSelectedReport(null);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  const resolveMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.rpc("admin_resolve_report", { p_report_id: reportId });
      if (error) throw error;
    },
    onSuccess: (_, reportId) => {
      logAudit({
        action: "report_resolved",
        target_type: "report",
        target_id: reportId,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-reports-validated"] });
      toast.success("Signalement marqué comme résolu.");
      setSelectedReport(null);
    },
    onError: (err: any) => toast.error(getUserFriendlyError(err)),
  });

  const ReportRow = ({ report, showActions }: { report: any; showActions: boolean }) => {
    const urgency = URGENCY_LABELS[report.urgency] || URGENCY_LABELS.low;
    return (
      <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedReport(report)}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {report.service_type === "electricity" ? (
              <Zap className="h-5 w-5 text-electricity shrink-0" />
            ) : (
              <Droplets className="h-5 w-5 text-water shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {report.commune}, {report.quartier}
              </p>
              <p className="text-xs text-muted-foreground truncate">{report.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report.report_category === "infrastructure" && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                <Construction className="h-3 w-3" />
                Infra
              </Badge>
            )}
            <Badge variant={urgency.variant}>{urgency.label}</Badge>
            {showActions && (
              <div className="flex gap-1 ml-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:bg-green-50"
                  onClick={(e) => { e.stopPropagation(); validateMutation.mutate({ reportId: report.id, validated: true }); }}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); validateMutation.mutate({ reportId: report.id, validated: false }); }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Validation des signalements</h1>
          <p className="mt-1 text-muted-foreground">
            Vérifiez la cohérence entre commune/quartier et coordonnées GPS avant publication.
          </p>
        </motion.div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              En attente ({pendingReports.length})
            </TabsTrigger>
            <TabsTrigger value="validated">
              Validés ({validatedReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {loadingPending ? (
              <p className="text-muted-foreground text-sm">Chargement...</p>
            ) : pendingReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun signalement en attente.</p>
            ) : (
              pendingReports.map((r: any) => <ReportRow key={r.id} report={r} showActions />)
            )}
          </TabsContent>

          <TabsContent value="validated" className="space-y-3 mt-4">
            {loadingValidated ? (
              <p className="text-muted-foreground text-sm">Chargement...</p>
            ) : validatedReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucun signalement validé.</p>
            ) : (
              validatedReports.map((r: any) => <ReportRow key={r.id} report={r} showActions={false} />)
            )}
          </TabsContent>
        </Tabs>

        {/* Detail dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedReport?.service_type === "electricity" ? (
                  <Zap className="h-5 w-5 text-electricity" />
                ) : (
                  <Droplets className="h-5 w-5 text-water" />
                )}
                Détails du signalement
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Commune</p>
                    <p className="font-medium">{selectedReport.commune || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quartier</p>
                    <p className="font-medium">{selectedReport.quartier || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GPS (privé)</p>
                    <p className="font-medium font-mono text-xs">
                      {selectedReport.latitude && selectedReport.longitude
                        ? `${selectedReport.latitude.toFixed(4)}, ${selectedReport.longitude.toFixed(4)}`
                        : "Non disponible"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Urgence</p>
                    <Badge variant={URGENCY_LABELS[selectedReport.urgency]?.variant || "secondary"}>
                      {URGENCY_LABELS[selectedReport.urgency]?.label || selectedReport.urgency}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profil</p>
                    <p className="font-medium">{selectedReport.reporter_type === "business" ? "Entreprise" : "Ménage"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Début</p>
                    <p className="font-medium text-xs">
                      {format(new Date(selectedReport.start_time), "PPp", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Description</p>
                  <p className="text-sm">{selectedReport.description}</p>
                </div>
                {selectedReport.photo_url && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Photo jointe</p>
                    <SignedImage
                      storagePath={selectedReport.photo_url}
                      alt="Photo du signalement"
                      className="w-full rounded-lg border border-border max-h-60 object-cover"
                    />
                  </div>
                )}
                {!selectedReport.validated && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => validateMutation.mutate({ reportId: selectedReport.id, validated: true })}
                      disabled={validateMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Valider et publier
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => validateMutation.mutate({ reportId: selectedReport.id, validated: false })}
                      disabled={validateMutation.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeter
                    </Button>
                  </div>
                )}
                {selectedReport.validated && selectedReport.status === "active" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white"
                      onClick={() => resolveMutation.mutate(selectedReport.id)}
                      disabled={resolveMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marquer comme résolu
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReportsPage;
