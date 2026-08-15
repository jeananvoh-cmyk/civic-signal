import { PriorityResult } from "@/lib/priority-score";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PriorityBadgeProps {
  priority: PriorityResult;
  /** Show score number */
  showScore?: boolean;
  /** Show detailed factors on hover (admin mode) */
  showFactors?: boolean;
  className?: string;
}

const PriorityBadge = ({ priority, showScore = false, showFactors = false, className = "" }: PriorityBadgeProps) => {
  const badge = (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${priority.pillClass} ${className}`}>
      {priority.emoji} {priority.level}
      {showScore && <span className="opacity-70">({priority.score})</span>}
    </span>
  );

  if (!showFactors || priority.factors.length === 0) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-bold mb-1">Score de priorité : {priority.score}/100</p>
          <ul className="text-[11px] space-y-0.5">
            {priority.factors.map((f, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="text-muted-foreground">•</span> {f}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PriorityBadge;
