import { timeToMinutes, minutesToTime, isTimeInRanges } from './timeUtils';
import {
  PAUSE_CATEGORY,
  MIN_BREAK_AFTER_6_HOURS,
  MIN_BREAK_AFTER_9_HOURS,
  MAX_DAILY_WORK_MINUTES
} from '../constants/scheduleConstants';

// --- Function to check for group staffing warnings ---
// Considers segment.overriddenGroupId for staffing calculation
export const checkGroupStaffingWarnings = (
  group,
  dayOfWeek,
  allEmployees,
  allShifts,
  allCategories,
  allSubCategories,
  sickDays = {}
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
  const dailyTimeline = new Array(24 * 60).fill(0);

  allShifts.filter(shift => shift.dayOfWeek === dayOfWeek).forEach(shift => {
    const employee = allEmployees.find(emp => emp.id === shift.employeeId);
    if (!employee) return;

    // Wenn der Mitarbeiter an diesem Tag krank ist, zählt seine Anwesenheit nicht in Betreuung
    const isSick = (sickDays[employee.id] || []).includes(dayOfWeek);
    if (isSick) return;

    // Wenn Azubi an einem Schultag (nicht-Anwesenheitstag) ist, zählt seine Anwesenheit ebenfalls nicht
    const isSchoolDay = (employee.type !== 'normal' && employee.type !== 'zusatzkraft') && !(employee.presenceDays || []).includes(dayOfWeek);
    if (isSchoolDay) return;

    shift.segments.forEach(segment => {
      let effectiveCategoryId = segment.categoryId;
      if (segment.subCategoryId) {
        const subCat = allSubCategories.find(sc => sc.id === segment.subCategoryId);
        if (subCat) {
          effectiveCategoryId = subCat.parentCategoryId;
        }
      }

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

      // Prüfung der Randzeiten für den spezifischen Tag
      const currentTimeHHMM = minutesToTime(currentMinute);
      if (group.edgeTimes?.[dayOfWeek] && isTimeInRanges(currentTimeHHMM, group.edgeTimes[dayOfWeek])) {
        if (currentWarningStart !== -1) {
          staffingWarningRanges.push({ startMinutes: currentWarningStart, endMinutes: currentMinute });
          textWarnings.push(`weniger als ${minStaffRequired} in Betreuung (${minutesToTime(currentWarningStart)}-${minutesToTime(currentMinute)})`);
          currentWarningStart = -1;
        }
        continue;
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

// --- Function to calculate daily work metrics and validate breaks ---
export const calculateDailyWorkMetrics = (shiftsForDay, categories, subCategories) => {
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;
  let totalDisposalMinutes = 0;
  const categoryTotals = {};

  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  const subCategoryMap = new Map(subCategories.map(subCat => [subCat.id, subCat]));

  categoryMap.set(PAUSE_CATEGORY.id, PAUSE_CATEGORY);

  const sortedSegments = shiftsForDay
    .flatMap(shift => shift.segments.map(s => ({ ...s, shiftId: shift.id })))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  for (const segment of sortedSegments) {
    const duration = timeToMinutes(segment.endTime) - timeToMinutes(segment.startTime);

    let effectiveCategoryId = segment.categoryId;

    if (segment.subCategoryId) {
      const subCat = subCategoryMap.get(segment.subCategoryId);
      if (subCat) {
        effectiveCategoryId = subCat.parentCategoryId;
      }
    }

    categoryTotals[effectiveCategoryId] = (categoryTotals[effectiveCategoryId] || 0) + duration;

    if (effectiveCategoryId === PAUSE_CATEGORY.id) {
      totalBreakMinutes += duration;
    } else {
      totalWorkMinutes += duration;
    }

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

  // Determine the latest break start time for visual marker
  let visualBreakMarkerTime = null;
  if (totalWorkMinutes > 6 * 60 && totalBreakMinutes < MIN_BREAK_AFTER_6_HOURS) {
    let currentWorkTime = 0;
    for (const segment of sortedSegments) {
      let effectiveCategoryIdForSegment = segment.categoryId;
      if (segment.subCategoryId) {
        const subCat = subCategoryMap.get(segment.subCategoryId);
        if (subCat) effectiveCategoryIdForSegment = subCat.parentCategoryId;
      }

      if (effectiveCategoryIdForSegment !== PAUSE_CATEGORY.id) {
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
    categoryTotals,
    totalWorkMinutes,
    totalBreakMinutes,
    totalDisposalMinutes,
    warnings,
    visualBreakMarkerTime,
  };
};
