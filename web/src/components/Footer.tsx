import { Link } from "react-router-dom";
import { Mail, MapPin, HelpCircle, ShieldCheck, ExternalLink } from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { SOCIAL_LINKS } from "@/lib/social-links";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-12 pb-24 md:pb-12 mt-16">
      <div className="container max-w-7xl mx-auto px-4 space-y-10">
        
        {/* 🧭 Grille Structurée des Liens (4 Colonnes Thématiques Épurées) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
          
          {/* Colonne 1 : Identité & Contact Direct (md:col-span-4) */}
          <div className="space-y-4 md:col-span-4">
            <div>
              <Link to="/" className="inline-block transition-transform hover:scale-105" title="SIGNA.ci — Plateforme Civique">
                <SignaLogo size="md" variant="white" showSlogan={true} />
              </Link>
            </div>

            {/* Liens de contact directs et discrets */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-[#25D366]/30 hover:border-[#25D366] text-xs font-bold text-white hover:text-[#25D366] transition-all shadow-xs"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0" />
                <span>WhatsApp</span>
              </a>
              <a
                href="mailto:contact@signa.ci"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 text-xs font-medium text-slate-300 hover:text-emerald-400 transition-all shadow-xs"
              >
                <Mail className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-mono text-[11px]">contact@signa.ci</span>
              </a>
              <Link
                to="/a-propos"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-xs font-medium text-slate-300 hover:text-cyan-400 transition-all shadow-xs"
              >
                <HelpCircle className="h-3.5 w-3.5 text-cyan-400" />
                <span>Guide &amp; FAQ</span>
              </Link>
            </div>
          </div>

          {/* Colonne 2 : Parcours Citoyen (md:col-span-3) */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">
              Services Citoyens
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/signaler" className="hover:text-emerald-400 transition-colors">Signaler une panne ou coupure</Link></li>
              <li><Link to="/carte" className="hover:text-emerald-400 transition-colors">Carte interactive des coupures</Link></li>
              <li><Link to="/infrastructures?vue=carte" className="hover:text-emerald-400 transition-colors">Carte des infrastructures &amp; voiries</Link></li>
              <li><Link to="/suivi" className="hover:text-emerald-400 transition-colors">Suivre un ticket de signalement</Link></li>
              <li><Link to="/verification" className="hover:text-emerald-400 transition-colors">Mes signalements &amp; rétablissement</Link></li>
              <li><Link to="/affiches" className="hover:text-emerald-400 transition-colors">Affiches QR Code de quartier</Link></li>
              <li><Link to="/compteur" className="hover:text-emerald-400 transition-colors">Simulateur Compteur &amp; Autonomie</Link></li>
            </ul>
          </div>

          {/* Colonne 3 : Mairies & Transparence (md:col-span-3) */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">
              Mairies &amp; Données
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/tableau-de-bord" className="hover:text-emerald-400 transition-colors">Tableau de bord &amp; Météo réseaux</Link></li>
              <li><Link to="/infrastructures" className="hover:text-emerald-400 transition-colors">Voirie, Caniveaux &amp; Salubrité</Link></li>
              <li>
                <Link to="/mairie" className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1">
                  <span>Portail Mairies (Services Techniques)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">Accès pro</span>
                </Link>
              </li>
              <li><Link to="/regulateurs" className="hover:text-emerald-400 transition-colors">Baromètre Régulateurs (ANARE &amp; ONEP)</Link></li>
              <li><Link to="/transparence" className="hover:text-emerald-400 transition-colors font-semibold text-emerald-400">Transparence Open Data (Open311)</Link></li>
            </ul>
          </div>

          {/* Colonne 4 : Écosystème & Légal (md:col-span-2) */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">
              Cadre Légal
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/a-propos" className="hover:text-emerald-400 transition-colors">À propos de SIGNA.ci</Link></li>
              <li><Link to="/partenaires" className="hover:text-emerald-400 transition-colors">Devenir Partenaire</Link></li>
              <li><Link to="/faire-un-don" className="hover:text-rose-400 transition-colors">Faire un don civique</Link></li>
              <li><Link to="/cgu" className="hover:text-emerald-400 transition-colors">Conditions d'Utilisation</Link></li>
              <li><Link to="/confidentialite" className="hover:text-emerald-400 transition-colors">Confidentialité</Link></li>
            </ul>
          </div>
        </div>

        {/* 🛡️ Bandeau d'Engagement Citoyen, Données & Conformité */}
        <div className="pt-6 border-t border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300 font-semibold">
                Données traitées conformément à la Loi n° 2013-450 (Côte d'Ivoire)
              </span>
            </div>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="text-slate-400">
              Positions GPS floutées (~150 m) pour préserver la vie privée des foyers.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
            <Link to="/confidentialite" className="hover:text-emerald-400 transition-colors underline-offset-2 hover:underline">
              Protection des Données
            </Link>
            <span className="text-slate-700">•</span>
            <Link to="/cgu" className="hover:text-emerald-400 transition-colors underline-offset-2 hover:underline">
              CGU
            </Link>
            <span className="text-slate-700">•</span>
            <a
              href="https://www.autoritedeprotection.ci/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-emerald-400 transition-colors"
            >
              Cadre APDP / ARTCI
            </a>
          </div>
        </div>

        {/* 📜 Copyright & Licence Libre */}
        <div className="pt-4 border-t border-slate-900/60 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} SIGNA.ci — CivicTech Côte d'Ivoire. Logiciel libre sous licence AGPL-3.0.</p>
          <p className="text-[11px] text-slate-500">
            Plateforme participative d'intérêt général pour l'amélioration continue des infrastructures publiques.
          </p>
        </div>
      </div>
    </footer>
  );
}
