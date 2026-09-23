import React from 'react';
import ColorPickerDropdown from '../common/ColorPickerDropdown';
import OpeningHoursEditor from './OpeningHoursEditor';
import { groupColors, WEEK_DAYS_PLAN } from '../../constants/scheduleConstants';
import { getStrongGroupColor } from '../../utils/colorUtils';

const GroupManagement = ({
  isGroupsSectionMinimized,
  setIsGroupsSectionMinimized,
  isModal = false,
  editingGroupId,
  editingGroup,
  setEditingGroup,
  newGroup,
  setNewGroup,
  handleAddGroup,
  handleUpdateGroup,
  handleCancelEditGroup,
  orderedGroupIds,
  groups,
  handleGroupDragStart,
  handleGroupDragEnter,
  handleGroupDragLeave,
  handleGroupDragOver,
  handleGroupDrop,
  handleGroupDragEnd,
  handleEditGroupClick,
  handleDeleteGroup,
  isGroupOpeningHoursMinimized,
  setIsGroupOpeningHoursMinimized,
}) => {
  const isExpanded = isModal || !isGroupsSectionMinimized;

  return (
    <div className={isModal ? "w-full" : "p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)] transition-colors duration-200"}>
      {!isModal && (
        <h2
          className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
          onClick={() => setIsGroupsSectionMinimized && setIsGroupsSectionMinimized(!isGroupsSectionMinimized)}
        >
          Gruppen verwalten
          <svg
            className={`w-6 h-6 transform transition-transform duration-200 ${isGroupsSectionMinimized ? 'rotate-0' : 'rotate-180'}`}
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
                    <input
                      type="text"
                      value={editingGroupId ? editingGroup?.name || '' : newGroup.name}
                      onChange={(e) => editingGroupId ? setEditingGroup(prev => ({ ...prev, name: e.target.value })) : setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                      className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                      placeholder="Neuer Gruppenname"
                    />
                    <ColorPickerDropdown
                      selectedColor={editingGroupId ? editingGroup?.color || groupColors[0] : newGroup.color}
                      onColorChange={(color) => editingGroupId ? setEditingGroup(prev => ({ ...prev, color: color })) : setNewGroup(prev => ({ ...prev, color: color }))}
                      colors={groupColors}
                      placeholder="Farbe auswählen"
                      useStrongDisplay={true} // Use strong display for group management
                    />
                    {/* New: Betreuungs Warnungen Checkbox */}
                    <div className="col-span-full sm:col-span-1 flex items-center">
                      <label htmlFor="staffingWarningsEnabled" className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          id="staffingWarningsEnabled"
                          checked={!(editingGroupId ? editingGroup?.disableStaffingWarning ?? true : newGroup.disableStaffingWarning)} // Inverted logic
                          onChange={(e) => editingGroupId ? setEditingGroup(prev => ({ ...prev, disableStaffingWarning: !e.target.checked })) : setNewGroup(prev => ({ ...prev, disableStaffingWarning: !e.target.checked }))} // Inverted logic
                          className="form-checkbox h-5 w-5 text-red-600 rounded cursor-pointer"
                        />
                        <span className="text-gray-700 font-medium">Betreuungs Warnungen</span>
                      </label>
                    </div>
                    {/* Min. Betreuungspersonal Input - only appears if warnings are enabled */}
                    {!(editingGroupId ? editingGroup?.disableStaffingWarning ?? true : newGroup.disableStaffingWarning) && (
                      <div className="col-span-full sm:col-span-1">
                        <label htmlFor="minStaffRequired" className="block text-sm font-medium text-gray-700 mb-1">Min. Betreuungspersonal:</label>
                        <input
                          type="number"
                          id="minStaffRequired"
                          value={editingGroupId ? (editingGroup?.minStaffRequired ?? '') : (newGroup.minStaffRequired ?? '')} // Use ?? '' to display empty for undefined
                          onChange={(e) => editingGroupId ? setEditingGroup(prev => ({ ...prev, minStaffRequired: Number(e.target.value) })) : setNewGroup(prev => ({ ...prev, minStaffRequired: Number(e.target.value) }))}
                          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 w-full"
                          placeholder="z.B. 2" // Added placeholder
                          min="0"
                          onFocus={(e) => e.target.select()}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {editingGroupId ? (
                      <>
                        <button
                          onClick={handleUpdateGroup}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={handleCancelEditGroup}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Abbrechen
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleAddGroup}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        Gruppe hinzufügen
                      </button>
                    )}
                  </div>
                  {/* OpeningHoursEditor - now collapsible */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                    <h4
                      className="text-lg font-semibold text-gray-700 mb-3 text-center cursor-pointer flex items-center justify-center gap-2"
                      onClick={() => setIsGroupOpeningHoursMinimized(!isGroupOpeningHoursMinimized)}
                    >
                      Öffnungszeiten festlegen
                      <svg
                        className={`w-5 h-5 transform transition-transform duration-200 ${isGroupOpeningHoursMinimized ? 'rotate-0' : 'rotate-180'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </h4>
                    {!isGroupOpeningHoursMinimized && (
                      (editingGroupId && editingGroup) ? (
                        <OpeningHoursEditor
                          group={editingGroup}
                          onUpdateGroup={setEditingGroup}
                        />
                      ) : (
                        <OpeningHoursEditor
                          group={newGroup}
                          onUpdateGroup={setNewGroup}
                        />
                      )
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Vorhandene Gruppen</h3>
                    {groups.length === 0 ? (
                      <p className="text-center text-gray-500">Noch keine Gruppen vorhanden.</p>
                    ) : (
                      <ul className="space-y-3">
                        {orderedGroupIds.map(groupId => {
                          const group = groups.find(g => g.id === groupId);
                          if (!group) return null;

                          // Display opening hours summary
                          const hasOpeningHours = WEEK_DAYS_PLAN.some(day => group.openingHours?.[day]?.length > 0 && (group.daysWithOpeningHours?.[day] ?? false));
                          const openingHoursSummary = hasOpeningHours ?
                            WEEK_DAYS_PLAN.map(day => {
                              const hours = group.openingHours?.[day] || [];
                              const isDayEnabled = group.daysWithOpeningHours?.[day] ?? false;
                              if (hours.length > 0 && isDayEnabled) {
                                return `${day.substring(0, 2)}: ${hours.map(h => `${h.start}-${h.end}`).join(', ')}`;
                              } else if (!isDayEnabled) {
                                return `${day.substring(0, 2)}: Deaktiviert`;
                              }
                              return '';
                            }).filter(Boolean).join('; ')
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
                              className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab group-item-draggable"
                            >
                              <div className="flex items-center gap-2 flex-grow min-w-0">
                                <span className={`w-6 h-6 rounded-full ${getStrongGroupColor(group.color)} border border-gray-300`}></span>
                                {/* NEU: max-w-[70%] hinzugefügt, um den Textumbruch zu erzwingen */}
                                <div className="flex flex-col max-w-[70%]">
                                  <span className="text-gray-900 font-medium">{group.name}</span>
                                  {/* break-words bleibt, um lange Zeitangaben zu brechen */}
                                  <span className="text-gray-600 text-xs mt-1 break-words">Öffnungszeiten: {openingHoursSummary}</span>
                                  <span className="text-gray-600 text-xs mt-1">
                                    Min. Betreuung: {group.minStaffRequired !== undefined ? group.minStaffRequired : "nicht festgelegt"}
                                    {group.disableStaffingWarning ? " (Warnung deaktiviert)" : " (Warnung aktiv)"}
                                  </span>
                                </div>
                              </div>
                                <div className="flex flex-row items-center flex-shrink-0 gap-2">
                                  <button
                                    onClick={() => handleEditGroupClick(group)}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm transition duration-300 ease-in-out transform hover:scale-105" // Removed mr-3, gap handles spacing
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGroup(group.id)}
                                    className="text-red-600 hover:text-red-800 text-sm transition duration-300 ease-in-out transform hover:scale-105"
                                  >
                                    Löschen
                                  </button>
                                </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
  );
};

export default GroupManagement;
