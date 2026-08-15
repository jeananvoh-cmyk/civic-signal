import { motion } from "framer-motion";

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  trend?: string;
  colorClass?: string;
  delay?: number;
}

const StatCard = ({ icon, value, label, trend, colorClass = "bg-primary", delay = 0 }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-5 shadow-card"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-medium text-success">{trend}</span>
        )}
      </div>
      <div className="mt-4">
        <p className="font-display text-3xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
};

export default StatCard;
