import { cn } from "@/lib/utils";

interface SignaLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showSlogan?: boolean;
}

export const SignaLogo = ({ className, size = "md", showSlogan = false }: SignaLogoProps) => {
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

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      {/* 📍 Emblem : Pin Couronné par les 3 Citoyens Dorés + 4 Services */}
      <div className={cn("relative flex items-center justify-center shrink-0 drop-shadow-xs", iconSizes[size])}>
        <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <defs>
            <linearGradient id="goldCitizens" x1="0" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#D97706" />
              <stop offset="0.5" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="pinGreenBorder" x1="0" y1="0" x2="0" y2="120" gradientUnits="userSpaceOnUse">
              <stop stopColor="#064E3B" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
          </defs>

          {/* 👥 3 Citoyens en Silhouette Dorée tenant la main au sommet du Pin (Style Image 2) */}
          <g fill="url(#goldCitizens)">
            {/* Tête Citoyen Gauche */}
            <circle cx="28" cy="18" r="6" />
            {/* Tête Citoyen Centre */}
            <circle cx="50" cy="12" r="7" />
            {/* Tête Citoyen Droit */}
            <circle cx="72" cy="18" r="6" />

            {/* Bustes & Bras unis formant la couronne supérieure du Pin */}
            <path
              d="M18 36C22 26 31 24 38 28C43 24 47 20 50 20C53 20 57 24 62 28C69 24 78 26 82 36C76 30 68 31 50 31C32 31 24 30 18 36Z"
            />
            {/* Bras qui se rejoignent en boucle unie */}
            <path
              d="M26 36C34 42 42 42 50 38C58 42 66 42 74 36C68 44 58 45 50 42C42 45 32 44 26 36Z"
              opacity="0.9"
            />
          </g>

          {/* 📍 Corps du Pin / Bouclier Vert Forêt (Structure Image 1) */}
          <path
            d="M50 26C31 26 18 40 18 60C18 84 50 114 50 114C50 114 82 84 82 60C82 40 69 26 50 26Z"
            fill="url(#pinGreenBorder)"
            stroke="white"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Cœur central blanc pour lisibilité des 4 services */}
          <circle cx="50" cy="62" r="23" fill="white" />

          {/* 💧 1. Eau (SODECI / ONEP) - Haut Gauche */}
          <g transform="translate(34, 46) scale(0.65)">
            <path d="M9 2C9 2 4 8 4 11.5C4 14.5 6.2 17 9 17C11.8 17 14 14.5 14 11.5C14 8 9 2 9 2Z" fill="#0284C7" />
            <path d="M2 5H9V7H2V5Z" fill="#0284C7" />
          </g>

          {/* ⚡ 2. Ampoule & Éclair (CIE / ANARE) - Haut Droit */}
          <g transform="translate(54, 46) scale(0.65)">
            <path d="M9 2C5.7 2 3 4.7 3 8C3 10.2 4.2 12.1 6 13.1V15C6 15.6 6.4 16 7 16H11C11.6 16 12 15.6 12 15V13.1C13.8 12.1 15 10.2 15 8C15 4.7 12.3 2 9 2ZM8 11L11 6H9L10 4L7 9H9L8 11Z" fill="#F59E0B" />
          </g>

          {/* 🗑️ 3. Sac Poubelle / Salubrité (Mairie) - Bas Gauche */}
          <g transform="translate(34, 66) scale(0.65)">
            <rect x="3" y="6" width="12" height="11" rx="2" fill="#10B981" />
            <path d="M6 3H12V6H6V3Z" fill="#10B981" />
          </g>

          {/* 🛣️ 4. Route avec bande centrale (Voirie - Mairie) - Bas Droit */}
          <g transform="translate(54, 66) scale(0.65)">
            <path d="M4 17L7 2H11L14 17H4Z" fill="#EA580C" />
            <line x1="9" y1="4" x2="9" y2="7" stroke="white" strokeWidth="1.5" />
            <line x1="9" y1="10" x2="9" y2="14" stroke="white" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      {/* 🔤 Nom Officiel SIGNA.ci & Slogan */}
      <div className="flex flex-col leading-none">
        <span className={cn("font-display font-extrabold tracking-tight text-foreground", textSizes[size])}>
          SIGNA<span className="text-emerald-600 dark:text-emerald-400">.ci</span>
        </span>
        {showSlogan ? (
          <span className={cn("font-extrabold tracking-wider text-muted-foreground uppercase mt-1", sloganSizes[size])}>
            SIGNALER. SUIVRE. RÉPARER.
          </span>
        ) : (
          <span className={cn("font-bold tracking-wider text-emerald-800 dark:text-emerald-400 uppercase mt-0.5", sloganSizes[size])}>
            SIGNALER. SUIVRE. RÉPARER.
          </span>
        )}
      </div>
    </div>
  );
};

export default SignaLogo;
