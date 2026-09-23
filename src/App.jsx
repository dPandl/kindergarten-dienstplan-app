import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { v4 as uuidv4 } from 'uuid'; // Import for generating unique IDs
import { MessageSquare, AlertCircle, HelpCircle, Sun, Moon } from 'lucide-react';
import FeedbackModal from './components/FeedbackModal';


// Constants & Utilities
import {
  WEEK_DAYS_PLAN,
  MIN_BREAK_AFTER_6_HOURS,
  MIN_BREAK_AFTER_9_HOURS,
  MAX_DAILY_WORK_MINUTES,
  PAUSE_CATEGORY,
  DEFAULT_CATEGORIES,
  EMPLOYEE_TYPE_ORDER,
  groupColors,
  blockColors,
} from './constants/scheduleConstants';

import {
  openDb,
  getFileHandleFromDb,
  putFileHandleInDb,
  removeFileHandleFromDb,
  deleteFileHandleFromDb,
} from './utils/db';

import {
  compareVersions,
  timeToMinutes,
  minutesToTime,
  isValidTime,
  isTimeInRanges,
  mergeTimeRanges,
  formatMinutesToDecimalHours,
} from './utils/timeUtils';

import {
  getStrongGroupColor,
  getTailwindColorValue,
  getShiftBlockStyles,
} from './utils/colorUtils';

import {
  checkGroupStaffingWarnings,
  calculateDailyWorkMetrics,
} from './utils/laborLaw';
// Components
import ColorPickerDropdown from './components/common/ColorPickerDropdown';
import ConfirmModal from './components/modals/ConfirmModal';
import PrintOptionsModal from './components/modals/PrintOptionsModal';
import ScheduleManagementModal from './components/modals/ScheduleManagementModal';
import HelpModal, { RELEASE_NOTES } from './components/modals/HelpModal';
import SettingsModal from './components/modals/SettingsModal';
import SilkBackground from './components/backgrounds/SilkBackground';
import FloatingLinesBackground from './components/backgrounds/FloatingLinesBackground';
import SideRaysBackground from './components/backgrounds/SideRaysBackground';
import ColorBendsBackground from './components/backgrounds/ColorBendsBackground';
import GrainientBackground from './components/backgrounds/GrainientBackground';
import BeamsBackground from './components/backgrounds/BeamsBackground';
import PrismaticBurstBackground from './components/backgrounds/PrismaticBurstBackground';
import IridescenceBackground from './components/backgrounds/IridescenceBackground';
import LiquidChromeBackground from './components/backgrounds/LiquidChromeBackground';
import BalatroBackground from './components/backgrounds/BalatroBackground';
import {
  DEFAULT_CUSTOM_COLORS_LIGHT,
  DEFAULT_CUSTOM_COLORS_DARK,
  getBackgroundActiveColors,
  resolveBackgroundProps,
} from './config/backgroundPresets';
import NewVersionPopup from './components/modals/NewVersionPopup';
import OpeningHoursEditor from './components/management/OpeningHoursEditor';
import GroupManagement from './components/management/GroupManagement';
import GroupFormModalContent from './components/management/GroupFormModalContent';
import GroupListModalContent from './components/management/GroupListModalContent';
import EmployeeManagement from './components/management/EmployeeManagement';
import EmployeeFormModalContent from './components/management/EmployeeFormModalContent';
import EmployeeListModalContent from './components/management/EmployeeListModalContent';
import EmployeeWishesModal from './components/management/EmployeeWishesModal';
import DisposalRuleFormModalContent from './components/management/DisposalRuleFormModalContent';
import DisposalRuleListModalContent from './components/management/DisposalRuleListModalContent';
import CategoryFormModalContent from './components/management/CategoryFormModalContent';
import SubCategoryFormModalContent from './components/management/SubCategoryFormModalContent';
import CategoryListModalContent from './components/management/CategoryListModalContent';
import ShiftMenus from './components/schedule/ShiftMenus';
import WeeklySummary from './components/schedule/WeeklySummary';
import ScheduleLegend from './components/schedule/ScheduleLegend';
import SickLeaveModal from './components/modals/SickLeaveModal';
import BaseModal from './components/common/BaseModal';
import RibbonMenu from './components/common/RibbonMenu';
import { Users, UserPlus, Layers, FolderPlus, Tag, BookmarkPlus, Clock, CheckCircle2, Info, X, Thermometer } from 'lucide-react';

const DEFAULT_SCHEDULE_ID = 'default';

const extractSchedulesFromImportedData = (importedData) => {
  let loadedSchedules = [];
  let loadedActiveId = importedData.activeScheduleId;
  const nowIso = new Date().toISOString();

  if (Array.isArray(importedData.schedules) && importedData.schedules.length > 0) {
    loadedSchedules = importedData.schedules.map((s, idx) => ({
      id: s.id || `plan-${Date.now()}-${idx}`,
      title: s.title || `Wochenplan ${idx + 1}`,
      displayStartTime: s.displayStartTime || '06:00',
      displayEndTime: s.displayEndTime || '18:00',
      shifts: Array.isArray(s.shifts) ? s.shifts : [],
      sickDays: (typeof s.sickDays === 'object' && s.sickDays !== null) ? s.sickDays : {},
      createdAt: s.createdAt || nowIso,
      updatedAt: s.updatedAt || s.createdAt || nowIso,
    }));
    if (!loadedActiveId || !loadedSchedules.some(s => s.id === loadedActiveId)) {
      loadedActiveId = loadedSchedules[0].id;
    }
  } else if (importedData.masterSchedule) {
    const legacySchedule = {
      id: DEFAULT_SCHEDULE_ID,
      title: importedData.masterSchedule.title || 'Wochenplan',
      displayStartTime: importedData.masterSchedule.displayStartTime || '06:00',
      displayEndTime: importedData.masterSchedule.displayEndTime || '18:00',
      shifts: Array.isArray(importedData.masterSchedule.shifts) ? importedData.masterSchedule.shifts : [],
      sickDays: (typeof importedData.masterSchedule.sickDays === 'object' && importedData.masterSchedule.sickDays !== null) ? importedData.masterSchedule.sickDays : {},
      createdAt: importedData.masterSchedule.createdAt || nowIso,
      updatedAt: importedData.masterSchedule.updatedAt || importedData.masterSchedule.createdAt || nowIso,
    };
    loadedSchedules = [legacySchedule];
    loadedActiveId = DEFAULT_SCHEDULE_ID;
  } else {
    loadedSchedules = [
      {
        id: DEFAULT_SCHEDULE_ID,
        title: 'Wochenplan',
        displayStartTime: '06:00',
        displayEndTime: '18:00',
        shifts: [],
        sickDays: {},
        createdAt: nowIso,
        updatedAt: nowIso,
      }
    ];
    loadedActiveId = DEFAULT_SCHEDULE_ID;
  }

  const activePlan = loadedSchedules.find(s => s.id === loadedActiveId) || loadedSchedules[0];
  return { loadedSchedules, loadedActiveId: activePlan.id, activePlan };
};

const FEEDBACK_DEFAULT_DRAFT = {
  category: 'feedback',
  bugStep: 0,
  message: '',
  title: '',
  stepsArray: ['', '', ''],
  expected: '',
  actual: '',
};

