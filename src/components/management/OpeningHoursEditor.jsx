import React, { useState } from 'react';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';
import { isValidTime, timeToMinutes, minutesToTime } from '../../utils/timeUtils';

const initialEdgeTimesTemplate = WEEK_DAYS_PLAN.reduce((acc, day) => ({ ...acc, [day]: [] }), {});

const OpeningHoursEditor = ({ group, onUpdateGroup }) => {
  // KEINE Imports hier, da WEEK_DAYS_PLAN, timeToMinutes, minutesToTime global in App.jsx verfügbar sind
  // oder von App.jsx selbst importiert werden.

  // NEU: useState für die temporäre Eingabe einer neuen Randzeit (bleibt global für die Komponente)
  const [newEdgeTime, setNewEdgeTime] = useState({ start: '', end: '' });

  // NEU: handleAddEdgeTime Funktion (muss den 'day' erhalten)
  const handleAddEdgeTime = (day) => {
    const currentEdgeTimes = group.edgeTimes?.[day] || [];

    // Falls keine Öffnungszeiten gesetzt sind, Standardwert nehmen
    const openingRanges = group.openingHours?.[day] || [];
    let newStart = '08:00';
    let newEnd = '08:30';

    if (openingRanges.length > 0) {
      // Ersten Öffnungsbereich nehmen
      const firstOpening = openingRanges[0];
      newStart = firstOpening.start;

      // Ende = Start + 30 Minuten
      const startMinutes = timeToMinutes(firstOpening.start);
      const endMinutes = startMinutes + 30;
      newEnd = minutesToTime(endMinutes);
    }

    const newRange = { start: newStart, end: newEnd };

    onUpdateGroup({
      ...group,
      edgeTimes: {
        ...group.edgeTimes,
        [day]: [...currentEdgeTimes, newRange],
      },
    });
  };

  const handleEdgeTimeChange = (day, index, field, value) => {
    const newEdgeTimes = [...(group.edgeTimes?.[day] || [])];
    newEdgeTimes[index] = { ...newEdgeTimes[index], [field]: value };
    onUpdateGroup({
      ...group,
      edgeTimes: {
        ...group.edgeTimes,
        [day]: newEdgeTimes,
      },
    });
  };


  // NEU: handleRemoveEdgeTime Funktion (muss den 'day' und den 'index' erhalten)
  const handleRemoveEdgeTime = (day, indexToRemove) => {
    onUpdateGroup(prevGroup => ({
      ...prevGroup,
      edgeTimes: {
        ...(prevGroup.edgeTimes || initialEdgeTimesTemplate),
        [day]: (prevGroup.edgeTimes?.[day] || []).filter((_, index) => index !== indexToRemove), // Randzeit vom spezifischen Tag entfernen
      },
    }));
  };

  const handleDayToggle = (dayToToggle, checked) => {
    const updatedDaysWithOpeningHours = {
      ...group.daysWithOpeningHours,
      [dayToToggle]: checked,
    };

    let updatedOpeningHours = { ...group.openingHours };
    if (!checked) {
      // If day is disabled, clear its opening hours
      updatedOpeningHours[dayToToggle] = [];
    } else {
      // If day is enabled and has no hours, pre-fill with default
      if (!updatedOpeningHours[dayToToggle] || updatedOpeningHours[dayToToggle].length === 0) {
        // No default times, leave empty
        updatedOpeningHours[dayToToggle] = [];
      }
    }

    onUpdateGroup({
      ...group,
      openingHours: updatedOpeningHours,
      daysWithOpeningHours: updatedDaysWithOpeningHours,
    });
  };

  const handleAddTimeRange = (day) => {
    const currentDayHours = group.openingHours?.[day] || [];
    let newStartMinutes = timeToMinutes('08:00');
    let newEndMinutes = timeToMinutes('12:00'); // Default 4-hour block

    // Find the latest existing end time for the current day
    if (currentDayHours.length > 0) {
      const latestEndTime = Math.max(...currentDayHours.map(range => timeToMinutes(range.end)));
      newStartMinutes = latestEndTime;
      newEndMinutes = latestEndTime + (4 * 60); // Default to 4 hours after the last block
    }

    // Ensure new range doesn't go past 24:00
    if (newEndMinutes > 24 * 60) {
      newEndMinutes = 24 * 60;
      if (newStartMinutes >= newEndMinutes) { // If start also pushed too far, adjust
        newStartMinutes = newEndMinutes - 60; // At least 1 hour block
      }
    }

    const newRange = { start: minutesToTime(newStartMinutes), end: minutesToTime(newEndMinutes) };

    // Prevent adding an identical range
    const isDuplicate = currentDayHours.some(
      range => range.start === newRange.start && range.end === newRange.end
    );

    if (isDuplicate) {
      // Optionally, show a message or adjust the proposed time further
      // For now, just prevent adding
      // alert('Dieser Zeitbereich existiert bereits oder überlappt. Bitte passen Sie die Zeiten an.');
      return;
    }

    const newHours = [...currentDayHours, newRange];
    onUpdateGroup({
      ...group,
      openingHours: {
        ...group.openingHours,
        [day]: newHours,
      },
    });
  };

  const handleRemoveTimeRange = (day, index) => {
    const newHours = (group.openingHours?.[day] || []).filter((_, i) => i !== index);
    onUpdateGroup({
      ...group,
      openingHours: {
        ...group.openingHours,
        [day]: newHours,
      },
    });
  };

  const handleTimeChange = (day, index, field, value) => {
    const newHours = [...(group.openingHours?.[day] || [])];
    newHours[index] = { ...newHours[index], [field]: value };
    onUpdateGroup({
      ...group,
      openingHours: {
        ...group.openingHours,
        [day]: newHours,
      },
    });
  };

  const handleApplyMondayToAllWeek = () => {
    const mondayOpeningHours = group.openingHours['Montag'] || [];
    const mondayDaysWithOpeningHours = group.daysWithOpeningHours['Montag'] ?? false;
    const mondayEdgeTimes = group.edgeTimes?.['Montag'] || []; // NEU: Montags Randzeiten holen

    onUpdateGroup(prevGroup => {
      const updatedOpeningHours = { ...prevGroup.openingHours };
      const updatedDaysWithOpeningHours = { ...prevGroup.daysWithOpeningHours };
      const updatedEdgeTimes = { ...(prevGroup.edgeTimes || initialEdgeTimesTemplate) }; // NEU: Initialisieren, falls nicht vorhanden

      WEEK_DAYS_PLAN.forEach(dayOfWeek => { // Umbenannt, um Konflikt mit 'day' im äußeren Scope zu vermeiden
        if (dayOfWeek !== 'Montag') {
          updatedOpeningHours[dayOfWeek] = [...mondayOpeningHours];
          updatedDaysWithOpeningHours[dayOfWeek] = mondayDaysWithOpeningHours;
          updatedEdgeTimes[dayOfWeek] = [...mondayEdgeTimes]; // NEU: Montags Randzeiten auf andere Tage anwenden
        }
      });
      return {
        ...prevGroup,
        openingHours: updatedOpeningHours,
        daysWithOpeningHours: updatedDaysWithOpeningHours,
        edgeTimes: updatedEdgeTimes, // NEU: Aktualisierte Randzeiten zurückgeben
      };
    });
  };

  const handleClearDay = (day) => {
    onUpdateGroup(prevGroup => ({
      ...prevGroup,
      openingHours: {
        ...prevGroup.openingHours,
        [day]: [],
      },
      daysWithOpeningHours: {
        ...prevGroup.daysWithOpeningHours,
        [day]: false,
      },
      edgeTimes: { // NEU: Randzeiten für diesen Tag löschen
        ...(prevGroup.edgeTimes || initialEdgeTimesTemplate),
        [day]: [],
      }
    }));
  };

  return (
    <div className="w-full space-y-3">
      <div className="pb-1 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          Öffnungszeiten &amp; Randzeiten
        </h4>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          Lege fest, an welchen Wochentagen und zu welchen Zeiten die Gruppe geöffnet ist.
        </p>
      </div>

      <div className="space-y-3"> {/* Container for all weekdays */}
        {WEEK_DAYS_PLAN.map(day => {
          const currentDayHours = group.openingHours?.[day] || [];
          const isDayEnabled = group.daysWithOpeningHours?.[day] ?? false;

          return (
            <div key={day} className="p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm transition">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor={`day-enabled-${group.id}-${day}`} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id={`day-enabled-${group.id}-${day}`}
                    checked={isDayEnabled}
                    onChange={(e) => handleDayToggle(day, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer focus:ring-blue-400"
                  />
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{day}</span>
                </label>
                <div className="flex items-center gap-2">
                  {day === 'Montag' && (
                    <button
                      type="button"
                      onClick={handleApplyMondayToAllWeek}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition active:scale-95"
                    >
                      Auf ganze Woche anwenden
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleClearDay(day)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition active:scale-95"
                  >
                    Zeiten löschen
                  </button>
                </div>
              </div>

              {!isDayEnabled ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic mt-1">Dieser Tag ist für Öffnungszeiten deaktiviert.</p>
              ) : (
                <>
                  {currentDayHours.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">Keine Öffnungszeiten für diesen Tag festgelegt.</p>
                  ) : (
                    <div className="space-y-2 mb-2">
                      {currentDayHours.map((range, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={range.start}
                            onChange={(e) => handleTimeChange(day, index, 'start', e.target.value)}
                            className="p-1.5 px-2.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg w-28 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
                          />
                          <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">-</span>
                          <input
                            type="time"
                            value={range.end}
                            onChange={(e) => handleTimeChange(day, index, 'end', e.target.value)}
                            className="p-1.5 px-2.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg w-28 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTimeRange(day, index)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-md transition hover:bg-red-50 dark:hover:bg-red-900/30"
                            title="Zeitbereich entfernen"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAddTimeRange(day)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition active:scale-95 mr-2"
                  >
                    + Zeitbereich hinzufügen
                  </button>

                  {/* Randzeiten-Sektion pro Tag */}
                  <div className="mt-3 p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 rounded-lg">
                    <label className="block text-blue-900 dark:text-blue-300 text-xs font-bold mb-1">Randzeiten für {day}</label>
                    <p className="text-blue-700/80 dark:text-blue-400/80 text-[11px] mb-2">
                      Warnungen zu geringer Personalbesetzung werden während dieser Zeiten nicht angezeigt.
                    </p>

                    {/* Randzeiten-Liste (editierbar) */}
                    <div className="mb-2">
                      {(group.edgeTimes?.[day] && group.edgeTimes[day].length > 0) ? (
                        group.edgeTimes[day].map((range, index) => (
                          <div key={index} className="flex items-center gap-2 mb-1.5">
                            <input
                              type="time"
                              value={range.start}
                              onChange={(e) => handleEdgeTimeChange(day, index, 'start', e.target.value)}
                              className="p-1.5 px-2.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg w-28 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
                            />
                            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">-</span>
                            <input
                              type="time"
                              value={range.end}
                              onChange={(e) => handleEdgeTimeChange(day, index, 'end', e.target.value)}
                              className="p-1.5 px-2.5 text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg w-28 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveEdgeTime(day, index)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-md transition hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Randzeit entfernen"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-blue-600 dark:text-blue-400 text-xs italic">Noch keine Randzeiten für {day} festgelegt.</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddEdgeTime(day)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition active:scale-95"
                    >
                      + Randzeit hinzufügen
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OpeningHoursEditor;
