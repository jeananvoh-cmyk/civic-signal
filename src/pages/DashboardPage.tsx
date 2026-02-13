import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, AlertTriangle, CheckCircle2, Users, TrendingUp, MapPin, Clock } from "lucide-react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SERVICE_CONFIG, URGENCY_CONFIG, groupReportsByZone } from "@/lib/data";
import type { Report, GroupedReport } from "@/lib/data";

const formatTimeAgo = (date: Date) => {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
};

const GroupedReportCard = ({ group, index }: { group: GroupedReport; index: number }) => {
  const service = SERVICE_CONFIG[group.serviceType];
  const urgency = URGENCY_CONFIG[group.highestUrgency];
  const Icon = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated"
    >
      {group.activeCount > 0 && (
        <div className="absolute right-4 top-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-urgent opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-urgent" />
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${service.lightBgClass}`}>
          <Icon className={`h-5 w-5 ${service.colorClass}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge className={urgency.colorClass}>{urgency.label}</Badge>
            <Badge variant="outline" className="font-mono text-xs">
              {group.count} signalement{group.count > 1 ? "s" : ""}
            </Badge>
            {group.activeCount > 0 && (
              <Badge variant="outline" className="border-urgent text-urgent">
                {group.activeCount} actif{group.activeCount > 1 ? "s" : ""}
              </Badge>
            )}
            {group.resolvedCount > 0 && (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="mr-1 h-3 w-3" /> {group.resolvedCount} résolu{group.resolvedCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <p className="mb-1 text-sm font-semibold text-foreground">
            {group.commune}{group.quartier ? `, ${group.quartier}` : ""}
          </p>

          <div className="mb-2 space-y-0.5">
            {group.descriptions.map((desc, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">• {desc}</p>
            ))}
            {group.count > group.descriptions.length && (
              <p className="text-xs text-muted-foreground italic">
                +{group.count - group.descriptions.length} autre{group.count - group.descriptions.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {group.commune}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatTimeAgo(group.latestCreatedAt)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> Vérifications totales
              </span>
              <span className="font-medium text-foreground">{group.totalVerifications}</span>
            </div>
            <Progress value={Math.min(100, (group.totalVerifications / (group.count * 10)) * 100)} className="h-1.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DashboardPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase.rpc("get_public_reports");

      if (!error && data) {
        const mapped: Report[] = data.map((r: any) => ({
          id: r.id,
          serviceType: r.service_type,
          description: r.description,
          location: r.location,
          latitude: r.latitude ?? 0,
          longitude: r.longitude ?? 0,
          urgency: r.urgency,
          status: r.status,
          createdAt: new Date(r.created_at),
          resolvedAt: r.resolved_at ? new Date(r.resolved_at) : undefined,
          verifications: r.verifications ?? 0,
          verificationsNeeded: 10,
          reporterType: r.reporter_type,
        }));
        setReports(mapped);
      }
      setLoading(false);
    };
    fetchReports();
  }, []);

  const grouped = groupReportsByZone(reports);
  const activeReports = reports.filter((r) => r.status === "active").length;
  const resolvedReports = reports.filter((r) => r.status === "resolved").length;
  const totalVerifications = reports.reduce((sum, r) => sum + r.verifications, 0);

  const electricityGroups = grouped.filter((g) => g.serviceType === "electricity");
  const waterGroups = grouped.filter((g) => g.serviceType === "water");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-2 text-muted-foreground">Vue d'ensemble des signalements par zone, fusionnés par commune et quartier</p>
        </motion.div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-urgent-foreground" />} value={loading ? "..." : activeReports} label="Coupures actives" colorClass="bg-urgent" delay={0} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-success-foreground" />} value={loading ? "..." : resolvedReports} label="Résolues" colorClass="bg-success" delay={0.1} />
          <StatCard icon={<Users className="h-5 w-5 text-primary-foreground" />} value={loading ? "..." : totalVerifications} label="Vérifications" colorClass="gradient-hero" delay={0.2} />
          <StatCard icon={<TrendingUp className="h-5 w-5 text-water-foreground" />} value={loading ? "..." : `${grouped.length} zone${grouped.length > 1 ? "s" : ""}`} label={`${reports.length} signalement${reports.length > 1 ? "s" : ""} total`} colorClass="gradient-water" delay={0.3} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">Aucun signalement pour le moment.</div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Toutes les zones ({grouped.length})</TabsTrigger>
              <TabsTrigger value="electricity" className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Électricité ({electricityGroups.length})
              </TabsTrigger>
              <TabsTrigger value="water" className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" /> Eau ({waterGroups.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4 space-y-3">
              {grouped.map((g, i) => (<GroupedReportCard key={g.key} group={g} index={i} />))}
            </TabsContent>
            <TabsContent value="electricity" className="mt-4 space-y-3">
              {electricityGroups.map((g, i) => (<GroupedReportCard key={g.key} group={g} index={i} />))}
            </TabsContent>
            <TabsContent value="water" className="mt-4 space-y-3">
              {waterGroups.map((g, i) => (<GroupedReportCard key={g.key} group={g} index={i} />))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
