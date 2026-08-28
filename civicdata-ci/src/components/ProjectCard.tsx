import React from 'react';
import { BudgetProject } from '../types';
import { formatFCFA, getStatusConfig } from '../utils/formatters';
import { MapPin, ArrowRight, Camera, Share2 } from 'lucide-react';

interface ProjectCardProps {
  project: BudgetProject;
  onSelect: (project: BudgetProject) => void;
  onSendProof?: (project: BudgetProject) => void;
  onShare?: (project: BudgetProject) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onSendProof,
  onShare,
}) => {
  const status = getStatusConfig(project.current_status);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      
      {/* Top Header & Status Badge */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
            {project.category || 'Infrastructure'}
          </span>
          
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.badgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${status.dotClass}`}></span>
            <span>{status.label}</span>
          </span>
        </div>

        {/* Project Title */}
        <h3 
          onClick={() => onSelect(project)}
          className="text-base sm:text-lg font-bold text-navy-900 line-clamp-2 cursor-pointer group-hover:text-terracotta-600 transition-colors leading-snug"
        >
          {project.title}
        </h3>

        {/* Location Pin */}
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
          <MapPin className="w-3.5 h-3.5 text-terracotta-500 flex-shrink-0" />
          <span className="font-medium text-slate-700">{project.commune_name}</span>
          <span className="text-slate-400">•</span>
          <span>{project.region_name}</span>
        </div>
      </div>

      {/* Middle Budget & Progress Section */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/60 border-t border-slate-100">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Budget Voté</span>
          <span className="text-base font-extrabold text-navy-900 font-sans tracking-tight">
            {formatFCFA(project.budget_amount_fcfa)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full ${status.progressColor} transition-all duration-500`}
            style={{ width: `${Math.max(project.progress_percentage || 5, 5)}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-medium">
          <span>Avancement estimé</span>
          <span className="font-bold text-slate-700">{project.progress_percentage}%</span>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-3 sm:px-5 sm:py-3.5 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onSelect(project)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          <span>Voir la fiche</span>
          <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
        </button>

        {onSendProof && (
          <button
            onClick={() => onSendProof(project)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors"
            title="Envoyer une photo / preuve"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}

        {onShare && (
          <button
            onClick={() => onShare(project)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-terracotta-50 hover:text-terracotta-700 text-slate-700 transition-colors"
            title="Partager sur WhatsApp / Réseaux"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>

    </div>
  );
};
