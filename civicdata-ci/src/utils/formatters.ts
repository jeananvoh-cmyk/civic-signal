// Formatting utilities for Ivorian Civic Tech platform

/**
 * Format an amount in FCFA with proper spacing (e.g., 40 000 000 FCFA)
 */
export function formatFCFA(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 FCFA';
  }
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted.replace(/\u202F/g, ' ')} FCFA`;
}

/**
 * Format a large amount in Millions or Billions FCFA for badges and statistics
 */
export function formatCompactFCFA(amount: number): string {
  if (amount >= 1_000_000_000) {
    const milliards = (amount / 1_000_000_000).toFixed(1).replace('.', ',');
    return `${milliards} Milliards FCFA`;
  }
  if (amount >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(0);
    return `${millions} Millions FCFA`;
  }
  return formatFCFA(amount);
}

/**
 * Format a date into clean French format (e.g., 14 février 2026)
 */
export function formatDateFR(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Get visual badge colors and labels for project status
 */
export function getStatusConfig(status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') {
  switch (status) {
    case 'NOT_STARTED':
      return {
        label: 'Non commencé',
        badgeClass: 'bg-red-100 text-red-700 border-red-200',
        dotClass: 'bg-red-500',
        icon: '🔴',
        progressColor: 'bg-red-500',
      };
    case 'IN_PROGRESS':
      return {
        label: 'En cours',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
        icon: '🟡',
        progressColor: 'bg-amber-500',
      };
    case 'COMPLETED':
      return {
        label: 'Terminé / Livré',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
        icon: '🟢',
        progressColor: 'bg-emerald-500',
      };
    default:
      return {
        label: 'Statut indéfini',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        dotClass: 'bg-slate-400',
        icon: '⚪',
        progressColor: 'bg-slate-400',
      };
  }
}
