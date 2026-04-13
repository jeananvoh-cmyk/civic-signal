import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, ArrowRight, Zap, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";

const STORAGE_KEY = "signa_onboarding_done";
const LAST_SHOWN_KEY = "signa_onboarding_last";
const SHOW_COUNT_KEY = "signa_onboarding_count";

/**
 * Stratégie d'affichage pour visiteurs non connectés :
 *
 * Affichage 1 — 3s après la 1ère visite (découverte)
 * Affichage 2 — au retour sur le site après 24h (rappel léger)
 * Affichage 3 — au retour après 72h (dernière chance)
 * Ensuite    — plus jamais (STORAGE_KEY = "done" posé)
 *
 * Si l'utilisateur clique "Accéder à l'application" (dismiss sans s'inscrire),
 * on planifie le prochain affichage selon la règle ci-dessus.
 */
function shouldShow(): boolean {
  const done = localStorage.getItem(STORAGE_KEY);
  if (done) return false;

  const count = parseInt(localStorage.getItem(SHOW_COUNT_KEY) || "0", 10);
  const lastShown = parseInt(localStorage.getItem(LAST_SHOWN_KEY) || "0", 10);
  const now = Date.now();

  // 1ère fois : montrer après 3s (géré par le setTimeout dans useEffect)
  if (count === 0) return true;

  // 2ème fois : au retour après 24h
  if (count === 1 && now - lastShown >= 24 * 60 * 60 * 1000) return true;

  // 3ème fois : au retour après 72h
  if (count === 2 && now - lastShown >= 72 * 60 * 60 * 1000) return true;

  // 4ème passage : on arrête définitivement
  if (count >= 3) {
    localStorage.setItem(STORAGE_KEY, "1");
    return false;
  }

  return false;
}

function recordShown() {
  const count = parseInt(localStorage.getItem(SHOW_COUNT_KEY) || "0", 10);
  localStorage.setItem(SHOW_COUNT_KEY, String(count + 1));
  localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
}

