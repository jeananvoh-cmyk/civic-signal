import React, { useState, useEffect, useMemo } from 'react';
import { Institution, BudgetProject } from '../types';
import { dataStore } from '../services/dataStore';
import { GOVERNMENT_OFFICIALS } from '../data/governmentData';
import { NATIONAL_INSTITUTIONS_DATA } from '../data/nationalBudgetData';
import { REGULATORY_AUTHORITIES_DATA } from '../data/regulatoryAuthoritiesData';
import { AnnuaireIndexPage } from './institutions/AnnuaireIndexPage';
import { MinistriesPage } from './institutions/MinistriesPage';
import { NationalInstitutionsPage } from './institutions/NationalInstitutionsPage';
import { RegulatoryAuthoritiesPage } from './institutions/RegulatoryAuthoritiesPage';
import { MunicipalitiesPage } from './institutions/MunicipalitiesPage';
import { RegionalCouncilsPage } from './institutions/RegionalCouncilsPage';

export type AnnuaireView = 'INDEX' | 'MINISTRIES' | 'INSTITUTIONS' | 'REGULATORS' | 'MUNICIPAL' | 'REGIONAL';

interface InstitutionsPageProps {
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onNavigateToProjects: (filter: string) => void;
  initialView?: AnnuaireView;
}

export const InstitutionsPage: React.FC<InstitutionsPageProps> = ({
  onNavigateToProjects,
  initialView,
}) => {
  // Read initial view from path or query params
  const getInitialViewFromUrl = (): AnnuaireView => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/ministeres') || path.includes('/gouvernement')) return 'MINISTRIES';
    if (path.includes('/grandes-institutions')) return 'INSTITUTIONS';
    if (path.includes('/regulateurs') || path.includes('/autorites')) return 'REGULATORS';
    if (path.includes('/mairies') || path.includes('/communes')) return 'MUNICIPAL';
    if (path.includes('/regions') || path.includes('/districts')) return 'REGIONAL';

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'ministeres' || viewParam === 'gouvernement') return 'MINISTRIES';
    if (viewParam === 'grandes-institutions' || viewParam === 'institutions') return 'INSTITUTIONS';
    if (viewParam === 'regulateurs' || viewParam === 'autorites' || viewParam === 'aai') return 'REGULATORS';
    if (viewParam === 'mairies' || viewParam === 'communes') return 'MUNICIPAL';
    if (viewParam === 'regions' || viewParam === 'districts') return 'REGIONAL';
    return initialView || 'INDEX';
  };

  const [currentView, setCurrentView] = useState<AnnuaireView>(getInitialViewFromUrl);

  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const [storeTick, setStoreTick] = useState(0);
  useEffect(() => {
    return dataStore.subscribe(() => setStoreTick(t => t + 1));
  }, []);

  const institutions = useMemo(() => dataStore.getInstitutions(), [storeTick]);
  const allProjects = useMemo(() => dataStore.getProjects(), [storeTick]);

  const mairiesCount = institutions.filter(i => i.type === 'MAIRIE').length;
  const regionsCount = institutions.filter(i => i.type === 'REGION' || i.type === 'DISTRICT').length;
  const ministersCount = GOVERNMENT_OFFICIALS.length;
  const institutionsCount = NATIONAL_INSTITUTIONS_DATA.filter(
    i => !i.name.toLowerCase().startsWith('ministère') && !i.name.toLowerCase().startsWith('ministere') && !i.name.toLowerCase().includes('délégué')
  ).length;
  const regulatorsCount = REGULATORY_AUTHORITIES_DATA.length;

  const handleNavigateToSection = (view: AnnuaireView) => {
    setCurrentView(view);
    let targetPath = '/institutions';
    if (view === 'MINISTRIES') targetPath = '/institutions/ministeres';
    else if (view === 'INSTITUTIONS') targetPath = '/institutions/grandes-institutions';
    else if (view === 'REGULATORS') targetPath = '/institutions/regulateurs';
    else if (view === 'MUNICIPAL') targetPath = '/institutions/mairies';
    else if (view === 'REGIONAL') targetPath = '/institutions/regions';

    window.history.pushState({}, '', targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to browser navigation popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialViewFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navPills = [
    { id: 'INDEX' as AnnuaireView, label: 'Sommaire' },
    { id: 'MINISTRIES' as AnnuaireView, label: 'Ministères', count: ministersCount },
    { id: 'INSTITUTIONS' as AnnuaireView, label: 'Institutions', count: institutionsCount },
    { id: 'REGULATORS' as AnnuaireView, label: 'Régulateurs', count: regulatorsCount },
    { id: 'MUNICIPAL' as AnnuaireView, label: 'Mairies', count: mairiesCount },
    { id: 'REGIONAL' as AnnuaireView, label: 'Régions', count: regionsCount },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      
      {/* Mobile / Tablet Quick-Switcher Pill Bar */}
      <div className="mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none flex items-center gap-2 border-b border-slate-200/80">
        {navPills.map(pill => {
          const isActive = currentView === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => handleNavigateToSection(pill.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span>{pill.label}</span>
              {pill.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {pill.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

        {/* 1. Hub Sommaire Annuaire */}
        {currentView === 'INDEX' && (
          <AnnuaireIndexPage
            onNavigateToSection={handleNavigateToSection}
            mairiesCount={mairiesCount}
            regionsCount={regionsCount}
            ministersCount={ministersCount}
            institutionsCount={institutionsCount}
            regulatorsCount={regulatorsCount}
          />
        )}

        {/* 2. Page Ministères */}
        {currentView === 'MINISTRIES' && (
          <MinistriesPage
            onBack={() => handleNavigateToSection('INDEX')}
            allProjects={allProjects}
            onNavigateToProjects={onNavigateToProjects}
          />
        )}

        {/* 3. Page Grandes Institutions */}
        {currentView === 'INSTITUTIONS' && (
          <NationalInstitutionsPage
            onBack={() => handleNavigateToSection('INDEX')}
            allProjects={allProjects}
            onNavigateToProjects={onNavigateToProjects}
          />
        )}

        {/* 4. Page Autorités & Régulateurs (AAI) */}
        {currentView === 'REGULATORS' && (
          <RegulatoryAuthoritiesPage
            onBack={() => handleNavigateToSection('INDEX')}
            allProjects={allProjects}
            onNavigateToProjects={onNavigateToProjects}
          />
        )}

        {/* 5. Page Mairies (201 Communes) */}
        {currentView === 'MUNICIPAL' && (
          <MunicipalitiesPage
            onBack={() => handleNavigateToSection('INDEX')}
            institutions={institutions}
            allProjects={allProjects}
            onNavigateToProjects={onNavigateToProjects}
          />
        )}

        {/* 6. Page Conseils Régionaux & Districts (33 Collectivités) */}
        {currentView === 'REGIONAL' && (
          <RegionalCouncilsPage
            onBack={() => handleNavigateToSection('INDEX')}
            institutions={institutions}
            allProjects={allProjects}
            onNavigateToProjects={onNavigateToProjects}
          />
        )}

    </div>
  );
};

