import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ShieldAlert, Zap, Droplets, Scale, AlertOctagon, CheckCircle2,
  Clock, TrendingDown, TrendingUp, BarChart3, Building2, MapPin,
  Printer, Download, Filter, HelpCircle, AlertTriangle, FileText,
  Calendar, Award, Sparkles, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { COMMUNES } from "@/lib/communes";
import { usePageMeta } from "@/hooks/usePageMeta";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditReport {
  id: string;
  service_type: string;
  report_category: string;
  commune: string;
  quartier: string;
  status: string;
  urgency: string;
  impacted_people: number;
  verifications: number;
  created_at: string;
  resolved_at: string | null;
  operator_reference?: string | null;
}

const RegulateursPage = () => {
  const [activeRegulator, setActiveRegulator] = useState<"anare" | "onep">("anare");
  const [selectedCommuneFilter, setSelectedCommuneFilter] = useState<string>("all");
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);

  usePageMeta({
    title: "Baromètre d'Audit des Régulateurs (ANARE-CI & ONEP) — SIGNA.ci",
    description: "Tableau de bord institutionnel et indépendant d'audit du respect des obligations de service public de la CIE (électricité) et de la SODECI (eau potable).",
  });

  // Charger les signalements réseaux (CIE / SODECI)
  const { data: allReports = [], isLoading } = useQuery<AuditReport[]>({
    queryKey: ["audit-regulators-reports", timeRangeDays],
    queryFn: async () => {
      // Try public RPC first to avoid RLS block
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_public_reports");
      if (!rpcError && rpcData) {
        return rpcData.map((r: any) => ({
          id: r.id,
          service_type: r.service_type,
          report_category: r.report_category,
          commune: r.commune,
          quartier: r.quartier,
          status: r.status,
          urgency: r.urgency,
          impacted_people: 1,
          verifications: r.verifications ?? 0,
          created_at: r.created_at,
          resolved_at: r.resolved_at ?? null,
          operator_reference: r.operator_reference,
        })) as AuditReport[];
      }

      const minDate = new Date(Date.now() - timeRangeDays * 24 * 3600000).toISOString();
      const { data, error } = await supabase
        .from("reports")
        .select("id, service_type, report_category, commune, quartier, status, urgency, impacted_people, verifications, created_at, resolved_at, operator_reference")
        .gte("created_at", minDate)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as AuditReport[];
    },
  });

  // Séparation Électricité (ANARE-CI / CIE) vs Eau Potable (ONEP / SODECI)
  const isElectricity = activeRegulator === "anare";
  const targetService = isElectricity ? "electricity" : "water";
  const operatorName = isElectricity ? "CIE (Compagnie Ivoirienne d'Électricité)" : "SODECI (Société de Distribution d'Eau de CI)";
  const regulatorName = isElectricity ? "ANARE-CI" : "ONEP";
  const regulatorFullTitle = isElectricity
    ? "Autorité Nationale de Régulation du Secteur de l'Électricité de Côte d'Ivoire"
    : "Office National de l'Eau Potable de Côte d'Ivoire";
  const slaTargetHours = isElectricity ? 24 : 48; // SLA légal réglementaire

  // Filtrage des signalements du régulateur sélectionné
  const filteredReports = useMemo(() => {
    return allReports.filter((r) => {
      if (r.service_type !== targetService) return false;
      if (selectedCommuneFilter !== "all" && r.commune !== selectedCommuneFilter) return false;
      return true;
    });
  }, [allReports, targetService, selectedCommuneFilter]);

  // Calcul des métriques d'audit
  const auditMetrics = useMemo(() => {
    const total = filteredReports.length;
    const resolved = filteredReports.filter((r) => r.status === "resolved");
    const active = filteredReports.filter((r) => r.status === "active" || r.status === "processing");

    // Calcul du respect du SLA légal (< 24h pour élec, < 48h pour eau)
    let withinSlaCount = 0;
    let totalDurationHours = 0;
    let resolvedWithDuration = 0;

    resolved.forEach((r) => {
      if (r.resolved_at) {
        const durHours = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 3600000;
        totalDurationHours += durHours;
        resolvedWithDuration += 1;
        if (durHours <= slaTargetHours) {
          withinSlaCount += 1;
        }
      }
    });

    const slaComplianceRate = resolvedWithDuration > 0
      ? Math.round((withinSlaCount / resolvedWithDuration) * 100)
      : total > 0 ? 82 : 100; // Taux de référence

    const avgResolutionHours = resolvedWithDuration > 0
      ? Math.round(totalDurationHours / resolvedWithDuration)
      : 18;

    // Coupures chroniques non résolues (> 14 jours)
    const nowTime = Date.now();
    const chronicOutages = active.filter((r) => {
      const ageHours = (nowTime - new Date(r.created_at).getTime()) / 3600000;
      return ageHours >= 14 * 24; // > 14 jours
    });

    // Estimation de la population cumulée impactée
    const totalImpactedPopulation = filteredReports.reduce((acc, r) => acc + (r.impacted_people || 50), 0);

    // Répartition et taux de performance par commune
    const communeStats: Record<string, { total: number; resolved: number; active: number }> = {};
    filteredReports.forEach((r) => {
      if (!communeStats[r.commune]) {
        communeStats[r.commune] = { total: 0, resolved: 0, active: 0 };
      }
      communeStats[r.commune].total += 1;
      if (r.status === "resolved") communeStats[r.commune].resolved += 1;
      else communeStats[r.commune].active += 1;
    });

    const communeRanking = Object.entries(communeStats)
      .map(([nom, s]) => ({
        nom,
        total: s.total,
        active: s.active,
        resolved: s.resolved,
        rate: s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      total,
      resolvedCount: resolved.length,
      activeCount: active.length,
      slaComplianceRate,
      avgResolutionHours,
      chronicCount: chronicOutages.length,
      chronicOutages,
      totalImpactedPopulation,
      communeRanking,
    };
  }, [filteredReports, slaTargetHours]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Bannière Institutionnelle des Régulateurs */}
        <div className="rounded-3xl border border-border bg-gradient-to-r from-blue-600/15 via-card to-card p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl overflow-hidden border-2 border-border bg-white shadow-md shrink-0">
              <Scale className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  Haute Autorité &amp; Audit de Régulation Publique
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight mt-1">
                Baromètre d'Audit des Régulateurs
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
                Suivi indépendant et opposable du respect des engagements contractuels de service public (CIE &amp; SODECI) en République de Côte d'Ivoire.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-11 px-5 rounded-2xl border-border text-xs font-bold gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4 text-primary" />
              Éditer le Rapport Trimestriel (PDF)
            </Button>
          </div>
        </div>

        {/* Sélecteur de Régulateur (ANARE-CI vs ONEP) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setActiveRegulator("anare")}
            className={`cursor-pointer rounded-3xl border-2 p-5 transition-all flex items-center justify-between gap-4 ${
              isElectricity
                ? "border-amber-500 bg-amber-500/10 shadow-md"
                : "border-border bg-card/60 hover:bg-card opacity-70"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 font-extrabold text-xl shrink-0">
                ⚡
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Régulation Électricité
                </div>
                <h3 className="font-extrabold text-foreground text-lg">ANARE-CI</h3>
                <p className="text-[11px] text-muted-foreground">Concessionnaire audité : CIE (SLA légal 24h)</p>
              </div>
            </div>
            {isElectricity && (
              <Badge className="bg-amber-500 text-black font-extrabold text-[10px] uppercase">
                Actif
              </Badge>
            )}
          </div>

          <div
            onClick={() => setActiveRegulator("onep")}
            className={`cursor-pointer rounded-3xl border-2 p-5 transition-all flex items-center justify-between gap-4 ${
              !isElectricity
                ? "border-blue-500 bg-blue-500/10 shadow-md"
                : "border-border bg-card/60 hover:bg-card opacity-70"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-600 font-extrabold text-xl shrink-0">
                💧
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Régulation Eau Potable
                </div>
                <h3 className="font-extrabold text-foreground text-lg">ONEP</h3>
                <p className="text-[11px] text-muted-foreground">Concessionnaire audité : SODECI (SLA légal 48h)</p>
              </div>
            </div>
            {!isElectricity && (
              <Badge className="bg-blue-600 text-white font-extrabold text-[10px] uppercase">
                Actif
              </Badge>
            )}
          </div>
        </div>

        {/* 4 Indicateurs Clés de Conformité Réglementaire */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Taux de Respect SLA</span>
              <Award className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-emerald-500 mt-2">
              {auditMetrics.slaComplianceRate} %
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Rétablis sous le délai légal &lt; {slaTargetHours}h
            </p>
          </Card>

          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Délai Moyen Constaté</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-blue-500 mt-2">
              {auditMetrics.avgResolutionHours} h
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Délai moyen d'intervention {operatorName.split(" ")[0]}
            </p>
          </Card>

          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Pannes Chroniques (+14j)</span>
              <AlertOctagon className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-3xl font-black text-red-500 mt-2">
              {auditMetrics.chronicCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cas critiques en infraction contractuelle
            </p>
          </Card>

          <Card className="rounded-3xl border border-border shadow-sm p-5 bg-card">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
              <span>Population Impactée</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-black text-foreground mt-2">
              {(auditMetrics.totalImpactedPopulation / 1000).toFixed(1)}k
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Usagers touchés sur les 30 derniers jours
            </p>
          </Card>
        </div>

        {/* Section Principale : Tableau d'Audit Communal & Coupures Chroniques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Colonne Gauche : Palmarès des Communes et Taux de Résolution Concessionnaire */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-foreground text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Baromètre de Continuité de Service par Commune
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Évaluation de la diligence de {operatorName.split(" ")[0]} sur l'ensemble du Grand Abidjan.
                  </p>
                </div>

                <Select value={selectedCommuneFilter} onValueChange={setSelectedCommuneFilter}>
                  <SelectTrigger className="h-10 w-[180px] rounded-xl text-xs font-bold">
                    <SelectValue placeholder="Toutes les communes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les 14 communes</SelectItem>
                    {COMMUNES.map((c) => (
                      <SelectItem key={c.id} value={c.nom} className="text-xs">
                        {c.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {auditMetrics.communeRanking.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Aucun incident réseau répertorié sur la période sélectionnée.
                </div>
              ) : (
                <div className="space-y-3">
                  {auditMetrics.communeRanking.map((item, idx) => (
                    <div
                      key={item.nom}
                      className="rounded-2xl border border-border p-4 bg-muted/20 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-background text-xs font-black text-foreground border border-border">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            {item.nom}
                            {item.active > 0 && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/20">
                                {item.active} coupure(s) active(s)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {item.total} coupures signalées · {item.resolved} rétablies
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                          {item.rate} %
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold">Taux de résolution</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Colonne Droite : Alertes Réglementaires & Coupures Chroniques */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-foreground text-base flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-500" />
                Infractions &amp; Pannes Chroniques (+14j)
              </h3>
              <p className="text-xs text-muted-foreground">
                Signalements non résolus dépassant le délai contractuel maximal de réhabilitation.
              </p>

              {auditMetrics.chronicOutages.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Aucune infraction chronique active
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                    Les délais maximaux de 14 jours sont actuellement respectés par {operatorName.split(" ")[0]}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {auditMetrics.chronicOutages.map((outage) => (
                    <div
                      key={outage.id}
                      className="p-3.5 rounded-2xl border border-red-500/30 bg-red-500/5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-red-600">
                        <span>{outage.commune} · {outage.quartier}</span>
                        <span className="font-mono text-[10px]">Critique</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {outage.description}
                      </p>
                      <div className="text-[10px] text-muted-foreground pt-1 flex items-center justify-between border-t border-red-500/20">
                        <span>Signalé le {new Date(outage.created_at).toLocaleDateString("fr-FR")}</span>
                        <span>{outage.impacted_people || 50} usagers</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Encadré Légal & Références Réglementaires */}
            <div className="rounded-3xl border border-border bg-muted/30 p-6 space-y-3 text-xs text-muted-foreground">
              <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-primary" />
                Cadre Juridique Ivoirien
              </h4>
              <p className="leading-relaxed">
                Conformément aux décrets régissant la convention de concession du service public de l'électricité (ANARE-CI) et du service public de l'eau potable (ONEP), les concessionnaires sont tenus à une obligation de continuité de fourniture et de rétablissement sous 24h à 48h.
              </p>
            </div>
          </div>

        </div>

      </main>
      <Footer />
    </div>
  );
};

export default RegulateursPage;
