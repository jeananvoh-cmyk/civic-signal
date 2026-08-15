import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlipDigitProps {
  digit: string;
  delay?: number;
}

const FlipDigit = ({ digit, delay = 0 }: FlipDigitProps) => {
  return (
    <div className="relative h-[1.2em] w-[0.7em] overflow-hidden">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          initial={{ rotateX: -90, opacity: 0, y: "-50%" }}
          animate={{ rotateX: 0, opacity: 1, y: "0%" }}
          exit={{ rotateX: 90, opacity: 0, y: "50%" }}
          transition={{
            duration: 0.5,
            delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

interface FlipCounterProps {
  value: number;
  className?: string;
  suffix?: string;
  animate?: boolean;
}

const FlipCounter = ({ value, className = "", suffix = "", animate = true }: FlipCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [glowing, setGlowing] = useState(false);
  const prevValue = useRef(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(value);
      return;
    }

    // On first render, count up from 0
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      const duration = 1200;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      prevValue.current = value;
      return () => clearInterval(timer);
    }

    // On subsequent updates, flip directly + trigger glow
    if (value !== prevValue.current) {
      setGlowing(true);
      setTimeout(() => setGlowing(false), 1200);
    }
    setDisplayValue(value);
    prevValue.current = value;
  }, [value, animate]);

  const digits = String(displayValue).split("");

  return (
    <span className={`inline-flex items-center gap-[1px] ${className}`}>
      <motion.span
        animate={glowing ? {
          boxShadow: [
            "0 0 0px 0px hsla(40,95%,50%,0)",
            "0 0 20px 6px hsla(40,95%,50%,0.6)",
            "0 0 40px 12px hsla(40,95%,50%,0.3)",
            "0 0 20px 6px hsla(40,95%,50%,0.5)",
            "0 0 0px 0px hsla(40,95%,50%,0)",
          ],
          scale: [1, 1.08, 1.04, 1.06, 1],
        } : {
          boxShadow: "0 0 0px 0px hsla(40,95%,50%,0)",
          scale: 1,
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="inline-flex items-center rounded-lg bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      >
        {digits.map((digit, i) => (
          <FlipDigit key={`${i}-${digits.length}`} digit={digit} delay={i * 0.04} />
        ))}
      </motion.span>
      {suffix && <span className="ml-1 text-[0.5em] font-medium opacity-60">{suffix}</span>}
    </span>
  );
};

export default FlipCounter;
