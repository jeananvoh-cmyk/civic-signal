import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FlaskConical, Save, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RelayConfigCardProps {
  effectiveConfig: Record<string, string>;
  isTestMode: boolean;
  onToggleTestMode: (val: boolean) => void;
  onSaveConfig: (cfg: Record<string, string>) => void;
  isSaving: boolean;
}

export const RelayConfigCard: React.FC<RelayConfigCardProps> = ({
  effectiveConfig,
  isTestMode,
  onToggleTestMode,
  onSaveConfig,
  isSaving,
}) => {
  const [testEmail, setTestEmail] = React.useState(effectiveConfig?.test_email ?? "");
  const [emailCIE, setEmailCIE] = React.useState(effectiveConfig?.email_cie ?? "reclamation@cie.ci");
  const [emailSODECI, setEmailSODECI] = React.useState(effectiveConfig?.email_sodeci ?? "reclamation@sodeci.ci");
  const [emailANARE, setEmailANARE] = React.useState(effectiveConfig?.email_anare ?? "reclamation@anare.ci");
  const [emailONEP, setEmailONEP] = React.useState(effectiveConfig?.email_onep ?? "reclamation@onep.ci");
  const [ccEmail, setCcEmail] = React.useState(effectiveConfig?.cc_email ?? "");
  const [resendApiKeyInput, setResendApiKeyInput] = React.useState(effectiveConfig?.resend_api_key ?? "");
  const [showApiKey, setShowApiKey] = React.useState(false);

  const handleSave = () => {
    onSaveConfig({
      ...effectiveConfig,
      test_mode: isTestMode ? "true" : "false",
      test_email: testEmail.trim(),
      email_cie: emailCIE.trim(),
      email_sodeci: emailSODECI.trim(),
      email_anare: emailANARE.trim(),
      email_onep: emailONEP.trim(),
      cc_email: ccEmail.trim(),
      resend_api_key: resendApiKeyInput.trim(),
    });
  };

  const [isTestingKey, setIsTestingKey] = React.useState(false);

  const handleTestKey = async () => {
    setIsTestingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke("relay-to-operator", {
        body: {
          action: "test_resend_key",
          resend_api_key: resendApiKeyInput.trim() || undefined,
          to_email: testEmail.trim() || undefined,
        },
      });

      if (error || (data && !data.ok)) {
        const errMsg = error?.message || data?.error || "Échec du test de la clé Resend";
        toast.error(`Connexion Resend échouée : ${errMsg}`);
      } else {
        toast.success("✅ Clé API Resend valide ! Email de test envoyé avec succès.");
      }
    } catch (err: any) {
      toast.error(`Erreur test Resend : ${err?.message || "Erreur de connexion"}`);
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-500" />
            Configuration des Relais & Clés API
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gérez le mode TEST sécurisé, les adresses de destination et les identifiants d'envoi.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 px-3 py-1.5 rounded-xl border border-border/60">
          <Switch
            id="test-mode-toggle"
            checked={isTestMode}
            onCheckedChange={onToggleTestMode}
          />
          <Label htmlFor="test-mode-toggle" className="text-xs font-bold cursor-pointer">
            {isTestMode ? (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5" /> Mode TEST (Sécurisé)
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-black">
                <AlertTriangle className="h-3.5 w-3.5" /> Mode PRODUCTION
              </span>
            )}
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs font-semibold">Email de test (Mode TEST)</Label>
          <Input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="votre-email@exemple.com"
            className="text-xs mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">Email officiel CIE (Électricité)</Label>
          <Input
            value={emailCIE}
            onChange={(e) => setEmailCIE(e.target.value)}
            placeholder="reclamation@cie.ci"
            className="text-xs mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">Email officiel SODECI (Eau)</Label>
          <Input
            value={emailSODECI}
            onChange={(e) => setEmailSODECI(e.target.value)}
            placeholder="reclamation@sodeci.ci"
            className="text-xs mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">Email ANARE-CI (Régulateur Électricité)</Label>
          <Input
            value={emailANARE}
            onChange={(e) => setEmailANARE(e.target.value)}
            placeholder="reclamation@anare.ci"
            className="text-xs mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">Email ONEP (Régulateur Eau)</Label>
          <Input
            value={emailONEP}
            onChange={(e) => setEmailONEP(e.target.value)}
            placeholder="reclamation@onep.ci"
            className="text-xs mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-semibold">Email en Copie (CC)</Label>
          <Input
            value={ccEmail}
            onChange={(e) => setCcEmail(e.target.value)}
            placeholder="copie-admin@signa.ci"
            className="text-xs mt-1"
          />
        </div>
      </div>

      <div className="pt-3 border-t border-border/60 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Clé API Resend (`re_...`)
              <span className="text-[10px] text-muted-foreground font-normal ml-auto">Depuis resend.com/api-keys</span>
            </Label>

            {resendApiKeyInput ? (
              <div className="mt-1 flex items-center gap-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                <span className="font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Clé configurée :
                </span>
                <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[11px]">
                  re_••••••••{resendApiKeyInput.slice(-4)}
                </span>
              </div>
            ) : null}

            <div className="relative mt-1.5">
              <Input
                type={showApiKey ? "text" : "password"}
                value={resendApiKeyInput}
                onChange={(e) => setResendApiKeyInput(e.target.value)}
                placeholder="Saisissez ou modifiez votre clé re_123456..."
                className="text-xs pr-8 font-mono bg-background"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                title={showApiKey ? "Masquer la clé" : "Afficher la clé"}
              >
                {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestKey}
              disabled={isTestingKey}
              className="gap-1.5 text-xs font-semibold border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
            >
              <FlaskConical className="h-3.5 w-3.5 text-emerald-500" />
              {isTestingKey ? "Test en cours..." : "Tester la clé"}
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving ? "Enregistrement..." : "Sauvegarder"}
            </Button>
          </div>
        </div>

        {/* Note sur les bonnes pratiques de sécurité */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">🔒 Bonnes Pratiques de Sécurité Clé Resend :</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground/90 leading-relaxed">
            <li>
              <strong>Sécurité de stockage :</strong> La clé est protégée en base de données par Row Level Security (RLS) et accessible uniquement aux administrateurs identifiés.
            </li>
            <li>
              <strong>Recommandation Confinement 100% Serveur :</strong> Vous pouvez également ajouter la variable <code className="bg-muted px-1 py-0.5 rounded text-foreground font-mono">RESEND_API_KEY</code> dans <strong>Supabase Secrets / Vault</strong>. Si la variable système est présente, elle sera prioritaire et la clé ne transitera jamais dans le navigateur.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RelayConfigCard;
