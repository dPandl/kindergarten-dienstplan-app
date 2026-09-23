import React from 'react';

const DisposalRuleFormModalContent = ({
  editingDisposalRuleId,
  newDisposalRule,
  setNewDisposalRule,
  handleAddDisposalRule,
  handleUpdateDisposalRule,
  handleCancelEditDisposalRule,
}) => {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contractedHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Soll-Arbeitszeit (h / Woche)
          </label>
          <input
            type="number"
            id="contractedHours"
            value={newDisposalRule.contractedHours}
            onChange={(e) => setNewDisposalRule((prev) => ({ ...prev, contractedHours: e.target.value }))}
            onFocus={(e) => e.target.select()}
            placeholder="z.B. 39"
            className="w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            min="0"
            step="0.5"
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Vertragliche Wochenstundenzahl des Mitarbeiters.
          </p>
        </div>

        <div>
          <label htmlFor="disposalHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Verfügungszeit (h / Woche)
          </label>
          <input
            type="number"
            id="disposalHours"
            value={newDisposalRule.disposalHours}
            onChange={(e) => setNewDisposalRule((prev) => ({ ...prev, disposalHours: e.target.value }))}
            onFocus={(e) => e.target.select()}
            placeholder="z.B. 8.5"
            step="0.5"
            className="w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            min="0"
          />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Zustehende Verfügungszeit für diese Wochenstundenzahl.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancelEditDisposalRule}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition"
        >
          Abbrechen
        </button>
        {editingDisposalRuleId ? (
          <button
            type="button"
            onClick={handleUpdateDisposalRule}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            Regel aktualisieren
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddDisposalRule}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            Regel hinzufügen
          </button>
        )}
      </div>
    </div>
  );
};

export default DisposalRuleFormModalContent;
