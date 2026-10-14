import React, { useState } from 'react';
import {
  FileText,
  Users,
  Layers,
  Settings,
  Save,
  Download,
  Upload,
  Printer,
  Trash2,
  HelpCircle,
  MessageSquare,
  Sun,
  Moon,
  Clock,
  Tag,
  Sliders,
  ChevronUp,
  ChevronDown,
  UserPlus,
  FolderPlus,
  BookmarkPlus,
  Hourglass,
  CalendarCheck2,
  Eye,
  EyeOff,
  Thermometer,
  AlertTriangle,
  FolderOpen,
  Building2,
} from 'lucide-react';
import CustomSelect from './CustomSelect';

const RibbonMenu = ({
  // Data actions
  onSave,
  onSaveAs,
  onOpen,
  onPrint,
  onClearData,
  onOpenScheduleModal,
  schedulesCount = 1,
  // Modal open triggers
  onOpenEmployees,
  onOpenAddEmployee,
  onOpenEmployeeOverview,
  onOpenSickLeave,
  sickCount = 0,
  onOpenGroups,
  onOpenAddGroup,
  onOpenGroupOverview,
  onOpenCategories,
  onOpenAddCategory,
  onOpenAddSubCategory,
  onOpenCategoryOverview,
  onOpenSubCategories,
  onOpenDisposalRules,
  onOpenAddDisposalRule,
  onOpenDisposalRulesOverview,
  // Other actions
  onOpenHelp,
  onOpenFeedback,
  onOpenSettings,
  onOpenFacilitySettings,
  theme,
  toggleTheme,
  appVersion,
  onOpenVersionPopup,
  isSaving = false,
  hasFileHandle = false,
  // Druckoptionen (direkt im Ribbon)
  printGroupFilter = 'all',
  setPrintGroupFilter,
  printEmployeeFilter = 'all',
  setPrintEmployeeFilter,
  printWeeklySummary,
  setPrintWeeklySummary,
  filteredGroupsForDisplayInFilter = [],
  availableEmployeesForFilter = [],
  filteredGroupsForDisplayInPrintFilter,
  availableEmployeesForPrintFilter,
  // Ansicht-Optionen (Zeitleiste, Filter, Warnungen)
  displayStartHour,
  displayStartMinute,
  displayEndHour,
  displayEndMinute,
  onDisplayTimeChange,
  selectedGroupIdFilter,
  setSelectedGroupIdFilter,
  selectedEmployeeIdFilter,
  setSelectedEmployeeIdFilter,
  showStaffingWarningsGlobally,
  setShowStaffingWarningsGlobally,
  hideAbsentEmployees = false,
  setHideAbsentEmployees,
  isCollapsed: externalIsCollapsed,
  setIsCollapsed: externalSetIsCollapsed,
}) => {
  const [activeTab, setActiveTab] = useState('data');
  
  // Ribbon collapse state - persist in localStorage
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ribbon_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalCollapsed;
  const setIsCollapsed = (valOrFn) => {
    const nextVal = typeof valOrFn === 'function' ? valOrFn(isCollapsed) : valOrFn;
    try {
      localStorage.setItem('ribbon_collapsed', String(nextVal));
    } catch (_e) {
      // Ignorieren falls Storage nicht verfügbar
    }
    if (externalSetIsCollapsed) {
      externalSetIsCollapsed(nextVal);
    } else {
      setInternalCollapsed(nextVal);
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleTabClick = (tabId) => {
    if (activeTab === tabId && !isCollapsed) {
      setIsCollapsed(true);
      try {
        localStorage.setItem('ribbon_collapsed', 'true');
      } catch (_e) {
        // Ignorieren
      }
    } else {
      setActiveTab(tabId);
      if (isCollapsed) {
        setIsCollapsed(false);
        try {
          localStorage.setItem('ribbon_collapsed', 'false');
        } catch (_e) {
          // Ignorieren
        }
      }
    }
  };

  // Echter stufenloser Farbverlauf (Option 1): Blau -> Indigo -> Violett -> Purple -> Magenta -> Pink
  const tabs = [
    {
      id: 'data',
      label: 'Datei',
      icon: FileText,
      color: '#2563eb', // 1. Blau (Blue 600)
      activeBg: 'rgba(37, 99, 235, 0.12)',
      activeDarkBg: 'rgba(37, 99, 235, 0.22)',
    },
    {
      id: 'employees',
      label: 'Mitarbeiter',
      icon: Users,
      color: '#4f46e5', // 2. Indigo (Indigo 600)
      activeBg: 'rgba(79, 70, 229, 0.12)',
      activeDarkBg: 'rgba(79, 70, 229, 0.22)',
    },
    {
      id: 'groups',
      label: 'Gruppen',
      icon: Layers,
      color: '#7c3aed', // 3. Violett (Violet 600)
      activeBg: 'rgba(124, 58, 237, 0.12)',
      activeDarkBg: 'rgba(124, 58, 237, 0.22)',
    },
    {
      id: 'categories',
      label: 'Schichtblöcke',
      icon: Tag,
      color: '#a855f7', // 4. Lila / Purple (Purple 500)
      activeBg: 'rgba(168, 85, 247, 0.12)',
      activeDarkBg: 'rgba(168, 85, 247, 0.22)',
    },
    {
      id: 'rules',
      label: 'Verfügungszeiten',
      icon: Clock,
      color: '#d946ef', // 5. Fuchsia / Magenta (Fuchsia 500)
      activeBg: 'rgba(217, 70, 239, 0.12)',
      activeDarkBg: 'rgba(217, 70, 239, 0.22)',
    },
    {
      id: 'view',
      label: 'Ansicht',
      icon: Eye,
      color: '#ec4899', // 6. Pink (Pink 500)
      activeBg: 'rgba(236, 72, 153, 0.12)',
      activeDarkBg: 'rgba(236, 72, 153, 0.22)',
    },
    {
      id: 'print',
      label: 'Drucken',
      icon: Printer,
      color: '#e11d48', // 7. Rose (Rose 600)
      activeBg: 'rgba(225, 29, 72, 0.12)',
      activeDarkBg: 'rgba(225, 29, 72, 0.22)',
    },
  ];

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/90 dark:border-gray-700/90 overflow-hidden transition-all duration-250 print-hidden-element">
      {/* 1. Word-Style Title Bar (App-Icon + Document Name + Status + Quick Tools) */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100/90 dark:bg-gray-950/80 border-b border-gray-200/80 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 select-none">
        {/* Left: App Icon + Document Title */}
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}vite.svg`}
            alt=""
            className="w-7 h-7 object-contain drop-shadow-sm hover:scale-105 transition-transform select-none"
          />

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-800 dark:text-gray-100 tracking-tight">
              Kindergarten Dienstplan
            </span>
            
            <button
              type="button"
              onClick={hasFileHandle ? onSave : onSaveAs}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition cursor-pointer select-none ${
                hasFileHandle 
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40' 
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              }`}
              title={
                hasFileHandle 
                  ? 'Mit Speicherdatei verknüpft. Klicke hier oder nutze „Datei ➔ Speichern“ (Strg + S), um Änderungen in die Datei zu schreiben.' 
                  : 'Warnung: Keine Speicherdatei verknüpft! Daten liegen nur im temporären Browserspeicher. Klicke hier oder nutze „Datei ➔ Speichern unter...“, um eine Sicherungsdatei anzulegen.'
              }
            >
              {hasFileHandle ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              ) : (
                <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              )}
              <span>{hasFileHandle ? 'Datei verknüpft' : 'Keine Datei verknüpft'}</span>
            </button>
          </div>
        </div>

        {/* Right Tools (Version, Darkmode, Help, Feedback) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenVersionPopup}
            className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 transition"
            title="Versionshinweise"
          >
            v{appVersion}
          </button>

          <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border transition ${
              theme === 'dark'
                ? 'text-amber-400 bg-amber-950/40 border-amber-800/50 hover:bg-amber-900/60'
                : 'text-indigo-600 bg-indigo-50 border-indigo-200/80 hover:bg-indigo-100'
            }`}
            title={theme === 'dark' ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren'}
            aria-label="Theme wechseln"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>


          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition"
            title="Einstellungen"
            aria-label="Einstellungen"
          >
            <Settings size={15} />
          </button>

          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
            title="Hilfe & Anleitung"
            aria-label="Hilfe"
          >
            <HelpCircle size={15} />
          </button>

          <button
            onClick={onOpenFeedback}
            className="p-1.5 rounded-lg text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/40 border border-pink-200/80 dark:border-pink-800/50 hover:bg-pink-100 dark:hover:bg-pink-900/60 transition"
            title="Feedback & Support"
            aria-label="Feedback"
          >
            <MessageSquare size={15} />
          </button>
        </div>
      </div>

      {/* 2. Ribbon Tabs Bar */}
      <div
        className={`flex items-center justify-between px-3 bg-gray-50/90 dark:bg-gray-900/80 select-none transition-all duration-200 ${
          isCollapsed ? 'py-1.5' : 'pt-1.5 border-b border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex flex-wrap items-center space-x-1 sm:space-x-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={isActive && !isCollapsed ? 'Klicken zum Einklappen (wie in Word)' : tab.label}
                style={
                  isActive
                    ? isCollapsed
                      ? {
                          backgroundColor: theme === 'dark' ? tab.activeDarkBg : tab.activeBg,
                          color: tab.color,
                        }
                      : {
                          color: tab.color,
                        }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold relative whitespace-nowrap outline-none focus:outline-none ${
                  isCollapsed
                    ? 'rounded-lg border border-transparent transition-colors duration-150'
                    : 'rounded-t-lg rounded-b-none border-t border-x transition-colors duration-150'
                } ${
                  isActive
                    ? isCollapsed
                      ? 'font-bold'
                      : 'bg-white dark:bg-gray-800 shadow-sm border-gray-200/90 dark:border-gray-700'
                    : isCollapsed
                      ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <Icon size={15} style={{ color: isActive ? tab.color : undefined }} />
                <span>{tab.label}</span>
                {isActive && !isCollapsed && (
                  <span
                    className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] z-10"
                    style={{ backgroundColor: tab.color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Collapse / Expand Toggle Right */}
        <div className="flex items-center pl-2 flex-shrink-0">
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition"
            title={isCollapsed ? 'Menüband erweitern' : 'Menüband einklappen (wie in Word)'}
            aria-label="Menüband umschalten"
          >
            {isCollapsed ? (
              <>
                <ChevronDown size={14} />
                <span className="hidden sm:inline">Erweitern</span>
              </>
            ) : (
              <>
                <ChevronUp size={14} />
                <span className="hidden sm:inline">Einklappen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Tab Content Toolbar (Ribbon Body) mit CSS-Grid-Row Transition (butterweich) */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
          isCollapsed ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-2.5 px-4 min-h-[76px] flex items-center overflow-x-auto bg-white/70 dark:bg-gray-800/70">
          
          {/* TAB: Datei */}
          {activeTab === 'data' && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* 1. Speichern: Icon blue-600 */}
              <button
                onClick={onSave}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                title="Aktuelle Änderungen direkt in die Datei speichern"
              >
                <div className="p-1.5 bg-blue-600 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Save size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Speichern
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    {hasFileHandle ? 'In Datei sichern' : 'Als Datei sichern'}
                  </span>
                </div>
              </button>

              {/* 2. Speichern unter: Icon blue-500 */}
              <button
                onClick={onSaveAs}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                title="Komplette Daten in eine neue Datei speichern"
              >
                <div className="p-1.5 bg-blue-500 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Download size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Speichern unter...
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Als neue Datei sichern
                  </span>
                </div>
              </button>

              {/* 3. Öffnen: Icon blue-400 */}
              <button
                onClick={onOpen}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                title="Gespeicherte Dienstplan-Datei öffnen"
              >
                <div className="p-1.5 bg-blue-400 text-white rounded-lg group-hover:scale-105 transition transform">
                  <FolderOpen size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Öffnen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Datei laden
                  </span>
                </div>
              </button>

              {/* Trennlinie */}
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

              {/* 4. Wochenpläne: Icon blue-300 mit weißem Icon */}
              <button
                onClick={onOpenScheduleModal}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                title="Wochenpläne anzeigen, durchwechseln oder neue Pläne erstellen"
              >
                <div className="p-1.5 bg-blue-300 text-white rounded-lg group-hover:scale-105 transition transform relative">
                  <CalendarCheck2 size={18} />
                  {schedulesCount > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-blue-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-gray-800">
                      {schedulesCount}
                    </span>
                  )}
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Wochenpläne
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Pläne wechseln &amp; anlegen
                  </span>
                </div>
              </button>



              {/* Trennlinie */}
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

              {/* Daten vergessen Button */}
              <button
                onClick={onClearData}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/70 dark:hover:bg-rose-900/30 border border-rose-200/80 dark:border-rose-900/40 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                title="Alle Daten und Mitarbeiter aus dem Speicher löschen"
              >
                <div className="p-1.5 bg-rose-600 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Trash2 size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-rose-700 dark:text-rose-300">
                    Daten vergessen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Plan leeren &amp; neu anfangen
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* TAB: Mitarbeiter */}
          {activeTab === 'employees' && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* 1. Mitarbeiter hinzufügen: Icon indigo-600 */}
              <button
                onClick={onOpenAddEmployee}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg group-hover:scale-105 transition transform">
                  <UserPlus size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Mitarbeiter hinzufügen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Neues Teammitglied anlegen &amp; konfigurieren
                  </span>
                </div>
              </button>

              {/* 2. Mitarbeiter Übersicht: Icon indigo-500 */}
              <button
                onClick={onOpenEmployeeOverview}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-indigo-500 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Users size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Mitarbeiter-Übersicht
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Alle Mitarbeiter anzeigen, bearbeiten &amp; entfernen
                  </span>
                </div>
              </button>

              {/* 3. Krankmeldungen Button: Icon indigo-400 */}
              {onOpenSickLeave && (
                <button
                  onClick={onOpenSickLeave}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                >
                  <div className="p-1.5 bg-indigo-400 text-white rounded-lg group-hover:scale-105 transition transform">
                    <Thermometer size={18} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                      Krankmeldungen
                    </span>
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                      Krankheitstage dieser Woche verwalten
                    </span>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* TAB: Gruppen */}
          {activeTab === 'groups' && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* 1. Gruppe hinzufügen: Icon violet-600 */}
              <button
                onClick={onOpenAddGroup}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-violet-600 text-white rounded-lg group-hover:scale-105 transition transform">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Gruppe hinzufügen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Neue Gruppe &amp; Öffnungszeiten anlegen
                  </span>
                </div>
              </button>

              {/* 2. Gruppen-Übersicht: Icon violet-500 */}
              <button
                onClick={onOpenGroupOverview}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-violet-500 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Layers size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Gruppen-Übersicht
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Alle Gruppen verwalten, sortieren &amp; löschen
                  </span>
                </div>
              </button>

              {/* Trennlinie */}
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

              {/* 3. Einrichtungseinstellungen: Icon violet-400 */}
              <button
                onClick={onOpenFacilitySettings}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800/60 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                title="Teamsitzungen, Leitungsabdeckung und Generator-Regeln"
              >
                <div className="p-1.5 bg-violet-400 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Building2 size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Einrichtungseinstellungen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Teamsitzungen &amp; Regeln
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* TAB: Schichtblöcke */}
          {activeTab === 'categories' && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* 1. Schichtblock hinzufügen: Icon purple-600 */}
              <button
                onClick={onOpenAddCategory}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-purple-600 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Tag size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Schichtblock hinzufügen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Neuen Hauptblock (z.B. Betreuung, Verfügung)
                  </span>
                </div>
              </button>

              {/* 2. Unterblock hinzufügen: Icon purple-500 */}
              <button
                onClick={onOpenAddSubCategory}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-purple-500 text-white rounded-lg group-hover:scale-105 transition transform">
                  <BookmarkPlus size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Unterblock hinzufügen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Spezifische Tätigkeit (z.B. Wald, Sprache)
                  </span>
                </div>
              </button>

              {/* 3. Schichtblöcke-Übersicht: Icon purple-400 */}
              <button
                onClick={onOpenCategoryOverview}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-purple-400 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Layers size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Schichtblock-Übersicht
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Alle Haupt- und Unterblöcke anzeigen &amp; verwalten
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* TAB: Verfügungszeiten */}
          {activeTab === 'rules' && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* 1. Regel hinzufügen: Icon fuchsia-600 */}
              <button
                onClick={onOpenAddDisposalRule}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-fuchsia-50 dark:bg-fuchsia-950/30 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50 border border-fuchsia-200 dark:border-fuchsia-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-fuchsia-600 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Clock size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Regel hinzufügen
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Neue Verfügungszeit-Berechnung definieren
                  </span>
                </div>
              </button>

              {/* 2. Regeln-Übersicht: Icon fuchsia-500 */}
              <button
                onClick={onOpenDisposalRulesOverview || onOpenDisposalRules}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-fuchsia-50 dark:bg-fuchsia-950/30 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50 border border-fuchsia-200 dark:border-fuchsia-800/60 rounded-xl transition group text-left shadow-sm hover:shadow"
              >
                <div className="p-1.5 bg-fuchsia-500 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Layers size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Regel-Übersicht
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Alle Verfügungszeit-Regeln anzeigen &amp; anpassen
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* TAB: Ansicht */}
          {activeTab === 'view' && (
            <div className="flex items-center gap-4 flex-wrap">

              {/* Zeitleiste Start- & Endzeit */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Zeitleiste
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200 font-medium">
                    Startzeit:
                    <input
                      type="number"
                      value={displayStartHour}
                      onChange={(e) => onDisplayTimeChange(e, 'startHour')}
                      min="0"
                      max="23"
                      className="w-12 h-8 text-center text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                    />
                    :
                    <input
                      type="number"
                      value={displayStartMinute}
                      onChange={(e) => onDisplayTimeChange(e, 'startMinute')}
                      min="0"
                      max="59"
                      step="15"
                      className="w-12 h-8 text-center text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-200 font-medium">
                    Endzeit:
                    <input
                      type="number"
                      value={displayEndHour}
                      onChange={(e) => onDisplayTimeChange(e, 'endHour')}
                      min="0"
                      max="23"
                      className="w-12 h-8 text-center text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                    />
                    :
                    <input
                      type="number"
                      value={displayEndMinute}
                      onChange={(e) => onDisplayTimeChange(e, 'endMinute')}
                      min="0"
                      max="59"
                      step="15"
                      className="w-12 h-8 text-center text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-400/50"
                    />
                  </label>
                </div>
              </div>

              {/* Trennlinie */}
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

              {/* Gruppe filtern */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Gruppe filtern
                </label>
                <CustomSelect
                  value={selectedGroupIdFilter}
                  onChange={(e) => setSelectedGroupIdFilter(e.target.value)}
                  size="sm"
                  options={filteredGroupsForDisplayInFilter.map((group) => ({
                    value: group.id,
                    label: group.name,
                  }))}
                />
              </div>

              {/* Mitarbeiter filtern */}
              <div className="flex flex-col gap-1 min-w-[150px]">
                <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Mitarbeiter filtern
                </label>
                <CustomSelect
                  value={selectedEmployeeIdFilter}
                  onChange={(e) => setSelectedEmployeeIdFilter(e.target.value)}
                  size="sm"
                  options={[
                    { value: 'all', label: 'Alle Mitarbeiter' },
                    ...availableEmployeesForFilter.map((employee) => ({
                      value: employee.id,
                      label: employee.name,
                    })),
                  ]}
                />
              </div>

              {/* Trennlinie */}
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

              {/* Ausgeblendete Personen komplett verbergen Toggle */}
              <button
                type="button"
                onClick={() => setHideAbsentEmployees?.(prev => !prev)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition group text-left cursor-pointer shadow-xs ${
                  hideAbsentEmployees
                    ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
                title="Blendet Personen an Tagen, an denen sie krank sind oder Schultag haben, komplett aus dem Dienstplan aus."
              >
                <div className={`p-1.5 rounded-lg transition transform group-hover:scale-105 ${
                  hideAbsentEmployees ? 'bg-pink-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {hideAbsentEmployees ? <EyeOff size={16} /> : <Eye size={16} />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="block text-xs font-bold leading-tight">
                      Ausgeblendete verbergen
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      hideAbsentEmployees 
                        ? 'bg-pink-100 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {hideAbsentEmployees ? 'Aktiv' : 'Aus'}
                    </span>
                  </div>
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                    Kranke &amp; Schultage an dem Tag nicht anzeigen
                  </span>
                </div>
              </button>

              {/* Trennlinie */}
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

              {/* Betreuungswarnungen Toggle */}
              <button
                type="button"
                onClick={() => setShowStaffingWarningsGlobally?.(prev => !prev)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition group text-left cursor-pointer shadow-xs ${
                  showStaffingWarningsGlobally
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
                title="Blendet Warnungen und rote Bereiche bei Unterbesetzung im Dienstplan ein oder aus."
              >
                <div className={`p-1.5 rounded-lg transition transform group-hover:scale-105 ${
                  showStaffingWarningsGlobally ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="block text-xs font-bold leading-tight">
                      Betreuungswarnungen
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      showStaffingWarningsGlobally 
                        ? 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {showStaffingWarningsGlobally ? 'Aktiv' : 'Aus'}
                    </span>
                  </div>
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                    Unterbesetzung im Plan anzeigen
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* TAB: Drucken */}
          {activeTab === 'print' && (
            <div className="flex items-center gap-4 flex-wrap">

              {/* Gruppe filtern */}
              <div className="flex flex-col gap-1 min-w-[150px]">
                <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Gruppe
                </label>
                <CustomSelect
                  value={printGroupFilter}
                  onChange={e => {
                    const newGroup = e.target.value;
                    if (setPrintGroupFilter) setPrintGroupFilter(newGroup);
                  }}
                  options={(filteredGroupsForDisplayInPrintFilter || filteredGroupsForDisplayInFilter || []).map(g => ({
                    value: g.id,
                    label: g.name
                  }))}
                  size="sm"
                />
              </div>

              {/* Mitarbeiter filtern */}
              <div className="flex flex-col gap-1 min-w-[180px]">
                <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Mitarbeiter
                </label>
                <CustomSelect
                  value={printEmployeeFilter}
                  onChange={e => {
                    if (setPrintEmployeeFilter) setPrintEmployeeFilter(e.target.value);
                  }}
                  options={[
                    { value: 'all', label: 'Alle Mitarbeiter' },
                    ...(availableEmployeesForPrintFilter || availableEmployeesForFilter || []).map(e => ({
                      value: e.id,
                      label: e.name
                    }))
                  ]}
                  size="sm"
                />
              </div>

              {/* 1. Wochenübersicht Toggle-Button: Icon rose-600 */}
              <button
                type="button"
                onClick={() => setPrintWeeklySummary?.(prev => !prev)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition group text-left cursor-pointer shadow-xs ${
                  printWeeklySummary
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
                title="Wochenübersicht der Arbeitsstunden und Schichten beim Drucken anhängen."
              >
                <div className={`p-1.5 rounded-lg transition transform group-hover:scale-105 ${
                  printWeeklySummary ? 'bg-rose-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  <CalendarCheck2 size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="block text-xs font-bold leading-tight">
                      Wochenübersicht
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      printWeeklySummary 
                        ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {printWeeklySummary ? 'Aktiv' : 'Aus'}
                    </span>
                  </div>
                  <span className="block text-[10px] text-gray-500 dark:text-gray-400">
                    Zusammenfassung mitdrucken
                  </span>
                </div>
              </button>

              {/* Trennlinie */}
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

              {/* 2. Drucken-Button: Icon rose-500 */}
              <button
                onClick={onPrint}
                className="flex items-center gap-2.5 px-3.5 py-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 rounded-xl transition group text-left shadow-sm hover:shadow cursor-pointer"
                title="Dienstplan drucken oder als PDF speichern"
              >
                <div className="p-1.5 bg-rose-500 text-white rounded-lg group-hover:scale-105 transition transform">
                  <Printer size={18} />
                </div>
                <div>
                  <span className="block text-xs font-bold text-gray-800 dark:text-gray-100">
                    Plan drucken / PDF
                  </span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    Druckansicht öffnen
                  </span>
                </div>
              </button>
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default RibbonMenu;
