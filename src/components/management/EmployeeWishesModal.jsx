import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';
import { Sparkles, Clock, Calendar, FileText, Check, Trash2, Sun, Moon, Lock, ShieldCheck } from 'lucide-react';

const DEFAULT_DAY_WISH = {
  requirementType: 'wish', // 'wish' (unverbindlich) | 'fixed' (feste Vorgabe)
  dayOff: false,
  startTime: '',
  endTime: '',
  shiftType: 'all', // 'all' | 'early' | 'late' (nur früh / nur spät)
  disposalPreference: 'none', // 'none' | 'morning' | 'afternoon'
  leadershipPreference: 'none', // 'none' | 'morning' | 'afternoon'
  note: '',
  allowLF: true,
  allowVZ: true,
};

const EmployeeWishesModal = ({
  isOpen,
  onClose,
  employee,
  onSave,
}) => {
  const [selectedDay, setSelectedDay] = useState(WEEK_DAYS_PLAN[0]);
  const [wishes, setWishes] = useState({});

  useEffect(() => {
    if (employee) {
      // Tiefenkopie der existierenden Wünsche oder leeres Template
      const initial = {};
      WEEK_DAYS_PLAN.forEach((day) => {
        initial[day] = {
          ...DEFAULT_DAY_WISH,
          ...(employee.wishes?.[day] || {}),
        };
      });
      setWishes(initial);
      setSelectedDay(WEEK_DAYS_PLAN[0]);
    }
  }, [employee, isOpen]);

  if (!employee) return null;

  const currentWish = wishes[selectedDay] || DEFAULT_DAY_WISH;

  const handleUpdateCurrentDayWish = (updates) => {
    setWishes((prev) => ({
      ...prev,
      [selectedDay]: {
        ...(prev[selectedDay] || DEFAULT_DAY_WISH),
        ...updates,
      },
    }));
  };

  const handleClearCurrentDayWish = () => {
    setWishes((prev) => ({
      ...prev,
      [selectedDay]: { ...DEFAULT_DAY_WISH },
    }));
  };

  const handleSave = () => {
    // Filtere komplett leere Wünsche heraus für saubere Daten
    const cleanedWishes = {};
    WEEK_DAYS_PLAN.forEach((day) => {
      const w = wishes[day];
      if (w) {
        const hasContent =
          w.dayOff ||
          (w.startTime && w.startTime.trim()) ||
          (w.endTime && w.endTime.trim()) ||
          (w.shiftType && w.shiftType !== 'all') ||
          (w.disposalPreference && w.disposalPreference !== 'none') ||
          (w.leadershipPreference && w.leadershipPreference !== 'none') ||
          (w.note && w.note.trim()) ||
          w.allowLF === false ||
          w.allowVZ === false;
        if (hasContent) {
          cleanedWishes[day] = {
            requirementType: w.requirementType || 'wish', // 'wish' | 'fixed'
            dayOff: Boolean(w.dayOff),
            startTime: w.startTime ? w.startTime.trim() : '',
            endTime: w.endTime ? w.endTime.trim() : '',
            shiftType: w.shiftType || 'all',
            disposalPreference: w.disposalPreference || 'none',
            leadershipPreference: w.leadershipPreference || 'none',
            note: w.note ? w.note.trim() : '',
            allowLF: w.allowLF !== false,
            allowVZ: w.allowVZ !== false,
          };
        }
      }
    });

    onSave(employee.id, cleanedWishes);
  };

  const fixedDaysCount = WEEK_DAYS_PLAN.filter((day) => {
    const w = wishes[day];
    return w && (
      (w.requirementType === 'fixed' && (w.dayOff || w.startTime || w.endTime || (w.shiftType && w.shiftType !== 'all') || w.note)) ||
      w.allowLF === false ||
      w.allowVZ === false
    );
  }).length;

  const wishDaysCount = WEEK_DAYS_PLAN.filter((day) => {
    const w = wishes[day];
    return w && (
      (w.requirementType !== 'fixed' && (w.dayOff || w.startTime || w.endTime || (w.shiftType && w.shiftType !== 'all') || w.note)) ||
      (w.disposalPreference && w.disposalPreference !== 'none') ||
      (w.leadershipPreference && w.leadershipPreference !== 'none')
    );
  }).length;

  const isCurrentFixed = currentWish.requirementType === 'fixed';

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Arbeitszeiten & Wünsche: ${employee.name}`}
      icon={Sparkles}
      maxWidth="max-w-2xl"
      zIndex={65}
    >
      <div className="space-y-4">
        {/* Intro Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gradient-to-r from-blue-50/80 to-amber-50/80 dark:from-blue-950/30 dark:to-amber-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Definiere <strong>feste Vorgaben</strong> (z. B. feste Arbeitszeiten, freie Tage) oder <strong>unverbindliche Wünsche</strong> je Wochentag.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {fixedDaysCount > 0 && (
              <span className="font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[11px] flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                <Lock size={10} className="text-blue-600 dark:text-blue-400" />
                {fixedDaysCount} {fixedDaysCount === 1 ? 'feste Vorgabe' : 'feste Vorgaben'}
              </span>
            )}
            {wishDaysCount > 0 && (
              <span className="font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                <Sparkles size={10} className="text-amber-600 dark:text-amber-400" />
                {wishDaysCount} {wishDaysCount === 1 ? 'Wunsch' : 'Wünsche'}
              </span>
            )}
            {fixedDaysCount === 0 && wishDaysCount === 0 && (
              <span className="text-gray-400 dark:text-gray-500 text-[11px]">Keine Vorgaben hinterlegt</span>
            )}
          </div>
        </div>

        {/* Wochentag-Auswahl (Tabs) */}
        <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {WEEK_DAYS_PLAN.map((day) => {
            const dayEntry = wishes[day];
            const hasData =
              dayEntry &&
              (dayEntry.dayOff ||
                dayEntry.startTime ||
                dayEntry.endTime ||
                (dayEntry.shiftType && dayEntry.shiftType !== 'all') ||
                (dayEntry.disposalPreference && dayEntry.disposalPreference !== 'none') ||
                dayEntry.note ||
                dayEntry.allowLF === false ||
                dayEntry.allowVZ === false);
            const isFixed = hasData && (
              (dayEntry.requirementType === 'fixed' && (dayEntry.dayOff || dayEntry.startTime || dayEntry.endTime || (dayEntry.shiftType && dayEntry.shiftType !== 'all') || dayEntry.note)) ||
              dayEntry.allowLF === false ||
              dayEntry.allowVZ === false
            );
            const isSelected = selectedDay === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span>{day}</span>
                <span className="h-2 flex items-center justify-center">
                  {hasData && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFixed
                          ? 'bg-blue-600 dark:bg-blue-400 ring-2 ring-blue-300/60 dark:ring-blue-800/80'
                          : 'bg-amber-500 dark:bg-amber-400'
                      }`}
                      title={isFixed ? 'Feste Vorgabe' : 'Wunsch'}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Formular für den ausgewählten Wochentag */}
        <div className="p-4 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-3">
            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Einstellungen für {selectedDay}</span>
            </h4>
            <button
              type="button"
              onClick={handleClearCurrentDayWish}
              className="text-xs text-gray-400 hover:text-rose-500 flex items-center gap-1 transition"
              title="Einstellungen für diesen Tag leeren"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Diesen Tag leeren</span>
            </button>
          </div>

          {/* BLOCK 1: Abhängig von der Verbindlichkeit */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 p-3.5 rounded-xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Priorität der Arbeitszeiten für diesen Tag:</span>
              </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateCurrentDayWish({ requirementType: 'fixed' })}
                className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition flex items-start gap-2.5 ${
                  isCurrentFixed
                    ? 'border-blue-500 bg-blue-50/90 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 shadow-xs ring-2 ring-blue-400/40'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${isCurrentFixed ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  <Lock size={14} />
                </div>
                <div>
                  <span className="block font-bold">Feste Vorgabe (Muss)</span>
                  <span className="block text-[11px] font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                    Gilt verbindlich (z. B. immer nur vormittags oder fester freier Tag).
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateCurrentDayWish({ requirementType: 'wish' })}
                className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition flex items-start gap-2.5 ${
                  !isCurrentFixed
                    ? 'border-amber-400 bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100 shadow-xs ring-2 ring-amber-300/40'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-700/40 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${!isCurrentFixed ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  <Sparkles size={14} />
                </div>
                <div>
                  <span className="block font-bold">Unverbindlicher Wunsch (Kann)</span>
                  <span className="block text-[11px] font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                    Soll nach Möglichkeit berücksichtigt werden, wenn personell machbar.
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Freier Tag Schalter */}
          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
            currentWish.dayOff
              ? isCurrentFixed
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : 'bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60 border-gray-200 dark:border-gray-600/70'
          }`}>
            <input
              type="checkbox"
              checked={currentWish.dayOff || false}
              onChange={(e) => handleUpdateCurrentDayWish({ dayOff: e.target.checked })}
              className={`w-4 h-4 rounded border-gray-300 cursor-pointer ${
                isCurrentFixed
                  ? 'text-blue-600 focus:ring-blue-400'
                  : 'text-amber-500 focus:ring-amber-400'
              }`}
            />
            <div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                {isCurrentFixed ? '🔒 Fester freier Tag (Kein Dienst an diesem Tag)' : '🏖️ Wunschfrei (Bevorzugt kein Dienst)'}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                {isCurrentFixed
                  ? 'Mitarbeiter darf an diesem Tag nicht für Dienste eingeteilt werden.'
                  : 'Mitarbeiter möchte an diesem Tag nach Möglichkeit frei haben.'}
              </span>
            </div>
          </label>

          {/* Arbeitszeiten & Schichten nur wenn nicht freier Tag */}
          {!currentWish.dayOff && (
            <div className="space-y-4 pt-1">
              {/* Arbeitszeiten Beginn & Ende */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${isCurrentFixed ? 'text-blue-600 dark:text-blue-400' : 'text-amber-500'}`} />
                  <span>{isCurrentFixed ? 'Feste Arbeitszeit / Zeitfenster (optional)' : 'Gewünschte Arbeitszeiten (optional)'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">
                      {isCurrentFixed ? 'Fester Beginn (oder frühestens ab):' : 'Wunsch-Beginn (z. B. frühestens ab):'}
                    </span>
                    <input
                      type="time"
                      value={currentWish.startTime || ''}
                      onChange={(e) => handleUpdateCurrentDayWish({ startTime: e.target.value })}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-800 transition"
                      placeholder="HH:MM"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">
                      {isCurrentFixed ? 'Festes Ende (oder spätestens bis):' : 'Wunsch-Ende (z. B. spätestens bis):'}
                    </span>
                    <input
                      type="time"
                      value={currentWish.endTime || ''}
                      onChange={(e) => handleUpdateCurrentDayWish({ endTime: e.target.value })}
                      className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-800 transition"
                      placeholder="HH:MM"
                    />
                  </div>
                </div>
              </div>

              {/* Schicht-Einschränkung (Nur Frühdienst / Nur Spätdienst) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isCurrentFixed ? 'Feste Schicht-Art' : 'Bevorzugte Schicht-Art'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentDayWish({ shiftType: 'all' })}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                      currentWish.shiftType === 'all' || !currentWish.shiftType
                        ? isCurrentFixed
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                          : 'border-amber-400 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 font-semibold shadow-2xs'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <span>Beliebig (Früh & Spät)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentDayWish({ shiftType: 'early' })}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                      currentWish.shiftType === 'early'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 font-semibold shadow-2xs'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>{isCurrentFixed ? 'Nur Vormittag / Früh' : 'Bevorzugt Früh'}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentDayWish({ shiftType: 'late' })}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                      currentWish.shiftType === 'late'
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold shadow-2xs'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{isCurrentFixed ? 'Nur Nachmittag / Spät' : 'Bevorzugt Spät'}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

          {/* BLOCK 2: Unabhängig von der Verbindlichkeit */}
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 p-3.5 rounded-xl space-y-4">
            <h5 className="font-semibold text-[13px] text-emerald-800 dark:text-emerald-300 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Sondertätigkeiten (Unabhängig von der Priorität oben)
            </h5>
            
            {/* VZ und LF Einstellungen werden auch an freien Tagen ausgeblendet, weil es dann keinen Sinn macht */}
            {!currentWish.dayOff && (
              <div className="space-y-4">
                {/* Verfügungszeit (VZ) Präferenz */}
                <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Genereller Wunsch: Verfügungszeit-Lage (VZ)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentDayWish({ disposalPreference: 'none' })}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                      currentWish.disposalPreference === 'none' || !currentWish.disposalPreference
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <span>Egal / flexibel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentDayWish({ disposalPreference: 'morning' })}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                      currentWish.disposalPreference === 'morning'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Vormittags</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCurrentDayWish({ disposalPreference: 'afternoon' })}
                    className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                      currentWish.disposalPreference === 'afternoon'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Nachmittags</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Leitungsfreistellung Präferenz */}
              {Number(employee.leadershipReleasePercent) > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span>Genereller Wunsch: Leitungsfreistellung-Lage (LF)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentDayWish({ leadershipPreference: 'none' })}
                      className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                        currentWish.leadershipPreference === 'none' || !currentWish.leadershipPreference
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <span>Egal / flexibel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentDayWish({ leadershipPreference: 'morning' })}
                      className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                        currentWish.leadershipPreference === 'morning'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Vormittags</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentDayWish({ leadershipPreference: 'afternoon' })}
                      className={`p-2 rounded-lg text-xs font-medium border text-center transition flex flex-col items-center gap-1 ${
                        currentWish.leadershipPreference === 'afternoon'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold shadow-2xs'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Nachmittags</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Aufgaben-Erlaubnis (LF/VZ) */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-red-500" />
                  <span>Feste Vorgabe: Sondertätigkeiten an diesem Tag zulassen?</span>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={currentWish.allowLF !== false} 
                      onChange={(e) => handleUpdateCurrentDayWish({ allowLF: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" 
                    />
                    <span className="text-gray-700 dark:text-gray-300">Leitungsfreistellung (LF) darf heute geplant werden</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={currentWish.allowVZ !== false} 
                      onChange={(e) => handleUpdateCurrentDayWish({ allowVZ: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" 
                    />
                    <span className="text-gray-700 dark:text-gray-300">Verfügungszeit (VZ) darf heute geplant werden</span>
                  </label>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Notiz / Bemerkung */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Notiz / Bemerkung (optional)
            </label>
            <input
              type="text"
              value={currentWish.note || ''}
              onChange={(e) => handleUpdateCurrentDayWish({ note: e.target.value })}
              className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-800 transition"
              placeholder="z. B. Immer nur morgens bis 13:00 Uhr, Kindbetreuung, etc."
            />
          </div>
        </div>

        {/* Buttons unten */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-xs transition"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Check size={14} />
            <span>Speichern</span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default EmployeeWishesModal;
