import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, HelpCircle, HeartHandshake } from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { SOCIAL_LINKS } from "@/lib/social-links";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-24 md:pb-12 mt-16">
      <div className="container max-w-7xl mx-auto px-4 space-y-10">
        
        {/* Section Principale : Contact & Retours Citoyens */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-800/60 rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                Contact & Retours Citoyens
              </div>
              <h3 className="text-xl font-extrabold text-white mt-1">Une suggestion ou une question ? Contactez-nous 🇨🇮</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-md">
              SIGNA.ci est une initiative citoyenne indépendante. Vos retours, signalements de bugs et propositions d'amélioration sont les bienvenus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {/* 🟢 WhatsApp SIGNA */}
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-slate-900 border border-[#25D366]/40 hover:border-[#25D366] transition-all flex items-center gap-4 group shadow-sm hover:shadow-[#25D366]/10"
            >
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0">
                <WhatsAppIcon className="h-11 w-11 drop-shadow" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#25D366] uppercase tracking-wide">
                  WhatsApp
                </div>
                <div className="text-base font-extrabold text-white group-hover:underline">Support & Échanges</div>
                <div className="text-xs text-slate-400 mt-0.5">Échanges directs avec l'administrateur</div>
              </div>
            </a>

            {/* ✉️ Email Support SIGNA */}
            <a
              href="mailto:contact@signa.ci"
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 transition-all flex items-center gap-4 group"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shadow-md shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Officiel</div>
                <div className="text-base font-bold text-white font-mono group-hover:underline">contact@signa.ci</div>
                <div className="text-xs text-slate-400 mt-0.5">Réponse sous 24h à 48h ouvrées</div>
              </div>
            </a>

            {/* ℹ️ Guide & FAQ */}
            <Link
              to="/a-propos"
              className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 transition-all flex items-center gap-4 group sm:col-span-2 lg:col-span-1"
            >
              <div className="h-12 w-12 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center shadow-md shrink-0">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wide">Centre d'aide</div>
                <div className="text-base font-bold text-white group-hover:underline">Comment ça marche ?</div>
                <div className="text-xs text-slate-400 mt-0.5">Guide d'utilisation en libre-service</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Grille de liens de l'application */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-1">
            <Link to="/" className="inline-block">
              <SignaLogo size="md" variant="white" />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-black tracking-widest text-emerald-400 uppercase">
              SIGNALER · SUIVRE · RÉPARER
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plateforme citoyenne participative de signalement des pannes et dégradations d'infrastructures en Côte d'Ivoire.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Navigation Citoyenne</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/signaler" className="hover:text-emerald-400 transition-colors">Signaler un incident</Link></li>
              <li><Link to="/carte" className="hover:text-emerald-400 transition-colors">Carte interactive</Link></li>
              <li><Link to="/tableau-de-bord" className="hover:text-emerald-400 transition-colors">Tableau de bord des Réseaux</Link></li>
              <li><Link to="/infrastructures" className="hover:text-emerald-400 transition-colors">Voirie & Infrastructures</Link></li>
              <li><Link to="/affiches" className="hover:text-emerald-400 transition-colors">Affiches & QR Codes Quartier</Link></li>
              <li><Link to="/suivi" className="hover:text-emerald-400 transition-colors">Suivre un ticket</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Institutionnel & Transparence</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/transparence" className="hover:text-emerald-400 transition-colors">Transparence Open Data</Link></li>
              <li><Link to="/mairie" className="hover:text-emerald-400 transition-colors">Espace Mairies (Services Techniques)</Link></li>
              <li><Link to="/regulateurs" className="hover:text-emerald-400 transition-colors">Audit Régulateurs (ANARE & ONEP)</Link></li>
              <li><Link to="/partenaires" className="hover:text-emerald-400 transition-colors">Relais & Mairies Partenaires</Link></li>
              <li><Link to="/cgu" className="hover:text-emerald-400 transition-colors">Conditions d'Utilisation</Link></li>
              <li><Link to="/confidentialite" className="hover:text-emerald-400 transition-colors">Politique de Confidentialité</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Territoire & Disponibilité</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Abidjan, Côte d'Ivoire</span>
              </p>
              <p className="flex items-center gap-2 text-slate-300">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                <span>Plateforme en libre-service 24h/24</span>
              </p>
              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                Accessible à tous les résidents des 14 communes du Grand Abidjan.
              </p>
            </div>
          </div>
        </div>

        {/* Bandeau d'Engagement Citoyen, Données & Conformité */}
        <div className="pt-6 border-t border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-semibold">
                Plateforme citoyenne indépendante & participative
              </span>
            </div>
            <span className="hidden sm:inline text-slate-600">·</span>
            <span className="text-slate-400">
              Données traitées conformément à la <strong>Loi n° 2013-450</strong> (Côte d'Ivoire)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
            <Link to="/confidentialite" className="hover:text-emerald-400 transition-colors underline-offset-2 hover:underline">
              Protection des Données
            </Link>
            <span className="text-slate-700">•</span>
            <Link to="/cgu" className="hover:text-emerald-400 transition-colors underline-offset-2 hover:underline">
              Conditions d'Utilisation
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

        <div className="pt-4 border-t border-slate-900/60 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} SIGNA.ci — CivicTech Côte d'Ivoire. Tous droits réservés.</p>
          <p className="text-[11px] text-slate-500">
            Signalements participatifs d'intérêt général pour l'amélioration des infrastructures publiques.
          </p>
        </div>
      </div>
    </footer>
  );
}
