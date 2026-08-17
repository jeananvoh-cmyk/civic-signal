import { cn } from "@/lib/utils";

interface SignaLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSlogan?: boolean;
  variant?: "default" | "white" | "dark";
}

export const SignaLogo = ({ className, size = "md", showSlogan = false, variant = "default" }: SignaLogoProps) => {
  const iconSizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-5xl",
  };

  const isWhite = variant === "white";

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* 🟢 Isotype Officiel SIGNA.ci : Disque Vert Émeraude + Arc Blanc + Clé Plate de Réparation 45° */}
      <div className={cn("relative flex items-center justify-center shrink-0 rounded-full overflow-hidden drop-shadow-sm", iconSizes[size])}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <defs>
            <linearGradient id="signaRepairGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* 1. Disque vert émeraude plein */}
          <circle
            cx="50"
            cy="50"
            r="47.5"
            fill="url(#signaRepairGrad)"
            stroke="#34D399"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />

          {/* 2. Arc de cercle blanc ouvert à droite (forme en C) */}
          <path
            d="M 73 27 A 33 33 0 1 0 73 73"
            stroke="#FFFFFF"
            strokeWidth="7.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* 3. Clé plate mécanique de réparation à 45° (Tête en haut à droite, manche en bas à gauche) */}
          <g transform="translate(50,50) rotate(45) translate(-50,-50)">
            {/* Clé complète (Mâchoire ouverte en haut + Manche avec trou à la base) */}
            <path
              d="M 44 42
                 C 34 37 30 29 32 15
                 C 32.5 13 35.5 13 38 14.5
                 L 43 24
                 C 44.5 27 47 29 50 29
                 C 53 29 55.5 27 57 24
                 L 62 14.5
                 C 64.5 13 67.5 13 68 15
                 C 70 29 66 37 56 42
                 L 56 74
                 C 56 78 53.3 81 50 81
                 C 46.7 81 44 78 44 74
                 Z
                 M 50 71
                 A 3.5 3.5 0 1 0 50 78
                 A 3.5 3.5 0 1 0 50 71
                 Z"
              fill="#FFFFFF"
              fillRule="evenodd"
            />
          </g>
        </svg>
      </div>

      {/* 🔤 Nom de marque horizontal SIGNA.ci (placé À CÔTÉ et non en bas) */}
      <span
        className={cn(
          "font-display font-black tracking-tight flex items-baseline gap-0.5 leading-none",
          isWhite ? "text-white" : "text-slate-900 dark:text-white",
          textSizes[size]
        )}
      >
        <span>SIGNA</span>
        <span className="text-emerald-500 font-black">.ci</span>
      </span>
    </div>
  );
};

export default SignaLogo;
