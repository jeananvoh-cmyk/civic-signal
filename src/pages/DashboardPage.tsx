import { motion } from "framer-motion";
import { Zap, Droplets, AlertTriangle, CheckCircle2, Users, TrendingUp } from "lucide-react";
import Header from "@/components/Header";
import StatCard from "@/components/StatCard";
import ReportCard from "@/components/ReportCard";
import { MOCK_REPORTS } from "@/lib/data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DashboardPage = () => {
  const activeReports = MOCK_REPORTS.filter((r) => r.status === "active").length;
  const resolvedReports = MOCK_REPORTS.filter((r) => r.status === "resolved").length;
  const totalVerifications = MOCK_REPORTS.reduce((sum, r) => sum + r.verifications, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="mt-2 text-muted-foreground">Vue d'ensemble des signalements en temps réel</p>
        </motion.div>

        {/* Stats grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 text-urgent-foreground" />}
            value={activeReports}
            label="Coupures actives"
            colorClass="bg-urgent"
            delay={0}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-success-foreground" />}
            value={resolvedReports}
            label="Résolues (24h)"
            trend="+12%"
            colorClass="bg-success"
            delay={0.1}
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-primary-foreground" />}
            value={totalVerifications}
            label="Vérifications"
            colorClass="gradient-hero"
            delay={0.2}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-water-foreground" />}
            value="96%"
            label="Fiabilité des données"
            trend="+3%"
            colorClass="gradient-water"
            delay={0.3}
          />
        </div>

        {/* Reports list */}
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
            {MOCK_REPORTS.map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </TabsContent>
          <TabsContent value="electricity" className="mt-4 space-y-3">
            {MOCK_REPORTS.filter((r) => r.serviceType === "electricity").map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </TabsContent>
          <TabsContent value="water" className="mt-4 space-y-3">
            {MOCK_REPORTS.filter((r) => r.serviceType === "water").map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DashboardPage;
