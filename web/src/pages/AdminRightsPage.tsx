import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Plus, Trash2, Scale, Zap, Droplets, Lightbulb, BookOpen, Phone, Loader2, CheckCircle2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  useRightsContent,
  useUpdateRightsContent,
  RightsContent,
  RightsItem,
  ResourceLink,
  EmergencyContact,
  DEFAULT_RIGHTS_CONTENT,
} from "@/hooks/useRightsContent";

function ItemEditor({
  items,
  onChange,
  label,
}: {
  items: RightsItem[];
  onChange: (items: RightsItem[]) => void;
  label: string;
}) {
  const add = () => onChange([...items, { icon: "✅", title: "", description: "" }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof RightsItem, value: string) => {
    const copy = [...items];
    copy[i] = { ...copy[i], [field]: value };
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{label}</Label>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start rounded-lg border border-border p-3 bg-background">
          <Input
            value={item.icon}
            onChange={(e) => update(i, "icon", e.target.value)}
            className="w-14 h-9 text-center text-lg"
            maxLength={4}
          />
          <div className="flex-1 space-y-2">
            <Input
              value={item.title}
              onChange={(e) => update(i, "title", e.target.value)}
              placeholder="Titre"
              className="h-9 text-sm"
              maxLength={100}
            />
            <Textarea
              value={item.description}
              onChange={(e) => update(i, "description", e.target.value)}
              placeholder="Description"
              rows={2}
              className="text-sm"
              maxLength={500}
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted-foreground italic">Aucun élément</p>}
    </div>
  );
}

function ResourceEditor({
  resources,
  onChange,
}: {
  resources: ResourceLink[];
  onChange: (r: ResourceLink[]) => void;
}) {
  const add = () => onChange([...resources, { title: "", description: "", url: "", type: "general", format: "PDF" }]);
  const remove = (i: number) => onChange(resources.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ResourceLink, value: string) => {
    const copy = [...resources];
    copy[i] = { ...copy[i], [field]: value } as ResourceLink;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Ressources & liens</Label>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>
      {resources.map((r, i) => (
        <div key={i} className="rounded-lg border border-border p-3 bg-background space-y-2">
          <div className="flex gap-2">
            <Input value={r.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="Titre" className="h-9 text-sm flex-1" maxLength={150} />
            <Select value={r.type} onValueChange={(v) => update(i, "type", v)}>
              <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="electricity">⚡ Électricité</SelectItem>
                <SelectItem value="water">💧 Eau</SelectItem>
                <SelectItem value="general">📋 Général</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input value={r.description} onChange={(e) => update(i, "description", e.target.value)} placeholder="Description" className="h-9 text-sm" maxLength={200} />
          <div className="flex gap-2">
            <Input value={r.url} onChange={(e) => update(i, "url", e.target.value)} placeholder="https://..." className="h-9 text-sm flex-1" maxLength={500} />
            <Input value={r.format} onChange={(e) => update(i, "format", e.target.value)} placeholder="PDF" className="h-9 text-sm w-24" maxLength={20} />
          </div>
        </div>
      ))}
    </div>
  );
}

const WhatsAppSVG = () => (
  <div className="h-5 w-5 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  </div>
);

function ContactEditor({
  contacts,
  onChange,
}: {
  contacts: EmergencyContact[];
  onChange: (c: EmergencyContact[]) => void;
}) {
  const add = () => onChange([...contacts, { name: "", number: "", type: "general", whatsapp: "" }]);
  const remove = (i: number) => onChange(contacts.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof EmergencyContact, value: string) => {
    const copy = [...contacts];
    copy[i] = { ...copy[i], [field]: value } as EmergencyContact;
    onChange(copy);
  };

  const TYPE_COLORS: Record<string, string> = {
    electricity: "border-l-amber-400",
    water: "border-l-blue-400",
    emergency: "border-l-red-400",
    general: "border-l-primary",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold">Numéros utiles</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ces contacts apparaissent dans le profil de chaque utilisateur.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Ajouter un contact
        </Button>
      </div>

      {contacts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Phone className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun contact. Cliquez sur "Ajouter" pour commencer.</p>
        </div>
      )}

      {contacts.map((c, i) => (
        <div
          key={i}
          className={`rounded-lg border border-border border-l-4 ${TYPE_COLORS[c.type] || "border-l-primary"} bg-background overflow-hidden`}
        >
          {/* Row 1: name + type + delete */}
          <div className="flex gap-2 items-center p-3 border-b border-border/60">
            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
            <Input
              value={c.name}
              onChange={(e) => update(i, "name", e.target.value)}
              placeholder="Nom du contact (ex: CIE — dépannage)"
              className="h-9 text-sm flex-1"
              maxLength={80}
            />
            <Select value={c.type} onValueChange={(v) => update(i, "type", v)}>
              <SelectTrigger className="w-36 h-9 text-sm shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electricity">⚡ Électricité</SelectItem>
                <SelectItem value="water">💧 Eau</SelectItem>
                <SelectItem value="general">📋 Général</SelectItem>
                <SelectItem value="emergency">🚨 Urgence</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Supprimer ce contact"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Row 2: phone + whatsapp */}
          <div className="flex gap-2 p-3">
            {/* Phone number */}
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Numéro téléphone
              </label>
              <Input
                value={c.number}
                onChange={(e) => update(i, "number", e.target.value)}
                placeholder="Ex: 179 ou +225 27 20 61 16"
                className="h-9 text-sm"
                maxLength={30}
                type="tel"
              />
              <p className="text-xs text-muted-foreground">Numéro d'appel — sera un lien tel:</p>
            </div>

            {/* WhatsApp number */}
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <WhatsAppSVG /> WhatsApp (optionnel)
              </label>
              <Input
                value={c.whatsapp ?? ""}
                onChange={(e) => update(i, "whatsapp", e.target.value)}
                placeholder="Ex: +2250150179179"
                className="h-9 text-sm focus:border-[#25D366] focus:ring-[#25D366]/20"
                maxLength={30}
                type="tel"
              />
              <p className="text-xs text-muted-foreground">Format international sans espaces · lien wa.me/</p>
            </div>
          </div>

          {/* Preview */}
          {(c.number || c.whatsapp) && (
            <div className="px-3 pb-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Aperçu :</span>
              {c.number && (
                <a
                  href={`tel:${c.number.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/8 rounded px-2 py-0.5 hover:bg-primary/15"
                  onClick={(e) => e.preventDefault()}
                >
                  <Phone className="h-2.5 w-2.5" /> {c.number}
                </a>
              )}
              {c.whatsapp && (
                <a
                  href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#25D366] bg-[#25D366]/10 rounded px-2 py-0.5 hover:bg-[#25D366]/20"
                  onClick={(e) => e.preventDefault()}
                >
                  <WhatsAppSVG /> {c.whatsapp}
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const AdminRightsPage = () => {
  const { data: content, isLoading } = useRightsContent();
  const updateMutation = useUpdateRightsContent();
  const [draft, setDraft] = useState<RightsContent>(DEFAULT_RIGHTS_CONTENT);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (content) {
      setDraft(content);
      setHasChanges(false);
    }
  }, [content]);

  const updateField = <K extends keyof RightsContent>(key: K, value: RightsContent[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(draft);
      setHasChanges(false);
      toast.success("Contenu mis à jour avec succès !");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const handleReset = () => {
    setDraft(DEFAULT_RIGHTS_CONTENT);
    setHasChanges(true);
    toast.info("Contenu réinitialisé aux valeurs par défaut");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Scale className="h-6 w-6" /> Mon Espace Eau & Électricité
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez le contenu affiché aux utilisateurs dans leur espace personnel.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Réinitialiser
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              size="sm"
              className="gap-1.5"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasChanges ? (
                <Save className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {hasChanges ? "Enregistrer" : "Sauvegardé"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="electricity" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto no-scrollbar">
            <TabsTrigger value="electricity" className="gap-1 text-xs sm:text-sm">
              <Zap className="h-3.5 w-3.5" /> Électricité
            </TabsTrigger>
            <TabsTrigger value="water" className="gap-1 text-xs sm:text-sm">
              <Droplets className="h-3.5 w-3.5" /> Eau
            </TabsTrigger>
            <TabsTrigger value="tips" className="gap-1 text-xs sm:text-sm">
              <Lightbulb className="h-3.5 w-3.5" /> Conseils
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-1 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5" /> Ressources
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1 text-xs sm:text-sm">
              <Phone className="h-3.5 w-3.5" /> Contacts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="electricity">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" /> Droits & obligations — Électricité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ItemEditor
                  items={draft.electricity_rights}
                  onChange={(v) => updateField("electricity_rights", v)}
                  label="Droits et obligations"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="water">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" /> Droits & obligations — Eau
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ItemEditor
                  items={draft.water_rights}
                  onChange={(v) => updateField("water_rights", v)}
                  label="Droits et obligations"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tips">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-green-600" /> Conseils & bonnes pratiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ItemEditor
                  items={draft.tips}
                  onChange={(v) => updateField("tips", v)}
                  label="Conseils pratiques"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Textes de loi & liens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResourceEditor
                  resources={draft.resources}
                  onChange={(v) => updateField("resources", v)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Numéros utiles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContactEditor
                  contacts={draft.contacts}
                  onChange={(v) => updateField("contacts", v)}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default AdminRightsPage;
