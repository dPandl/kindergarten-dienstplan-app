import React from 'react';
import { formatMinutesToDecimalHours } from '../../utils/timeUtils';

const WeeklySummary = ({
  employees,
  disposalTimeCategory,
  categories,
  weeklySummaries,
  dynamicCategoryHeaders = [],
  filteredEmployeesForDisplay = [],
  groups = [],
  getTextColorForBg = () => 'text-gray-800',
}) => {
  return (
          <div className="p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl frosted-glass-card rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/60 weekly-summary-section transition-colors duration-200 print:bg-white print:backdrop-blur-none">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">Wochenübersicht Mitarbeiter</h2>
              {employees.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400">Bitte füge Mitarbeiter hinzu, um die Wochenübersicht zu sehen.</p>
              ) : (
                  <div className="overflow-x-auto no-scrollbar">
                      <table className="min-w-full divide-y divide-gray-300 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                          <thead className="bg-gray-100">
                              <tr>
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider rounded-tl-lg border-r border-gray-300">
                                      Mitarbeiter
                                  </th>
                                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider bg-blue-500 border-r border-gray-300">
                                      Gesamt
                                  </th>
                                  {disposalTimeCategory && (
                                      <th scope="col" className={`px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider ${disposalTimeCategory.color} border-r border-gray-300`}>
                                          {disposalTimeCategory.name}
                                      </th>
                                  )}
                                  {dynamicCategoryHeaders.map(cat => (
                                      <th key={cat.id} scope="col" className={`px-4 py-3 text-center text-xs font-medium ${getTextColorForBg(cat.color)} uppercase tracking-wider ${cat.color} border-r border-gray-300`}>
                                          {cat.name}
                                      </th>
                                  ))}
                                  {/* Add a header for warnings if needed, or integrate into cells */}
                                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider print-hidden-warning rounded-tr-lg">
                                      Warnungen
                                  </th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {filteredEmployeesForDisplay.map(employee => {
                                  const summary = weeklySummaries[employee.id];
                                  if (!summary) return null;

                                  // Determine if there are work hour warnings
                                  const hasWorkHourWarnings = summary.weeklyWarnings.some(w => w.includes('Überstunden') || w.includes('Unterstunden'));
                                  const workHourCellClasses = hasWorkHourWarnings
                                      ? 'bg-red-500 text-white'
                                      : 'bg-white text-gray-800'; // Default light background

                                  // Determine if there are disposal time warnings
                                  const hasDisposalTimeWarnings = summary.weeklyWarnings.some(w => w.includes('VZ'));
                                  const disposalTimeCellClasses = hasDisposalTimeWarnings
                                      ? 'bg-red-500 text-white'
                                      : 'bg-white text-gray-800'; // Default light background

                                  // Determine if there are presence day warnings
                                  const hasPresenceDayWarnings = summary.weeklyWarnings.some(w => w.includes('Anwesenheitstage'));
                                  const presenceDayCellClasses = hasPresenceDayWarnings
                                      ? 'bg-red-500 text-white'
                                      : 'bg-white text-gray-800'; // Default light background


                                  // Get employee group color
                                  const employeeGroup = groups.find(g => g.id === employee.groupId);
                                  const employeeGroupColorClass = employeeGroup?.color || 'bg-gray-100'; // Default if no group
                                  const employeeGroupTextColorClass = getTextColorForBg(employeeGroupColorClass);


                                  return (
                                      <tr key={employee.id}>
                                          <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium border-r border-gray-200 ${employeeGroupTextColorClass} ${employeeGroupColorClass}`}>
                                              {summary.employeeName}
                                          </td>
                                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${workHourCellClasses}`}>
                                              {formatMinutesToDecimalHours(summary.weeklyTotalWorkMinutes)} / {summary.contractedHours}h
                                          </td>
                                          {disposalTimeCategory && (
                                              <td className={`px-4 py-3 whitespace-nowrap text-sm text-center border-r border-gray-200 ${disposalTimeCellClasses}`}>
                                                  {formatMinutesToDecimalHours(summary.weeklyTotalDisposalMinutes)} / {formatMinutesToDecimalHours(summary.targetDisposalMinutes)}
                                              </td>
                                          )}
                                          {dynamicCategoryHeaders.map(cat => (
                                              <td key={cat.id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center border-r border-gray-200">
                                                  {formatMinutesToDecimalHours(summary.weeklyCategoryTotals[cat.id] || 0)}
                                              </td>
                                          ))}
                                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-red-600 print-hidden-warning ${hasPresenceDayWarnings ? 'bg-red-100' : ''}`}>
                                              {/* Display all warnings now */}
                                              {summary.weeklyWarnings.join(', ')}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
  );
};

export default WeeklySummary;
