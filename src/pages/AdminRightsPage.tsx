import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Plus, Trash2, Scale, Zap, Droplets, Lightbulb, BookOpen, Phone, Loader2, CheckCircle2 } from "lucide-react";
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

function ContactEditor({
  contacts,
  onChange,
}: {
  contacts: EmergencyContact[];
  onChange: (c: EmergencyContact[]) => void;
}) {
  const add = () => onChange([...contacts, { name: "", number: "", type: "general" }]);
  const remove = (i: number) => onChange(contacts.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof EmergencyContact, value: string) => {
    const copy = [...contacts];
    copy[i] = { ...copy[i], [field]: value } as EmergencyContact;
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Numéros utiles</Label>
        <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>
      {contacts.map((c, i) => (
        <div key={i} className="flex gap-2 items-center rounded-lg border border-border p-3 bg-background">
          <Input value={c.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Nom" className="h-9 text-sm flex-1" maxLength={80} />
          <Input value={c.number} onChange={(e) => update(i, "number", e.target.value)} placeholder="Numéro" className="h-9 text-sm w-40" maxLength={30} />
          <Select value={c.type} onValueChange={(v) => update(i, "type", v)}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="electricity">⚡ Élec</SelectItem>
              <SelectItem value="water">💧 Eau</SelectItem>
              <SelectItem value="general">📋 Général</SelectItem>
              <SelectItem value="emergency">🚨 Urgence</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="shrink-0 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
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
