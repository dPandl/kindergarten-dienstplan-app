import React, { useState, useMemo } from 'react';
import { Thermometer, Search, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import BaseModal from '../common/BaseModal';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';

const SickLeaveModal = ({
  isOpen,
  onClose,
  employees = [],
  groups = [],
  sickDays = {},
  onToggleSickDay,
  onSetEmployeeSickDays,
  onClearAllSickDays
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  const groupMap = useMemo(() => {
    return new Map(groups.map(g => [g.id, g]));
  }, [groups]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGroup =
        selectedGroupFilter === 'all' ||
        (selectedGroupFilter === 'no-group' && !emp.groupId) ||
        emp.groupId === selectedGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [employees, searchTerm, selectedGroupFilter]);

  const totalSickEntries = useMemo(() => {
    return Object.values(sickDays).reduce((acc, days) => acc + (days || []).length, 0);
  }, [sickDays]);

  const shortDayLabels = {
    Montag: 'Mo',
    Dienstag: 'Di',
    Mittwoch: 'Mi',
    Donnerstag: 'Do',
    Freitag: 'Fr'
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Krankmeldungen verwalten"
      icon={Thermometer}
      maxWidth="max-w-4xl"
      height="h-[85vh] max-h-[85vh]"
      zIndex={115}
      bodyClassName="p-6 flex-grow flex flex-col min-h-0 overflow-hidden space-y-4"
    >
      {/* Info-Banner */}
      <div className="shrink-0 flex items-start gap-3 p-4 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl text-sm text-rose-900 dark:text-rose-200">
        <Thermometer className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Automatische Ausblendung &amp; Besetzungswarnungen</p>
          <p className="text-xs text-rose-800/90 dark:text-rose-300/90 leading-relaxed">
            Mitarbeiter, die als krank eingetragen sind, werden am jeweiligen Tag im Dienstplan verblasst dargestellt (genau wie Azubis an Schultagen).
            Ihre Zeiten zählen an diesen Tagen <strong>nicht</strong> zur Mindestbesetzung der Gruppe, sodass Warnungen bei Unterbesetzung sofort anschlagen.
          </p>
        </div>
      </div>

      {/* Filter-Leiste & Aktionen */}
      <div className="shrink-0 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center">
          {/* Suchfeld */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Mitarbeiter suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Gruppen-Filter */}
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="py-1.5 px-3 text-sm bg-gray-50 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">Alle Gruppen</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
            <option value="no-group">Ohne Gruppe</option>
          </select>
        </div>

        {/* Alle abwählen Button */}
        {totalSickEntries > 0 && (
          <button
            type="button"
            onClick={onClearAllSickDays}
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <X size={14} />
            Alle Krankmeldungen dieser Woche löschen ({totalSickEntries})
          </button>
        )}
      </div>

      {/* Mitarbeiter-Liste - scrollt als einziges Element */}
      <div className="flex-1 min-h-0 border border-gray-200 dark:border-gray-700 rounded-xl overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
            Keine passenden Mitarbeiter gefunden.
          </div>
        ) : (
          filteredEmployees.map(emp => {
            const empSickDays = sickDays[emp.id] || [];
            const group = groupMap.get(emp.groupId);
            const isAllWeekSick = WEEK_DAYS_PLAN.every(d => empSickDays.includes(d));

            return (
              <div
                key={emp.id}
                className={`p-3.5 grid grid-cols-[minmax(180px,1fr)_auto_170px] items-center gap-3 transition-colors ${
                  empSickDays.length > 0 ? 'bg-rose-50/40 dark:bg-rose-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                {/* Spalte 1: Name & Gruppe */}
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {group && (
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${group.color || 'bg-gray-400'}`}
                      title={group.name}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">
                        {emp.name}
                      </span>
                      {empSickDays.length > 0 && (
                        <span className="shrink-0 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                          {empSickDays.length} {empSickDays.length === 1 ? 'Tag' : 'Tage'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {group ? group.name : 'Ohne Gruppe'} • {emp.contractedHoursPerWeek}h/Woche
                    </p>
                  </div>
                </div>

                {/* Spalte 2: Wochentage Toggles (feste Position) */}
                <div className="flex items-center gap-1.5 justify-center">
                  {WEEK_DAYS_PLAN.map(day => {
                    const isSick = empSickDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onToggleSickDay(emp.id, day)}
                        className={`w-11 h-9 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-colors cursor-pointer ${
                          isSick
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs ring-2 ring-rose-400/50'
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                        }`}
                        title={`${emp.name} am ${day}: ${isSick ? 'Krank (klicken für gesund)' : 'Anwesend (klicken für krank)'}`}
                      >
                        <span>{shortDayLabels[day] || day.slice(0, 2)}</span>
                        <span className="text-[9px] font-normal opacity-80">
                          {isSick ? 'Krank' : 'Da'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Spalte 3: Schnell-Aktionen (feste Breite, kein Verrutschen) */}
                <div className="flex items-center justify-end gap-1.5">
                  {!isAllWeekSick ? (
                    <button
                      type="button"
                      onClick={() => onSetEmployeeSickDays(emp.id, [...WEEK_DAYS_PLAN])}
                      className="w-28 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition text-center cursor-pointer"
                    >
                      Ganze Woche
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetEmployeeSickDays(emp.id, [])}
                      className="w-28 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg transition text-center cursor-pointer"
                    >
                      Wieder gesund
                    </button>
                  )}
                  {empSickDays.length > 0 && !isAllWeekSick ? (
                    <button
                      type="button"
                      onClick={() => onSetEmployeeSickDays(emp.id, [])}
                      className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition cursor-pointer shrink-0"
                      title="Alle Kranktage für diesen Mitarbeiter löschen"
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <span className="w-6 h-6 shrink-0" aria-hidden="true" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer-Info */}
      <div className="shrink-0 flex items-center justify-end pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          Fertig
        </button>
      </div>
    </BaseModal>
  );
};

export default SickLeaveModal;
