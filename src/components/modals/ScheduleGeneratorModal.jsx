import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Check,
  Clock,
  Users,
  Copy,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  FileCheck
} from 'lucide-react';
import BaseModal from '../common/BaseModal';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';

const ScheduleGeneratorModal = ({
  isOpen,
  onClose,
  activeScheduleTitle = 'Wochenplan',
  employees = [],
  groups = [],
  facilitySettings = null,
  sickDays = {},
  onRunFullGeneration,
  onRunReplacementGeneration,
}) => {
  // Modus: 'replacement' (Ersatzplan bei Ausfall) oder 'full' (Neuer Dienstplan)
  const [mode, setMode] = useState('replacement');

  // Optionen für Ersatzplan
  const [allowOvertime, setAllowOvertime] = useState(true);
  const [convertDisposalTime, setConvertDisposalTime] = useState(true);

  // Optionen für Vollständige Generierung
  const [honorWishes, setHonorWishes] = useState(true);
  const [toleranceHours, setToleranceHours] = useState(0);
  const [includeTeamMeetings, setIncludeTeamMeetings] = useState(true);

  // Name des neuen Plans
  const [customPlanTitle, setCustomPlanTitle] = useState('');

  // Status & Bericht nach Durchführung
  const [isRunning, setIsRunning] = useState(false);
  const [resultReport, setResultReport] = useState(null);

  // Wenn das Modal neu geöffnet wird, Bericht zurücksetzen falls nötig
  React.useEffect(() => {
    if (isOpen) {
      setResultReport(null);
    }
  }, [isOpen]);

  const handleResetForm = () => {
    setResultReport(null);
  };

  // Anzahl kranker Personen ermitteln
  const sickEmployeeCount = Object.keys(sickDays).filter(
    (empId) => (sickDays[empId] || []).length > 0
  ).length;

  const [progressStep, setProgressStep] = useState(0);

  const PROGRESS_STEPS_FULL = [
    'Öffnungszeiten und Mitarbeiterverträge analysieren...',
    'Teamsitzungen aus Einrichtungseinstellungen planen...',
    'Schichten nach Ganztags-Bedarf & Arbeitszeitgesetz zuteilen...',
    'Leitungsfreistellungen & Verfügungszeiten bedarfsgerecht platzieren...',
    '2. Durchgang: Unterbesetzungen & Pausenzeiten prüfen...',
    'Plan optimieren und Gruppen-Aushilfen koordinieren...',
  ];

  const handleStartGeneration = (useV2 = false) => {
    setIsRunning(true);
    setProgressStep(0);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < PROGRESS_STEPS_FULL.length) {
        setProgressStep(currentStep);
      } else {
        clearInterval(interval);
        try {
          if (mode === 'replacement') {
            const defaultTitle = `${activeScheduleTitle} (Ersatzplan)`;
            const finalTitle = customPlanTitle.trim() || defaultTitle;
            const result = onRunReplacementGeneration({
              title: finalTitle,
              options: {
                allowOvertimeHours: allowOvertime ? 2.0 : 0.0,
                convertDisposalTimeToCare: convertDisposalTime,
              },
            });
            setResultReport({ mode: 'replacement', ...result });
          } else {
            const defaultTitle = `Neuer Dienstplan (${new Date().toLocaleDateString('de-DE')})`;
            const finalTitle = customPlanTitle.trim() || defaultTitle;
            const result = onRunFullGeneration({
              title: finalTitle,
              options: {
                honorWishes,
                toleranceWeeklyHours: Number(toleranceHours),
                includeTeamMeetings,
                useV2: !!useV2,
              },
            });
            setResultReport({ mode: 'full', ...result });
          }
        } catch (err) {
          console.error('Fehler bei der Plan-Generierung:', err);
        } finally {
          setIsRunning(false);
        }
      }
    }, 400);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Automatischer Dienstplan-Generator"
      icon={Wand2}
      maxWidth="max-w-3xl"
      zIndex={130}
    >
      <div className="space-y-5">
        {/* Modus-Auswahl (Tabs) */}
        {!resultReport && (
          <>
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setMode('replacement')}
                className={`flex items-start gap-3 p-3 rounded-lg text-left transition ${
                  mode === 'replacement'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200/60 dark:border-blue-700/60'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    mode === 'replacement'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span className="font-bold text-xs block text-gray-900 dark:text-gray-100">
                    Ersatzplan bei Ausfall / Krankheit
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block leading-relaxed">
                    Repariert Lücken im aktuellen Plan bei möglichst minimalen Änderungen.
                  </span>
                  {sickEmployeeCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1">
                      ⚠️ {sickEmployeeCount} Mitarbeiter krank gemeldet
                    </span>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('full')}
                className={`flex items-start gap-3 p-3 rounded-lg text-left transition ${
                  mode === 'full'
                    ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-200/60 dark:border-purple-700/60'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    mode === 'full'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="font-bold text-xs block text-gray-900 dark:text-gray-100">
                    Vollständiger Plan (Neuerstellung)
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 block leading-relaxed">
                    Erstellt einen komplett neuen Wochenplan anhand von Öffnungszeiten &amp; Verträgen.
                  </span>
                </div>
              </button>
            </div>

            {/* Sicherheits-Hinweis Kopie */}
            <div className="flex items-center gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              <Copy className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Dein bisheriger Plan bleibt sicher:</strong> Das Ergebnis wird automatisch als
                neuer, separater Wochenplan angelegt.
              </span>
            </div>

            {/* Optionen je nach Modus */}
            <div className="p-4 bg-gray-50/70 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Einstellungen &amp; Parameter</span>
              </h4>

              {mode === 'replacement' ? (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={convertDisposalTime}
                      onChange={(e) => setConvertDisposalTime(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-400 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                        Verfügungszeiten (VZ) bei Bedarf in Betreuung wandeln
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        Zieht gesunde Kollegen in Notfällen temporär aus der Vorbereitungszeit in den Gruppendienst ab.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowOvertime}
                      onChange={(e) => setAllowOvertime(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-400 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                        Leichte Schichtverlängerungen erlauben (bis zu 2h Überstunden)
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        Ermöglicht es gesunden Kollegen, 30–60 Min. früher zu beginnen oder länger zu bleiben, um Randzeiten zu decken.
                      </span>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={honorWishes}
                      onChange={(e) => setHonorWishes(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-400 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                        Mitarbeiterwünsche (⭐) bestmöglich berücksichtigen
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        Feste Vorgaben (🔒) werden immer strikt eingehalten. Wünsche werden priorisiert, wenn personell möglich.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTeamMeetings}
                      onChange={(e) => setIncludeTeamMeetings(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-400 mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                        Teamsitzungen aus Einrichtungseinstellungen berücksichtigen
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                        Trägt definierte Teamsitzungen automatisch ein. Bei 2-wöchigen Abend-Sitzungen wird für Teilzeitkräfte automatisch die halbe Zeit angerechnet.
                      </span>
                    </div>
                  </label>

                  <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      Wochenstunden-Toleranz: ± {toleranceHours} Std.
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.5"
                      value={toleranceHours}
                      onChange={(e) => setToleranceHours(e.target.value)}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-1">
                      Erlaubt dem Generator einen kleinen Spielraum für saubere Schichtblöcke.
                    </span>
                  </div>
                </div>
              )}

              {/* Titel des neuen Wochenplans */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Name für den neuen Wochenplan:
                </label>
                <input
                  type="text"
                  placeholder={
                    mode === 'replacement'
                      ? `${activeScheduleTitle} (Ersatzplan)`
                      : `Neuer Dienstplan (${new Date().toLocaleDateString('de-DE')})`
                  }
                  value={customPlanTitle}
                  onChange={(e) => setCustomPlanTitle(e.target.value)}
                  className="w-full p-2 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>
          </>
        )}

        {/* Ergebnisbericht nach Generierung */}
        {resultReport && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold text-sm">
                <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Neuer Wochenplan erfolgreich erstellt und aktiviert!</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                Dein vorheriger Plan blieb unverändert erhalten. Du kannst jederzeit über "Wochenpläne" zwischen den Versionen wechseln.
              </p>
            </div>

            {/* Protokoll der Änderungen bei Ersatzplan */}
            {resultReport.changeLog && resultReport.changeLog.length > 0 && (
              <div className="p-4 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>Vorgenommene Vertretungs-Anpassungen ({resultReport.changeLog.length})</span>
                </h5>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/60 text-xs max-h-48 overflow-y-auto pr-1">
                  {resultReport.changeLog.map((c, i) => (
                    <li key={i} className="py-1.5 flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-700 text-[10px] font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                        {c.dayOfWeek}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{c.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Eventuell verbleibende Lücken */}
            {resultReport.remainingDeficits && resultReport.remainingDeficits.length > 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Achtung: Es verbleiben noch personelle Engpässe:</span>
                </p>
                <p className="mt-0.5 text-[11px]">
                  An {resultReport.remainingDeficits.length} Zeitfenstern (15-Minuten-Slots) konnte nicht die volle Mindestbesetzung erreicht werden.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                <span>Hervorragend! Alle Öffnungszeiten, Mindestbesetzungen und Pausen sind lückenlos abgedeckt.</span>
              </div>
            )}

            {/* Mitarbeiter-Auslastungs-Übersicht bei Vollgenerierung */}
            {resultReport.report?.employeeUtilization && (
              <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-500" />
                  <span>Mitarbeiter-Auslastung ({resultReport.report.employeeUtilization.length} Kräfte)</span>
                </h5>
                <div className="max-h-40 overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-1 font-medium">Name</th>
                        <th className="pb-1 font-medium text-right">Soll (h)</th>
                        <th className="pb-1 font-medium text-right">Ist (h)</th>
                        <th className="pb-1 font-medium text-right">Betreuung</th>
                        <th className="pb-1 font-medium text-right">VZ</th>
                        <th className="pb-1 font-medium text-right">Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {resultReport.report.employeeUtilization.map((emp) => {
                        const diffNum = Number(emp.difference);
                        return (
                          <tr key={emp.id} className="text-gray-700 dark:text-gray-300">
                            <td className="py-1 font-medium truncate max-w-[130px]">{emp.name}</td>
                            <td className="py-1 text-right text-gray-500">{emp.targetHours}h</td>
                            <td className="py-1 text-right font-semibold">{emp.assignedHours}h</td>
                            <td className="py-1 text-right text-orange-600 dark:text-orange-400">{emp.assignedCareHours || '0.0'}h</td>
                            <td className="py-1 text-right text-emerald-600 dark:text-emerald-400">{emp.assignedDisposalHours || '0.0'}h</td>
                            <td className={`py-1 text-right font-bold ${
                              Math.abs(diffNum) <= 0.2
                                ? 'text-blue-600 dark:text-blue-400'
                                : diffNum > 0
                                ? 'text-amber-600'
                                : 'text-blue-500'
                            }`}>
                              {diffNum > 0 ? `+${emp.difference}` : emp.difference}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buttons unten */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {!resultReport ? (
            <>
              {isRunning && (
                <div className="flex-1 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium animate-pulse">
                  <Sparkles size={14} className="shrink-0" />
                  <span>{PROGRESS_STEPS_FULL[progressStep]}</span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={isRunning}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-xs transition cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleStartGeneration(false)}
                disabled={isRunning}
                className={`flex items-center gap-2 px-5 py-2 text-white font-semibold rounded-lg text-xs shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                  mode === 'replacement'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Wand2 size={14} className={isRunning ? 'animate-spin' : ''} />
                <span>{isRunning ? 'Optimierung läuft...' : 'Plan generieren (Legacy)'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleStartGeneration(true)}
                disabled={isRunning}
                className={`flex items-center gap-2 px-5 py-2 text-white font-semibold rounded-lg text-xs shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-purple-500/30`}
              >
                <Sparkles size={14} className={isRunning ? 'animate-spin' : ''} />
                <span>{isRunning ? 'Optimierung läuft...' : 'Plan generieren (V2 NEU)'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg text-xs transition cursor-pointer"
              >
                Neuen Plan konfigurieren
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-md transition cursor-pointer"
              >
                Fertig &amp; Plan ansehen
              </button>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default ScheduleGeneratorModal;
