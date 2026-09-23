import React from 'react';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';

const EmployeeFormModalContent = ({
  editingEmployeeId,
  newEmployee,
  handleEmployeeChange,
  handleAddEmployee,
  handleCancelEditEmployee,
  groups,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Name des Mitarbeiters *
          </label>
          <input
            type="text"
            name="name"
            value={newEmployee.name}
            onChange={handleEmployeeChange}
            className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
            placeholder="z.B. Anna Schmidt"
            autoFocus
          />
        </div>

        {/* Wochenstunden */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Soll-Wochenstunden *
          </label>
          <input
            type="number"
            name="contractedHoursPerWeek"
            value={newEmployee.contractedHoursPerWeek === 0 ? '' : newEmployee.contractedHoursPerWeek}
            onChange={handleEmployeeChange}
            className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
            placeholder="z.B. 39"
            min="0"
            onFocus={(e) => e.target.select()}
          />
        </div>

        {/* Gruppe */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Gruppe zuweisen (optional)
          </label>
          <select
            name="groupId"
            value={newEmployee.groupId}
            onChange={handleEmployeeChange}
            className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm cursor-pointer transition"
          >
            <option value="">Ohne feste Gruppe (Springer)</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mitarbeiter-Typ */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Mitarbeiter-Typ
          </label>
          <select
            name="type"
            value={newEmployee.type}
            onChange={handleEmployeeChange}
            className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm cursor-pointer transition"
          >
            <option value="normal">Normaler Mitarbeiter</option>
            <option value="zusatzkraft">Zusatzkraft</option>
            <option value="apprentice">Auszubildender</option>
            <option value="fsj">FSJler</option>
            <option value="intern">Praktikant</option>
          </select>
        </div>

        {/* Verfügungszeit überschreiben */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Verfügungszeit manuell überschreiben (optional, in Stunden)
          </label>
          <input
            type="number"
            name="overriddenDisposalHours"
            value={newEmployee.overriddenDisposalHours}
            onChange={handleEmployeeChange}
            className="w-full p-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition"
            placeholder="Standardmäßig wird die Berechnungsregel verwendet"
            min="0"
            step="0.5"
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      {/* Anwesenheitstage bei Azubis/FSJ/Praktikanten */}
      {newEmployee.type !== 'normal' && newEmployee.type !== 'zusatzkraft' && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Anwesenheitstage in der Einrichtung:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {WEEK_DAYS_PLAN.map((day) => (
              <label key={day} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  name="presenceDays"
                  value={day}
                  checked={(newEmployee.presenceDays || []).includes(day)}
                  onChange={handleEmployeeChange}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded cursor-pointer"
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
          {(newEmployee.presenceDays || []).length === 0 && (
            <p className="text-red-500 text-xs mt-2 font-medium">
              Bitte mindestens einen Anwesenheitstag auswählen.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancelEditEmployee}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg text-sm transition"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={handleAddEmployee}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition transform hover:-translate-y-0.5 active:translate-y-0"
        >
          {editingEmployeeId ? 'Änderungen speichern' : 'Mitarbeiter hinzufügen'}
        </button>
      </div>
    </div>
  );
};

export default EmployeeFormModalContent;
