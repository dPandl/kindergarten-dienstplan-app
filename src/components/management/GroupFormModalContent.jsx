import React from 'react';
import ColorPickerDropdown from '../common/ColorPickerDropdown';
import OpeningHoursEditor from './OpeningHoursEditor';
import { groupColors } from '../../constants/scheduleConstants';

const GroupFormModalContent = ({
  editingGroupId,
  editingGroup,
  setEditingGroup,
  newGroup,
  setNewGroup,
  handleAddGroup,
  handleUpdateGroup,
  handleCancelEditGroup,
  isGroupOpeningHoursMinimized,
  setIsGroupOpeningHoursMinimized,
}) => {
  const currentGroup = editingGroupId ? editingGroup : newGroup;
  const updateCurrentGroup = (updater) => {
    if (editingGroupId) {
      setEditingGroup(updater);
    } else {
      setNewGroup(updater);
    }
  };

  const isWarningEnabled = !(currentGroup?.disableStaffingWarning ?? true);

  return (
    <div className="space-y-5">
      {/* 1. Hauptdaten: Name & Farbe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Gruppenname *
          </label>
          <input
            type="text"
            value={currentGroup?.name || ''}
            onChange={(e) => updateCurrentGroup((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition text-gray-800 dark:text-gray-100"
            placeholder="z.B. Sonnengruppe"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Gruppenfarbe *
          </label>
          <ColorPickerDropdown
            selectedColor={currentGroup?.color || groupColors[0]}
            onColorChange={(color) => updateCurrentGroup((prev) => ({ ...prev, color }))}
            colors={groupColors}
            placeholder="Farbe auswählen"
            useStrongDisplay={true}
          />
        </div>
      </div>

      {/* 2. Betreuungswarnungen & Mindestpersonal */}
      <div className="p-3.5 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isWarningEnabled}
            onChange={(e) =>
              updateCurrentGroup((prev) => ({ ...prev, disableStaffingWarning: !e.target.checked }))
            }
            className="w-4 h-4 text-red-600 rounded cursor-pointer focus:ring-red-400"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Betreuungswarnungen für diese Gruppe aktivieren
          </span>
        </label>

        {isWarningEnabled && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Mindest-Betreuungspersonal
            </label>
            <input
              type="number"
              value={currentGroup?.minStaffRequired ?? ''}
              onChange={(e) =>
                updateCurrentGroup((prev) => ({
                  ...prev,
                  minStaffRequired: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
              className="w-40 p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 text-sm text-gray-800 dark:text-gray-100"
              placeholder="z.B. 2"
              min="0"
              onFocus={(e) => e.target.select()}
            />
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Löst eine visuelle Warnung aus, wenn zu Kernzeiten weniger Fachkräfte eingeteilt sind.
            </p>
          </div>
        )}
      </div>

      {/* 3. Öffnungszeiten-Editor */}
      <div>
        <OpeningHoursEditor
          group={currentGroup}
          onUpdateGroup={(updated) => {
            if (typeof updated === 'function') {
              updateCurrentGroup(updated);
            } else {
              updateCurrentGroup(() => updated);
            }
          }}
        />
      </div>

      {/* 4. Action Buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancelEditGroup}
          className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
        >
          Abbrechen
        </button>

        {editingGroupId ? (
          <button
            type="button"
            onClick={handleUpdateGroup}
            className="px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition"
          >
            Gruppe speichern
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddGroup}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            Gruppe hinzufügen
          </button>
        )}
      </div>
    </div>
  );
};

export default GroupFormModalContent;
