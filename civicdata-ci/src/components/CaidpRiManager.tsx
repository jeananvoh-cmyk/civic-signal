import React, { useState, useMemo } from 'react';
import { CaidpEntity, EntityPublicCategory } from '../data/caidpRiData';
import { dataStore } from '../services/dataStore';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Landmark,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ExternalLink,
  Filter,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface CaidpRiManagerProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CaidpRiManager: React.FC<CaidpRiManagerProps> = ({ onShowToast }) => {
  // Directory state from dataStore
  const [directory, setDirectory] = useState<CaidpEntity[]>(() => dataStore.getCaidpDirectory());

  // Subscribe to dataStore changes
  React.useEffect(() => {
    return dataStore.subscribe(() => {
      setDirectory(dataStore.getCaidpDirectory());
    });
  }, []);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | EntityPublicCategory>('ALL');
  const [contactStatusFilter, setContactStatusFilter] = useState<'ALL' | 'WITHOUT_EMAIL' | 'WITH_EMAIL' | 'WITH_PHONE'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Edit / Create Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CaidpEntity | null>(null);
  const [editForm, setEditForm] = useState<Omit<CaidpEntity, 'id'>>({
    company_name: '',
    category: 'MINISTERE',
    region: 'Abidjan',
    commune: '',
    ri_name: '',
    ri_function: '',
    email: "Pas d'email",
    phone: "Pas de numéro",
    source: "Ajouté par l'Admin",
    notes: '',
  });

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');

  // Statistics calculation
  const stats = useMemo(() => {
    const total = directory.length;
    const withEmail = directory.filter(e => e.email && e.email !== "Pas d'email" && e.email.includes('@')).length;
    const withoutEmail = total - withEmail;
    const withPhone = directory.filter(e => e.phone && e.phone !== "Pas de numéro" && e.phone.length > 5).length;
    const designatedRi = directory.filter(e => e.ri_name && e.ri_name !== 'Non désigné').length;
    const emailCoveragePercent = total > 0 ? Math.round((withEmail / total) * 100) : 0;

    return { total, withEmail, withoutEmail, withPhone, designatedRi, emailCoveragePercent };
  }, [directory]);

  // Filtered directory
  const filteredDirectory = useMemo(() => {
    return directory.filter(item => {
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      // Contact status filter
      const hasEmail = item.email && item.email !== "Pas d'email" && item.email.includes('@');
      const hasPhone = item.phone && item.phone !== "Pas de numéro" && item.phone.length > 5;

      if (contactStatusFilter === 'WITHOUT_EMAIL' && hasEmail) return false;
      if (contactStatusFilter === 'WITH_EMAIL' && !hasEmail) return false;
      if (contactStatusFilter === 'WITH_PHONE' && !hasPhone) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.company_name.toLowerCase().includes(q);
        const matchRi = item.ri_name.toLowerCase().includes(q);
        const matchFunc = item.ri_function.toLowerCase().includes(q);
        const matchEmail = item.email.toLowerCase().includes(q);
        const matchRegion = item.region.toLowerCase().includes(q);
        const matchCommune = (item.commune || '').toLowerCase().includes(q);
        return matchName || matchRi || matchFunc || matchEmail || matchRegion || matchCommune;
      }

      return true;
    });
  }, [directory, categoryFilter, contactStatusFilter, searchQuery]);

  // Paginated items
  const totalPages = Math.ceil(filteredDirectory.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDirectory.slice(start, start + pageSize);
  }, [filteredDirectory, currentPage, pageSize]);

  // Handlers
  const handleOpenEdit = (item: CaidpEntity) => {
    setEditingItem(item);
    setEditForm({
      company_name: item.company_name,
      category: item.category,
      region: item.region || 'Abidjan',
      commune: item.commune || '',
      ri_name: item.ri_name,
      ri_function: item.ri_function,
      email: item.email || "Pas d'email",
      phone: item.phone || "Pas de numéro",
      source: item.source || "Mis à jour par l'Admin",
      notes: item.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setEditForm({
      company_name: '',
      category: 'SOCIETE_ETAT',
      region: 'Abidjan',
      commune: '',
      ri_name: '',
      ri_function: "Service d'Accès aux Documents Publics (Loi n°2013-867)",
      email: "Pas d'email",
      phone: "Pas de numéro",
      source: "Créé par l'Admin",
      notes: '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.company_name.trim()) {
      onShowToast("Veuillez saisir le nom de l'organisme public.", 'error');
      return;
    }

    if (editingItem) {
      dataStore.updateCaidpEntity(editingItem.id, editForm);
      onShowToast(`Coordonnées du RI pour "${editForm.company_name}" mises à jour avec succès !`, 'success');
    } else {
      dataStore.addCaidpEntity(editForm);
      onShowToast(`Nouvel organisme public "${editForm.company_name}" ajouté au répertoire CAIDP !`, 'success');
    }
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${name}" du répertoire CAIDP ?`)) {
      dataStore.deleteCaidpEntity(id);
      onShowToast(`"${name}" a été supprimé du répertoire.`, 'info');
    }
  };

  const handleExportCSV = () => {
    const csvContent = dataStore.exportCaidpDirectoryToCSV();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Repertoire_RI_CAIDP_SuiviBudget_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Exportation du fichier CSV réussie !', 'success');
  };

  const handleImportCSV = () => {
    if (!importCsvText.trim()) {
      onShowToast('Veuillez coller le contenu CSV à importer.', 'error');
      return;
    }
    const result = dataStore.importCaidpDirectoryFromCSV(importCsvText);
    onShowToast(` Importation terminée : ${result.successCount} organismes mis à jour ou ajoutés !`, 'success');
    setIsImportModalOpen(false);
    setImportCsvText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportCsvText(content);
        onShowToast(`Fichier "${file.name}" prêt pour importation.`, 'info');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const getCategoryBadge = (cat: EntityPublicCategory) => {
    switch (cat) {
      case 'MINISTERE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">Ministère</span>;
      case 'INSTITUTION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">Institution</span>;
      case 'SOCIETE_ETAT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">Société d'État / Agence</span>;
      case 'MAIRIE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">Mairie / Commune</span>;
      case 'REGION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">Conseil Régional</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">Organisme</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 font-bold">
              <Building2 className="w-6 h-6 text-amber-600" />
            </span>
            <div>
              <h3 className="text-xl font-extrabold text-navy-900 flex items-center gap-2">
                Répertoire CAIDP & Contacts des Responsables de l'Information (RI)
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-brand-blue border border-blue-200">
                  {directory.length} organismes
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Conformité Loi n°2013-867 : Gérez et complétez les coordonnées des RI pour les Ministères, Institutions, Mairies, Régions et Sociétés d'État.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
            title="Exporter l'annuaire au format CSV (Excel)"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exporter CSV</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200"
            title="Importer des contacts en masse depuis un CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Importer Contacts</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Organisme</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Organismes</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[10px] text-slate-500 mt-1">33 Min, 14 Inst, 35 Soc, 201 Mairies, 33 Rég</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avec Email Direct</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{stats.withEmail}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">Prêt pour envoi direct</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sans Email (À compléter)</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{stats.withoutEmail}</div>
          <div className="text-[10px] text-amber-600 mt-1">Routage central CAIDP</div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-brand-blue mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avec Téléphone</span>
            <Phone className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="text-2xl font-black text-brand-blue">{stats.withPhone}</div>
          <div className="text-[10px] text-blue-600 mt-1">Ligne directe ou standard</div>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Couverture Email</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">{stats.emailCoveragePercent}%</div>
          <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${stats.emailCoveragePercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-3 pt-2">
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Rechercher par organisme, nom du RI, fonction, email, commune (ex: AGEROUTE, DGMP, Korhogo, Cocody, Yopougon, brouyaopaul...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Contact Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => { setContactStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                contactStatusFilter === 'ALL'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tous ({directory.length})
            </button>
            <button
              onClick={() => { setContactStatusFilter('WITHOUT_EMAIL'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                contactStatusFilter === 'WITHOUT_EMAIL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span> Sans Email ({stats.withoutEmail})</span>
            </button>
            <button
              onClick={() => { setContactStatusFilter('WITH_EMAIL'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                contactStatusFilter === 'WITH_EMAIL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span> Avec Email ({stats.withEmail})</span>
            </button>
            <button
              onClick={() => { setContactStatusFilter('WITH_PHONE'); setCurrentPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                contactStatusFilter === 'WITH_PHONE'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <span> Avec Tél ({stats.withPhone})</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap border-t border-slate-100 pt-3">
          <button
            onClick={() => { setCategoryFilter('ALL'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-brand-blue text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tous les Organismes ({directory.length})
          </button>
          <button
            onClick={() => { setCategoryFilter('MINISTERE'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'MINISTERE'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
             Ministères ({directory.filter(d => d.category === 'MINISTERE').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('INSTITUTION'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'INSTITUTION'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Grandes Institutions ({directory.filter(d => d.category === 'INSTITUTION').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('SOCIETE_ETAT'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'SOCIETE_ETAT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Sociétés d'État & Agences ({directory.filter(d => d.category === 'SOCIETE_ETAT').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('MAIRIE'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'MAIRIE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Mairies ({directory.filter(d => d.category === 'MAIRIE').length})
          </button>
          <button
            onClick={() => { setCategoryFilter('REGION'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              categoryFilter === 'REGION'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            Conseils Régionaux ({directory.filter(d => d.category === 'REGION').length})
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">Organisme Public & Localité</th>
              <th className="py-3 px-4">Responsable de l'Information (RI)</th>
              <th className="py-3 px-4">Fonction / Titre</th>
              <th className="py-3 px-4">Email Officiel RI</th>
              <th className="py-3 px-4">Téléphone</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Aucun organisme ne correspond aux critères de recherche.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item) => {
                const hasRealEmail = item.email && item.email !== "Pas d'email" && item.email.includes('@');
                const hasRealPhone = item.phone && item.phone !== "Pas de numéro" && item.phone.length > 5;
                const hasDesignatedRi = item.ri_name && item.ri_name !== 'Non désigné';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Organisme */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[280px]">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="mb-1">{getCategoryBadge(item.category)}</div>
                          <div className="font-extrabold text-slate-900 text-xs leading-snug">
                            {item.company_name}
                          </div>
                          {(item.region || item.commune) && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>{[item.commune, item.region].filter(Boolean).join(' • ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* RI Name */}
                    <td className="py-3.5 px-4">
                      {hasDesignatedRi ? (
                        <div className="font-bold text-slate-900">{item.ri_name}</div>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-amber-700 hover:text-brand-blue hover:underline text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="Cliquez pour désigner le RI"
                        >
                          <span>+ Désigner le RI</span>
                        </button>
                      )}
                      {item.source && (
                        <span className="text-[9px] text-slate-400 block mt-0.5">{item.source}</span>
                      )}
                    </td>

                    {/* Function */}
                    <td className="py-3.5 px-4 text-slate-600 max-w-[220px]">
                      <div className="text-[11px] leading-snug text-slate-600 truncate" title={item.ri_function}>
                        {item.ri_function || "Service d'accès aux documents publics"}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4">
                      {hasRealEmail ? (
                        <a 
                          href={`mailto:${item.email}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 hover:underline border border-emerald-200 transition-colors"
                        >
                          <Mail className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-[170px]">{item.email}</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                          title="Cliquer pour renseigner l'email officiel"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          <span>Ajouter email</span>
                        </button>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4">
                      {hasRealPhone ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Phone className="w-3 h-3 text-brand-blue" />
                          <span>{item.phone}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="text-slate-400 hover:text-slate-700 text-[10px] font-semibold hover:underline cursor-pointer"
                          title="Ajouter un numéro"
                        >
                          + Ajouter tél
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-blue hover:text-white text-slate-700 font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                          title="Éditer les coordonnées du RI"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Éditer</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.company_name)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Supprimer cette entrée"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
          <div>
            Affichage de <strong>{(currentPage - 1) * pageSize + 1}</strong> à <strong>{Math.min(currentPage * pageSize, filteredDirectory.length)}</strong> sur <strong>{filteredDirectory.length}</strong> organismes
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold"
            >
              « Début
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold"
            >
              ‹ Précédent
            </button>

            <span className="px-3 font-bold text-slate-900">
              Page {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold"
            >
              Suivant ›
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 font-bold"
            >
              Fin »
            </button>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-brand-blue font-bold text-base">
                  <Building2 className="w-5 h-5 text-brand-blue" />
                </span>
                <h4 className="font-extrabold text-slate-900 text-base">
                  {editingItem ? "Modifier le Responsable de l'Information" : "+ Ajouter un Organisme Public"}
                </h4>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nom de l'Organisme Public *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                  placeholder="ex: Direction Générale des Marchés Publics (DGMP), Mairie de Korhogo..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catégorie</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as EntityPublicCategory })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  >
                    <option value="MINISTERE">Ministère</option>
                    <option value="INSTITUTION">Grande Institution</option>
                    <option value="SOCIETE_ETAT">Société d'État / Agence</option>
                    <option value="MAIRIE">Mairie / Commune</option>
                    <option value="REGION">Conseil Régional</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Région / District</label>
                  <input
                    type="text"
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    placeholder="ex: Abidjan, Poro, Gbêkê..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nom et Prénom du RI (Responsable de l'Information)
                </label>
                <input
                  type="text"
                  value={editForm.ri_name}
                  onChange={(e) => setEditForm({ ...editForm, ri_name: e.target.value })}
                  placeholder="ex: M. BROU Yao Paul, Mme OKOIN Adjo Tatiana..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fonction / Titre du Responsable
                </label>
                <input
                  type="text"
                  value={editForm.ri_function}
                  onChange={(e) => setEditForm({ ...editForm, ri_function: e.target.value })}
                  placeholder="ex: Directeur de la Communication, Secrétaire Général Adjoint..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Email Officiel du RI</label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, email: "Pas d'email" })}
                    className="text-[10px] text-amber-700 font-bold hover:underline"
                  >
                    Définir "Pas d'email"
                  </button>
                </div>
                <input
                  type="text"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="ex: brouyaopaul@yahoo.fr ou Pas d'email"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Téléphone / Standard</label>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, phone: "Pas de numéro" })}
                    className="text-[10px] text-slate-500 font-bold hover:underline"
                  >
                    Définir "Pas de numéro"
                  </button>
                </div>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="ex: +225 27 20 21 00 24 ou Pas de numéro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Source / Référence</label>
                <input
                  type="text"
                  value={editForm.source}
                  onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                  placeholder="ex: Registre CAIDP, Arrêté de nomination, Contact direct..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer et Publier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600 font-bold text-base"></span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    Importer des Contacts RI en Masse (CSV)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Mettez à jour rapidement les adresses emails et téléphones obtenus auprès de la CAIDP.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Charger un fichier CSV ou Excel (.csv)
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Ou coller directement les lignes CSV
                </label>
                <textarea
                  rows={6}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder="Organisme;Categorie;Region;Commune;Nom_RI;Fonction_RI;Email_RI;Telephone_RI&#10;Mairie de Korhogo;MAIRIE;Poro;Korhogo;M. Soro Amadou;Secrétaire Général;soro@mairie-korhogo.ci;+225 27 36 86 00 00"
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] space-y-1">
                <div className="font-bold">Format des colonnes supporté :</div>
                <div>ID ; Organisme ; Catégorie ; Région ; Commune ; Nom_RI ; Fonction_RI ; Email_RI ; Téléphone_RI</div>
                <div className="text-[10px] text-blue-700">Les organismes existants seront automatiquement mis à jour avec les nouveaux emails et téléphones.</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleImportCSV}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Lancer l'Importation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};