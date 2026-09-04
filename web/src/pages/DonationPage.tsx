import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Smartphone, CheckCircle2, Users, Zap, Droplets, Copy, Check,
  ExternalLink, QrCode, Sparkles, ArrowRight, ShieldCheck, PhoneCall,
  PartyPopper, Server, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Link, Navigate } from "react-router-dom";
import { useSiteSetting } from "@/hooks/useSiteSetting";
import confetti from "canvas-confetti";
import { toast } from "sonner";

const TIERS = [
  { amount: 500, label: "Soutien", impact: "Finance 5 alertes SMS pour les familles en coupure", popular: false },
  { amount: 1000, label: "Citoyen", impact: "Couvre les frais d'hébergement serveur pour 1 quartier pendant 1 mois", popular: false },
  { amount: 2500, label: "Engagé", impact: "Permet l'impression de 50 affiches de quartier PADA avec QR Code", popular: true },
  { amount: 5000, label: "Champion", impact: "Couverture data & cartographie d'une commune entière", popular: false },
  { amount: 10000, label: "Mécène", impact: "Soutien d'infrastructure majeur et serveur temps réel haute vélocité", popular: false },
];

const OFFICIAL_DONATION_NUMBER = "+225 07 47 00 12 12"; // Numéro associatif de réception Mobile Money

interface MobileMoneyConfig {
  id: string;
  name: string;
  shortName: string;
  color: string;
  badgeBg: string;
  ussdPrefix: string;
  waveSupported: boolean;
  instructions: string;
}

const OPERATORS: Record<string, MobileMoneyConfig> = {
  wave: {
    id: "wave",
    name: "Wave Côte d'Ivoire",
    shortName: "Wave",
    color: "#1BA3E2",
    badgeBg: "bg-[#1BA3E2]/15 border-[#1BA3E2]/40 text-[#1BA3E2]",
    ussdPrefix: "",
    waveSupported: true,
    instructions: "Ouvrez l'application Wave et envoyez votre contribution sans frais de transfert.",
  },
  orange: {
    id: "orange",
    name: "Orange Money",
    shortName: "Orange",
    color: "#FF7900",
    badgeBg: "bg-[#FF7900]/15 border-[#FF7900]/40 text-[#FF7900]",
    ussdPrefix: "*144*1*1*",
    waveSupported: false,
    instructions: "Composez le code USSD #144# ou transférez via l'application Orange Money CI.",
  },
  mtn: {
    id: "mtn",
    name: "MTN MoMo",
    shortName: "MTN",
    color: "#FFCC00",
    badgeBg: "bg-[#FFCC00]/15 border-[#FFCC00]/40 text-[#b58b00] dark:text-[#FFCC00]",
    ussdPrefix: "*133*1*",
    waveSupported: false,
    instructions: "Composez *133# et sélectionnez Transfert d'argent vers le numéro du compte.",
  },
  moov: {
    id: "moov",
    name: "Moov Money",
    shortName: "Moov",
    color: "#006699",
    badgeBg: "bg-[#006699]/15 border-[#006699]/40 text-[#006699]",
    ussdPrefix: "*155*1*",
    waveSupported: false,
    instructions: "Composez *155# et confirmez avec votre code secret Moov Money.",
  },
};