function App() {
  // Define the current version of the application
  // IMPORTANT: Update this version string whenever you release a new version
  // for which you want to show the "What's New" popup.
  // Use a semantic versioning scheme (major.minor.patch) for easy comparison.
  const CURRENT_APP_VERSION = "Beta 2.0.0"; // Updated version string

  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
      return 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('theme', theme);
    } catch (e) {
      console.error('Fehler beim Speichern des Themes:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Stellt sicher, dass beim Drucken (auch über Tastenkombinationen wie Strg+P) immer der helle Modus verwendet wird
  useEffect(() => {
    let wasDarkBeforePrint = false;

    const handleBeforePrint = () => {
      if (document.documentElement.classList.contains('dark')) {
        wasDarkBeforePrint = true;
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    };

    const handleAfterPrint = () => {
      if (wasDarkBeforePrint) {
        wasDarkBeforePrint = false;
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // --- Background Style & Theme Color States ---
  const [backgroundStyle, setBackgroundStyle] = useState(() => {
    try {
      const urlParam = new URLSearchParams(window.location.search).get('previewBg');
      if (urlParam) return urlParam;
      return localStorage.getItem('app_background_style') || 'animated-gradient';
    } catch {
      return 'animated-gradient';
    }
  });

  const [activeBgPreset, setActiveBgPreset] = useState(() => {
    try {
      return localStorage.getItem('app_bg_preset') || '1';
    } catch {
      return '1';
    }
  });

  const [customColorsLight, setCustomColorsLight] = useState(() => {
    try {
      const saved = localStorage.getItem('app_bg_custom_colors_light');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOM_COLORS_LIGHT;
    } catch {
      return DEFAULT_CUSTOM_COLORS_LIGHT;
    }
  });

  const [customColorsDark, setCustomColorsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('app_bg_custom_colors_dark');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOM_COLORS_DARK;
    } catch {
      return DEFAULT_CUSTOM_COLORS_DARK;
    }
  });

  // --- Global Background Animation Speed ---
  const [globalBgSpeed, setGlobalBgSpeed] = useState(() => {
    try {
      const saved = localStorage.getItem('app_bg_speed');
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const isDarkTheme = theme === 'dark';

  const activeBgRawColors = useMemo(() => {
    return getBackgroundActiveColors(
      backgroundStyle,
      activeBgPreset,
      isDarkTheme ? customColorsDark : customColorsLight,
      isDarkTheme
    );
  }, [backgroundStyle, activeBgPreset, isDarkTheme, customColorsDark, customColorsLight]);

  const activeBgProps = useMemo(() => {
    return resolveBackgroundProps(backgroundStyle, activeBgRawColors);
  }, [backgroundStyle, activeBgRawColors]);

  const lightGradColors = useMemo(() => {
    return getBackgroundActiveColors('animated-gradient', activeBgPreset, customColorsLight, false);
  }, [activeBgPreset, customColorsLight]);

  const darkGradColors = useMemo(() => {
    return getBackgroundActiveColors('animated-gradient', activeBgPreset, customColorsDark, true);
  }, [activeBgPreset, customColorsDark]);

  // Synchronisiere Verlaufsfarben mit CSS-Variablen auf dem root-Element
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-grad-1', lightGradColors[0] || '#fbcfe8');
    root.style.setProperty('--bg-grad-2', lightGradColors[1] || '#e9d5ff');
    root.style.setProperty('--bg-grad-3', lightGradColors[2] || '#bfdbfe');

    root.style.setProperty('--bg-grad-dark-1', darkGradColors[0] || '#0f172a');
    root.style.setProperty('--bg-grad-dark-2', darkGradColors[1] || '#1e1b4b');
    root.style.setProperty('--bg-grad-dark-3', darkGradColors[2] || '#111827');

    const duration = Math.max(2, Math.round(15 / (globalBgSpeed || 1)));
    root.style.setProperty('--gradient-duration', `${duration}s`);

    try {
      if (!new URLSearchParams(window.location.search).has('previewBg') && !new URLSearchParams(window.location.search).has('autoCapture')) {
        localStorage.setItem('app_bg_speed', String(globalBgSpeed));
        localStorage.setItem('app_background_style', backgroundStyle);
      }
      localStorage.setItem('app_bg_preset', String(activeBgPreset));
      localStorage.setItem('app_bg_custom_colors_light', JSON.stringify(customColorsLight));
      localStorage.setItem('app_bg_custom_colors_dark', JSON.stringify(customColorsDark));
    } catch (e) {
      console.error('Fehler beim Speichern der Hintergrundeinstellungen:', e);
    }
  }, [
    backgroundStyle,
    activeBgPreset,
    customColorsLight,
    customColorsDark,
    globalBgSpeed,
    lightGradColors,
    darkGradColors,
  ]);

  const _handleResetGradientColors = () => {
    setActiveBgPreset('1');
    setCustomColorsLight([...DEFAULT_CUSTOM_COLORS_LIGHT]);
    setCustomColorsDark([...DEFAULT_CUSTOM_COLORS_DARK]);
    setGlobalBgSpeed(1.0);
    setBackgroundStyle('animated-gradient');
  };

  const [message, setMessage] = useState(''); // Dein bestehender message state
  const [messageType, setMessageType] = useState(''); // Dein bestehender messageType state (für Farben)
  const [showMessageVisible, setShowMessageVisible] = useState(false); // NEU: Steuert die Opazität für den Fade-Effekt

  // State zur Leistungsoptimierung beim Drucken:
  // Schaltet während der Druckvorschau schwere WebGL-Shader und Canvas-Renderings ab, um Ruckeln zu verhindern.
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Refs, um die IDs der Timer zu speichern, damit wir sie bei Bedarf löschen können
  const messageTimeoutRef = useRef(null); // Für den Haupt-Timer, der den Fade-Out startet
  const fadeOutTimeoutRef = useRef(null); // Für den Timer, der den Inhalt nach dem Fade-Out leert
  const MESSAGE_DISPLAY_DURATION = 4000; // Beispiel: 4 Sekunden

useEffect(() => {
    // 1. Alle bestehenden Timer löschen, um Konflikte bei schnellen Meldungswechseln zu vermeiden.
    //    Dies ist wichtig, damit nur ein Timer pro Meldung aktiv ist.
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null; // Ref zurücksetzen
    }
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null; // Ref zurücksetzen
    }

    // Nur fortfahren, wenn eine Meldung angezeigt werden soll
    if (message) {
      // Verwende requestAnimationFrame, um sicherzustellen, dass der Browser das Element
      // mit seiner initialen Opazität (opacity-0) gerendert hat,
      // BEVOR wir setShowMessageVisible(true) setzen.
      // Dies triggert die CSS-Transition korrekt.
      let animationFrameId; // Variable, um die ID des requestAnimationFrame zu speichern
      animationFrameId = requestAnimationFrame(() => {
        setShowMessageVisible(true); // Jetzt die Opazität auf 100% setzen (startet den Fade-In)
      });

      // 2. Setze den Haupt-Timer, der die Meldung nach MESSAGE_DISPLAY_DURATION ausblendet.
      messageTimeoutRef.current = setTimeout(() => {
        setShowMessageVisible(false); // Opazität auf 0% setzen (startet den Fade-Out)

        // 3. Setze einen zweiten Timer, der den Meldungsinhalt erst nach Abschluss
        //    der Fade-Out-Transition leert (muss zur CSS-Dauer passen).
        fadeOutTimeoutRef.current = setTimeout(() => {
          setMessage(''); // Leert den Meldungstext
          setMessageType(''); // Leert den Meldungstyp
        }, 300); // Wichtig: Diese Dauer muss zur 'duration-300' in den CSS-Klassen passen

      }, MESSAGE_DISPLAY_DURATION); // Die Dauer, für die die Meldung sichtbar ist

      // Cleanup-Funktion für diesen spezifischen Effekt-Durchlauf.
      // Diese Funktion wird ausgeführt, wenn die Komponente unmounted ODER
      // wenn sich 'message', 'messageType' oder 'MESSAGE_DISPLAY_DURATION' ändern
      // und diesen useEffect erneut auslösen.
      return () => {
        cancelAnimationFrame(animationFrameId); // Den requestAnimationFrame abbrechen, falls er noch läuft
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
          messageTimeoutRef.current = null;
        }
        if (fadeOutTimeoutRef.current) {
          clearTimeout(fadeOutTimeoutRef.current);
          fadeOutTimeoutRef.current = null;
        };
      };
    }

    // Wenn 'message' leer ist (z.B. am Anfang oder nach dem Ausblenden),
    // stellen wir sicher, dass die Meldung auch visuell unsichtbar ist.
    // Hier ist kein zusätzlicher return-Block nötig, da der obere return-Block
    // die Cleanup-Logik für alle Fälle abdeckt.
  }, [message, messageType, MESSAGE_DISPLAY_DURATION]); // Abhängigkeiten: Effekt wird bei Änderungen neu ausgeführt

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

    // NEU: State für die Sichtbarkeit des Hilfe-Modals
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState(FEEDBACK_DEFAULT_DRAFT);
  const handleFeedbackClick = () => setShowFeedbackModal(true);




  // NEU: States für getrennte Management-Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEmployeeOverviewModal, setShowEmployeeOverviewModal] = useState(false);
  const [showEmployeeWishesModal, setShowEmployeeWishesModal] = useState(false);
  const [selectedEmployeeForWishes, setSelectedEmployeeForWishes] = useState(null);
  const [isEditingFromOverview, setIsEditingFromOverview] = useState(false);
  
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showGroupOverviewModal, setShowGroupOverviewModal] = useState(false);
  const [isEditingGroupFromOverview, setIsEditingGroupFromOverview] = useState(false);

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSubCategoryModal, setShowAddSubCategoryModal] = useState(false);
  const [showCategoryOverviewModal, setShowCategoryOverviewModal] = useState(false);
  const [isEditingCategoryFromOverview, setIsEditingCategoryFromOverview] = useState(false);
  const [isEditingSubCategoryFromOverview, setIsEditingSubCategoryFromOverview] = useState(false);

  const [showAddDisposalRuleModal, setShowAddDisposalRuleModal] = useState(false);
  const [showDisposalRuleOverviewModal, setShowDisposalRuleOverviewModal] = useState(false);
  const [isEditingDisposalRuleFromOverview, setIsEditingDisposalRuleFromOverview] = useState(false);

  // Initial group state for new groups - now empty by default
  const initialOpeningHoursTemplate = {};
  const initialDaysWithOpeningHoursTemplate = {};
  WEEK_DAYS_PLAN.forEach(day => {
    initialOpeningHoursTemplate[day] = []; // No default times
    initialDaysWithOpeningHoursTemplate[day] = false; // All days disabled by default
  });

    // Randzeiten intitialisieren
    const initialEdgeTimesTemplate = WEEK_DAYS_PLAN.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {});

  // Group States
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState({
    name: '',
    color: groupColors[0] || 'bg-blue-100',
    openingHours: initialOpeningHoursTemplate,
    daysWithOpeningHours: initialDaysWithOpeningHoursTemplate,
    minStaffRequired: undefined, // Default to undefined
    disableStaffingWarning: true, // Default to true (checkbox unchecked)
    edgeTimes: initialEdgeTimesTemplate,
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
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES); // Default: Betreuung (orange), Verfügungszeit (grün)
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
  const [schedules, setSchedules] = useState(() => {
    const nowIso = new Date().toISOString();
    return [
      { id: DEFAULT_SCHEDULE_ID, title: 'Wochenplan', displayStartTime: '06:00', displayEndTime: '18:00', shifts: [], sickDays: {}, createdAt: nowIso, updatedAt: nowIso }
    ];
  });
  const [activeScheduleId, setActiveScheduleId] = useState(DEFAULT_SCHEDULE_ID);
  const [masterSchedule, setMasterSchedule] = useState(() => {
    const nowIso = new Date().toISOString();
    return { shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: 'Wochenplan', sickDays: {}, createdAt: nowIso, updatedAt: nowIso };
  }); // Changed to 18:00
  const [showSickLeaveModal, setShowSickLeaveModal] = useState(false);

  // Display Time Range States (new)
  const [displayStartHour, setDisplayStartHour] = useState(6);
  const [displayStartMinute, setDisplayStartMinute] = useState(0);
  const [displayEndHour, setDisplayEndHour] = useState(18); // Changed to 18
  const [displayEndMinute, setDisplayEndMinute] = useState(0);

  // Customizable Weekly Plan Title States
  const [weeklyPlanTitle, setWeeklyPlanTitle] = useState('Wochenplan');

  // Immer aktueller Stand aller Pläne inklusive Live-State des aktiven Plans
  const liveSchedules = useMemo(() => {
    const existingActive = schedules.find(s => s.id === activeScheduleId);
    const nowIso = new Date().toISOString();
    const currentActive = {
      ...masterSchedule,
      id: activeScheduleId,
      title: weeklyPlanTitle,
      displayStartTime: `${String(displayStartHour).padStart(2, '0')}:${String(displayStartMinute).padStart(2, '0')}`,
      displayEndTime: `${String(displayEndHour).padStart(2, '0')}:${String(displayEndMinute).padStart(2, '0')}`,
      sickDays: masterSchedule?.sickDays || {},
      createdAt: masterSchedule?.createdAt || existingActive?.createdAt || nowIso,
      updatedAt: masterSchedule?.updatedAt || existingActive?.updatedAt || nowIso,
    };
    if (!schedules.some(s => s.id === activeScheduleId)) {
      return [...schedules, currentActive];
    }
    return schedules.map(s => s.id === activeScheduleId ? currentActive : s);
  }, [schedules, activeScheduleId, masterSchedule, weeklyPlanTitle, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute]);

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

  // Toggle to completely hide absent (sick or school day) employees from the plan
  const [hideAbsentEmployees, setHideAbsentEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('hideAbsentEmployees');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hideAbsentEmployees', JSON.stringify(hideAbsentEmployees));
    } catch {
      // ignore
    }
  }, [hideAbsentEmployees]);

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

  // --- Confirm Modal States ---
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState(null); // Function to call on confirm

  // --- Print Options States (unabhängig von der Live-Ansicht) ---
  const [showPrintOptionsModal, setShowPrintOptionsModal] = useState(false);
  const [printWeeklySummary, setPrintWeeklySummary] = useState(true); // Default to print weekly summary
  const [printGroupFilter, setPrintGroupFilter] = useState('all');
  const [printEmployeeFilter, setPrintEmployeeFilter] = useState('all');

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

  // Mitarbeiter für den Druck-Filter (abhängig von printGroupFilter)
  const availableEmployeesForPrintFilter = useMemo(() => {
    let employeesToFilter = employees;
    if (printGroupFilter !== 'all') {
      employeesToFilter = employees.filter(employee =>
        (printGroupFilter === 'no-group' && !employee.groupId) ||
        (employee.groupId === printGroupFilter)
      );
    }
    return [...employeesToFilter].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, printGroupFilter]);

  // Gruppen für den Druck-Filter (abhängig von printEmployeeFilter)
  const filteredGroupsForDisplayInPrintFilter = useMemo(() => {
    let groupsToShow = [{ id: 'all', name: 'Alle Gruppen' }];
    if (printEmployeeFilter !== 'all') {
      const selectedEmployee = employees.find(emp => emp.id === printEmployeeFilter);
      if (selectedEmployee) {
        if (selectedEmployee.groupId) {
          const employeeGroup = groups.find(g => g.id === selectedEmployee.groupId);
          if (employeeGroup) {
            groupsToShow.push(employeeGroup);
          }
        } else {
          groupsToShow.push({ id: 'no-group', name: 'Ohne Gruppe' });
        }
      }
    } else {
      groups.forEach(group => groupsToShow.push(group));
      if (hasEmployeesWithoutGroup) {
        groupsToShow.push({ id: 'no-group', name: 'Ohne Gruppe' });
      }
    }
    const sortedUserGroups = groupsToShow.filter(g => g.id !== 'all' && g.id !== 'no-group').sort((a, b) => a.name.localeCompare(b.name));
    const ohneGruppeOption = groupsToShow.find(g => g.id === 'no-group');

    return [
      groupsToShow.find(g => g.id === 'all'),
      ...sortedUserGroups,
      ...(ohneGruppeOption ? [ohneGruppeOption] : [])
    ].filter(Boolean);
  }, [employees, groups, printEmployeeFilter, hasEmployeesWithoutGroup]);


  // Ref for the main container to calculate relative positions
  const mainContainerRef = useRef(null);
  const [isRibbonCollapsed, setIsRibbonCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ribbon_collapsed') === 'true';
    } catch {
      return false;
    }
  });


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

  // Dynamische Breitenberechnung für die Mitarbeiterspalte im Wochenplan (Screen & Print):
  // Orientiert sich am längsten Namen der aktuell gefilterten/angezeigten Mitarbeiter.
  // Bei kurzen Namen wie "Anna" (4 Zeichen) ist die Spalte schlank und platzsparend (~3.5rem Screen / 10mm Print).
  // Bei längeren Namen (z.B. "Kathrin Schmidt") wächst sie automatisch mit, sodass nichts abgeschnitten wird.
  // Da alle Wochentage denselben berechneten Wert nutzen, sind die Zeitachsen an allen Tagen 100% bündig ausgerichtet.
  const maxEmployeeNameLength = useMemo(() => {
    if (!filteredEmployeesForDisplay || filteredEmployeesForDisplay.length === 0) return 4;
    return Math.max(4, ...filteredEmployeesForDisplay.map(emp => (emp.name || '').trim().length));
  }, [filteredEmployeesForDisplay]);

  const employeeColWidthScreen = useMemo(() => {
    const calculatedRem = maxEmployeeNameLength * 0.36 + 1.5;
    return `${Math.min(12, Math.max(3.5, Number(calculatedRem.toFixed(2))))}rem`;
  }, [maxEmployeeNameLength]);

  const employeeColWidthPrint = useMemo(() => {
    // 5pt Schriftgröße im Druck: ca. 0.8mm pro Zeichen + 2.8mm Padding/Puffer
    // Ergibt für "Kathrin Tuleweit" (16 Z.) ca. 15.6mm statt 23mm (kein riesiger Freiraum mehr links!)
    const calculatedMm = Number((maxEmployeeNameLength * 0.8 + 2.8).toFixed(1));
    return `${Math.min(32, Math.max(8.5, calculatedMm))}mm`;
  }, [maxEmployeeNameLength]);



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


          Object.entries(categoryTotals).forEach(([catKey, mins]) => {
            if (catKey === 'PAUSE') return; // falls Pausen nicht als Block anzeigen
            weeklyCategoryTotals[catKey] = (weeklyCategoryTotals[catKey] || 0) + mins;
          });

          if (
            (employee.type === 'normal' || employee.type === 'zusatzkraft') ||
            (employee.presenceDays || []).includes(day)
          ) {
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
                    weeklyWarnings.push(`Anwesenheitstage: -${formatMinutesToDecimalHours(Math.abs(presenceDayDiscrepancy))}`);
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
          subCategories,
          masterSchedule.sickDays || {}
        );
        if (warnings.length > 0 || staffingWarningRanges.length > 0) {
          warningsByGroupAndDay[group.id][day] = { textWarnings: warnings, visualWarningRanges: staffingWarningRanges };
        }
      });
    });
    return warningsByGroupAndDay;
  }, [groups, employees, masterSchedule.shifts, masterSchedule.sickDays, categories, subCategories, uniqueSortedGroups, selectedGroupIdFilter, showStaffingWarningsGlobally]); // Hinzugefügt: showStaffingWarningsGlobally, masterSchedule.sickDays

  // Initiales Laden der Daten und Versionsprüfung
  useEffect(() => {

    // Versionsprüfung (unabhängig vom Datenladen)
    const lastShownAppVersion = localStorage.getItem('lastShownAppVersion');
    if (!lastShownAppVersion || compareVersions(CURRENT_APP_VERSION, lastShownAppVersion) > 0) {
      setShowNewVersionPopup(true);
    }

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
                ((importedData.masterSchedule && Array.isArray(importedData.masterSchedule.shifts)) ||
                 (Array.isArray(importedData.schedules) && importedData.schedules.length > 0))
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
                setOrderedGroupIds(importedData.orderedGroupIds || importedData.groups.map(g => g.id));

                const { loadedSchedules, loadedActiveId, activePlan } = extractSchedulesFromImportedData(importedData);
                setSchedules(loadedSchedules);
                setActiveScheduleId(loadedActiveId);
                setMasterSchedule(activePlan);
                setWeeklyPlanTitle(activePlan.title || 'Wochenplan');

                // Dynamic adjustment of display time range based on imported shifts
                let minOverallMinutes = 24 * 60;
                let maxOverallMinutes = 0;
                let hasShifts = false;

                (activePlan.shifts || []).forEach(shift => {
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
                  const [sH, sM] = (activePlan.displayStartTime || '06:00').split(':').map(Number);
                  const [eH, eM] = (activePlan.displayEndTime || '18:00').split(':').map(Number);
                  setDisplayStartHour(isNaN(sH) ? 6 : sH);
                  setDisplayStartMinute(isNaN(sM) ? 0 : sM);
                  setDisplayEndHour(isNaN(eH) ? 18 : eH);
                  setDisplayEndMinute(isNaN(eM) ? 0 : eM);
                }
                setFileHandle(storedHandle); // Setze das geladene Handle
                setMessage('Daten aus letzter Datei erfolgreich geladen!');
                setMessageType('success');
                loadedSuccessfully = true;
                console.log("Daten erfolgreich aus gespeicherter Datei geladen.");
              } else {
                console.warn("Gespeicherte Datei hat ungültiges Format oder ist leer.");
                setMessage('Die zuletzt importierte Datei ist ungültig oder leer. Bitte importiere eine neue Datei.');
                setMessageType('error');
                await deleteFileHandleFromDb(); // Ungültiges Handle entfernen
                setFileHandle(null);
              }
            } catch (readError) {
              console.error("Fehler beim Lesen der zuletzt verwendeten Datei:", readError);
              setMessage('Fehler beim Lesen der zuletzt verwendeten Datei. Bitte importiere eine neue Datei.');
              setMessageType('error');
              await deleteFileHandleFromDb(); // Handle entfernen, da es nicht lesbar war
              setFileHandle(null);
            }
          } else if (permissionStatus === 'prompt') {
            setMessage('Berechtigung für die zuletzt verwendete Datei erforderlich. Bitte importiere die Datei manuell.');
          } else if (permissionStatus === 'denied') {
            setMessage('Berechtigung für die zuletzt verwendete Datei verweigert. Bitte importiere die Datei manuell.');
            setMessageType('error');
            await deleteFileHandleFromDb(); // Handle entfernen, da Berechtigung verweigert
            setFileHandle(null);
          }
        }

        // Wenn keine Datei geladen wurde (entweder keine gespeichert oder Fehler), starten wir mit leeren Standarddaten
        if (!loadedSuccessfully) {
          console.log("Keine Datei automatisch geladen. Setze Standarddaten.");
          setGroups([]);
          setEmployees([]);
          setCategories(DEFAULT_CATEGORIES);
          setSubCategories([]);
          setDisposalTimeRules([]);
          setSchedules([{ id: DEFAULT_SCHEDULE_ID, title: 'Wochenplan', displayStartTime: '06:00', displayEndTime: '18:00', shifts: [], sickDays: {} }]);
          setActiveScheduleId(DEFAULT_SCHEDULE_ID);
          setMasterSchedule({ shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: 'Wochenplan', sickDays: {} });
          setOrderedGroupIds([]);
          setSelectedGroupIdFilter('all');
          setDisplayStartHour(6);
          setDisplayStartMinute(0);
          setDisplayEndHour(18);
          setDisplayEndMinute(0);
          setWeeklyPlanTitle('Wochenplan');
          setMessage('Keine vorherigen Daten gefunden. Starte mit einem leeren Plan oder importiere eine Datei.');
        }

        // Versionsprüfung (unabhängig vom Datenladen)
        const lastShownAppVersion = localStorage.getItem('lastShownAppVersion');
        if (!lastShownAppVersion || compareVersions(CURRENT_APP_VERSION, lastShownAppVersion) > 0) {
          setShowNewVersionPopup(true);
        }

      } catch (error) {
        console.error("Allgemeiner Fehler beim Initialisieren der App:", error);
        setMessage("Ein Fehler ist beim Starten der App aufgetreten.");
        setMessageType('error');
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
      setMessageType('error');
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
      edgeTimes: initialEdgeTimesTemplate,
    });
    setMessage('Gruppe erfolgreich hinzugefügt!');
    setMessageType('success');
    setShowAddGroupModal(false);
    setIsEditingGroupFromOverview(false);
  };

  const handleDeleteGroup = (id) => {
    // Prevent deletion if group is assigned to any employee
    const isGroupUsed = employees.some(emp => emp.groupId === id);
    if (isGroupUsed) {
      setMessage('Gruppe kann nicht gelöscht werden, da ihr noch Mitarbeiter zugeordnet sind.');
      setMessageType('error');
      return;
    }

    const groupToDelete = groups.find(g => g.id === id);
    const groupName = groupToDelete ? groupToDelete.name : 'diese Gruppe';

    setConfirmModalMessage(`Möchtest du die Gruppe "${groupName}" wirklich löschen?`);
    setConfirmModalAction(() => () => {
      setGroups(prev => prev.filter(group => group.id !== id));
      setOrderedGroupIds(prev => prev.filter(groupId => groupId !== id));
      setMessage('Gruppe erfolgreich gelöscht!');
      setMessageType('success');
    });
    setShowConfirmModal(true);
  };

  const handleEditGroupClick = (group) => {
    setEditingGroupId(group.id);
    const initialEditedOpeningHours = {};
    const initialEditedDaysWithOpeningHours = {};
    WEEK_DAYS_PLAN.forEach(day => {
      initialEditedOpeningHours[day] = group.openingHours?.[day] || [];
      initialEditedDaysWithOpeningHours[day] = group.daysWithOpeningHours?.[day] ?? false;
    });
    setEditingGroup({
      ...group,
      openingHours: initialEditedOpeningHours,
      daysWithOpeningHours: initialEditedDaysWithOpeningHours,
      minStaffRequired: group.minStaffRequired ?? undefined,
      disableStaffingWarning: group.disableStaffingWarning ?? true,
      edgeTimes: group.edgeTimes ?? initialEdgeTimesTemplate,
    });
    setIsGroupOpeningHoursMinimized(false);
    setIsEditingGroupFromOverview(true);
    setShowAddGroupModal(true);
  };

  const handleUpdateGroup = () => {
    if (!editingGroup.name.trim()) {
      setMessage('Gruppenname darf nicht leer sein.');
      setMessageType('error');
      return;
    }
    setGroups(prev => prev.map(group =>
      group.id === editingGroupId ? { ...editingGroup } : group
    ));
    setMessage('Gruppe erfolgreich aktualisiert!');
    setMessageType('success');
    setEditingGroupId(null);
    setEditingGroup(null);
    setIsGroupOpeningHoursMinimized(true);
    setShowAddGroupModal(false);
    setIsEditingGroupFromOverview(false);
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setEditingGroup(null);
    setNewGroup({
      name: '',
      color: groupColors[0] || 'bg-blue-100',
      openingHours: initialOpeningHoursTemplate,
      daysWithOpeningHours: initialDaysWithOpeningHoursTemplate,
      minStaffRequired: undefined,
      disableStaffingWarning: true,
      edgeTimes: initialEdgeTimesTemplate,
    });
    setIsGroupOpeningHoursMinimized(true);
    setShowAddGroupModal(false);
    setIsEditingGroupFromOverview(false);
  };

  const handleOpenAddGroupModal = (fromOverview = false) => {
    setEditingGroupId(null);
    setEditingGroup(null);
    setNewGroup({
      name: '',
      color: groupColors[0] || 'bg-blue-100',
      openingHours: initialOpeningHoursTemplate,
      daysWithOpeningHours: initialDaysWithOpeningHoursTemplate,
      minStaffRequired: undefined,
      disableStaffingWarning: true,
      edgeTimes: initialEdgeTimesTemplate,
    });
    setIsEditingGroupFromOverview(fromOverview);
    if (!fromOverview) {
      setShowGroupOverviewModal(false);
    }
    setShowAddGroupModal(true);
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
      setMessageType('error');
      return;
    }
    if (overriddenDisposalHoursNum !== null && overriddenDisposalHoursNum < 0) {
      setMessage('Überschriebene Verfügungszeit darf nicht negativ sein.');
      setMessageType('error');
      return;
    }
    // Validate presence days for special types (excluding 'normal' and 'zusatzkraft')
    if (newEmployee.type !== 'normal' && newEmployee.type !== 'zusatzkraft' && (newEmployee.presenceDays || []).length === 0) {
      setMessage('Für Auszubildende, FSJler und Praktikanten müssen Anwesenheitstage ausgewählt werden.');
      setMessageType('error');
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
      setMessageType('success');
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
      setMessageType('success');
    }
    setNewEmployee({ name: '', contractedHoursPerWeek: 0, groupId: '', overriddenDisposalHours: '', type: 'normal', presenceDays: [...WEEK_DAYS_PLAN] });
    setEditingEmployeeId(null);
    setIsEditingFromOverview(false);
    setShowAddEmployeeModal(false); // Formular schließen, Übersicht ist direkt darunter sichtbar
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
    setIsEditingFromOverview(true); // Merken, dass wir aus der Übersicht kommen
    // WICHTIG: Übersicht NICHT schließen, sondern im Hintergrund lassen!
    setShowAddEmployeeModal(true); // Formular-Modal darüber öffnen
  };

  const handleDeleteEmployee = (id) => {
    // Prevent deletion if employee has any shifts assigned
    const hasShifts = masterSchedule.shifts.some(shift => shift.employeeId === id);
    if (hasShifts) {
      setMessage('Mitarbeiter kann nicht gelöscht werden, da ihm noch Schichten zugeordnet sind.');
      setMessageType('error');
      return;
    }

    const employeeToDelete = employees.find(emp => emp.id === id);
    const employeeName = employeeToDelete ? employeeToDelete.name : 'diesen Mitarbeiter';

    setConfirmModalMessage(`Möchtest du "${employeeName}" wirklich löschen?`);
    setConfirmModalAction(() => () => {
      setEmployees(prev => prev.filter(employee => employee.id !== id));
      setMessage('Mitarbeiter erfolgreich gelöscht!');
      setMessageType('success');
    });
    setShowConfirmModal(true);
  };

  const handleCancelEditEmployee = () => {
    setNewEmployee({ name: '', contractedHoursPerWeek: 0, groupId: '', overriddenDisposalHours: '', type: 'normal', presenceDays: [...WEEK_DAYS_PLAN] });
    setEditingEmployeeId(null);
    setIsEditingFromOverview(false);
    setShowAddEmployeeModal(false); // Formular schließen, Übersicht bleibt darunter erhalten
  };

  const handleOpenAddEmployeeModal = (fromOverview = false) => {
    setNewEmployee({ name: '', contractedHoursPerWeek: 0, groupId: '', overriddenDisposalHours: '', type: 'normal', presenceDays: [...WEEK_DAYS_PLAN] });
    setEditingEmployeeId(null);
    setIsEditingFromOverview(fromOverview);
    // Wenn fromOverview true ist, lassen wir die Übersicht im Hintergrund geöffnet!
    if (!fromOverview) {
      setShowEmployeeOverviewModal(false);
    }
    setShowAddEmployeeModal(true);
  };

  const handleOpenEmployeeWishes = (employee) => {
    setSelectedEmployeeForWishes(employee);
    setShowEmployeeWishesModal(true);
  };

  const handleSaveEmployeeWishes = (employeeId, updatedWishes) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return {
          ...emp,
          wishes: updatedWishes,
        };
      }
      return emp;
    }));
    if (editingEmployeeId === employeeId) {
      setNewEmployee(prev => ({ ...prev, wishes: updatedWishes }));
    }
    setMessage('Mitarbeiterwünsche erfolgreich gespeichert!');
    setMessageType('success');
    setShowEmployeeWishesModal(false);
    setSelectedEmployeeForWishes(null);
  };

  // --- Category (Schichtblöcke) Management ---
  const handleAddCategory = () => {
    if (!newCategory.name.trim()) {
      setMessage('Name des Schichtblocks darf nicht leer sein.');
      setMessageType('error');
      return;
    }
    // Prevent creating a category with the same name as the fixed PAUSE_CATEGORY
    if (newCategory.name.trim().toLowerCase() === PAUSE_CATEGORY.name.toLowerCase()) {
      setMessage(`Der Name "${PAUSE_CATEGORY.name}" ist für die System-Pause reserviert.`);
      setMessageType('error');
      return;
    }
    // Prevent adding a new disposal time category if one already exists
    if (newCategory.isDisposalTimeCategory && disposalTimeCategory) {
        setMessage('Es kann nur ein Schichtblock für die Verfügungszeitberechnung markiert werden.');
        setMessageType('error');
        return;
    }
    // Prevent adding a new care category if one already exists
    if (newCategory.isCareCategory && careCategory) {
        setMessage('Es kann nur ein Schichtblock als Betreuungskategorie markiert werden.');
        setMessageType('error');
        return;
    }

    const categoryToAdd = { ...newCategory, id: uuidv4() };
    setCategories(prev => [...prev, categoryToAdd]);
    setNewCategory({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false });
    setMessage('Schichtblock erfolgreich hinzugefügt!');
    setMessageType('success');
    setShowAddCategoryModal(false);
    setIsEditingCategoryFromOverview(false);
  };

  const handleEditCategoryClick = (category) => {
    setEditingCategoryId(category.id);
    setNewCategory({
      ...category,
      isDisposalTimeCategory: category.isDisposalTimeCategory ?? false,
      isCareCategory: category.isCareCategory ?? false
    });
    setIsEditingCategoryFromOverview(true);
    setShowAddCategoryModal(true);
  };

  const handleUpdateCategory = () => {
    if (!newCategory.name.trim()) {
      setMessage('Name des Schichtblocks darf nicht leer sein.');
      setMessageType('error');
      return;
    }
    if (newCategory.name.trim().toLowerCase() === PAUSE_CATEGORY.name.toLowerCase()) {
      setMessage(`Der Name "${PAUSE_CATEGORY.name}" ist für die System-Pause reserviert.`);
      setMessageType('error');
      return;
    }
    if (newCategory.isDisposalTimeCategory && disposalTimeCategory && disposalTimeCategory.id !== editingCategoryId) {
        setMessage('Es kann nur ein Schichtblock für die Verfügungszeitberechnung markiert werden.');
        setMessageType('error');
        return;
    }
    if (newCategory.isCareCategory && careCategory && careCategory.id !== editingCategoryId) {
        setMessage('Es kann nur ein Schichtblock als Betreuungskategorie markiert werden.');
        setMessageType('error');
        return;
    }

    setCategories(prev => prev.map(category =>
      category.id === editingCategoryId ? { ...newCategory } : category
    ));
    setMessage('Schichtblock erfolgreich aktualisiert!');
    setMessageType('success');
    setEditingCategoryId(null);
    setNewCategory({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false });
    setShowAddCategoryModal(false);
    setIsEditingCategoryFromOverview(false);
  };

  const handleDeleteCategory = (id) => {
    // Prevent deletion if category is used in any shift segment or as parent for subcategory
    const isCategoryUsedInShifts = masterSchedule.shifts.some(shift =>
      shift.segments.some(segment => segment.categoryId === id)
    );
    const isCategoryUsedAsParent = subCategories.some(subCat => subCat.parentCategoryId === id);

    if (isCategoryUsedInShifts) {
      setMessage('Schichtblock kann nicht gelöscht werden, da er in Schichten verwendet wird.');
      setMessageType('error');
      return;
    }
    if (isCategoryUsedAsParent) {
      setMessage('Schichtblock kann nicht gelöscht werden, da ihm noch Unterblöcke zugeordnet sind.');
      setMessageType('error');
      return;
    }

    const catToDelete = categories.find(c => c.id === id);
    const catName = catToDelete ? catToDelete.name : 'diesen Schichtblock';

    setConfirmModalMessage(`Möchtest du den Schichtblock "${catName}" wirklich löschen?`);
    setConfirmModalAction(() => () => {
      setCategories(prev => prev.filter(category => category.id !== id));
      setMessage('Schichtblock erfolgreich gelöscht!');
      setMessageType('success');
    });
    setShowConfirmModal(true);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setNewCategory({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false });
    setShowAddCategoryModal(false);
    setIsEditingCategoryFromOverview(false);
  };

  const handleOpenAddCategoryModal = (fromOverview = false) => {
    setEditingCategoryId(null);
    setNewCategory({ name: '', color: blockColors[0] || 'bg-blue-500', isDisposalTimeCategory: false, isCareCategory: false });
    setIsEditingCategoryFromOverview(fromOverview);
    if (!fromOverview) {
      setShowCategoryOverviewModal(false);
    }
    setShowAddCategoryModal(true);
  };

  // --- SubCategory (Unterblöcke) Management ---
  const handleAddSubCategory = () => {
    if (!newSubCategory.name.trim() || !newSubCategory.parentCategoryId) {
      setMessage('Name des Unterblocks und übergeordneter Schichtblock sind erforderlich.');
      setMessageType('error');
      return;
    }
    const subCategoryToAdd = { ...newSubCategory, id: uuidv4() };
    setSubCategories(prev => [...prev, subCategoryToAdd]);
    setNewSubCategory({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' });
    setMessage('Unterblock erfolgreich hinzugefügt!');
    setMessageType('success');
    setShowAddSubCategoryModal(false);
    setIsEditingSubCategoryFromOverview(false);
  };

  const handleEditSubCategoryClick = (subCategory) => {
    setEditingSubCategoryId(subCategory.id);
    setNewSubCategory(subCategory);
    setIsEditingSubCategoryFromOverview(true);
    setShowAddSubCategoryModal(true);
  };

  const handleUpdateSubCategory = () => {
    if (!newSubCategory.name.trim() || !newSubCategory.parentCategoryId) {
      setMessage('Name des Unterblocks und übergeordneter Schichtblock sind erforderlich.');
      setMessageType('error');
      return;
    }
    setSubCategories(prev => prev.map(subCategory =>
      subCategory.id === editingSubCategoryId ? { ...newSubCategory } : subCategory
    ));
    setMessage('Unterblock erfolgreich aktualisiert!');
    setMessageType('success');
    setEditingSubCategoryId(null);
    setNewSubCategory({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' });
    setShowAddSubCategoryModal(false);
    setIsEditingSubCategoryFromOverview(false);
  };

  const handleDeleteSubCategory = (id) => {
    const isSubCategoryUsedInShifts = masterSchedule.shifts.some(shift =>
      shift.segments.some(segment => segment.subCategoryId === id)
    );
    if (isSubCategoryUsedInShifts) {
      setMessage('Unterblock kann nicht gelöscht werden, da er in Schichten verwendet wird.');
      setMessageType('error');
      return;
    }

    const subToDelete = subCategories.find(s => s.id === id);
    const subName = subToDelete ? subToDelete.name : 'diesen Unterblock';

    setConfirmModalMessage(`Möchtest du den Unterblock "${subName}" wirklich löschen?`);
    setConfirmModalAction(() => () => {
      setSubCategories(prev => prev.filter(subCategory => subCategory.id !== id));
      setMessage('Unterblock erfolgreich gelöscht!');
      setMessageType('success');
    });
    setShowConfirmModal(true);
  };

  const handleCancelEditSubCategory = () => {
    setEditingSubCategoryId(null);
    setNewSubCategory({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' });
    setShowAddSubCategoryModal(false);
    setIsEditingSubCategoryFromOverview(false);
  };

  const handleOpenAddSubCategoryModal = (fromOverview = false) => {
    setEditingSubCategoryId(null);
    setNewSubCategory({ name: '', parentCategoryId: '', color: blockColors[0] || 'bg-gray-500' });
    setIsEditingSubCategoryFromOverview(fromOverview);
    if (!fromOverview) {
      setShowCategoryOverviewModal(false);
    }
    setShowAddSubCategoryModal(true);
  };

  // Funktion zum Öffnen des Modals
  const openHelpModal = useCallback(() => {
    setShowHelpModal(true); // Modal-Komponente in den DOM einfügen
  }, []);

  // Funktion zum Schließen des Modals (wird vom HelpModal nach der Animation aufgerufen)
  const closeHelpModal = useCallback(() => {
    setShowHelpModal(false); // Modal-Komponente aus dem DOM entfernen
  }, []);

  // --- Disposal Time Rules Management ---
  const handleAddDisposalRule = () => {
    // Convert state values to numbers, treating empty string as 0
    const contractedHoursNum = Number(newDisposalRule.contractedHours);
    const disposalHoursNum = Number(newDisposalRule.disposalHours);

    if (contractedHoursNum <= 0 || disposalHoursNum < 0) {
      setMessage('Vertragsstunden müssen positiv sein, Verfügungszeit darf nicht negativ sein.');
      setMessageType('error');
      return;
    }
    if (disposalTimeRules.some(rule => Number(rule.contractedHours) === contractedHoursNum)) {
      setMessage('Eine Regel für diese Vertragsstundenzahl existiert bereits.');
      setMessageType('error');
      return;
    }
    const ruleToAdd = { ...newDisposalRule, id: uuidv4(), contractedHours: contractedHoursNum, disposalHours: disposalHoursNum };
    setDisposalTimeRules(prev => [...prev, ruleToAdd]);
    setNewDisposalRule({ contractedHours: '', disposalHours: '' }); // Reset to empty strings
    setMessage('Verfügungszeit-Regel erfolgreich hinzugefügt!');
    setMessageType('success');
    setShowAddDisposalRuleModal(false);
    setIsEditingDisposalRuleFromOverview(false);
  };

  const handleEditDisposalRule = (rule) => {
    // When editing, set the state with the actual numbers (will display as numbers)
    setNewDisposalRule({
      ...rule,
      contractedHours: rule.contractedHours, // Keep as number from rule, input will convert to string
      disposalHours: rule.disposalHours
    });
    setEditingDisposalRuleId(rule.id);
    setIsEditingDisposalRuleFromOverview(true);
    setShowAddDisposalRuleModal(true);
  };

  const handleUpdateDisposalRule = () => {
    // Convert state values to numbers, treating empty string as 0
    const contractedHoursNum = Number(newDisposalRule.contractedHours);
    const disposalHoursNum = Number(newDisposalRule.disposalHours);

    if (contractedHoursNum <= 0 || disposalHoursNum < 0) {
      setMessage('Vertragsstunden müssen positiv sein, Verfügungszeit darf nicht negativ sein.');
      setMessageType('error');
      return;
    }
    if (disposalTimeRules.some(rule => rule.id !== editingDisposalRuleId && Number(rule.contractedHours) === contractedHoursNum)) {
      setMessage('Eine Regel für diese Vertragsstundenzahl existiert bereits.');
      setMessageType('error');
      return;
    }
    setDisposalTimeRules(prev => prev.map(rule =>
      rule.id === editingDisposalRuleId ? { ...newDisposalRule, contractedHours: contractedHoursNum, disposalHours: disposalHoursNum } : rule
    ));
    setMessage('Verfügungszeit-Regel erfolgreich aktualisiert!');
    setMessageType('success');
    setEditingDisposalRuleId(null);
    setNewDisposalRule({ contractedHours: '', disposalHours: '' }); // Reset to empty strings
    setShowAddDisposalRuleModal(false);
    setIsEditingDisposalRuleFromOverview(false);
  };

  const handleDeleteDisposalRule = (id) => {
    const ruleToDelete = disposalTimeRules.find(r => r.id === id);
    const ruleDesc = ruleToDelete ? `${ruleToDelete.contractedHours}h Soll / ${ruleToDelete.disposalHours}h Verfügungszeit` : 'diese Regel';

    setConfirmModalMessage(`Möchtest du die Regel "${ruleDesc}" wirklich löschen?`);
    setConfirmModalAction(() => () => {
      setDisposalTimeRules(prev => prev.filter(rule => rule.id !== id));
      setMessage('Verfügungszeit-Regel erfolgreich gelöscht!');
      setMessageType('success');
    });
    setShowConfirmModal(true);
  };

  const handleCancelEditDisposalRule = () => {
    setEditingDisposalRuleId(null);
    setNewDisposalRule({ contractedHours: '', disposalHours: '' }); // Reset to empty strings
    setShowAddDisposalRuleModal(false);
    setIsEditingDisposalRuleFromOverview(false);
  };

  const handleOpenAddDisposalRuleModal = (fromOverview = false) => {
    setEditingDisposalRuleId(null);
    setNewDisposalRule({ contractedHours: '', disposalHours: '' });
    setIsEditingDisposalRuleFromOverview(fromOverview);
    if (!fromOverview) {
      setShowDisposalRuleOverviewModal(false);
    }
    setShowAddDisposalRuleModal(true);
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
      setMessage('Bitte zuerst Kategorien erstellen, um Schichten erstellen zu können.');
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
            setMessageType('error');
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
    setMessageType('success');
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
    if (e.button !== 0) return; // Nur linke Maustaste für Drag & Drop (Verschieben/Größe ändern)
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

    if (deltaX >= clickThreshold) {
        // This was a drag, persist changes
        setMessage("Schicht erfolgreich aktualisiert!");
        setMessageType('success');
    }
    // Einfacher Klick öffnet nicht mehr das Menü (dies geschieht per Rechtsklick)

    setIsDragging(false);
    setDraggedShiftInfo(null);
    dragStartMouseX.current = 0;
  }, [isDragging, draggedShiftInfo]);

  // Kontextmenü für Schichtblöcke (Rechtsklick)
  const handleShiftBlockContextMenu = useCallback((e, shift, segmentIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (!mainContainerRef.current) return;

    const mainContainerRect = mainContainerRef.current.getBoundingClientRect();
    const menuXRelativeToContainerRight = mainContainerRect.right - e.pageX;
    const menuYRelativeToContainer = e.pageY - mainContainerRect.top;

    setShiftOptionsContext({ shift, segmentIndex });
    setShiftOptionsMenuPos({ x: menuXRelativeToContainerRight, y: menuYRelativeToContainer });
    setShowShiftOptionsMenu(true);
    setShowChangeShiftMenu(false);
    setShowChangeGroupMenu(false);
    setShowAddShiftMenu(false);
  }, [mainContainerRef]); // Add mainContainerRef to dependencies

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
      setMessageType('success');
    } else {
      // If multiple segments, delete only the specific segment
      const updatedShift = { ...shift };
      updatedShift.segments = updatedShift.segments.filter((_, idx) => idx !== segmentIndex);
      updatedShifts = masterSchedule.shifts.map(s => s.id === updatedShift.id ? updatedShift : s);
      setMessage("Segment erfolgreich gelöscht!");
      setMessageType('success');
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
    setMessageType('success');
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
      setMessageType('success');
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

  // --- Handlers for Multi-Schedules (Wechseln, Erstellen, Duplizieren, Löschen, Umbenennen, Sortieren) ---
  const handleSwitchSchedule = useCallback((targetId) => {
    if (targetId === activeScheduleId) return;

    // 1. Zuerst den aktuellen Plan mit seinen Live-Werten in schedules sichern
    const nowIso = new Date().toISOString();
    const currentActive = {
      ...masterSchedule,
      id: activeScheduleId,
      title: weeklyPlanTitle,
      displayStartTime: `${String(displayStartHour).padStart(2, '0')}:${String(displayStartMinute).padStart(2, '0')}`,
      displayEndTime: `${String(displayEndHour).padStart(2, '0')}:${String(displayEndMinute).padStart(2, '0')}`,
      sickDays: masterSchedule?.sickDays || {},
      createdAt: masterSchedule?.createdAt || schedules.find(s => s.id === activeScheduleId)?.createdAt || nowIso,
      updatedAt: masterSchedule?.updatedAt || nowIso,
    };
    const updatedSchedules = schedules.some(s => s.id === activeScheduleId)
      ? schedules.map(s => s.id === activeScheduleId ? currentActive : s)
      : [...schedules, currentActive];

    const targetPlan = updatedSchedules.find(s => s.id === targetId);
    if (!targetPlan) return;

    setSchedules(updatedSchedules);
    setActiveScheduleId(targetId);

    const newMasterSchedule = {
      shifts: targetPlan.shifts || [],
      displayStartTime: targetPlan.displayStartTime || '06:00',
      displayEndTime: targetPlan.displayEndTime || '18:00',
      title: targetPlan.title || 'Wochenplan',
      sickDays: targetPlan.sickDays || {},
      createdAt: targetPlan.createdAt || nowIso,
      updatedAt: targetPlan.updatedAt || nowIso,
    };
    setMasterSchedule(newMasterSchedule);
    setWeeklyPlanTitle(targetPlan.title || 'Wochenplan');

    const [sH, sM] = (targetPlan.displayStartTime || '06:00').split(':').map(Number);
    const [eH, eM] = (targetPlan.displayEndTime || '18:00').split(':').map(Number);
    setDisplayStartHour(isNaN(sH) ? 6 : sH);
    setDisplayStartMinute(isNaN(sM) ? 0 : sM);
    setDisplayEndHour(isNaN(eH) ? 18 : eH);
    setDisplayEndMinute(isNaN(eM) ? 0 : eM);

    setMessage(`Wochenplan gewechselt zu "${targetPlan.title || 'Wochenplan'}".`);
    setMessageType('info');
  }, [activeScheduleId, schedules, masterSchedule, weeklyPlanTitle, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, setMessage]);

  const handleCreateNewSchedule = useCallback((customTitle) => {
    const newTitle = customTitle?.trim() || `Wochenplan ${schedules.length + 1}`;
    const newPlanId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const currentActive = {
      ...masterSchedule,
      id: activeScheduleId,
      title: weeklyPlanTitle,
      displayStartTime: `${String(displayStartHour).padStart(2, '0')}:${String(displayStartMinute).padStart(2, '0')}`,
      displayEndTime: `${String(displayEndHour).padStart(2, '0')}:${String(displayEndMinute).padStart(2, '0')}`,
      sickDays: masterSchedule?.sickDays || {},
      createdAt: masterSchedule?.createdAt || schedules.find(s => s.id === activeScheduleId)?.createdAt || nowIso,
      updatedAt: masterSchedule?.updatedAt || nowIso,
    };
    const updatedSchedules = schedules.some(s => s.id === activeScheduleId)
      ? schedules.map(s => s.id === activeScheduleId ? currentActive : s)
      : [...schedules, currentActive];

    const newPlan = {
      id: newPlanId,
      title: newTitle,
      displayStartTime: '06:00',
      displayEndTime: '18:00',
      shifts: [],
      sickDays: {},
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setSchedules([...updatedSchedules, newPlan]);
    setActiveScheduleId(newPlanId);
    setMasterSchedule(newPlan);
    setWeeklyPlanTitle(newTitle);
    setDisplayStartHour(6);
    setDisplayStartMinute(0);
    setDisplayEndHour(18);
    setDisplayEndMinute(0);

    setMessage(`Neuer Wochenplan "${newTitle}" wurde erstellt.`);
    setMessageType('success');
  }, [schedules, activeScheduleId, masterSchedule, weeklyPlanTitle, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, setMessage]);

  const handleDuplicateSchedule = useCallback((sourceId = activeScheduleId, customTitle) => {
    const nowIso = new Date().toISOString();
    const currentActive = {
      ...masterSchedule,
      id: activeScheduleId,
      title: weeklyPlanTitle,
      displayStartTime: `${String(displayStartHour).padStart(2, '0')}:${String(displayStartMinute).padStart(2, '0')}`,
      displayEndTime: `${String(displayEndHour).padStart(2, '0')}:${String(displayEndMinute).padStart(2, '0')}`,
      sickDays: masterSchedule?.sickDays || {},
      createdAt: masterSchedule?.createdAt || schedules.find(s => s.id === activeScheduleId)?.createdAt || nowIso,
      updatedAt: masterSchedule?.updatedAt || nowIso,
    };
    const updatedSchedules = schedules.some(s => s.id === activeScheduleId)
      ? schedules.map(s => s.id === activeScheduleId ? currentActive : s)
      : [...schedules, currentActive];

    const sourcePlan = updatedSchedules.find(s => s.id === sourceId);
    if (!sourcePlan) return;

    const newPlanId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTitle = customTitle?.trim() || `${sourcePlan.title || 'Wochenplan'} (Kopie)`;

    const newPlan = {
      id: newPlanId,
      title: newTitle,
      displayStartTime: sourcePlan.displayStartTime || '06:00',
      displayEndTime: sourcePlan.displayEndTime || '18:00',
      shifts: JSON.parse(JSON.stringify(sourcePlan.shifts || [])),
      sickDays: JSON.parse(JSON.stringify(sourcePlan.sickDays || {})),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setSchedules([...updatedSchedules, newPlan]);
    setActiveScheduleId(newPlanId);
    setMasterSchedule(newPlan);
    setWeeklyPlanTitle(newTitle);

    const [sH, sM] = (newPlan.displayStartTime || '06:00').split(':').map(Number);
    const [eH, eM] = (newPlan.displayEndTime || '18:00').split(':').map(Number);
    setDisplayStartHour(isNaN(sH) ? 6 : sH);
    setDisplayStartMinute(isNaN(sM) ? 0 : sM);
    setDisplayEndHour(isNaN(eH) ? 18 : eH);
    setDisplayEndMinute(isNaN(eM) ? 0 : eM);

    setMessage(`Wochenplan "${sourcePlan.title}" dupliziert und aktiviert.`);
    setMessageType('success');
  }, [schedules, activeScheduleId, masterSchedule, weeklyPlanTitle, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, setMessage]);

  const handleDeleteSchedule = useCallback((targetId = activeScheduleId) => {
    if (schedules.length <= 1) {
      setMessage('Der letzte Wochenplan kann nicht gelöscht werden.');
      setMessageType('error');
      return;
    }
    const planToDelete = schedules.find(s => s.id === targetId);
    const title = planToDelete ? planToDelete.title : 'Wochenplan';

    setConfirmModalMessage(`Möchtest du den Wochenplan "${title}" wirklich löschen? Diese Aktion lässt sich nicht rückgängig machen.`);
    setConfirmModalAction(() => () => {
      const remaining = schedules.filter(s => s.id !== targetId);
      setSchedules(remaining);

      if (targetId === activeScheduleId) {
        const nextPlan = remaining[0];
        setActiveScheduleId(nextPlan.id);
        setMasterSchedule({
          shifts: nextPlan.shifts || [],
          displayStartTime: nextPlan.displayStartTime || '06:00',
          displayEndTime: nextPlan.displayEndTime || '18:00',
          title: nextPlan.title || 'Wochenplan',
          sickDays: nextPlan.sickDays || {},
          createdAt: nextPlan.createdAt || new Date().toISOString(),
          updatedAt: nextPlan.updatedAt || new Date().toISOString(),
        });
        setWeeklyPlanTitle(nextPlan.title || 'Wochenplan');
        const [sH, sM] = (nextPlan.displayStartTime || '06:00').split(':').map(Number);
        const [eH, eM] = (nextPlan.displayEndTime || '18:00').split(':').map(Number);
        setDisplayStartHour(isNaN(sH) ? 6 : sH);
        setDisplayStartMinute(isNaN(sM) ? 0 : sM);
        setDisplayEndHour(isNaN(eH) ? 18 : eH);
        setDisplayEndMinute(isNaN(eM) ? 0 : eM);
      }

      setMessage(`Wochenplan "${title}" wurde gelöscht.`);
      setMessageType('success');
      setShowConfirmModal(false);
    });
    setShowConfirmModal(true);
  }, [schedules, activeScheduleId, setMessage]);

  const handleRenameSchedule = useCallback((targetId, newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    const trimmed = newTitle.trim();
    const nowIso = new Date().toISOString();
    setSchedules(prev => prev.map(s => s.id === targetId ? { ...s, title: trimmed, updatedAt: nowIso } : s));
    if (targetId === activeScheduleId) {
      setWeeklyPlanTitle(trimmed);
      setMasterSchedule(prev => ({ ...prev, title: trimmed, updatedAt: nowIso }));
    }
    setMessage('Wochenplan umbenannt.');
    setMessageType('success');
  }, [activeScheduleId, setMessage]);

  const handleReorderSchedules = useCallback((newSchedules) => {
    setSchedules(newSchedules);
  }, []);

  // --- Handlers for Sick Leave (Krankmeldungen) ---
  const handleToggleSickDay = useCallback((employeeId, day) => {
    setMasterSchedule(prev => {
      const currentSickDays = prev.sickDays?.[employeeId] || [];
      const isSick = currentSickDays.includes(day);
      const updatedForEmp = isSick
        ? currentSickDays.filter(d => d !== day)
        : [...currentSickDays, day];

      const updatedSickDays = {
        ...(prev.sickDays || {}),
        [employeeId]: updatedForEmp
      };

      const updatedSchedule = {
        ...prev,
        sickDays: updatedSickDays
      };

      localStorage.setItem('masterSchedule', JSON.stringify(updatedSchedule));
      return updatedSchedule;
    });
  }, []);

  const handleSetEmployeeSickDays = useCallback((employeeId, daysArray) => {
    setMasterSchedule(prev => {
      const updatedSickDays = {
        ...(prev.sickDays || {}),
        [employeeId]: daysArray
      };
      const updatedSchedule = {
        ...prev,
        sickDays: updatedSickDays
      };
      localStorage.setItem('masterSchedule', JSON.stringify(updatedSchedule));
      return updatedSchedule;
    });
  }, []);

  const handleClearAllSickDays = useCallback(() => {
    setMasterSchedule(prev => {
      const updatedSchedule = {
        ...prev,
        sickDays: {}
      };
      localStorage.setItem('masterSchedule', JSON.stringify(updatedSchedule));
      return updatedSchedule;
    });
  }, []);

// Funktion zum Speichern von Daten in einer Datei
  // NEU: 'showSuccessMessage' Parameter hinzugefügt, Standard ist true
  const handleSaveFile = useCallback(async (currentHandle = fileHandle, showSuccessMessage = true) => {
    console.log("handleSaveFile aufgerufen. Aktuelles Handle:", !!currentHandle);
    if (!currentHandle) {
      // Wenn kein Handle vorhanden ist, fragen Sie nach einem neuen Speicherort (Save As)
      // Dies sollte bei Auto-Save nicht passieren, da wir nur speichern, wenn ein Handle existiert.
      if (showSuccessMessage) { // Nur anzeigen, wenn nicht Auto-Save
        setMessage('Keine Datei zum Speichern ausgewählt. Bitte speichere die Datei manuell.');
        setMessageType('error');
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
          setMessageType('error');
          console.log("Schreibberechtigung verweigert.");
          return;
        }
      } else if (permissionStatus === 'denied') {
        setMessage('Schreibberechtigung für die Datei ist verweigert. Bitte wähle eine neue Datei.');
        setMessageType('error');
        setFileHandle(null);
        await deleteFileHandleFromDb(); // Handle aus IndexedDB entfernen
        console.log("Schreibberechtigung verweigert, Handle aus DB gelöscht.");
        return;
      }

      // Aktuellen Plan snapshotten mit Live-Werten
      const currentActive = {
        ...masterSchedule,
        id: activeScheduleId,
        title: weeklyPlanTitle,
        displayStartTime: `${String(displayStartHour).padStart(2, '0')}:${String(displayStartMinute).padStart(2, '0')}`,
        displayEndTime: `${String(displayEndHour).padStart(2, '0')}:${String(displayEndMinute).padStart(2, '0')}`,
        sickDays: masterSchedule?.sickDays || {},
      };
      const updatedSchedules = schedules.some(s => s.id === activeScheduleId)
        ? schedules.map(s => s.id === activeScheduleId ? currentActive : s)
        : [...schedules, currentActive];

      const dataToSave = {
        groups: groups,
        employees: employees,
        categories: categories,
        subCategories: subCategories,
        disposalTimeRules: disposalTimeRules,
        orderedGroupIds: orderedGroupIds,
        activeScheduleId: activeScheduleId,
        schedules: updatedSchedules,
        masterSchedule: currentActive, // Abwärtskompatibilität!
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
        setMessageType('success');
      }
      setFileHandle(currentHandle); // Stellen Sie sicher, dass das Handle gesetzt ist
    } catch (error) {
      console.error("Fehler beim Speichern der Datei:", error);
      setMessage(`Fehler beim Speichern der Datei: ${error.message}`);
      setMessageType('error');
    }
  }, [groups, employees, categories, subCategories, disposalTimeRules, masterSchedule, orderedGroupIds, fileHandle, schedules, activeScheduleId, weeklyPlanTitle, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, setMessage]); // setMessage als Abhängigkeit hinzugefügt


  // Funktion zum Speichern von Daten unter einem neuen Dateinamen (Export)
  const handleSaveFileAs = useCallback(async () => {
    if (!window.showSaveFilePicker) {
      setMessage('Ihr Browser unterstützt die File System Access API nicht.');
      setMessageType('error');
      return;
    }

    try {
      // NEU: Dateinamenslogik von handleExportSchedule hierher kopiert
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

      // Konstruiere den vorgeschlagenen Dateinamen
      const suggestedFilename = `${sanitizedTitle}_${day}.${month}.${year}_${hours}.${minutes}.dienstplan`; // Angepasste Endung

      const newHandle = await window.showSaveFilePicker({
        types: [{
          description: 'Dienstplan Datei',
          accept: { 'application/dienstplan+json': ['.dienstplan'] },
        }],
        suggestedName: suggestedFilename, // Verwende den neu generierten Dateinamen
      });
      await handleSaveFile(newHandle); // Speichern mit dem neuen Handle
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('Speichervorgang abgebrochen.');
      } else {
        console.error("Fehler beim Speichern der Datei unter neuem Namen:", error);
        setMessage(`Fehler beim Speichern der Datei: ${error.message}`);
        setMessageType('error');
      }
    }
  }, [handleSaveFile, weeklyPlanTitle]); // weeklyPlanTitle als Abhängigkeit hinzugefügt


// Funktion zum Öffnen einer Datei (Import)
  const handleOpenFile = useCallback(async () => {
    if (!window.showOpenFilePicker) {
      setMessage('Ihr Browser unterstützt die File System Access API nicht.');
      setMessageType('error');
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
        (!importedData.masterSchedule && (!Array.isArray(importedData.schedules) || importedData.schedules.length === 0)) ||
        !Array.isArray(importedData.groups) ||
        !Array.isArray(importedData.employees) ||
        !Array.isArray(importedData.categories) ||
        !Array.isArray(importedData.subCategories) ||
        (importedData.masterSchedule && !Array.isArray(importedData.masterSchedule.shifts))
      ) {
        setMessage('Ungültiges Dateiformat. Die importierte Datei scheint kein gültiger Dienstplan-Export zu sein.');
        setMessageType('error');
        console.warn("Importierte Datei hat ungültiges Format.");
        return;
      }

      setConfirmModalMessage('Möchtest du die aktuellen Daten wirklich durch die importierten Daten ersetzen? Dies kann nicht rückgängig gemacht werden.');
      setConfirmModalAction(() => async () => {
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
        setOrderedGroupIds(importedData.orderedGroupIds || importedData.groups.map(g => g.id));

        const { loadedSchedules, loadedActiveId, activePlan } = extractSchedulesFromImportedData(importedData);
        setSchedules(loadedSchedules);
        setActiveScheduleId(loadedActiveId);
        setMasterSchedule(activePlan);
        setWeeklyPlanTitle(activePlan.title || 'Wochenplan');

        // Dynamic adjustment of display time range based on imported shifts
        let minOverallMinutes = 24 * 60;
        let maxOverallMinutes = 0;
        let hasShifts = false;

        (activePlan.shifts || []).forEach(shift => {
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
          const [sH, sM] = (activePlan.displayStartTime || '06:00').split(':').map(Number);
          const [eH, eM] = (activePlan.displayEndTime || '18:00').split(':').map(Number);
          setDisplayStartHour(isNaN(sH) ? 6 : sH);
          setDisplayStartMinute(isNaN(sM) ? 0 : sM);
          setDisplayEndHour(isNaN(eH) ? 18 : eH);
          setDisplayEndMinute(isNaN(eM) ? 0 : eM);
        }

        setFileHandle(newHandle); // Speichern Sie das neue Handle

        // NEU: Speichere das FileHandle in IndexedDB
        await putFileHandleInDb(newHandle);
        console.log("Neues FileHandle erfolgreich in IndexedDB gespeichert nach Import.");

        setMessage('Daten erfolgreich importiert!');
        setMessageType('success');
        setShowConfirmModal(false);
      });
      setShowConfirmModal(true);

    } catch (error) {
      if (error.name === 'AbortError') {
        setMessage('Importvorgang abgebrochen.');
        console.log("Importvorgang abgebrochen.");
      } else {
        console.error("Fehler beim Importieren der Daten:", error);
        setMessage(`Fehler beim Importieren der Daten: ${error.message}. Stelle sicher, dass es sich um eine gültige Datei handelt.`);
        setMessageType('error');
      }
    }
  }, [setConfirmModalMessage, setConfirmModalAction, setGroups, setEmployees, setCategories, setSubCategories, setDisposalTimeRules, setMasterSchedule, setOrderedGroupIds, setDisplayStartHour, setDisplayStartMinute, setDisplayEndHour, setDisplayEndMinute, setWeeklyPlanTitle, setMessage, setShowConfirmModal]);


// Aktualisieren Sie handleClearAllData, um auch das fileHandle zu löschen
  const handleClearAllData = useCallback(() => {
    setConfirmModalMessage('Möchtest du, dass die App sich Ihre Daten nicht mehr merkt und mit einem leeren Plan startet? Die Daten werden NICHT aus der Speicherdatei auf Ihrem Computer gelöscht. Um die Daten dauerhaft zu entfernen, lösche die Speicherdatei manuell von dem Computer. Um die Daten wiederherzustellen, importiere die Speicherdatei.');
    setConfirmModalAction(() => async () => {
      setGroups([]);
      setEmployees([]);
      setCategories(DEFAULT_CATEGORIES);
      setSubCategories([]);
      setDisposalTimeRules([]);
      setSchedules([{ id: DEFAULT_SCHEDULE_ID, title: 'Wochenplan', displayStartTime: '06:00', displayEndTime: '18:00', shifts: [], sickDays: {} }]);
      setActiveScheduleId(DEFAULT_SCHEDULE_ID);
      setMasterSchedule({ shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: 'Wochenplan', sickDays: {} });
      setOrderedGroupIds([]);
      setSelectedGroupIdFilter('all');
      setDisplayStartHour(6);
      setDisplayStartMinute(0);
      setDisplayEndHour(18);
      setDisplayEndMinute(0);
      setWeeklyPlanTitle('Wochenplan');
      setFileHandle(null);

      await deleteFileHandleFromDb();
      console.log("FileHandle erfolgreich aus IndexedDB gelöscht.");

      setMessage('Alle Daten erfolgreich gelöscht!');
      setMessageType('success');
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
    masterSchedule, orderedGroupIds, schedules, activeScheduleId, weeklyPlanTitle,
    displayStartHour, displayStartMinute, displayEndHour, displayEndMinute,
    fileHandle, isInitialLoadComplete, handleSaveFile
  ]);

// NEU: Funktion zum Löschen nur des Wochenplans
  const handleClearSchedule = useCallback(() => {
    setConfirmModalMessage('Möchtest du WIRKLICH den Wochenplan löschen? Mitarbeiter, Gruppen und Kategorien bleiben erhalten. Diese Aktion lässt sich NICHT rückgängig machen!');
    setConfirmModalAction(() => () => {
      // Setzt den Wochenplan auf den initialen leeren Zustand zurück
      const defaultSchedule = { shifts: [], displayStartTime: '06:00', displayEndTime: '18:00', title: weeklyPlanTitle, sickDays: {} };
      setMasterSchedule(defaultSchedule);
      setSchedules(prev => prev.map(s => s.id === activeScheduleId ? { ...s, shifts: [], sickDays: {} } : s));
      setDisplayStartHour(6);
      setDisplayStartMinute(0);
      setDisplayEndHour(18);
      setDisplayEndMinute(0);

      setMessage('Wochenplan erfolgreich geleert!');
      setMessageType('success');
      setShowConfirmModal(false);
      setShowScheduleManagementModal(false); // Modal schließen
    });
    setShowConfirmModal(true);
  }, [activeScheduleId, weeklyPlanTitle, setMessage, setMasterSchedule, setDisplayStartHour, setDisplayStartMinute, setDisplayEndHour, setDisplayEndMinute]);


// NEU: Funktion zum Exportieren nur des Wochenplans
  const handleExportSchedule = useCallback(async () => { // Hinzugefügt: async
    try {
      const currentActive = {
        ...masterSchedule,
        id: activeScheduleId,
        title: weeklyPlanTitle,
        displayStartTime: `${String(displayStartHour).padStart(2, '0')}:${String(displayStartMinute).padStart(2, '0')}`,
        displayEndTime: `${String(displayEndHour).padStart(2, '0')}:${String(displayEndMinute).padStart(2, '0')}`,
        sickDays: masterSchedule?.sickDays || {},
      };
      const dataToExport = {
        masterSchedule: currentActive,
      };
      const jsonString = JSON.stringify(dataToExport, null, 2); // Pretty print JSON

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

      const filename = `${sanitizedTitle}_${day}.${month}.${year}_${hours}.${minutes}.wochenplan`;

    // NEU: Logik für Ordnerauswahl mit showSaveFilePicker
    if (window.showSaveFilePicker) { // Prüfen, ob die API unterstützt wird
      try {
        const newHandle = await window.showSaveFilePicker({ // Benutzer wählt Speicherort
          types: [{
            description: 'Wochenplan Datei',
            accept: { 'application/wochenplan+json': ['.wochenplan'] }, // Angepasster MIME-Type und Endung
          }],
          suggestedName: filename, // Vorgeschlagener Dateiname
        });

        const writable = await newHandle.createWritable();
        await writable.write(jsonString);
        await writable.close();

        setMessage(`Wochenplan erfolgreich in "${filename}" gespeichert.`);
        setMessageType('success');
        setShowScheduleManagementModal(false); // Modal schließen
        return; // Beende die Funktion hier, wenn erfolgreich
      } catch (error) {
        if (error.name === 'AbortError') {
          setMessage('Speichervorgang abgebrochen.');
          setMessageType('info'); // Optional: 'info' ist besser für Abbruch als 'error'
          setShowScheduleManagementModal(false); // Modal auch bei Abbruch schließen
          return; // WICHTIG: Beende die Funktion hier, wenn der Benutzer abbricht!
        } else {
          console.error("Fehler beim Speichern der Datei:", error);
          setMessage(`Fehler beim Speichern des Wochenplans: ${error.message}. Versuche Standard-Download.`);
          setMessageType('error');
          // Fällt hier durch zur alten Download-Methode, wenn ein anderer Fehler auftritt
        }
      }
    }

      // Fallback: Standard-Download-Link, falls showSaveFilePicker nicht verfügbar ist oder fehlschlägt
      const blob = new Blob([jsonString], { type: 'application/wochenplan+json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Clean up the URL object

      setMessage(`Wochenplan "${filename}" erfolgreich heruntergeladen.`);
      setMessageType('success');
      setShowScheduleManagementModal(false); // Modal schließen
    } catch (error) {
      console.error("Fehler beim Exportieren des Wochenplans:", error);
      setMessage('Fehler beim Exportieren des Wochenplans.');
      setMessageType('error');
    }
  }, [masterSchedule, activeScheduleId, weeklyPlanTitle, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, setMessage]);


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
          setMessageType('error');
          if (fileInputScheduleRef.current) { // Use the new ref here
            fileInputScheduleRef.current.value = '';
          }
          return;
        }

        const importedPlanTitle = importedData.masterSchedule.title || file.name.replace(/\.wochenplan$/, '') || 'Importierter Plan';

        const nowIso = new Date().toISOString();
        const newPlanId = `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newPlan = {
          id: newPlanId,
          title: importedPlanTitle,
          displayStartTime: importedData.masterSchedule.displayStartTime || '06:00',
          displayEndTime: importedData.masterSchedule.displayEndTime || '18:00',
          shifts: importedData.masterSchedule.shifts || [],
          sickDays: importedData.masterSchedule.sickDays || {},
          createdAt: importedData.masterSchedule.createdAt || nowIso,
          updatedAt: importedData.masterSchedule.updatedAt || nowIso,
        };

        const currentActive = {
          ...masterSchedule,
          id: activeScheduleId,
          title: weeklyPlanTitle,
          displayStartTime: `${String(displayStartHour).padStart(2, '0')}:${String(displayStartMinute).padStart(2, '0')}`,
          displayEndTime: `${String(displayEndHour).padStart(2, '0')}:${String(displayEndMinute).padStart(2, '0')}`,
          sickDays: masterSchedule?.sickDays || {},
          createdAt: masterSchedule?.createdAt || schedules.find(s => s.id === activeScheduleId)?.createdAt || nowIso,
          updatedAt: masterSchedule?.updatedAt || nowIso,
        };
        const updatedSchedules = schedules.some(s => s.id === activeScheduleId)
          ? schedules.map(s => s.id === activeScheduleId ? currentActive : s)
          : [...schedules, currentActive];

        setSchedules([...updatedSchedules, newPlan]);
        setActiveScheduleId(newPlanId);
        setMasterSchedule(newPlan);
        setWeeklyPlanTitle(importedPlanTitle);

        const [sH, sM] = (newPlan.displayStartTime || '06:00').split(':').map(Number);
        const [eH, eM] = (newPlan.displayEndTime || '18:00').split(':').map(Number);
        setDisplayStartHour(isNaN(sH) ? 6 : sH);
        setDisplayStartMinute(isNaN(sM) ? 0 : sM);
        setDisplayEndHour(isNaN(eH) ? 18 : eH);
        setDisplayEndMinute(isNaN(eM) ? 0 : eM);

        setMessage(`Wochenplan "${importedPlanTitle}" erfolgreich als neuer Plan importiert!`);
        setMessageType('success');
        setShowScheduleManagementModal(false);
        if (fileInputScheduleRef.current) {
          fileInputScheduleRef.current.value = '';
        }

      } catch (error) {
        console.error("Fehler beim Importieren des Wochenplans:", error);
        setMessage('Fehler beim Importieren des Wochenplans. Stelle sicher, dass es sich um eine gültige Datei handelt.');
        setMessageType('error');
        if (fileInputScheduleRef.current) { // Use the new ref here
          fileInputScheduleRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  }, [masterSchedule, activeScheduleId, schedules, weeklyPlanTitle, displayStartHour, displayStartMinute, displayEndHour, displayEndMinute, setMessage]);


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
    setMessageType('success');
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

  // --- Print Function (direkt, ohne Modal - wendet Druckfilter nur während des Drucks an und erzwingt hellen Modus) ---
  const handlePrint = () => {
    const savedGroup = selectedGroupIdFilter;
    const savedEmployee = selectedEmployeeIdFilter;
    const isCurrentlyDark = document.documentElement.classList.contains('dark');

    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      setIsPrinting(false);
      document.body.classList.remove('print-with-summary');
      setSelectedGroupIdFilter(savedGroup);
      setSelectedEmployeeIdFilter(savedEmployee);
      if (isCurrentlyDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    };

    window.addEventListener('afterprint', restore, { once: true });

    flushSync(() => {
      setIsPrinting(true);
      if (isCurrentlyDark) {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      if (printWeeklySummary) {
        document.body.classList.add('print-with-summary');
      } else {
        document.body.classList.remove('print-with-summary');
      }
      setSelectedGroupIdFilter(printGroupFilter);
      setSelectedEmployeeIdFilter(printEmployeeFilter);
    });

    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTop = 0;
    }

    window.print();

    // Browser-Fallback: Sobald print() zurückkehrt, Zustand wiederherstellen
    setTimeout(restore, 500);
  };

  const handlePrintFromModal = (includeWeeklySummary) => {
    setShowPrintOptionsModal(false); // Close the modal
    flushSync(() => {
      setIsPrinting(true);
      // Add/remove class to body based on selection
      if (includeWeeklySummary) {
        document.body.classList.add('print-with-summary');
      } else {
        document.body.classList.remove('print-with-summary');
      }
    });

    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTop = 0;
    }

    // Trigger print
    window.print();

    // Remove the class after a short delay to allow print dialog to open
    // This is important so the UI reverts to normal after printing
    setTimeout(() => {
      setIsPrinting(false);
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
          background: linear-gradient(135deg, var(--bg-grad-1, #fbcfe8), var(--bg-grad-2, #e9d5ff), var(--bg-grad-3, #bfdbfe));
          background-size: 400% 400%; /* Smaller for a more noticeable shift */
          animation: gradientShift var(--gradient-duration, 15s) ease infinite; /* Animation name, duration, timing, loop */
        }

        .dark .animated-gradient {
          background: linear-gradient(135deg, var(--bg-grad-dark-1, #0f172a), var(--bg-grad-dark-2, #1e1b4b), var(--bg-grad-dark-3, #111827));
          background-size: 400% 400%;
          animation: gradientShift var(--gradient-duration, 15s) ease infinite;
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

        /* Hide scrollbar completely while maintaining scroll functionality */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* Ensure the placeholder text does not get a text cursor */
        .print-hidden-placeholder {
          cursor: default !important;
        }
        `}
      </style>
      <div 
        className={`w-screen h-screen font-sans text-gray-800 dark:text-gray-100 flex flex-col pt-3 px-3 sm:px-6 ${backgroundStyle === 'animated-gradient' ? 'animated-gradient bg-gray-100 dark:bg-gray-900' : backgroundStyle !== 'solid' ? 'bg-transparent' : ''} transition-colors duration-200 overflow-hidden relative print:w-full print:h-auto print:min-h-0 print:overflow-visible print:p-0 print:static print:block`}
        style={backgroundStyle === 'solid' ? { backgroundColor: activeBgProps } : undefined}
      >
        {/* Interaktive Canvas-/Shader-Hintergründe nur rendern wenn nicht gedruckt wird (Performance in Druckvorschau) */}
        {!isPrinting && (
          <>
            {/* Silk Background (wenn aktiv) */}
            {backgroundStyle === 'silk' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <SilkBackground
                  color={activeBgProps}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 1.0}
                  scale={1.0}
                  noiseIntensity={1.2}
                />
              </div>
            )}

            {/* Floating Lines Background (wenn aktiv) */}
            {backgroundStyle === 'floating-lines' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <FloatingLinesBackground
                  colors={activeBgProps}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 1.0}
                />
              </div>
            )}

            {/* Side Rays Background (wenn aktiv) */}
            {backgroundStyle === 'side-rays' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <SideRaysBackground
                  color1={activeBgProps.color1}
                  color2={activeBgProps.color2}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 1.0}
                />
              </div>
            )}

            {/* 1. Color Bends Background */}
            {backgroundStyle === 'color-bends' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <ColorBendsBackground
                  colors={activeBgProps}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 0.08}
                />
              </div>
            )}

            {/* 2. Grainient Background */}
            {backgroundStyle === 'grainient' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <GrainientBackground
                  color1={activeBgProps.color1}
                  color2={activeBgProps.color2}
                  color3={activeBgProps.color3}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 0.16}
                />
              </div>
            )}

            {/* 3. Beams Background */}
            {backgroundStyle === 'beams' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <BeamsBackground
                  beamColor={activeBgProps.beamColor}
                  lightColor={activeBgProps.lightColor}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 0.14}
                />
              </div>
            )}

            {/* 4. Prismatic Burst Background */}
            {backgroundStyle === 'prismatic-burst' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <PrismaticBurstBackground
                  colors={activeBgProps}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 0.20}
                />
              </div>
            )}

            {/* 5. Iridescence Background */}
            {backgroundStyle === 'iridescence' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <IridescenceBackground
                  color={activeBgProps}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 0.08}
                />
              </div>
            )}

            {/* 6. Liquid Chrome Background */}
            {backgroundStyle === 'liquid-chrome' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <LiquidChromeBackground
                  baseColor={activeBgProps}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 0.12}
                />
              </div>
            )}

            {/* 7. Balatro Background */}
            {backgroundStyle === 'balatro' && (
              <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <BalatroBackground
                  color1={activeBgProps.color1}
                  color2={activeBgProps.color2}
                  color3={activeBgProps.color3}
                  lightMode={!isDarkTheme}
                  speed={globalBgSpeed * 0.45}
                />
              </div>
            )}
          </>
        )}

        {/* Office / Ribbon Menüleiste (oben fixiert, Inhalt scrollt darunter) */}
        <div className="w-full max-w-[156.25rem] mx-auto z-40 mb-2 flex-shrink-0 relative px-2 sm:px-3">
          <RibbonMenu
            onSave={() => {
              if (fileHandle) {
                handleSaveFile(fileHandle, true);
              } else {
                handleSaveFileAs();
              }
            }}
            onSaveAs={handleSaveFileAs}
            onOpen={handleOpenFile}
            onPrint={handlePrint}
            onClearData={handleClearAllData}
            onOpenScheduleModal={() => setShowScheduleManagementModal(true)}
            schedulesCount={schedules.length}
            onOpenAddEmployee={handleOpenAddEmployeeModal}
            onOpenEmployeeOverview={() => setShowEmployeeOverviewModal(true)}
            onOpenSickLeave={() => setShowSickLeaveModal(true)}
            sickCount={Object.values(masterSchedule.sickDays || {}).reduce((acc, d) => acc + (d || []).length, 0)}
            onOpenGroups={() => setShowGroupOverviewModal(true)}
            onOpenAddGroup={() => handleOpenAddGroupModal(false)}
            onOpenGroupOverview={() => setShowGroupOverviewModal(true)}
            onOpenCategories={() => setShowCategoryOverviewModal(true)}
            onOpenAddCategory={() => handleOpenAddCategoryModal(false)}
            onOpenAddSubCategory={() => handleOpenAddSubCategoryModal(false)}
            onOpenCategoryOverview={() => setShowCategoryOverviewModal(true)}
            onOpenSubCategories={() => setShowCategoryOverviewModal(true)}
            onOpenDisposalRules={() => setShowDisposalRuleOverviewModal(true)}
            onOpenAddDisposalRule={() => handleOpenAddDisposalRuleModal(false)}
            onOpenDisposalRulesOverview={() => setShowDisposalRuleOverviewModal(true)}
            onOpenHelp={openHelpModal}
            onOpenFeedback={handleFeedbackClick}
            onOpenSettings={() => setShowSettingsModal(true)}
            theme={theme}
            toggleTheme={toggleTheme}
            appVersion={CURRENT_APP_VERSION}
            onOpenVersionPopup={() => setShowNewVersionPopup(true)}
            hasFileHandle={!!fileHandle}
            printGroupFilter={printGroupFilter}
            setPrintGroupFilter={setPrintGroupFilter}
            printEmployeeFilter={printEmployeeFilter}
            setPrintEmployeeFilter={setPrintEmployeeFilter}
            printWeeklySummary={printWeeklySummary}
            setPrintWeeklySummary={setPrintWeeklySummary}
            filteredGroupsForDisplayInFilter={filteredGroupsForDisplayInFilter}
            availableEmployeesForFilter={availableEmployeesForFilter}
            filteredGroupsForDisplayInPrintFilter={filteredGroupsForDisplayInPrintFilter}
            availableEmployeesForPrintFilter={availableEmployeesForPrintFilter}
            displayStartHour={displayStartHour}
            displayStartMinute={displayStartMinute}
            displayEndHour={displayEndHour}
            displayEndMinute={displayEndMinute}
            onDisplayTimeChange={handleDisplayTimeChange}
            selectedGroupIdFilter={selectedGroupIdFilter}
            setSelectedGroupIdFilter={setSelectedGroupIdFilter}
            selectedEmployeeIdFilter={selectedEmployeeIdFilter}
            setSelectedEmployeeIdFilter={setSelectedEmployeeIdFilter}
            showStaffingWarningsGlobally={showStaffingWarningsGlobally}
            setShowStaffingWarningsGlobally={setShowStaffingWarningsGlobally}
            hideAbsentEmployees={hideAbsentEmployees}
            setHideAbsentEmployees={setHideAbsentEmployees}
            isCollapsed={isRibbonCollapsed}
            setIsCollapsed={setIsRibbonCollapsed}
          />
        </div>

        <div 
          ref={mainContainerRef} 
          style={{
            ...(new URLSearchParams(window.location.search).has('previewOnly') ? { display: 'none' } : {}),
            marginTop: isRibbonCollapsed ? '-41px' : '-85px',
            paddingTop: isRibbonCollapsed ? '49px' : '93px',
          }}
          className="w-full max-w-[156.25rem] mx-auto text-gray-800 dark:text-gray-100 main-container flex flex-col flex-1 min-h-0 relative z-10 transition-all duration-200 overflow-y-auto overflow-x-hidden no-scrollbar pb-10 px-2 sm:px-3 print:w-full print:h-auto print:max-h-none print:overflow-visible print:m-0 print:p-0 print:static print:block"
        >



          {/* 1. Mitarbeiter Übersicht Modal (im Hintergrund wenn Formular geöffnet ist) */}
          <BaseModal
            isOpen={showEmployeeOverviewModal}
            onClose={() => setShowEmployeeOverviewModal(false)}
            title="Mitarbeiter-Übersicht"
            icon={Users}
            maxWidth="max-w-4xl"
            zIndex={50}
            isDimmed={(showAddEmployeeModal && isEditingFromOverview) || showEmployeeWishesModal}
          >
            <EmployeeListModalContent
              sortedEmployees={sortedEmployees}
              groups={groups}
              getTextColorForBg={getTextColorForBg}
              onEditEmployee={handleEditEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onOpenAddModal={() => handleOpenAddEmployeeModal(true)}
              onOpenWishes={handleOpenEmployeeWishes}
            />
          </BaseModal>

          {/* 1b. Mitarbeiter-Wünsche Modal (über dem Übersicht-Modal) */}
          <EmployeeWishesModal
            isOpen={showEmployeeWishesModal}
            onClose={() => {
              setShowEmployeeWishesModal(false);
              setSelectedEmployeeForWishes(null);
            }}
            employee={selectedEmployeeForWishes}
            onSave={handleSaveEmployeeWishes}
          />

          {/* 2. Mitarbeiter hinzufügen / bearbeiten Modal (über dem Übersicht-Modal) */}
          <BaseModal
            isOpen={showAddEmployeeModal}
            onClose={handleCancelEditEmployee}
            title={editingEmployeeId ? 'Mitarbeiter bearbeiten' : 'Mitarbeiter hinzufügen'}
            icon={editingEmployeeId ? Users : UserPlus}
            maxWidth="max-w-2xl"
            zIndex={60}
          >
            <EmployeeFormModalContent
              editingEmployeeId={editingEmployeeId}
              newEmployee={newEmployee}
              handleEmployeeChange={handleEmployeeChange}
              handleAddEmployee={handleAddEmployee}
              handleCancelEditEmployee={handleCancelEditEmployee}
              groups={groups}
            />
          </BaseModal>

          {/* 3. Gruppen-Übersicht Modal (im Hintergrund wenn Gruppen-Formular geöffnet ist) */}
          <BaseModal
            isOpen={showGroupOverviewModal}
            onClose={() => setShowGroupOverviewModal(false)}
            title="Gruppen-Übersicht"
            icon={Layers}
            maxWidth="max-w-4xl"
            zIndex={50}
            isDimmed={showAddGroupModal && isEditingGroupFromOverview}
          >
            <GroupListModalContent
              groups={groups}
              orderedGroupIds={orderedGroupIds}
              onEditGroup={handleEditGroupClick}
              onDeleteGroup={handleDeleteGroup}
              onOpenAddModal={() => handleOpenAddGroupModal(true)}
              handleGroupDragStart={handleGroupDragStart}
              handleGroupDragEnter={handleGroupDragEnter}
              handleGroupDragLeave={handleGroupDragLeave}
              handleGroupDragOver={handleGroupDragOver}
              handleGroupDrop={handleGroupDrop}
              handleGroupDragEnd={handleGroupDragEnd}
            />
          </BaseModal>

          {/* 4. Gruppe hinzufügen / bearbeiten Modal (über dem Gruppen-Übersicht-Modal) */}
          <BaseModal
            isOpen={showAddGroupModal}
            onClose={handleCancelEditGroup}
            title={editingGroupId ? 'Gruppe bearbeiten' : 'Gruppe hinzufügen'}
            icon={editingGroupId ? Layers : FolderPlus}
            maxWidth="max-w-2xl"
            zIndex={60}
          >
            <GroupFormModalContent
              editingGroupId={editingGroupId}
              editingGroup={editingGroup}
              setEditingGroup={setEditingGroup}
              newGroup={newGroup}
              setNewGroup={setNewGroup}
              handleAddGroup={handleAddGroup}
              handleUpdateGroup={handleUpdateGroup}
              handleCancelEditGroup={handleCancelEditGroup}
              isGroupOpeningHoursMinimized={isGroupOpeningHoursMinimized}
              setIsGroupOpeningHoursMinimized={setIsGroupOpeningHoursMinimized}
            />
          </BaseModal>

          {/* 5. Schichtblöcke-Übersicht Modal (zeigt Blöcke & direkt darunter eingerückte Unterblöcke) */}
          <BaseModal
            isOpen={showCategoryOverviewModal}
            onClose={() => setShowCategoryOverviewModal(false)}
            title="Schichtblöcke & Unterblöcke"
            icon={Tag}
            maxWidth="max-w-4xl"
            zIndex={50}
            isDimmed={(showAddCategoryModal && isEditingCategoryFromOverview) || (showAddSubCategoryModal && isEditingSubCategoryFromOverview)}
          >
            <CategoryListModalContent
              categories={categories}
              subCategories={subCategories}
              onEditCategory={handleEditCategoryClick}
              onDeleteCategory={handleDeleteCategory}
              onEditSubCategory={handleEditSubCategoryClick}
              onDeleteSubCategory={handleDeleteSubCategory}
              onOpenAddCategoryModal={() => handleOpenAddCategoryModal(true)}
              onOpenAddSubCategoryModal={(parentCatId) => {
                handleOpenAddSubCategoryModal(true);
                if (parentCatId) {
                  setNewSubCategory(prev => ({ ...prev, parentCategoryId: parentCatId }));
                }
              }}
            />
          </BaseModal>

          {/* 6. Schichtblock hinzufügen / bearbeiten Modal */}
          <BaseModal
            isOpen={showAddCategoryModal}
            onClose={handleCancelEditCategory}
            title={editingCategoryId ? 'Schichtblock bearbeiten' : 'Schichtblock hinzufügen'}
            icon={Tag}
            maxWidth="max-w-2xl"
            zIndex={60}
          >
            <CategoryFormModalContent
              editingCategoryId={editingCategoryId}
              newCategory={newCategory}
              setNewCategory={setNewCategory}
              handleAddCategory={handleAddCategory}
              handleUpdateCategory={handleUpdateCategory}
              handleCancelEditCategory={handleCancelEditCategory}
              disposalTimeCategory={disposalTimeCategory}
              careCategory={careCategory}
            />
          </BaseModal>

          {/* 7. Unterblock hinzufügen / bearbeiten Modal */}
          <BaseModal
            isOpen={showAddSubCategoryModal}
            onClose={handleCancelEditSubCategory}
            title={editingSubCategoryId ? 'Unterblock bearbeiten' : 'Unterblock hinzufügen'}
            icon={BookmarkPlus}
            maxWidth="max-w-2xl"
            zIndex={60}
          >
            <SubCategoryFormModalContent
              editingSubCategoryId={editingSubCategoryId}
              newSubCategory={newSubCategory}
              setNewSubCategory={setNewSubCategory}
              categories={categories}
              handleAddSubCategory={handleAddSubCategory}
              handleUpdateSubCategory={handleUpdateSubCategory}
              handleCancelEditSubCategory={handleCancelEditSubCategory}
            />
          </BaseModal>

          {/* 8. Verfügungszeit-Regeln Übersicht Modal */}
          <BaseModal
            isOpen={showDisposalRuleOverviewModal}
            onClose={() => setShowDisposalRuleOverviewModal(false)}
            title="Verfügungszeit-Regeln"
            icon={Clock}
            maxWidth="max-w-4xl"
            zIndex={50}
            isDimmed={showAddDisposalRuleModal && isEditingDisposalRuleFromOverview}
          >
            <DisposalRuleListModalContent
              disposalTimeRules={disposalTimeRules}
              onEditDisposalRule={handleEditDisposalRule}
              onDeleteDisposalRule={handleDeleteDisposalRule}
              onOpenAddModal={() => handleOpenAddDisposalRuleModal(true)}
            />
          </BaseModal>

          {/* 9. Verfügungszeit-Regel hinzufügen / bearbeiten Modal */}
          <BaseModal
            isOpen={showAddDisposalRuleModal}
            onClose={handleCancelEditDisposalRule}
            title={editingDisposalRuleId ? 'Regel bearbeiten' : 'Regel hinzufügen'}
            icon={Clock}
            maxWidth="max-w-2xl"
            zIndex={60}
          >
            <DisposalRuleFormModalContent
              editingDisposalRuleId={editingDisposalRuleId}
              newDisposalRule={newDisposalRule}
              setNewDisposalRule={setNewDisposalRule}
              handleAddDisposalRule={handleAddDisposalRule}
              handleUpdateDisposalRule={handleUpdateDisposalRule}
              handleCancelEditDisposalRule={handleCancelEditDisposalRule}
            />
          </BaseModal>

          {/* --- Master-Wochenplan-Ansicht --- */}
          <div className="mb-10 p-4 sm:p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl frosted-glass-card rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/60 master-weekly-plan-section transition-colors duration-200 print:bg-white print:backdrop-blur-none">
            {/* Wochenplan-Titel */}
            <div className="flex items-center justify-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center">
                {weeklyPlanTitle}
              </h2>
            </div>




            {filteredEmployeesForDisplay.length === 0 && selectedGroupIdFilter !== 'all' ? (
              <p className="text-center text-gray-500">Keine Mitarbeiter in der ausgewählten Gruppe vorhanden.</p>
            ) : employees.length === 0 ? (
              <p className="text-center text-gray-500">Bitte füge zuerst Mitarbeiter hinzu, um den Dienstplan zu erstellen.</p>
            ) : (
              // Apply styling to the outer container for a cohesive look
              <div className="weekly-plan-days-container bg-white dark:bg-gray-900 p-4 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 print:shadow-none">
                {WEEK_DAYS_PLAN.map(day => {
                  const sickCountForDay = filteredEmployeesForDisplay.filter(emp =>
                    (masterSchedule.sickDays?.[emp.id] || []).includes(day)
                  ).length;

                  return (
                    // Added printable-day-container class here
                    <div key={day} className="mb-4 last:mb-0 printable-day-container">
                      {/* Main grid for the day's schedule */}
                      <div
                        className="grid text-sm weekly-plan-grid"
                        style={{
                          gridTemplateColumns: `2rem ${employeeColWidthScreen} 1fr 150px`,
                          '--employee-col-width': employeeColWidthScreen,
                          '--employee-col-width-print': employeeColWidthPrint,
                        }}
                      >
                        {/* Weekday Name - now in the grid, spanning first two columns */}
                        <h4 className="col-span-2 font-bold text-xl text-gray-800 dark:text-gray-100 mb-4 text-left pl-2 flex items-center gap-3 overflow-hidden whitespace-nowrap min-w-0">
                          <span>{day}</span>
                          {sickCountForDay > 0 && (
                            <span
                              className="sick-day-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 shadow-xs print:hidden"
                              title={`${sickCountForDay} ${sickCountForDay === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} an diesem Tag krankgemeldet`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              <span>{sickCountForDay} krank</span>
                            </span>
                          )}
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

                          // If hiding absent employees is enabled, filter out employees who are absent (sick or school day) on this specific day
                          const visibleEmployeesInThisGroup = employeesInThisGroup.filter(employee => {
                            if (!hideAbsentEmployees) return true;
                            const isSchoolDay = (employee.type !== 'normal' && employee.type !== 'zusatzkraft') && !(employee.presenceDays || []).includes(day);
                            const isSick = (masterSchedule.sickDays?.[employee.id] || []).includes(day);
                            return !(isSick || isSchoolDay);
                          });

                          if (visibleEmployeesInThisGroup.length === 0) return null;

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

                                  {visibleEmployeesInThisGroup.map((employee, index) => {
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

                                      // Determine if the current employee is marked sick on this day
                                      const isSick = (masterSchedule.sickDays?.[employee.id] || []).includes(day);
                                      const isDimmed = isSick || isSchoolDay;

                                      // Mitarbeiterwünsche für diesen Wochentag auswerten
                                      const dayWish = employee.wishes?.[day];
                                      const hasDayWish = Boolean(
                                        dayWish &&
                                          (dayWish.dayOff ||
                                            dayWish.startTime ||
                                            dayWish.endTime ||
                                            (dayWish.disposalPreference && dayWish.disposalPreference !== 'none') ||
                                            dayWish.note)
                                      );

                                      const wishTooltipLines = [];
                                      if (hasDayWish) {
                                        if (dayWish.dayOff) wishTooltipLines.push('🏖️ Wunschfrei (Bevorzugt kein Dienst)');
                                        if (dayWish.startTime || dayWish.endTime) {
                                          wishTooltipLines.push(`⏰ Wunsch-Arbeitszeit: ${dayWish.startTime || 'Start offen'} bis ${dayWish.endTime || 'Ende offen'}`);
                                        }
                                        if (dayWish.disposalPreference === 'morning') wishTooltipLines.push('☀️ Verfügungszeit (VZ): Vormittags gewünscht');
                                        if (dayWish.disposalPreference === 'afternoon') wishTooltipLines.push('🌙 Verfügungszeit (VZ): Nachmittags gewünscht');
                                        if (dayWish.note) wishTooltipLines.push(`💬 Notiz: ${dayWish.note}`);
                                      }
                                      const wishTooltipText = hasDayWish
                                        ? `Mitarbeiterwunsch für ${employee.name} (${day}):\n${wishTooltipLines.join('\n')}`
                                        : '';

                                      // Get visual staffing warning ranges for this group and day
                                      const visualStaffingWarnings = currentGroupDayWarnings?.visualWarningRanges || [];


                                      return (
                                          // This div now represents a single grid row for the employee's content
                                          <div key={employee.id} className="contents"> {/* Use contents to make it a logical row */}
                                                {index === 0 && ( // Vertical Group Name (only for the first employee in the group)
                                                    <div
                                                        className={`flex items-center justify-center text-center font-semibold ${getTextColorForBg(group.color)} ${group.color} group-name-vertical select-none`}
                                                        style={{
                                                            gridColumn: '1 / 2',
                                                            gridRow: `span ${visibleEmployeesInThisGroup.length}`,
                                                            minWidth: '2rem',
                                                            height: '100%',
                                                            alignSelf: 'stretch',
                                                            boxSizing: 'border-box',
                                                            borderTopLeftRadius: '0.5rem',
                                                            borderBottomLeftRadius: '0.5rem',
                                                            borderTopRightRadius: '0',
                                                            borderBottomRightRadius: '0',
                                                            marginRight: '-1px',
                                                            position: 'relative',
                                                            zIndex: 5,
                                                            padding: '0.25rem 0',
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                writingMode: 'vertical-lr',
                                                                textOrientation: 'mixed',
                                                                transform: 'rotate(180deg)',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {group.name}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Employee Name column - in the second column, with group background */}
                                                {/* Ensure no rounded corners here to make it seamless with the group background */}
                                                <div className={`col-start-2 h-full px-2 text-right font-medium flex items-center justify-end gap-1.5 ${group.color} ${getTextColorForBg(group.color)} rounded-none employee-name-cell overflow-hidden`}>
                                                    {hasDayWish && (
                                                      <span
                                                        className="cursor-help inline-flex items-center text-amber-500 hover:text-amber-600 dark:text-amber-400 text-xs shrink-0 select-none print:hidden transition transform hover:scale-125"
                                                        title={wishTooltipText}
                                                      >
                                                        ⭐
                                                      </span>
                                                    )}
                                                    <span className={`truncate ${isSick ? 'line-through opacity-75' : ''}`} title={employee.name}>{employee.name}</span>
                                                </div>

                                                {/* Timeline column - in the third column */}
                                                <div
                                                    ref={el => timelineRefs.current[`${employee.id}-${day}`] = el}
                                                    className={`col-start-3 relative h-full border border-gray-300 rounded-none bg-white timeline-row-container px-2 flex items-center justify-center ${isDimmed ? 'opacity-50' : ''}`}
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

                                                    {/* Visual Wish Marker on Timeline */}
                                                    {hasDayWish && (dayWish.startTime || dayWish.endTime) && (() => {
                                                        const wStartMin = dayWish.startTime ? timeToMinutes(dayWish.startTime) : displayStartMinutes;
                                                        const wEndMin = dayWish.endTime ? timeToMinutes(dayWish.endTime) : displayEndMinutes;
                                                        const clampedStart = Math.max(displayStartMinutes, Math.min(displayEndMinutes, wStartMin));
                                                        const clampedEnd = Math.max(displayStartMinutes, Math.min(displayEndMinutes, wEndMin));
                                                        if (clampedEnd > clampedStart) {
                                                            const left = ((clampedStart - displayStartMinutes) / totalDisplayMinutes) * 100;
                                                            const width = ((clampedEnd - clampedStart) / totalDisplayMinutes) * 100;
                                                            return (
                                                                <div
                                                                    key={`wish-zone-${employee.id}-${day}`}
                                                                    className="absolute top-0 h-full pointer-events-none print:hidden border-x-2 border-dashed border-amber-400/70 bg-amber-400/10 dark:bg-amber-400/5 z-5"
                                                                    style={{ left: `${left}%`, width: `${width}%` }}
                                                                    title={wishTooltipText}
                                                                >
                                                                    <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 px-1 truncate select-none opacity-80 block bg-amber-100/60 dark:bg-amber-950/60 rounded-xs w-max">
                                                                        ⭐ Wunschzeit
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    })()}

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

                                                                // NEU: Dauer in Minuten berechnen (falls noch nicht vorhanden)
                                                                const durationMinutes = timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime);
                                                                const formattedDuration = `${durationMinutes}min`;

                                                                let displayedCategoryText = blockCategoryName;
                                                                let timeStringStart = segment.startTime;
                                                                let timeStringEnd = segment.endTime;
                                                                let categoryTextSizeClass = '';
                                                                let timeTextSizeClass = '';
                                                                let showTime = true;
                                                                let showCategory = true;
                                                                let isTimeVertical = false;
                                                                let isTimeRotated90Deg = false; // NEU: Flag für 90-Grad-Rotation
                                                                let displayedTimeText = ''; // KORREKTUR: displayedTimeText initialisieren

                                                                if (currentBlockWidth < 20) {
                                                                    showCategory = false;
                                                                    showTime = false;
                                                                    displayedTimeText = ''; // KORREKTUR: Auch hier setzen
                                                                } else if (currentBlockWidth < 40) { // Dieser Block ist jetzt für die GEDREHTE DAUER
                                                                    showCategory = false;       // Kategorie ausblenden
                                                                    showTime = true;            // Zeit anzeigen
                                                                    isTimeRotated90Deg = true;  // NEU: 90-Grad-Rotation aktivieren
                                                                    displayedTimeText = formattedDuration; // KORREKTUR: Dauer (z.B. "15min") anzeigen
                                                                } else if (currentBlockWidth < 150) { // Dies ist der BESTEHENDE VERTIKALE Modus
                                                                    showCategory = false;
                                                                    showTime = true;
                                                                    isTimeVertical = true;      // BESTEHEND: Vertikale Anzeige aktivieren
                                                                    displayedTimeText = `${timeStringStart}-${timeStringEnd}`; // KORREKTUR: Start-End-Zeit für vertikal
                                                                } else { // Dies ist der BESTEHENDE HORIZONTALE Modus
                                                                    categoryTextSizeClass = 'text-sm';
                                                                    timeTextSizeClass = 'text-xs';
                                                                    showCategory = true;
                                                                    showTime = true;
                                                                    isTimeVertical = false;
                                                                    displayedTimeText = `${timeStringStart}-${timeStringEnd}`; // KORREKTUR: Start-End-Zeit für horizontal
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
                                                                        onContextMenu={(e) => {
                                                                            handleShiftBlockContextMenu(e, shift, segIdx);
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
                                                                            // Überprüfe zuerst auf die neue 90-Grad-Rotation
                                                                            isTimeRotated90Deg ? (
                                                                                <span
                                                                                    className={`${timeTextSizeClass} leading-tight text-center px-1 absolute`}
                                                                                    style={{
                                                                                      position: 'absolute', // Wichtig: Damit das span im shift-block platziert werden kann
                                                                                      top: 0,               // Macht das span so hoch wie den shift-block
                                                                                      bottom: 0,            // Macht das span so hoch wie den shift-block
                                                                                      left: 0,              // Macht das span so breit wie den shift-block
                                                                                      right: 0,             // Macht das span so breit wie den shift-block
                                                                                      display: 'flex',      // Aktiviert Flexbox für die Zentrierung des Textes
                                                                                      alignItems: 'center', // Zentriert den Text vertikal im span
                                                                                      justifyContent: 'center', // Zentriert den Text horizontal im span
                                                                                      transform: 'rotate(270deg)', // Nur die Rotation auf das gesamte zentrierte span anwenden
                                                                                      whiteSpace: 'nowrap', // Verhindert Zeilenumbrüche im Text
                                                                                      // font-size wird bereits über timeTextSizeClass gesetzt
                                                                                  }}
                                                                                >
                                                                                    {displayedTimeText}
                                                                                </span>
                                                                            ) : // Wenn nicht 90-Grad gedreht, dann überprüfe auf die bestehende vertikale Anzeige
                                                                            isTimeVertical ? (
                                                                                <div className={`flex flex-col items-center ${timeTextSizeClass} leading-tight text-center px-1`}>
                                                                                    <span>{timeStringStart}</span>
                                                                                    <span>{timeStringEnd}</span>
                                                                                </div>
                                                                            ) : ( // Ansonsten, die horizontale Standardanzeige
                                                                                <span className={`${timeTextSizeClass} leading-tight text-center whitespace-nowrap px-1`}>
                                                                                    {displayedTimeText}
                                                                                </span>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                );
                                                            })
                                                        ))
                                                    ) : (
                                                        <div className="text-gray-500 text-sm italic flex items-center h-full justify-center print-hidden-placeholder gap-1.5">
                                                            {isSick ? 'Krank gemeldet' : isSchoolDay ? 'Schultag' : (
                                                              hasDayWish && dayWish.dayOff ? (
                                                                <span className="text-amber-600 dark:text-amber-400 font-medium not-italic flex items-center gap-1 select-none" title={wishTooltipText}>
                                                                  🏖️ Wunschfrei
                                                                </span>
                                                              ) : 'Klicken zum Hinzufügen'
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Summary column - in the fourth column */}
                                                {/* Made this column relative for absolute positioning of warnings */}
                                                <div className={`col-start-4 h-full pl-2 flex flex-row items-center justify-start gap-x-1 border-l border-gray-300 summary-cell relative ${isDimmed ? 'opacity-60' : ''}`}>
                                                    {/* Daily Total Work Hours Block */}
                                                    <div className="flex items-center justify-center rounded-md bg-blue-500 text-white text-xs font-bold shadow-sm dark:shadow-none"
                                                         style={{ width: '20px', height: '50px', writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                                                        {formatMinutesToDecimalHours(totalWorkMinutes)}
                                                    </div>
                                                    {/* Display Pause if it has time */}
                                                    {categoryTotals[PAUSE_CATEGORY.id] > 0 && (
                                                      <div className={`flex items-center justify-center rounded-md ${PAUSE_CATEGORY.color} text-white text-xs shadow-sm dark:shadow-none`}
                                                           style={{ width: '20px', height: '50px', writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                                                          {formatMinutesToDecimalHours(categoryTotals[PAUSE_CATEGORY.id])}
                                                      </div>
                                                    )}
                                                    {/* Display other dynamic categories */}
                                                    {categoriesWithTime
                                                      .filter(cat => cat.id !== PAUSE_CATEGORY.id)
                                                      .map(cat => (
                                                        <div key={cat.id} className={`flex items-center justify-center rounded-md ${cat.color} ${getTextColorForBg(cat.color)} text-xs shadow-sm dark:shadow-none`}
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
                );
              })}
              </div>
            )}

            {/* Wochenplan Legende */}
            <ScheduleLegend
              categories={categories}
              subCategories={subCategories}
              groups={groups}
              getTextColorForBg={getTextColorForBg}
            />
          </div>

          <WeeklySummary
            employees={employees}
            disposalTimeCategory={disposalTimeCategory}
            categories={categories}
            weeklySummaries={weeklySummaries}
            dynamicCategoryHeaders={dynamicCategoryHeaders}
            filteredEmployeesForDisplay={filteredEmployeesForDisplay}
            groups={groups}
            getTextColorForBg={getTextColorForBg}
          />


          {/* Add Shift Type Menu (for clicking on empty space) */}
          <ShiftMenus
            showAddShiftMenu={showAddShiftMenu}
            setShowAddShiftMenu={setShowAddShiftMenu}
            addShiftMenuPos={addShiftMenuPos}
            handleAddSegmentFromMenu={handleAddSegmentFromMenu}
            categories={categories}
            subCategories={subCategories}
            getTextColorForBg={getTextColorForBg}
            showShiftOptionsMenu={showShiftOptionsMenu}
            setShowShiftOptionsMenu={setShowShiftOptionsMenu}
            shiftOptionsMenuPos={shiftOptionsMenuPos}
            shiftOptionsContext={shiftOptionsContext}
            handleChangeShiftClick={handleChangeShiftClick}
            handleChangeGroupClick={handleChangeGroupClick}
            handleDeleteShift={handleDeleteShift}
            showChangeGroupMenu={showChangeGroupMenu}
            setShowChangeGroupMenu={setShowChangeGroupMenu}
            changeGroupMenuPos={changeGroupMenuPos}
            changeGroupContext={changeGroupContext}
            handleUpdateSegmentGroup={handleUpdateSegmentGroup}
            groups={groups}
            employees={employees}
            showChangeShiftMenu={showChangeShiftMenu}
            setShowChangeShiftMenu={setShowChangeShiftMenu}
            changeShiftMenuPos={changeShiftMenuPos}
            changeShiftContext={changeShiftContext}
            handleUpdateSegmentCategory={handleUpdateSegmentCategory}
          />


            {/* Render the custom confirmation modal */}
            {showConfirmModal && (
              <ConfirmModal
                message={confirmModalMessage}
                onConfirm={handleConfirmModalConfirm}
                onCancel={handleConfirmModalCancel}
              />
            )}

            {/* NEU: Render the Schedule Management Modal */}
            {showScheduleManagementModal && (
              <ScheduleManagementModal
                schedules={liveSchedules}
                activeScheduleId={activeScheduleId}
                onSwitchSchedule={handleSwitchSchedule}
                onCreateNewSchedule={handleCreateNewSchedule}
                onDuplicateSchedule={handleDuplicateSchedule}
                onDeleteSchedule={handleDeleteSchedule}
                onRenameSchedule={handleRenameSchedule}
                onReorderSchedules={handleReorderSchedules}
                onClearSchedule={handleClearSchedule}
                onExportSchedule={handleExportSchedule}
                onImportSchedule={handleImportSchedule}
                onCancel={() => setShowScheduleManagementModal(false)}
                fileInputRef={fileInputScheduleRef}
              />
            )}

            {/* NEU: Render the Sick Leave Modal */}
            <SickLeaveModal
              isOpen={showSickLeaveModal}
              onClose={() => setShowSickLeaveModal(false)}
              employees={employees}
              groups={groups}
              sickDays={masterSchedule.sickDays || {}}
              onToggleSickDay={handleToggleSickDay}
              onSetEmployeeSickDays={handleSetEmployeeSickDays}
              onClearAllSickDays={handleClearAllSickDays}
            />

            {/* Render the New Version Popup */}
            {showNewVersionPopup && (
              <NewVersionPopup
                version={CURRENT_APP_VERSION}
                onClose={() => {
                  setShowNewVersionPopup(false);
                  // Korrektur: Verwende den gleichen Schlüssel wie beim Lesen im useEffect
                  localStorage.setItem('lastShownAppVersion', CURRENT_APP_VERSION);
                }}
                releaseNotes={RELEASE_NOTES}
              />
            )}

            {showHelpModal && (
              <HelpModal
                onClose={closeHelpModal}
              />
            )}

            {showSettingsModal && (
              <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                theme={theme}
                toggleTheme={toggleTheme}
                appVersion={CURRENT_APP_VERSION}
                backgroundStyle={backgroundStyle}
                setBackgroundStyle={setBackgroundStyle}
                globalBgSpeed={globalBgSpeed}
                setGlobalBgSpeed={setGlobalBgSpeed}
                activeBgPreset={activeBgPreset}
                setActiveBgPreset={setActiveBgPreset}
                customColorsLight={customColorsLight}
                setCustomColorsLight={setCustomColorsLight}
                customColorsDark={customColorsDark}
                setCustomColorsDark={setCustomColorsDark}
              />
            )}

            {showFeedbackModal && (
              <FeedbackModal
                draft={feedbackDraft}
                onDraftChange={setFeedbackDraft}
                onClose={() => setShowFeedbackModal(false)}
                onCancel={() => { setFeedbackDraft(FEEDBACK_DEFAULT_DRAFT); setShowFeedbackModal(false); }}
                onSend={() => { setFeedbackDraft(FEEDBACK_DEFAULT_DRAFT); setShowFeedbackModal(false); }}
              />
            )}

          </div>
        </div>

        {/* Global Toast Notification Banner */}
        {message && (
          <div
            role="alert"
            className={`fixed z-[200] bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-between gap-3 px-5 py-3 rounded-xl shadow-xl backdrop-blur-md border transition-all duration-300 ease-out max-w-md ${
              showMessageVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
            } ${
              messageType === 'success'
                ? 'bg-green-100/70 dark:bg-green-950/70 border-green-300/80 dark:border-green-800 text-green-800 dark:text-green-200 shadow-green-900/10'
                : messageType === 'error'
                ? 'bg-red-100/70 dark:bg-red-950/70 border-red-300/80 dark:border-red-800 text-red-800 dark:text-red-200 shadow-red-900/10'
                : 'bg-blue-100/70 dark:bg-blue-950/70 border-blue-300/80 dark:border-blue-800 text-blue-800 dark:text-blue-200 shadow-blue-900/10'
            }`}
          >
            <p className="text-sm font-medium leading-normal select-none">
              {message}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowMessageVisible(false);
                setTimeout(() => {
                  setMessage('');
                  setMessageType('');
                }, 300);
              }}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 transition hover:bg-black/5 dark:hover:bg-white/10"
              title="Benachrichtigung schließen"
            >
              <X size={15} />
            </button>
          </div>
        )}
        {/* Warning Tooltip (appears on hover over AlertCircle) */}
          {showWarningTooltip && warningTooltipContent.length > 0 && (
            <div
              className="fixed bg-red-700/80 backdrop-blur-md text-white text-xs p-2 rounded-md shadow-lg z-[1000] max-w-xs" // "fixed" für Mauszeiger-Folge, erhöhter z-index,
              pointer-events-none entfernt
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
