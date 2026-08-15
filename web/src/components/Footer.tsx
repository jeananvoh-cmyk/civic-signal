import { Link } from "react-router-dom";
import { MessageCircle, Mail, MapPin, Phone, HelpCircle, HeartHandshake } from "lucide-react";
import SignaLogo from "@/components/SignaLogo";
import { SOCIAL_LINKS } from "@/lib/social-links";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-24 md:pb-12 mt-16">
      <div className="container max-w-7xl mx-auto px-4 space-y-10">
        
        {/* Section Principale : Contact Équipe SIGNA */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-800/60 rounded-2xl p-6 sm:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Assistance & Support Utilisateurs
              </div>
              <h3 className="text-xl font-extrabold text-white mt-1">Besoin d'aide ? Contactez l'Équipe SIGNA-CI 🇨🇮</h3>
            </div>
            <p className="text-xs text-slate-300 max-w-md">
              Notre équipe d'assistance civique est à votre écoute pour vous guider, résoudre un problème technique ou recueillir vos suggestions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
            {/* 🟢 WhatsApp Direct SIGNA */}
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-700/60 hover:border-emerald-400 transition-all flex items-center gap-4 group"
            >
              <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide">WhatsApp SIGNA</div>
                <div className="text-base font-extrabold text-white group-hover:underline">Assistance Directe</div>
                <div className="text-xs text-slate-400 mt-0.5">Réponse rapide des modérateurs</div>
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
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email Support</div>
                <div className="text-base font-bold text-white font-mono group-hover:underline">contact@signa.ci</div>
                <div className="text-xs text-slate-400 mt-0.5">Support technique 7j/7</div>
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
                <div className="text-xs text-slate-400 mt-0.5">Guide d'utilisation de l'application</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Grille de liens de l'application */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="inline-block">
              <SignaLogo size="md" />
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plateforme citoyenne participative de signalement des pannes et dégradations d'infrastructures en Côte d'Ivoire.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Navigation Citoyenne</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/signaler" className="hover:text-emerald-400 transition-colors">Signaler un incident</Link></li>
              <li><Link to="/carte" className="hover:text-emerald-400 transition-colors">Carte interactive</Link></li>
              <li><Link to="/infrastructures" className="hover:text-emerald-400 transition-colors">États des Réseaux</Link></li>
              <li><Link to="/suivi" className="hover:text-emerald-400 transition-colors">Suivre un ticket</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Institutionnel & Transparence</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/transparence" className="hover:text-emerald-400 transition-colors">Transparence des Données</Link></li>
              <li><Link to="/partenaires" className="hover:text-emerald-400 transition-colors">Relais & Mairies Partenaires</Link></li>
              <li><Link to="/cgu" className="hover:text-emerald-400 transition-colors">Conditions d'Utilisation</Link></li>
              <li><Link to="/confidentialite" className="hover:text-emerald-400 transition-colors">Politique de Confidentialité</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Équipe & Assistance</h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Abidjan, Côte d'Ivoire</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-400 shrink-0" />
                <a href="mailto:contact@signa.ci" className="hover:text-white">contact@signa.ci</a>
              </p>
              <div className="pt-2 flex items-center gap-2">
                <a
                  href={SOCIAL_LINKS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-2 text-xs font-bold px-3"
                  aria-label="WhatsApp SIGNA"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp Support</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Macaron Officiel de Conformité aux Informations Légales */}
        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            <span>Plateforme développée en conformité avec la <strong>Loi n° 2013-450</strong> (Côte d'Ivoire) · <a href="https://certinumapdp.ci/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold underline hover:text-white">Immatriculation APDP / ARTCI</a></span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="https://certinumapdp.ci/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 underline">Guichet CERTINUM</a>
            <span>•</span>
            <a href="https://www.autoritedeprotection.ci/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 underline">Site Officiel APDP</a>
            <span>•</span>
            <Link to="/confidentialite" className="text-slate-400 hover:text-emerald-400 underline">Droits & Données</Link>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900/60 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} SIGNA.ci — Équipe & Plateforme Civique Côte d'Ivoire. Tous droits réservés.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/cgu" className="hover:text-slate-300">CGU</Link>
            <span>•</span>
            <Link to="/confidentialite" className="hover:text-slate-300">Confidentialité & APDP</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
