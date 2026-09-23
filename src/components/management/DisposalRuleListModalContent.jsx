import React from 'react';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';

const DisposalRuleListModalContent = ({
  disposalTimeRules,
  onEditDisposalRule,
  onDeleteDisposalRule,
  onOpenAddModal,
}) => {
  // Sort rules by contractedHours ascending for tidy overview
  const sortedRules = [...disposalTimeRules].sort((a, b) => Number(a.contractedHours) - Number(b.contractedHours));

  return (
    <div className="space-y-4">
      {/* Top Bar inside Modal */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Vorhandene Verfügungszeit-Regeln ({disposalTimeRules.length})
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Regeln ordnen einer vertraglichen Soll-Arbeitszeit automatisch die zustehende Verfügungszeit zu.
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-xs shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={15} />
          <span>Regel hinzufügen</span>
        </button>
      </div>

      {/* Regeln Liste */}
      {sortedRules.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Clock size={36} className="mx-auto mb-2 opacity-40 text-teal-600" />
          <p className="font-medium">Noch keine Verfügungszeit-Regeln definiert.</p>
          <p className="text-xs mt-1">Klicke oben auf "Regel hinzufügen", um eine neue Regel anzulegen.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {sortedRules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-700 transition shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm border border-teal-200 dark:border-teal-800">
                  <Clock size={16} />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-100 block">
                    {rule.contractedHours} h / Woche Soll-Arbeitszeit
                  </span>
                  <span className="text-xs text-teal-700 dark:text-teal-400 font-medium block">
                    ➜ {rule.disposalHours} h Verfügungszeit
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onEditDisposalRule(rule)}
                  className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                  title="Regel bearbeiten"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => onDeleteDisposalRule(rule.id)}
                  className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                  title="Regel löschen"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DisposalRuleListModalContent;
