import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from '../common/CustomSelect';

const PrintOptionsModal = ({
  onPrint,
  onCancel,
  defaultPrintWeeklySummary,
  onPrintWeeklySummaryChange,
  selectedGroupIdFilter,
  setSelectedGroupIdFilter,
  groups,
  hasEmployeesWithoutGroup,
  selectedEmployeeIdFilter,
  setSelectedEmployeeIdFilter,
  availableEmployeesForFilter,
  filteredGroupsForDisplayInFilter
}) => {
  const [printWeeklySummary, setPrintWeeklySummary] = useState(defaultPrintWeeklySummary);
  const [isVisible, setIsVisible] = useState(false); // Steuert die Fade-In/Out-Animation des GESAMTEN Modals

  // Effekt für initialen Fade-In des gesamten Modals beim Mounten
  useEffect(() => {
    const timerId = setTimeout(() => {
      setIsVisible(true); // Trigger für den Fade-In
    }, 0);
    return () => clearTimeout(timerId);
  }, []);

  // Handler für 'Abbrechen' und 'Drucken' Buttons
  const handleActionClick = (actionCallback) => {
    setIsVisible(false); // Startet die Fade-Out-Animation für das gesamte Modal (inkl. Hintergrund)
    setTimeout(() => {
      actionCallback(printWeeklySummary);
    }, 300); // Wartezeit für die Fade-Out-Transition (muss zu 'duration-300' passen)
  };

  return createPortal(
    <div
      style={{ zIndex: 110 }}
      className={`fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 print-hidden-modal transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleActionClick(onCancel);
      }}
    >
      <div className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl shadow-2xl p-6 max-w-sm w-full relative border border-gray-200/80 dark:border-gray-700/80 transform transition-all duration-300 ease-out ${
        isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">Druckoptionen</h3>

        {/* Gruppenfilter (bestehend) */}
        <div className="mb-4">
          <label htmlFor="printGroupFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gruppe filtern:
          </label>
          <CustomSelect
            id="printGroupFilter"
            value={selectedGroupIdFilter}
            onChange={(e) => setSelectedGroupIdFilter(e.target.value)}
            options={(filteredGroupsForDisplayInFilter || []).map(group => ({
              value: group.id,
              label: group.name
            }))}
          />
        </div>

        {/* Mitarbeiterfilter im Druckmodal */}
        <div className="mb-4">
          <label htmlFor="printEmployeeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mitarbeiter filtern:
          </label>
          <CustomSelect
            id="printEmployeeFilter"
            value={selectedEmployeeIdFilter}
            onChange={(e) => setSelectedEmployeeIdFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Alle Mitarbeiter' },
              ...(availableEmployeesForFilter || []).map(employee => ({
                value: employee.id,
                label: employee.name
              }))
            ]}
          />
        </div>

        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="printWeeklySummary"
            checked={printWeeklySummary}
            onChange={(e) => {
              setPrintWeeklySummary(e.target.checked);
              onPrintWeeklySummaryChange(e.target.checked);
            }}
            className="form-checkbox h-5 w-5 text-blue-600 rounded cursor-pointer"
          />
          <label htmlFor="printWeeklySummary" className="ml-3 text-gray-700">Wochenübersicht mitdrucken</label>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => handleActionClick(onPrint)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-xl shadow-md transition duration-200"
          >
            Drucken
          </button>
          <button
            onClick={() => handleActionClick(onCancel)}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold py-2 px-5 rounded-xl shadow transition duration-200"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};


// --- NEUE: Schedule Management Modal Component ---

export default PrintOptionsModal;
