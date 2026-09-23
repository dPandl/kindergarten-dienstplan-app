import React from 'react';
import { WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';

const EmployeeManagement = ({
  isEmployeesSectionMinimized,
  setIsEmployeesSectionMinimized,
  isModal = false,
  editingEmployeeId,
  newEmployee,
  setNewEmployee,
  handleEmployeeChange,
  handleAddEmployee,
  handleCancelEditEmployee,
  isExistingEmployeesMinimized,
  setIsExistingEmployeesMinimized,
  employees,
  sortedEmployees,
  groups,
  getTextColorForBg,
  handleEditEmployee,
  handleDeleteEmployee,
}) => {
  const isExpanded = isModal || !isEmployeesSectionMinimized;

  return (
    <div className={isModal ? "w-full" : "p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]"}>
      {!isModal && (
        <h2
          className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
          onClick={() => setIsEmployeesSectionMinimized && setIsEmployeesSectionMinimized(!isEmployeesSectionMinimized)}
        >
          Mitarbeiter verwalten
          <svg
            className={`w-6 h-6 transform transition-transform duration-200 ${isEmployeesSectionMinimized ? 'rotate-0' : 'rotate-180'}`}
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <input
                      type="text"
                      name="name"
                      value={newEmployee.name}
                      onChange={handleEmployeeChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                      placeholder="Name des Mitarbeiters"
                    />
                    <input
                      type="number"
                      name="contractedHoursPerWeek"
                      value={newEmployee.contractedHoursPerWeek === 0 ? '' : newEmployee.contractedHoursPerWeek}
                      onChange={handleEmployeeChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                      placeholder="Wochenstunden (z.B. 39)"
                      min="0"
                      onFocus={(e) => e.target.select()}
                    />
                    <input
                      type="number"
                      name="overriddenDisposalHours"
                      value={newEmployee.overriddenDisposalHours}
                      onChange={handleEmployeeChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                      placeholder="Verfügungszeit überschreiben (optional)"
                      min="0"
                      step="0.5"
                      onFocus={(e) => e.target.select()}
                    />
                    <select
                      name="groupId"
                      value={newEmployee.groupId}
                      onChange={handleEmployeeChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 col-span-full sm:col-span-1 cursor-pointer"
                    >
                      <option value="">Gruppe auswählen (optional)</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>

                    {/* New: Employee Type Selection */}
                    <select
                      name="type"
                      value={newEmployee.type}
                      onChange={handleEmployeeChange}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 col-span-full sm:col-span-1 cursor-pointer"
                    >
                      <option value="normal">Normaler Mitarbeiter</option>
                      <option value="zusatzkraft">Zusatzkraft</option> {/* Added Zusatzkraft */}
                      <option value="apprentice">Auszubildender</option>
                      <option value="fsj">FSJler</option>
                      <option value="intern">Praktikant</option>
                    </select>
                  </div>

                  {/* New: Presence Days selection for special employee types */}
                  {/* Now checks if type is NOT 'normal' and NOT 'zusatzkraft' */}
                  {newEmployee.type !== 'normal' && newEmployee.type !== 'zusatzkraft' && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-300 shadow-sm">
                      <h4 className="text-md font-semibold text-gray-700 mb-2">Anwesenheitstage in der Einrichtung:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {WEEK_DAYS_PLAN.map(day => (
                          <label key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              name="presenceDays"
                              value={day}
                              checked={(newEmployee.presenceDays || []).includes(day)}
                              onChange={handleEmployeeChange}
                              className="form-checkbox h-5 w-5 text-blue-600 rounded cursor-pointer"
                            />
                            <span className="text-gray-700">{day}</span>
                          </label>
                        ))}
                      </div>
                      {(newEmployee.presenceDays || []).length === 0 && (
                        <p className="text-red-500 text-sm mt-2">Bitte mindestens einen Anwesenheitstag auswählen.</p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                      onClick={handleAddEmployee}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      {editingEmployeeId ? 'Mitarbeiter aktualisieren' : 'Mitarbeiter hinzufügen'}
                    </button>
                    {editingEmployeeId && (
                      <button
                        onClick={handleCancelEditEmployee}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                    <h3
                      className="text-xl font-semibold text-gray-700 mb-4 text-center cursor-pointer flex items-center justify-center gap-2"
                      onClick={() => setIsExistingEmployeesMinimized(!isExistingEmployeesMinimized)}
                    >
                      Vorhandene Mitarbeiter
                      <svg
                        className={`w-6 h-6 transform transition-transform duration-200 ${isExistingEmployeesMinimized ? 'rotate-0' : 'rotate-180'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </h3>
                    {!isExistingEmployeesMinimized && (
                      employees.length === 0 ? (
                        <p className="text-center text-gray-500">Noch keine Mitarbeiter vorhanden.</p>
                      ) : (
                        <ul className="space-y-3">
                          {/* Changed from 'employees.map' to 'sortedEmployees.map' */}
                          {sortedEmployees.map(employee => {
                            const employeeGroup = groups.find(g => g.id === employee.groupId);
                            const groupColorClass = employeeGroup?.color || 'bg-gray-100'; // Default if no group
                            const groupTextColorClass = getTextColorForBg(groupColorClass);

                            return (
                              <li key={employee.id} className={`grid grid-cols-[minmax(150px,1fr)_1fr_auto] gap-2 items-center p-3 rounded-lg shadow-sm border border-gray-200 ${groupColorClass} ${groupTextColorClass}`}> {/* Applied grid layout */}
                                <span className="font-medium">{employee.name} ({employee.contractedHoursPerWeek}h/Woche)</span>
                                <div className="text-sm flex flex-col items-center"> {/* Changed items-end to items-center */}
                                  <span>Gruppe: {employeeGroup?.name || 'Ohne Gruppe'}</span>
                                  {employee.type !== 'normal' && employee.type !== 'zusatzkraft' && ( // Only show type for non-normal/non-zusatzkraft
                                    <span className="text-xs bg-white text-gray-800 px-2 py-0.5 rounded-full mt-1">
                                      {employee.type === 'apprentice' ? 'Auszubildender' : employee.type === 'fsj' ? 'FSJler' : employee.type === 'intern' ? 'Praktikant' : ''}
                                      {employee.presenceDays && employee.presenceDays.length > 0 && ` (${employee.presenceDays.join(', ')})`}
                                    </span>
                                  )}
                                  {employee.type === 'zusatzkraft' && (
                                    <span className="text-xs bg-white text-gray-800 px-2 py-0.5 rounded-full mt-1">
                                      Zusatzkraft
                                    </span>
                                  )}
                                  {employee.overriddenDisposalHours !== null && employee.overriddenDisposalHours !== undefined && employee.overriddenDisposalHours !== '' && (
                                    <span className="text-xs bg-white text-gray-800 px-2 py-0.5 rounded-full mt-1">
                                      VZ: {employee.overriddenDisposalHours}h (Überschrieben)
                                    </span>
                                  )}
                                </div>
                                <div className="flex-shrink-0"> {/* Added flex-shrink-0 to button container */}
                                  <button
                                    onClick={() => handleEditEmployee(employee)}
                                    className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm transition duration-300 ease-in-out transform hover:scale-105"
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                    className="text-red-600 hover:text-red-800 text-sm transition duration-300 ease-in-out transform hover:scale-105"
                                  >
                                    Löschen
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
  );
};

export default EmployeeManagement;
