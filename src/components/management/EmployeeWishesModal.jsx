import React, { useState, useEffect } from 'react';
import BaseModal from '../common/BaseModal';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';
import { Sparkles, Clock, Calendar, FileText, Check, Trash2, Sun, Moon } from 'lucide-react';

const DEFAULT_DAY_WISH = {
  dayOff: false,
  startTime: '',
  endTime: '',
  disposalPreference: 'none', // 'none' | 'morning' | 'afternoon'
  note: '',
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
          (w.disposalPreference && w.disposalPreference !== 'none') ||
          (w.note && w.note.trim());
        if (hasContent) {
          cleanedWishes[day] = {
            dayOff: Boolean(w.dayOff),
            startTime: w.startTime ? w.startTime.trim() : '',
            endTime: w.endTime ? w.endTime.trim() : '',
            disposalPreference: w.disposalPreference || 'none',
            note: w.note ? w.note.trim() : '',
          };
        }
      }
    });

    onSave(employee.id, cleanedWishes);
  };

  // Zähle, an wie vielen Tagen Wünsche hinterlegt sind
  const daysWithWishesCount = WEEK_DAYS_PLAN.filter((day) => {
    const w = wishes[day];
    return (
      w &&
      (w.dayOff ||
        w.startTime ||
        w.endTime ||
        (w.disposalPreference && w.disposalPreference !== 'none') ||
        w.note)
    );
  }).length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Wünsche von ${employee.name}`}
      icon={Sparkles}
      maxWidth="max-w-2xl"
      zIndex={65}
    >
      <div className="space-y-5">
        {/* Intro Info */}
        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Wünsche dienen als unverbindliche Orientierungshilfe bei der Dienstplanerstellung und als Basis für spätere automatische Planungsassistenten.
            </span>
          </div>
          <span className="shrink-0 font-semibold px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/80 text-[11px]">
            {daysWithWishesCount} von 5 Tagen
          </span>
        </div>

        {/* Wochentag-Auswahl (Tabs) */}
        <div className="flex gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {WEEK_DAYS_PLAN.map((day) => {
            const hasWish =
              wishes[day] &&
              (wishes[day].dayOff ||
                wishes[day].startTime ||
                wishes[day].endTime ||
                (wishes[day].disposalPreference && wishes[day].disposalPreference !== 'none') ||
                wishes[day].note);
            const isSelected = selectedDay === day;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex-1 py-2 px-2 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span>{day}</span>
                <span className="h-1.5 flex items-center justify-center">
                  {hasWish && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Formular für den ausgewählten Wochentag */}
        <div className="p-4 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/80 pb-3">
            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span>Wunsch für {selectedDay}</span>
            </h4>
            <button
              type="button"
              onClick={handleClearCurrentDayWish}
              className="text-xs text-gray-400 hover:text-rose-500 flex items-center gap-1 transition"
              title="Wunsch für diesen Tag leeren"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Diesen Tag leeren</span>
            </button>
          </div>

          {/* Wunschfrei Schalter */}
          <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg border border-gray-200 dark:border-gray-600/70 cursor-pointer transition">
            <input
              type="checkbox"
              checked={currentWish.dayOff || false}
              onChange={(e) => handleUpdateCurrentDayWish({ dayOff: e.target.checked })}
              className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400 cursor-pointer"
            />
            <div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">
                🏖️ Wunschfrei (Bevorzugt kein Dienst an diesem Tag)
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
                Mitarbeiter möchte an diesem Tag nach Möglichkeit frei haben.
              </span>
            </div>
          </label>

          {/* Arbeitszeiten & VZ nur wenn nicht wunschfrei */}
          {!currentWish.dayOff && (
            <div className="space-y-4 pt-1">
              {/* Arbeitszeiten Beginn & Ende */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Gewünschte Arbeitszeiten (optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">
                      Wunsch-Beginn (z. B. frühestens ab):
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
                      Wunsch-Ende (z. B. spätestens bis):
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

              {/* Verfügungszeit (VZ) Präferenz */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verfügungszeit-Präferenz (VZ)</span>
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
                    <span>Egal / keine</span>
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
            </div>
          )}

          {/* Notiz / Begründung */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Notiz / Bemerkung (optional)
            </label>
            <input
              type="text"
              value={currentWish.note || ''}
              onChange={(e) => handleUpdateCurrentDayWish({ note: e.target.value })}
              className="w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:bg-white dark:focus:bg-gray-800 transition"
              placeholder="z. B. Kind abholen, Arzttermin, Fahrgemeinschaft..."
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
            <span>Wünsche speichern</span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default EmployeeWishesModal;
