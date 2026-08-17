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
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      {/* 📍 Isotype Minimaliste & Épuré : Balise Pin + "S" Dynamique + 2 Ondes Civiques */}
      <div className={cn("relative flex items-center justify-center shrink-0 drop-shadow-sm", iconSizes[size])}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <defs>
            <linearGradient id="signaGradPrimary" x1="15" y1="10" x2="85" y2="95" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#0D9488" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="signaGradSignal" x1="60" y1="20" x2="90" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>

          {/* 📍 Corps du Pin fusionné avec le 'S' aérodynamique */}
          <path
            d="M 50 12 C 32 12 18 26 18 44 C 18 64 42 86 48 91.5 C 49.2 92.5 50.8 92.5 52 91.5 C 58 86 82 64 82 44 C 82 26 68 12 50 12 Z M 50 24 C 59 24 67 31 67 40 C 67 44 64 48 60 50 C 54 53 44 54 44 59 C 44 62 47 64 51 64 C 56 64 61 61 63 58 L 69 63 C 65 69 58 72 50 72 C 40 72 34 66 34 58 C 34 50 42 47 48 44 C 54 42 57 40 57 37 C 57 33 53 31 49 31 C 44 31 40 34 38 38 L 31 34 C 34 28 42 24 50 24 Z"
            fill="url(#signaGradPrimary)"
          />

          {/* 📶 2 Ondes de Signal Civique Minimalistes */}
          <path
            d="M 72 26 C 78 31 82 38 82 46 C 82 54 78 61 72 66"
            stroke="url(#signaGradSignal)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 83 18 C 91 25 96 35 96 46 C 96 57 91 67 83 74"
            stroke="url(#signaGradSignal)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* 🔤 Nom Officiel SIGNA.ci & Slogan avec Contraste Parfait */}
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-black tracking-tight",
            isWhite ? "text-white" : "text-slate-900 dark:text-white",
            textSizes[size]
          )}
        >
          SIGNA
          <span className={cn(isWhite ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400")}>
            .ci
          </span>
        </span>
        {showSlogan ? (
          <span
            className={cn(
              "font-extrabold tracking-wider uppercase mt-1",
              isWhite ? "text-slate-300" : "text-slate-500 dark:text-slate-400",
              sloganSizes[size]
            )}
          >
            SIGNALER. SUIVRE. RÉPARER.
          </span>
        ) : (
          <span
            className={cn(
              "font-bold tracking-wider uppercase mt-0.5",
              isWhite ? "text-emerald-300" : "text-emerald-800 dark:text-emerald-300",
              sloganSizes[size]
            )}
          >
            SIGNALER. SUIVRE. RÉPARER.
          </span>
        )}
      </div>
    </div>
  );
};

export default SignaLogo;
