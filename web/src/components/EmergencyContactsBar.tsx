import { useState } from "react";
import { MessageCircle, Phone, Mail, HelpCircle, ShieldCheck, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SOCIAL_LINKS } from "@/lib/social-links";

export default function EmergencyContactsBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bannière fixe d'Assistance Équipe SIGNA sur toutes les pages */}
      <div className="bg-emerald-950 text-white py-2 px-4 border-b border-emerald-800/80 text-xs">
        <div className="container max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium overflow-x-auto py-0.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-emerald-200 font-bold shrink-0">Assistance & Support SIGNA :</span>
            <div className="flex items-center gap-3 shrink-0">
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-300 hover:text-white font-bold underline decoration-emerald-400/50"
              >
                <MessageCircle className="h-3.5 w-3.5 fill-emerald-500/20" />
                <span>WhatsApp Équipe SIGNA</span>
              </a>
              <span className="text-emerald-800">•</span>
              <a
                href="mailto:contact@signa.ci"
                className="hover:text-emerald-200 font-semibold"
              >
                contact@signa.ci
              </a>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="h-7 text-xs text-emerald-300 hover:text-white hover:bg-emerald-900 gap-1.5 px-2.5 font-bold shrink-0 border border-emerald-800/60"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Contacter l'Équipe SIGNA</span>
          </Button>
        </div>
      </div>

      {/* Modal / Dialog de contact avec l'Équipe SIGNA */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <HeartHandshake className="h-6 w-6 text-emerald-600" />
              Contacter l'Équipe SIGNA.ci
            </DialogTitle>
            <DialogDescription className="text-sm">
              Une question, un problème technique ou un besoin d'assistance ? Notre équipe civique vous répond directement.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-3">
            {/* 🟢 WhatsApp Équipe SIGNA */}
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    WhatsApp Support Direct
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white">
                      En ligne
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Échangez directement avec un membre de notre équipe d'assistance.
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow group-hover:scale-105 transition-transform shrink-0">
                Discuter
              </span>
            </a>

            {/* ✉️ Email Support SIGNA */}
            <a
              href="mailto:contact@signa.ci"
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    Email Support Technique
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    contact@signa.ci
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center justify-center h-9 px-3.5 rounded-lg bg-slate-900 text-white font-bold text-xs shadow group-hover:scale-105 transition-transform shrink-0">
                Écrire
              </span>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
