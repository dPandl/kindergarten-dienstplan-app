import { timeToMinutes } from './timeUtils';
import { PAUSE_CATEGORY } from '../constants/scheduleConstants';

// Helper to get the strong version of a pale group color for display in management sections
export const getStrongGroupColor = (paleColorClass) => {
  if (!paleColorClass) return 'bg-gray-500';
  if (paleColorClass === 'bg-gray-50') return 'bg-gray-500';
  return paleColorClass.replace('-100', '-500');
};

// Helper function to map Tailwind color classes to hex values
export const getTailwindColorValue = (tailwindColorClass) => {
  switch (tailwindColorClass) {
    case 'bg-red-500': return '#ef4444';
    case 'bg-orange-500': return '#f97316';
    case 'bg-amber-500': return '#f59e0b';
    case 'bg-yellow-500': return '#eab308';
    case 'bg-lime-500': return '#84cc16';
    case 'bg-green-500': return '#22c55e';
    case 'bg-emerald-500': return '#10b981';
    case 'bg-teal-500': return '#14b8a6';
    case 'bg-cyan-500': return '#06b6d4';
    case 'bg-sky-500': return '#0ea5e9';
    case 'bg-blue-500': return '#3b82f6';
    case 'bg-indigo-500': return '#6366f1';
    case 'bg-violet-500': return '#8b5cf6';
    case 'bg-purple-500': return '#a855f7';
    case 'bg-fuchsia-500': return '#d946ef';
    case 'bg-pink-500': return '#ec4899';
    case 'bg-rose-500': return '#f43f5e';
    case 'bg-gray-500': return '#6b7280';
    case 'bg-slate-500': return '#64748b';
    case 'bg-neutral-500': return '#737373';
    case 'bg-gray-200': return '#e5e7eb';
    default: return '#cccccc';
  }
};

// Helper function to calculate position and width for shift blocks
export const getShiftBlockStyles = (shiftSegment, displayStartMinutes, totalDisplayMinutes, categories, subCategories, allGroups) => {
  const startMinutes = timeToMinutes(shiftSegment.startTime);
  const endMinutes = timeToMinutes(shiftSegment.endTime);

  const startMinutesFromDisplayStart = startMinutes - displayStartMinutes;
  const endMinutesFromDisplayStart = endMinutes - displayStartMinutes;

  const clippedStartMinutes = Math.max(0, startMinutesFromDisplayStart);
  const clippedEndMinutes = Math.min(totalDisplayMinutes, endMinutesFromDisplayStart);

  const left = (clippedStartMinutes / totalDisplayMinutes) * 100;
  const width = ((clippedEndMinutes - clippedStartMinutes) / totalDisplayMinutes) * 100;

  let bgColorClass = 'bg-gray-400';
  let borderHexColor = '';

  // PRIORITY 1: Use sub-category's specific color for timeline display
  if (shiftSegment.subCategoryId) {
    const subCat = subCategories.find(sc => sc.id === shiftSegment.subCategoryId);
    if (subCat && subCat.color) {
      bgColorClass = subCat.color;
    } else {
      if (subCat && subCat.parentCategoryId === PAUSE_CATEGORY.id) {
        bgColorClass = PAUSE_CATEGORY.color;
      } else if (subCat) {
        const parentCat = categories.find(cat => cat.id === subCat.parentCategoryId);
        if (parentCat) {
          bgColorClass = parentCat.color;
        }
      }
    }
  } else if (shiftSegment.categoryId) {
    // PRIORITY 2: If no sub-category, use the main category's color
    const category = categories.find(cat => cat.id === shiftSegment.categoryId);
    if (category) {
      bgColorClass = category.color;
    } else if (shiftSegment.categoryId === PAUSE_CATEGORY.id) {
      bgColorClass = PAUSE_CATEGORY.color;
    }
  }

  // If overriddenGroupId is set, use its group color for the inner border
  if (shiftSegment.overriddenGroupId) {
    const overriddenGroup = allGroups.find(g => g.id === shiftSegment.overriddenGroupId);
    if (overriddenGroup) {
      const strongColorClass = overriddenGroup.color.replace('-100', '-500');
      borderHexColor = getTailwindColorValue(strongColorClass);
    } else if (shiftSegment.overriddenGroupId === 'no-group') {
      borderHexColor = getTailwindColorValue('bg-gray-500');
    }
  }

  // Determine text color based on background color
  const textColorClass = (
    bgColorClass.includes('red-') || bgColorClass.includes('orange-') || bgColorClass.includes('amber-') || bgColorClass.includes('yellow-') ||
    bgColorClass.includes('lime-') || bgColorClass.includes('green-') || bgColorClass.includes('emerald-') || bgColorClass.includes('teal-') ||
    bgColorClass.includes('cyan-') || bgColorClass.includes('sky-') || bgColorClass.includes('blue-') || bgColorClass.includes('indigo-') ||
    bgColorClass.includes('violet-') || bgColorClass.includes('purple-') || bgColorClass.includes('fuchsia-') || bgColorClass.includes('pink-') ||
    bgColorClass.includes('rose-') || bgColorClass.includes('gray-500') || bgColorClass.includes('slate-500') || bgColorClass.includes('neutral-500')
  ) ? 'text-white' : 'text-gray-900';

  return { left: `${left}%`, width: `${width}%`, bgColorClass, textColorClass, borderHexColor };
};
