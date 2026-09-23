import React from 'react';
import { UserPlus, Edit2, Trash2, Sparkles } from 'lucide-react';

const EmployeeListModalContent = ({
  sortedEmployees,
  groups,
  getTextColorForBg,
  onEditEmployee,
  onDeleteEmployee,
  onOpenAddModal,
  onOpenWishes,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Bar inside Modal: Schneller Button zum Hinzufügen */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Aktuell eingetragene Mitarbeiter ({sortedEmployees.length})
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Klicke auf "Bearbeiten" für Stammdaten oder auf "Wünsche", um Arbeitszeit-Präferenzen zu hinterlegen.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <UserPlus size={15} />
          <span>Mitarbeiter hinzufügen</span>
        </button>
      </div>

      {/* Mitarbeiter Liste */}
      {sortedEmployees.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="font-medium">Noch keine Mitarbeiter vorhanden.</p>
          <p className="text-xs mt-1">Klicke oben auf "Mitarbeiter hinzufügen", um zu beginnen.</p>
        </div>
      ) : (
        <ul className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {sortedEmployees.map((employee) => {
            const employeeGroup = groups.find((g) => g.id === employee.groupId);
            const groupColorClass = employeeGroup?.color || 'bg-gray-100 dark:bg-gray-700';
            const groupTextColorClass = getTextColorForBg(groupColorClass);

            const wishesCount = Object.values(employee.wishes || {}).filter(
              (w) =>
                w &&
                (w.dayOff ||
                  w.startTime ||
                  w.endTime ||
                  (w.disposalPreference && w.disposalPreference !== 'none') ||
                  w.note)
            ).length;

            return (
              <li
                key={employee.id}
                className={`grid grid-cols-[minmax(140px,1.2fr)_1fr_auto] gap-3 items-center p-3 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700 ${groupColorClass} ${groupTextColorClass} transition`}
              >
                {/* Name & Stunden */}
                <div>
                  <span className="font-bold text-sm block">
                    {employee.name}
                  </span>
                  <span className="text-xs opacity-90 block">
                    {employee.contractedHoursPerWeek}h / Woche
                  </span>
                </div>

                {/* Details (Gruppe, Typ, VZ, Wünsche) */}
                <div className="text-xs flex flex-col items-start gap-1">
                  <span className="font-medium">
                    Gruppe: {employeeGroup?.name || 'Ohne Gruppe (Springer)'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {employee.type !== 'normal' && employee.type !== 'zusatzkraft' && (
                      <span className="text-[10px] bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                        {employee.type === 'apprentice'
                          ? 'Auszubildender'
                          : employee.type === 'fsj'
                          ? 'FSJler'
                          : employee.type === 'intern'
                          ? 'Praktikant'
                          : ''}
                        {employee.presenceDays && employee.presenceDays.length > 0 && ` (${employee.presenceDays.join(', ')})`}
                      </span>
                    )}
                    {employee.type === 'zusatzkraft' && (
                      <span className="text-[10px] bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                        Zusatzkraft
                      </span>
                    )}
                    {employee.overriddenDisposalHours !== null &&
                      employee.overriddenDisposalHours !== undefined &&
                      employee.overriddenDisposalHours !== '' && (
                        <span className="text-[10px] bg-white/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-full font-medium shadow-2xs">
                          VZ: {employee.overriddenDisposalHours}h
                        </span>
                      )}
                    {wishesCount > 0 && (
                      <span className="text-[10px] inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-semibold border border-amber-300 dark:border-amber-700/60 shadow-2xs">
                        <Sparkles size={10} className="text-amber-600 dark:text-amber-400" />
                        <span>{wishesCount} {wishesCount === 1 ? 'Wunsch' : 'Wünsche'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions (Wünsche / Bearbeiten / Löschen) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onOpenWishes && onOpenWishes(employee)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-100/90 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 font-semibold shadow-xs transition hover:scale-105"
                    title="Wünsche für diesen Mitarbeiter erfassen"
                  >
                    <Sparkles size={13} className="text-amber-600 dark:text-amber-400" />
                    <span>Wünsche</span>
                  </button>
                  <button
                    onClick={() => onEditEmployee(employee)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400 font-semibold shadow-xs transition hover:scale-105"
                    title="Mitarbeiter bearbeiten"
                  >
                    <Edit2 size={13} />
                    <span>Bearbeiten</span>
                  </button>
                  <button
                    onClick={() => onDeleteEmployee(employee.id)}
                    className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-red-100/80 dark:bg-red-950/60 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 font-semibold transition hover:scale-105"
                    title="Mitarbeiter löschen"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default EmployeeListModalContent;
