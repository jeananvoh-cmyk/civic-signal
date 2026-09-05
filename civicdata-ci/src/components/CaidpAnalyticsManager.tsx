import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Mail, 
  Printer, 
  Copy, 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Landmark, 
  Filter, 
  Search, 
  Calendar, 
  User, 
  Eye, 
  ArrowUpRight, 
  Award, 
  AlertCircle,
  Briefcase,
  Layers,
  Sparkles
} from 'lucide-react';
import { dataStore, CaidpRequestEvent, CaidpRequestStats } from '../services/dataStore';
import { sanitizeCsvCell } from '../utils/security';

interface CaidpAnalyticsManagerProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CaidpAnalyticsManager: React.FC<CaidpAnalyticsManagerProps> = ({ onShowToast }) => {
  const [stats, setStats] = useState<CaidpRequestStats>(() => dataStore.getCaidpRequestStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'EMAIL_SENT' | 'PRINT_PDF' | 'COPIED'>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  // Reactive subscription to DataStore changes
  useEffect(() => {
    return dataStore.subscribe(() => {
      setStats(dataStore.getCaidpRequestStats());
    });
  }, []);

  // Filtered recent events for table
  const filteredEvents = useMemo(() => {
    return stats.recentEvents.filter(event => {
      const matchesSearch = !searchQuery || 
        event.entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.document_titles || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.commune && event.commune.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAction = actionFilter === 'ALL' || event.action_type === actionFilter;
      const matchesEntity = entityFilter === 'ALL' || event.entity_type === entityFilter;

      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [stats.recentEvents, searchQuery, actionFilter, entityFilter]);

  // Entity labels & colors mapping
  const entityLabels: Record<string, { label: string; color: string; bg: string }> = {
    MAIRIE: { label: 'Mairies & Communes', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    REGION: { label: 'Conseils Régionaux', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    MINISTERE: { label: 'Ministères & Cabinets', color: 'text-brand-blue', bg: 'bg-blue-50 border-blue-200' },
    INSTITUTION: { label: 'Institutions d\'État', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    AUTORITE_REGULATION: { label: 'Autorités de Régulation', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    PROJECT: { label: 'Marchés & Chantiers', color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' },
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    const logs = dataStore.getCaidpRequests();
    if (logs.length === 0) {
      onShowToast("Aucun journal d'activité CAIDP à exporter pour le moment.", 'info');
      return;
    }

    const headers = [
      'ID Requête',
      'Date & Heure',
      'Action Réalisée',
      'Type Organisme',
      'Nom de l\'Organisme',
      'RI Désigné',
      'Profil Demandeur',
      'Commune',
      'Documents Demandés',
      'Nombre de Pièces'
    ];

    const rows = logs.map(l => [
      sanitizeCsvCell(l.id),
      sanitizeCsvCell(new Date(l.created_at).toLocaleString('fr-FR')),
      sanitizeCsvCell(l.action_type === 'EMAIL_SENT' ? 'Email transmis au RI' : l.action_type === 'PRINT_PDF' ? 'Courrier Imprimé / PDF' : 'Texte Copié'),
      sanitizeCsvCell(entityLabels[l.entity_type]?.label || l.entity_type),
      sanitizeCsvCell(l.entity_name),
      sanitizeCsvCell(l.has_ri ? 'OUI' : 'NON'),
      sanitizeCsvCell(l.user_status || 'CITOYEN'),
      sanitizeCsvCell(l.commune || 'Non précisée'),
      sanitizeCsvCell((l.document_titles || []).join(' ; ')),
      sanitizeCsvCell(String((l.document_titles || []).length))
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `suivibudget_demandes_caidp_impact_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast(`Rapport CSV exporté avec succès (${logs.length} requêtes).`, 'success');
  };

  // Clear Logs Handler
  const handleClearLogs = () => {
    if (stats.totalRequests === 0) return;
    const confirmDelete = window.confirm(
      'Êtes-vous sûr de vouloir réinitialiser l\'historique des demandes CAIDP enregistrées ? Cette action est irréversible.'
    );
    if (confirmDelete) {
      dataStore.clearCaidpRequests();
      onShowToast('Historique des requêtes CAIDP réinitialisé.', 'info');
    }
  };

  const riCoveragePercent = stats.totalRequests > 0 
    ? Math.round((stats.withRiCount / stats.totalRequests) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER & ACTIONS BAR */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-sans">
              Impact & Suivi des Demandes CAIDP
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-brand-blue border border-blue-200/80">
              Loi n°2013-867
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Mesure en temps réel de l'incitation citoyenne à l'accès aux documents publics : courriels adressés aux Responsables de l'Information (RI), courriers physiques générés et répartition des pièces sollicitées.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleExportCsv}
            disabled={stats.totalRequests === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Exporter l'historique complet au format CSV Excel"
          >
            <Download className="w-4 h-4" />
            <span>Exporter CSV ({stats.totalRequests})</span>
          </button>

          {stats.totalRequests > 0 && (
            <button
              onClick={handleClearLogs}
              className="px-3 py-2.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:border-rose-200 flex items-center gap-1.5 cursor-pointer"
              title="Vider l'historique"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Vider</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Requêtes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Démarches</span>
            <FileSpreadsheet className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-sans tracking-tight">
            {stats.totalRequests}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold block">
            Générées sur la plateforme
          </span>
        </div>

        {/* Emails envoyés aux RI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Emails aux RI</span>
            <Mail className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-sans tracking-tight">
            {stats.emailSentCount}
          </p>
          <span className="text-[10px] text-emerald-700/80 font-semibold block">
            Transmission directe
          </span>
        </div>

        {/* Courriers Imprimés / PDF */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Courriers PDF / Print</span>
            <Printer className="w-4 h-4 text-slate-800" />
          </div>
          <p className="text-2xl font-black text-slate-800 font-sans tracking-tight">
            {stats.printPdfCount}
          </p>
          <span className="text-[10px] text-slate-500 font-semibold block">
            Dépôts physiques / guichet
          </span>
        </div>

        {/* Textes Copiés */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Textes Copiés</span>
            <Copy className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 font-sans tracking-tight">
            {stats.copiedCount}
          </p>
          <span className="text-[10px] text-indigo-700/80 font-semibold block">
            Formulaires externes
          </span>
        </div>

        {/* Taux avec RI */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Avec RI Officiel</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-sans tracking-tight">
            {riCoveragePercent}%
          </p>
          <span className="text-[10px] text-slate-500 font-semibold block">
            {stats.withRiCount} avec RI • {stats.withoutRiCount} sans RI
          </span>
        </div>

      </div>

      {/* 3. TWO COLUMNS: REPARTITION BY ENTITY & TOP REQUESTED DOCUMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Entity Distribution */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-blue" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Répartition par Type d'Organisme Public
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              Sur {stats.totalRequests} requêtes
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(entityLabels).map(([typeKey, meta]) => {
              const count = stats.byEntityType[typeKey] || 0;
              const percent = stats.totalRequests > 0 ? Math.round((count / stats.totalRequests) * 100) : 0;
              return (
                <div key={typeKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${meta.bg.split(' ')[0].replace('50', '500')}`} />
                      <span>{meta.label}</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${meta.bg.split(' ')[0].replace('50', '500')}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 10 Requested Documents */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Top 10 des Documents les Plus Sollicités
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              Fréquence de sélection
            </span>
          </div>

          {stats.topDocuments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic space-y-1">
              <p>Aucun document public n'a encore été sélectionné.</p>
              <p className="text-[11px]">Les sélections des citoyens apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.topDocuments.map((doc, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 shadow-2xs' :
                      idx === 1 ? 'bg-slate-300 text-slate-900' :
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-900 truncate" title={doc.title}>
                      {doc.title}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono font-black text-[11px] text-brand-blue shrink-0">
                    {doc.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. CHRONOLOGICAL REQUESTS ACTIVITY LOG TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-4 p-5 sm:p-6">
        
        {/* Table Filters & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Journal Chronologique des Démarches</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Historique des requêtes préparées ou envoyées via l'application
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher organisme ou document..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-brand-blue w-48 sm:w-60"
              />
            </div>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Toutes les actions</option>
              <option value="EMAIL_SENT">Emails au RI</option>
              <option value="PRINT_PDF">Courriers Imprimés / PDF</option>
              <option value="COPIED">Textes Copiés</option>
            </select>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
            >
              <option value="ALL">Toutes les entités</option>
              <option value="MAIRIE">Mairies</option>
              <option value="REGION">Conseils Régionaux</option>
              <option value="MINISTERE">Ministères</option>
              <option value="INSTITUTION">Institutions</option>
              <option value="AUTORITE_REGULATION">Autorités de Régulation</option>
              <option value="PROJECT">Marchés Publics</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date & Heure</th>
                <th className="px-4 py-3">Organisme Public</th>
                <th className="px-4 py-3">Statut RI</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Documents Demandés</th>
                <th className="px-4 py-3">Demandeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                    Aucune démarche enregistrée correspondant aux critères.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const dateObj = new Date(evt.created_at);
                  const meta = entityLabels[evt.entity_type] || {
                    label: evt.entity_type,
                    color: 'text-slate-700',
                    bg: 'bg-slate-50 border-slate-200',
                  };

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Date & Heure */}
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                        {dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        <span className="block text-[10px] text-slate-400">
                          {dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Organisme Public */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <span className={`inline-block text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${meta.bg} ${meta.color} mb-1`}>
                          {meta.label}
                        </span>
                        <p className="font-bold text-slate-900 leading-snug">
                          {evt.entity_name}
                        </p>
                        {evt.commune && (
                          <span className="text-[10px] text-slate-500 block">
                            Commune : {evt.commune}
                          </span>
                        )}
                      </td>

                      {/* Statut RI */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {evt.has_ri ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>RI Officiel</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <span>Sans RI (Art. 10)</span>
                          </span>
                        )}
                      </td>

                      {/* Type d'Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {evt.action_type === 'EMAIL_SENT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <Mail className="w-3 h-3 text-emerald-600" />
                            <span>Email RI</span>
                          </span>
                        )}
                        {evt.action_type === 'PRINT_PDF' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-900 text-white">
                            <Printer className="w-3 h-3 text-white" />
                            <span>PDF / Imprimé</span>
                          </span>
                        )}
                        {evt.action_type === 'COPIED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-50 text-brand-blue border border-blue-200">
                            <Copy className="w-3 h-3 text-brand-blue" />
                            <span>Copié</span>
                          </span>
                        )}
                      </td>

                      {/* Documents Demandés */}
                      <td className="px-4 py-3 min-w-[220px]">
                        <span className="font-bold text-[11px] text-slate-800 block">
                          {(evt.document_titles || []).length} document{(evt.document_titles || []).length > 1 ? 's' : ''} :
                        </span>
                        <ul className="list-disc list-inside text-[10px] text-slate-600 space-y-0.5 pt-0.5 max-h-20 overflow-y-auto">
                          {(evt.document_titles || []).map((t, i) => (
                            <li key={i} className="truncate" title={t}>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </td>

                      {/* Demandeur */}
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {evt.user_status || 'CITOYEN'}
                        </span>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
