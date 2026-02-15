import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Smartphone, CheckCircle2, Users, Zap, Droplets, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { Link } from "react-router-dom";

const TIERS = [
  { amount: 500, label: "Soutien", impact: "1 signalement supplémentaire pour la communauté", popular: false },
  { amount: 1000, label: "Citoyen", impact: "5 signalements + couverture d'un quartier", popular: false },
  { amount: 2500, label: "Engagé", impact: "15 signalements + alerte pour 3 quartiers", popular: true },
  { amount: 5000, label: "Champion", impact: "50 signalements + couverture d'une commune entière", popular: false },
  { amount: 10000, label: "Ambassadeur", impact: "Couverture illimitée d'une commune pendant 1 mois", popular: false },
];

const MOBILE_MONEY_OPTIONS = [
  { name: "Orange Money", code: "*144#", color: "hsl(25, 95%, 53%)" },
  { name: "MTN MoMo", code: "*133#", color: "hsl(48, 96%, 50%)" },
  { name: "Moov Money", code: "*155#", color: "hsl(210, 80%, 50%)" },
  { name: "Wave", code: "App Wave", color: "hsl(192, 80%, 45%)" },
];

const PHONE_NUMBER = "+225 07 00 00 00 00";

const DonationPage = () => {
  const [selectedTier, setSelectedTier] = useState(2);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PHONE_NUMBER.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="container relative py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-3xl font-extrabold text-white md:text-5xl">
              Soutenez <span className="text-electricity">Signal</span><span className="text-water-light">Énergie</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
              Chaque don permet d'augmenter la capacité de signalements et d'étendre la couverture
              à plus de quartiers et communes d'Abidjan.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Impact stats */}
      <section className="container -mt-8 relative z-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[
            { icon: Users, label: "Utilisateurs actifs", value: "500+", color: "text-primary" },
            { icon: Zap, label: "Signalements traités", value: "1 200+", color: "text-electricity" },
            { icon: Droplets, label: "Quartiers couverts", value: "25+", color: "text-water" },
            { icon: CheckCircle2, label: "Coupures résolues", value: "800+", color: "text-success" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="text-center">
                <CardContent className="p-4">
                  <stat.icon className={`mx-auto h-6 w-6 ${stat.color}`} />
                  <p className="mt-2 text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="container py-12">
        <h2 className="text-center font-display text-2xl font-bold text-foreground md:text-3xl">
          Choisissez votre palier de don
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
          Tous les montants sont en FCFA. Chaque franc compte pour améliorer la vie des communautés.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.amount}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTier === i
                    ? "ring-2 ring-primary shadow-lg scale-[1.02]"
                    : "hover:scale-[1.01]"
                } ${tier.popular ? "border-primary" : ""}`}
                onClick={() => setSelectedTier(i)}
              >
                {tier.popular && (
                  <div className="bg-primary text-primary-foreground text-center text-xs font-bold py-1 rounded-t-lg">
                    ⭐ Le plus choisi
                  </div>
                )}
                <CardContent className={`p-5 ${tier.popular ? "pt-3" : ""}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {tier.label}
                  </p>
                  <p className="mt-2 font-display text-3xl font-extrabold text-foreground">
                    {tier.amount.toLocaleString("fr-FR")}
                    <span className="ml-1 text-sm font-medium text-muted-foreground">FCFA</span>
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground leading-snug">
                    {tier.impact}
                  </p>
                  <div className={`mt-4 h-1 w-full rounded-full ${
                    selectedTier === i ? "bg-primary" : "bg-muted"
                  }`} />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mobile Money instructions */}
      <section className="bg-muted/50 py-12">
        <div className="container max-w-2xl">
          <h2 className="text-center font-display text-2xl font-bold text-foreground">
            <Smartphone className="mr-2 inline h-6 w-6" />
            Payer par Mobile Money
          </h2>
          <p className="mx-auto mt-2 text-center text-sm text-muted-foreground">
            Envoyez <span className="font-bold text-foreground">{TIERS[selectedTier].amount.toLocaleString("fr-FR")} FCFA</span> via votre opérateur préféré
          </p>

          {/* Phone number to send to */}
          <Card className="mt-6">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">Numéro du bénéficiaire</p>
                <p className="font-display text-lg font-bold text-foreground tracking-wider">{PHONE_NUMBER}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </CardContent>
          </Card>

          {/* Operators */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {MOBILE_MONEY_OPTIONS.map((option) => (
              <Card key={option.name} className="transition-all hover:shadow-md">
                <CardContent className="p-4 text-center">
                  <div
                    className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: option.color + "20" }}
                  >
                    <Smartphone className="h-5 w-5" style={{ color: option.color }} />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{option.name}</p>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">{option.code}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Steps */}
          <Card className="mt-6">
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground mb-3">Comment effectuer votre don :</h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                {[
                  "Composez le code USSD de votre opérateur ou ouvrez l'application",
                  "Choisissez « Transfert d'argent »",
                  `Entrez le numéro : ${PHONE_NUMBER}`,
                  `Saisissez le montant : ${TIERS[selectedTier].amount.toLocaleString("fr-FR")} FCFA`,
                  "Confirmez avec votre code PIN",
                  "Vous recevrez une confirmation par SMS 🎉",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            En cas de difficulté, contactez-nous à{" "}
            <a href="mailto:support@signalenergie.ci" className="text-primary underline">
              support@signalenergie.ci
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-12 text-center">
        <h2 className="font-display text-xl font-bold text-foreground">
          Pas encore inscrit ?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Rejoignez la communauté et commencez à signaler les coupures dans votre quartier.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button asChild>
            <Link to="/auth">S'inscrire gratuitement</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/a-propos">En savoir plus</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default DonationPage;
