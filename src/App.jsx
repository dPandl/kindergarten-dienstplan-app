import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Import for generating unique IDs

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

// Helper to format minutes into "X.YYh" (decimal hours) or "Xh" for whole hours
const formatMinutesToDecimalHours = (totalMinutes) => {
  const hours = totalMinutes / 60;
  if (hours % 1 === 0) { // Check if it's a whole number
    return hours.toFixed(0) + 'h'; // Display as integer if whole
  }
  return hours.toFixed(2) + 'h'; // Format to 2 decimal places otherwise
};


// Helper function to calculate position and width for shift blocks
const getShiftBlockStyles = (shiftSegment, displayStartMinutes, totalDisplayMinutes, categories, subCategories) => {
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

  // Determine text color based on background color (simple check for dark colors)
  const textColorClass = (
    bgColorClass.includes('red-') || bgColorClass.includes('orange-') || bgColorClass.includes('amber-') || bgColorClass.includes('yellow-') ||
    bgColorClass.includes('lime-') || bgColorClass.includes('green-') || bgColorClass.includes('emerald-') || bgColorClass.includes('teal-') ||
    bgColorClass.includes('cyan-') || bgColorClass.includes('sky-') || bgColorClass.includes('blue-') || bgColorClass.includes('indigo-') ||
    bgColorClass.includes('violet-') || bgColorClass.includes('purple-') || bgColorClass.includes('fuchsia-') || bgColorClass.includes('pink-') ||
    bgColorClass.includes('rose-') || bgColorClass.includes('gray-500') || bgColorClass.includes('slate-500') || bgColorClass.includes('neutral-500')
  ) ? 'text-white' : 'text-gray-900';

  return { left: `${left}%`, width: `${width}%`, bgColorClass, textColorClass };
};


// --- Function to calculate daily work metrics and validate breaks ---
// Now takes categories and subCategories to map categoryId/subCategoryId to effective category
const calculateDailyWorkMetrics = (shiftsForDay, categories, subCategories) => {
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;
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
  }

  const warnings = [];

  // Check for 30-minute break after 6 hours of work
  if (totalWorkMinutes > 6 * 60 && totalBreakMinutes < MIN_BREAK_AFTER_6_HOURS) {
    warnings.push(`Pause (${MIN_BREAK_AFTER_6_HOURS}min) fehlt`);
  }

  // Check for 45-minute break after 9 hours of work
  if (totalWorkMinutes > 9 * 60 && totalBreakMinutes < MIN_BREAK_AFTER_9_HOURS) {
    warnings.push(`Pause (${MIN_BREAK_AFTER_9_HOURS}min) fehlt`);
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
    categoryTotals, // Contains totals for each user-defined category + PAUSE_CATEGORY
    totalWorkMinutes, // For labor law checks
    totalBreakMinutes, // For labor law checks
    warnings,
    visualBreakMarkerTime,
  };
};

// Predefined Tailwind colors for category selection
const tailwindColors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
    'bg-pink-500', 'bg-rose-500', 'bg-gray-500', 'bg-slate-500', 'bg-neutral-500'
];
// Filter out 'bg-blue-500' which is used for "Gesamt"
const availableColors = tailwindColors.filter(color => color !== 'bg-blue-500');


