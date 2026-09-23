import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Plus,
  Copy,
  Trash2,
  FileDown,
  Upload,
  CheckCircle,
  X,
  Edit2,
  Check,
  Activity,
  CalendarCheck2,
  Clock,
  CalendarDays,
  Search,
  Layers,
  ArrowDown,
  ArrowUp
} from 'lucide-react';

const formatDateTime = (isoString) => {
  if (!isoString) return 'Unbekannt';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Unbekannt';
    return (
      date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' Uhr'
    );
  } catch {
    return 'Unbekannt';
  }
};

const formatRelativeTime = (isoString) => {
  if (!isoString) return '';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'gerade eben';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'gestern';
    if (diffDays < 7) return `vor ${diffDays} Tagen`;
    return '';
  } catch {
    return '';
  }
};

const ScheduleManagementModal = ({
  schedules = [],
  activeScheduleId,
  onSwitchSchedule,
  onCreateNewSchedule,
  onDuplicateSchedule,
  onDeleteSchedule,
  onRenameSchedule,
  onExportSchedule,
  onImportSchedule,
  onCancel,
  fileInputRef,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('updatedAt'); // 'title' | 'updatedAt' | 'createdAt'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const editInputRef = useRef(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setIsVisible(true);
    }, 0);
    return () => clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (editingPlanId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingPlanId]);

  const handleCloseAndAction = (actionCallback, ...args) => {
    setIsVisible(false);
    setTimeout(() => {
      if (actionCallback) actionCallback(...args);
    }, 300);
  };

  const handleImportChange = (event) => {
    setIsVisible(false);
    setTimeout(() => {
      onImportSchedule(event);
    }, 300);
  };

  const [duplicateSourceId, setDuplicateSourceId] = useState(null);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const duplicateInputRef = useRef(null);

  useEffect(() => {
    if (duplicateSourceId && duplicateInputRef.current) {
      duplicateInputRef.current.focus();
      duplicateInputRef.current.select();
    }
  }, [duplicateSourceId]);

  const handleCreateEmpty = (e) => {
    e.preventDefault();
    const title = newPlanTitle.trim();
    onCreateNewSchedule(title || undefined);
    setNewPlanTitle('');
  };

  const handleOpenDuplicateDialog = (sourceId) => {
    const plan = schedules.find((s) => s.id === sourceId);
    const defaultName = `${plan?.title || 'Wochenplan'} (Kopie)`;
    setDuplicateSourceId(sourceId);
    setDuplicateTitle(defaultName);
  };

  const handleConfirmDuplicate = (e) => {
    if (e) e.preventDefault();
    if (!duplicateSourceId) return;
    const finalTitle = duplicateTitle.trim();
    onDuplicateSchedule(duplicateSourceId, finalTitle || undefined);
    setDuplicateSourceId(null);
  };

  const handleStartRename = (plan) => {
    setEditingPlanId(plan.id);
    setEditingTitle(plan.title || 'Wochenplan');
  };

  const handleSaveRename = (planId) => {
    if (editingTitle.trim() && onRenameSchedule) {
      onRenameSchedule(planId, editingTitle.trim());
    }
    setEditingPlanId(null);
  };

  // Umschalten der Sortierung über Spaltenüberschriften
  const handleHeaderSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'title' ? 'asc' : 'desc');
    }
  };

  // Filterung und Sortierung der Pläne
  const processedSchedules = useMemo(() => {
    let list = [...schedules];

    // Suche nach Namen
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => (s.title || '').toLowerCase().includes(q));
    }

    // Sortierung nach Spaltenfeld
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '', 'de');
      } else if (sortField === 'updatedAt') {
        comparison = new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [schedules, searchQuery, sortField, sortDirection]);

  // Exportiert einen spezifischen Plan als .wochenplan Datei
  const handleExportSingleSchedule = (plan) => {
    try {
      const dataToExport = {
        masterSchedule: {
          ...plan,
          shifts: plan.shifts || [],
          sickDays: plan.sickDays || {},
        },
      };
      const jsonString = JSON.stringify(dataToExport, null, 2);
      const sanitizedTitle = (plan.title || 'Wochenplan')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const filename = `${sanitizedTitle}_${day}.${month}.${year}.wochenplan`;

      const blob = new Blob([jsonString], { type: 'application/wochenplan+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Fehler beim Exportieren:', err);
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="text-indigo-600 dark:text-indigo-400 inline" />
    ) : (
      <ArrowDown size={12} className="text-indigo-600 dark:text-indigo-400 inline" />
    );
  };

  return createPortal(
    <div
      style={{ zIndex: 110 }}
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print-hidden-modal transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCloseAndAction(onCancel);
      }}
    >
      <div
        className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-3xl shadow-2xl p-6 max-w-5xl w-full relative border border-gray-200 dark:border-gray-700/80 transform transition-all duration-300 ease-out flex flex-col h-[650px] max-h-[92vh] ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between pb-3.5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-xl shadow-md shadow-indigo-500/20">
              <CalendarCheck2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                  Wochenpläne verwalten
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {schedules.length} {schedules.length === 1 ? 'Plan' : 'Pläne'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Wechsle zwischen Wochenplänen oder erstelle neue Pläne.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleCloseAndAction(onCancel)}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/80 transition"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Neuer Plan Sektion (kompakt) */}
        <div className="flex-shrink-0 mt-3 p-2.5 bg-gradient-to-r from-gray-50 to-indigo-50/30 dark:from-gray-800/80 dark:to-indigo-950/20 rounded-xl border border-gray-200/90 dark:border-gray-700/80 shadow-sm">
          <form onSubmit={handleCreateEmpty} className="flex gap-2 items-center">
            {/* Name Input */}
            <input
              type="text"
              placeholder="Name des neuen Plans (z. B. KW 43)..."
              value={newPlanTitle}
              onChange={(e) => setNewPlanTitle(e.target.value)}
              className="flex-grow px-3 py-1.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 shadow-inner"
            />

            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
              title="Erstellt einen neuen Wochenplan"
            >
              <Plus size={14} />
              <span>Neuer Plan</span>
            </button>
          </form>
        </div>

        {/* Toolbar: Suche */}
        <div className="flex-shrink-0 mt-3 mb-1.5 flex items-center justify-between gap-2.5">
          <div className="relative flex-grow max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Pläne nach Name filtern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tabellenartige Liste aller Wochenpläne (wie Datei-Explorer / Word / OneDrive) */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/50 flex flex-col">
          {/* Tabellen-Header mit Klick-Sortierung */}
          <div className="sticky top-0 bg-gray-50 dark:bg-gray-800/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 flex items-center text-xs font-semibold text-gray-600 dark:text-gray-300 select-none z-10">
            {/* Spalte: Name */}
            <div className="flex-grow min-w-[200px]">
              <button
                type="button"
                onClick={() => handleHeaderSort('title')}
                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer font-bold"
                title="Nach Name sortieren"
              >
                <span>Name</span>
                {renderSortIndicator('title')}
              </button>
            </div>

            {/* Spalte: Zuletzt bearbeitet */}
            <div className="w-56 flex-shrink-0 hidden sm:flex">
              <button
                type="button"
                onClick={() => handleHeaderSort('updatedAt')}
                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer font-bold"
                title="Nach Bearbeitungsdatum sortieren"
              >
                <Clock size={13} className={sortField === 'updatedAt' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'} />
                <span>Zuletzt bearbeitet</span>
                {renderSortIndicator('updatedAt')}
              </button>
            </div>

            {/* Spalte: Erstellt am */}
            <div className="w-44 flex-shrink-0 hidden md:flex">
              <button
                type="button"
                onClick={() => handleHeaderSort('createdAt')}
                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer font-bold"
                title="Nach Erstelldatum sortieren"
              >
                <CalendarDays size={13} className={sortField === 'createdAt' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'} />
                <span>Erstellt am</span>
                {renderSortIndicator('createdAt')}
              </button>
            </div>

            {/* Spalte: Aktionen */}
            <div className="w-28 flex-shrink-0 text-right pr-2 font-bold text-gray-500 dark:text-gray-400">
              Aktionen
            </div>
          </div>

          {/* Zeilen */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 flex-grow">
            {processedSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Layers size={32} className="text-gray-300 dark:text-gray-600 mb-1.5" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Keine Wochenpläne gefunden
                </p>
              </div>
            ) : (
              processedSchedules.map((plan) => {
                const isActive = plan.id === activeScheduleId;
                const sickEmployeeCount = plan.sickDays
                  ? Object.values(plan.sickDays).filter((days) => Array.isArray(days) && days.length > 0).length
                  : 0;
                const isEditing = editingPlanId === plan.id;
                const relativeUpdated = formatRelativeTime(plan.updatedAt);

                return (
                  <div
                    key={plan.id}
                    onClick={() => {
                      if (!isActive && onSwitchSchedule && !isEditing) {
                        onSwitchSchedule(plan.id);
                      }
                    }}
                    className={`group px-4 py-2.5 flex items-center transition-colors ${
                      isActive
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/40 font-medium'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    } ${!isEditing ? 'cursor-pointer' : ''}`}
                  >
                    {/* Spalte: Name (Icon + Titel + Badges) */}
                    <div className="flex-grow min-w-[200px] flex items-center gap-3 mr-2">
                      <div
                        className={`p-1.5 rounded-lg flex-shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                            : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        <Calendar size={16} />
                      </div>

                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5 flex-grow max-w-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(plan.id);
                              if (e.key === 'Escape') setEditingPlanId(null);
                            }}
                            className="px-2 py-0.5 text-xs bg-white dark:bg-gray-800 border border-indigo-500 rounded text-gray-900 dark:text-gray-100 w-full focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(plan.id)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                            title="Speichern"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPlanId(null)}
                            className="p-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded cursor-pointer"
                            title="Abbrechen"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-xs truncate ${isActive ? 'font-bold text-indigo-950 dark:text-indigo-200' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                            {plan.title || 'Wochenplan'}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500 text-white flex items-center gap-0.5 flex-shrink-0">
                              <CheckCircle size={9} />
                              Aktiv
                            </span>
                          )}
                          {sickEmployeeCount > 0 && (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-semibold text-[10px] flex-shrink-0">
                              <Activity size={10} />
                              {sickEmployeeCount} krank
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Spalte: Zuletzt bearbeitet */}
                    <div className="w-56 flex-shrink-0 hidden sm:flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{formatDateTime(plan.updatedAt)}</span>
                      {relativeUpdated && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          ({relativeUpdated})
                        </span>
                      )}
                    </div>

                    {/* Spalte: Erstellt am */}
                    <div className="w-44 flex-shrink-0 hidden md:flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDateTime(plan.createdAt)}</span>
                    </div>

                    {/* Spalte: Aktionen */}
                    <div
                      className="w-28 flex-shrink-0 flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >

                      <button
                        type="button"
                        onClick={() => handleStartRename(plan)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                        title="Plan umbenennen"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenDuplicateDialog(plan.id)}
                        className="p-1.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                        title="Plan duplizieren (kopieren)"
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportSingleSchedule(plan)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                        title="Diesen Plan als separate .wochenplan-Datei exportieren"
                      >
                        <FileDown size={13} />
                      </button>

                      {schedules.length > 1 && onDeleteSchedule && (
                        <button
                          type="button"
                          onClick={() => onDeleteSchedule(plan.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Diesen Plan löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer: Import, Globaler Export, Leeren & Schließen */}
        <div className="flex-shrink-0 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Import aus .wochenplan */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportChange}
                accept=".wochenplan"
                className="hidden"
                id="importScheduleFileModal"
              />
              <label
                htmlFor="importScheduleFileModal"
                className="flex items-center gap-1.5 py-1.5 px-2.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
                title="Wochenplan aus separater Datei als neuen Plan importieren"
              >
                <Upload size={13} />
                <span>Aus .wochenplan importieren</span>
              </label>
            </div>

            {/* Export des aktuellen Plans */}
            <button
              type="button"
              onClick={() => handleCloseAndAction(onExportSchedule)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
              title="Aktuellen Plan als separate .wochenplan-Datei exportieren"
            >
              <FileDown size={13} />
              <span>Aktiven Plan exportieren</span>
            </button>

          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => handleCloseAndAction(onCancel)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg text-sm shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Fertig
            </button>
          </div>
        </div>

        {/* Duplizieren Prompt Dialog */}
        {duplicateSourceId && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setDuplicateSourceId(null)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 max-w-md w-full animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Copy size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
                      Wochenplan duplizieren
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Vergib einen Namen für die Kopie
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDuplicateSourceId(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConfirmDuplicate}>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Name des neuen Plans:
                </label>
                <input
                  ref={duplicateInputRef}
                  type="text"
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setDuplicateSourceId(null);
                  }}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 mb-4"
                  placeholder="Plan Name..."
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateSourceId(null)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Kopie erstellen
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default ScheduleManagementModal;
