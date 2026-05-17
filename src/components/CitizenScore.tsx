import { useEffect, useState } from "react";
import { Star, Shield, Zap, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ScoreData {
  validatedCount: number;
  totalCount: number;
  profileComplete: boolean;
  accountAgeDays: number;
}

interface ScoreLevel {
  label: string;
  minScore: number;
  icon: React.ReactNode;
  bgClass: string;
  textClass: string;
  borderClass: string;
  barClass: string;
  description: string;
}

const LEVELS: ScoreLevel[] = [
  {
    label: "Débutant",
    minScore: 0,
    icon: <Star className="h-3.5 w-3.5" />,
    bgClass: "bg-muted",
    textClass: "text-muted-foreground",
    borderClass: "border-border",
    barClass: "bg-muted-foreground/40",
    description: "Bienvenue sur SIGNA-CI",
  },
  {
    label: "Citoyen actif",
    minScore: 10,
    icon: <Zap className="h-3.5 w-3.5" />,
    bgClass: "bg-info/10",
    textClass: "text-info",
    borderClass: "border-info/30",
    barClass: "bg-info",
    description: "Signalements actifs et profil renseigné",
  },
  {
    label: "Signaleur vérifié",
    minScore: 30,
    icon: <Shield className="h-3.5 w-3.5" />,
    bgClass: "bg-success/10",
    textClass: "text-success",
    borderClass: "border-success/30",
    barClass: "bg-success",
    description: "Plusieurs signalements validés par l'équipe",
  },
  {
    label: "Ambassadeur",
    minScore: 70,
    icon: <Award className="h-3.5 w-3.5" />,
    bgClass: "bg-warning/10",
    textClass: "text-warning",
    borderClass: "border-warning/30",
    barClass: "bg-warning",
    description: "Contributeur de confiance de longue date",
  },
];

function computeScore(data: ScoreData): number {
  let score = 0;
  score += data.validatedCount * 8;           // 8 pts par signalement validé
  score += Math.min(data.totalCount * 2, 20); // 2 pts par signalement (max 20)
  if (data.profileComplete) score += 15;      // profil complet
  score += Math.min(Math.floor(data.accountAgeDays / 30), 12); // ancienneté (max 12 mois)
  return score;
}

function getLevel(score: number): ScoreLevel {
  return [...LEVELS].reverse().find((l) => score >= l.minScore) ?? LEVELS[0];
}

interface CitizenScoreProps {
  userId?: string;
  profileComplete?: boolean;
  compact?: boolean;
}

/** Badge de score citoyen — affiché dans le profil */
export const CitizenScore = ({
  userId,
  profileComplete = false,
  compact = false,
}: CitizenScoreProps) => {
  const { user } = useAuth();
  const uid = userId ?? user?.id;
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);

  useEffect(() => {
    if (!uid || !user) return;

    const fetch = async () => {
      const [validatedRes, totalRes] = await Promise.all([
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("validated", true),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
      ]);

      const ageDays = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / 86400000
      );

      setScoreData({
        validatedCount: validatedRes.count ?? 0,
        totalCount: totalRes.count ?? 0,
        profileComplete,
        accountAgeDays: ageDays,
      });
    };

    fetch();
  }, [uid, user, profileComplete]);

  if (!scoreData) return null;

  const score = computeScore(scoreData);
  const level = getLevel(score);
  const nextLevel = LEVELS.find((l) => l.minScore > score);
  const progress = nextLevel
    ? Math.round(((score - level.minScore) / (nextLevel.minScore - level.minScore)) * 100)
    : 100;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${level.bgClass} ${level.textClass} ${level.borderClass}`}
        aria-label={`Score citoyen : ${level.label} (${score} points)`}
      >
        <span aria-hidden="true">{level.icon}</span>
        {level.label}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border ${level.borderClass} ${level.bgClass} p-4 space-y-3`} aria-label={`Score citoyen : ${level.label}, ${score} points`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${level.borderClass} ${level.textClass}`}>
            {level.icon}
          </div>
          <div>
            <p className={`text-sm font-bold ${level.textClass}`}>{level.label}</p>
            <p className="text-xs text-muted-foreground">{level.description}</p>
          </div>
        </div>
        <span className={`text-lg font-extrabold ${level.textClass}`}>{score} pts</span>
      </div>

      {/* Progress toward next level */}
      {nextLevel && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Prochain niveau : {nextLevel.label}</span>
            <span>{nextLevel.minScore - score} pts manquants</span>
          </div>
          <div
            className="h-1.5 w-full rounded-full bg-border overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progression vers ${nextLevel?.label} : ${progress}%`}
          >
            <div
              className={`h-full rounded-full origin-left transition-transform duration-500 ${level.barClass}`}
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-xs text-muted-foreground pt-1">
        <span><span aria-hidden="true">✅</span> {scoreData.validatedCount} validé{scoreData.validatedCount > 1 ? "s" : ""}</span>
        <span><span aria-hidden="true">📋</span> {scoreData.totalCount} total</span>
        {profileComplete && <span><span aria-hidden="true">👤</span> Profil complet</span>}
      </div>
    </div>
  );
};

export default CitizenScore;