const DonationPage = () => {
  const [selectedTier, setSelectedTier] = useState(2);
  const [copied, setCopied] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<string>("wave");
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const { data: donationsEnabled, isLoading } = useSiteSetting("donations_enabled");

  // Objectif mensuel participatif (Exemple réaliste de coûts d'infrastructure SIGNA)
  const monthlyGoal = 150000;
  const currentRaised = 97500;
  const progressPercent = Math.min(Math.round((currentRaised / monthlyGoal) * 100), 100);
  const contributorsCount = 38;

  const currentAmount = customAmount && parseInt(customAmount, 10) > 0
    ? parseInt(customAmount, 10)
    : TIERS[selectedTier].amount;

  const handleCopy = () => {
    navigator.clipboard.writeText(OFFICIAL_DONATION_NUMBER.replace(/\s/g, ""));
    setCopied(true);
    toast.success("Numéro de transfert copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2500);
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    setShowThankYouModal(true);
  };

  if (!isLoading && !donationsEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background pt-12 pb-16">
        <div className="container max-w-4xl text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider"
          >
            <Heart className="h-3.5 w-3.5 fill-current" />
            Financement Citoyen &amp; 100% Indépendant
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight"
          >
            Gardons <span className="text-amber-500">SIGNA</span><span className="text-sky-500">.ci</span> gratuit, public et sans publicité
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground leading-relaxed"
          >
            SIGNA.ci ne dépend d'aucun opérateur privé ni parti politique. Chaque don finance directement les serveurs en temps réel, l'adressage PADA des quartiers et l'envoi d'alertes d'urgence.
          </motion.p>
        </div>
      </section>

      {/* 🎯 Jauge d'Objectif Mensuel Participative */}
      <section className="container max-w-4xl -mt-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Objectif Serveurs &amp; Open Data · Septembre 2026
              </p>
              <h2 className="text-xl sm:text-2xl font-black text-foreground mt-0.5">
                {currentRaised.toLocaleString("fr-FR")} FCFA <span className="text-sm font-medium text-muted-foreground">/ {monthlyGoal.toLocaleString("fr-FR")} FCFA</span>
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
              <Users className="h-4 w-4" />
              <span>{contributorsCount} donateurs engagés ce mois-ci</span>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="w-full h-3.5 rounded-full bg-muted overflow-hidden p-0.5 border border-border">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
            <span>{progressPercent}% de l'infrastructure garantie</span>
            <span>Reste {(monthlyGoal - currentRaised).toLocaleString("fr-FR")} FCFA pour clore le budget</span>
          </div>
        </motion.div>
      </section>

      {/* 💳 Paliers de don */}
      <section className="container max-w-5xl mb-12">
        <div className="text-center space-y-1 mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Choisissez votre palier de contribution
          </h2>
          <p className="text-xs text-muted-foreground">
            Montant en FCFA · Paiement sécurisé direct sur votre téléphone
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.amount}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                type="button"
                onClick={() => { setSelectedTier(i); setCustomAmount(""); }}
                className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 flex flex-col justify-between h-full ${
                  selectedTier === i && !customAmount
                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      {tier.label}
                    </span>
                    {tier.popular && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold">
                        ⭐ Populaire
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-foreground">
                    {tier.amount.toLocaleString("fr-FR")}
                    <span className="text-xs font-normal text-muted-foreground ml-1">FCFA</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground leading-snug">
                    {tier.impact}
                  </p>
                </div>
                <div className={`mt-4 h-1.5 w-full rounded-full ${
                  selectedTier === i && !customAmount ? "bg-primary" : "bg-muted"
                }`} />
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 📱 Module de Paiement Mobile Money & Wave */}
      <section className="container max-w-3xl mb-16">
        <div className="rounded-3xl border-2 border-primary/30 bg-card p-6 sm:p-8 shadow-md space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-primary">
              Moyen de Règlement Sécurisé
            </span>
            <h3 className="font-display text-2xl font-extrabold text-foreground">
              Régler votre don de <span className="text-primary">{currentAmount.toLocaleString("fr-FR")} FCFA</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Sans frais supplémentaires · 100% reversé à l'infrastructure SIGNA.ci
            </p>
          </div>

          {/* Onglets des Opérateurs */}
          <Tabs value={activePaymentMethod} onValueChange={setActivePaymentMethod} className="w-full">
            <TabsList className="grid grid-cols-4 h-12 p-1 rounded-2xl bg-muted/70">
              <TabsTrigger value="wave" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#1BA3E2] data-[state=active]:text-white">
                Wave
              </TabsTrigger>
              <TabsTrigger value="orange" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#FF7900] data-[state=active]:text-white">
                Orange
              </TabsTrigger>
              <TabsTrigger value="mtn" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#FFCC00] data-[state=active]:text-slate-950">
                MTN MoMo
              </TabsTrigger>
              <TabsTrigger value="moov" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#006699] data-[state=active]:text-white">
                Moov
              </TabsTrigger>
            </TabsList>

            {/* Contenu WAVE (1-clic direct) */}
            <TabsContent value="wave" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-[#1BA3E2]/30 bg-[#1BA3E2]/5 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#1BA3E2] text-white flex items-center justify-center font-black text-sm">
                      W
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Payer directement avec Wave</p>
                      <p className="text-[11px] text-muted-foreground">Ouverture instantanée de l'application</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1BA3E2]">0% frais</span>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://pay.wave.com/m/M_ci_signa_public?amount=${currentAmount}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-12 rounded-xl bg-[#1BA3E2] hover:bg-[#158ec5] text-white font-extrabold text-xs shadow flex items-center justify-center gap-2"
                  >
                    <Smartphone className="h-4 w-4" />
                    Ouvrir l'application Wave ({currentAmount.toLocaleString("fr-FR")} FCFA)
                  </a>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="h-12 px-4 rounded-xl text-xs font-bold gap-2">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copié" : "Copier le numéro"}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Contenu ORANGE MONEY (*144#) */}
            <TabsContent value="orange" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-[#FF7900]/30 bg-[#FF7900]/5 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#FF7900] text-white flex items-center justify-center font-black text-sm">
                      OM
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Orange Money Côte d'Ivoire</p>
                      <p className="text-[11px] text-muted-foreground">Composer le code USSD rapide</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#FF7900]">#144#</span>
                </div>

                <div className="rounded-xl bg-background p-3 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Numéro bénéficiaire</p>
                    <p className="font-mono font-black text-sm text-foreground">{OFFICIAL_DONATION_NUMBER}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleCopy} className="text-xs font-bold">
                    {copied ? "Copié ✓" : "Copier"}
                  </Button>
                </div>

                <div className="pt-1 flex gap-3">
                  <a
                    href="tel:*144#"
                    className="flex-1 h-12 rounded-xl bg-[#FF7900] hover:bg-[#e06b00] text-white font-extrabold text-xs shadow flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Composer *144# sur mon téléphone
                  </a>
                </div>
              </div>
            </TabsContent>

            {/* Contenu MTN MOMO (*133#) */}
            <TabsContent value="mtn" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-[#FFCC00]/40 bg-[#FFCC00]/10 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#FFCC00] text-slate-950 flex items-center justify-center font-black text-sm">
                      M
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">MTN Mobile Money</p>
                      <p className="text-[11px] text-muted-foreground">Composer *133# et transférer</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">*133#</span>
                </div>

                <div className="rounded-xl bg-background p-3 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Numéro bénéficiaire</p>
                    <p className="font-mono font-black text-sm text-foreground">{OFFICIAL_DONATION_NUMBER}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleCopy} className="text-xs font-bold">
                    {copied ? "Copié ✓" : "Copier"}
                  </Button>
                </div>

                <div className="pt-1">
                  <a
                    href="tel:*133#"
                    className="w-full h-12 rounded-xl bg-[#FFCC00] hover:bg-[#e6b800] text-slate-950 font-extrabold text-xs shadow flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Composer *133# sur mon téléphone
                  </a>
                </div>
              </div>
            </TabsContent>

            {/* Contenu MOOV MONEY (*155#) */}
            <TabsContent value="moov" className="pt-4 space-y-4">
              <div className="rounded-2xl border border-[#006699]/30 bg-[#006699]/5 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-[#006699] text-white flex items-center justify-center font-black text-sm">
                      MM
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Moov Money Côte d'Ivoire</p>
                      <p className="text-[11px] text-muted-foreground">Composer *155# pour confirmer</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#006699]">*155#</span>
                </div>

                <div className="rounded-xl bg-background p-3 border border-border flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Numéro bénéficiaire</p>
                    <p className="font-mono font-black text-sm text-foreground">{OFFICIAL_DONATION_NUMBER}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleCopy} className="text-xs font-bold">
                    {copied ? "Copié ✓" : "Copier"}
                  </Button>
                </div>

                <div className="pt-1">
                  <a
                    href="tel:*155#"
                    className="w-full h-12 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-extrabold text-xs shadow flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Composer *155# sur mon téléphone
                  </a>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Bouton de confirmation citoyenne */}
          <div className="pt-2 text-center border-t border-border">
            <Button
              onClick={triggerCelebration}
              variant="outline"
              size="sm"
              className="rounded-full px-6 text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 gap-1.5"
            >
              <PartyPopper className="h-4 w-4 text-emerald-600" />
              J'ai envoyé ma contribution !
            </Button>
          </div>
        </div>
      </section>

      {/* Dialog Remerciement & Confetti */}
      <Dialog open={showThankYouModal} onOpenChange={setShowThankYouModal}>
        <DialogContent className="max-w-md rounded-3xl p-6 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-sm">
            <PartyPopper className="h-8 w-8" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-black text-foreground text-center">
              Un immense MERCI ! 🇨🇮
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed text-center pt-2">
              Votre geste citoyen permet de maintenir le service en ligne pour tout le Grand Abidjan et de donner de la voix aux familles privées d'eau ou d'électricité.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-muted/40 border border-border text-left space-y-2 text-xs">
            <div className="flex items-center gap-2 text-foreground font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Transparence garantie</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Votre don sera consolidé dans le rapport financier public accessible sur notre page Transparence.
            </p>
          </div>

          <Button
            onClick={() => setShowThankYouModal(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl"
          >
            Fermer et continuer
          </Button>
        </DialogContent>
      </Dialog>

      {/* Section : Où va votre argent ? */}
      <section className="bg-muted/40 py-12 border-t border-border">
        <div className="container max-w-4xl space-y-8">
          <div className="text-center space-y-1">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Transparence totale : Où va chaque franc ?
            </h2>
            <p className="text-xs text-muted-foreground">
              SIGNA.ci publie l'intégralité de ses métriques et dépenses en Open Data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                <Server className="h-4 w-4" />
              </div>
              <p className="font-bold text-sm text-foreground">50% · Serveurs &amp; Temps Réel</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hébergement PostgreSQL, synchronisation Supabase en temps réel et bande passante pour la carte OpenStreetMap.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-500">
                <Globe className="h-4 w-4" />
              </div>
              <p className="font-bold text-sm text-foreground">30% · Affiches PADA de Quartier</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Impression de kits citoyens et QR codes d'immeubles pour les syndics et marchés populaires d'Abidjan.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-2xs space-y-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="font-bold text-sm text-foreground">20% · Alertes &amp; SMS d'Urgence</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Passerelles de diffusion WhatsApp et alertes automatisées aux mairies et brigades de voirie.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DonationPage;
