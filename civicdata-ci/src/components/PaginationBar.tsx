import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [8, 16, 24, 48],
  itemLabel = 'élément',
  className = '',
}) => {
  if (totalItems <= 0) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Génération intelligente des numéros de pages avec ellipse
  const getPageNumbers = () => {
    const delta = 2; // Nombre de pages autour de la page courante
    const range: (number | 'ellipsis')[] = [];
    const rangeWithDots: (number | 'ellipsis')[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= safePage - delta && i <= safePage + delta)
      ) {
        range.push(i);
      }
    }

    let l: number | null = null;
    for (const i of range) {
      if (l !== null && typeof i === 'number') {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('ellipsis');
        }
      }
      rangeWithDots.push(i);
      if (typeof i === 'number') l = i;
    }

    return rangeWithDots;
  };

  const handlePageClick = (p: number) => {
    if (p !== safePage && p >= 1 && p <= totalPages) {
      onPageChange(p);
      window.scrollTo({ top: 350, behavior: 'smooth' });
    }
  };

  return (
    <div className={`bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4 mt-8 ${className}`}>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Contrôles de Navigation Principaux */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
          
          {/* Aller à la première page */}
          <button
            onClick={() => handlePageClick(1)}
            disabled={safePage <= 1}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold shadow-2xs cursor-pointer"
            title="Première page (Page 1)"
            aria-label="Première page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Page précédente */}
          <button
            onClick={() => handlePageClick(safePage - 1)}
            disabled={safePage <= 1}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold shadow-2xs cursor-pointer"
            title="Page précédente"
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numéros de page cliquables directs (Visibles sur tablette et Desktop) */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((num, idx) => {
              if (num === 'ellipsis') {
                return (
                  <span key={`ellipsis-${idx}`} className="w-8 text-center text-slate-400 font-bold select-none">
                    …
                  </span>
                );
              }
              const isActive = num === safePage;
              return (
                <button
                  key={`page-${num}`}
                  onClick={() => handlePageClick(num)}
                  className={`min-w-[2.25rem] h-9 sm:h-10 px-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-blue text-white shadow-xs scale-105 border border-brand-blue'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:border-brand-blue/30 shadow-2xs'
                  }`}
                  aria-label={`Page ${num}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {num}
                </button>
              );
            })}
          </div>

          {/* Sélecteur de page instantané tactile (Menu déroulant compact pour mobile et desktop) */}
          <div className="relative inline-flex items-center">
            <select
              value={safePage}
              onChange={(e) => handlePageClick(Number(e.target.value))}
              className="appearance-none pl-3 pr-8 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white text-brand-blue font-black text-xs sm:text-sm shadow-2xs hover:border-brand-blue/40 focus:ring-2 focus:ring-brand-blue focus:outline-none cursor-pointer"
              title="Sauter directement à n'importe quelle page"
              aria-label="Sélectionner directement une page"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p}>
                  Page {p} / {totalPages}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 text-brand-blue font-bold text-xs">
              ▾
            </span>
          </div>

          {/* Page suivante */}
          <button
            onClick={() => handlePageClick(safePage + 1)}
            disabled={safePage >= totalPages}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold shadow-2xs cursor-pointer"
            title="Page suivante"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Aller à la dernière page */}
          <button
            onClick={() => handlePageClick(totalPages)}
            disabled={safePage >= totalPages}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold shadow-2xs cursor-pointer"
            title={`Dernière page (Page ${totalPages})`}
            aria-label="Dernière page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Côté Droit : Sélecteur par page et Compteur Global */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center text-xs">
          {onPageSizeChange && (
            <div className="flex items-center gap-1.5 text-slate-500 font-bold">
              <span>Par page :</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {pageSizeOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onPageSizeChange(opt);
                      onPageChange(1);
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold transition-all cursor-pointer ${
                      pageSize === opt
                        ? 'bg-brand-blue text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            AFFICHAGE <span className="text-slate-700 font-extrabold">{startIndex + 1}–{endIndex}</span> SUR <span className="text-slate-900 font-black">{totalItems}</span> {itemLabel}{totalItems > 1 ? 's' : ''}
          </div>
        </div>

      </div>
    </div>
  );
};
