import { useRef } from "react";
import { Share2, Download, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CitizenBadgeProps {
  displayName: string;
  resolvedCount: number;
  commune?: string;
}

const BADGE_LEVELS = [
  { min: 1,  label: "Citoyen Engagé",   color: "#3B82F6", bg: "#EFF6FF", emoji: "🌱" },
  { min: 5,  label: "Citoyen Actif",    color: "#E65B1B", bg: "#FFF7ED", emoji: "⚡" },
  { min: 15, label: "Signaleur Vérifié",color: "#2D6A4F", bg: "#F0FDF4", emoji: "✅" },
  { min: 30, label: "Ambassadeur SIGNA",color: "#D97706", bg: "#FFFBEB", emoji: "🏆" },
];

function getBadgeLevel(count: number) {
  for (let i = BADGE_LEVELS.length - 1; i >= 0; i--) {
    if (count >= BADGE_LEVELS[i].min) return BADGE_LEVELS[i];
  }
  return BADGE_LEVELS[0];
}

export default function CitizenBadge({ displayName, resolvedCount, commune }: CitizenBadgeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badge = getBadgeLevel(resolvedCount);

  const generateImage = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 800, 400);
      grad.addColorStop(0, badge.color + "22");
      grad.addColorStop(1, badge.color + "08");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, 800, 400);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 400);

      // Border
      ctx.strokeStyle = badge.color + "60";
      ctx.lineWidth = 3;
      ctx.roundRect(8, 8, 784, 384, 24);
      ctx.stroke();

      // App name
      ctx.fillStyle = badge.color;
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText("SIGNA-CI", 60, 64);

      // Emoji
      ctx.font = "80px serif";
      ctx.fillText(badge.emoji, 60, 180);

      // Badge label
      ctx.fillStyle = badge.color;
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.fillText(badge.label, 60, 260);

      // Name
      ctx.fillStyle = "#374151";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText(displayName, 60, 312);

      // Stats
      ctx.fillStyle = "#6B7280";
      ctx.font = "22px system-ui, sans-serif";
      const statsText = `${resolvedCount} signalement${resolvedCount > 1 ? "s" : ""} résolu${resolvedCount > 1 ? "s" : ""}${commune ? ` · ${commune}` : ""}`;
      ctx.fillText(statsText, 60, 350);

      // Right: big number
      ctx.fillStyle = badge.color + "20";
      ctx.beginPath();
      ctx.arc(680, 200, 100, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = badge.color;
      ctx.font = "bold 72px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(resolvedCount), 680, 225);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#6B7280";
      ctx.fillText("résolus", 680, 260);

      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signa-ci-badge-${badge.label.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = `${badge.emoji} Je suis ${badge.label} sur SIGNA-CI !\n\nJ'ai contribué à résoudre ${resolvedCount} problème${resolvedCount > 1 ? "s" : ""} dans mon quartier${commune ? ` à ${commune}` : ""}.\n\nRejoignez-moi pour signaler les pannes et problèmes d'infrastructure de votre commune → signa.ci`;

    if (navigator.share) {
      try {
        const blob = await generateImage();
        if (blob) {
          const file = new File([blob], "signa-ci-badge.png", { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], text });
            return;
          }
        }
        await navigator.share({ text, url: "https://signa.ci" });
      } catch {
        // user cancelled — silently ignore
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 overflow-hidden"
      style={{ borderColor: badge.color + "50" }}
    >
      {/* Badge visual */}
      <div
        className="px-5 py-4 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${badge.color}14, ${badge.color}06)` }}
      >
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
          style={{ backgroundColor: badge.color + "20", border: `2px solid ${badge.color}40` }}
        >
          {badge.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: badge.color }}>
            Badge débloqué
          </p>
          <h3 className="font-bold text-base text-foreground leading-tight">{badge.label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-bold" style={{ color: badge.color }}>{resolvedCount}</span>
            {" "}signalement{resolvedCount > 1 ? "s" : ""} résolu{resolvedCount > 1 ? "s" : ""}
            {commune && <> · <span className="font-medium">{commune}</span></>}
          </p>
        </div>
        <Trophy className="h-5 w-5 shrink-0 opacity-40" style={{ color: badge.color }} />
      </div>

      {/* Actions */}
      <div className="px-5 py-3 flex items-center gap-2 border-t" style={{ borderColor: badge.color + "20" }}>
        <p className="text-[11px] text-muted-foreground flex-1">Partagez votre engagement citoyen !</p>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2.5 gap-1.5 text-xs"
          onClick={handleDownload}
        >
          <Download className="h-3.5 w-3.5" />
          PNG
        </Button>
        <Button
          size="sm"
          className="h-8 px-3 gap-1.5 text-xs"
          style={{ backgroundColor: badge.color }}
          onClick={handleShare}
        >
          <Share2 className="h-3.5 w-3.5" />
          Partager
        </Button>
      </div>

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
