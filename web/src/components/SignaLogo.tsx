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

  const sloganSizes = {
    sm: "text-[7.5px]",
    md: "text-[9.5px]",
    lg: "text-[12px]",
    xl: "text-[15px]",
  };

  const isWhite = variant === "white";

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* 🟢 Isotype Modèle 1 Vectoriel : Disque Vert Émeraude + Arc Blanc + Clef Blanche 45° */}
      <div className={cn("relative flex items-center justify-center shrink-0 rounded-full overflow-hidden drop-shadow-sm", iconSizes[size])}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <defs>
            <linearGradient id="signaModel1Grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Disque vert émeraude plein */}
          <circle cx="50" cy="50" r="48" fill="url(#signaModel1Grad)" />

          {/* Anneau blanc intérieur */}
          <path
            d="M 24 76 A 37 37 0 1 1 87 50 A 37 37 0 0 1 66 84"
            stroke="#FFFFFF"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />

          {/* Clef blanche inclinée à 45° */}
          <g transform="translate(50,50) rotate(-45) translate(-50,-50)">
            {/* Manche avec trou */}
            <path
              d="M 44 44 L 56 44 L 56 72 C 56 75.3 53.3 78 50 78 C 46.7 78 44 75.3 44 72 Z M 50 68 A 2.5 2.5 0 1 0 50 73 A 2.5 2.5 0 1 0 50 68 Z"
              fill="#FFFFFF"
              fillRule="evenodd"
            />
            {/* Tête de clef ouverte */}
            <path
              d="M 50 16 C 37 16 28 25 28 37 C 28 43 31.5 48 36.5 51 L 63.5 51 C 68.5 48 72 43 72 37 C 72 25 63 16 50 16 Z M 50 24 C 54 24 57.5 26.5 59 30 L 41 30 C 42.5 26.5 46 24 50 24 Z"
              fill="#FFFFFF"
              fillRule="evenodd"
            />
          </g>
        </svg>
      </div>

      {/* 🔤 Nom de marque pur SIGNA.ci sans slogan */}
      <span
        className={cn(
          "font-display font-black tracking-tight flex items-baseline gap-0.5 leading-none",
          isWhite ? "text-white" : "text-slate-900 dark:text-white",
          textSizes[size]
        )}
      >
        <span>SIGNA</span>
        <span className="text-emerald-500 font-extrabold">.ci</span>
      </span>
    </div>
  );
};

export default SignaLogo;
