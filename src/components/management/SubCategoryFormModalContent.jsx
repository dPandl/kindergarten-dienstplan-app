import React from 'react';
import ColorPickerDropdown from '../common/ColorPickerDropdown';
import { blockColors, PAUSE_CATEGORY } from '../../constants/scheduleConstants';

const SubCategoryFormModalContent = ({
  editingSubCategoryId,
  newSubCategory,
  setNewSubCategory,
  categories,
  handleAddSubCategory,
  handleUpdateSubCategory,
  handleCancelEditSubCategory,
}) => {
  return (
    <div className="space-y-5">
      {/* 1. Übergeordneter Schichtblock */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Übergeordneter Schichtblock *
        </label>
        <select
          name="parentCategoryId"
          value={newSubCategory.parentCategoryId}
          onChange={(e) => setNewSubCategory((prev) => ({ ...prev, parentCategoryId: e.target.value }))}
          className="w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition text-gray-800 dark:text-gray-100 cursor-pointer"
        >
          <option value="">Übergeordneten Block auswählen...</option>
          <option value={PAUSE_CATEGORY.id}>{PAUSE_CATEGORY.name}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
          Der Unterblock ordnet sich diesem Hauptblock unter.
        </p>
      </div>

      {/* 2. Name & Farbe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Name des Unterblocks *
          </label>
          <input
            type="text"
            name="name"
            value={newSubCategory.name}
            onChange={(e) => setNewSubCategory((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full h-[42px] px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition text-gray-800 dark:text-gray-100"
            placeholder="z.B. Wald, Sprachförderung, Teamsitzung"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Farbe *
          </label>
          <ColorPickerDropdown
            selectedColor={newSubCategory.color}
            onColorChange={(color) => setNewSubCategory((prev) => ({ ...prev, color }))}
            colors={blockColors}
            placeholder="Farbe auswählen"
          />
        </div>
      </div>

      {/* 3. Action Buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handleCancelEditSubCategory}
          className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
        >
          Abbrechen
        </button>
        <button
          type="button"
          onClick={editingSubCategoryId ? handleUpdateSubCategory : handleAddSubCategory}
          className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition active:scale-95"
        >
          {editingSubCategoryId ? 'Unterblock speichern' : 'Unterblock hinzufügen'}
        </button>
      </div>
    </div>
  );
};

export default SubCategoryFormModalContent;
