import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import for generating unique IDs
import { MessageSquare, AlertCircle } from 'lucide-react'; // Import the MessageSquare and AlertCircle icons

// --- IndexedDB Constants for File Handle Storage ---
const DB_NAME = 'DienstplanAppDB';
const STORE_NAME = 'fileHandles';
const DB_VERSION = 1;

// Helper function to open IndexedDB
const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper function to get a file handle from IndexedDB
const getFileHandleFromDb = async (key = 'lastFile') => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Error getting file handle from IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper function to put a file handle into IndexedDB
const putFileHandleInDb = async (fileHandle, key = 'lastFile') => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(fileHandle, key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error putting file handle in IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Helper function to delete a file handle from IndexedDB
const deleteFileHandleFromDb = async (key = 'lastFile') => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error deleting file handle from IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
};

// Define the days of the week for the constant plan
const WEEK_DAYS_PLAN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

// --- German Labor Law Constants (in minutes) ---
const MIN_BREAK_AFTER_6_HOURS = 30; // 30 minutes break after 6 hours work
const MIN_BREAK_AFTER_9_HOURS = 45; // 45 minutes break after 9 hours work (can include the first 30 min)
const MAX_DAILY_WORK_MINUTES = 10 * 60; // 10 hours max actual work time

// --- Fixed System PAUSE Category ---
const PAUSE_CATEGORY = {
  id: '_pause_system_id',
  name: 'Pause',
  color: 'bg-gray-500', // A distinct color for system pause
};

// Employee Type Order for sorting within a group
// Normal employees come first (0), then Zusatzkraft (0.5), then special types (1)
const EMPLOYEE_TYPE_ORDER = {
  'normal': 0,
  'zusatzkraft': 0.5, // New: Added Zusatzkraft
  'apprentice': 1,
  'fsj': 1,
  'intern': 1,
};

// Helper function to convert HH:MM to minutes from midnight
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes from midnight to HH:MM
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper function to merge overlapping or adjacent time ranges
const mergeTimeRanges = (ranges) => {
  if (ranges.length === 0) {
    return [];
  }
  // Sort ranges by start time
  const sortedRanges = ranges.sort((a, b) => a.startMinutes - b.startMinutes);
  const merged = [sortedRanges[0]];

  for (let i = 1; i < sortedRanges.length; i++) {
    const current = sortedRanges[i];
    const lastMerged = merged[merged.length - 1];

    if (current.startMinutes <= lastMerged.endMinutes) {
      // Overlap or adjacent, merge them
      lastMerged.endMinutes = Math.max(lastMerged.endMinutes, current.endMinutes);
    } else {
      // No overlap, add new range
      merged.push(current);
    }
  }
  return merged;
};

// --- Function to check for group staffing warnings ---
// Now considers segment.overriddenGroupId for staffing calculation
const checkGroupStaffingWarnings = (
  group, // The group for which warnings are being checked
  dayOfWeek,
  allEmployees, // All employees, to find their default group
  allShifts, // All shifts, to check for overriddenGroupId
  allCategories,
  allSubCategories
) => {
  const textWarnings = [];
  const staffingWarningRanges = [];

  if (group.disableStaffingWarning) {
    return { warnings: [], staffingWarningRanges: [] };
  }

  if (!(group.daysWithOpeningHours?.[dayOfWeek] ?? false)) {
    return { warnings: [], staffingWarningRanges: [] };
  }

  if (!group.openingHours || !group.openingHours[dayOfWeek] || group.openingHours[dayOfWeek].length === 0) {
    return { warnings: textWarnings, staffingWarningRanges };
  }

  const careCategory = allCategories.find(cat => cat.isCareCategory);
  if (!careCategory) {
    console.warn(`WARNUNG: Keine Kategorie als "Betreuungskategorie" markiert. Gruppen-Besetzungswarnungen für Gruppe "${group.name}" am ${dayOfWeek} werden nicht geprüft.`);
    return { warnings: textWarnings, staffingWarningRanges };
  }

  const minStaffRequired = group.minStaffRequired ?? 2;

  // Create a minute-by-minute timeline for the day (0 to 24*60-1 minutes)
  const dailyTimeline = new Array(24 * 60).fill(0); // Stores count of staff in care category

  allShifts.filter(shift => shift.dayOfWeek === dayOfWeek).forEach(shift => {
    const employee = allEmployees.find(emp => emp.id === shift.employeeId);
    if (!employee) return; // Skip if employee not found

    shift.segments.forEach(segment => {
      let effectiveCategoryId = segment.categoryId;
      if (segment.subCategoryId) {
        const subCat = allSubCategories.find(sc => sc.id === segment.subCategoryId);
        if (subCat) {
          effectiveCategoryId = subCat.parentCategoryId;
        }
      }

      // Check if this segment is for the designated care category AND belongs to the current 'group' being checked
      // A segment belongs to a group if:
      // 1. It has an overriddenGroupId that matches the current 'group.id'
      // 2. OR, if it has no overriddenGroupId, and the employee's default group matches 'group.id'
      const isSegmentInThisGroup =
        (segment.overriddenGroupId && segment.overriddenGroupId === group.id) ||
        (!segment.overriddenGroupId && (employee.groupId || 'no-group') === group.id);
      if (effectiveCategoryId === careCategory.id && isSegmentInThisGroup) {
        const startMinutes = timeToMinutes(segment.startTime);
        const endMinutes = timeToMinutes(segment.endTime);

        for (let m = startMinutes; m < endMinutes; m++) {
          if (m >= 0 && m < 24 * 60) {
            dailyTimeline[m]++;
          }
        }
      }
    });
  });

  group.openingHours[dayOfWeek].forEach(range => {
    const rangeStartMinutes = timeToMinutes(range.start);
    const rangeEndMinutes = timeToMinutes(range.end);

    let currentWarningStart = -1;

    for (let currentMinute = rangeStartMinutes; currentMinute < rangeEndMinutes; currentMinute += 15) {
      let minStaffInSegment = Infinity;
      let segmentEnd = Math.min(currentMinute + 15, rangeEndMinutes);

      if (currentMinute < segmentEnd) {
          for (let m = currentMinute; m < segmentEnd; m++) {
              minStaffInSegment = Math.min(minStaffInSegment, dailyTimeline[m]);
          }
      } else {
          minStaffInSegment = 0;
      }

      if (minStaffInSegment < minStaffRequired) {
        if (currentWarningStart === -1) {
          currentWarningStart = currentMinute;
        }
      } else {
        if (currentWarningStart !== -1) {
          staffingWarningRanges.push({ startMinutes: currentWarningStart, endMinutes: currentMinute });
          textWarnings.push(`weniger als ${minStaffRequired} in Betreuung (${minutesToTime(currentWarningStart)}-${minutesToTime(currentMinute)})`);
          currentWarningStart = -1;
        }
      }
    }

    if (currentWarningStart !== -1) {
      staffingWarningRanges.push({ startMinutes: currentWarningStart, endMinutes: rangeEndMinutes });
      textWarnings.push(`weniger als ${minStaffRequired} in Betreuung (${minutesToTime(currentWarningStart)}-${minutesToTime(rangeEndMinutes)})`);
    }
  });

  return { warnings: textWarnings, staffingWarningRanges };
};

// Helper to format minutes into "X.YYh" (decimal hours) or "Xh" for whole hours
const formatMinutesToDecimalHours = (totalMinutes) => {
  const hours = totalMinutes / 60;
  if (hours % 1 === 0) { // Check if it's a whole number
    return hours.toFixed(0) + 'h'; // Display as integer if whole
  }
  return hours.toFixed(2) + 'h'; // Format to 2 decimal places otherwise
};

// Helper function to map Tailwind color classes to hex values
// DIESE FUNKTION MUSS HIER EINGEFÜGT WERDEN!
const getTailwindColorValue = (tailwindColorClass) => {
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
    case 'bg-gray-200': return '#e5e7eb'; // For 'Ohne Gruppe' default
    default: return '#cccccc'; // Default fallback
  }
};

// Helper function to calculate position and width for shift blocks
// Now takes 'allGroups' as an additional argument to get group colors for overriddenGroupId
const getShiftBlockStyles = (shiftSegment, displayStartMinutes, totalDisplayMinutes, categories, subCategories, allGroups) => {
  const startMinutes = timeToMinutes(shiftSegment.startTime);
  const endMinutes = timeToMinutes(shiftSegment.endTime);

  // Calculate start and end minutes relative to the daily display start hour
  const startMinutesFromDisplayStart = startMinutes - displayStartMinutes;
  const endMinutesFromDisplayStart = endMinutes - displayStartMinutes;

  // Ensure times are within display bounds (clip if outside)
  const clippedStartMinutes = Math.max(0, startMinutesFromDisplayStart);
  const clippedEndMinutes = Math.min(totalDisplayMinutes, endMinutesFromDisplayStart);

  const left = (clippedStartMinutes / totalDisplayMinutes) * 100;
  const width = ((clippedEndMinutes - clippedStartMinutes) / totalDisplayMinutes) * 100;

  let bgColorClass = 'bg-gray-400'; // Default fallback if no category/subcategory found
  let borderHexColor = ''; // Changed variable name to reflect hex color // <-- HIER GEÄNDERT

  // PRIORITY 1: Use sub-category's specific color for timeline display
  if (shiftSegment.subCategoryId) {
    const subCat = subCategories.find(sc => sc.id === shiftSegment.subCategoryId);
    if (subCat && subCat.color) {
      bgColorClass = subCat.color;
    } else {
      // Fallback to parent category's color if sub-category has no specific color
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
      bgColorClass = PAUSE_CATEGORY.color; // Explicitly for the main PAUSE category
    }
  }

  // New: If overriddenGroupId is set, use its group color for the inner border
  if (shiftSegment.overriddenGroupId) {
    const overriddenGroup = allGroups.find(g => g.id === shiftSegment.overriddenGroupId);
    if (overriddenGroup) {
      const strongColorClass = overriddenGroup.color.replace('-100', '-500'); // Get strong Tailwind class
      borderHexColor = getTailwindColorValue(strongColorClass); // Convert to hex // <-- HIER GEÄNDERT
    } else if (shiftSegment.overriddenGroupId === 'no-group') {
      borderHexColor = getTailwindColorValue('bg-gray-500'); // Strong color for 'Ohne Gruppe' border // <-- HIER GEÄNDERT
    }
  }

  // Determine text color based on background color (simple check for dark colors)
  const textColorClass = (
    bgColorClass.includes('red-') || bgColorClass.includes('orange-') || bgColorClass.includes('amber-') || bgColorClass.includes('yellow-') ||
    bgColorClass.includes('lime-') || bgColorClass.includes('green-') || bgColorClass.includes('emerald-') || bgColorClass.includes('teal-') ||
    bgColorClass.includes('cyan-') || bgColorClass.includes('sky-') || bgColorClass.includes('blue-') || bgColorClass.includes('indigo-') ||
    bgColorClass.includes('violet-') || bgColorClass.includes('purple-') || bgColorClass.includes('fuchsia-') || bgColorClass.includes('pink-') ||
    bgColorClass.includes('rose-') || bgColorClass.includes('gray-500') || bgColorClass.includes('slate-500') || bgColorClass.includes('neutral-500')
  ) ? 'text-white' : 'text-gray-900';

  return { left: `${left}%`, width: `${width}%`, bgColorClass, textColorClass, borderHexColor }; // Return borderHexColor // <-- HIER GEÄNDERT
};


// --- Function to calculate daily work metrics and validate breaks ---
// Now takes categories and subCategories to map categoryId/subCategoryId to effective category
const calculateDailyWorkMetrics = (shiftsForDay, categories, subCategories) => {
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;
  let totalDisposalMinutes = 0; // New: for disposal time
  const categoryTotals = {}; // Stores total minutes for each effective category (Basisblock)

  // Create maps for quick lookup
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  const subCategoryMap = new Map(subCategories.map(subCat => [subCat.id, subCat]));

  // Add the system pause category to the map for color lookup
  categoryMap.set(PAUSE_CATEGORY.id, PAUSE_CATEGORY);

  // Sort shifts by start time to process them chronologically
  const sortedSegments = shiftsForDay
    .flatMap(shift => shift.segments.map(s => ({ ...s, shiftId: shift.id })))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (const segment of sortedSegments) {
    const duration = timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime);

    let effectiveCategoryId = segment.categoryId;

    // If a subcategory is used, the time counts towards its parent category
    if (segment.subCategoryId) {
      const subCat = subCategoryMap.get(segment.subCategoryId);
      if (subCat) {
        effectiveCategoryId = subCat.parentCategoryId;
      }
    }

    // Accumulate total for the effective category
    categoryTotals[effectiveCategoryId] = (categoryTotals[effectiveCategoryId] || 0) + duration;

    // Determine if this segment counts as break or work for labor law checks
    if (effectiveCategoryId === PAUSE_CATEGORY.id) {
      totalBreakMinutes += duration;
    } else {
      totalWorkMinutes += duration;
    }

    // Check if this category is marked for disposal time calculation
    const effectiveCategory = categoryMap.get(effectiveCategoryId);
    if (effectiveCategory && effectiveCategory.isDisposalTimeCategory) {
      totalDisposalMinutes += duration;
    }
  }

  const warnings = [];

  // Check for 30-minute break after 6 hours of work
  if (totalWorkMinutes > 6 * 60 && totalBreakMinutes < MIN_BREAK_AFTER_6_HOURS) {
    warnings.push(`Pause (${MIN_BREAK_AFTER_6_HOURS}min) fehlt`);
  }

  // Check for 45-minute break after 9 hours of work
  if (totalWorkMinutes > 9 * 60 && totalBreakMinutes < MIN_BREAK_AFTER_9_HOURS) {
    warnings.push(`Max. Pause (${MIN_BREAK_AFTER_9_HOURS}min) fehlt`);
  }

  // Check for maximum daily work time
  if (totalWorkMinutes > MAX_DAILY_WORK_MINUTES) {
    warnings.push(`Max. Arbeitszeit (${MAX_DAILY_WORK_MINUTES / 60}h) überschritten`);
  }

  // Determine the latest break start time for visual marker (only for 6-hour rule for simplicity)
  let visualBreakMarkerTime = null;
  if (totalWorkMinutes > 6 * 60 && totalBreakMinutes < MIN_BREAK_AFTER_6_HOURS) {
    let currentWorkTime = 0;
    for (const segment of sortedSegments) {
      let effectiveCategoryIdForSegment = segment.categoryId;
      if (segment.subCategoryId) {
        const subCat = subCategoryMap.get(segment.subCategoryId);
        if (subCat) effectiveCategoryIdForSegment = subCat.parentCategoryId;
      }

      if (effectiveCategoryIdForSegment !== PAUSE_CATEGORY.id) { // This segment is work
        currentWorkTime += (timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime));
        if (currentWorkTime >= 6 * 60) {
          const exact6HourMark = timeToMinutes(segment.startTime) + (6 * 60 - (currentWorkTime - (timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime))));
          visualBreakMarkerTime = minutesToTime(exact6HourMark);
          break;
        }
      }
    }
  }

  return {
    categoryTotals, // Contains totals for each user-defined category + PAUSE
    totalWorkMinutes, // For labor law checks
    totalBreakMinutes, // For labor law checks
    totalDisposalMinutes, // New: total disposal minutes for the day
    warnings,
    visualBreakMarkerTime,
  };
};

// Define color palettes
const groupColors = [
    'bg-red-100', 'bg-orange-100', 'bg-amber-100', 'bg-yellow-100', 'bg-lime-100',
    'bg-green-100', 'bg-emerald-100', 'bg-teal-100', 'bg-cyan-100', 'bg-sky-100',
    'bg-indigo-100', 'bg-violet-100', 'bg-purple-100', 'bg-fuchsia-100',
    'bg-pink-100', 'bg-rose-100', 'bg-gray-100', 'bg-slate-100', 'bg-neutral-100',
    'bg-gray-50'
];

const blockColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
    'bg-pink-500', 'bg-rose-500', 'bg-gray-500', 'bg-slate-500', 'bg-neutral-500',
    'bg-gray-50'
];

// Helper to get the strong version of a pale group color for display in management sections
const getStrongGroupColor = (paleColorClass) => {
  if (!paleColorClass) return 'bg-gray-500'; // Default if no color
  // Replace -100 with -500
  return paleColorClass.replace('-100', '-500');
};


