import { motion } from "framer-motion";
import { Report, SERVICE_CONFIG, URGENCY_CONFIG } from "@/lib/data";
import { Clock, CheckCircle2, Users, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const formatTimeAgo = (date: Date) => {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
};

const ReportCard = ({ report, index }: { report: Report; index: number }) => {
  const service = SERVICE_CONFIG[report.serviceType];
  const urgency = URGENCY_CONFIG[report.urgency];
  const Icon = service.icon;
  const verificationPercent = Math.min(100, (report.verifications / report.verificationsNeeded) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated"
    >
      {/* Status indicator */}
      {report.status === "active" && (
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
            {report.status === "resolved" && (
              <Badge variant="outline" className="border-success text-success">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Résolu
              </Badge>
            )}
            {report.status === "verifying" && (
              <Badge variant="outline" className="border-warning text-warning">
                Vérification
              </Badge>
            )}
          </div>

          <p className="mb-2 text-sm font-medium text-foreground">{report.description}</p>

          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {report.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatTimeAgo(report.createdAt)}
            </span>
          </div>

          {/* Verification progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> Vérifications communautaires
              </span>
              <span className="font-medium text-foreground">
                {report.verifications}/{report.verificationsNeeded}
              </span>
            </div>
            <Progress value={verificationPercent} className="h-1.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportCard;
