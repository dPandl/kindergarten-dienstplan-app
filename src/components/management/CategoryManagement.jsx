import React from 'react';
import ColorPickerDropdown from '../common/ColorPickerDropdown';
import { blockColors, PAUSE_CATEGORY } from '../../constants/scheduleConstants';

const CategoryManagement = ({
  isCategoriesSectionMinimized,
  setIsCategoriesSectionMinimized,
  isModal = false,
  editingCategoryId,
  newCategory,
  setNewCategory,
  handleAddCategory,
  handleUpdateCategory,
  handleCancelEditCategory,
  categories,
  disposalTimeCategory,
  careCategory,
  handleEditCategoryClick,
  handleDeleteCategory,
}) => {
  const isExpanded = isModal || !isCategoriesSectionMinimized;

  return (
    <div className={isModal ? "w-full" : "p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]"}>
      {!isModal && (
        <h2
          className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
          onClick={() => setIsCategoriesSectionMinimized && setIsCategoriesSectionMinimized(!isCategoriesSectionMinimized)}
        >
          Kategorien verwalten (Basisblöcke)
          <svg
            className={`w-6 h-6 transform transition-transform duration-200 ${isCategoriesSectionMinimized ? 'rotate-0' : 'rotate-180'}`}
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
                      name="name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                      placeholder="Kategoriename (z.B. Betreuung, Verfügung)"
                    />
                    <ColorPickerDropdown
                      selectedColor={newCategory.color}
                      onColorChange={(color) => setNewCategory({ ...newCategory, color: color })}
                      colors={blockColors}
                      placeholder="Farbe auswählen"
                    />
                  </div>
                  <div className="mb-4 space-y-2">
                    <label className={`flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 shadow-sm
                      ${disposalTimeCategory && !editingCategoryId
                        ? 'opacity-60 cursor-not-allowed' // Wenn deaktiviert, dann not-allowed
                        : 'cursor-pointer' // Sonst, wenn aktiv, dann pointer
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="isDisposalTimeCategory"
                        checked={newCategory.isDisposalTimeCategory}
                        onChange={(e) => setNewCategory({ ...newCategory, isDisposalTimeCategory: e.target.checked })}
                        className={`form-checkbox h-5 w-5 text-blue-600 rounded
                          ${disposalTimeCategory && disposalTimeCategory.id !== editingCategoryId ? 'cursor-not-allowed' : 'cursor-pointer'} // Cursor auf Input
                        `}
                        disabled={disposalTimeCategory && disposalTimeCategory.id !== editingCategoryId}
                      />
                      <span className="text-gray-700 font-medium">Als Verfügungszeit verwenden</span>
                      {disposalTimeCategory && !editingCategoryId && (
                          <span className="text-xs text-red-500 ml-2"> (Nur eine Kategorie kann markiert werden)</span>
                      )}
                    </label>
                    <label className={`flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 shadow-sm
                      ${careCategory && !editingCategoryId
                        ? 'opacity-60 cursor-not-allowed' // Wenn deaktiviert, dann not-allowed
                        : 'cursor-pointer' // Sonst, wenn aktiv, dann pointer
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="isCareCategory"
                        checked={newCategory.isCareCategory}
                        onChange={(e) => setNewCategory({ ...newCategory, isCareCategory: e.target.checked })}
                        className={`form-checkbox h-5 w-5 text-blue-600 rounded
                          ${careCategory && careCategory.id !== editingCategoryId ? 'cursor-not-allowed' : 'cursor-pointer'} // Cursor auf Input
                        `}
                        disabled={careCategory && careCategory.id !== editingCategoryId}
                      />
                      <span className="text-gray-700 font-medium">Als Betreuungskategorie verwenden</span>
                      {careCategory && !editingCategoryId && (
                          <span className="text-xs text-red-500 ml-2"> (Nur eine Kategorie kann markiert werden)</span>
                      )}
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <button
                      onClick={editingCategoryId ? handleUpdateCategory : handleAddCategory}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                    >
                      {editingCategoryId ? 'Kategorie aktualisieren' : 'Kategorie hinzufügen'}
                    </button>
                    {editingCategoryId && (
                      <button
                        onClick={handleCancelEditCategory}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Vorhandene Kategorien</h3>
                    {categories.length === 0 ? (
                      <p className="text-center text-gray-500">Noch keine Kategorien vorhanden.</p>
                    ) : (
                      <ul className="space-y-3">
                        {categories.map(category => (
                          <li key={category.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center gap-2">
                              <span className={`w-6 h-6 rounded-full ${category.color} border border-gray-300`}></span>
                              <span className="text-gray-900 font-medium">{category.name}</span>
                              {category.isDisposalTimeCategory && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Verfügungszeit</span>
                              )}
                              {category.isCareCategory && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Betreuung</span>
                              )}
                            </div>
                            <div>
                              <button
                                onClick={() => handleEditCategoryClick(category)}
                                className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm transition duration-300 ease-in-out transform hover:scale-105"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
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

export default CategoryManagement;
