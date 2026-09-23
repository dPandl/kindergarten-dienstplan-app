import React from 'react';
import ColorPickerDropdown from '../common/ColorPickerDropdown';
import { blockColors, PAUSE_CATEGORY } from '../../constants/scheduleConstants';

const SubCategoryManagement = ({
  isSubCategoriesSectionMinimized,
  setIsSubCategoriesSectionMinimized,
  isModal = false,
  editingSubCategoryId,
  newSubCategory,
  setNewSubCategory,
  categories,
  handleAddSubCategory,
  handleUpdateSubCategory,
  handleCancelEditSubCategory,
  subCategories,
  handleEditSubCategoryClick,
  handleDeleteSubCategory,
}) => {
  const isExpanded = isModal || !isSubCategoriesSectionMinimized;

  return (
    <div className={isModal ? "w-full" : "p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]"}>
      {!isModal && (
        <h2
          className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
          onClick={() => setIsSubCategoriesSectionMinimized && setIsSubCategoriesSectionMinimized(!isSubCategoriesSectionMinimized)}
        >
          Unterkategorien verwalten (Unterblöcke)
          <svg
            className={`w-6 h-6 transform transition-transform duration-200 ${isSubCategoriesSectionMinimized ? 'rotate-0' : 'rotate-180'}`}
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
                      value={newSubCategory.name}
                      onChange={(e) => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                      placeholder="Kategoriename (z.B. Wald, Sprachförderung)"
                    />
                    <select
                      name="parentCategoryId"
                      value={newSubCategory.parentCategoryId}
                      onChange={(e) => setNewSubCategory({ ...newSubCategory, parentCategoryId: e.target.value })}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 cursor-pointer"
                    >
                      <option value="">Übergeordnete Kategorie auswählen</option>
                      <option value={PAUSE_CATEGORY.id}>{PAUSE_CATEGORY.name}</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    <ColorPickerDropdown
                      selectedColor={newSubCategory.color}
                      onColorChange={(color) => setNewSubCategory({ ...newSubCategory, color: color })}
                      colors={blockColors}
                      placeholder="Farbe wählen"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                      onClick={editingSubCategoryId ? handleUpdateSubCategory : handleAddSubCategory}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      {editingSubCategoryId ? 'Unterkategorie aktualisieren' : 'Unterkategorie hinzufügen'}
                    </button>
                    {editingSubCategoryId && (
                      <button
                        onClick={handleCancelEditSubCategory}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Vorhandene Unterkategorien</h3>
                    {subCategories.length === 0 ? (
                      <p className="text-center text-gray-500">Noch keine Unterkategorien vorhanden.</p>
                    ) : (
                      <ul className="space-y-3">
                        {subCategories.map(subCategory => {
                          const parentCategory = categories.find(cat => cat.id === subCategory.parentCategoryId) || (subCategory.parentCategoryId === PAUSE_CATEGORY.id ? PAUSE_CATEGORY : null);
                          return (
                            <li key={subCategory.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full ${subCategory.color || 'bg-gray-300'} border border-gray-300`}></span>
                                <span className="text-gray-900 font-medium">{subCategory.name} <span className="text-gray-600 text-sm">({parentCategory ? parentCategory.name : 'Unbekannt'})</span></span>
                              </div>
                              <div>
                                <button
                                  onClick={() => handleEditSubCategoryClick(subCategory)}
                                  className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm transition duration-300 ease-in-out transform hover:scale-105"
                                 >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleDeleteSubCategory(subCategory.id)}
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

export default SubCategoryManagement;