// --- New ColorPickerDropdown Component ---
const ColorPickerDropdown = ({ selectedColor, onColorChange, colors, placeholder, useStrongDisplay = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorSelect = (color) => {
    onColorChange(color);
    setIsOpen(false);
  };

  // Determine the color to display in the button and swatches
  const displayColor = useStrongDisplay ? getStrongGroupColor(selectedColor) : selectedColor;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`flex items-center justify-between w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 bg-white`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex items-center">
          {selectedColor && (
            // Display the selected color as a small circle next to the text
            <span className={`inline-block w-5 h-5 rounded-full mr-2 ${displayColor} border border-gray-300`}></span>
          )}
          {/* Always show the placeholder text */}
          <span className="text-gray-700 font-semibold">{placeholder}</span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-600 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto grid grid-cols-4 gap-1 p-2">
          {colors.map((color) => (
            <div
              key={color}
              className={`w-full h-10 flex items-center justify-center rounded-md cursor-pointer border border-gray-200 hover:ring-2 hover:ring-blue-400 transition duration-150 ${useStrongDisplay ? getStrongGroupColor(color) : color} ${selectedColor === color ? 'border-4 border-blue-500' : ''}`}
              onClick={() => handleColorSelect(color)}
              title={color.replace('bg-', '').replace('-100', '')} // Keep title for hover tooltip, remove -100
            >
              {/* Removed the checkmark SVG here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Confirm Modal Component ---
const ConfirmModal = ({ message, onConfirm, onCancel }) => {
  return (
    // NEU: z-[100] hinzugefügt, um sicherzustellen, dass es über anderen Modals liegt
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full transform transition-all duration-300 scale-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Bestätigung</h3>
        <p className="text-gray-700 mb-6 text-center">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Bestätigen
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Print Options Modal Component ---
const PrintOptionsModal = ({
  onPrint,
  onCancel,
  defaultPrintWeeklySummary,
  onPrintWeeklySummaryChange,
  selectedGroupIdFilter,
  setSelectedGroupIdFilter,
  groups, // Diese Prop wird weiterhin benötigt, um die Namen der Gruppen anzuzeigen
  hasEmployeesWithoutGroup,
  selectedEmployeeIdFilter,
  setSelectedEmployeeIdFilter,
  availableEmployeesForFilter,
  // NEUE PROP:
  filteredGroupsForDisplayInFilter // Die gefilterte Liste der Gruppen für das Dropdown
}) => {
  const [printWeeklySummary, setPrintWeeklySummary] = useState(defaultPrintWeeklySummary);

  const handlePrintClick = () => {
    onPrint(printWeeklySummary);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 print-hidden-modal">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full transform transition-all duration-300 scale-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Druckoptionen</h3>

        {/* Hinweis entfernt, da die Funktionalität jetzt vorhanden ist */}
        {/*
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4" role="alert">
          <p className="font-bold">Hinweis:</p>
          <p>Druckoption noch nicht final. Experimentiere mit der Skalierung im Druckenfenster herum um mehr/weniger Seiten zu verwenden.</p>
        </div>
        */}

        {/* Gruppenfilter (bestehend) */}
        <div className="mb-4">
          <label htmlFor="printGroupFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Gruppe filtern:
          </label>
          <select
            id="printGroupFilter"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={selectedGroupIdFilter}
            onChange={(e) => setSelectedGroupIdFilter(e.target.value)}
          >
            {/* Verwenden Sie die neue gefilterte Liste für die Optionen */}
            {filteredGroupsForDisplayInFilter.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        {/* NEU: Mitarbeiterfilter im Druckmodal */}
        <div className="mb-4">
          <label htmlFor="printEmployeeFilter" className="block text-sm font-medium text-gray-700 mb-1">
            Mitarbeiter filtern:
          </label>
          <select
            id="printEmployeeFilter"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={selectedEmployeeIdFilter} // Bindet an den übergebenen Mitarbeiterfilter-State
            onChange={(e) => setSelectedEmployeeIdFilter(e.target.value)} // Aktualisiert den Mitarbeiterfilter-State
          >
            <option value="all">Alle Mitarbeiter</option>
            {availableEmployeesForFilter.map(employee => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center mb-6">
          <input
            type="checkbox"
            id="printWeeklySummary"
            checked={printWeeklySummary}
            onChange={(e) => {
              setPrintWeeklySummary(e.target.checked);
              onPrintWeeklySummaryChange(e.target.checked);
            }}
            className="form-checkbox h-5 w-5 text-blue-600 rounded"
          />
          <label htmlFor="printWeeklySummary" className="ml-3 text-gray-700">Wochenübersicht mitdrucken</label>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={handlePrintClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Drucken
          </button>
          <button
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};

// --- NEUE: Schedule Management Modal Component ---
const ScheduleManagementModal = ({ onClearSchedule, onExportSchedule, onImportSchedule, onCancel, fileInputRef }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 print-hidden-modal">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full transform transition-all duration-300 scale-100">
        <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Wochenplan verwalten</h3>

        <div className="flex flex-col gap-4">
          <button
            onClick={onExportSchedule}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Wochenplan exportieren
          </button>

          <input
            type="file"
            ref={fileInputRef} // Hier den Ref übergeben
            onChange={onImportSchedule}
            accept=".wochenplan" // NEU: Nur .wochenplan Dateien akzeptieren
            className="hidden"
            id="importScheduleFileModal" // Eindeutige ID für dieses Modal
          />
          <label
            htmlFor="importScheduleFileModal"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out cursor-pointer text-center"
          >
            Wochenplan importieren
          </label>

          <button
            onClick={onClearSchedule}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Wochenplan löschen
          </button>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};



// --- Release Notes Data ---
export const RELEASE_NOTES = [
  {
    version: "1.0.6.1 (Beta)",
    whatsNew: [
    ],
    bugFixes: [
      "Die Buttons zum Bearbeiten des Wochenplantitels und zur Verwaltung des Wochenplans werden in der Druckansicht nicht mehr angezeigt.",
    ],
    adjustments: [
      "Das Aussehen beim Drucken wurde leicht angepasst.",
    ]
  },
  {
    version: "1.0.6 (Beta)",
    whatsNew: [
    ],
    bugFixes: [
    ],
    adjustments: [
      "Daten werden nun ausschließlich in Speicherdateien auf dem PC gespeichert. Damit diese automatisch geladen werden, wenn die App geöffnet wird, muss im Browser die Berechtigung 'Daten bearbeiten' erteilt und die Option 'Bei jedem Besuch erlauben' ausgewählt werden.",
      "Wenn alle Daten exportiert werden, wird nun eine .dienstplan Datei statt einer .json Datei erstellt.",
      "Wenn ein Wochenplan exportiert wird, wird nun eine .wochenplan Datei statt einer .json Datei erstellt."
    ]
  },
  {
    version: "1.0.5 (Beta)",
    whatsNew: [
      "Es kann nun nach einzelnen Mitarbeitern gefiltert werden.",
      "Gruppen und Mitarbeiter können nun direkt in den Druckoptionen gefiltert werden.",
      "Wochenpläne können nun exportiert, importiert und gelöscht werden ohne dass andere Daten davon betroffen sind (muss noch ausgiebig getestet werden).",
    ],
    bugFixes: [
      "Das Icon für die Arbeitszeitwarnung wird nun vertikal mittig in der Reihe dargestellt."
    ],
    adjustments: [
      "Der Bearbeiten-Button für den Wochenplan-Titel wurde grafisch angepasst."
    ]
  },
  {
    version: "1.0.4 (Beta)",
    whatsNew: [
      "Die erste funktionierende Druckenfunktion wurde implementiert."
    ],
    bugFixes: [
      "Arbeitszeitwarnungen werden nun wieder angezeigt."
    ],
    adjustments: []
  },
  {
    version: "1.0.3 (Beta)",
    whatsNew: [
      "Blöcke können nun anderen Gruppen zugeordnet werden, und bei Betreuungswarnungen wird dies korrekt berücksichtigt."
    ],
    bugFixes: [
      "Im Wochenplan können sich Blöcke nun wirklich nicht mehr überlappen.",
      "Importierte JSON-Dateien sollten keine Probleme mehr hervorrufen, wenn eine Gruppe bearbeitet wird."
    ],
    adjustments: []
  },
  {
    version: "1.0.2 (Beta)",
    whatsNew: [
      "Unter 'Mitarbeiter verwalten' können Mitarbeiter als Zusatzkräfte angegeben werden. Zusatzkräfte werden unter 'normale Mitarbeiter', aber über 'Praktikanten', 'FSJler' und 'Auszubildende' sortiert.",
      "In 'Gruppen verwalten' können nun Öffnungszeiten der Gruppen angegeben werden. Außerdem kann dort angegeben werden wie viele Mitarbeiter mindestens in der Betreuung sein sollen. Im Wochenplan wird dann eine Warnung angezeigt wenn diese Regel nicht erfüllt ist. Die Anzeige von Warnungen ist nur möglich wenn in Kategorien verwalten ein Block mit der Checkbox 'Als Betreuungskategorie verwenden' markiert wurde.",
      "Feedback Button oben rechts hinzugefügt."
    ],
    bugFixes: [
      "Im Wochenplan können sich nun Blöcke nicht mehr überlappen."
    ],
    adjustments: []
  },
  {
    version: "1.0.0 (Beta)",
    whatsNew: [
      "Individuelle Verfügbarkeiten für deine Mitarbeiter: Im Bereich 'Mitarbeiter verwalten' kannst du jetzt spezifische Verfügbarkeitszeiten für einzelne Mitarbeiter festlegen. Diese individuellen Einstellungen überschreiben die allgemeingültige 'Verfügbarkeitszeit-Regel' und ermöglichen dir eine präzisere und bedarfsgerechtere Planung.",
      "Erweiterte Mitarbeiterrollen und intelligente Arbeitszeitprüfung: Lege deine Mitarbeiter detailliert als normale Mitarbeiter, FSJler, Auszubildende oder Praktikanten fest. Für FSJler, Auszubildende und Praktikanten kannst du zudem die spezifischen Tage definieren, an denen sie in deiner Einrichtung anwesend sind. Im Wochenplan werden Schulzeiten dieser Mitarbeiter visuell heller dargestellt, um deren Abwesenheit klar zu kennzeichnen. Zusätzlich erhältst du in der Wochenübersicht eine Benachrichtigung, wenn die Anwesenheitstage von FSJlern, Auszubildenden oder Praktikanten zu viel oder zu wenig Arbeitszeit aufweisen.",
      "Gruppen-Öffnungszeiten und Personalbesetzungsprüfung: Definiere für jede Gruppe die Öffnungszeiten pro Wochentag, auch mit Unterbrechungen (z.B. Mittagspause). Die App warnt dich, wenn während dieser Öffnungszeiten weniger als zwei Mitarbeiter in der von dir markierten 'Betreuungskategorie' anwesend sind. Diese Funktion ist optional und wird nur aktiv, wenn Öffnungszeiten und eine Betreuungskategorie festgelegt sind."
    ],
    bugFixes: [
      "Ein Block wird nun präzise in das Feld platziert, in das geklickt wurde, wodurch die Bedienung noch zuverlässiger wird."
    ],
    adjustments: [
      "Optimierte Farbdarstellung für Gruppen: In 'Gruppen verwalten' erscheinen Farben nun kräftiger, um eine bessere Unterscheidbarkeit zu gewährleisten. Im Wochenplan und in der Mitarbeiterverwaltung bleiben sie zur besseren Lesbarkeit weiterhin dezent.",
      "Visuelle Zuordnung von Mitarbeitern zu Gruppen: Im Bereich 'Mitarbeiter verwalten' werden vorhandene Mitarbeiter nun mit der jeweiligen Gruppenfarbe hinterlegt, was dir die visuelle Identifikation und Zuordnung erheblich vereinfacht.",
      "Verbessertes Popup im Wochenplan: Das 'Kategorie wählen'-Popup im Wochenplan wird jetzt in den Farben der Blöcke dargestellt, was die Navigation und Auswahl intuitiver macht."
    ]
  }
];


// --- New Version Info Popup Component ---
const NewVersionPopup = ({ version, onClose, releaseNotes }) => {
  const [showHistory, setShowHistory] = useState(false);

  const currentVersionNotes = releaseNotes.find(note => note.version === version);
  const historicalNotes = releaseNotes.filter(note => note.version !== version);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 transition duration-200"
          aria-label="Schließen"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        {!showHistory ? (
          <>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Update: Version {version}</h3>
            <p className="text-gray-700 mb-4">
              Willkommen zurück! Diese Version enthält wichtige Verbesserungen und neue Funktionen, um deine Planung noch effizienter zu gestalten.
            </p>

            {currentVersionNotes && currentVersionNotes.whatsNew.length > 0 && (
              <>
                <h4 className="text-xl font-semibold text-gray-800 mb-2">Was ist neu?</h4>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  {currentVersionNotes.whatsNew.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            {currentVersionNotes && currentVersionNotes.adjustments.length > 0 && (
              <>
                <h4 className="text-xl font-semibold text-gray-800 mb-2">Anpassungen</h4>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  {currentVersionNotes.adjustments.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            {currentVersionNotes && currentVersionNotes.bugFixes.length > 0 && (
              <>
                <h4 className="text-xl font-semibold text-gray-800 mb-2">Fehlerbehebungen</h4>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  {currentVersionNotes.bugFixes.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </>
            )}

            <div className="flex justify-center mt-6">
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out mr-4"
              >
                Verstanden!
              </button>
              {historicalNotes.length > 0 && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Updateverlauf
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">Updateverlauf</h3>
            <div className="space-y-6">
              {releaseNotes.map((note, index) => (
                <div key={index} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <h4 className="text-xl font-semibold text-gray-800 mb-2">Version {note.version}</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {note.whatsNew.map((item, idx) => (
                      <li key={`new-${idx}`} className="text-sm">{item}</li>
                    ))}
                    {note.adjustments.map((item, idx) => (
                      <li key={`adj-${idx}`} className="text-sm">{item}</li>
                    ))}
                    {note.bugFixes.map((item, idx) => (
                      <li key={`fix-${idx}`} className="text-sm">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowHistory(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
              >
                Zurück zum aktuellen Update
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// New component: OpeningHoursEditor - DEFINED DIRECTLY IN APP.JSX
const OpeningHoursEditor = ({ group, onUpdateGroup }) => {
  // KEINE Imports hier, da WEEK_DAYS_PLAN, timeToMinutes, minutesToTime global in App.jsx verfügbar sind
  // oder von App.jsx selbst importiert werden.

  const handleDayToggle = (dayToToggle, checked) => {
    const updatedDaysWithOpeningHours = {
      ...group.daysWithOpeningHours,
      [dayToToggle]: checked,
    };

    let updatedOpeningHours = { ...group.openingHours };
    if (!checked) {
      // If day is disabled, clear its opening hours
      updatedOpeningHours[dayToToggle] = [];
    } else {
      // If day is enabled and has no hours, pre-fill with default
      if (!updatedOpeningHours[dayToToggle] || updatedOpeningHours[dayToToggle].length === 0) {
        // No default times, leave empty
        updatedOpeningHours[dayToToggle] = [];
      }
    }

    onUpdateGroup({
      ...group,
      openingHours: updatedOpeningHours,
      daysWithOpeningHours: updatedDaysWithOpeningHours,
    });
  };

  const handleAddTimeRange = (day) => {
    const currentDayHours = group.openingHours?.[day] || [];
    let newStartMinutes = timeToMinutes('08:00');
    let newEndMinutes = timeToMinutes('12:00'); // Default 4-hour block

    // Find the latest existing end time for the current day
    if (currentDayHours.length > 0) {
      const latestEndTime = Math.max(...currentDayHours.map(range => timeToMinutes(range.end)));
      newStartMinutes = latestEndTime;
      newEndMinutes = latestEndTime + (4 * 60); // Default to 4 hours after the last block
    }

    // Ensure new range doesn't go past 24:00
    if (newEndMinutes > 24 * 60) {
      newEndMinutes = 24 * 60;
      if (newStartMinutes >= newEndMinutes) { // If start also pushed too far, adjust
        newStartMinutes = newEndMinutes - 60; // At least 1 hour block
      }
    }

    const newRange = { start: minutesToTime(newStartMinutes), end: minutesToTime(newEndMinutes) };

    // Prevent adding an identical range
    const isDuplicate = currentDayHours.some(
      range => range.start === newRange.start && range.end === newRange.end
    );

    if (isDuplicate) {
      // Optionally, show a message or adjust the proposed time further
      // For now, just prevent adding
      // alert('Dieser Zeitbereich existiert bereits oder überlappt. Bitte passen Sie die Zeiten an.');
      return;
    }

    const newHours = [...currentDayHours, newRange];
    onUpdateGroup({
      ...group,
      openingHours: {
        ...group.openingHours,
        [day]: newHours,
      },
    });
  };

  const handleRemoveTimeRange = (day, index) => {
    const newHours = (group.openingHours?.[day] || []).filter((_, i) => i !== index);
    onUpdateGroup({
      ...group,
      openingHours: {
        ...group.openingHours,
        [day]: newHours,
      },
    });
  };

  const handleTimeChange = (day, index, field, value) => {
    const newHours = [...(group.openingHours?.[day] || [])];
    newHours[index] = { ...newHours[index], [field]: value };
    onUpdateGroup({
      ...group,
      openingHours: {
        ...group.openingHours,
        [day]: newHours,
      },
    });
  };

  const handleApplyMondayToAllWeek = () => {
    const mondayHours = group.openingHours?.['Montag'] || [];
    const mondayEnabled = group.daysWithOpeningHours?.['Montag'] ?? false; // Default to false for initial state

    const updatedOpeningHours = { ...group.openingHours };
    const updatedDaysWithOpeningHours = { ...group.daysWithOpeningHours };

    WEEK_DAYS_PLAN.forEach(day => {
      if (day !== 'Montag') {
        updatedOpeningHours[day] = [...mondayHours]; // Deep copy
        updatedDaysWithOpeningHours[day] = mondayEnabled;
      }
    });

    onUpdateGroup({
      ...group,
      openingHours: updatedOpeningHours,
      daysWithOpeningHours: updatedDaysWithOpeningHours,
    });
  };


  const handleClearDay = (dayToClear) => {
    onUpdateGroup({
      ...group,
      openingHours: {
        ...group.openingHours,
        [dayToClear]: [],
      },
      daysWithOpeningHours: {
        ...group.daysWithOpeningHours,
        [dayToClear]: false, // Disable the day when clearing times
      },
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="space-y-4"> {/* Container for all weekdays */}
        {WEEK_DAYS_PLAN.map(day => {
          const currentDayHours = group.openingHours?.[day] || [];
          const isDayEnabled = group.daysWithOpeningHours?.[day] ?? false; // Default to false

          return (
            <div key={day} className="p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor={`day-enabled-${group.id}-${day}`} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id={`day-enabled-${group.id}-${day}`}
                    checked={isDayEnabled}
                    onChange={(e) => handleDayToggle(day, e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded"
                  />
                  <span className="text-lg font-semibold text-gray-800">{day}</span>
                </label>
                <div className="flex gap-2">
                  {day === 'Montag' && ( // Only show on Monday
                    <button
                      onClick={handleApplyMondayToAllWeek}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm py-2 px-4 rounded-lg shadow-md transition duration-200"
                    >
                      Auf ganze Woche anwenden
                    </button>
                  )}
                  <button
                    onClick={() => handleClearDay(day)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm py-2 px-4 rounded-lg shadow-md transition duration-200"
                  >
                    Zeiten löschen
                  </button>
                </div>
              </div>

              {!isDayEnabled ? (
                <p className="text-gray-500 italic">Dieser Tag ist für Öffnungszeiten deaktiviert.</p>
              ) : (
                <>
                  {currentDayHours.length === 0 ? (
                    <p className="text-gray-500 italic mb-3">Keine Öffnungszeiten für diesen Tag festgelegt.</p>
                  ) : (
                    <div className="space-y-3 mb-3">
                      {currentDayHours.map((range, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={range.start}
                            onChange={(e) => handleTimeChange(day, index, 'start', e.target.value)}
                            className="p-2 border border-gray-300 rounded-md w-28"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={range.end}
                            onChange={(e) => handleTimeChange(day, index, 'end', e.target.value)}
                            className="p-2 border border-gray-300 rounded-md w-28"
                          />
                          <button
                            onClick={() => handleRemoveTimeRange(day, index)}
                            className="text-red-600 hover:text-red-800 p-1 rounded-full"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleAddTimeRange(day)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 px-4 rounded-lg shadow-md transition duration-200"
                  >
                    + Zeitbereich hinzufügen
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  // Define the current version of the application
  // IMPORTANT: Update this version string whenever you release a new version
  // for which you want to show the "What's New" popup.
  // Use a semantic versioning scheme (major.minor.patch) for easy comparison.
  const CURRENT_APP_VERSION = "1.0.6.1 (Beta)"; // Updated version string

  const [message, setMessage] = useState('');

  // NEU: State, um zu verfolgen, ob der initiale Ladevorgang abgeschlossen ist
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // NEU: Ref für den Auto-Save Debounce Timer
  const autoSaveTimeoutRef = useRef(null);

  // NEU: State für das File System Access API Handle
  const [fileHandle, setFileHandle] = useState(null);

  // Local data loading state
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // New state for showing the version popup
  const [showNewVersionPopup, setShowNewVersionPopup] = useState(false);


  // Initial group state for new groups - now empty by default
  const initialOpeningHoursTemplate = {};
  const initialDaysWithOpeningHoursTemplate = {};
  WEEK_DAYS_PLAN.forEach(day => {
    initialOpeningHoursTemplate[day] = []; // No default times
    initialDaysWithOpeningHoursTemplate[day] = false; // All days disabled by default
  });

  // Group States
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState({
    name: '',
    color: groupColors[0] || 'bg-blue-100',
    openingHours: initialOpeningHoursTemplate,
    daysWithOpeningHours: initialDaysWithOpeningHoursTemplate,
    minStaffRequired: undefined, // Default to undefined
    disableStaffingWarning: true, // Default to true (checkbox unchecked)
  });
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null); // Store the entire group object being edited
  const [orderedGroupIds, setOrderedGroupIds] = useState([]); // New state for group display order
  const [isGroupsSectionMinimized, setIsGroupsSectionMinimized] = useState(true); // Changed to true for default minimized
  const [isGroupOpeningHoursMinimized, setIsGroupOpeningHoursMinimized] = useState(true); // Changed to true for default minimized


  // Removed selectedDayForOpeningHours as it's no longer needed for the UI display logic


  // Employee States
  const [employees, setEmployees] = useState([]);
  // Added overriddenDisposalHours, type, and presenceDays to newEmployee state
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    contractedHoursPerWeek: 0,
    groupId: '',
    overriddenDisposalHours: '',
    type: 'normal', // 'normal', 'zusatzkraft', 'apprentice', 'fsj', 'intern'
    presenceDays: [...WEEK_DAYS_PLAN], // Default to all days for normal employees
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [isEmployeesSectionMinimized, setIsEmployeesSectionMinimized] = useState(true); // Changed to true for default minimized
  const [isExistingEmployeesMinimized, setIsExistingEmployeesMinimized] = useState(true); // New state for existing employees section


  // Category States (new)
  const [categories, setCategories] = useState([]); // These are now only user-defined categories
  const [newCategory, setNewCategory] = useState({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false }); // Added isCareCategory
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [isCategoriesSectionMinimized, setIsCategoriesSectionMinimized] = useState(true); // Changed to true for default minimized

  // SubCategory States (new)
  const [subCategories, setSubCategories] = useState([]);
  const [newSubCategory, setNewSubCategory] = useState({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' }); // Use blockColors
  const [editingSubCategoryId, setEditingSubCategoryId] = useState(null);
  const [isSubCategoriesSectionMinimized, setIsSubCategoriesSectionMinimized] = useState(true); // Changed to true for default minimized

  // Disposal Time Rules States (new)
  const [disposalTimeRules, setDisposalTimeRules] = useState([]);
  // Initialize with empty strings for better input behavior
  const [newDisposalRule, setNewDisposalRule] = useState({ contractedHours: '', disposalHours: '' });
  const [editingDisposalRuleId, setEditingDisposalRuleId] = useState(null);
  const [isDisposalRulesSectionMinimized, setIsDisposalRulesSectionMinimized] = useState(true); // Changed to true for default minimized

  // Master Schedule States (for the constant weekly plan)
  const [masterSchedule, setMasterSchedule] = useState({ shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: 'Wochenplan' }); // Changed to 18:00

  // Display Time Range States (new)
  const [displayStartHour, setDisplayStartHour] = useState(6);
  const [displayStartMinute, setDisplayStartMinute] = useState(0);
  const [displayEndHour, setDisplayEndHour] = useState(18); // Changed to 18
  const [displayEndMinute, setDisplayEndMinute] = useState(0);

  // Customizable Weekly Plan Title States
  const [weeklyPlanTitle, setWeeklyPlanTitle] = useState('Wochenplan');
  const [isEditingWeeklyPlanTitle, setIsEditingWeeklyPlanTitle] = useState(false);

  // New state for selected group filter
  const [selectedGroupIdFilter, setSelectedGroupIdFilter] = useState('all'); // 'all' means all groups

  // NEU: State für Mitarbeiterfilter
  const [selectedEmployeeIdFilter, setSelectedEmployeeIdFilter] = useState('all'); // 'all' means all employees


  // Derived display time calculations
  const displayStartMinutes = (displayStartHour * 60) + displayStartMinute;
  const displayEndMinutes = (displayEndHour * 60) + displayEndMinute;
  const totalDisplayMinutes = Math.max(1, displayEndMinutes - displayStartMinutes);
  const totalDisplayHours = totalDisplayMinutes / 60;


  // Drag & Resize States
  const [isDragging, setIsDragging] = useState(false);
  const [draggedShiftInfo, setDraggedShiftInfo] = useState(null); // { shiftId, dayOfWeek, employeeId, segmentIndex, initialMouseX, initialLeft, initialWidth, initialStartTimeMinutes, initialEndTimeMinutes, dragMode }
  const timelineRefs = useRef({}); // Use a ref to store refs for each timeline row
  const dragStartMouseX = useRef(0); // To track if it was a click or a drag

  const hideTooltipTimeoutRef = useRef(null); // Ref for tooltip hide timeout

  // Click-to-add states
  const [showAddShiftMenu, setShowAddShiftMenu] = useState(false);
  const [addShiftMenuPos, setAddShiftMenuPos] = useState({ x: 0, y: 0 }); // x is now `right` coordinate
  const [addShiftContext, setAddShiftContext] = useState(null); // { employeeId, dayOfWeek, clickedMinutes }

  // Shift Options Menu (for editing/deleting existing shifts)
  const [showShiftOptionsMenu, setShowShiftOptionsMenu] = useState(false);
  const [shiftOptionsMenuPos, setShiftOptionsMenuPos] = useState({ x: 0, y: 0 }); // x is now `right` coordinate
  const [shiftOptionsContext, setShiftOptionsContext] = useState(null); // { shift, segmentIndex }

  // Change Shift Menu (for changing category/subcategory of existing shifts)
  const [showChangeShiftMenu, setShowChangeShiftMenu] = useState(false);
  const [changeShiftMenuPos, setChangeShiftMenuPos] = useState({ x: 0, y: 0 }); // x is now `right` coordinate
  const [changeShiftContext, setChangeShiftContext] = useState(null); // { shift, segmentIndex }

  // Group Assignment Menu
  const [showChangeGroupMenu, setShowChangeGroupMenu] = useState(false);
  const [changeGroupMenuPos, setChangeGroupMenuPos] = useState({ x: 0, y: 0 });
  const [changeGroupContext, setChangeGroupContext] = useState(null); // { shift, segmentIndex, originalShiftColor }

  // States for warning tooltip
  const [showWarningTooltip, setShowWarningTooltip] = useState(false);
  const [warningTooltipContent, setWarningTooltipContent] = useState([]);
  const [warningTooltipPos, setWarningTooltipPos] = useState({ x: 0, y: 0 });

// Global warning display toggle
  const [showStaffingWarningsGlobally, setShowStaffingWarningsGlobally] = useState(true); // Default to true (warnings shown)

  // New state for storing rendered block widths and refs
  const [blockObservedWidths, setBlockObservedWidths] = useState({}); // Changed to observed widths
  const shiftBlockRefs = useRef({}); // To hold refs for each shift block element
  const resizeObservers = useRef({}); // To hold ResizeObserver instances

  // State for dynamic cursor on shift blocks
  const [currentShiftBlockCursor, setCurrentShiftBlockCursor] = useState('grab');

  // NEU: State für das Wochenplan-Verwaltungsmodal
  const [showScheduleManagementModal, setShowScheduleManagementModal] = useState(false);

  // Ref for the file input element (for import)
  const fileInputRef = useRef(null);

  // NEU: Separater Ref für Wochenplan-Import-Dateieingabe
  const fileInputScheduleRef = useRef(null);

  // Drag and Drop refs for groups
  const draggedGroupIdRef = useRef(null);
  const dragOverGroupIdRef = useRef(null);

  // --- Confirmation Modal States ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState(null); // Function to call on confirm

  // --- Print Options States ---
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);
  const [printWeeklySummary, setPrintWeeklySummary] = useState(true); // Default to print weekly summary

  // Dieser Hook berechnet, ob es Mitarbeiter ohne groupId gibt.
  // Er wird nur neu berechnet, wenn sich die 'employees'-Liste ändert.
  const hasEmployeesWithoutGroup = useMemo(() => {
    return employees.some(emp => !emp.groupId);
  }, [employees]); // Abhängigkeit von 'employees'

 // NEU: useMemo für die Liste der Mitarbeiter für den Filter
  const availableEmployeesForFilter = useMemo(() => {
    let employeesToFilter = employees;


    // Wenn ein Gruppenfilter ausgewählt ist (außer "Alle Gruppen"),
    // filtern Sie die Mitarbeiter nach dieser Gruppe.
    if (selectedGroupIdFilter !== 'all') {
      employeesToFilter = employees.filter(employee =>
        (selectedGroupIdFilter === 'no-group' && !employee.groupId) ||
        (employee.groupId === selectedGroupIdFilter)
      );
    }

    // Sortiert die gefilterten Mitarbeiter nach Namen
    return [...employeesToFilter].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, selectedGroupIdFilter]); // Abhängigkeiten aktualisiert: selectedGroupIdFilter hinzugefügt

  // NEU: useMemo für die Liste der Gruppen, die im Gruppenfilter angezeigt werden sollen
  // DIESER BLOCK MUSS DIREKT UNTER ANDEREN TOP-LEVEL USEMEMOS/USESTATES STEHEN!
  const filteredGroupsForDisplayInFilter = useMemo(() => {
    let groupsToShow = [{ id: 'all', name: 'Alle Gruppen' }]; // Start always with "Alle Gruppen"

    if (selectedEmployeeIdFilter !== 'all') {
      // Wenn ein spezifischer Mitarbeiter ausgewählt ist, zeigen Sie nur dessen Gruppe an
      const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeIdFilter);
      if (selectedEmployee) {
        if (selectedEmployee.groupId) {
          const employeeGroup = groups.find(g => g.id === selectedEmployee.groupId);
          if (employeeGroup) {
            groupsToShow.push(employeeGroup);
          }
        } else {
          // Mitarbeiter hat keine Gruppe, fügen Sie "Ohne Gruppe" hinzu
          groupsToShow.push({ id: 'no-group', name: 'Ohne Gruppe' });
        }
      }
    } else {
      // Wenn "Alle Mitarbeiter" ausgewählt ist, zeigen Sie alle Gruppen an
      groups.forEach(group => groupsToShow.push(group));
      // Fügen Sie "Ohne Gruppe" hinzu, wenn es Mitarbeiter ohne Gruppe gibt
      if (hasEmployeesWithoutGroup) {
        groupsToShow.push({ id: 'no-group', name: 'Ohne Gruppe' });
      }
    }

    // Sortieren Sie die Gruppen nach Namen (außer "Alle Gruppen" und "Ohne Gruppe" am Ende)
    const sortedUserGroups = groupsToShow.filter(g => g.id !== 'all' && g.id !== 'no-group').sort((a, b) => a.name.localeCompare(b.name));
    const ohneGruppeOption = groupsToShow.find(g => g.id === 'no-group');

    return [
      groupsToShow.find(g => g.id === 'all'), // "Alle Gruppen" immer zuerst
      ...sortedUserGroups,
      ...(ohneGruppeOption ? [ohneGruppeOption] : []) // "Ohne Gruppe" immer zuletzt, falls vorhanden
    ].filter(Boolean); // Entfernt mögliche null/undefined Einträge
  }, [employees, groups, selectedEmployeeIdFilter, hasEmployeesWithoutGroup]); // Abhängigkeiten aktualisiert


  // Ref for the main container to calculate relative positions
  const mainContainerRef = useRef(null);


  // --- Find the category marked for disposal time calculation ---
  const disposalTimeCategory = useMemo(() => {
    return categories.find(cat => cat.isDisposalTimeCategory);
  }, [categories]);

  // Find the category marked for care (Betreuung)
  const careCategory = useMemo(() => {
    return categories.find(cat => cat.isCareCategory);
  }, [categories]);


  // Memoized list of all unique categories (including PAUSE) for table headers
  const allUniqueCategories = useMemo(() => {
    const uniqueCategoryIds = new Set();
    categories.forEach(cat => uniqueCategoryIds.add(cat.id));
    // Add PAUSE_CATEGORY explicitly if it's not already in the main categories
    uniqueCategoryIds.add(PAUSE_CATEGORY.id);

    // Collect all category objects
    const allCats = Array.from(uniqueCategoryIds).map(id => {
      if (id === PAUSE_CATEGORY.id) return PAUSE_CATEGORY;
      return categories.find(cat => cat.id === id);
    }).filter(Boolean);

    // Sort alphabetically by name
    return allCats.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Filtered categories for dynamic table headers (excluding disposal time and Pause, as they have dedicated columns)
  const dynamicCategoryHeaders = useMemo(() => {
    return allUniqueCategories.filter(cat =>
      cat.id !== PAUSE_CATEGORY.id && (!disposalTimeCategory || cat.id !== disposalTimeCategory.id)
    );
  }, [allUniqueCategories, disposalTimeCategory]);


  // Helper to determine text color based on background color for group labels and summary blocks
  const getTextColorForBg = useCallback((bgColorClass) => {
    // List of colors that are typically dark enough for white text
    const darkColors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
      'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
      'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
      'bg-pink-500', 'bg-rose-500', 'bg-gray-500', 'bg-slate-500', 'bg-neutral-500'
    ];

    if (darkColors.includes(bgColorClass)) {
      return 'text-white';
    }
    // For lighter shades (100, 200, 50) and any other cases, use dark text
    return 'text-gray-900';
  }, []); // No dependencies, so it's stable


  // Sort employees for rendering based on group order, then type, then hours/name
  const sortedEmployees = useMemo(() => {
    const groupOrderMap = new Map(orderedGroupIds.map((id, index) => [id, index]));

    const employeesCopy = [...employees];

    employeesCopy.sort((a, b) => {
      // 1. Primary sort: Group order
      const groupAId = a.groupId || 'no-group';
      const groupBId = b.groupId || 'no-group';
      const orderA = groupOrderMap.has(groupAId) ? groupOrderMap.get(groupAId) : Infinity;
      const orderB = groupOrderMap.has(groupBId) ? groupOrderMap.get(groupBId) : Infinity;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // 2. Secondary sort (within the same group): Employee type (normal first, then zusatzkraft, then special)
      const typeOrderA = EMPLOYEE_TYPE_ORDER[a.type];
      const typeOrderB = EMPLOYEE_TYPE_ORDER[b.type];

      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB;
      }

      // 3. Tertiary sort (within same group and same type):
      if (a.type === 'normal' || a.type === 'zusatzkraft') { // Both normal and zusatzkraft sort by contracted hours
        // For normal/zusatzkraft employees: contracted hours descending, then name alphabetically
        if (b.contractedHoursPerWeek !== a.contractedHoursPerWeek) {
          return b.contractedHoursPerWeek - a.contractedHoursPerWeek;
        }
        return a.name.localeCompare(b.name);
      } else {
        // For special employees: name alphabetically
        return a.name.localeCompare(b.name);
      }
    });
    return employeesCopy;
  }, [employees, orderedGroupIds]); // Dependencies


  // Filtered employees based on selectedGroupIdFilter
  const filteredEmployeesForDisplay = useMemo(() => {
    // Starten Sie mit den bereits sortierten Mitarbeitern
    let currentFilteredEmployees = sortedEmployees;

    // Filter nach Gruppe (bestehende Logik)
    if (selectedGroupIdFilter !== 'all') {
      currentFilteredEmployees = currentFilteredEmployees.filter(emp =>
        (selectedGroupIdFilter === 'no-group' && !emp.groupId) ||
        (emp.groupId === selectedGroupIdFilter)
      );
    }

    // NEU: Filter nach Mitarbeiter
    if (selectedEmployeeIdFilter !== 'all') {
      currentFilteredEmployees = currentFilteredEmployees.filter(emp =>
        emp.id === selectedEmployeeIdFilter
      );
    }

    return currentFilteredEmployees;
  }, [sortedEmployees, selectedGroupIdFilter, selectedEmployeeIdFilter]); // Abhängigkeiten aktualisiert



  // Get unique group objects in sorted order for rendering group headers
  // This is now an an array of group objects, including a default for 'Ohne Gruppe'
  const uniqueSortedGroups = useMemo(() => {
    let allPossibleGroups = [...groups]; // Start with all defined groups

    // Always add a placeholder for 'Ohne Gruppe' if there are employees without a group,
    // regardless of the current filter, so it's available for filtering later.
    const hasUnassignedEmployees = employees.some(emp => !emp.groupId);
    const ohneGruppePlaceholder = { id: 'no-group', name: 'Ohne Gruppe', color: 'bg-gray-200' };
    if (hasUnassignedEmployees && !allPossibleGroups.some(g => g.id === 'no-group')) {
        allPossibleGroups.push(ohneGruppePlaceholder);
    }

    let groupsToOrder = allPossibleGroups;
    // The filtering for selectedGroupIdFilter is handled by `filteredEmployeesForDisplay`
    // This memo just provides the ordered list of group headers that *could* be displayed.

    // Apply the user-defined order to the `groupsToOrder` list.
    const groupMap = new Map(groupsToOrder.map(g => [g.id, g]));
    let finalOrderedGroups = orderedGroupIds
        .filter(id => groupMap.has(id))
        .map(id => groupMap.get(id))
        .filter(Boolean);

    // Add any groups from `groupsToOrder` that were NOT in `orderedGroupIds`
    const existingOrderedIds = new Set(finalOrderedGroups.map(g => g.id));
    const unOrderedGroups = groupsToOrder.filter(g => !existingOrderedIds.has(g.id));
    finalOrderedGroups = [...finalOrderedGroups, ...unOrderedGroups];

    // Ensure 'Ohne Gruppe' is always at the very end if it exists and is needed
    const ohneGruppeEntry = finalOrderedGroups.find(g => g.id === 'no-group');
    if (ohneGruppeEntry) {
        finalOrderedGroups = finalOrderedGroups.filter(g => g.id !== 'no-group');
        finalOrderedGroups.push(ohneGruppePlaceholder);
    }

    return finalOrderedGroups;
  }, [orderedGroupIds, groups, employees]); // Depend on all employees to know if 'Ohne Gruppe' is needed


  // --- Calculate Weekly Summaries (Memoized for performance) ---
  const weeklySummaries = useMemo(() => {
    const summaries = {};
    // Summarize for the currently filtered and sorted employees
    const employeesToSummarize = filteredEmployeesForDisplay;

    if (employeesToSummarize.length === 0 || !masterSchedule.shifts || categories.length === 0) {
        return summaries;
    }

    // Create maps for quick lookup of categories and subcategories
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
    const subCategoryMap = new Map(subCategories.map(subCat => [subCat.id, subCat]));

    // Add the system pause category to the map for color lookup
    categoryMap.set(PAUSE_CATEGORY.id, PAUSE_CATEGORY);

    employeesToSummarize.forEach(employee => {
        let weeklyTotalWorkMinutes = 0;
        let weeklyTotalBreakMinutes = 0;
        let weeklyTotalDisposalMinutes = 0; // New: weekly total disposal minutes
        let weeklyWorkMinutesOnPresenceDays = 0; // New: for specific warning
        const weeklyCategoryTotals = {}; // Aggregate category totals for the week

        WEEK_DAYS_PLAN.forEach(day => {
            const shiftsForDay = masterSchedule.shifts.filter(shift =>
                shift.employeeId === employee.id && shift.dayOfWeek === day
            );
            const {
                categoryTotals, // This now contains all dynamic categories + PAUSE
                totalWorkMinutes,
                totalBreakMinutes,
                totalDisposalMinutes // New: daily disposal minutes
            } = calculateDailyWorkMetrics(
                shiftsForDay,
                categories,
                subCategories
            );

            weeklyTotalWorkMinutes += totalWorkMinutes;
            weeklyTotalBreakMinutes += totalBreakMinutes;
            weeklyTotalDisposalMinutes += totalDisposalMinutes; // Accumulate daily disposal minutes

            // Accumulate work minutes only for presence days if employee is not 'normal' or 'zusatzkraft'
            if ((employee.type === 'normal' || employee.type === 'zusatzkraft') || (employee.presenceDays || []).includes(day)) {
                weeklyWorkMinutesOnPresenceDays += totalWorkMinutes;
            }
        });

        const contractedMinutesPerWeek = employee.contractedHoursPerWeek * 60;
        const discrepancy = weeklyTotalWorkMinutes - contractedMinutesPerWeek;
        const toleranceMinutes = 0.1; // Allow for very minor rounding differences (e.g., 0.01h = 0.6 min)

        const weeklyWarnings = []; // Defined here to ensure it's always an array
        if (discrepancy > toleranceMinutes) {
            weeklyWarnings.push(`Überstunden: ${formatMinutesToDecimalHours(discrepancy)}`);
        } else if (discrepancy < -toleranceMinutes) {
            weeklyWarnings.push(`Unterstunden: ${formatMinutesToDecimalHours(Math.abs(discrepancy))}`);
        }

        // --- Calculate Disposal Time Discrepancy ---
        let targetDisposalMinutes = 0;
        // Prioritize overriddenDisposalHours if set
        if (employee.overriddenDisposalHours !== null && employee.overriddenDisposalHours !== undefined && employee.overriddenDisposalHours !== '') {
            targetDisposalMinutes = Number(employee.overriddenDisposalHours) * 60;
        } else {
            const targetDisposalRule = disposalTimeRules.find(rule => {
                const ruleContractedHours = Number(rule.contractedHours);
                const employeeContractedHours = Number(employee.contractedHoursPerWeek);
                return ruleContractedHours === employeeContractedHours;
            });
            targetDisposalMinutes = targetDisposalRule ? targetDisposalRule.disposalHours * 60 : 0;
        }

        const disposalDiscrepancy = weeklyTotalDisposalMinutes - targetDisposalMinutes;

        if (targetDisposalMinutes > 0) { // Only warn if a target is set
            if (disposalDiscrepancy > toleranceMinutes) {
                weeklyWarnings.push(`VZ Überschuss: ${formatMinutesToDecimalHours(disposalDiscrepancy)}`);
            } else if (disposalDiscrepancy < -toleranceMinutes) {
                weeklyWarnings.push(`VZ Defizit: ${formatMinutesToDecimalHours(Math.abs(disposalDiscrepancy))}`);
            }
        }

        // --- New: Warning for overwork on presence days for special employee types ---
        // This warning applies only to 'apprentice', 'fsj', 'intern'
        if (employee.type !== 'normal' && employee.type !== 'zusatzkraft' && (employee.presenceDays || []).length > 0) {
            // Calculate expected daily hours on presence days
            const numPresenceDays = (employee.presenceDays || []).length;
            if (numPresenceDays > 0) {
                const expectedDailyMinutesOnPresenceDays = contractedMinutesPerWeek / WEEK_DAYS_PLAN.length; // Total contracted hours divided by 5 days
                const expectedWorkOnPresenceDays = expectedDailyMinutesOnPresenceDays * numPresenceDays; // Sum of expected daily hours for presence days

                const presenceDayDiscrepancy = weeklyWorkMinutesOnPresenceDays - expectedWorkOnPresenceDays;

                if (presenceDayDiscrepancy > toleranceMinutes) {
                    weeklyWarnings.push(`Anwesenheitstage: +${formatMinutesToDecimalHours(presenceDayDiscrepancy)}`);
                } else if (presenceDayDiscrepancy < -toleranceMinutes) {
                    weeklyWarnings.push(`Anwesenheitage: -${formatMinutesToDecimalHours(Math.abs(presenceDayDiscrepancy))}`);
                }
            }
        }


        summaries[employee.id] = {
            employeeName: employee.name,
            contractedHours: employee.contractedHoursPerWeek,
            weeklyTotalWorkMinutes,
            weeklyTotalBreakMinutes,
            weeklyTotalDisposalMinutes, // New: actual weekly disposal minutes
            targetDisposalMinutes, // New: target weekly disposal minutes
            weeklyCategoryTotals, // New: contains totals for each specific category for the week
            weeklyWarnings
        };
    });
    return summaries;
  }, [employees, filteredEmployeesForDisplay, masterSchedule, categories, subCategories, selectedGroupIdFilter, disposalTimeRules, getTextColorForBg]); // Dependencies for useMemo


  // New memo for group warnings
  const groupWarnings = useMemo(() => {
    // Wenn der globale Schalter auf "aus" steht, gib keine Warnungen zurück.
    if (!showStaffingWarningsGlobally) {
      return {};
    }

    const warningsByGroupAndDay = {};
    if (groups.length === 0 || employees.length === 0 || masterSchedule.shifts.length === 0 || categories.length === 0) {
      return warningsByGroupAndDay;
    }

    const groupsToProcess = selectedGroupIdFilter === 'all'
      ? uniqueSortedGroups
      : uniqueSortedGroups.filter(g => g.id === selectedGroupIdFilter);

    groupsToProcess.forEach(group => {
      // Only process groups that have employees assigned to them and warnings are not disabled for this specific group
      const employeesInGroup = employees.filter(emp => (emp.groupId || 'no-group') === group.id);
      if (employeesInGroup.length === 0 || group.disableStaffingWarning) { // Also check group's own setting
        return;
      }

      warningsByGroupAndDay[group.id] = {};
      WEEK_DAYS_PLAN.forEach(day => {
        const { warnings, staffingWarningRanges } = checkGroupStaffingWarnings(
          group,
          day,
          employees,
          masterSchedule.shifts,
          categories,
          subCategories
        );
        if (warnings.length > 0 || staffingWarningRanges.length > 0) {
          warningsByGroupAndDay[group.id][day] = { textWarnings: warnings, visualWarningRanges: staffingWarningRanges };
        }
      });
    });
    return warningsByGroupAndDay;
  }, [groups, employees, masterSchedule.shifts, categories, subCategories, uniqueSortedGroups, selectedGroupIdFilter, showStaffingWarningsGlobally]); // Hinzugefügt: showStaffingWarningsGlobally

  // Initiales Laden der Daten und Versionsprüfung
  useEffect(() => {
    // Helper function to compare semantic versions (e.g., "1.0.0" vs "1.0.1")
    const compareVersions = (v1, v2) => {
      const cleanV1 = v1.replace(/\s*\(.*\)\s*$/, '');
      const cleanV2 = v2.replace(/\s*\(.*\)\s*$/, '');
      const parts1 = cleanV1.split('.').map(Number);
      const parts2 = cleanV2.split('.').map(Number);
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
      }
      return 0;
    };

    const loadInitialData = async () => {
      console.log("App startet: Versuche initiale Daten zu laden...");
      try {
        const storedHandle = await getFileHandleFromDb();
        let loadedSuccessfully = false;
        console.log("IndexedDB: storedHandle gefunden?", !!storedHandle);

        if (storedHandle) {
          console.log("StoredHandle gefunden. Überprüfe Berechtigung...");
          const permissionStatus = await storedHandle.queryPermission({ mode: 'readwrite' });
          console.log("Berechtigungsstatus:", permissionStatus);

          if (permissionStatus === 'granted') {
            try {
              console.log("Berechtigung erteilt. Versuche Datei zu lesen...");
              const file = await storedHandle.getFile();
              const content = await file.text();
              const importedData = JSON.parse(content);
              console.log("Dateiinhalt erfolgreich gelesen und geparst.");

              // Basic validation of imported data structure
              if (
                importedData.groups && Array.isArray(importedData.groups) &&
                importedData.employees && Array.isArray(importedData.employees) &&
                importedData.categories && Array.isArray(importedData.categories) &&
                importedData.subCategories && Array.isArray(importedData.subCategories) &&
                importedData.masterSchedule && importedData.masterSchedule.shifts && Array.isArray(importedData.masterSchedule.shifts)
              ) {
                // Daten in die States laden
                setGroups(importedData.groups.map(g => {
                  const groupWithInitializedHours = { ...g };
                  if (!groupWithInitializedHours.openingHours) {
                    groupWithInitializedHours.openingHours = {};
                  }
                  WEEK_DAYS_PLAN.forEach(day => {
                    if (!groupWithInitializedHours.openingHours[day]) {
                      groupWithInitializedHours.openingHours[day] = [];
                    }
                  });
                  groupWithInitializedHours.minStaffRequired = (g.minStaffRequired === undefined || g.minStaffRequired === null) ? undefined : g.minStaffRequired;
                  groupWithInitializedHours.disableStaffingWarning = g.disableStaffingWarning ?? true;
                  if (typeof groupWithInitializedHours.daysWithOpeningHours !== 'object' || groupWithInitializedHours.daysWithOpeningHours === null) {
                      groupWithInitializedHours.daysWithOpeningHours = {};
                      WEEK_DAYS_PLAN.forEach(day => groupWithInitializedHours.daysWithOpeningHours[day] = false);
                  } else {
                      WEEK_DAYS_PLAN.forEach(day => {
                          if (groupWithInitializedHours.daysWithOpeningHours[day] === undefined) {
                              groupWithInitializedHours.daysWithOpeningHours[day] = false;
                          }
                      });
                  }
                  return groupWithInitializedHours;
                }));
                setEmployees(importedData.employees.map(emp => ({
                  ...emp,
                  overriddenDisposalHours: emp.overriddenDisposalHours ?? '',
                  type: emp.type ?? 'normal',
                  presenceDays: emp.presenceDays ?? [...WEEK_DAYS_PLAN],
                })));
                setCategories(importedData.categories.map(cat => ({
                  ...cat,
                  isDisposalTimeCategory: cat.isDisposalTimeCategory ?? false,
                  isCareCategory: cat.isCareCategory ?? false
                })));
                setSubCategories(importedData.subCategories);
                setDisposalTimeRules(importedData.disposalTimeRules || []);
                setMasterSchedule(importedData.masterSchedule);
                setOrderedGroupIds(importedData.orderedGroupIds || importedData.groups.map(g => g.id));

                // Dynamic adjustment of display time range based on imported shifts
                let minOverallMinutes = 24 * 60;
                let maxOverallMinutes = 0;
                let hasShifts = false;

                importedData.masterSchedule.shifts.forEach(shift => {
                  shift.segments.forEach(segment => {
                    const segmentStartMinutes = timeToMinutes(segment.startTime);
                    const segmentEndMinutes = timeToMinutes(segment.endTime);

                    minOverallMinutes = Math.min(minOverallMinutes, segmentStartMinutes);
                    maxOverallMinutes = Math.max(maxOverallMinutes, segmentEndMinutes);
                    hasShifts = true;
                  });
                });

                if (hasShifts) {
                  let newDisplayStartMinutes = Math.floor(minOverallMinutes / 15) * 15;
                  let newDisplayEndMinutes = Math.ceil(maxOverallMinutes / 15) * 15;
                  if (newDisplayEndMinutes <= newDisplayStartMinutes) {
                      newDisplayEndMinutes = newDisplayStartMinutes + 15;
                  }
                  newDisplayStartMinutes = Math.max(0, newDisplayStartMinutes);
                  newDisplayEndMinutes = Math.min(24 * 60, newDisplayEndMinutes);

                  setDisplayStartHour(Math.floor(newDisplayStartMinutes / 60));
                  setDisplayStartMinute(newDisplayStartMinutes % 60);
                  setDisplayEndHour(Math.floor(newDisplayEndMinutes / 60));
                  setDisplayEndMinute(newDisplayEndMinutes % 60);
                } else {
                  setDisplayStartHour(6);
                  setDisplayStartMinute(0);
                  setDisplayEndHour(18);
                  setDisplayEndMinute(0);
                }
                setWeeklyPlanTitle(importedData.masterSchedule.title || 'Wochenplan');
                setFileHandle(storedHandle); // Setze das geladene Handle
                setMessage('Daten aus letzter Datei erfolgreich geladen!');
                loadedSuccessfully = true;
                console.log("Daten erfolgreich aus gespeicherter Datei geladen.");
              } else {
                console.warn("Gespeicherte Datei hat ungültiges Format oder ist leer.");
                setMessage('Die zuletzt geöffnete Datei ist ungültig oder leer. Bitte öffnen Sie eine neue Datei.');
                await deleteFileHandleFromDb(); // Ungültiges Handle entfernen
                setFileHandle(null);
              }
            } catch (readError) {
              console.error("Fehler beim Lesen der zuletzt verwendeten Datei:", readError);
              setMessage('Fehler beim Lesen der zuletzt verwendeten Datei. Bitte öffnen Sie eine neue Datei.');
              await deleteFileHandleFromDb(); // Handle entfernen, da es nicht lesbar war
              setFileHandle(null);
            }
          } else if (permissionStatus === 'prompt') {
            setMessage('Berechtigung für die zuletzt verwendete Datei erforderlich. Bitte öffnen Sie die Datei manuell.');
          } else if (permissionStatus === 'denied') {
            setMessage('Berechtigung für die zuletzt verwendete Datei verweigert. Bitte öffnen Sie die Datei manuell.');
            await deleteFileHandleFromDb(); // Handle entfernen, da Berechtigung verweigert
            setFileHandle(null);
          }
        }

        // Wenn keine Datei geladen wurde (entweder keine gespeichert oder Fehler), starten wir mit leeren Standarddaten
        if (!loadedSuccessfully) {
          console.log("Keine Datei automatisch geladen. Setze Standarddaten.");
          setGroups([]);
          setEmployees([]);
          setCategories([]);
          setSubCategories([]);
          setDisposalTimeRules([]);
          setMasterSchedule({ shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: 'Wochenplan' });
          setOrderedGroupIds([]);
          setSelectedGroupIdFilter('all');
          setDisplayStartHour(6);
          setDisplayStartMinute(0);
          setDisplayEndHour(18);
          setDisplayEndMinute(0);
          setWeeklyPlanTitle('Wochenplan');
          setMessage('Keine vorherigen Daten gefunden. Starten Sie mit einem leeren Plan oder öffnen Sie eine Datei.');
        }

        // Versionsprüfung (unabhängig vom Datenladen)
        const lastShownAppVersion = localStorage.getItem('lastShownAppVersion');
        if (!lastShownAppVersion || compareVersions(CURRENT_APP_VERSION, lastShownAppVersion) > 0) {
          setShowNewVersionPopup(true);
          localStorage.setItem('lastShownAppVersion', CURRENT_APP_VERSION);
        }

      } catch (error) {
        console.error("Allgemeiner Fehler beim Initialisieren der App:", error);
        setMessage("Ein Fehler ist beim Starten der App aufgetreten.");
      } finally {
        setIsDataLoaded(true); // Mark data as loaded regardless of success/failure
        setIsInitialLoadComplete(true);
        console.log("Initialer Ladevorgang abgeschlossen. isDataLoaded:", true);
      }
    };

    loadInitialData();
  }, []); // Empty dependency array means this runs once on mount

  // --- Group Management ---
  const handleAddGroup = () => {
    if (!newGroup.name.trim()) {
      setMessage('Gruppenname darf nicht leer sein.');
      return;
    }
    const groupToAdd = { ...newGroup, id: uuidv4() };
    setGroups(prev => [...prev, groupToAdd]);
    setOrderedGroupIds(prev => [...prev, groupToAdd.id]); // Add to end of order
    setNewGroup({
      name: '',
      color: groupColors[0] || 'bg-blue-100',
      openingHours: initialOpeningHoursTemplate, // Use empty template
      daysWithOpeningHours: initialDaysWithOpeningHoursTemplate, // Use empty template
      minStaffRequired: undefined,
      disableStaffingWarning: true,
    }); // Reset to default, use groupColors
    setMessage('Gruppe erfolgreich hinzugefügt!');
  };

  const handleDeleteGroup = (id) => {
    // Prevent deletion if group is assigned to any employee
    const isGroupUsed = employees.some(emp => emp.groupId === id);
    if (isGroupUsed) {
      setMessage('Gruppe kann nicht gelöscht werden, daher ihr noch Mitarbeiter zugeordnet sind.');
      return;
    }
    setGroups(prev => prev.filter(group => group.id !== id));
    setOrderedGroupIds(prev => prev.filter(groupId => groupId !== id)); // Remove from order
    setMessage('Gruppe erfolgreich gelöscht!');
  };

  const handleEditGroupClick = (group) => {
    setEditingGroupId(group.id);
    const initialEditedOpeningHours = {};
    const initialEditedDaysWithOpeningHours = {};
    WEEK_DAYS_PLAN.forEach(day => {
      initialEditedOpeningHours[day] = group.openingHours?.[day] || [];
      initialEditedDaysWithOpeningHours[day] = group.daysWithOpeningHours?.[day] ?? false; // Default to false
    });
    setEditingGroup({
      ...group,
      openingHours: initialEditedOpeningHours,
      daysWithOpeningHours: initialEditedDaysWithOpeningHours,
      minStaffRequired: group.minStaffRequired ?? undefined, // Ensure undefined if not set
      disableStaffingWarning: group.disableStaffingWarning ?? true, // Ensure true if not set
    });
    setIsGroupOpeningHoursMinimized(false); // Open the section when editing
  };

  const handleUpdateGroup = () => {
    if (!editingGroup.name.trim()) {
      setMessage('Gruppenname darf nicht leer sein.');
      return;
    }
    setGroups(prev => prev.map(group =>
      group.id === editingGroupId ? { ...editingGroup } : group // Use editingGroup state
    ));
    setMessage('Gruppe erfolgreich aktualisiert!');
    setEditingGroupId(null);
    setEditingGroup(null); // Clear editing group
    setIsGroupOpeningHoursMinimized(true); // Minimize after saving
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditingGroup(null);
    setNewGroup({
      name: '',
      color: groupColors[0] || 'bg-blue-100',
      openingHours: initialOpeningHoursTemplate, // Reset to empty template
      daysWithOpeningHours: initialDaysWithOpeningHoursTemplate, // Reset to empty template
      minStaffRequired: undefined,
      disableStaffingWarning: true,
    }); // Reset new group form, use groupColors
    setIsGroupOpeningHoursMinimized(true); // Minimize after cancelling edit
  };


  // --- Employee Management ---
  const handleEmployeeChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'presenceDays') {
      // Handle checkbox for presence days
      const day = value;
      setNewEmployee(prev => {
        const currentPresenceDays = prev.presenceDays || []; // Ensure it's an array
        if (checked) {
          return { ...prev, presenceDays: [...new Set([...currentPresenceDays, day])] }; // Add day, ensure unique
        } else {
          return { ...prev, presenceDays: currentPresenceDays.filter(d => d !== day) }; // Remove day
        }
      });
    } else if (name === 'type') {
      // If type changes to 'normal' or 'zusatzkraft', reset presenceDays to all days
      if (value === 'normal' || value === 'zusatzkraft') {
        setNewEmployee(prev => ({ ...prev, [name]: value, presenceDays: [...WEEK_DAYS_PLAN] }));
      } else {
        setNewEmployee(prev => ({ ...prev, [name]: value }));
      }
    }
    else {
      setNewEmployee({ ...newEmployee, [name]: value });
    }
  };

  const handleAddEmployee = () => {
    // Convert to number, treating empty string as 0
    const contractedHoursNum = Number(newEmployee.contractedHoursPerWeek);
    // Handle overriddenDisposalHours: convert to number or null if empty
    const overriddenDisposalHoursNum = newEmployee.overriddenDisposalHours === '' ? null : Number(newEmployee.overriddenDisposalHours);


    if (!newEmployee.name.trim() || contractedHoursNum <= 0) {
      setMessage('Mitarbeitername und Stunden pro Woche sind erforderlich.');
      return;
    }
    if (overriddenDisposalHoursNum !== null && overriddenDisposalHoursNum < 0) {
      setMessage('Überschriebene Verfügungszeit darf nicht negativ sein.');
      return;
    }
    // Validate presence days for special types (excluding 'normal' and 'zusatzkraft')
    if (newEmployee.type !== 'normal' && newEmployee.type !== 'zusatzkraft' && (newEmployee.presenceDays || []).length === 0) {
      setMessage('Für Auszubildende, FSJler und Praktikanten müssen Anwesenheitstage ausgewählt werden.');
      return;
    }


    if (editingEmployeeId) {
      setEmployees(prev => prev.map(emp =>
        emp.id === editingEmployeeId ? {
          ...newEmployee,
          contractedHoursPerWeek: contractedHoursNum,
          overriddenDisposalHours: overriddenDisposalHoursNum,
          // Ensure presenceDays is an array, default to all days if type is normal or zusatzkraft
          presenceDays: (newEmployee.type === 'normal' || newEmployee.type === 'zusatzkraft') ? [...WEEK_DAYS_PLAN] : (newEmployee.presenceDays || [])
        } : emp
      ));
      setMessage('Mitarbeiter erfolgreich aktualisiert!');
      setEditingEmployeeId(null);
    } else {
      const employeeToAdd = {
        ...newEmployee,
        id: uuidv4(),
        contractedHoursPerWeek: contractedHoursNum,
        overriddenDisposalHours: overriddenDisposalHoursNum,
        // Ensure presenceDays is an array, default to all days if type is normal or zusatzkraft
        presenceDays: (newEmployee.type === 'normal' || newEmployee.type === 'zusatzkraft') ? [...WEEK_DAYS_PLAN] : (newEmployee.presenceDays || [])
      };
      setEmployees(prev => [...prev, employeeToAdd]);
      setMessage('Mitarbeiter erfolgreich hinzugefügt!');
    }
    setNewEmployee({ name: '', contractedHoursPerWeek: 0, groupId: '', overriddenDisposalHours: '', type: 'normal', presenceDays: [...WEEK_DAYS_PLAN] });
  };

  const handleEditEmployee = (employee) => {
    // When editing, set the state with the actual number (will display as number)
    setNewEmployee({
      ...employee,
      overriddenDisposalHours: employee.overriddenDisposalHours ?? '', // Ensure empty string for input
      type: employee.type ?? 'normal', // Ensure default type
      presenceDays: employee.presenceDays ?? [...WEEK_DAYS_PLAN], // Ensure default presence days
    });
    setEditingEmployeeId(employee.id);
  };

  const handleDeleteEmployee = (id) => {
    // Prevent deletion if employee has any shifts assigned
    const hasShifts = masterSchedule.shifts.some(shift => shift.employeeId === id);
    if (hasShifts) {
      setMessage('Mitarbeiter kann nicht gelöscht werden, da ihm noch Schichten zugeordnet sind.');
      return;
    }
    setEmployees(prev => prev.filter(employee => employee.id !== id));
    setMessage('Mitarbeiter erfolgreich gelöscht!');
  };

  const handleCancelEditEmployee = () => {
    setNewEmployee({ name: '', contractedHoursPerWeek: 0, groupId: '', overriddenDisposalHours: '', type: 'normal', presenceDays: [...WEEK_DAYS_PLAN] });
    setEditingEmployeeId(null);
  };

  // --- Category Management ---
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      setMessage('Kategoriename darf nicht leer sein.');
      return;
    }
    // Prevent creating a category with the same name as the fixed PAUSE_CATEGORY
    if (newCategory.name.trim().toLowerCase() === PAUSE_CATEGORY.name.toLowerCase()) {
      setMessage(`Der Name "${PAUSE_CATEGORY.name}" ist für die System-Pause-Kategorie reserviert.`);
      return;
    }
    // Prevent adding a new disposal time category if one already exists
    if (newCategory.isDisposalTimeCategory && disposalTimeCategory) {
        setMessage('Es kann nur eine Kategorie für die Verfügungszeitberechnung markiert werden.');
        return;
    }
    // Prevent adding a new care category if one already exists
    if (newCategory.isCareCategory && careCategory) {
        setMessage('Es kann nur eine Kategorie als "Betreuungskategorie" markiert werden.');
        return;
    }

    const categoryToAdd = { ...newCategory, id: uuidv4() };
    setCategories(prev => [...prev, categoryToAdd]);
    setNewCategory({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false }); // Reset with default disposal flag
    setMessage('Kategorie erfolgreich hinzugefügt!');
  };

  const handleEditCategoryClick = (category) => {
    setEditingCategoryId(category.id);
    // Ensure isDisposalTimeCategory and isCareCategory are always boolean, defaulting to false if undefined/null
    setNewCategory({
      ...category,
      isDisposalTimeCategory: category.isDisposalTimeCategory ?? false, // Use nullish coalescing
      isCareCategory: category.isCareCategory ?? false
    });
  };

  const handleUpdateCategory = () => {
    if (!newCategory.name.trim()) {
      setMessage('Kategoriename darf nicht leer sein.');
      return;
    }
    // Prevent renaming to the fixed PAUSE_CATEGORY name
    if (newCategory.name.trim().toLowerCase() === PAUSE_CATEGORY.name.toLowerCase()) {
      setMessage(`Der Name "${PAUSE_CATEGORY.name}" ist für die System-Pause-Kategorie reserviert.`);
      return;
    }
    // Prevent marking another category as disposal time if one already exists and it's not the one being edited
    if (newCategory.isDisposalTimeCategory && disposalTimeCategory && disposalTimeCategory.id !== editingCategoryId) {
        setMessage('Es kann nur eine Kategorie für die Verfügungszeitberechnung markiert werden.');
        return;
    }
    // Prevent marking another category as care if one already exists and it's not the one being edited
    if (newCategory.isCareCategory && careCategory && careCategory.id !== editingCategoryId) {
        setMessage('Es kann nur eine Kategorie als "Betreuungskategorie" markiert werden.');
        return;
    }


    setCategories(prev => prev.map(category =>
      category.id === editingCategoryId ? { ...newCategory } : category
    ));
    setMessage('Kategorie erfolgreich aktualisiert!');
    setEditingCategoryId(null);
    setNewCategory({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false }); // Reset with default disposal flag
  };

  const handleDeleteCategory = (id) => {
    // Prevent deletion if category is used in any shift segment or as parent for subcategory
    const isCategoryUsedInShifts = masterSchedule.shifts.some(shift =>
      shift.segments.some(segment => segment.categoryId === id)
    );
    const isCategoryUsedAsParent = subCategories.some(subCat => subCat.parentCategoryId === id);

    if (isCategoryUsedInShifts) {
      setMessage('Kategorie kann nicht gelöscht werden, da sie in Schichten verwendet wird.');
      return;
    }
    if (isCategoryUsedAsParent) {
      setMessage('Kategorie kann nicht gelöscht werden, da sie als Oberkategorie für Unterkategorien verwendet wird.');
      return;
    }

    setCategories(prev => prev.filter(category => category.id !== id));
    setMessage('Kategorie erfolgreich gelöscht!');
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setNewCategory({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false }); // Reset with default disposal flag
  };

  // --- SubCategory Management ---
  const handleAddSubCategory = () => {
    if (!newSubCategory.name.trim() || !newSubCategory.parentCategoryId) {
      setMessage('Unterkategoriename und übergeordnete Kategorie sind erforderlich.');
      return;
    }
    const subCategoryToAdd = { ...newSubCategory, id: uuidv4() };
    setSubCategories(prev => [...prev, subCategoryToAdd]);
    setNewSubCategory({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' }); // Use blockColors
    setMessage('Unterkategorie erfolgreich hinzugefügt!');
  };

  const handleEditSubCategoryClick = (subCategory) => {
    setEditingSubCategoryId(subCategory.id);
    setNewSubCategory(subCategory);
  };

  const handleUpdateSubCategory = () => {
    if (!newSubCategory.name.trim() || !newSubCategory.parentCategoryId) {
      setMessage('Unterkategoriename und übergeordnete Kategorie sind erforderlich.');
      return;
    }
    setSubCategories(prev => prev.map(subCategory =>
      subCategory.id === editingSubCategoryId ? { ...newSubCategory } : subCategory
    ));
    setMessage('Unterkategorie erfolgreich aktualisiert!');
    setEditingSubCategoryId(null);
    setNewSubCategory({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' }); // Use blockColors
  };

  const handleDeleteSubCategory = (id) => {
    // Prevent deletion if subcategory is used in any shift segment
    const isSubCategoryUsedInShifts = masterSchedule.shifts.some(shift =>
      shift.segments.some(segment => segment.subCategoryId === id)
    );
    if (isSubCategoryUsedInShifts) {
      setMessage('Unterkategorie kann nicht gelöscht werden, da sie in Schichten verwendet wird.');
      return;
    }
    setSubCategories(prev => prev.filter(subCategory => subCategory.id !== id));
    setMessage('Unterkategorie erfolgreich gelöscht!');
  };

  const handleCancelEditSubCategory = () => {
    setEditingSubCategoryId(null);
    setNewSubCategory({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' }); // Use blockColors
  };

  // --- Disposal Time Rules Management ---
  const handleAddDisposalRule = () => {
    // Convert state values to numbers, treating empty string as 0
    const contractedHoursNum = Number(newDisposalRule.contractedHours);
    const disposalHoursNum = Number(newDisposalRule.disposalHours);

    if (contractedHoursNum <= 0 || disposalHoursNum < 0) {
      setMessage('Vertragsstunden müssen positiv sein, Verfügungszeit darf nicht negativ sein.');
      return;
    }
    if (disposalTimeRules.some(rule => Number(rule.contractedHours) === contractedHoursNum)) {
      setMessage('Eine Regel für diese Vertragsstundenzahl existiert bereits.');
      return;
    }
    const ruleToAdd = { ...newDisposalRule, id: uuidv4(), contractedHours: contractedHoursNum, disposalHours: disposalHoursNum };
    setDisposalTimeRules(prev => [...prev, ruleToAdd]);
    setNewDisposalRule({ contractedHours: '', disposalHours: '' }); // Reset to empty strings
    setMessage('Verfügungszeit-Regel erfolgreich hinzugefügt!');
  };

  const handleEditDisposalRule = (rule) => {
    // When editing, set the state with the actual numbers (will display as numbers)
    setNewDisposalRule({
      ...rule,
      contractedHours: rule.contractedHours, // Keep as number from rule, input will convert to string
      disposalHours: rule.disposalHours
    });
    setEditingDisposalRuleId(rule.id);
  };

  const handleUpdateDisposalRule = () => {
    // Convert state values to numbers, treating empty string as 0
    const contractedHoursNum = Number(newDisposalRule.contractedHours);
    const disposalHoursNum = Number(newDisposalRule.disposalHours);

    if (contractedHoursNum <= 0 || disposalHoursNum < 0) {
      setMessage('Vertragsstunden müssen positiv sein, Verfügungszeit darf nicht negativ sein.');
      return;
    }
    if (disposalTimeRules.some(rule => rule.id !== editingDisposalRuleId && Number(rule.contractedHours) === contractedHoursNum)) {
      setMessage('Eine Regel für diese Vertragsstundenzahl existiert bereits.');
      return;
    }
    setDisposalTimeRules(prev => prev.map(rule =>
      rule.id === editingDisposalRuleId ? { ...newDisposalRule, contractedHours: contractedHoursNum, disposalHours: disposalHoursNum } : rule
    ));
    setMessage('Verfügungszeit-Regel erfolgreich aktualisiert!');
    setEditingDisposalRuleId(null);
    setNewDisposalRule({ contractedHours: '', disposalHours: '' }); // Reset to empty strings
  };

  const handleDeleteDisposalRule = (id) => {
    setDisposalTimeRules(prev => prev.filter(rule => rule.id !== id));
    setMessage('Verfügungszeit-Regel erfolgreich gelöscht!');
  };

  const handleCancelEditDisposalRule = () => {
    setEditingDisposalRuleId(null);
    setNewDisposalRule({ contractedHours: '', disposalHours: '' }); // Reset to empty strings
  };


  // --- Master Schedule Management (Click-to-Add) ---

  const handleTimelineClick = (e, employeeId, dayOfWeek) => {
    // IMPORTANT: Check if the click originated from within a shift block or its children
    if (e.target.closest('.shift-block')) {
        return; // Do not open add menu if clicking on an existing shift block
    }
    // Only open menu if not currently dragging and not clicking on other timeline elements
    if (isDragging || e.target.classList.contains('minute-line') || e.target.classList.contains('hour-line')) {
        return;
    }
    if (categories.length === 0) {
      setMessage('Bitte zuerst Kategorien erstellen, um Schichten hinzuzufellen.');
      return;
    }

    const timelineDiv = e.currentTarget; // The timeline-row-container
    if (!timelineDiv) return;

    const mainContainerRect = mainContainerRef.current.getBoundingClientRect();

    // Calculate click position relative to the main container's right edge
    const clickXRelativeToContainerRight = mainContainerRect.right - e.pageX;
    const clickYRelativeToContainer = e.pageY - mainContainerRect.top;

    const timelineRect = timelineDiv.getBoundingClientRect();
    const relativeXInTimeline = e.clientX - timelineRect.left; // This is for calculating minutes, keep as is

    const clickedMinutesFromDisplayStart = (relativeXInTimeline / timelineRect.width) * totalDisplayMinutes;
    // Changed snapping logic from Math.round to Math.floor to always snap to the start of the 15-minute interval
    const snappedMinutesFromDisplayStart = Math.floor(clickedMinutesFromDisplayStart / 15) * 15;

    const absoluteSnappedMinutes = displayStartMinutes + snappedMinutesFromDisplayStart;

    setAddShiftContext({ employeeId, dayOfWeek, clickedMinutes: absoluteSnappedMinutes });
    setAddShiftMenuPos({ x: clickXRelativeToContainerRight, y: clickYRelativeToContainer }); // Use right coordinate
    setShowAddShiftMenu(true);
    setShowShiftOptionsMenu(false); // Close shift options menu if open
    setShowChangeShiftMenu(false); // Close change menu if open
  };

  const handleAddSegmentFromMenu = (categoryId, subCategoryId = '') => {
    setShowAddShiftMenu(false);
    if (!addShiftContext || !masterSchedule) return;

    const { employeeId, dayOfWeek, clickedMinutes } = addShiftContext;
    let startTimeMinutes = clickedMinutes;
    let endTimeMinutes = clickedMinutes + 30; // Default 30 min duration

    // --- Collision detection for adding new segments ---
    const existingSegmentsForEmployeeDay = masterSchedule.shifts
        .filter(s => s.employeeId === employeeId && s.dayOfWeek === dayOfWeek)
        .flatMap(s => s.segments)
        .map(s => ({
            ...s,
            startMinutes: timeToMinutes(s.startTime),
            endMinutes: timeToMinutes(s.endTime)
        }));

    // Check for collision with proposed new segment
    for (const existingSeg of existingSegmentsForEmployeeDay) {
        if (
            (startTimeMinutes < existingSeg.endMinutes && endTimeMinutes > existingSeg.startMinutes)
        ) {
            setMessage('Neue Schicht überlappt mit einer bestehenden Schicht.');
            return; // Prevent adding if there's an overlap
        }
    }


    const newShiftId = uuidv4(); // Generate unique ID for new shift

    const newShift = {
      id: newShiftId,
      employeeId: employeeId,
      dayOfWeek: dayOfWeek,
      segments: [
        {
          categoryId: categoryId,
          subCategoryId: subCategoryId, // Can be empty string
          startTime: minutesToTime(startTimeMinutes),
          endTime: minutesToTime(endTimeMinutes),
        },
      ],
    };

    const updatedShifts = [...(masterSchedule.shifts || []), newShift];
    setMasterSchedule(prev => ({ ...prev, shifts: updatedShifts }));

    // Find the name of the effective category for the message
    let displayCategoryName = '';
    if (subCategoryId) {
      const subCat = subCategories.find(sc => sc.id === subCategoryId);
      if (subCat) {
          displayCategoryName = subCat.name;
      }
    }
    // If no subcategory, or subcategory not found, use the main category name
    if (!displayCategoryName) {
      const category = categories.find(cat => cat.id === categoryId);
      if (category) {
          displayCategoryName = category.name;
      } else if (categoryId === PAUSE_CATEGORY.id) {
          displayCategoryName = PAUSE_CATEGORY.name;
      } else {
          displayCategoryName = 'Unbekannt';
      }
    }
    setMessage(`Schicht (${displayCategoryName}) erfolgreich hinzugefügt!`);
    setAddShiftContext(null); // This was causing issues when addShiftContext was used within the same render cycle
  };


  // Helper to group shifts for display by employee and day of week
  const getGroupedMasterShifts = useCallback(() => {
    const grouped = {};
    if (masterSchedule && masterSchedule.shifts && employees.length > 0) {
      masterSchedule.shifts.forEach(shift => {
        const employee = employees.find(emp => emp.id === shift.employeeId);
        if (!employee) return; // Skip if employee not found

        const employeeGroup = groups.find(g => g.id === employee.groupId); // Get the full group object
        const groupName = employeeGroup?.name || 'Ohne Gruppe';
        const groupId = employeeGroup?.id || 'no-group';
        const groupColor = employeeGroup?.color || 'bg-gray-200'; // Default color for 'Ohne Gruppe'

        if (!grouped[groupId]) { // Group by ID now
            grouped[groupId] = {
                name: groupName,
                color: groupColor,
                employees: {}
            };
        }
        if (!grouped[groupId].employees[employee.id]) { // Group employees by their ID
          grouped[groupId].employees[employee.id] = {};
        }
        if (!grouped[groupId].employees[employee.id][shift.dayOfWeek]) {
          grouped[groupId].employees[employee.id][shift.dayOfWeek] = [];
        }
        grouped[groupId].employees[employee.id][shift.dayOfWeek].push(shift);
      });
    }
    return grouped;
  }, [masterSchedule, employees, groups]);

  // --- Handle Mouse Down (initiates horizontal drag) ---
  const handleMouseDown = (e, shift, segmentIndex) => {
    e.preventDefault(); // Prevent text selection
    e.stopPropagation(); // Prevent event from bubbling up to parent timeline-row-container
    dragStartMouseX.current = e.clientX;

    const timelineDiv = e.currentTarget.closest('.timeline-row-container'); // Get the parent timeline div
    if (!timelineDiv) return;

    const timelineRect = timelineDiv.getBoundingClientRect();

    const initialMouseX = e.clientX;
    const initialShiftSegment = shift.segments[segmentIndex];
    const initialStartTimeMinutes = timeToMinutes(initialShiftSegment.startTime);
    const initialEndTimeMinutes = timeToMinutes(initialShiftSegment.endTime);

    // Get the bounding rectangle of the *actual* shift block element being dragged/resized
    const shiftBlockElement = e.currentTarget; // e.currentTarget is the div.shift-block
    const rect = shiftBlockElement.getBoundingClientRect();

    const resizeHandleWidth = 15; // Increased for easier grabbing
    let newDragMode = 'move'; // Default to move

    if (e.clientX < rect.left + resizeHandleWidth) {
        newDragMode = 'resize-left';
    } else if (e.clientX > rect.right - resizeHandleWidth) {
        newDragMode = 'resize-right';
    } else {
        newDragMode = 'move';
    }

    setDraggedShiftInfo({
      shiftId: shift.id,
      dayOfWeek: shift.dayOfWeek,
      employeeId: shift.employeeId,
      segmentIndex,
      initialMouseX,
      initialShiftStartMinutes: initialStartTimeMinutes,
      initialShiftEndMinutes: initialEndTimeMinutes,
      dragMode: newDragMode, // Use the determined dragMode
      timelineWidth: timelineRect.width, // Store timeline width for current drag operation
    });
    setIsDragging(true);
    setShowAddShiftMenu(false); // Close add menu if dragging starts
    setShowShiftOptionsMenu(false); // Close options menu if dragging starts
    setShowChangeShiftMenu(false); // Close change menu if dragging starts
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !draggedShiftInfo) return;

    const pixelsPerMinute = draggedShiftInfo.timelineWidth / totalDisplayMinutes;
    const deltaX = e.clientX - draggedShiftInfo.initialMouseX;
    const minutesDelta = deltaX / pixelsPerMinute;

    let currentProposedStart = draggedShiftInfo.initialShiftStartMinutes;
    let currentProposedEnd = draggedShiftInfo.initialShiftEndMinutes;
    const originalDuration = draggedShiftInfo.initialShiftEndMinutes - draggedShiftInfo.initialShiftStartMinutes;

    if (draggedShiftInfo.dragMode === 'move') {
        currentProposedStart += minutesDelta;
        currentProposedEnd += minutesDelta;
    } else if (draggedShiftInfo.dragMode === 'resize-left') {
        currentProposedStart += minutesDelta;
    } else if (draggedShiftInfo.dragMode === 'resize-right') {
        currentProposedEnd += minutesDelta;
    }

    let snappedStart = Math.round(currentProposedStart / 15) * 15;
    let snappedEnd = Math.round(currentProposedEnd / 15) * 15;

    if (snappedEnd - snappedStart < 15) {
        if (draggedShiftInfo.dragMode === 'resize-left') {
            snappedStart = snappedEnd - 15;
        } else {
            snappedEnd = snappedStart + 15;
        }
    }

    const otherSegments = masterSchedule.shifts
        .filter(s => s.employeeId === draggedShiftInfo.employeeId && s.dayOfWeek === draggedShiftInfo.dayOfWeek && s.id !== draggedShiftInfo.shiftId)
        .flatMap(s => s.segments)
        .map(s => ({
            startMinutes: timeToMinutes(s.startTime),
            endMinutes: timeToMinutes(s.endTime)
        }));

    // Kollisionen iterativ vermeiden
    let adjusted = true;
    while (adjusted) {
        adjusted = false;
        for (const other of otherSegments) {
            if (snappedStart < other.endMinutes && snappedEnd > other.startMinutes) {
                adjusted = true;
                if (draggedShiftInfo.dragMode === 'move') {
                    if (minutesDelta > 0) {
                        snappedEnd = other.startMinutes;
                        snappedStart = snappedEnd - originalDuration;
                    } else {
                        snappedStart = other.endMinutes;
                        snappedEnd = snappedStart + originalDuration;
                    }
                } else if (draggedShiftInfo.dragMode === 'resize-left') {
                    snappedStart = other.endMinutes;
                } else if (draggedShiftInfo.dragMode === 'resize-right') {
                    snappedEnd = other.startMinutes;
                }

                // Nach Korrektur Mindestdauer erneut sicherstellen
                if (snappedEnd - snappedStart < 15) {
                    if (draggedShiftInfo.dragMode === 'resize-left') {
                        snappedStart = snappedEnd - 15;
                    } else {
                        snappedEnd = snappedStart + 15;
                    }
                }
                break; // Prüfe nach Anpassung erneut alle
            }
        }
    }

    // Clipping
    snappedStart = Math.max(0, snappedStart);
    snappedEnd = Math.min(24 * 60, snappedEnd);

    if (snappedEnd - snappedStart < 15) {
        if (draggedShiftInfo.dragMode === 'resize-left') {
            snappedStart = Math.max(0, snappedEnd - 15);
        } else {
            snappedEnd = Math.min(24 * 60, snappedStart + 15);
        }
    }

    setMasterSchedule(prevMasterSchedule => {
        const updatedShifts = prevMasterSchedule.shifts.map(s => {
            if (s.id === draggedShiftInfo.shiftId) {
                const updatedSegments = s.segments.map((seg, idx) => {
                    if (idx === draggedShiftInfo.segmentIndex) {
                        return {
                            ...seg,
                            startTime: minutesToTime(snappedStart),
                            endTime: minutesToTime(snappedEnd),
                        };
                    }
                    return seg;
                });
                return { ...s, segments: updatedSegments };
            }
            return s;
        });
        return { ...prevMasterSchedule, shifts: updatedShifts };
    });
}, [isDragging, draggedShiftInfo, totalDisplayMinutes, masterSchedule.shifts]);

  const handleMouseUp = useCallback((e) => {
    if (!isDragging || !draggedShiftInfo) return;

    const deltaX = Math.abs(e.clientX - dragStartMouseX.current);
    const clickThreshold = 5; // Pixels to consider it a click vs. drag

    if (deltaX < clickThreshold) {
        // This was a click, not a drag
        const { shiftId, segmentIndex } = draggedShiftInfo;
        const clickedShift = masterSchedule.shifts.find(s => s.id === shiftId);
        if (clickedShift) {
            const mainContainerRect = mainContainerRef.current.getBoundingClientRect();
            const menuXRelativeToContainerRight = mainContainerRect.right - e.pageX;
            const menuYRelativeToContainer = e.pageY - mainContainerRect.top;

            setShiftOptionsContext({ shift: clickedShift, segmentIndex });
            setShiftOptionsMenuPos({ x: menuXRelativeToContainerRight, y: menuYRelativeToContainer });
            setShowShiftOptionsMenu(true);
        }
    } else {
        // This was a drag, persist changes
        setMessage("Schicht erfolgreich aktualisiert!");
    }

    setIsDragging(false);
    setDraggedShiftInfo(null);
    dragStartMouseX.current = 0;
  }, [isDragging, draggedShiftInfo, masterSchedule, mainContainerRef]); // Add mainContainerRef to dependencies

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    // Also handle mouse up outside the window
    const handleWindowMouseUp = (e) => { // Pass event object
        if (isDragging) handleMouseUp(e); // Pass event object
    };
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // --- Effect to measure rendered widths using ResizeObserver ---
  useLayoutEffect(() => {
    // Clear existing observers
    for (const key in resizeObservers.current) {
      if (resizeObservers.current[key]) {
        resizeObservers.current[key].disconnect();
      }
    }
    resizeObservers.current = {}; // Reset

    // Collect all keys for currently rendered shift blocks based on filtered employees
    const currentRenderedBlockKeys = new Set();
    filteredEmployeesForDisplay.forEach(employee => {
      WEEK_DAYS_PLAN.forEach(day => {
        const employeeShiftsForDay = masterSchedule.shifts.filter(shift =>
          shift.employeeId === employee.id && shift.dayOfWeek === day
        );
        employeeShiftsForDay.forEach(shift => {
          shift.segments.forEach((segment, segIdx) => {
            currentRenderedBlockKeys.add(`${shift.id}-${segIdx}`);
          });
        });
      });
    });

    // Set up new observers for currently rendered shift blocks
    currentRenderedBlockKeys.forEach(key => {
      const element = shiftBlockRefs.current[key];
      if (element) {
        const observer = new ResizeObserver(entries => {
          for (let entry of entries) {
            const observedWidth = entry.contentRect.width;
            setBlockObservedWidths(prev => {
              if (prev[key] !== observedWidth) {
                return { ...prev, [key]: observedWidth };
              }
              return prev;
            });
          }
        });
        observer.observe(element);
        resizeObservers.current[key] = observer;
      }
    });

    // Cleanup function for ResizeObservers
    return () => {
      for (const key in resizeObservers.current) {
        if (resizeObservers.current[key]) {
          resizeObservers.current[key].disconnect();
        }
      }
    };
  }, [masterSchedule.shifts, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, filteredEmployeesForDisplay]); // Added filteredEmployeesForDisplay to dependencies


  // --- Dynamic Cursor for Shift Blocks ---
  const handleShiftBlockMouseMove = useCallback((e) => {
    const shiftBlockElement = e.currentTarget;
    const rect = shiftBlockElement.getBoundingClientRect();
    const mouseX = e.clientX;
    const resizeHandleWidth = 15; // Must match the one in handleMouseDown

    if (mouseX < rect.left + resizeHandleWidth) {
      setCurrentShiftBlockCursor('ew-resize'); // Left resize
    } else if (mouseX > rect.right - resizeHandleWidth) {
      setCurrentShiftBlockCursor('ew-resize'); // Right resize
    } else {
      setCurrentShiftBlockCursor('grab'); // Move
    }
  }, []);

  const handleShiftBlockMouseLeave = useCallback(() => {
    setCurrentShiftBlockCursor('grab'); // Reset to grab when mouse leaves
  }, []);


  // --- Delete Shift Logic ---
  const handleDeleteShift = () => {
    setShowShiftOptionsMenu(false); // Close menu
    if (!shiftOptionsContext || !masterSchedule) return;

    const { shift, segmentIndex } = shiftOptionsContext;
    let updatedShifts;

    // If there's only one segment in the shift, delete the whole shift
    if (shift.segments.length === 1) {
      updatedShifts = masterSchedule.shifts.filter(s => s.id !== shift.id);
      setMessage("Schicht erfolgreich gelöscht!");
    } else {
      // If multiple segments, delete only the specific segment
      const updatedShift = { ...shift };
      updatedShift.segments = updatedShift.segments.filter((_, idx) => idx !== segmentIndex);
      updatedShifts = masterSchedule.shifts.map(s => s.id === updatedShift.id ? updatedShift : s);
      setMessage("Segment erfolgreich gelöscht!");
    }
    setMasterSchedule(prev => ({ ...prev, shifts: updatedShifts }));
    localStorage.setItem('masterSchedule', JSON.stringify({ ...masterSchedule, shifts: updatedShifts })); // Save to localStorage
    setShiftOptionsContext(null); // Clear context
  };

  // --- Change Shift Category Logic ---
  const handleChangeShiftClick = () => {
      setShowShiftOptionsMenu(false); // Close current menu
      if (shiftOptionsContext) {
          // Set context for the change menu, using the same position as the options menu
          setChangeShiftContext(shiftOptionsContext); // { shift, segmentIndex }
          setChangeShiftMenuPos(shiftOptionsMenuPos); // Reuse position (which is now right-aligned)
          setShowChangeShiftMenu(true);
      }
  };

// --- Change Shift Group Logic ---
  const handleChangeGroupClick = () => {
    setShowShiftOptionsMenu(false); // Close current menu
    if (shiftOptionsContext) {
      const { shift, segmentIndex } = shiftOptionsContext;
      const currentSegment = shift.segments[segmentIndex];
      const employee = employees.find(emp => emp.id === shift.employeeId);
      const originalShiftColor = employee ? (groups.find(g => g.id === employee.groupId)?.color || 'bg-gray-100') : 'bg-gray-100';

      setChangeGroupContext({ shift, segmentIndex, originalShiftColor });
      setChangeGroupMenuPos(shiftOptionsMenuPos); // Reuse position
      setShowChangeGroupMenu(true);
    }
  };

  const handleUpdateSegmentGroup = (newGroupId) => {
    setShowChangeGroupMenu(false);
    if (!changeGroupContext || !masterSchedule) return;

    const { shift, segmentIndex } = changeGroupContext;

    const updatedShifts = masterSchedule.shifts.map(s => {
      if (s.id === shift.id) {
        const updatedSegments = s.segments.map((seg, idx) => {
          if (idx === segmentIndex) {
            // Find the employee to get their default group ID
            const employee = employees.find(emp => emp.id === shift.employeeId);
            // Determine the employee's default group ID, defaulting to 'no-group' if not set
            const employeeDefaultGroupId = employee?.groupId || 'no-group';

            // If the newGroupId is the same as the employee's default group, set overriddenGroupId to undefined
            // Otherwise, set it to the newGroupId
            const newOverriddenGroupId = newGroupId !== employeeDefaultGroupId ? newGroupId : undefined;
            return {
              ...seg,
              overriddenGroupId: newOverriddenGroupId, // Setzt auf undefined, um die Überschreibung zu entfernen
            };
          }
          return seg;
        });
        return { ...s, segments: updatedSegments };
      }
      return s;
    });

    setMasterSchedule(prev => ({ ...prev, shifts: updatedShifts }));
    // Wir speichern direkt, da dies eine Zustandsänderung ist, die permanent sein soll
    localStorage.setItem('masterSchedule', JSON.stringify({ ...masterSchedule, shifts: updatedShifts }));
    setMessage("Schichtgruppe erfolgreich aktualisiert!");
    setChangeGroupContext(null); // Kontext löschen
  };

  const handleUpdateSegmentCategory = (newCategoryId, newSubCategoryId = '') => {
      setShowChangeShiftMenu(false);
      if (!changeShiftContext || !masterSchedule) return;

      const { shift, segmentIndex } = changeShiftContext;

      const updatedShifts = masterSchedule.shifts.map(s => {
          if (s.id === shift.id) {
              const updatedSegments = s.segments.map((seg, idx) => {
                  if (idx === segmentIndex) {
                      return {
                          ...seg,
                          categoryId: newCategoryId,
                          subCategoryId: newSubCategoryId,
                      };
                  }
                  return seg;
              }
              );
              return { ...s, segments: updatedSegments };
          }
          return s;
      });

      setMasterSchedule(prev => ({ ...prev, shifts: updatedShifts }));
      localStorage.setItem('masterSchedule', JSON.stringify({ ...masterSchedule, shifts: updatedShifts }));
      setMessage("Schichtkategorie erfolgreich aktualisiert!");
      setChangeShiftContext(null); // Clear context
  };


  // --- Handle Display Time Range Changes ---
  const handleDisplayTimeChange = (e, type) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) value = 0; // Default to 0 if input is not a number

    if (type === 'startHour') {
      setDisplayStartHour(Math.max(0, Math.min(23, value)));
    } else if (type === 'startMinute') {
      setDisplayStartMinute(Math.max(0, Math.min(59, value)));
    } else if (type === 'endHour') {
      setDisplayEndHour(Math.max(0, Math.min(23, value)));
    } else if (type === 'endMinute') {
      setDisplayEndMinute(Math.max(0, Math.min(59, value)));
    }
    // The masterSchedule useEffect will handle saving these changes to localStorage
  };

  // --- Functions for customizable weekly plan title ---
  const handleEditWeeklyPlanTitle = () => {
    setIsEditingWeeklyPlanTitle(true);
  };

  const handleSaveWeeklyPlanTitle = () => {
    if (!weeklyPlanTitle.trim()) {
      setMessage('Titel darf nicht leer sein.');
      return;
    }
    setMasterSchedule(prev => ({ ...prev, title: weeklyPlanTitle.trim() }));
    // The masterSchedule useEffect will handle saving this change to localStorage
    setMessage('Wochenplan-Titel erfolgreich aktualisiert!');
    setIsEditingWeeklyPlanTitle(false);
  };

  const handleCancelEditWeeklyPlanTitle = () => {
    setIsEditingWeeklyPlanTitle(false);
    // Revert to the last saved title if available, or default
    setWeeklyPlanTitle(masterSchedule.title || 'Wochenplan');
  };

// Funktion zum Speichern von Daten in einer Datei
  // NEU: 'showSuccessMessage' Parameter hinzugefügt, Standard ist true
  const handleSaveFile = useCallback(async (currentHandle = fileHandle, showSuccessMessage = true) => {
    console.log("handleSaveFile aufgerufen. Aktuelles Handle:", !!currentHandle);
    if (!currentHandle) {
      // Wenn kein Handle vorhanden ist, fragen Sie nach einem neuen Speicherort (Save As)
      // Dies sollte bei Auto-Save nicht passieren, da wir nur speichern, wenn ein Handle existiert.
      if (showSuccessMessage) { // Nur anzeigen, wenn nicht Auto-Save
        setMessage('Keine Datei zum Speichern ausgewählt. Bitte speichern Sie die Datei manuell.');
      }
      return;
    }

    try {
      console.log("Überprüfe Schreibberechtigung für Handle...");
      const permissionStatus = await currentHandle.queryPermission({ mode: 'readwrite' });
      console.log("Schreibberechtigungsstatus:", permissionStatus);

      if (permissionStatus === 'prompt') {
        console.log("Berechtigung 'prompt', fordere Berechtigung an.");
        const result = await currentHandle.requestPermission({ mode: 'readwrite' });
        if (result !== 'granted') {
          setMessage('Schreibberechtigung für die Datei wurde verweigert.');
          console.log("Schreibberechtigung verweigert.");
          return;
        }
      } else if (permissionStatus === 'denied') {
        setMessage('Schreibberechtigung für die Datei ist verweigert. Bitte wählen Sie eine neue Datei.');
        setFileHandle(null);
        await deleteFileHandleFromDb(); // Handle aus IndexedDB entfernen
        console.log("Schreibberechtigung verweigert, Handle aus DB gelöscht.");
        return;
      }

      const dataToSave = {
        groups: groups,
        employees: employees,
        categories: categories,
        subCategories: subCategories,
        disposalTimeRules: disposalTimeRules,
        masterSchedule: masterSchedule,
        orderedGroupIds: orderedGroupIds,
      };
      const jsonString = JSON.stringify(dataToSave, null, 2);

      const writable = await currentHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();

      await putFileHandleInDb(currentHandle);
      console.log("FileHandle erfolgreich in IndexedDB gespeichert.");

      // NEU: Zeige die Nachricht nur an, wenn showSuccessMessage true ist
      if (showSuccessMessage) {
        setMessage('Daten erfolgreich gespeichert!');
      }
      setFileHandle(currentHandle); // Stellen Sie sicher, dass das Handle gesetzt ist
    } catch (error) {
      console.error("Fehler beim Speichern der Datei:", error);
      setMessage(`Fehler beim Speichern der Datei: ${error.message}`);
    }
  }, [groups, employees, categories, subCategories, disposalTimeRules, masterSchedule, orderedGroupIds, fileHandle, setMessage]); // setMessage als Abhängigkeit hinzugefügt


  // NEU: Funktion zum Speichern von Daten unter einem neuen Dateinamen (Export)
  const handleSaveFileAs = useCallback(async () => {
    if (!window.showSaveFilePicker) {
      setMessage('Ihr Browser unterstützt die File System Access API nicht.');
      return;
    }

    try {
      const newHandle = await window.showSaveFilePicker({
        types: [{
          description: 'Dienstplan Datei', // NEU: Klare Beschreibung
          accept: { 'application/dienstplan+json': ['.dienstplan'] }, // NEU: Spezifischer MIME-Type und Endung
        }],
        suggestedName: `${weeklyPlanTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-') || 'Dienstplan'}_${new Date().toISOString().slice(0, 10)}.dienstplan`, // NEU: Standard-Dateiendung
      });
      await handleSaveFile(newHandle); // Speichern mit dem neuen Handle
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('Speichervorgang abgebrochen.');
      } else {
        console.error("Fehler beim Speichern der Datei unter neuem Namen:", error);
        setMessage(`Fehler beim Speichern der Datei: ${error.message}`);
      }
    }
  }, [handleSaveFile, weeklyPlanTitle]);


// Funktion zum Öffnen einer Datei (Import)
  const handleOpenFile = useCallback(async () => {
    if (!window.showOpenFilePicker) {
      setMessage('Ihr Browser unterstützt die File System Access API nicht.');
      return;
    }

    try {
      console.log("handleOpenFile aufgerufen. Öffne Dateiauswahl...");
      const [newHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Dienstplan Export Datei', // NEU: Klare Beschreibung
          accept: { 'application/wochenplan+json': ['.dienstplan'] }, // NEU: Spezifischer MIME-Type und Endung
        }],
        multiple: false,
      });
      console.log("Datei ausgewählt. Handle erhalten.");

      const file = await newHandle.getFile();
      const content = await file.text();
      const importedData = JSON.parse(content);
      console.log("Dateiinhalt erfolgreich gelesen und geparst.");

      // Basic validation of imported data structure
      if (
        !importedData.groups ||
        !importedData.employees ||
        !importedData.categories ||
        !importedData.subCategories ||
        !importedData.masterSchedule ||
        !Array.isArray(importedData.groups) ||
        !Array.isArray(importedData.employees) ||
        !Array.isArray(importedData.categories) ||
        !Array.isArray(importedData.subCategories) ||
        !Array.isArray(importedData.masterSchedule.shifts)
      ) {
        setMessage('Ungültiges Dateiformat. Die importierte Datei scheint kein gültiger Dienstplan-Export zu sein.');
        console.warn("Importierte Datei hat ungültiges Format.");
        return;
      }

      setConfirmModalMessage('Möchten Sie die aktuellen Daten wirklich durch die importierten Daten ersetzen? Dies kann nicht rückgängig gemacht werden.');
      setConfirmModalAction(() => async () => { // Hinzugefügt: 'async' hier, da putFileHandleInDb async ist
        // This code runs if the user confirms
        setGroups(importedData.groups.map(g => {
          const groupWithInitializedHours = { ...g };
          if (!groupWithInitializedHours.openingHours) {
            groupWithInitializedHours.openingHours = {};
          }
          WEEK_DAYS_PLAN.forEach(day => {
            if (!groupWithInitializedHours.openingHours[day]) {
              groupWithInitializedHours.openingHours[day] = [];
            }
          });
          groupWithInitializedHours.minStaffRequired = (g.minStaffRequired === undefined || g.minStaffRequired === null) ? undefined : g.minStaffRequired;
          groupWithInitializedHours.disableStaffingWarning = g.disableStaffingWarning ?? true;
          if (typeof groupWithInitializedHours.daysWithOpeningHours !== 'object' || groupWithInitializedHours.daysWithOpeningHours === null) {
              groupWithInitializedHours.daysWithOpeningHours = {};
              WEEK_DAYS_PLAN.forEach(day => groupWithInitializedHours.daysWithOpeningHours[day] = false);
          } else {
              WEEK_DAYS_PLAN.forEach(day => {
                  if (groupWithInitializedHours.daysWithOpeningHours[day] === undefined) {
                      groupWithInitializedHours.daysWithOpeningHours[day] = false;
                  }
              });
          }
          return groupWithInitializedHours;
        }));
        setEmployees(importedData.employees.map(emp => ({
          ...emp,
          overriddenDisposalHours: emp.overriddenDisposalHours ?? '',
          type: emp.type ?? 'normal',
          presenceDays: emp.presenceDays ?? [...WEEK_DAYS_PLAN],
        })));
        setCategories(importedData.categories.map(cat => ({
          ...cat,
          isDisposalTimeCategory: cat.isDisposalTimeCategory ?? false,
          isCareCategory: cat.isCareCategory ?? false
        })));
        setSubCategories(importedData.subCategories);
        setDisposalTimeRules(importedData.disposalTimeRules || []);
        setMasterSchedule(importedData.masterSchedule);
        setOrderedGroupIds(importedData.orderedGroupIds || importedData.groups.map(g => g.id));

        // Dynamic adjustment of display time range based on imported shifts
        let minOverallMinutes = 24 * 60;
        let maxOverallMinutes = 0;
        let hasShifts = false;

        importedData.masterSchedule.shifts.forEach(shift => {
          shift.segments.forEach(segment => {
            const segmentStartMinutes = timeToMinutes(segment.startTime);
            const segmentEndMinutes = timeToMinutes(segment.endTime);

            minOverallMinutes = Math.min(minOverallMinutes, segmentStartMinutes);
            maxOverallMinutes = Math.max(maxOverallMinutes, segmentEndMinutes);
            hasShifts = true;
          });
        });

        if (hasShifts) {
          let newDisplayStartMinutes = Math.floor(minOverallMinutes / 15) * 15;
          let newDisplayEndMinutes = Math.ceil(maxOverallMinutes / 15) * 15;

          if (newDisplayEndMinutes <= newDisplayStartMinutes) {
              newDisplayEndMinutes = newDisplayStartMinutes + 15;
          }

          newDisplayStartMinutes = Math.max(0, newDisplayStartMinutes);
          newDisplayEndMinutes = Math.min(24 * 60, newDisplayEndMinutes);

          setDisplayStartHour(Math.floor(newDisplayStartMinutes / 60));
          setDisplayStartMinute(newDisplayStartMinutes % 60);
          setDisplayEndHour(Math.floor(newDisplayEndMinutes / 60));
          setDisplayEndMinute(newDisplayEndMinutes % 60);
        } else {
          setDisplayStartHour(6);
          setDisplayStartMinute(0);
          setDisplayEndHour(18);
          setDisplayEndMinute(0);
        }

        setWeeklyPlanTitle(importedData.masterSchedule.title || 'Wochenplan');
        setFileHandle(newHandle); // Speichern Sie das neue Handle

        // NEU: Speichere das FileHandle in IndexedDB
        await putFileHandleInDb(newHandle);
        console.log("Neues FileHandle erfolgreich in IndexedDB gespeichert nach Import.");

        setMessage('Daten erfolgreich importiert!');
        setShowConfirmModal(false);
      });
      setShowConfirmModal(true);

    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('Importvorgang abgebrochen.');
        console.log("Importvorgang abgebrochen.");
      } else {
        console.error("Fehler beim Importieren der Daten:", error);
        setMessage(`Fehler beim Importieren der Daten: ${error.message}. Stellen Sie sicher, dass es sich um eine gültige JSON-Datei handelt.`);
      }
    }
  }, [setConfirmModalMessage, setConfirmModalAction, setGroups, setEmployees, setCategories, setSubCategories, setDisposalTimeRules, setMasterSchedule, setOrderedGroupIds, setDisplayStartHour, setDisplayStartMinute, setDisplayEndHour, setDisplayEndMinute, setWeeklyPlanTitle, setMessage, setShowConfirmModal]);


// Aktualisieren Sie handleClearAllData, um auch das fileHandle zu löschen
  const handleClearAllData = useCallback(() => {
    setConfirmModalMessage('Möchten Sie, dass die App sich Ihre Daten nicht mehr merkt und mit einem leeren Plan startet? Die Daten werden NICHT aus der Speicherdatei auf Ihrem Computer gelöscht. Um die Daten dauerhaft zu entfernen, löschen Sie die Speicherdatei manuell von Ihrem Computer. Um die Daten wiederherzustellen, importieren Sie die Speicherdatei.');
    setConfirmModalAction(() => async () => { // Hinzugefügt: 'async' hier
      setGroups([]);
      setEmployees([]);
      setCategories([]);
      setSubCategories([]);
      setDisposalTimeRules([]);
      setMasterSchedule({ shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: 'Wochenplan' });
      setOrderedGroupIds([]);
      setSelectedGroupIdFilter('all');
      setDisplayStartHour(6);
      setDisplayStartMinute(0);
      setDisplayEndHour(18);
      setDisplayEndMinute(0);
      setWeeklyPlanTitle('Wochenplan');
      setFileHandle(null); // NEU: fileHandle löschen

      // NEU: Lösche das FileHandle aus IndexedDB
      await deleteFileHandleFromDb();
      console.log("FileHandle erfolgreich aus IndexedDB gelöscht.");

      setMessage('Alle Daten erfolgreich gelöscht!');
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  }, [setConfirmModalMessage, setConfirmModalAction, setGroups, setEmployees, setCategories, setSubCategories, setDisposalTimeRules, setMasterSchedule, setOrderedGroupIds, setSelectedGroupIdFilter, setDisplayStartHour, setDisplayStartMinute, setDisplayEndHour, setDisplayEndMinute, setWeeklyPlanTitle, setMessage, setShowConfirmModal]);

  // NEU: Auto-Save Effekt
  useEffect(() => {
    // Speichern nur, wenn der initiale Ladevorgang abgeschlossen ist UND ein FileHandle existiert
    if (!isInitialLoadComplete || !fileHandle) {
      console.log("Auto-Save übersprungen: Initialer Ladevorgang nicht abgeschlossen oder kein FileHandle.");
      return;
    }

    // Debounce-Logik: Lösche vorherigen Timer und setze neuen
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    console.log("Änderung erkannt, setze Auto-Save Timer...");
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log("Auto-Save Timer abgelaufen, führe Speicherung aus...");
      // Rufe handleSaveFile auf, aber ohne Erfolgsmeldung (showSuccessMessage = false)
      handleSaveFile(fileHandle, false);
    }, 1000); // Speichert nach 1 Sekunde Inaktivität

    // Cleanup-Funktion: Löscht den Timer, wenn die Komponente unmountet oder Abhängigkeiten sich ändern
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    groups, employees, categories, subCategories, disposalTimeRules,
    masterSchedule, orderedGroupIds, // Überwache alle relevanten Daten-States
    fileHandle, isInitialLoadComplete, handleSaveFile // Abhängigkeiten für den Effekt
  ]);

// NEU: Funktion zum Löschen nur des Wochenplans
  const handleClearSchedule = useCallback(() => {
    setConfirmModalMessage('Möchtest du WIRKLICH den Wochenplan löschen? Mitarbeiter, Gruppen und Kategorien bleiben erhalten. Diese Aktion lässt sich NICHT rückgängig machen!');
    setConfirmModalAction(() => () => {
      // Setzt den Wochenplan auf den initialen leeren Zustand zurück
      const defaultSchedule = { shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: 'Wochenplan' };
      setMasterSchedule(defaultSchedule);
      setDisplayStartHour(6);
      setDisplayStartMinute(0);
      setDisplayEndHour(18);
      setDisplayEndMinute(0);
      setWeeklyPlanTitle('Wochenplan');

      // Wichtig: Hier NICHT deleteFileHandleFromDb() aufrufen,
      // da nur der Plan geleert wird, nicht die Datei.
      // Die Änderungen werden erst beim nächsten "Speichern" in die Datei geschrieben.

      setMessage('Wochenplan erfolgreich gelöscht!');
      setShowConfirmModal(false);
      setShowScheduleManagementModal(false); // Modal schließen
    });
    setShowConfirmModal(true);
  }, [setMessage, setMasterSchedule, setDisplayStartHour, setDisplayStartMinute, setDisplayEndHour, setDisplayEndMinute, setWeeklyPlanTitle]);


  // NEU: Funktion zum Exportieren nur des Wochenplans
  const handleExportSchedule = useCallback(() => {
    try {
      const dataToExport = {
        masterSchedule: masterSchedule,
        // Optional: Fügen Sie hier weitere relevante Daten hinzu, die für den Wochenplan wichtig sind
      };
      const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;

      // Generiere Dateinamen basierend auf weeklyPlanTitle, Datum und Uhrzeit
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');

      // Sanitize the weeklyPlanTitle for filename usage
      const sanitizedTitle = weeklyPlanTitle
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();

      const filename = `Wochenplan_${sanitizedTitle}_${day}.${month}.${year}_${hours}.${minutes}.wochenplan`; // NEU: Standard-Dateiendung
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Clean up the URL object

      setMessage('Wochenplan erfolgreich exportiert!');
      setShowScheduleManagementModal(false); // Modal schließen
    } catch (error) {
      console.error("Fehler beim Exportieren des Wochenplans:", error);
      setMessage('Fehler beim Exportieren des Wochenplans.');
    }
  }, [masterSchedule, weeklyPlanTitle, setMessage]);


// NEU: Funktion zum Importieren nur des Wochenplans
  const handleImportSchedule = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) {
      setMessage('Bitte eine Datei zum Importieren auswählen.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

        // Basic validation for schedule data structure
        if (!importedData.masterSchedule || !Array.isArray(importedData.masterSchedule.shifts)) {
          setMessage('Ungültiges Dateiformat. Die importierte Datei scheint kein gültiger Wochenplan-Export zu sein.');
          if (fileInputScheduleRef.current) { // Use the new ref here
            fileInputScheduleRef.current.value = '';
          }
          return;
        }

        setConfirmModalMessage('Möchten Sie den aktuellen Wochenplan wirklich durch den importierten Wochenplan ersetzen? Mitarbeiter, Gruppen und Kategorien bleiben erhalten.');
        setConfirmModalAction(() => () => {
          // This code runs if the user confirms
          setMasterSchedule(importedData.masterSchedule);

          // Update display times and title from imported schedule
          const importedStartTime = importedData.masterSchedule.displayStartTime || '06:00';
          const importedEndTime = importedData.masterSchedule.displayEndTime || '18:00';
          setDisplayStartHour(parseInt(importedStartTime.split(':')[0], 10));
          setDisplayStartMinute(parseInt(importedStartTime.split(':')[1], 10));
          setDisplayEndHour(parseInt(importedEndTime.split(':')[0], 10));
          setDisplayEndMinute(parseInt(importedEndTime.split(':')[1], 10));
          setWeeklyPlanTitle(importedData.masterSchedule.title || 'Wochenplan');

          // Wichtig: Hier NICHT putFileHandleInDb() aufrufen,
          // da nur der Plan importiert wird, nicht die Datei.
          // Die Änderungen werden erst beim nächsten "Speichern" in die Hauptdatei geschrieben.

          setMessage('Wochenplan erfolgreich importiert!');
          setShowConfirmModal(false);
          setShowScheduleManagementModal(false); // Modal schließen
          if (fileInputScheduleRef.current) { // Use the new ref here
            fileInputScheduleRef.current.value = '';
          }
        });
        setShowConfirmModal(true);

      } catch (error) {
        console.error("Fehler beim Importieren des Wochenplans:", error);
        setMessage('Fehler beim Importieren des Wochenplans. Stellen Sie sicher, dass es sich um eine gültige JSON-Datei handelt.');
        if (fileInputScheduleRef.current) { // Use the new ref here
          fileInputScheduleRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  }, [setMessage, setMasterSchedule, setDisplayStartHour, setDisplayStartMinute, setDisplayEndHour, setDisplayEndMinute, setWeeklyPlanTitle]);


  // --- Confirmation Modal Handlers ---
  const handleConfirmModalConfirm = () => {
    if (confirmModalAction) {
      confirmModalAction(); // Execute the stored action
    }
    setShowConfirmModal(false); // Close the modal
  };

  const handleConfirmModalCancel = () => {
    setMessage('Vorgang abgebrochen.'); // More generic message for cancelled confirmation
    setShowConfirmModal(false); // Close the modal
    // Clear the file input value if the import was cancelled
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Drag and Drop Handlers for Groups ---
  const handleGroupDragStart = (e, groupId) => {
    draggedGroupIdRef.current = groupId;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50', 'border-blue-500'); // Add visual feedback
  };

  const handleGroupDragEnter = (e, groupId) => {
    e.preventDefault(); // Necessary to allow drop
    if (draggedGroupIdRef.current === groupId) return; // Don't highlight self
    dragOverGroupIdRef.current = groupId;
    e.currentTarget.classList.add('border-blue-400', 'border-dashed'); // Add visual feedback for drag over target
  };

  const handleGroupDragLeave = (e) => {
    e.currentTarget.classList.remove('border-blue-400', 'border-dashed');
    dragOverGroupIdRef.current = null;
  };

  const handleGroupDragOver = (e) => {
    e.preventDefault(); // Crucial to allow drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleGroupDrop = (e, droppedOnGroupId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-400', 'border-dashed'); // Remove drag-over styling

    const draggedId = draggedGroupIdRef.current;
    if (draggedId === null || draggedId === droppedOnGroupId) {
        return;
    }

    setOrderedGroupIds(prevOrder => {
        const newOrder = [...prevOrder];
        const draggedIndex = newOrder.indexOf(draggedId);
        const droppedIndex = newOrder.indexOf(droppedOnGroupId);

        if (draggedIndex === -1 || droppedIndex === -1) {
            return prevOrder; // Should not happen if IDs are valid
        }

        // Remove the dragged item
        const [removed] = newOrder.splice(draggedIndex, 1);
        // Insert it at the new position
        newOrder.splice(droppedIndex, 0, removed);

        return newOrder;
    });

    draggedGroupIdRef.current = null; // Reset
    dragOverGroupIdRef.current = null; // Reset
    setMessage('Gruppenreihenfolge aktualisiert!');
  };

  const handleGroupDragEnd = (e) => {
    // Remove drag styling from all elements
    const allGroupItems = document.querySelectorAll('.group-item-draggable');
    allGroupItems.forEach(item => {
        item.classList.remove('opacity-50', 'border-blue-500', 'border-blue-400', 'border-dashed');
    });
    draggedGroupIdRef.current = null;
    dragOverGroupIdRef.current = null;
  };

  // --- Print Function (now opens modal) ---
  const handlePrint = () => {
    setShowPrintOptionsModal(true);
  };

  const handlePrintFromModal = (includeWeeklySummary) => {
    setShowPrintOptionsModal(false); // Close the modal
    // Add/remove class to body based on selection
    if (includeWeeklySummary) {
      document.body.classList.add('print-with-summary');
    } else {
      document.body.classList.remove('print-with-summary');
    }

    // Trigger print
    window.print();

    // Remove the class after a short delay to allow print dialog to open
    // This is important so the UI reverts to normal after printing
    setTimeout(() => {
      document.body.classList.remove('print-with-summary');
    }, 500); // Adjust delay if needed
  };

  const handleCancelPrintModal = () => {
    setShowPrintOptionsModal(false);
  };


  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">Lade Anwendung und Daten...</div>
      </div>
    );
  }

  // Helper to get shifts for a specific employee and day from masterSchedule
  const getShiftsForEmployeeAndDay = (employeeId, dayOfWeek) => {
    if (!masterSchedule || !masterSchedule.shifts) return [];
    return masterSchedule.shifts.filter(shift =>
      shift.employeeId === employeeId && shift.dayOfWeek === dayOfWeek
    );
  };


  return (
    <> {/* Use a React Fragment to wrap the style tag and the main div */}
      {/* Global styles for html, body, and #root to ensure full viewport coverage and no default margins */}
      <style>
        {`
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          overflow-x: hidden; /* Ensure no horizontal scroll on the root */
        }

        /* Animated gradient background */
        .animated-gradient {
          background: linear-gradient(135deg, #fbcfe8, #e9d5ff, #bfdbfe); /* pink-200, purple-200, blue-200 */
          background-size: 400% 400%; /* Smaller for a more noticeable shift */
          animation: gradientShift 15s ease infinite; /* Animation name, duration, timing, loop */
        }

        @keyframes gradientShift {
          0% {
            background-position: 0% 0%;
          }
          50% {
            background-position: 100% 100%;
          }
          100% {
            background-position: 0% 0%;
          }
        }

        /* Ensure the placeholder text does not get a text cursor */
        .print-hidden-placeholder {
          cursor: default !important;
        }
        `}
      </style>
      <div className="w-screen min-h-screen font-sans text-gray-800 bg-gray-100 flex flex-col overflow-x-hidden py-8 px-8 animated-gradient"> {/* Added animated-gradient */}
        <div ref={mainContainerRef} className="w-full max-w-[156.25rem] mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 main-container flex-grow overflow-hidden relative">
          {/* Version number */}
          <div
            className="absolute top-4 left-4 text-xs text-gray-400 print-hidden-element cursor-pointer" // Added cursor-pointer
            onClick={() => setShowNewVersionPopup(true)} // Added onClick handler
          >
            Version {CURRENT_APP_VERSION}
          </div>

          {/* Feedback Button */}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSehtSDB10AZE1aSGGvjeOeGneIhU8pWobYVWN9Ha3ob3AO8AQ/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110 flex items-center justify-center print-hidden-element"
            title="Feedback geben oder Bug melden"
          >
            <MessageSquare size={24} /> {/* Lucide React icon */}
          </a>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-16 text-gray-800">
            Kindergarten Dienstplan App
          </h1>

          {message && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg relative mb-6 message-alert" role="alert">
              <span className="block sm:inline">{message}</span>
              <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setMessage('')}>
                {/* Updated close icon to match the update popup */}
                <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </span>
            </div>
          )}

         {/* --- Datenverwaltung Section (Renamed) --- */}
          <div className="mb-10 p-6 bg-gray-50 rounded-lg shadow-inner text-center w-full mx-auto data-management-buttons-container">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Datenverwaltung</h2>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <button
                onClick={handleOpenFile} // Ruft die neue Funktion zum Öffnen auf
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                Daten importieren
              </button>
              <button
                onClick={() => handleSaveFile(fileHandle, true)} // Explizit showSuccessMessage = true
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                Speichern
              </button>
              <button
                onClick={handleSaveFileAs} // Ruft die Funktion zum Speichern unter auf (immer neues Handle)
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                Daten exportieren
              </button>
              <button
                onClick={handlePrint}
                className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 print-button"
              >
                Wochenplan drucken
              </button>
              <button
                onClick={handleClearAllData}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
              >
                Daten vergessen
              </button>
            </div>
          </div>

          {/* --- Management Sections Container --- */}
          <div className="flex flex-wrap justify-center gap-6 mb-10 management-sections-container">
            {/* --- Gruppenverwaltung --- */}
            <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]">
              <h2
                className="text-2xl font-bold text-gray-700 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
                onClick={() => setIsGroupsSectionMinimized(!isGroupsSectionMinimized)}
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
              {!isGroupsSectionMinimized && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      value={editingGroupId ? editingGroup?.name || '' : newGroup.name}
                      onChange={(e) => editingGroupId ? setEditingGroup(prev => ({ ...prev, name: e.target.value })) : setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
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
                          className="form-checkbox h-5 w-5 text-red-600 rounded"
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
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={handleCancelEditGroup}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
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
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full ${getStrongGroupColor(group.color)} border border-gray-300`}></span>
                                <div className="flex flex-col">
                                  <span className="text-gray-900 font-medium">{group.name}</span>
                                  <span className="text-gray-600 text-xs mt-1">Öffnungszeiten: {openingHoursSummary}</span>
                                  <span className="text-gray-600 text-xs mt-1">
                                    Min. Betreuung: {group.minStaffRequired !== undefined ? group.minStaffRequired : "nicht festgelegt"}
                                    {group.disableStaffingWarning ? " (Warnung deaktiviert)" : " (Warnung aktiv)"}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <button
                                  onClick={() => handleEditGroupClick(group)}
                                  className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
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

            {/* --- Mitarbeiterverwaltung --- */}
            <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]">
              <h2
                className="text-2xl font-bold text-gray-700 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
                onClick={() => setIsEmployeesSectionMinimized(!isEmployeesSectionMinimized)}
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
              {!isEmployeesSectionMinimized && (
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
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 col-span-full sm:col-span-1"
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
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 col-span-full sm:col-span-1"
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
                              className="form-checkbox h-5 w-5 text-blue-600 rounded"
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
                                    className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm"
                                  >
                                    Bearbeiten
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
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

            {/* --- Verfügungszeit Regeln --- */}
            <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]">
              <h2
                className="text-2xl font-bold text-gray-700 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
                onClick={() => setIsDisposalRulesSectionMinimized(!isDisposalRulesSectionMinimized)}
              >
                Verfügungszeit Regeln
                <svg
                  className={`w-6 h-6 transform transition-transform duration-200 ${isDisposalRulesSectionMinimized ? 'rotate-0' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </h2>
              {!isDisposalRulesSectionMinimized && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="contractedHours" className="block text-sm font-medium text-gray-700 mb-1">Soll Arbeitszeit (h)</label>
                      <input
                        type="number"
                        id="contractedHours"
                        value={newDisposalRule.contractedHours}
                        onChange={(e) => setNewDisposalRule(prev => ({ ...prev, contractedHours: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        placeholder="z.B. 39"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 w-full"
                        min="0"
                      />
                    </div>
                    <div>
                      <label htmlFor="disposalHours" className="block text-sm font-medium text-gray-700 mb-1">Verfügungszeit (h)</label>
                      <input
                        type="number"
                        id="disposalHours"
                        value={newDisposalRule.disposalHours}
                        onChange={(e) => setNewDisposalRule(prev => ({ ...prev, disposalHours: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        placeholder="z.B. 8.5"
                        step="0.5"
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200 w-full"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {editingDisposalRuleId ? (
                      <>
                        <button
                          onClick={handleUpdateDisposalRule}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={handleCancelEditDisposalRule}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                        >
                          Abbrechen
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleAddDisposalRule}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        Regel hinzufügen
                      </button>
                    )}
                  </div>
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Vorhandene Regeln</h3>
                    {disposalTimeRules.length === 0 ? (
                      <p className="text-center text-gray-500">Noch keine Regeln vorhanden.</p>
                    ) : (
                      <ul className="space-y-3">
                        {disposalTimeRules.map(rule => (
                          <li key={rule.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                            <span className="text-gray-900 font-medium">{rule.contractedHours}h Soll-Arbeitszeit = {rule.disposalHours}h Verfügungszeit</span>
                            <div>
                              <button
                                onClick={() => handleEditDisposalRule(rule)}
                                className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteDisposalRule(rule.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
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

            {/* --- Kategorienverwaltung --- */}
            <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]">
              <h2
                className="text-2xl font-bold text-gray-700 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
                onClick={() => setIsCategoriesSectionMinimized(!isCategoriesSectionMinimized)}
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
              {!isCategoriesSectionMinimized && (
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
                    <label className={`flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 shadow-sm ${disposalTimeCategory && !editingCategoryId ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      <input
                        type="checkbox"
                        name="isDisposalTimeCategory"
                        checked={newCategory.isDisposalTimeCategory}
                        onChange={(e) => setNewCategory({ ...newCategory, isDisposalTimeCategory: e.target.checked })}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
                        disabled={disposalTimeCategory && disposalTimeCategory.id !== editingCategoryId}
                      />
                      <span className="text-gray-700 font-medium">Als Verfügungszeit verwenden</span>
                      {disposalTimeCategory && !editingCategoryId && (
                          <span className="text-xs text-red-500 ml-2"> (Nur eine Kategorie kann markiert werden)</span>
                      )}
                    </label>
                    <label className={`flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-300 shadow-sm ${careCategory && !editingCategoryId ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      <input
                        type="checkbox"
                        name="isCareCategory"
                        checked={newCategory.isCareCategory}
                        onChange={(e) => setNewCategory({ ...newCategory, isCareCategory: e.target.checked })}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded"
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
                                className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm"
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
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

            {/* --- Unterkategorienverwaltung --- */}
            <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full 2xl:w-[calc(50%-12px)]">
              <h2
                className="text-2xl font-bold text-gray-700 mb-6 text-center cursor-pointer flex items-center justify-center gap-2"
                onClick={() => setIsSubCategoriesSectionMinimized(!isSubCategoriesSectionMinimized)}
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
              {!isSubCategoriesSectionMinimized && (
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
                      className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
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
                      placeholder="Farbe für Zeitstrahl wählen"
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
                                  className="text-indigo-600 hover:text-indigo-800 mr-3 text-sm"
                                 >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleDeleteSubCategory(subCategory.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
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
          </div> {/* End of Management Sections Container */}


          {/* --- Master-Wochenplan-Ansicht --- */}
          <div className="mb-10 p-6 bg-gray-50 rounded-lg shadow-inner master-weekly-plan-section">
            {/* NEU: Flex-Container für Titel-Gruppe und Verwaltungs-Button */}
            <div className="flex items-center justify-between mb-6">
              {/* Gruppe für Titel und Bearbeiten-Button (zentriert) */}
              <div className="flex-grow flex items-center justify-center gap-2">
                <h2 className="text-2xl font-bold text-gray-700 text-center">
                  {isEditingWeeklyPlanTitle ? (
                    <input
                      type="text"
                      value={weeklyPlanTitle}
                      onChange={(e) => setWeeklyPlanTitle(e.target.value)}
                      className="p-2 border border-gray-300 rounded-md text-center text-lg w-full max-w-xs"
                    />
                  ) : (
                    <span>{weeklyPlanTitle}</span>
                  )}
                </h2>
                {isEditingWeeklyPlanTitle ? (
                  <>
                    <button
                      onClick={handleSaveWeeklyPlanTitle}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-md shadow-sm weekly-plan-title-edit-button"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={handleCancelEditWeeklyPlanTitle}
                      className="bg-gray-400 hover:bg-gray-500 text-white text-sm px-3 py-1 rounded-md shadow-sm weekly-plan-title-edit-button"
                    >
                      Abbrechen
                    </button>
                  </>
                ) : (
                  // NEU: Fragment <> um den Bearbeiten-Button, da ein Kommentar davor steht
                  <>
                    {/* Bearbeiten-Button */}
                    <button
                      onClick={handleEditWeeklyPlanTitle}
                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center shadow-md transition duration-300 ease-in-out transform hover:scale-110 p-0 border-0"
                      title="Wochenplan-Titel bearbeiten"
                    >
                      {/* Inline SVG für das Edit-Icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 384 384"
                        fill="currentColor"
                        className="flex-shrink-0"
                      >
                        <path d="M0 304L236 68l80 80L80 384H0v-80zM378 86l-39 39l-80-80l39-39q6-6 15-6t15 6l50 50q6 6 6 15t-6 15z"></path>
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Wochenplan verwalten Button (rechts ausgerichtet) */}
              <button
                onClick={() => setShowScheduleManagementModal(true)}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center shadow-md transition duration-300 ease-in-out transform hover:scale-110 p-0 border-0"
                title="Wochenplan verwalten"
              >
                {/* Inline SVG für das FileCog-Icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="flex-shrink-0"
                >
                  <path d="M6 2c-1.11 0-2 .89-2 2v16a2 2 0 0 0 2 2h6.68a7 7 0 0 1-.68-3a7 7 0 0 1 7-7a7 7 0 0 1 1 .08V8l-6-6H6m7 1.5L18.5 9H13V3.5M18 14a.26.26 0 0 0-.26.21l-.19 1.32c-.3.13-.59.29-.85.47l-1.24-.5c-.11 0-.24 0-.31.13l-1 1.73c-.06.11-.04.24.06.32l1.06.82a4.193 4.193 0 0 0 0 1l-1.06.82a.26.26 0 0 0-.06.32l1 1.73c.06.13.19.13.31.13l1.24-.5c.26.18.54.35.85.47l.19 1.32c.02.12.12.21.26.21h2c.11 0 .22-.09.24-.21l.19-1.32c.3-.13.57-.29.84-.47l1.23.5c.13 0 .26 0 .33-.13l1-1.73a.26.26 0 0 0-.06-.32l-1.07-.82c.02-.17.04-.33.04-.5c0-.17-.01-.33-.04-.5l1.06-.82a.26.26 0 0 0 .06-.32l-1-1.73c-.06-.13-.19-.13-.32-.13l-1.23.5c-.27-.18-.54-.35-.85-.47l-.19-1.32A.236.236 0 0 0 20 14h-2m1 3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5c-.84 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5Z"></path>
                </svg>
              </button>
            </div>

            {/* Display Time Range Configuration and Group Filter */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200 display-time-config">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">Anzeigebereich der Zeitleiste & Filter</h3> {/* Titel angepasst */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1">
                  Startzeit:
                  <input
                    type="number"
                    value={displayStartHour}
                    onChange={(e) => handleDisplayTimeChange(e, 'startHour')}
                    min="0" max="23"
                    className="w-16 p-2 border border-gray-300 rounded-md text-center"
                  />
                  :
                  <input
                    type="number"
                    value={displayStartMinute}
                    onChange={(e) => handleDisplayTimeChange(e, 'startMinute')}
                    min="0" max="59" step="15"
                    className="w-16 p-2 border border-gray-300 rounded-md text-center"
                  />
                </label>
                <label className="flex items-center gap-1">
                  Endzeit:
                  <input
                    type="number"
                    value={displayEndHour}
                    onChange={(e) => handleDisplayTimeChange(e, 'endHour')}
                    min="0" max="23"
                    className="w-16 p-2 border border-gray-300 rounded-md text-center"
                  />
                  :
                  <input
                    type="number"
                    value={displayEndMinute}
                    onChange={(e) => handleDisplayTimeChange(e, 'endMinute')}
                    min="0" max="59" step="15"
                    className="w-16 p-2 border border-gray-300 rounded-md text-center"
                  />
                </label>

                {/* Group Filter Select */}
                <label className="flex items-center gap-1 ml-auto group-filter-select">
                  Gruppe filtern:
                  <select
                    value={selectedGroupIdFilter}
                    onChange={(e) => setSelectedGroupIdFilter(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    {/* Verwenden Sie die neue gefilterte Liste für die Optionen */}
                    {filteredGroupsForDisplayInFilter.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </label>

                {/* NEU: Employee Filter Select */}
                <label className="flex items-center gap-1">
                  Mitarbeiter filtern:
                  <select
                    value={selectedEmployeeIdFilter}
                    onChange={(e) => setSelectedEmployeeIdFilter(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">Alle Mitarbeiter</option>
                    {availableEmployeesForFilter.map(employee => (
                      <option key={employee.id} value={employee.id}>{employee.name}</option>
                    ))}
                  </select>
                </label>

                {/* New: Global Toggle for Staffing Warnings (bestehend) */}
                <div className="flex items-center gap-2 ml-4">
                  <input
                    type="checkbox"
                    id="toggleStaffingWarnings"
                    checked={showStaffingWarningsGlobally}
                    onChange={(e) => setShowStaffingWarningsGlobally(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-red-600 rounded"
                  />
                  <label htmlFor="toggleStaffingWarnings" className="text-gray-700 font-medium cursor-pointer">
                    Betreuungswarnungen anzeigen
                  </label>
                </div>
              </div>
            </div>


            {filteredEmployeesForDisplay.length === 0 && selectedGroupIdFilter !== 'all' ? (
              <p className="text-center text-gray-500">Keine Mitarbeiter in der ausgewählten Gruppe vorhanden.</p>
            ) : employees.length === 0 ? (
              <p className="text-center text-gray-500">Bitte fügen Sie zuerst Mitarbeiter hinzu, um den Dienstplan zu erstellen.</p>
            ) : (
              // Apply styling to the outer container for a cohesive look
              <div className="weekly-plan-days-container bg-white p-4 rounded-lg shadow-md border border-gray-200">
                {WEEK_DAYS_PLAN.map(day => (
                  // Added printable-day-container class here
                  <div key={day} className="mb-4 last:mb-0 printable-day-container">
                    {/* Main grid for the day's schedule */}
                    <div className="grid grid-cols-[auto_minmax(80px,_max-content)_1fr_150px] text-sm weekly-plan-grid">
                      {/* Weekday Name - now in the grid, spanning first two columns */}
                      <h4 className="col-span-2 font-bold text-xl text-gray-800 mb-4 text-left pl-2">
                        {day}
                      </h4>
                      {/* Empty div to align time axis header correctly */}
                      <div className="col-span-2"></div>
                      {/* Time Axis Header - now spans only the timeline column */}
                      <div className="col-start-3 col-end-4 relative pb-2 mb-2 px-2 time-label-header">
                        {/* Dynamic time lines */}
                        {Array.from({ length: Math.floor(totalDisplayMinutes / 15) + 1 }).map((_, i) => {
                          const currentMinute = displayStartMinutes + (i * 15);
                          if (currentMinute > displayEndMinutes) return null; // Ensure lines don't go past end time

                          const isHourMark = currentMinute % 60 === 0;
                          const leftPosition = ((currentMinute - displayStartMinutes) / totalDisplayMinutes) * 100;

                          return (
                            <div
                              key={`header-line-${currentMinute}`}
                              className={`absolute top-0 h-full ${isHourMark ? 'border-l-2 border-gray-300' : 'border-l border-gray-300 opacity-50'} z-0`}
                              style={{ left: `${leftPosition}%`, width: '1px' }}
                            ></div>
                          );
                        })}
                        {/* Time Labels */}
                        {Array.from({ length: Math.ceil(totalDisplayHours) + 1 }, (_, i) => displayStartHour + i)
                          .filter(hour => (hour * 60) >= displayStartMinutes && (hour * 60) <= displayEndMinutes)
                          .map(hour => (
                            <span
                              key={`header-label-${hour}`}
                              className="absolute text-center text-gray-600 -translate-x-1/2"
                              style={{ left: `${(((hour * 60) - displayStartMinutes) / totalDisplayMinutes) * 100}%` }}
                            >
                              {hour}:00
                            </span>
                          ))}
                      </div>

                      {/* Render employees grouped by group, then sorted within the group */}
                      {uniqueSortedGroups.map(group => {
                          // Filter employees from the already globally sorted list that belong to this group
                          const employeesInThisGroup = filteredEmployeesForDisplay.filter(emp => (emp.groupId || 'no-group') === group.id);

                          if (employeesInThisGroup.length === 0) return null;

                          // Get group staffing warnings for this group and day
                          const currentGroupDayWarnings = groupWarnings[group.id]?.[day];

                          return (
                              <React.Fragment key={group.id}>
                                  {/* Display group-level warnings here */}
                                  {currentGroupDayWarnings && currentGroupDayWarnings.textWarnings.length > 0 && (
                                    <div className="col-span-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-2 my-2 rounded-md print-hidden-warning">
                                      <p className="font-bold">Warnung für Gruppe {group.name} am {day}:</p>
                                      <ul className="list-disc list-inside text-sm">
                                        {currentGroupDayWarnings.textWarnings.map((warning, idx) => (
                                          <li key={idx}>{warning}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {employeesInThisGroup.map((employee, index) => {
                                      const employeeShiftsForDay = getShiftsForEmployeeAndDay(employee.id, day);
                                      const { categoryTotals, totalWorkMinutes, totalBreakMinutes, warnings, visualBreakMarkerTime } = calculateDailyWorkMetrics(employeeShiftsForDay, categories, subCategories);
                                      const categoriesWithTime = Object.keys(categoryTotals)
                                          .map(catId => {
                                              if (catId === PAUSE_CATEGORY.id) return PAUSE_CATEGORY;
                                              return categories.find(cat => cat.id === catId);
                                          })
                                          .filter(Boolean)
                                          .sort((a, b) => a.name.localeCompare(b.name));

                                      let breakMarkerStyle = {};
                                      if (visualBreakMarkerTime) {
                                          const markerMinutesFromMidnight = timeToMinutes(visualBreakMarkerTime);
                                          const markerMinutesFromDisplayStart = markerMinutesFromMidnight - displayStartMinutes;
                                          const markerLeft = (markerMinutesFromDisplayStart / totalDisplayMinutes) * 100;
                                          breakMarkerStyle = {
                                              left: `${markerLeft}%`,
                                              height: '100%',
                                              position: 'absolute',
                                              borderLeft: '2px dashed red',
                                              zIndex: 10,
                                              top: 0
                                          };
                                      }

                                      // Determine if the current day is a school day for this employee (only for apprentice, fsj, intern)
                                      const isSchoolDay = (employee.type !== 'normal' && employee.type !== 'zusatzkraft') && !(employee.presenceDays || []).includes(day);

                                      // Get visual staffing warning ranges for this group and day
                                      const visualStaffingWarnings = currentGroupDayWarnings?.visualWarningRanges || [];


                                      return (
                                          // This div now represents a single grid row for the employee's content
                                          <div key={employee.id} className="contents"> {/* Use contents to make it a logical row */}
                                                {index === 0 && ( // Vertical Group Name (only for the first employee in the group)
                                                    <div
                                                        className={`flex items-center justify-center text-center font-semibold ${getTextColorForBg(group.color)} ${group.color} group-name-vertical`}
                                                        style={{
                                                            gridColumn: '1 / 2',
                                                            gridRow: `span ${employeesInThisGroup.length}`,
                                                            writingMode: 'vertical-lr',
                                                            textOrientation: 'mixed',
                                                            transform: 'rotate(180deg)',
                                                            padding: '0.25rem', // Reduced padding for narrowness
                                                            minWidth: '2.5rem', // Fixed narrow width for vertical text
                                                            borderRadius: '0 0.5rem 0.5rem 0', // Changed to round top-right and bottom-right
                                                        }}
                                                    >
                                                        {group.name}
                                                    </div>
                                                )}

                                                {/* Employee Name column - in the second column, with group background */}
                                                {/* Ensure no rounded corners here to make it seamless with the group background */}
                                                <div className={`col-start-2 h-full px-2 text-right font-medium flex items-center justify-end ${group.color} ${getTextColorForBg(group.color)} rounded-none employee-name-cell`}>
                                                    <span className="">{employee.name}</span> {/* Removed py-2 from here */}
                                                </div>

                                                {/* Timeline column - in the third column */}
                                                <div
                                                    ref={el => timelineRefs.current[`${employee.id}-${day}`] = el}
                                                    className={`col-start-3 relative h-full border border-gray-300 rounded-md bg-white timeline-row-container px-2 flex items-center justify-center ${isSchoolDay ? 'opacity-50' : ''}`}
                                                    onClick={(e) => {
                                                        if (!isDragging) { // Only allow click-to-add if no drag is active
                                                            handleTimelineClick(e, employee.id, day);
                                                        }
                                                    }}
                                                    data-employee-id={employee.id}
                                                    data-day-of-week={day}
                                                >
                                                    {/* Dynamic time lines for employee row */}
                                                    {Array.from({ length: Math.floor(totalDisplayMinutes / 15) + 1 }).map((_, i) => {
                                                      const currentMinute = displayStartMinutes + (i * 15);
                                                      if (currentMinute > displayEndMinutes) return null; // Ensure lines don't go past end time

                                                      const isHourMark = currentMinute % 60 === 0;
                                                      const leftPosition = ((currentMinute - displayStartMinutes) / totalDisplayMinutes) * 100;

                                                      return (
                                                        <div
                                                          key={`employee-line-${employee.id}-${day}-${currentMinute}`}
                                                          className={`absolute top-0 h-full ${isHourMark ? 'border-l-2 border-gray-300' : 'border-l border-gray-300 opacity-50'} z-0`}
                                                          style={{ left: `${leftPosition}%`, width: '1px' }}
                                                        ></div>
                                                      );
                                                    })}

                                                    {/* Visual break marker - Z-Index auf 25 erhöht */}
                                                    {visualBreakMarkerTime && (() => {
                                                        const markerMinutesFromMidnight = timeToMinutes(visualBreakMarkerTime);
                                                        const markerMinutesFromDisplayStart = markerMinutesFromMidnight - displayStartMinutes;
                                                        const markerLeft = (markerMinutesFromDisplayStart / totalDisplayMinutes) * 100;
                                                        const breakMarkerStyleUpdated = {
                                                            left: `${markerLeft}%`,
                                                            height: '100%',
                                                            position: 'absolute',
                                                            borderLeft: '2px dashed red',
                                                            zIndex: 25, // Erhöht, um über den Blöcken zu liegen
                                                            top: 0,
                                                            // Entferne temporäre Hintergrundfarbe, wenn du sie nicht mehr brauchst
                                                            // backgroundColor: 'rgba(0, 255, 255, 0.3)'
                                                        };
                                                        return (
                                                            <div
                                                                style={breakMarkerStyleUpdated}
                                                                className="print-hidden"
                                                                title={`Späteste Pause: ${visualBreakMarkerTime}`}
                                                            ></div>
                                                        );
                                                    })()}

                                                    {/* Visual staffing warning ranges (red areas) */}
                                                    {visualStaffingWarnings.map((range, idx) => {
                                                        const rangeStartMinutes = range.startMinutes;
                                                        const rangeEndMinutes = range.endMinutes;

                                                        const startMinutesFromDisplayStart = rangeStartMinutes - displayStartMinutes;
                                                        const endMinutesFromDisplayStart = rangeEndMinutes - displayStartMinutes;

                                                        const clippedStartMinutes = Math.max(0, startMinutesFromDisplayStart);
                                                        const clippedEndMinutes = Math.min(totalDisplayMinutes, endMinutesFromDisplayStart);

                                                        const left = (clippedStartMinutes / totalDisplayMinutes) * 100;
                                                        const width = ((clippedEndMinutes - clippedStartMinutes) / totalDisplayMinutes) * 100;

                                                        return (
                                                            <div
                                                                key={`staffing-warning-${group.id}-${day}-${idx}`}
                                                                className="absolute h-full bg-red-500 opacity-50 pointer-events-none z-10" // Increased opacity to 50%
                                                                style={{ left: `${left}%`, width: `${width}%` }}
                                                                title={`Weniger als ${group.minStaffRequired} in Betreuung: ${minutesToTime(range.startMinutes)}-${minutesToTime(range.endMinutes)}`}
                                                            ></div>
                                                        );
                                                    })}

                                                    {employeeShiftsForDay.length > 0 ? (
                                                        employeeShiftsForDay.map((shift) => (
                                                            shift.segments.map((segment, segIdx) => {
                                                                const { left, width, bgColorClass, textColorClass, borderHexColor } = getShiftBlockStyles(segment, displayStartMinutes, totalDisplayMinutes, categories, subCategories, groups);
                                                                const blockKey = `${shift.id}-${segIdx}`;

                                                                const category = categories.find(cat => cat.id === segment.categoryId);
                                                                const subCategory = subCategories.find(subCat => subCat.id === segment.subCategoryId);
                                                                let blockCategoryName = '';
                                                                if (subCategory) {
                                                                    blockCategoryName = subCategory.name;
                                                                } else if (category) {
                                                                    blockCategoryName = category.name;
                                                                } else if (segment.categoryId === PAUSE_CATEGORY.id) {
                                                                    blockCategoryName = PAUSE_CATEGORY.name;
                                                                }

                                                                const currentBlockWidth = blockObservedWidths[blockKey] || 0;

                                                                let displayedCategoryText = blockCategoryName;
                                                                let timeStringStart = segment.startTime;
                                                                let timeStringEnd = segment.endTime;
                                                                let categoryTextSizeClass = '';
                                                                let timeTextSizeClass = '';
                                                                let showTime = true;
                                                                let showCategory = true;
                                                                let isTimeVertical = false;

                                                                if (currentBlockWidth < 20) {
                                                                    showCategory = false;
                                                                    showTime = false;
                                                                } else if (currentBlockWidth < 40) {
                                                                    displayedCategoryText = blockCategoryName.charAt(0);
                                                                    categoryTextSizeClass = 'text-[0.6rem]';
                                                                    showTime = false;
                                                                    showCategory = true;
                                                                } else if (currentBlockWidth < 70) {
                                                                    showCategory = false;
                                                                    timeTextSizeClass = 'text-[0.6rem]';
                                                                    showTime = true;
                                                                    isTimeVertical = true;
                                                                } else {
                                                                    categoryTextSizeClass = 'text-sm';
                                                                    timeTextSizeClass = 'text-xs';
                                                                    showCategory = true;
                                                                    showTime = true;
                                                                    isTimeVertical = false;
                                                                }


                                                                return (
                                                                    <div
                                                                        key={blockKey}
                                                                        ref={el => shiftBlockRefs.current[blockKey] = el}
                                                                        className={`absolute h-full rounded-md flex flex-col items-center justify-center shadow-sm shift-block ${bgColorClass} ${textColorClass} overflow-hidden
                                                                            ${borderHexColor ? 'border-2 border-dashed' : ''}
                                                                        `} // Apply dashed border if borderHexColor exists // <-- HIER GEÄNDERT
                                                                        style={{
                                                                            left,
                                                                            width,
                                                                            boxSizing: 'border-box',
                                                                            minWidth: '0',
                                                                            cursor: currentShiftBlockCursor,
                                                                            zIndex: 20,
                                                                            borderColor: borderHexColor || undefined // Set border-color directly using hex value // <-- HIER GEÄNDERT
                                                                        }}
                                                                        title={`${blockCategoryName}: ${segment.startTime} - ${segment.endTime}${segment.overriddenGroupId ? ` (Zugeordnet zu: ${groups.find(g => g.id === segment.overriddenGroupId)?.name || 'Ohne Gruppe'})` : ''}`}
                                                                        onMouseDown={(e) => {
                                                                            e.stopPropagation();
                                                                            handleMouseDown(e, shift, segIdx);
                                                                        }}
                                                                        onMouseMove={handleShiftBlockMouseMove}
                                                                        onMouseLeave={handleShiftBlockMouseLeave}
                                                                    >
                                                                        {showCategory && (
                                                                            <span className={`${categoryTextSizeClass} font-semibold leading-tight text-center whitespace-nowrap px-1`}>
                                                                                {displayedCategoryText}
                                                                            </span>
                                                                        )}
                                                                        {showTime && (
                                                                            isTimeVertical ? (
                                                                                <div className={`flex flex-col items-center ${timeTextSizeClass} leading-tight text-center px-1`}>
                                                                                    <span>{timeStringStart}</span>
                                                                                    <span>{timeStringEnd}</span>
                                                                                </div>
                                                                            ) : (
                                                                                <span className={`${timeTextSizeClass} leading-tight text-center whitespace-nowrap px-1`}>
                                                                                    {timeStringStart}-{timeStringEnd}
                                                                                </span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ))
                                                    ) : (
                                                        <div className="text-gray-500 text-sm italic flex items-center h-full justify-center print-hidden-placeholder">
                                                            Klicken zum Hinzufügen
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Summary column - in the fourth column */}
                                                {/* Made this column relative for absolute positioning of warnings */}
                                                <div className="col-start-4 h-full pl-2 flex flex-row items-center justify-start gap-x-1 border-l border-gray-300 summary-cell relative">
                                                    {/* Daily Total Work Hours Block */}
                                                    <div className="flex items-center justify-center rounded-md bg-blue-500 text-white text-xs font-bold shadow-sm"
                                                         style={{ width: '20px', height: '50px', writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                                                        {formatMinutesToDecimalHours(totalWorkMinutes)}
                                                    </div>
                                                    {/* Display Pause if it has time */}
                                                    {categoryTotals[PAUSE_CATEGORY.id] > 0 && (
                                                      <div className={`flex items-center justify-center rounded-md ${PAUSE_CATEGORY.color} text-white text-xs shadow-sm`}
                                                           style={{ width: '20px', height: '50px', writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                                                          {formatMinutesToDecimalHours(categoryTotals[PAUSE_CATEGORY.id])}
                                                      </div>
                                                    )}
                                                    {/* Display other dynamic categories */}
                                                    {categoriesWithTime
                                                      .filter(cat => cat.id !== PAUSE_CATEGORY.id)
                                                      .map(cat => (
                                                        <div key={cat.id} className={`flex items-center justify-center rounded-md ${cat.color} ${getTextColorForBg(cat.color)} text-xs shadow-sm`}
                                                             style={{ width: '20px', height: '50px', writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                                                            {formatMinutesToDecimalHours(categoryTotals[cat.id] || 0)}
                                                        </div>
                                                    ))}

                                                    {/* Arbeitszeitgesetz-Warnungen (Icon mit Hover-Tooltip) */}
                                                    {warnings.length > 0 && (
                                                      <div
                                                        // Geändert: top-1/2 und -translate-y-1/2 für vertikale Zentrierung
                                                        className="absolute top-1/2 -translate-y-1/2 right-1 cursor-pointer z-40" // Positioniert vertikal mittig und rechts in der Zelle
                                                        onMouseEnter={(e) => {
                                                          // Lösche eventuelle ausstehende Verstecken-Timeouts
                                                          if (hideTooltipTimeoutRef.current) {
                                                            clearTimeout(hideTooltipTimeoutRef.current);
                                                            hideTooltipTimeoutRef.current = null;
                                                          }
                                                          setWarningTooltipContent(warnings);
                                                          setShowWarningTooltip(true);
                                                          // Setze die Position nur einmal beim Betreten
                                                          setWarningTooltipPos({ x: e.clientX, y: e.clientY });
                                                        }}
                                                        onMouseLeave={() => {
                                                          // Starte einen Timeout, um den Tooltip zu verstecken, falls die Maus nicht sofort auf den Tooltip geht
                                                          hideTooltipTimeoutRef.current = setTimeout(() => {
                                                            setShowWarningTooltip(false);
                                                          }, 100); // Kurze Verzögerung von 100ms
                                                        }}
                                                      >
                                                        <AlertCircle className="text-red-600 w-6 h-6" /> {/* Rotes Ausrufezeichen-Icon */}
                                                      </div>
                                                    )}
                                                </div>
                                            </div>
                                      );
                                  })}
                              </React.Fragment>
                          );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* --- Weekly Summary Section --- */}
          <div className="p-6 bg-gray-50 rounded-lg shadow-inner weekly-summary-section">
              <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Wochenübersicht Mitarbeiter</h2>
              {employees.length === 0 ? (
                  <p className="text-center text-gray-500">Bitte fügen Sie Mitarbeiter hinzu, um die Wochenübersicht zu sehen.</p>
              ) : (
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300 rounded-lg shadow-md border border-gray-200">
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


          {/* Add Shift Type Menu (for clicking on empty space) */}
          {showAddShiftMenu && (
            <div
              className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 max-w-[12rem]" /* Reduced max-width */
              style={{ right: addShiftMenuPos.x, top: addShiftMenuPos.y }} /* Changed left to right */
              onMouseLeave={() => setShowAddShiftMenu(false)}
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Kategorie wählen:</h4>
              {/* PAUSE_CATEGORY button */}
              <button
                    className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${PAUSE_CATEGORY.color} ${getTextColorForBg(PAUSE_CATEGORY.color)}`}
                    onClick={() => handleAddSegmentFromMenu(PAUSE_CATEGORY.id)}
                  >
                    {PAUSE_CATEGORY.name}
              </button>
              {/* Subcategories under PAUSE_CATEGORY */}
              {subCategories.filter(subCat => subCat.parentCategoryId === PAUSE_CATEGORY.id).map(subCat => (
                  <div key={subCat.id} className="w-full pl-4">
                    <button
                      className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${subCat.color || PAUSE_CATEGORY.color} ${getTextColorForBg(subCat.color || PAUSE_CATEGORY.color)}`}
                      onClick={() => handleAddSegmentFromMenu(PAUSE_CATEGORY.id, subCat.id)}
                    >
                      {subCat.name}
                    </button>
                  </div>
              ))}

              {/* Main Categories and their subcategories */}
              {categories.map(category => (
                <React.Fragment key={category.id}>
                  <button
                    className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${category.color} ${getTextColorForBg(category.color)}`}
                    onClick={() => handleAddSegmentFromMenu(category.id)}
                  >
                    {category.name}
                  </button>
                  {subCategories.filter(subCat => subCat.parentCategoryId === category.id).map(subCat => (
                    <div key={subCat.id} className="w-full pl-4">
                      <button
                        className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${subCat.color || category.color} ${getTextColorForBg(subCat.color || category.color)}`}
                        onClick={() => handleAddSegmentFromMenu(category.id, subCat.id)}
                      >
                        {subCat.name}
                      </button>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Shift Options Menu (for clicking on existing shift block) */}
          {showShiftOptionsMenu && shiftOptionsContext && (
            <div
              className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 max-w-[12rem]"
              style={{ right: shiftOptionsMenuPos.x, top: shiftOptionsMenuPos.y }}
              onMouseLeave={() => setShowShiftOptionsMenu(false)}
            >
              <button
                className="block w-full text-left px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-100 rounded-md"
                onClick={handleChangeShiftClick}
              >
                Kategorie ändern
              </button>
              <button
                className="block w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 rounded-md"
                onClick={handleChangeGroupClick} // New button for changing group
              >
                Gruppe zuweisen
              </button>
              <button
                className="block w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-100 rounded-md"
                onClick={handleDeleteShift}
              >
                Löschen
              </button>
            </div>
          )}

          {/* Change Group Menu (for assigning shifts to different groups) */}
          {showChangeGroupMenu && changeGroupContext && (
            <div
              className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 max-w-[15rem]" // Increased max-width for group names
              style={{ right: changeGroupMenuPos.x, top: changeGroupMenuPos.y }}
              onMouseLeave={() => setShowChangeGroupMenu(false)}
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Gruppe zuweisen:</h4>
              {/* Option to revert to employee's default group */}
              <button
                className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 bg-gray-100 ${getTextColorForBg('bg-gray-100')}`}
                onClick={() => handleUpdateSegmentGroup(employees.find(emp => emp.id === changeGroupContext.shift.employeeId)?.groupId || 'no-group')}
              >
                Standardgruppe ({employees.find(emp => emp.id === changeGroupContext.shift.employeeId)?.groupId ? groups.find(g => g.id === employees.find(emp => emp.id === changeGroupContext.shift.employeeId)?.groupId)?.name : 'Ohne Gruppe'})
              </button>
              <hr className="my-2 border-gray-200" /> {/* Separator */}

              {/* List all other groups */}
              {groups.map(group => (
                <button
                  key={group.id}
                  className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${group.color} ${getTextColorForBg(group.color)}`}
                  onClick={() => handleUpdateSegmentGroup(group.id)}
                >
                  {group.name}
                </button>
              ))}
              {/* Option for "Ohne Gruppe" explicitly if not already covered */}
              {!groups.some(g => g.id === 'no-group') && (
                <button
                  className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 bg-gray-200 ${getTextColorForBg('bg-gray-200')}`}
                  onClick={() => handleUpdateSegmentGroup('no-group')}
                >
                  Ohne Gruppe
                </button>
              )}
            </div>
          )}

          {/* Change Shift Menu (for changing category/subcategory of existing shifts) */}
          {showChangeShiftMenu && changeShiftContext && (
            <div
              className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50 max-w-[12rem]" /* Reduced max-width */
              style={{ right: changeShiftMenuPos.x, top: changeShiftMenuPos.y }} /* Changed left to right */
              onMouseLeave={() => setShowChangeShiftMenu(false)}
            >
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Neue Kategorie wählen:</h4>
              {/* PAUSE_CATEGORY button */}
              <button
                    className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${PAUSE_CATEGORY.color} ${getTextColorForBg(PAUSE_CATEGORY.color)}`}
                    onClick={() => handleUpdateSegmentCategory(PAUSE_CATEGORY.id, '')}
                  >
                    {PAUSE_CATEGORY.name}
              </button>
              {/* Subcategories under PAUSE_CATEGORY */}
              {subCategories.filter(subCat => subCat.parentCategoryId === PAUSE_CATEGORY.id).map(subCat => (
                  <div key={subCat.id} className="w-full pl-4">
                    <button
                      className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${subCat.color || PAUSE_CATEGORY.color} ${getTextColorForBg(subCat.color || PAUSE_CATEGORY.color)}`}
                      onClick={() => handleUpdateSegmentCategory(PAUSE_CATEGORY.id, subCat.id)}
                    >
                      {subCat.name}
                      </button>
                    </div>
                ))}
                {/* Main Categories and their subcategories */}
                {categories.map(category => (
                  <React.Fragment key={category.id}>
                    <button
                      className={`flex items-center w-full text-left px-3 py-2 text-sm rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${category.color} ${getTextColorForBg(category.color)}`}
                      onClick={() => handleUpdateSegmentCategory(category.id, '')}
                    >
                      {category.name}
                    </button>
                    {subCategories.filter(subCat => subCat.parentCategoryId === category.id).map(subCat => (
                      <div key={subCat.id} className="w-full pl-4">
                        <button
                          className={`flex items-center w-full text-left px-3 py-1 text-xs rounded-md transition duration-150 ease-in-out hover:opacity-80 hover:border-2 hover:border-blue-500 ${subCat.color || category.color} ${getTextColorForBg(subCat.color || category.color)}`}
                          onClick={() => handleUpdateSegmentCategory(category.id, subCat.id)}
                        >
                          {subCat.name}
                        </button>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Render the custom confirmation modal */}
            {showConfirmModal && (
              <ConfirmModal
                message={confirmModalMessage}
                onConfirm={handleConfirmModalConfirm}
                onCancel={handleConfirmModalCancel}
              />
            )}

            {/* Render the print options modal */}
            {showPrintOptionsModal && (
              <PrintOptionsModal
                onPrint={handlePrintFromModal}
                onCancel={handleCancelPrintModal}
                defaultPrintWeeklySummary={printWeeklySummary}
                onPrintWeeklySummaryChange={setPrintWeeklySummary}
                selectedGroupIdFilter={selectedGroupIdFilter}
                setSelectedGroupIdFilter={setSelectedGroupIdFilter}
                groups={groups} // Weiterhin benötigt, um die Namen der Gruppen in der PrintOptionsModal zu finden
                hasEmployeesWithoutGroup={hasEmployeesWithoutGroup}
                selectedEmployeeIdFilter={selectedEmployeeIdFilter}
                setSelectedEmployeeIdFilter={setSelectedEmployeeIdFilter}
                availableEmployeesForFilter={availableEmployeesForFilter}
                // NEU: Übergabe der gefilterten Gruppenliste für das Dropdown
                filteredGroupsForDisplayInFilter={filteredGroupsForDisplayInFilter}
              />
            )}

            {/* NEU: Render the Schedule Management Modal */}
            {showScheduleManagementModal && (
              <ScheduleManagementModal
                onClearSchedule={handleClearSchedule}
                onExportSchedule={handleExportSchedule}
                onImportSchedule={handleImportSchedule}
                onCancel={() => setShowScheduleManagementModal(false)}
                fileInputRef={fileInputScheduleRef} // Den Ref für den Import übergeben
              />
            )}

            {/* Render the New Version Popup */}
            {showNewVersionPopup && (
              <NewVersionPopup
                version={CURRENT_APP_VERSION}
                onClose={() => setShowNewVersionPopup(false)}
                releaseNotes={RELEASE_NOTES}
              />
            )}
          </div>
        </div>
        {/* Warning Tooltip (appears on hover over AlertCircle) */}
          {showWarningTooltip && warningTooltipContent.length > 0 && (
            <div
              className="fixed bg-red-700 text-white text-xs p-2 rounded-md shadow-lg z-[1000] max-w-xs" // "fixed" für Mauszeiger-Folge, erhöhter z-index, pointer-events-none entfernt
              style={{
                left: warningTooltipPos.x,
                top: warningTooltipPos.y,
                transform: 'translate(-100%, -100%)', // Behält die Positionierung oben links vom Cursor bei
              }}
              onMouseEnter={() => {
                  // Wenn die Maus auf den Tooltip geht, lösche den Hide-Timeout vom Icon
                  if (hideTooltipTimeoutRef.current) {
                      clearTimeout(hideTooltipTimeoutRef.current);
                      hideTooltipTimeoutRef.current = null;
                  }
              }}
              onMouseLeave={() => {
                  // Wenn die Maus den Tooltip verlässt, verstecke ihn nach einem kurzen Timeout
                  hideTooltipTimeoutRef.current = setTimeout(() => {
                      setShowWarningTooltip(false);
                  }, 100); // Kurze Verzögerung von 100ms
              }}
            >
              {warningTooltipContent.map((msg, idx) => (
                <p key={idx}>{msg}</p>
              ))}
            </div>
          )}
    </>
  );
}

export default App;
