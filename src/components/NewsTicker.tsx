import { Radio } from "lucide-react";

export interface TickerItem {
  icon?: string;
  text: string;
  category?: string;
}

interface NewsTickerProps {
  items: TickerItem[];
  label?: string;
  /** Animation speed in seconds for a full cycle. Lower = faster. Default 28. */
  speed?: number;
  variant?: "default" | "alert" | "success";
}

const variantLabel: Record<string, string> = {
  default: "bg-primary text-white",
  alert:   "bg-destructive text-white",
  success: "bg-success text-success-foreground",
};

const NewsTicker = ({
  items,
  label = "EN DIRECT",
  speed = 28,
  variant = "default",
}: NewsTickerProps) => {
  if (!items.length) return null;

  // Duplicate items to create a seamless infinite loop
  const doubled = [...items, ...items];

  return (
    <div className="flex items-stretch h-9 overflow-hidden bg-card border-b border-border text-sm select-none shadow-sm">
      {/* Left label */}
      <div
        className={`flex items-center shrink-0 px-3 gap-1.5 font-bold text-[11px] uppercase tracking-widest z-10 ${variantLabel[variant]}`}
      >
        <Radio className="h-3 w-3 animate-pulse" />
        <span className="hidden sm:inline">{label}</span>
      </div>

      {/* Separator */}
      <div className="w-px bg-border shrink-0" />

      {/* Scrolling track */}
      <div className="flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent_0%,black_3%,black_97%,transparent_100%)]">
        <div
          className="flex items-center w-max h-full hover:[animation-play-state:paused]"
          style={{ animation: `ticker ${speed}s linear infinite` }}
        >
          {doubled.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-5 whitespace-nowrap text-foreground"
            >
              {item.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {item.category}
                </span>
              )}
              {item.icon && <span className="text-base leading-none">{item.icon}</span>}
              <span className="text-[13px] font-medium">{item.text}</span>
              <span className="ml-3 text-border text-xs">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