// --- New ColorPickerDropdown Component ---
const ColorPickerDropdown = ({ selectedColor, onColorChange, colors, placeholder }) => {
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
            <span className={`inline-block w-5 h-5 rounded-full mr-2 ${selectedColor} border border-gray-300`}></span>
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
              className={`w-full h-10 flex items-center justify-center rounded-md cursor-pointer border border-gray-200 hover:ring-2 hover:ring-blue-400 transition duration-150 ${color} ${selectedColor === color ? 'border-4 border-blue-500' : ''}`}
              onClick={() => handleColorSelect(color)}
              title={color.replace('bg-', '')} // Keep title for hover tooltip
            >
              {/* Removed the checkmark SVG here */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Custom Confirmation Modal Component ---
const ConfirmModal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full transform transition-all duration-300 scale-100">
        <p className="text-lg font-semibold text-gray-800 mb-6 text-center">{message}</p>
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


function App() {
  const [message, setMessage] = useState('');

  // Local data loading state
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Group States
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Employee States
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({ name: '', contractedHoursPerWeek: 0, groupId: '' });
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  // Category States (new)
  const [categories, setCategories] = useState([]); // These are now only user-defined categories
  const [newCategory, setNewCategory] = useState({ name: '', color: availableColors[0] || 'bg-blue-600' });
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  // SubCategory States (new)
  const [subCategories, setSubCategories] = useState([]);
  const [newSubCategory, setNewSubCategory] = useState({ name: '', parentCategoryId: '', color: availableColors[0] || 'bg-gray-300' });
  const [editingSubCategoryId, setEditingSubCategoryId] = useState(null);

  // Master Schedule States (for the constant weekly plan)
  const [masterSchedule, setMasterSchedule] = useState({ shifts: [], displayStartTime: '06:00', displayEndTime: '20:00', title: 'Wochenplan' });

  // Display Time Range States (new)
  const [displayStartHour, setDisplayStartHour] = useState(6);
  const [displayStartMinute, setDisplayStartMinute] = useState(0);
  const [displayEndHour, setDisplayEndHour] = useState(20);
  const [displayEndMinute, setDisplayEndMinute] = useState(0);

  // Customizable Weekly Plan Title States
  const [weeklyPlanTitle, setWeeklyPlanTitle] = useState('Wochenplan');
  const [isEditingWeeklyPlanTitle, setIsEditingWeeklyPlanTitle] = useState(false);


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

  // Click-to-add states
  const [showAddShiftMenu, setShowAddShiftMenu] = useState(false);
  const [addShiftMenuPos, setAddShiftMenuPos] = useState({ x: 0, y: 0 });
  const [addShiftContext, setAddShiftContext] = useState(null); // { employeeId, dayOfWeek, clickedMinutes }

  // Shift Options Menu (for editing/deleting existing shifts)
  const [showShiftOptionsMenu, setShowShiftOptionsMenu] = useState(false);
  const [shiftOptionsMenuPos, setShiftOptionsMenuPos] = useState({ x: 0, y: 0 });
  const [shiftOptionsContext, setShiftOptionsContext] = useState(null);

  // New state for storing rendered block widths and refs
  const [blockObservedWidths, setBlockObservedWidths] = useState({}); // Changed to observed widths
  const shiftBlockRefs = useRef({}); // To hold refs for each shift block element
  const resizeObservers = useRef({}); // To hold ResizeObserver instances

  // State for dynamic cursor on shift blocks
  const [currentShiftBlockCursor, setCurrentShiftBlockCursor] = useState('grab');

  // Ref for the file input element (for import)
  const fileInputRef = useRef(null);

  // --- Confirmation Modal States ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState(null); // Function to call on confirm


  // --- Calculate Weekly Summaries (Memoized for performance) ---
  const weeklySummaries = useMemo(() => {
    const summaries = {};
    if (employees.length === 0 || !masterSchedule.shifts || categories.length === 0) {
        return summaries;
    }

    employees.forEach(employee => {
        let weeklyTotalWorkMinutes = 0;
        let weeklyTotalBreakMinutes = 0;
        const weeklyCategoryTotals = {}; // Aggregate category totals for the week

        WEEK_DAYS_PLAN.forEach(day => {
            const shiftsForDay = masterSchedule.shifts.filter(shift =>
                shift.employeeId === employee.id && shift.dayOfWeek === day
            );
            // Pass categories and subCategories to calculateDailyWorkMetrics
            const {
                categoryTotals, // This now contains all dynamic categories + PAUSE
                totalWorkMinutes,
                totalBreakMinutes
            } = calculateDailyWorkMetrics(shiftsForDay, categories, subCategories);

            weeklyTotalWorkMinutes += totalWorkMinutes;
            weeklyTotalBreakMinutes += totalBreakMinutes;

            // Aggregate category totals
            for (const catId in categoryTotals) {
              weeklyCategoryTotals[catId] = (weeklyCategoryTotals[catId] || 0) + categoryTotals[catId];
            }
        });

        const contractedMinutesPerWeek = employee.contractedHoursPerWeek * 60;
        const weeklyWarnings = [];

        // Check for contracted hours discrepancy
        const discrepancy = weeklyTotalWorkMinutes - contractedMinutesPerWeek;
        const toleranceMinutes = 1; // Allow for minor rounding differences (e.g., 0.01h = 0.6 min)

        if (discrepancy > toleranceMinutes) {
            weeklyWarnings.push(`Überstunden: ${formatMinutesToDecimalHours(discrepancy)}`);
        } else if (discrepancy < -toleranceMinutes) {
            weeklyWarnings.push(`Unterstunden: ${formatMinutesToDecimalHours(Math.abs(discrepancy))}`);
        }

        summaries[employee.id] = {
            employeeName: employee.name,
            contractedHours: employee.contractedHoursPerWeek,
            weeklyTotalWorkMinutes,
            weeklyTotalBreakMinutes,
            weeklyCategoryTotals, // New: contains totals for each specific category for the week
            weeklyWarnings
        };
    });
    return summaries;
  }, [employees, masterSchedule, categories, subCategories]); // Dependencies for useMemo


  // --- Local Storage Data Loading and Saving ---
  useEffect(() => {
    // Load data from localStorage on component mount
    const loadData = () => {
      try {
        const storedGroups = JSON.parse(localStorage.getItem('groups')) || [];
        const storedEmployees = JSON.parse(localStorage.getItem('employees')) || [];
        const storedCategories = JSON.parse(localStorage.getItem('categories')) || [];
        const storedSubCategories = JSON.parse(localStorage.getItem('subCategories')) || [];
        const storedMasterSchedule = JSON.parse(localStorage.getItem('masterSchedule'));

        setGroups(storedGroups);
        setEmployees(storedEmployees);
        setCategories(storedCategories);
        setSubCategories(storedSubCategories);

        if (storedMasterSchedule) {
          setMasterSchedule(storedMasterSchedule);
          setDisplayStartHour(parseInt(storedMasterSchedule.displayStartTime.split(':')[0], 10));
          setDisplayStartMinute(parseInt(storedMasterSchedule.displayStartTime.split(':')[1], 10));
          setDisplayEndHour(parseInt(storedMasterSchedule.displayEndTime.split(':')[0], 10));
          setDisplayEndMinute(parseInt(storedMasterSchedule.displayEndTime.split(':')[1], 10));
          setWeeklyPlanTitle(storedMasterSchedule.title || 'Wochenplan');
        } else {
          // Initialize with default if no master schedule found
          const defaultSchedule = { shifts: [], displayStartTime: '06:00', displayEndTime: '20:00', title: 'Wochenplan' };
          setMasterSchedule(defaultSchedule);
          localStorage.setItem('masterSchedule', JSON.stringify(defaultSchedule));
        }
      } catch (error) {
        console.error("Fehler beim Laden der Daten aus localStorage:", error);
        setMessage("Fehler beim Laden der Daten. Möglicherweise sind die lokalen Daten beschädigt.");
      } finally {
        setIsDataLoaded(true); // Mark data as loaded regardless of success/failure
      }
    };

    loadData();
  }, []); // Empty dependency array means this runs once on mount

  // Save data to localStorage whenever relevant states change
  useEffect(() => {
    if (isDataLoaded) { // Only save once initial data is loaded to prevent overwriting
      localStorage.setItem('groups', JSON.stringify(groups));
    }
  }, [groups, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('employees', JSON.stringify(employees));
    }
  }, [employees, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('categories', JSON.stringify(categories));
    }
  }, [categories, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('subCategories', JSON.stringify(subCategories));
    }
  }, [subCategories, isDataLoaded]);

  // Special effect for masterSchedule to handle display time and title updates
  useEffect(() => {
    if (isDataLoaded) {
      const newMasterSchedule = {
        ...masterSchedule,
        displayStartTime: minutesToTime((displayStartHour * 60) + displayStartMinute),
        displayEndTime: minutesToTime((displayEndHour * 60) + displayEndMinute),
        title: weeklyPlanTitle,
      };
      localStorage.setItem('masterSchedule', JSON.stringify(newMasterSchedule));
    }
  }, [masterSchedule.shifts, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, weeklyPlanTitle, isDataLoaded]);


  // --- Group Management ---
  const handleAddGroup = () => {
    if (!newGroupName.trim()) {
      setMessage('Gruppenname darf nicht leer sein.');
      return;
    }
    const newGroup = { id: uuidv4(), name: newGroupName.trim() };
    setGroups(prev => [...prev, newGroup]);
    setNewGroupName('');
    setMessage('Gruppe erfolgreich hinzugefügt!');
  };

  const handleDeleteGroup = (id) => {
    // Prevent deletion if group is assigned to any employee
    const isGroupUsed = employees.some(emp => emp.groupId === id);
    if (isGroupUsed) {
      setMessage('Gruppe kann nicht gelöscht werden, da ihr noch Mitarbeiter zugeordnet sind.');
      return;
    }
    setGroups(prev => prev.filter(group => group.id !== id));
    setMessage('Gruppe erfolgreich gelöscht!');
  };

  const handleEditGroupClick = (group) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };

  const handleUpdateGroup = () => {
    if (!editingGroupName.trim()) {
      setMessage('Gruppenname darf nicht leer sein.');
      return;
    }
    setGroups(prev => prev.map(group =>
      group.id === editingGroupId ? { ...group, name: editingGroupName.trim() } : group
    ));
    setMessage('Gruppe erfolgreich aktualisiert!');
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName('');
  };


  // --- Employee Management ---
  const handleEmployeeChange = (e) => {
    setNewEmployee({ ...newEmployee, [e.target.name]: e.target.value });
  };

  const handleAddEmployee = () => {
    if (!newEmployee.name.trim() || newEmployee.contractedHoursPerWeek <= 0) {
      setMessage('Mitarbeitername und Stunden pro Woche sind erforderlich.');
      return;
    }
    if (editingEmployeeId) {
      setEmployees(prev => prev.map(emp =>
        emp.id === editingEmployeeId ? { ...newEmployee } : emp
      ));
      setMessage('Mitarbeiter erfolgreich aktualisiert!');
      setEditingEmployeeId(null);
    } else {
      const employeeToAdd = { ...newEmployee, id: uuidv4() };
      setEmployees(prev => [...prev, employeeToAdd]);
      setMessage('Mitarbeiter erfolgreich hinzugefügt!');
    }
    setNewEmployee({ name: '', contractedHoursPerWeek: 0, groupId: '' });
  };

  const handleEditEmployee = (employee) => {
    setNewEmployee({ ...employee });
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
    setNewEmployee({ name: '', contractedHoursPerWeek: 0, groupId: '' });
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
    const categoryToAdd = { ...newCategory, id: uuidv4() };
    setCategories(prev => [...prev, categoryToAdd]);
    setNewCategory({ name: '', color: availableColors[0] || 'bg-blue-600' });
    setMessage('Kategorie erfolgreich hinzugefügt!');
  };

  const handleEditCategoryClick = (category) => {
    setEditingCategoryId(category.id);
    setNewCategory(category); // Populate form with existing category data
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
    setCategories(prev => prev.map(category =>
      category.id === editingCategoryId ? { ...newCategory } : category
    ));
    setMessage('Kategorie erfolgreich aktualisiert!');
    setEditingCategoryId(null);
    setNewCategory({ name: '', color: availableColors[0] || 'bg-blue-600' });
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
    setNewCategory({ name: '', color: availableColors[0] || 'bg-blue-600' });
  };

  // --- SubCategory Management ---
  const handleAddSubCategory = () => {
    if (!newSubCategory.name.trim() || !newSubCategory.parentCategoryId) {
      setMessage('Unterkategoriename und übergeordnete Kategorie sind erforderlich.');
      return;
    }
    const subCategoryToAdd = { ...newSubCategory, id: uuidv4() };
    setSubCategories(prev => [...prev, subCategoryToAdd]);
    setNewSubCategory({ name: '', parentCategoryId: '', color: availableColors[0] || 'bg-gray-300' });
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
    setNewSubCategory({ name: '', parentCategoryId: '', color: availableColors[0] || 'bg-gray-300' });
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
    setNewSubCategory({ name: '', parentCategoryId: '', color: availableColors[0] || 'bg-gray-300' });
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
      setMessage('Bitte zuerst Kategorien erstellen, um Schichten hinzuzufügen.');
      return;
    }

    const timelineDiv = timelineRefs.current[`${employeeId}-${dayOfWeek}`];
    if (!timelineDiv) return;

    const rect = timelineDiv.getBoundingClientRect();
    // Use pageX/pageY for positioning relative to the document
    const clickX = e.pageX;
    const clickY = e.pageY;
    const relativeX = clickX - rect.left;

    const clickedMinutesFromDisplayStart = (relativeX / rect.width) * totalDisplayMinutes;
    const snappedMinutesFromDisplayStart = Math.round(clickedMinutesFromDisplayStart / 15) * 15;

    const absoluteSnappedMinutes = displayStartMinutes + snappedMinutesFromDisplayStart;

    setAddShiftContext({ employeeId, dayOfWeek, clickedMinutes: absoluteSnappedMinutes });
    setAddShiftMenuPos({ x: clickX, y: clickY }); // Use pageX/pageY
    setShowAddShiftMenu(true);
    setShowShiftOptionsMenu(false); // Close shift options menu if open
  };

  const handleAddSegmentFromMenu = (categoryId, subCategoryId = '') => {
    setShowAddShiftMenu(false);
    if (!addShiftContext || !masterSchedule) return;

    const { employeeId, dayOfWeek, clickedMinutes } = addShiftContext;
    const startTimeMinutes = clickedMinutes;
    const endTimeMinutes = clickedMinutes + 30; // Default 30 min duration

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
    setAddShiftContext(null);
  };


  // Helper to group shifts for display by employee and day of week
  const getGroupedMasterShifts = useCallback(() => {
    const grouped = {};
    if (masterSchedule && masterSchedule.shifts && employees.length > 0) {
      masterSchedule.shifts.forEach(shift => {
        const employee = employees.find(emp => emp.id === shift.employeeId);
        if (!employee) return; // Skip if employee not found

        const employeeName = employee.name;
        const employeeGroup = groups.find(g => g.id === employee.groupId)?.name || 'Ohne Gruppe';

        if (!grouped[employeeGroup]) {
            grouped[employeeGroup] = {};
        }
        if (!grouped[employeeGroup][employeeName]) {
          grouped[employeeGroup][employeeName] = {};
        }
        if (!grouped[employeeGroup][employeeName][shift.dayOfWeek]) {
          grouped[employeeGroup][employeeName][shift.dayOfWeek] = [];
        }
        grouped[employeeGroup][employeeName][shift.dayOfWeek].push(shift);
      });
    }
    return grouped;
  }, [masterSchedule, employees, groups]);

  // --- Drag & Resize Logic ---

  const handleMouseDown = (e, shift, segmentIndex) => { // Removed dragMode parameter, now determined internally
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
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !draggedShiftInfo) return;

    const pixelsPerMinute = draggedShiftInfo.timelineWidth / totalDisplayMinutes;
    const deltaX = e.clientX - draggedShiftInfo.initialMouseX;
    const minutesDelta = Math.round(deltaX / pixelsPerMinute); // Raw minutes moved

    let newStartMinutes = draggedShiftInfo.initialShiftStartMinutes;
    let newEndMinutes = draggedShiftInfo.initialShiftEndMinutes;

    if (draggedShiftInfo.dragMode === 'move') {
      newStartMinutes = draggedShiftInfo.initialShiftStartMinutes + minutesDelta;
      newEndMinutes = draggedShiftInfo.initialShiftEndMinutes + minutesDelta;
    } else if (draggedShiftInfo.dragMode === 'resize-left') {
      newStartMinutes = draggedShiftInfo.initialShiftStartMinutes + minutesDelta;
    } else if (draggedShiftInfo.dragMode === 'resize-right') {
      newEndMinutes = draggedShiftInfo.initialShiftEndMinutes + minutesDelta;
    }

    // Snap to nearest 15 minutes
    newStartMinutes = Math.round(newStartMinutes / 15) * 15;
    newEndMinutes = Math.round(newEndMinutes / 15) * 15;

    // Ensure start time is before end time and duration is at least 15 minutes
    if (newStartMinutes >= newEndMinutes) {
      if (draggedShiftInfo.dragMode === 'resize-left') {
        newStartMinutes = newEndMinutes - 15;
      } else if (draggedShiftInfo.dragMode === 'resize-right') {
        newEndMinutes = newStartMinutes + 15;
      } else { // move
        newEndMinutes = newStartMinutes + (draggedShiftInfo.initialShiftEndMinutes - draggedShiftInfo.initialShiftStartMinutes);
      }
      // Prevent negative duration
      if (newEndMinutes - newStartMinutes < 15) {
          if (draggedShiftInfo.dragMode === 'resize-left') newStartMinutes = newEndMinutes - 15;
          else if (draggedShiftInfo.dragMode === 'resize-right') newEndMinutes = newStartMinutes + 15;
          else newEndMinutes = newStartMinutes + 15; // move
      }
    }

    // Clip to display bounds (using the current display settings)
    newStartMinutes = Math.max(displayStartMinutes, newStartMinutes);
    newEndMinutes = Math.min(displayEndMinutes, newEndMinutes);

    // Create a temporary updated masterSchedule for visual feedback
    const updatedMasterSchedule = { ...masterSchedule };
    const shiftToUpdate = updatedMasterSchedule.shifts.find(s => s.id === draggedShiftInfo.shiftId);

    if (shiftToUpdate) {
      shiftToUpdate.segments[draggedShiftInfo.segmentIndex].startTime = minutesToTime(newStartMinutes);
      shiftToUpdate.segments[draggedShiftInfo.segmentIndex].endTime = minutesToTime(newEndMinutes);
      setMasterSchedule(updatedMasterSchedule);
    }
  }, [isDragging, draggedShiftInfo, masterSchedule, displayStartMinutes, displayEndMinutes, totalDisplayMinutes]); // Depend on display times

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !draggedShiftInfo || !masterSchedule) return;

    setIsDragging(false);
    setDraggedShiftInfo(null);

    // Persist changes to localStorage
    // masterSchedule is already updated by handleMouseMove, so just save it
    localStorage.setItem('masterSchedule', JSON.stringify(masterSchedule));
    setMessage("Schicht erfolgreich aktualisiert!");
  }, [isDragging, draggedShiftInfo, masterSchedule]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    // Also handle mouse up outside the window
    const handleWindowMouseUp = () => {
        if (isDragging) handleMouseUp();
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

    // Set up new observers for shift blocks
    for (const key in shiftBlockRefs.current) {
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
    }

    // Cleanup function for ResizeObservers
    return () => {
      for (const key in resizeObservers.current) {
        if (resizeObservers.current[key]) {
          resizeObservers.current[key].disconnect();
        }
      }
    };
  }, [masterSchedule.shifts, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, employees]); // Dependencies to re-run observer setup


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

  // --- Export Data Function ---
  const handleExportData = () => {
    try {
      const dataToExport = {
        groups: groups,
        employees: employees,
        categories: categories,
        subCategories: subCategories,
        masterSchedule: masterSchedule,
      };
      const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `kindergarten_dienstplan_export_${new Date().toISOString().slice(0, 10)}.json`; // Filename with date
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Clean up the URL object

      setMessage('Daten erfolgreich exportiert!');
    } catch (error) {
      console.error("Fehler beim Exportieren der Daten:", error);
      setMessage('Fehler beim Exportieren der Daten.');
    }
  };

  // --- Import Data Function (now uses custom modal) ---
  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setMessage('Bitte eine Datei zum Importieren auswählen.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);

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
          !Array.isArray(importedData.masterSchedule.shifts) // masterSchedule.shifts should be an array
        ) {
          setMessage('Ungültiges Dateiformat. Die importierte Datei scheint kein gültiger Dienstplan-Export zu sein.');
          // Clear the file input value to allow re-importing
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Set up the confirmation modal
        setConfirmModalMessage('Möchten Sie die aktuellen Daten wirklich durch die importierten Daten ersetzen? Dies kann nicht rückgängig gemacht werden.');
        setConfirmModalAction(() => () => { // Wrap in an arrow function to delay execution
          // This code runs if the user confirms
          setGroups(importedData.groups);
          setEmployees(importedData.employees);
          setCategories(importedData.categories);
          setSubCategories(importedData.subCategories);
          setMasterSchedule(importedData.masterSchedule);

          // Also update display time states and title from imported schedule
          if (importedData.masterSchedule.displayStartTime) {
            const [h, m] = importedData.masterSchedule.displayStartTime.split(':').map(Number);
            setDisplayStartHour(h);
            setDisplayStartMinute(m);
          }
          if (importedData.masterSchedule.displayEndTime) {
            const [h, m] = importedData.masterSchedule.displayEndTime.split(':').map(Number);
            setDisplayEndHour(h);
            setDisplayEndMinute(m);
          }
          setWeeklyPlanTitle(importedData.masterSchedule.title || 'Wochenplan');

          // Save immediately to localStorage
          localStorage.setItem('groups', JSON.stringify(importedData.groups));
          localStorage.setItem('employees', JSON.stringify(importedData.employees));
          localStorage.setItem('categories', JSON.stringify(importedData.categories));
          localStorage.setItem('subCategories', JSON.stringify(importedData.subCategories));
          localStorage.setItem('masterSchedule', JSON.stringify(importedData.masterSchedule));

          setMessage('Daten erfolgreich importiert!');
          setShowConfirmModal(false); // Close modal
          // Clear the file input value to allow re-importing
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        });
        setShowConfirmModal(true); // Show the modal

      } catch (error) {
        console.error("Fehler beim Importieren der Daten:", error);
        setMessage('Fehler beim Importieren der Daten. Stellen Sie sicher, dass es sich um eine gültige JSON-Datei handelt.');
        // Clear the file input value to allow re-importing
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file); // Read the file as text
  };

  // --- Clear All Data Function ---
  const handleClearAllData = () => {
    setConfirmModalMessage('ACHTUNG: Möchten Sie WIRKLICH alle Daten (Mitarbeiter, Gruppen, Kategorien, Dienstplan) löschen? Dies kann NICHT rückgängig gemacht werden!');
    setConfirmModalAction(() => () => {
      // Reset all states to their initial empty/default values
      setGroups([]);
      setEmployees([]);
      setCategories([]);
      setSubCategories([]);
      setMasterSchedule({ shifts: [], displayStartTime: '06:00', displayEndTime: '20:00', title: 'Wochenplan' });
      setDisplayStartHour(6);
      setDisplayStartMinute(0);
      setDisplayEndHour(20);
      setDisplayEndMinute(0);
      setWeeklyPlanTitle('Wochenplan');

      // Clear all items from localStorage
      localStorage.removeItem('groups');
      localStorage.removeItem('employees');
      localStorage.removeItem('categories');
      localStorage.removeItem('subCategories');
      localStorage.removeItem('masterSchedule');

      setMessage('Alle Daten erfolgreich gelöscht!');
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  };


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


  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">Lade Anwendung und Daten...</div>
      </div>
    );
  }

  // Group and sort employees for rendering
  const sortedEmployees = employees.sort((a, b) => {
    const groupA = groups.find(g => g.id === a.groupId)?.name || 'Ohne Gruppe';
    const groupB = groups.find(g => g.id === b.groupId)?.name || 'Ohne Gruppe';

    if (groupA === 'Ohne Gruppe' && groupB !== 'Ohne Gruppe') return 1;
    if (groupA !== 'Ohne Gruppe' && groupB === 'Ohne Gruppe') return -1;
    if (groupA !== groupB) return groupA.localeCompare(b.name); // Sort by name within group
    return a.name.localeCompare(b.name);
  });

  // Get unique group names in sorted order for rendering group headers
  const uniqueSortedGroupNames = Array.from(new Set(sortedEmployees.map(emp => groups.find(g => g.id === emp.groupId)?.name || 'Ohne Gruppe')))
                                    .sort((a, b) => {
                                      if (a === 'Ohne Gruppe') return 1;
                                      if (b === 'Ohne Gruppe') return -1;
                                      return a.localeCompare(b);
                                    });


  // Helper to get shifts for a specific employee and day from masterSchedule
  const getShiftsForEmployeeAndDay = (employeeId, dayOfWeek) => {
    if (!masterSchedule || !masterSchedule.shifts) return [];
    return masterSchedule.shifts.filter(shift =>
      shift.employeeId === employeeId && shift.dayOfWeek === dayOfWeek
    );
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4 sm:p-6 lg:p-8 font-sans text-gray-800">
      <div className="w-full mx-auto bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-[1920px]">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-gray-800 mb-8">
          Kindergarten Dienstplan
        </h1>

        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
            <span className="block sm:inline">{message}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onClick={() => setMessage('')}>
              <svg className="fill-current h-6 w-6 text-blue-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Schließen</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.103l-2.651 3.746a1.2 1.2 0 0 1-1.697-1.697l3.746-2.651-3.746-2.651a1.2 1.2 0 0 1 1.697-1.697L10 8.897l2.651-3.746a1.2 1.2 0 0 1 1.697 1.697L11.103 10l3.746 2.651a1.2 1.2 0 0 1 0 1.698z"/></svg>
            </span>
          </div>
        )}

        {/* --- Datenverwaltung Section (Renamed) --- */}
        <div className="mb-10 p-6 bg-gray-50 rounded-lg shadow-inner text-center w-full max-w-[1920px] mx-auto">
          <h2 className="text-2xl font-bold text-gray-700 mb-6">Datenverwaltung</h2> {/* Renamed title */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              onClick={handleExportData}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Daten exportieren (JSON)
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportData}
              accept=".json"
              className="hidden" // Hide the default file input
              id="importFile"
            />
            <label
              htmlFor="importFile"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
            >
              Daten importieren (JSON)
            </label>
            <button
              onClick={handleClearAllData} // New button for clearing all data
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Alle Daten löschen
            </button>
          </div>
        </div>

        {/* --- Management Sections Container --- */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          {/* --- Gruppenverwaltung --- */}
          <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full max-w-[1054px] xl:w-[calc(50%-12px)]">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Gruppen verwalten</h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="text"
                value={editingGroupId ? editingGroupName : newGroupName}
                onChange={(e) => editingGroupId ? setEditingGroupName(e.target.value) : setNewGroupName(e.target.value)}
                className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                placeholder="Neuer Gruppenname"
              />
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out"
                >
                  Gruppe hinzufügen
                </button>
              )}
            </div>
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Vorhandene Gruppen</h3>
              {groups.length === 0 ? (
                <p className="text-center text-gray-500">Noch keine Gruppen vorhanden.</p>
              ) : (
                <ul className="space-y-3">
                  {groups.map(group => (
                    <li key={group.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                      <span className="text-gray-900 font-medium">{group.name}</span>
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
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* --- Mitarbeiterverwaltung --- */}
          <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full max-w-[1054px] xl:w-[calc(50%-12px)]">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Mitarbeiter verwalten</h2>
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
                value={newEmployee.contractedHoursPerWeek}
                onChange={handleEmployeeChange}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                placeholder="Wochenstunden (z.B. 39)"
              />
              <select
                name="groupId"
                value={newEmployee.groupId}
                onChange={handleEmployeeChange}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
              >
                <option value="">Gruppe auswählen (optional)</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
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

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">Vorhandene Mitarbeiter</h3>
              {employees.length === 0 ? (
                <p className="text-center text-gray-500">Noch keine Mitarbeiter vorhanden.</p>
              ) : (
                <ul className="space-y-3">
                  {employees.map(employee => (
                    <li key={employee.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                      <span className="text-gray-900 font-medium">{employee.name} ({employee.contractedHoursPerWeek}h/Woche)</span>
                      <span className="text-gray-600 text-sm">
                        {employee.groupId ? `Gruppe: ${groups.find(g => g.id === employee.groupId)?.name || 'Unbekannt'}` : 'Keiner Gruppe zugeordnet'}
                      </span>
                      <div>
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
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* --- Kategorienverwaltung --- */}
          <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full max-w-[1054px] xl:w-[calc(50%-12px)]">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Kategorien verwalten (Basisblöcke)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                name="name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                placeholder="Kategoriename (z.B. Betreuung, Freizeit)"
              />
              <ColorPickerDropdown
                selectedColor={newCategory.color}
                onColorChange={(color) => setNewCategory({ ...newCategory, color: color })}
                colors={availableColors}
                placeholder="Farbe auswählen"
              />
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
          </div>

          {/* --- Unterkategorienverwaltung --- */}
          <div className="p-6 bg-gray-50 rounded-lg shadow-inner w-full max-w-[1054px] xl:w-[calc(50%-12px)]">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Unterkategorien verwalten (Unterblöcke)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                name="name"
                value={newSubCategory.name}
                onChange={(e) => setNewSubCategory({ ...newSubCategory, name: e.target.value })}
                className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition duration-200"
                placeholder="Unterkategoriename (z.B. Wald, Mittagessen)"
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
                colors={availableColors}
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
          </div>
        </div> {/* End of Management Sections Container */}


        {/* --- Master-Wochenplan-Ansicht --- */}
        <div className="mb-10 p-6 bg-gray-50 rounded-lg shadow-inner">
          <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center flex items-center justify-center gap-2">
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
            {isEditingWeeklyPlanTitle ? (
              <>
                <button
                  onClick={handleSaveWeeklyPlanTitle}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-md shadow-sm"
                >
                  Speichern
                </button>
                <button
                  onClick={handleCancelEditWeeklyPlanTitle}
                  className="bg-gray-400 hover:bg-gray-500 text-white text-sm px-3 py-1 rounded-md shadow-sm"
                >
                  Abbrechen
                </button>
              </>
            ) : (
              <button
                onClick={handleEditWeeklyPlanTitle}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-md shadow-sm"
              >
                Bearbeiten
              </button>
            )}
          </h2>

          {/* Display Time Range Configuration */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Anzeigebereich der Zeitleiste</h3>
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
            </div>
          </div>


          {employees.length === 0 ? (
            <p className="text-center text-gray-500">Bitte fügen Sie zuerst Mitarbeiter hinzu, um den Dienstplan zu erstellen.</p>
          ) : (
            <div className="space-y-6">
              {WEEK_DAYS_PLAN.map(day => (
                <div key={day} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <h4 className="font-bold text-xl text-gray-800 mb-4 text-center">{day}</h4>
                  <div className="grid grid-cols-[100px_1fr_200px] gap-x-2 text-sm">
                    {/* Time Axis Header */}
                    <div
                      className="col-start-2 col-end-3 relative pb-2 mb-2"
                    >
                      {Array.from({ length: totalDisplayHours + 1 }, (_, i) => displayStartHour + i).map(hour => (
                          <React.Fragment key={`header-lines-${hour}`}>
                              <div
                                  className="absolute top-0 h-full border-l-2 border-gray-300 z-0"
                                  style={{ left: `${(((hour * 60) - displayStartMinutes) / totalDisplayMinutes) * 100}%` }}
                              ></div>
                              {hour < displayEndHour && (
                                  <>
                                      <div
                                          className="absolute top-0 h-full border-l border-gray-300 opacity-50 z-0"
                                          style={{ left: `${(((hour * 60 + 15) - displayStartMinutes) / totalDisplayMinutes) * 100}%`, width: '1px' }}
                                      ></div>
                                      <div
                                          className="absolute top-0 h-full border-l border-gray-300 opacity-50 z-0"
                                          style={{ left: `${(((hour * 60 + 30) - displayStartMinutes) / totalDisplayMinutes) * 100}%`, width: '1px' }}
                                      ></div>
                                      <div
                                          className="absolute top-0 h-full border-l border-gray-300 opacity-50 z-0"
                                          style={{ left: `${(((hour * 60 + 45) - displayStartMinutes) / totalDisplayMinutes) * 100}%`, width: '1px' }}
                                  ></div>
                                  </>
                              )}
                          </React.Fragment>
                      ))}
                      {Array.from({ length: Math.ceil(totalDisplayHours) + 1 }, (_, i) => displayStartHour + i)
                        .filter(hour => (hour * 60) >= displayStartMinutes && (hour * 60) <= displayEndMinutes)
                        .map(hour => (
                          <span
                            key={hour}
                            className="absolute text-center text-gray-600 -translate-x-1/2"
                            style={{ left: `${(((hour * 60) - displayStartMinutes) / totalDisplayMinutes) * 100}%` }}
                          >
                            {hour}:00
                          </span>
                        ))}
                    </div>
                    <div className="col-start-3 col-end-4 relative pb-2 mb-2"></div>

                    {/* Render employees grouped by group, then alphabetically */}
                    {uniqueSortedGroupNames.map(groupName => (
                        <React.Fragment key={groupName}>
                            {groupName !== 'Ohne Gruppe' && (
                                <div className="col-span-full bg-gray-100 text-gray-700 font-semibold py-1 px-2 rounded-md mb-2 mt-4">
                                    Gruppe: {groupName}
                                </div>
                            )}
                            {sortedEmployees
                                .filter(emp => (groups.find(g => g.id === emp.groupId)?.name || 'Ohne Gruppe') === groupName)
                                .map(employee => {
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

                                    return (
                                        <React.Fragment key={employee.id}>
                                            <div className="py-2 pr-2 text-right font-medium text-gray-700 flex items-center justify-end">
                                                <span>{employee.name}</span>
                                            </div>

                                            <div
                                                ref={el => timelineRefs.current[`${employee.id}-${day}`] = el}
                                                className="relative h-10 border border-gray-300 rounded-md bg-gray-100 mb-2 timeline-row-container"
                                                onClick={(e) => {
                                                    if (!isDragging) {
                                                        handleTimelineClick(e, employee.id, day);
                                                    }
                                                }}
                                            >
                                                {Array.from({ length: totalDisplayHours + 1 }, (_, i) => displayStartHour + i).map(hour => (
                                                    <React.Fragment key={`employee-lines-${hour}`}>
                                                        <div
                                                            className="absolute top-0 h-full border-l-2 border-gray-300 z-0"
                                                            style={{ left: `${(((hour * 60) - displayStartMinutes) / totalDisplayMinutes) * 100}%` }}
                                                        ></div>
                                                        {hour < displayEndHour && (
                                                            <>
                                                                <div
                                                                    className="absolute top-0 h-full border-l border-gray-300 opacity-50 z-0"
                                                                    style={{ left: `${(((hour * 60 + 15) - displayStartMinutes) / totalDisplayMinutes) * 100}%`, width: '1px' }}
                                                                ></div>
                                                                <div
                                                                    className="absolute top-0 h-full border-l border-gray-300 opacity-50 z-0"
                                                                    style={{ left: `${(((hour * 60 + 30) - displayStartMinutes) / totalDisplayMinutes) * 100}%`, width: '1px' }}
                                                                ></div>
                                                                <div
                                                                    className="absolute top-0 h-full border-l border-gray-300 opacity-50 z-0"
                                                                    style={{ left: `${(((hour * 60 + 45) - displayStartMinutes) / totalDisplayMinutes) * 100}%`, width: '1px' }}
                                                                ></div>
                                                            </>
                                                        )}
                                                    </React.Fragment>
                                                ))}

                                                {visualBreakMarkerTime && (
                                                  <div style={breakMarkerStyle} title={`Späteste Pause: ${visualBreakMarkerTime}`}></div>
                                                )}

                                                {employeeShiftsForDay.length > 0 ? (
                                                    employeeShiftsForDay.map((shift) => (
                                                        shift.segments.map((segment, segIdx) => {
                                                            const { left, width, bgColorClass, textColorClass } = getShiftBlockStyles(segment, displayStartMinutes, totalDisplayMinutes, categories, subCategories);
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
                                                            } else if (currentBlockWidth < 100) {
                                                                categoryTextSizeClass = 'text-xs';
                                                                timeTextSizeClass = 'text-xs';
                                                                showCategory = true;
                                                                showTime = true;
                                                                isTimeVertical = false;
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
                                                                    className={`absolute h-full rounded-md flex flex-col items-center justify-center shadow-sm shift-block ${bgColorClass} ${textColorClass} overflow-hidden`}
                                                                    style={{ left, width, boxSizing: 'border-box', minWidth: '0', cursor: currentShiftBlockCursor }}
                                                                    title={`${blockCategoryName}: ${segment.startTime} - ${segment.endTime}`}
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
                                                    <div className="text-gray-500 text-sm italic flex items-center h-full justify-center">
                                                        Klicken zum Hinzufügen
                                                    </div>
                                                )}
                                            </div>

                                            {/* Summary Column (3) - Dynamic based on categories + fixed Pause */}
                                            <div className="py-2 pl-2 flex flex-wrap items-center gap-2 border-l border-gray-300">
                                                {/* Daily Total Work Hours Block */}
                                                <div className="flex items-center justify-center px-2 py-1 rounded-md bg-blue-500 text-white text-xs font-bold shadow-sm">
                                                    G: {formatMinutesToDecimalHours(totalWorkMinutes)}
                                                </div>
                                                {/* Display Pause first if it has time */}
                                                {categoryTotals[PAUSE_CATEGORY.id] > 0 && (
                                                  <div className={`flex items-center justify-center px-2 py-1 rounded-md ${PAUSE_CATEGORY.color} text-white text-xs shadow-sm`}>
                                                      {PAUSE_CATEGORY.name.charAt(0)}: {formatMinutesToDecimalHours(categoryTotals[PAUSE_CATEGORY.id])}
                                                  </div>
                                                )}
                                                {/* Display other dynamic categories */}
                                                {categoriesWithTime
                                                  .filter(cat => cat.id !== PAUSE_CATEGORY.id)
                                                  .map(cat => (
                                                    <div key={cat.id} className={`flex items-center justify-center px-2 py-1 rounded-md ${cat.color} text-white text-xs shadow-sm`}>
                                                        {cat.name.charAt(0)}: {formatMinutesToDecimalHours(categoryTotals[cat.id])}
                                                    </div>
                                                ))}

                                                {warnings.length > 0 && (
                                                    <div className="ml-2 flex flex-col items-start space-y-0.5">
                                                        <span key="warnings" className="text-red-600 text-xs font-semibold bg-red-100 px-2 py-0.5 rounded-full">
                                                            {warnings.join(', ')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                        </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* --- Weekly Summary Section --- */}
        <div className="mb-10 p-6 bg-gray-50 rounded-lg shadow-inner">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 text-center">Wochenübersicht Mitarbeiter</h2>
            {employees.length === 0 ? (
                <p className="text-center text-gray-500">Bitte fügen Sie Mitarbeiter hinzu, um die Wochenübersicht zu sehen.</p>
            ) : (
                <div className="space-y-4">
                    {sortedEmployees.map(employee => {
                        const summary = weeklySummaries[employee.id];
                        if (!summary) return null;

                        const weeklyCategoriesWithTime = Object.keys(summary.weeklyCategoryTotals)
                            .map(catId => {
                                if (catId === PAUSE_CATEGORY.id) return PAUSE_CATEGORY;
                                return categories.find(cat => cat.id === catId);
                            })
                            .filter(Boolean)
                            .sort((a, b) => a.name.localeCompare(b.name));


                        return (
                            <div key={employee.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                                <h3 className="font-bold text-lg text-gray-800 mb-2">{summary.employeeName}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                    <div className="flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-500 text-white font-bold shadow-sm">
                                        Gesamt: {formatMinutesToDecimalHours(summary.weeklyTotalWorkMinutes)} / {summary.contractedHours}h
                                    </div>
                                    {summary.weeklyCategoryTotals[PAUSE_CATEGORY.id] > 0 && (
                                      <div className={`flex items-center justify-center px-3 py-1.5 rounded-md ${PAUSE_CATEGORY.color} text-white shadow-sm`}>
                                          {PAUSE_CATEGORY.name}: {formatMinutesToDecimalHours(summary.weeklyCategoryTotals[PAUSE_CATEGORY.id])}
                                      </div>
                                    )}
                                    {weeklyCategoriesWithTime
                                      .filter(cat => cat.id !== PAUSE_CATEGORY.id)
                                      .map(cat => (
                                        <div key={cat.id} className={`flex items-center justify-center px-3 py-1.5 rounded-md ${cat.color} text-white shadow-sm`}>
                                            {cat.name}: {formatMinutesToDecimalHours(summary.weeklyCategoryTotals[cat.id])}
                                        </div>
                                    ))}
                                </div>
                                {summary.weeklyWarnings.length > 0 && (
                                    <div className="mt-3 flex flex-col items-start space-y-1">
                                        {summary.weeklyWarnings.map((warning, idx) => (
                                            <span key={idx} className="text-red-600 text-xs font-semibold bg-red-100 px-2 py-0.5 rounded-full">
                                                {warning}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>


        {/* Add Shift Type Menu (for clicking on empty space) */}
        {showAddShiftMenu && (
          <div
            className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50"
            style={{ left: addShiftMenuPos.x, top: addShiftMenuPos.y }}
            onMouseLeave={() => setShowAddShiftMenu(false)}
          >
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Kategorie wählen:</h4>
            <button
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                  onClick={() => handleAddSegmentFromMenu(PAUSE_CATEGORY.id)}
                >
                  {PAUSE_CATEGORY.name}
            </button>
            {subCategories.filter(subCat => subCat.parentCategoryId === PAUSE_CATEGORY.id).map(subCat => (
                <button
                  key={subCat.id}
                  className="block w-full text-left pl-6 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded-md"
                  onClick={() => handleAddSegmentFromMenu(PAUSE_CATEGORY.id, subCat.id)}
                >
                  - {subCat.name}
                </button>
            ))}

            {categories.map(category => (
              <React.Fragment key={category.id}>
                <button
                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-100 rounded-md"
                  onClick={() => handleAddSegmentFromMenu(category.id)}
                >
                  {category.name}
                </button>
                {subCategories.filter(subCat => subCat.parentCategoryId === category.id).map(subCat => (
                  <button
                    key={subCat.id}
                    className="block w-full text-left pl-6 px-3 py-1 text-xs text-gray-600 hover:bg-blue-50 rounded-md"
                    onClick={() => handleAddSegmentFromMenu(category.id, subCat.id)}
                  >
                    - {subCat.name}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Shift Options Menu (for clicking on existing shift block) */}
        {showShiftOptionsMenu && shiftOptionsContext && (
          <div
            className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50"
            style={{ left: shiftOptionsMenuPos.x, top: shiftOptionsMenuPos.y }}
            onMouseLeave={() => setShowShiftOptionsMenu(false)}
          >
            <button
              className="block w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-100 rounded-md"
              onClick={handleDeleteShift}
            >
              Löschen
            </button>
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
      </div>
    </div>
  );
}

export default App;
