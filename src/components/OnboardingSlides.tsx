import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "signa_onboarding_done";

const slides = [
  {
    id: 0,
    title: "La voix de votre quartier",
    subtitle:
      "Signalez les pannes d'eau, d'électricité et les problèmes urbains en quelques secondes. Vos voisins et les opérateurs vous entendent.",
    illustration: (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px]">
        <rect x="20" y="20" width="160" height="120" rx="16" fill="hsl(var(--primary) / 0.08)" />
        <line x1="20" y1="80" x2="180" y2="80" stroke="hsl(var(--primary) / 0.15)" strokeWidth="2" />
        <line x1="100" y1="20" x2="100" y2="140" stroke="hsl(var(--primary) / 0.15)" strokeWidth="2" />
        <rect x="35" y="35" width="45" height="35" rx="6" fill="hsl(var(--primary) / 0.12)" />
        <rect x="120" y="35" width="45" height="35" rx="6" fill="hsl(var(--primary) / 0.12)" />
        <rect x="35" y="90" width="45" height="35" rx="6" fill="hsl(var(--primary) / 0.12)" />
        <rect x="120" y="90" width="45" height="35" rx="6" fill="hsl(var(--primary) / 0.12)" />
        <circle cx="100" cy="66" r="18" fill="hsl(var(--primary))" opacity="0.15" />
        <circle cx="100" cy="63" r="11" fill="hsl(var(--primary))" />
        <path d="M100 74 L100 88" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="63" r="4.5" fill="white" />
        <path d="M88 56 Q85 59 85 63 Q85 67 88 70" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M112 56 Q115 59 115 63 Q115 67 112 70" stroke="hsl(var(--primary))" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M82 50 Q77 55 77 63 Q77 71 82 76" stroke="hsl(var(--primary))" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.4" />
        <path d="M118 50 Q123 55 123 63 Q123 71 118 76" stroke="hsl(var(--primary))" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 1,
    title: "Simple comme bonjour",
    subtitle:
      "Choisissez le type de panne, prenez une photo, activez votre GPS. Votre signalement est transmis en moins de 30 secondes.",
    illustration: (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px]">
        <rect x="68" y="15" width="64" height="110" rx="12" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.25)" strokeWidth="2" />
        <rect x="74" y="24" width="52" height="72" rx="6" fill="hsl(var(--primary) / 0.06)" />
        <circle cx="100" cy="60" r="16" fill="hsl(var(--primary))" opacity="0.15" />
        <circle cx="100" cy="60" r="10" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
        <circle cx="100" cy="60" r="5" fill="hsl(var(--primary))" />
        <rect x="94" y="47" width="12" height="5" rx="2.5" fill="hsl(var(--primary))" opacity="0.5" />
        <circle cx="145" cy="35" r="12" fill="hsl(150 60% 40%)" />
        <path d="M140 35 L143 38 L150 31" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="55" cy="70" r="12" fill="hsl(150 60% 40%)" />
        <path d="M50 70 L53 73 L60 66" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="100" cy="108" r="5" fill="hsl(var(--primary))" />
        <circle cx="100" cy="108" r="9" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.4" />
        <circle cx="100" cy="108" r="13" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.2" />
        <rect x="88" y="128" width="24" height="4" rx="2" fill="hsl(var(--primary) / 0.3)" />
      </svg>
    ),
  },
  {
    id: 2,
    title: "Plus forts ensemble",
    subtitle:
      "Vos voisins soutiennent votre signalement. Plus de voix = plus de pression sur les opérateurs pour une réparation rapide.",
    illustration: (
      <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[200px]">
        <circle cx="100" cy="65" r="18" fill="hsl(var(--primary))" opacity="0.2" />
        <circle cx="100" cy="56" r="9" fill="hsl(var(--primary))" />
        <path d="M84 80 Q84 72 100 72 Q116 72 116 80" fill="hsl(var(--primary))" />
        <circle cx="55" cy="72" r="14" fill="hsl(var(--primary))" opacity="0.1" />
        <circle cx="55" cy="65" r="7" fill="hsl(var(--primary))" opacity="0.7" />
        <path d="M43 82 Q43 76 55 76 Q67 76 67 82" fill="hsl(var(--primary))" opacity="0.7" />
        <circle cx="145" cy="72" r="14" fill="hsl(var(--primary))" opacity="0.1" />
        <circle cx="145" cy="65" r="7" fill="hsl(var(--primary))" opacity="0.7" />
        <path d="M133 82 Q133 76 145 76 Q157 76 157 82" fill="hsl(var(--primary))" opacity="0.7" />
        <line x1="70" y1="72" x2="84" y2="72" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
        <line x1="116" y1="72" x2="130" y2="72" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
        <circle cx="100" cy="112" r="16" fill="hsl(var(--primary))" opacity="0.12" />
        <text x="100" y="118" textAnchor="middle" fontSize="16">👍</text>
        <rect x="72" y="132" width="56" height="16" rx="8" fill="hsl(var(--primary))" opacity="0.15" />
        <text x="100" y="143" textAnchor="middle" fontSize="9" fill="hsl(var(--primary))" fontFamily="Inter, sans-serif" fontWeight="600">+127 voisins actifs</text>
      </svg>
    ),
  },
];

export default function OnboardingSlides() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) return;
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const next = () => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent((c) => c + 1);
    }
  };

  const goToSignup = () => {
    dismiss();
    navigate("/auth");
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop — léger, non bloquant au clic */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px]"
            onClick={dismiss}
          />

          {/* Modal centré, toujours dans le viewport */}
          <motion.div
            key="modal"
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed z-[100] inset-x-4 top-1/2 -translate-y-1/2 mx-auto w-full max-w-sm rounded-3xl bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermer — grand, visible, coin supérieur droit */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Illustration */}
            <div className="flex items-center justify-center pt-10 pb-4 px-8 bg-gradient-to-b from-primary/6 to-transparent min-h-[180px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slide.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -direction * 40 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="flex items-center justify-center"
                >
                  {slide.illustration}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Texte */}
            <div className="px-6 pt-2 pb-6 text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-text"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-bold text-foreground mb-2">{slide.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{slide.subtitle}</p>
                </motion.div>
              </AnimatePresence>

              {/* Dots de progression */}
              <div className="flex items-center justify-center gap-2 mt-5 mb-5">
                {slides.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ width: i === current ? 24 : 8, opacity: i === current ? 1 : 0.3 }}
                    transition={{ duration: 0.25 }}
                    className="h-2 rounded-full bg-primary"
                  />
                ))}
              </div>

              {/* Boutons principaux */}
              {isLast ? (
                <div className="flex flex-col gap-2">
                  <Button className="w-full rounded-xl py-5 text-sm font-semibold" onClick={goToSignup}>
                    Créer mon compte gratuit →
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl py-5 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/5"
                    onClick={dismiss}
                  >
                    Accéder à l'application
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button className="w-full rounded-xl py-5 text-sm font-semibold" onClick={next}>
                    Suivant →
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl py-4 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/5"
                    onClick={dismiss}
                  >
                    Accéder à l'application
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
