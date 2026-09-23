import React from 'react';
import { Tag, BookmarkPlus, Edit2, Trash2, Plus, CornerDownRight } from 'lucide-react';
import { PAUSE_CATEGORY } from '../../constants/scheduleConstants';

const CategoryListModalContent = ({
  categories,
  subCategories,
  onEditCategory,
  onDeleteCategory,
  onEditSubCategory,
  onDeleteSubCategory,
  onOpenAddCategoryModal,
  onOpenAddSubCategoryModal,
}) => {
  // Liste aller Hauptkategorien inkl. der festen Pause
  const allMainCategories = [
    ...categories,
    // Pause als feste System-Kategorie anzeigen, damit ihre Unterkategorien sichtbar sind
    { ...PAUSE_CATEGORY, isSystemCategory: true }
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar inside Modal */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Schichtblöcke &amp; Unterblöcke ({categories.length} Hauptblöcke, {subCategories.length} Unterblöcke)
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Hier siehst du alle Schichtblöcke mit ihren jeweiligen Unterblöcken im direkten Zusammenhang.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCategoryModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Tag size={14} />
            <span>+ Schichtblock</span>
          </button>
          <button
            onClick={onOpenAddSubCategoryModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-xs shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <BookmarkPlus size={14} />
            <span>+ Unterblock</span>
          </button>
        </div>
      </div>

      {/* Baumartige Liste: Hauptkategorien und ihre Unterkategorien direkt darunter */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {allMainCategories.map((category) => {
          const matchingSubCategories = subCategories.filter(
            (sub) => sub.parentCategoryId === category.id
          );

          return (
            <div
              key={category.id}
              className="p-3 bg-gray-50 dark:bg-gray-750/70 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2"
            >
              {/* Hauptkategorie Zeile */}
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full ${category.color} border border-gray-300 dark:border-gray-600 flex-shrink-0`}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {category.name}
                    </span>
                    {category.isSystemCategory && (
                      <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                        System
                      </span>
                    )}
                    {category.isDisposalTimeCategory && (
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded-full font-medium">
                        Verfügungszeit
                      </span>
                    )}
                    {category.isCareCategory && (
                      <span className="text-[10px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50 px-2 py-0.5 rounded-full font-medium">
                        Haupt-Betreuung
                      </span>
                    )}
                  </div>
                </div>

                {/* Aktionen für Hauptkategorie */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onOpenAddSubCategoryModal(category.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200 dark:border-emerald-800 transition"
                    title={`Unterblock für "${category.name}" hinzufügen`}
                  >
                    <Plus size={13} />
                    <span>Unterblock</span>
                  </button>

                  {!category.isSystemCategory && (
                    <>
                      <button
                        onClick={() => onEditCategory(category)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        title="Schichtblock bearbeiten"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(category.id)}
                        className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                        title="Schichtblock löschen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Unterkategorien direkt darunter eingerückt */}
              {matchingSubCategories.length > 0 ? (
                <div className="pl-6 space-y-1.5 pt-0.5">
                  {matchingSubCategories.map((subCat) => (
                    <div
                      key={subCat.id}
                      className="flex items-center justify-between p-2 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200/60 dark:border-gray-700/60 shadow-2xs hover:bg-white dark:hover:bg-gray-800 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CornerDownRight size={14} className="text-gray-400 flex-shrink-0" />
                        <span
                          className={`w-3.5 h-3.5 rounded-full ${subCat.color || 'bg-gray-400'} border border-gray-300 dark:border-gray-600 flex-shrink-0`}
                        />
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {subCat.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => onEditSubCategory(subCat)}
                          className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition"
                          title="Unterblock bearbeiten"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteSubCategory(subCat.id)}
                          className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition"
                          title="Unterblock löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pl-6 text-[11px] text-gray-400 dark:text-gray-500 italic py-0.5">
                  Keine Unterblöcke zugeordnet.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryListModalContent;
