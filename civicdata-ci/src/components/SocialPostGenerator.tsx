import React, { useState } from 'react';
import { BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { formatFCFA, getStatusConfig } from '../utils/formatters';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Facebook, 
  Twitter, 
  Linkedin,
  RefreshCw
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
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://civicdata.ci/projets/${selectedProject.id}`)}`, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-4 sm:p-6 space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-terracotta-500 to-amber-400 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-navy-900">
              Générateur de Posts Réseaux Sociaux
            </h3>
            <p className="text-xs text-slate-500">
              Créez des publications virales de transparence budgétaire en 1 clic
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-terracotta-50 text-terracotta-700 rounded-full text-xs font-bold border border-terracotta-200 self-start sm:self-auto">
          🇨🇮 Contrôle Citoyen
        </span>
      </div>

      {/* Project Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Sélectionner le projet à vulgariser
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
        >
          {projects.map((proj) => (
            <option key={proj.id} value={proj.id}>
              [{proj.commune_name}] {proj.title} ({formatFCFA(proj.budget_amount_fcfa)})
            </option>
          ))}
        </select>
      </div>

      {/* Selected Project Summary Pill */}
      {selectedProject && (
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] border ${getStatusConfig(selectedProject.current_status).badgeClass}`}>
              {getStatusConfig(selectedProject.current_status).label} ({selectedProject.progress_percentage}%)
            </span>
            <span className="font-semibold text-slate-800">{selectedProject.commune_name}</span>
          </div>
          <span className="font-extrabold text-navy-900 font-sans">
            {formatFCFA(selectedProject.budget_amount_fcfa)}
          </span>
        </div>
      )}

      {/* Platform Tabs */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Plateforme Cible
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setPlatform('whatsapp')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              platform === 'whatsapp'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-400/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('facebook')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              platform === 'facebook'
                ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-400/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Facebook className="w-4 h-4 text-blue-600" />
            <span>Facebook</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('twitter')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              platform === 'twitter'
                ? 'bg-slate-100 border-slate-700 text-slate-900 ring-2 ring-slate-400/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Twitter className="w-4 h-4 text-slate-900" />
            <span>X (Twitter)</span>
          </button>

          <button
            type="button"
            onClick={() => setPlatform('linkedin')}
            className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              platform === 'linkedin'
                ? 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-400/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Linkedin className="w-4 h-4 text-sky-700" />
            <span>LinkedIn</span>
          </button>
        </div>
      </div>

      {/* Generated Post Box */}
      <div className="relative">
        <textarea
          readOnly
          rows={7}
          value={content}
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none select-all leading-relaxed"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleCopy}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-navy-900 hover:bg-navy-800 text-white shadow-md'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span>Copié dans le presse-papier !</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-terracotta-400" />
              <span>Copier le texte du post</span>
            </>
          )}
        </button>

        <button
          onClick={handleShare}
          className="py-3 px-5 bg-terracotta-500 hover:bg-terracotta-600 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-terracotta-500/20 flex items-center justify-center gap-2 transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>Partager sur {platform}</span>
        </button>
      </div>

    </div>
  );
};
