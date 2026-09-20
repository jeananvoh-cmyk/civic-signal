import React, { useState } from 'react';

interface LeaderPortraitProps {
  photoUrl?: string;
  name: string;
  title?: string;
  sizeClass?: string;
  className?: string;
  showBadge?: boolean;
}

export const LeaderPortrait: React.FC<LeaderPortraitProps> = ({
  photoUrl,
  name,
  title,
  sizeClass = "w-20 h-20 sm:w-24 sm:h-24",
  className = "",
  showBadge = false,
}) => {
  const [hasError, setHasError] = useState(false);

  const cleanInitials = (name || '')
    .replace(/^(M\.|Mme|Dr|S\.E\.M\.|Nanan|Le Maire|Président)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || 'CI';

  if (!photoUrl || hasError) {
    return (
      <div 
        className={`relative flex-shrink-0 aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200/80 shadow-xs flex items-center justify-center ${sizeClass} ${className}`}
        title={title ? `${title} : ${name}` : name}
      >
        <div className="text-center p-2">
          <span className="font-black text-slate-500 text-sm tracking-wider">{cleanInitials}</span>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Élu local</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative flex-shrink-0 aspect-square rounded-2xl overflow-hidden border-2 border-slate-200/80 shadow-sm bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 group/photo cursor-zoom-in ${sizeClass} ${className}`}
      title={title ? `${title} : ${name}` : name}
    >
      {/* 1. Arrière-plan flouté (Bokeh studio) pour atténuer le décor, le paysage et les foules */}
      <img
        src={photoUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center filter blur-md scale-125 opacity-35 pointer-events-none"
      />

      {/* 2. Filtre dégradé studio uniforme (vignette douce) qui harmonise les bords et focalise sur le visage */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 opacity-75"
        style={{
          background: 'radial-gradient(circle at 50% 35%, transparent 40%, rgba(15, 23, 42, 0.45) 75%, rgba(15, 23, 42, 0.75) 100%)'
        }}
      />

      {/* 3. Photo principale avec cadrage portrait officiel et contraste studio */}
      <img
        src={photoUrl}
        alt={title ? `${title} : ${name}` : name}
        onError={() => setHasError(true)}
        loading="lazy"
        className="relative z-0 w-full h-full object-cover object-[50%_15%] filter contrast-[1.03] brightness-[0.98] transition-transform duration-300 ease-out group-hover/photo:scale-115"
      />

      {/* 4. Fine lueur et bordure intérieure de finition professionnelle */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-white/20 z-20" />

      {/* 5. Pastille indicative discrète si demandée */}
      {showBadge && (
        <div className="absolute bottom-1 right-1 z-30 bg-slate-900/85 backdrop-blur-xs text-brand-orange border border-white/20 px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
          Élu
        </div>
      )}
    </div>
  );
};