/* ─── Slides ──────────────────────────────────────────────────────────────── */
const slides = [
  {
    id: 0,
    gradient: ["#3B82F6", "#6366F1"],          // bleu → violet
    bgFrom: "from-blue-500/[0.15]",
    bgTo: "to-violet-500/[0.08]",
    chip: { icon: <span className="text-xs">📍</span>, label: "Abidjan & communes pilotes" },
    title: "La voix de votre quartier",
    subtitle: "Signalez les coupures d'eau, d'électricité et les problèmes urbains en quelques secondes.",
    illustration: (
      <svg viewBox="0 0 260 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Map background */}
        <rect x="10" y="10" width="240" height="200" rx="20" fill="url(#g1)" />
        <defs>
          <radialGradient id="g1" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.06" />
          </radialGradient>
        </defs>
        {/* Grid lines */}
        <line x1="10" y1="110" x2="250" y2="110" stroke="#6366F1" strokeOpacity="0.12" strokeWidth="1.5" />
        <line x1="130" y1="10" x2="130" y2="210" stroke="#6366F1" strokeOpacity="0.12" strokeWidth="1.5" />
        {/* Blocks */}
        <rect x="28" y="28" width="82" height="66" rx="10" fill="#3B82F6" fillOpacity="0.1" />
        <rect x="150" y="28" width="82" height="66" rx="10" fill="#6366F1" fillOpacity="0.1" />
        <rect x="28" y="122" width="82" height="66" rx="10" fill="#6366F1" fillOpacity="0.1" />
        <rect x="150" y="122" width="82" height="66" rx="10" fill="#3B82F6" fillOpacity="0.1" />
        {/* Pin shadow */}
        <ellipse cx="130" cy="125" rx="14" ry="4" fill="#3B82F6" fillOpacity="0.2" />
        {/* Pin stem */}
        <path d="M130 120 L130 162" stroke="#3B82F6" strokeWidth="3.5" strokeLinecap="round" />
        {/* Pin outer ring pulse */}
        <circle cx="130" cy="96" r="32" fill="#3B82F6" fillOpacity="0.08" />
        <circle cx="130" cy="96" r="22" fill="#3B82F6" fillOpacity="0.12" />
        {/* Pin head */}
        <circle cx="130" cy="96" r="15" fill="#3B82F6" />
        <circle cx="130" cy="96" r="6.5" fill="white" />
        {/* Signal waves */}
        <path d="M113 80 Q108 85 108 96 Q108 107 113 112" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.6" />
        <path d="M147 80 Q152 85 152 96 Q152 107 147 112" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" fill="none" strokeOpacity="0.6" />
        <path d="M103 70 Q96 78 96 96 Q96 114 103 122" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.3" />
        <path d="M157 70 Q164 78 164 96 Q164 114 157 122" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeOpacity="0.3" />
      </svg>
    ),
  },
  {
    id: 1,
    gradient: ["#10B981", "#0EA5E9"],          // vert → cyan
    bgFrom: "from-emerald-500/[0.15]",
    bgTo: "to-cyan-500/[0.08]",
    chip: { icon: <Zap className="h-3 w-3 text-emerald-600" />, label: "Rapide & facile" },
    title: "Simple comme bonjour",
    subtitle: "Choisissez le type de signalement, prenez une photo, activez le GPS. Votre signalement est transmis en quelques secondes.",
    illustration: (
      <svg viewBox="0 0 260 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <radialGradient id="g2" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <rect x="10" y="10" width="240" height="200" rx="20" fill="url(#g2)" />
        {/* Phone */}
        <rect x="90" y="20" width="80" height="140" rx="16" fill="white" fillOpacity="0.9" stroke="#10B981" strokeWidth="2" strokeOpacity="0.4" />
        <rect x="97" y="30" width="66" height="90" rx="8" fill="#10B981" fillOpacity="0.08" />
        {/* Step 1 checkmark */}
        <rect x="28" y="50" width="48" height="30" rx="8" fill="#10B981" fillOpacity="0.15" />
        <circle cx="38" cy="65" r="9" fill="#10B981" />
        <path d="M34 65 L37 68 L43 61" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="52" y="60" width="20" height="3" rx="1.5" fill="#10B981" fillOpacity="0.5" />
        <rect x="52" y="66" width="14" height="2.5" rx="1.25" fill="#10B981" fillOpacity="0.3" />
        {/* Step 2 checkmark */}
        <rect x="184" y="90" width="48" height="30" rx="8" fill="#10B981" fillOpacity="0.15" />
        <circle cx="194" cy="105" r="9" fill="#10B981" />
        <path d="M190 105 L193 108 L199 101" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="208" y="100" width="20" height="3" rx="1.5" fill="#10B981" fillOpacity="0.5" />
        <rect x="208" y="106" width="14" height="2.5" rx="1.25" fill="#10B981" fillOpacity="0.3" />
        {/* Camera icon inside phone */}
        <circle cx="130" cy="76" r="18" fill="#10B981" fillOpacity="0.15" />
        <circle cx="130" cy="76" r="11" stroke="#10B981" strokeWidth="2" fill="none" />
        <circle cx="130" cy="76" r="5.5" fill="#10B981" />
        <rect x="124" y="63" width="12" height="5" rx="2.5" fill="#10B981" fillOpacity="0.6" />
        {/* GPS dot */}
        <circle cx="130" cy="128" r="6" fill="#0EA5E9" />
        <circle cx="130" cy="128" r="11" stroke="#0EA5E9" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
        <circle cx="130" cy="128" r="16" stroke="#0EA5E9" strokeWidth="1" strokeOpacity="0.2" fill="none" />
        {/* Connector lines */}
        <path d="M76 65 Q90 65 90 65" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.5" />
        <path d="M170 105 Q184 105 184 105" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 2" strokeOpacity="0.5" />
        {/* Home button */}
        <rect x="115" y="148" width="30" height="5" rx="2.5" fill="#10B981" fillOpacity="0.3" />
      </svg>
    ),
  },
  {
    id: 2,
    gradient: ["#F59E0B", "#EF4444"],          // amber → rouge
    bgFrom: "from-amber-400/[0.15]",
    bgTo: "to-orange-500/[0.08]",
    chip: { icon: <Users className="h-3 w-3 text-amber-600" />, label: "Ensemble, on est entendus" },
    title: "Plus forts ensemble",
    subtitle: "Vos voisins confirment vos signalements. Plus on est nombreux, plus les opérateurs et les autorités réagissent.",
    illustration: (
      <svg viewBox="0 0 260 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <radialGradient id="g3" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <rect x="10" y="10" width="240" height="200" rx="20" fill="url(#g3)" />
        {/* Central user */}
        <circle cx="130" cy="95" r="28" fill="#F59E0B" fillOpacity="0.15" />
        <circle cx="130" cy="80" r="16" fill="#F59E0B" />
        <path d="M106 112 Q106 98 130 98 Q154 98 154 112" fill="#F59E0B" />
        {/* Left user */}
        <circle cx="52" cy="100" r="20" fill="#F59E0B" fillOpacity="0.1" />
        <circle cx="52" cy="88" r="11" fill="#F59E0B" fillOpacity="0.7" />
        <path d="M34 108 Q34 100 52 100 Q70 100 70 108" fill="#F59E0B" fillOpacity="0.7" />
        {/* Right user */}
        <circle cx="208" cy="100" r="20" fill="#F59E0B" fillOpacity="0.1" />
        <circle cx="208" cy="88" r="11" fill="#F59E0B" fillOpacity="0.7" />
        <path d="M190 108 Q190 100 208 100 Q226 100 226 108" fill="#F59E0B" fillOpacity="0.7" />
        {/* Top user */}
        <circle cx="130" cy="32" r="16" fill="#F59E0B" fillOpacity="0.1" />
        <circle cx="130" cy="24" r="9" fill="#F59E0B" fillOpacity="0.7" />
        <path d="M116 38 Q116 33 130 33 Q144 33 144 38" fill="#F59E0B" fillOpacity="0.7" />
        {/* Connecting lines */}
        <line x1="72" y1="100" x2="106" y2="100" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="4 3" strokeOpacity="0.5" />
        <line x1="154" y1="100" x2="188" y2="100" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="4 3" strokeOpacity="0.5" />
        <line x1="130" y1="42" x2="130" y2="64" stroke="#F59E0B" strokeWidth="1.8" strokeDasharray="4 3" strokeOpacity="0.5" />
        {/* Thumbs up badge */}
        <circle cx="130" cy="152" r="22" fill="#F59E0B" fillOpacity="0.15" />
        <text x="130" y="160" textAnchor="middle" fontSize="22">👍</text>
        {/* Stat pill */}
        <rect x="82" y="185" width="96" height="22" rx="11" fill="#F59E0B" fillOpacity="0.2" />
        <text x="130" y="200" textAnchor="middle" fontSize="10" fill="#92400E" fontFamily="Inter, sans-serif" fontWeight="700">+127 voisins actifs ce mois</text>
      </svg>
    ),
  },
];

/* ─── Component ────────────────────────────────────────────────────────────── */
export default function OnboardingSlides() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (user) return;
    if (!shouldShow()) return;
    // 1ère visite : 3s de délai pour laisser la page se charger
    // Visites suivantes : 8s pour laisser l'utilisateur naviguer un peu
    const count = parseInt(localStorage.getItem(SHOW_COUNT_KEY) || "0", 10);
    const delay = count === 0 ? 3000 : 8000;
    const t = setTimeout(() => {
      setVisible(true);
      recordShown();
    }, delay);
    return () => clearTimeout(t);
  }, [user]);

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, current]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const goNext = () => {
    if (current < slides.length - 1) {
      setDirection(1);
      setCurrent((c) => c + 1);
    }
  };

  const goToSignup = () => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.75 },
      colors: ["#3B82F6", "#10B981", "#F59E0B", "#6366F1"],
    });
    setTimeout(() => {
      dismiss();
      navigate("/auth");
    }, 400);
  };

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (delta > 50) goNext();
    touchStartX.current = null;
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const progress = ((current + 1) / slides.length) * 100;

  // Portal sur document.body pour bypasser le translateY de PullToRefresh
  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop flouté */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />

          {/* Modal centré, taille raisonnable */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed z-[100] inset-x-4 top-1/2 -translate-y-1/2 mx-auto w-full max-w-[400px] rounded-3xl bg-card shadow-2xl overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Barre de progression */}
            <div className="h-1 bg-border w-full">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(to right, ${slide.gradient[0]}, ${slide.gradient[1]})` }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            {/* Header : passer + fermer */}
            <div className="flex items-center justify-between px-5 pt-4 pb-0">
              <button
                onClick={dismiss}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Passer
              </button>
              <button
                onClick={dismiss}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Illustration */}
            <div className={`flex items-center justify-center px-6 pt-3 pb-2 bg-gradient-to-b ${slide.bgFrom} ${slide.bgTo}`}
              style={{ height: 180 }}>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={slide.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 50, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -direction * 50, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="w-full max-w-[200px] mx-auto h-full"
                >
                  {slide.illustration}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Texte + actions */}
            <div className="px-5 pt-4 pb-6">
              {/* Chip */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-chip"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground mb-2.5"
                >
                  {slide.chip.icon}
                  {slide.chip.label}
                </motion.div>
              </AnimatePresence>

              {/* Titre + sous-titre */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id + "-text"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                >
                  <h2 className="text-xl font-extrabold text-foreground leading-tight mb-1.5">
                    {slide.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {slide.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Dots + hint navigation */}
              <div className="flex items-center gap-2 mt-4 mb-4">
                {slides.map((_, i) => (
                  <motion.button
                    key={i}
                    onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                    animate={{ width: i === current ? 24 : 7, opacity: i === current ? 1 : 0.3 }}
                    transition={{ duration: 0.22 }}
                    className="h-1.5 rounded-full"
                    style={{
                      background: i === current
                        ? `linear-gradient(to right, ${slide.gradient[0]}, ${slide.gradient[1]})`
                        : "hsl(var(--border))",
                    }}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
                <span className="ml-auto text-[10px] text-muted-foreground/40 select-none">
                  {current + 1} / {slides.length}
                </span>
              </div>

              {/* CTAs */}
              {isLast ? (
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full rounded-xl py-5 text-sm font-bold gap-2"
                    style={{ background: `linear-gradient(135deg, ${slide.gradient[0]}, ${slide.gradient[1]})` }}
                    onClick={goToSignup}
                  >
                    Créer mon compte gratuit
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <button
                    onClick={dismiss}
                    className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Continuer sans compte →
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full rounded-xl py-5 text-sm font-bold gap-2"
                    style={{ background: `linear-gradient(135deg, ${slide.gradient[0]}, ${slide.gradient[1]})` }}
                    onClick={goNext}
                  >
                    Suivant
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <button
                    onClick={dismiss}
                    className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Accéder à l'application →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
