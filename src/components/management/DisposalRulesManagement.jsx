import React from 'react';

const DisposalRulesManagement = ({
  isDisposalRulesSectionMinimized,
  setIsDisposalRulesSectionMinimized,
  isModal = false,
  editingDisposalRuleId,
  newDisposalRule,
  setNewDisposalRule,
  handleAddDisposalRule,
  handleUpdateDisposalRule,
  handleCancelEditDisposalRule,
  disposalTimeRules,
  handleEditDisposalRule,
  handleDeleteDisposalRule,
}) => {
  const isExpanded = isModal || !isDisposalRulesSectionMinimized;

  return (
    <div className={isModal ? "w-full" : "p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]"}>
      {!isModal && (
        <h2
          className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
          onClick={() => setIsDisposalRulesSectionMinimized && setIsDisposalRulesSectionMinimized(!isDisposalRulesSectionMinimized)}
        >
          Verfügungszeit Regeln
          <svg
            className={`w-6 h-6 transform transition-transform duration-200 ${isDisposalRulesSectionMinimized ? 'rotate-0' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </h2>
      )}
      {isExpanded && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="contractedHours" className="block text-sm font-medium text-gray-700 mb-1">Soll Arbeitszeit (h)</label>
                      <input
                        type="number"
                        id="contractedHours"
                        value={newDisposalRule.contractedHours}
                        onChange={(e) => setNewDisposalRule(prev => ({ ...prev, contractedHours: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        placeholder="z.B. 39"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 w-full"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="disposalHours" className="block text-sm font-medium text-gray-700 mb-1">Verfügungszeit (h)</label>
                      <input
                        type="number"
                        id="disposalHours"
                        value={newDisposalRule.disposalHours}
                        onChange={(e) => setNewDisposalRule(prev => ({ ...prev, disposalHours: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        placeholder="z.B. 8.5"
                        step="0.5"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 w-full"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {editingDisposalRuleId ? (
                      <>
                        <button
                          onClick={handleUpdateDisposalRule}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={handleCancelEditDisposalRule}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Abbrechen
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleAddDisposalRule}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        Regel hinzufügen
                      </button>
                    )}
                  </div>
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Vorhandene Regeln</h3>
                    {disposalTimeRules.length === 0 ? (
                      <p className="text-center text-gray-500">Noch keine Regeln vorhanden.</p>
                    ) : (
                      <ul className="space-y-3">
                        {disposalTimeRules.map(rule => (
                          <li key={rule.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <span className="text-gray-900 font-medium">{rule.contractedHours}h Soll-Arbeitszeit = {rule.disposalHours}h Verfügungszeit</span>
                            <div>
                              <button
                                onClick={() => handleEditDisposalRule(rule)}
                                className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm transition duration-300 ease-in-out transform hover:scale-105"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteDisposalRule(rule.id)}
                                className="text-red-600 hover:text-red-800 text-sm transition duration-300 ease-in-out transform hover:scale-105"
                                >
                                Löschen
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
  );
};

export default DisposalRulesManagement;
