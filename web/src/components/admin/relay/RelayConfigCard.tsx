import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FlaskConical, Save, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

      <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Label className="text-xs font-semibold flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-primary" /> Clé API Resend (Resend.com)
          </Label>
          <div className="relative mt-1">
            <Input
              type={showApiKey ? "text" : "password"}
              value={resendApiKeyInput}
              onChange={(e) => setResendApiKeyInput(e.target.value)}
              placeholder="re_123456789..."
              className="text-xs pr-8 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-1.5 font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Enregistrement..." : "Sauvegarder la configuration"}
        </Button>
      </div>
    </div>
  );
};

export default RelayConfigCard;
