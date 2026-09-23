import React from 'react';
import { FolderPlus, Edit2, Trash2, GripVertical } from 'lucide-react';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';
import { getStrongGroupColor } from '../../utils/colorUtils';

const GroupListModalContent = ({
  groups,
  orderedGroupIds,
  onEditGroup,
  onDeleteGroup,
  onOpenAddModal,
  handleGroupDragStart,
  handleGroupDragEnter,
  handleGroupDragLeave,
  handleGroupDragOver,
  handleGroupDrop,
  handleGroupDragEnd,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Bar inside Modal */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Aktuell angelegte Gruppen ({groups.length})
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Reihenfolge kann per Drag &amp; Drop angepasst werden.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-xs shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <FolderPlus size={15} />
          <span>Gruppe hinzufügen</span>
        </button>
      </div>

      {/* Gruppen Liste */}
      {groups.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p className="font-medium">Noch keine Gruppen angelegt.</p>
          <p className="text-xs mt-1">Klicke oben auf "Gruppe hinzufügen", um die erste Gruppe zu erstellen.</p>
        </div>
      ) : (
        <ul className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {orderedGroupIds.map((groupId) => {
            const group = groups.find((g) => g.id === groupId);
            if (!group) return null;

            // Öffnungszeiten-Zusammenfassung ermitteln
            const hasOpeningHours = WEEK_DAYS_PLAN.some(
              (day) =>
                group.openingHours?.[day]?.length > 0 &&
                (group.daysWithOpeningHours?.[day] ?? false)
            );

            const openingHoursSummary = hasOpeningHours
              ? WEEK_DAYS_PLAN.map((day) => {
                  const hours = group.openingHours?.[day] || [];
                  const isDayEnabled = group.daysWithOpeningHours?.[day] ?? false;
                  if (hours.length > 0 && isDayEnabled) {
                    return `${day.substring(0, 2)}: ${hours.map((h) => `${h.start}-${h.end}`).join(', ')}`;
                  } else if (!isDayEnabled) {
                    return `${day.substring(0, 2)}: Deaktiviert`;
                  }
                  return '';
                })
                  .filter(Boolean)
                  .join('; ')
              : 'Nicht festgelegt';

            return (
              <li
                key={group.id}
                draggable="true"
                onDragStart={(e) => handleGroupDragStart(e, group.id)}
                onDragEnter={(e) => handleGroupDragEnter(e, group.id)}
                onDragLeave={handleGroupDragLeave}
                onDragOver={handleGroupDragOver}
                onDrop={(e) => handleGroupDrop(e, group.id)}
                onDragEnd={handleGroupDragEnd}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:hover:border-indigo-600 transition"
              >
                {/* Drag Handle & Gruppen Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab">
                    <GripVertical size={18} />
                  </div>

                  {/* Farbkreis */}
                  <span
                    className={`w-6 h-6 rounded-full flex-shrink-0 ${getStrongGroupColor(
                      group.color
                    )} border border-gray-300 dark:border-gray-600 shadow-xs`}
                  />

                  {/* Name & Details */}
                  <div className="flex flex-col min-w-0 pr-3">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                      {group.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      Öffnungszeiten: {openingHoursSummary}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      Min. Betreuung: {group.minStaffRequired !== undefined ? `${group.minStaffRequired} Personen` : 'nicht festgelegt'}
                      {group.disableStaffingWarning ? ' (Warnung inaktiv)' : ' (Warnung aktiv)'}
                    </span>
                  </div>
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-1.5 flex-shrink-0 pl-2">
                  <button
                    onClick={() => onEditGroup(group)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                    title="Gruppe bearbeiten"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteGroup(group.id)}
                    className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    title="Gruppe löschen"
                  >
                    <Trash2 size={16} />
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

export default GroupListModalContent;
