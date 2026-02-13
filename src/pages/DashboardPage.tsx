import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Droplets, AlertTriangle, CheckCircle2, Users, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ReportCard from "@/components/ReportCard";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Report } from "@/lib/data";

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

  const activeReports = reports.filter((r) => r.status === "active").length;
  const resolvedReports = reports.filter((r) => r.status === "resolved").length;
  const totalVerifications = reports.reduce((sum, r) => sum + r.verifications, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-2 text-muted-foreground">Vue d'ensemble des signalements en temps réel</p>
        </motion.div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<AlertTriangle className="h-5 w-5 text-urgent-foreground" />} value={loading ? "..." : activeReports} label="Coupures actives" colorClass="bg-urgent" delay={0} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5 text-success-foreground" />} value={loading ? "..." : resolvedReports} label="Résolues" colorClass="bg-success" delay={0.1} />
          <StatCard icon={<Users className="h-5 w-5 text-primary-foreground" />} value={loading ? "..." : totalVerifications} label="Vérifications" colorClass="gradient-hero" delay={0.2} />
          <StatCard icon={<TrendingUp className="h-5 w-5 text-water-foreground" />} value={loading ? "..." : reports.length} label="Total signalements" colorClass="gradient-water" delay={0.3} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">Aucun signalement pour le moment.</div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="electricity" className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Électricité
              </TabsTrigger>
              <TabsTrigger value="water" className="flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5" /> Eau
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4 space-y-3">
              {reports.map((report, i) => (<ReportCard key={report.id} report={report} index={i} />))}
            </TabsContent>
            <TabsContent value="electricity" className="mt-4 space-y-3">
              {reports.filter((r) => r.serviceType === "electricity").map((report, i) => (<ReportCard key={report.id} report={report} index={i} />))}
            </TabsContent>
            <TabsContent value="water" className="mt-4 space-y-3">
              {reports.filter((r) => r.serviceType === "water").map((report, i) => (<ReportCard key={report.id} report={report} index={i} />))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
