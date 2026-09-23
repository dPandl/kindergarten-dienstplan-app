import React from 'react';
import { AlertCircle } from 'lucide-react';
import { PAUSE_CATEGORY } from '../../constants/scheduleConstants';
import { getStrongGroupColor } from '../../utils/colorUtils';

const ScheduleLegend = ({
  categories = [],
  subCategories = [],
  groups = [],
  className = '',
}) => {
  const pauseSubs = subCategories.filter(s => s.parentCategoryId === PAUSE_CATEGORY.id);

  return (
    <div className={`mt-4 pt-3.5 border-t border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-600 dark:text-gray-300 print:break-inside-avoid ${className}`}>
      
      {/* Kategorien & Unterkategorien */}
      <div className="mb-2.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Kategorien & Unterkategorien:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pause */}
          <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xs px-2.5 py-1 rounded-md border border-gray-200/80 dark:border-gray-700/70 shadow-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100">
              <span className={`w-2.5 h-2.5 rounded-full ${PAUSE_CATEGORY.color} shrink-0 ring-1 ring-black/10`}></span>
              <span>{PAUSE_CATEGORY.name}</span>
            </span>
            {pauseSubs.length > 0 && (
              <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 pl-2 border-l border-gray-200 dark:border-gray-700">
                {pauseSubs.map(sub => (
                  <span key={sub.id} className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                    <span className={`w-2 h-2 rounded-full ${sub.color || PAUSE_CATEGORY.color} shrink-0 ring-1 ring-black/10`}></span>
                    <span>{sub.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Hauptkategorien und deren Subkategorien */}
          {categories.map(cat => {
            const subs = subCategories.filter(s => s.parentCategoryId === cat.id);
            return (
              <div
                key={cat.id}
                className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-white/70 dark:bg-gray-800/60 backdrop-blur-xs px-2.5 py-1 rounded-md border border-gray-200/80 dark:border-gray-700/70 shadow-xs"
              >
                <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100">
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color} shrink-0 ring-1 ring-black/10`}></span>
                  <span>{cat.name}</span>
                </span>
                {subs.length > 0 && (
                  <div className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-2.5 border-l border-gray-200 dark:border-gray-700">
                    {subs.map(sub => (
                      <span key={sub.id} className="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                        <span className={`w-2 h-2 rounded-full ${sub.color || cat.color} shrink-0 ring-1 ring-black/10`}></span>
                        <span>{sub.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Gruppen & Status */}
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11px]">
        
        {/* Gruppen */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-0.5">
            Gruppen:
          </span>
          {groups.map(group => (
            <span key={group.id} className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
              <span className={`w-2.5 h-2.5 rounded-full ${getStrongGroupColor(group.color)} ring-1 ring-black/20 dark:ring-white/30 shrink-0`}></span>
              <span>{group.name}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 ml-1">
            <span className="w-3.5 h-2.5 rounded-xs border border-dashed border-gray-500 dark:border-gray-400 shrink-0 bg-transparent"></span>
            <span>Abweichende Zuweisung</span>
          </span>
        </div>

        {/* Status */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-0.5">
            Status:
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <span className="line-through text-rose-500 font-semibold">Name</span>
            <span>Krank</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <span className="opacity-50 font-medium">Name</span>
            <span>Schultag</span>
          </span>
          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Warnung</span>
          </span>
        </div>

      </div>

    </div>
  );
};

export default ScheduleLegend;
