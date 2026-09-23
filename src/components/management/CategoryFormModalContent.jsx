import React from 'react';
import ColorPickerDropdown from '../common/ColorPickerDropdown';
import { blockColors, PAUSE_CATEGORY } from '../../constants/scheduleConstants';

const CategoryFormModalContent = ({
  editingCategoryId,
  newCategory,
  setNewCategory,
  handleAddCategory,
  handleUpdateCategory,
  handleCancelEditCategory,
  disposalTimeCategory,
  careCategory,
}) => {
  return (
    <div className="space-y-5">
      {/* 1. Name & Farbe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Name des Schichtblocks *
          </label>
          <input
            type="text"
            name="name"
            value={newCategory.name}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition text-gray-800 dark:text-gray-100"
            placeholder="z.B. Betreuung, Verfügung"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Farbe *
          </label>
          <ColorPickerDropdown
            selectedColor={newCategory.color}
            onColorChange={(color) => setNewCategory((prev) => ({ ...prev, color }))}
            colors={blockColors}
            placeholder="Farbe auswählen"
          />
        </div>
      </div>

      {/* 2. Besondere Eigenschaften (Verfügung / Betreuung) */}
      <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
        <label
          className={`flex items-start gap-2.5 select-none ${
            disposalTimeCategory && !editingCategoryId ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="checkbox"
            name="isDisposalTimeCategory"
            checked={newCategory.isDisposalTimeCategory}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, isDisposalTimeCategory: e.target.checked }))}
            className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-400 cursor-pointer"
            disabled={disposalTimeCategory && disposalTimeCategory.id !== editingCategoryId}
          />
          <div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Als Verfügungszeit-Kategorie verwenden
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Wird für die automatische Berechnung der Verfügungsstunden herangezogen.
              {disposalTimeCategory && !editingCategoryId && (
                <span className="text-red-500 ml-1 font-medium">(Bereits an "{disposalTimeCategory.name}" vergeben)</span>
              )}
            </p>
          </div>
        </label>

        <label
          className={`flex items-start gap-2.5 pt-3 border-t border-gray-200 dark:border-gray-700 select-none ${
            careCategory && !editingCategoryId ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <input
            type="checkbox"
            name="isCareCategory"
            checked={newCategory.isCareCategory}
            onChange={(e) => setNewCategory((prev) => ({ ...prev, isCareCategory: e.target.checked }))}
            className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-blue-400 cursor-pointer"
            disabled={careCategory && careCategory.id !== editingCategoryId}
          />
          <div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Als Haupt-Betreuungskategorie verwenden
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Markiert die primäre Kinderbetreuungszeit in den Berechnungen und Warnungen.
              {careCategory && !editingCategoryId && (
                <span className="text-red-500 ml-1 font-medium">(Bereits an "{careCategory.name}" vergeben)</span>
              )}
            </p>
          </div>
        </label>
      </div>

      {/* 3. Action Buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancelEditCategory}
          className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={editingCategoryId ? handleUpdateCategory : handleAddCategory}
          className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95"
        >
          {editingCategoryId ? 'Schichtblock speichern' : 'Schichtblock hinzufügen'}
        </button>
      </div>
    </div>
  );
};

export default CategoryFormModalContent;
