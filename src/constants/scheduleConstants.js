// Define the days of the week for the constant plan
export const WEEK_DAYS_PLAN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

// --- German Labor Law Constants (in minutes) ---
export const MIN_BREAK_AFTER_6_HOURS = 30; // 30 minutes break after 6 hours work
export const MIN_BREAK_AFTER_9_HOURS = 45; // 45 minutes break after 9 hours work (can include the first 30 min)
export const MAX_DAILY_WORK_MINUTES = 10 * 60; // 10 hours max actual work time

// --- Fixed System PAUSE Category ---
export const PAUSE_CATEGORY = {
  id: '_pause_system_id',
  name: 'Pause',
  color: 'bg-gray-500', // A distinct color for system pause
};

// --- Standard-Schichtblöcke (Default Categories) ---
export const DEFAULT_CATEGORIES = [
  {
    id: '_default_cat_betreuung',
    name: 'Betreuung',
    color: 'bg-orange-500',
    isDisposalTimeCategory: false,
    isCareCategory: true,
  },
  {
    id: '_default_cat_verfuegung',
    name: 'Verfügungszeit',
    color: 'bg-green-500',
    isDisposalTimeCategory: true,
    isCareCategory: false,
  },
];

// Employee Type Order for sorting within a group
// Normal employees come first (0), then Zusatzkraft (0.5), then special types (1)
export const EMPLOYEE_TYPE_ORDER = {
  'normal': 0,
  'zusatzkraft': 0.5,
  'apprentice': 1,
  'fsj': 1,
  'intern': 1,
};

// Define color palettes
export const groupColors = [
  'bg-red-100', 'bg-orange-100', 'bg-amber-100', 'bg-yellow-100', 'bg-lime-100',
  'bg-green-100', 'bg-emerald-100', 'bg-teal-100', 'bg-cyan-100', 'bg-sky-100',
  'bg-indigo-100', 'bg-violet-100', 'bg-purple-100', 'bg-fuchsia-100',
  'bg-pink-100', 'bg-rose-100', 'bg-gray-100', 'bg-slate-100', 'bg-neutral-100',
  'bg-gray-50'
];

export const blockColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-rose-500', 'bg-gray-500', 'bg-slate-500', 'bg-neutral-500',
  'bg-gray-50'
];
