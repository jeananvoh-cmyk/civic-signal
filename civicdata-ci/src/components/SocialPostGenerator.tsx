import React, { useState } from 'react';
import { BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, formatAmountInWords, getProjectEntityInfo } from '../utils/formatters';
import { 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Facebook, 
  Twitter, 
  RefreshCw,
  Camera,
  MapPin,
  Building2,
  Download
} from 'lucide-react';
import { 
  generateWhatsAppMessage, 
  generateFacebookPost, 
  generateTwitterPost, 
  generateLinkedInPost 
} from '../utils/socialTemplates';

interface SocialPostGeneratorProps {
  initialProjectId?: string;
}

export const SocialPostGenerator: React.FC<SocialPostGeneratorProps> = ({
  initialProjectId,
}) => {
  const projects = dataStore.getProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjectId || (projects[0]?.id || '')
  );
  const [platform, setPlatform] = useState<'whatsapp' | 'facebook' | 'twitter' | 'linkedin'>('whatsapp');
  const [copied, setCopied] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  const getPostContent = () => {
    if (!selectedProject) return '';
    switch (platform) {
      case 'whatsapp':
        return generateWhatsAppMessage(selectedProject);
      case 'facebook':
        return generateFacebookPost(selectedProject);
      case 'twitter':
        return generateTwitterPost(selectedProject);
      case 'linkedin':
        return generateLinkedInPost(selectedProject);
    }
  };

  const content = getPostContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!selectedProject) return;
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`, '_blank');
    }
  };

  const entity = selectedProject ? getProjectEntityInfo(selectedProject.commune_name, selectedProject.region_name) : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-7 space-y-6 max-w-3xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-orange to-amber-400 text-white flex items-center justify-center shadow-md">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              Kit de Partage Réseaux Sociaux & WhatsApp
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Interpellez vos concitoyens et les élus avec des visuels clairs de transparence
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black border border-emerald-200 self-start sm:self-auto">
           Contrôle Citoyen
        </span>
      </div>

      {/* Project Selector */}
      <div>
        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
          Chantier sélectionné
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-brand-blue cursor-pointer"
        >
          {projects.slice(0, 100).map((proj) => (
            <option key={proj.id} value={proj.id}>
              [{proj.commune_name}] {proj.title} ({formatFCFA(proj.budget_amount_fcfa)})
            </option>
          ))}
        </select>
      </div>

      {/* VISUAL STORY PREVIEW CARD (WhatsApp / Instagram / X Card) */}
      {selectedProject && entity && (
        <div className="bg-gradient-to-br from-slate-900 via-brand-blue to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border-2 border-white/20">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full bg-brand-orange text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                {selectedProject.category}
              </span>
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <span> Vie Publique CI</span>
              </span>
            </div>

            <div>
              <span className="text-xs text-amber-300 font-extrabold uppercase tracking-wider block">
                {entity.entityName}
              </span>
              <h4 className="text-lg sm:text-xl font-black text-white leading-snug mt-1">
                {selectedProject.title}
              </h4>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-slate-300 block font-bold uppercase tracking-wider">Budget Voté</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400">{formatFCFA(selectedProject.budget_amount_fcfa)}</span>
              </div>
              <span className="text-xs font-bold text-slate-200">
                ({formatAmountInWords(selectedProject.budget_amount_fcfa)} FCFA)
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-orange" />
                <span>{entity.locationLabel}</span>
              </span>
              <span className="text-amber-300 font-bold"> Exigeons la qualité sur le terrain !</span>
            </div>
          </div>
        </div>
      )}

      {/* Platform Selector Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPlatform('whatsapp')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            platform === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp Story</span>
        </button>

        <button
          onClick={() => setPlatform('twitter')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            platform === 'twitter'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Twitter className="w-4 h-4" />
          <span>X / Twitter</span>
        </button>

        <button
          onClick={() => setPlatform('facebook')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            platform === 'facebook'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Facebook className="w-4 h-4" />
          <span>Facebook</span>
        </button>
      </div>

      {/* Text Output Preview Box */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
        {content}
      </div>

      {/* Actions: Direct Share + Copy */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleShare}
          className="flex-1 py-3 px-5 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          <span>Partager Directement sur {platform === 'whatsapp' ? 'WhatsApp' : platform === 'twitter' ? 'X' : 'Facebook'}</span>
        </button>

        <button
          onClick={handleCopy}
          className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-black transition-colors active:scale-95 flex items-center justify-center gap-2 border border-slate-200"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copié !' : 'Copier'}</span>
        </button>
      </div>

    </div>
  );
};
