import { Link } from "react-router-dom";
import { Mail, MapPin, HelpCircle, HeartHandshake, ShieldCheck, ExternalLink, Sparkles } from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { SOCIAL_LINKS } from "@/lib/social-links";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-24 md:pb-12 mt-16">
      <div className="container max-w-7xl mx-auto px-4 space-y-12">
        
        {/* 💬 Section Principale : Contact & Entraide Civique */}
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-800/50 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Contact & Entraide Civique
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Une question, une idée ou un retour ? Échangeons ensemble.
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed">
              SIGNA.ci est une initiative libre, propulsée pour et par la communauté. Vos signalements, retours et suggestions sont traités avec bienveillance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {/* 🟢 WhatsApp SIGNA */}
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-2xl bg-slate-900/90 border border-[#25D366]/40 hover:border-[#25D366] hover:bg-slate-900 transition-all flex items-center gap-4 group shadow-sm hover:shadow-[#25D366]/15 hover:-translate-y-0.5 duration-200"
            >
              <div className="h-12 w-12 rounded-2xl bg-[#25D366]/15 flex items-center justify-center shrink-0 border border-[#25D366]/30">
                <WhatsAppIcon className="h-10 w-10 drop-shadow" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-[#25D366] uppercase tracking-wide">WhatsApp</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">Direct</span>
                </div>
                <div className="text-sm font-extrabold text-white group-hover:text-[#25D366] transition-colors truncate">Discuter sur WhatsApp</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">Échanges avec l'administrateur</div>
              </div>
            </a>

            {/* ✉️ Email Support SIGNA */}
            <a
              href="mailto:contact@signa.ci"
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500 hover:bg-slate-900 transition-all flex items-center gap-4 group shadow-sm hover:-translate-y-0.5 duration-200"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
                <Mail className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Email Officiel</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">24h à 48h</span>
                </div>
                <div className="text-sm font-bold text-white font-mono group-hover:text-emerald-400 transition-colors truncate">contact@signa.ci</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">Assistance & partenariats</div>
              </div>
            </a>

            {/* ℹ️ Guide & FAQ */}
            <Link
              to="/a-propos"
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500 hover:bg-slate-900 transition-all flex items-center gap-4 group sm:col-span-2 lg:col-span-1 shadow-sm hover:-translate-y-0.5 duration-200"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0 border border-slate-700">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide">Centre d'aide</span>
                  <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/60">Guide</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">Comment ça marche ?</div>
                <div className="text-xs text-slate-400 mt-0.5 truncate">FAQ & guide en libre-service</div>
              </div>
            </Link>
          </div>
        </div>

        {/* 🧭 Grille Structurée des Liens (4 Colonnes Thématiques) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Colonne 1 : Identité & Mission */}
          <div className="space-y-3 md:col-span-1">
            <Link to="/" className="inline-block">
              <SignaLogo size="md" variant="white" />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black tracking-widest text-emerald-400 uppercase">
              SIGNALER · SUIVRE · RÉPARER
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plateforme citoyenne libre et participative de signalement des pannes et dégradations d'infrastructures en Côte d'Ivoire.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Grand Abidjan (14 communes)</span>
              </span>
            </div>
          </div>

          {/* Colonne 2 : Parcours Citoyen */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>📢</span> Services Citoyens
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/signaler" className="hover:text-emerald-400 transition-colors">Signaler un incident (CIE · SODECI · Mairie)</Link></li>
              <li><Link to="/carte" className="hover:text-emerald-400 transition-colors">Carte interactive des coupures</Link></li>
              <li><Link to="/suivi" className="hover:text-emerald-400 transition-colors">Suivre un ticket de signalement</Link></li>
              <li><Link to="/verification" className="hover:text-emerald-400 transition-colors">Confirmer un constat dans mon quartier</Link></li>
              <li><Link to="/affiches" className="hover:text-emerald-400 transition-colors">Affiches & QR Codes quartier</Link></li>
              <li><Link to="/compteur" className="hover:text-emerald-400 transition-colors">Simulateur Compteur & Autonomie</Link></li>
            </ul>
          </div>

          {/* Colonne 3 : Mairies & Transparence */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>🏛️</span> Mairies & Données
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/tableau-de-bord" className="hover:text-emerald-400 transition-colors">Tableau de bord & Météo des réseaux</Link></li>
              <li><Link to="/infrastructures" className="hover:text-emerald-400 transition-colors">Voirie, Caniveaux & Salubrité locale</Link></li>
              <li><Link to="/mairie" className="hover:text-emerald-400 transition-colors">Portail Mairies (Services Techniques)</Link></li>
              <li><Link to="/regulateurs" className="hover:text-emerald-400 transition-colors">Baromètre Régulateurs (ANARE-CI & ONEP)</Link></li>
              <li><Link to="/transparence" className="hover:text-emerald-400 transition-colors font-semibold text-emerald-400">Transparence Open Data (Open311)</Link></li>
            </ul>
          </div>

          {/* Colonne 4 : Écosystème & Légal */}
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span>⚖️</span> Cadre & Écosystème
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/a-propos" className="hover:text-emerald-400 transition-colors">À propos de l'initiative SIGNA.ci</Link></li>
              <li><Link to="/partenaires" className="hover:text-emerald-400 transition-colors">Devenir Partenaire (3 Paliers)</Link></li>
              <li><Link to="/faire-un-don" className="hover:text-rose-400 transition-colors">Soutenir le projet civique (Dons)</Link></li>
              <li><Link to="/cgu" className="hover:text-emerald-400 transition-colors">Conditions Générales d'Utilisation</Link></li>
              <li><Link to="/confidentialite" className="hover:text-emerald-400 transition-colors">Politique de Confidentialité</Link></li>
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
