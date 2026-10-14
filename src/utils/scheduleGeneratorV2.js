import { timeToMinutes, minutesToTime, isTimeInRanges } from './timeUtils';
import {
  WEEK_DAYS_PLAN,
  PAUSE_CATEGORY,
  MIN_BREAK_AFTER_6_HOURS,
  MIN_BREAK_AFTER_9_HOURS,
  MAX_DAILY_WORK_MINUTES
} from '../constants/scheduleConstants';

/**
 * Hilfsfunktion zum Klonen von Objekten
 */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Prüft, ob eine Arbeitskraft Vollzeit ist (mindestens 38.5 Stunden / Woche)
 */
export const isFullTimeEmployee = (employee) => {
  if (!employee) return false;
  const hours = Number(employee.contractedHoursPerWeek) || 0;
  return hours >= 38.0;
};

/**
 * Findet die primäre Betreuungskategorie zuverlässig aus den übergebenen Kategorien:
 * 1. isCareCategory === true
 * 2. Kategorie mit Name "Betreuung" (case-insensitive)
 * 3. Erste Kategorie, die weder PAUSE noch Verfügungszeit ist
 * 4. Fallback auf die erste Kategorie
 */
export const findCareCategory = (categories) => {
  if (!categories || categories.length === 0) return null;
  const flagged = categories.find(c => c.isCareCategory);
  if (flagged) return flagged;
  const named = categories.find(c => c.name && c.name.toLowerCase().includes('betreuung'));
  if (named) return named;
  const nonDisposal = categories.find(c => !c.isDisposalTimeCategory && c.id !== PAUSE_CATEGORY.id);
  if (nonDisposal) return nonDisposal;
  return categories[0];
};

/**
 * Findet die Verfügungszeit-Kategorie:
 */
export const findDisposalCategory = (categories) => {
  if (!categories || categories.length === 0) return null;
  return categories.find(c => c.isDisposalTimeCategory) || null;
};

/**
 * Berechnet das Soll an Verfügungszeit in Minuten für einen Mitarbeiter
 */
export const getEmployeeTargetDisposalMinutes = (employee, disposalTimeRules = []) => {
  if (!employee) return 0;
  if (employee.overriddenDisposalHours !== null && employee.overriddenDisposalHours !== undefined && employee.overriddenDisposalHours !== '') {
    const val = Number(employee.overriddenDisposalHours);
    return isNaN(val) ? 0 : Math.round(val * 60);
  }
  const empContracted = Number(employee.contractedHoursPerWeek) || 0;
  const matchedRule = disposalTimeRules.find(r => Number(r.contractedHours) === empContracted);
  if (matchedRule && matchedRule.disposalHours !== undefined) {
    const val = Number(matchedRule.disposalHours);
    if (isNaN(val)) return 0;

    const isSpecialType = employee.type !== 'normal' && employee.type !== 'zusatzkraft';
    const numPresenceDays = (employee.presenceDays || []).length;
    if (isSpecialType && numPresenceDays > 0 && numPresenceDays < WEEK_DAYS_PLAN.length) {
      return Math.round(((val * 60 / WEEK_DAYS_PLAN.length) * numPresenceDays) / 15) * 15;
    }

    return Math.round(val * 60);
  }
  return 0;
};

/**
 * Findet die Leitungsfreistellungs-Kategorie:
 */
export const findLeadershipCategory = (categories) => {
  if (!categories || categories.length === 0) return null;
  const flagged = categories.find(c => c.isLeadershipReleaseCategory);
  if (flagged) return flagged;
  const named = categories.find(c => c.name && c.name.toLowerCase().includes('leitungsfreistellung'));
  if (named) return named;
  return null;
};

/**
 * Berechnet das Soll an Leitungsfreistellung in Minuten für einen Mitarbeiter
 */
export const getEmployeeTargetLeadershipMinutes = (employee) => {
  if (!employee) return 0;
  const percent = Number(employee.leadershipReleasePercent) || 0;
  if (percent <= 0) return 0;
  const contractedHours = Number(employee.contractedHoursPerWeek) || 0;
  const totalMinutes = contractedHours * 60;
  return Math.round((totalMinutes * (percent / 100)) / 15) * 15;
};

/**
 * Berechnet das Soll an Betreuung in Minuten für einen Mitarbeiter
 * (Wichtig: Leitungsfreistellung und VZ gehen vom Gesamtbudget ab,
 * Leitungsfreistellung wird immer auf Kosten der Betreuung gemacht, nie auf Kosten der Verfügung)
 */
export const getEmployeeTargetCareMinutes = (employee, disposalTimeRules = []) => {
  if (!employee) return 0;
  const contractedMinutes = Math.round((Number(employee.contractedHoursPerWeek) || 0) * 60);
  const disposalMinutes = getEmployeeTargetDisposalMinutes(employee, disposalTimeRules);
  const leadershipMinutes = getEmployeeTargetLeadershipMinutes(employee);
  return Math.max(0, contractedMinutes - disposalMinutes - leadershipMinutes);
};

/**
 * Berechnet die tatsächliche bezahlte Arbeitszeit eines Mitarbeiters an einem Tag (in Minuten)
 * (Pause zählt nach ArbZG NICHT zur bezahlten Arbeitszeit!)
 */
export const getEmployeeDailyMinutes = (employeeId, dayOfWeek, shifts) => {
  const dayShifts = shifts.filter(s => s.employeeId === employeeId && s.dayOfWeek === dayOfWeek);
  let totalMinutes = 0;

  dayShifts.forEach(shift => {
    shift.segments.forEach(segment => {
      if (segment.categoryId === PAUSE_CATEGORY.id) return;
      const start = timeToMinutes(segment.startTime);
      const end = timeToMinutes(segment.endTime);
      if (end > start) {
        totalMinutes += (end - start);
      }
    });
  });

  return totalMinutes;
};

/**
 * Berechnet die wöchentlichen Arbeitsstunden eines Mitarbeiters
 */
export const getEmployeeWeeklyHours = (employeeId, shifts) => {
  let totalMinutes = 0;
  WEEK_DAYS_PLAN.forEach(day => {
    totalMinutes += getEmployeeDailyMinutes(employeeId, day, shifts);
  });
  return totalMinutes / 60;
};

/**
 * Prüft, ob ein Mitarbeiter an einem bestimmten Tag einsetzbar ist:
 * - Krankheitstagen
 * - Schultagen (Azubi/FSJ/Praktikant) – außer includeApprenticeSchoolDays ist aktiv (Blockwoche)
 * - Festen freien Tagen (requirementType === 'fixed' && dayOff)
 */
export const isEmployeeAvailableOnDay = (employee, dayOfWeek, sickDays = {}, options = {}) => {
  if ((sickDays[employee.id] || []).includes(dayOfWeek)) {
    return { available: false, reason: 'Krank gemeldet' };
  }
  const wish = employee.wishes?.[dayOfWeek];
  if (wish && wish.requirementType === 'fixed' && wish.dayOff) {
    return { available: false, reason: 'Fester freier Tag' };
  }
  return { available: true };
};

/**
 * Prüft, ob ein Zeitfenster für einen Mitarbeiter gültig ist unter Beachtung von festen Vorgaben:
 */
export const isTimeWindowValidForEmployee = (employee, dayOfWeek, startMinutes, endMinutes, sickDays = {}) => {
  const dayCheck = isEmployeeAvailableOnDay(employee, dayOfWeek, sickDays);
  if (!dayCheck.available) {
    return { valid: false, reason: dayCheck.reason };
  }

  const wish = employee.wishes?.[dayOfWeek];
  if (wish && wish.requirementType === 'fixed') {
    if (wish.startTime) {
      const fixedStart = timeToMinutes(wish.startTime);
      if (startMinutes < fixedStart) {
        return { valid: false, reason: `Dienstbeginn vor fester Zeitgrenze (${wish.startTime})` };
      }
    }
    if (wish.endTime) {
      const fixedEnd = timeToMinutes(wish.endTime);
      if (endMinutes > fixedEnd) {
        return { valid: false, reason: `Dienstende nach fester Zeitgrenze (${wish.endTime})` };
      }
    }
    if (wish.shiftType === 'early' && startMinutes >= 12 * 60) {
      return { valid: false, reason: 'Nur Frühschichten erlaubt' };
    }
    if (wish.shiftType === 'late' && endMinutes <= 13 * 60) {
      return { valid: false, reason: 'Nur Spätschichten erlaubt' };
    }
  }

  return { valid: true };
};

/**
 * Erstellt Schichtsegmente mit gesetzeskonformer Pause nach ArbZG:
 * - workMinutes: Reine bezahlte Netto-Arbeitszeit.
 * - Ist workMinutes <= 6 Stunden (360 Min): Keine Pause erforderlich.
 * - Ist workMinutes > 6 Stunden und <= 9 Stunden: Genau 30 Minuten Pause einfügen.
 *   Die Gesamtanwesenheit verlängert sich exakt um 30 Minuten.
 * - Ist workMinutes > 9 Stunden: 45 Minuten Pause.
 */
export const buildShiftSegmentsWithBreaks = (workMinutes, desiredStartMin, categoryId, overriddenGroupId = null, preferredBreakStartMin = null) => {
  const segments = [];
  const start = desiredStartMin;

  if (workMinutes <= 6 * 60) {
    segments.push({
      categoryId,
      subCategoryId: '',
      startTime: minutesToTime(start),
      endTime: minutesToTime(start + workMinutes),
      overriddenGroupId
    });
    return { segments, totalSpanMinutes: workMinutes };
  }

  const breakDuration = workMinutes > 9 * 60 ? 45 : 30;

  // Standard-Pause nach ArbZG: Spätestens nach 6 Stunden (360 Min), sinnvoll zwischen 3.5h und 5h
  let breakStart;
  if (preferredBreakStartMin !== null) {
    // Prüfe, ob preferredBreakStartMin die ArbZG-Bedingung erfüllt (mind. 150m nach Start und spätestens vor 6h Arbeit)
    const minBreakStart = start + 150;
    const maxBreakStart = start + 330;
    breakStart = Math.min(maxBreakStart, Math.max(minBreakStart, preferredBreakStartMin));
  } else {
    let firstWorkSpan = Math.min(330, Math.max(180, Math.round((workMinutes / 2) / 15) * 15));
    if (workMinutes - firstWorkSpan > 6 * 60) {
      firstWorkSpan = workMinutes - (5.5 * 60);
    }
    breakStart = start + firstWorkSpan;
  }

  // Auf 15-Minuten-Raster runden
  breakStart = Math.round(breakStart / 15) * 15;
  const breakEnd = breakStart + breakDuration;
  const firstWorkSpan = breakStart - start;
  const secondWorkSpan = workMinutes - firstWorkSpan;
  const shiftEnd = breakEnd + secondWorkSpan;

  segments.push({
    categoryId,
    subCategoryId: '',
    startTime: minutesToTime(start),
    endTime: minutesToTime(breakStart),
    overriddenGroupId
  });

  segments.push({
    categoryId: PAUSE_CATEGORY.id,
    subCategoryId: '',
    startTime: minutesToTime(breakStart),
    endTime: minutesToTime(breakEnd)
  });

  segments.push({
    categoryId,
    subCategoryId: '',
    startTime: minutesToTime(breakEnd),
    endTime: minutesToTime(shiftEnd),
    overriddenGroupId
  });

  return { segments, totalSpanMinutes: shiftEnd - start };
};

/**
 * Kernfunktion zur genauen Berechnung von Unterbesetzungen in Gruppen.
 * Stimmt 1:1 mit der Prüfung in laborLaw.js überein.
 */
export const calculateGroupDeficits = (groups, employees, shifts, careCategoryId, sickDays = {}, subCategories = []) => {
  const deficits = [];

  groups.forEach(group => {
    if (group.disableStaffingWarning) return;
    const minStaff = group.minStaffRequired ?? 2;

    WEEK_DAYS_PLAN.forEach(day => {
      const isOpen = group.daysWithOpeningHours?.[day] ?? false;
      const hours = group.openingHours?.[day] || [];
      if (!isOpen || hours.length === 0) return;

      const coverage = new Array(24 * 60).fill(0);
      const realEducatorCoverage = new Array(24 * 60).fill(0);

      shifts.filter(s => s.dayOfWeek === day).forEach(shift => {
        const emp = employees.find(e => e.id === shift.employeeId);
        if (!emp) return;
        if ((sickDays[emp.id] || []).includes(day)) return;
        
        const isSpecialType = emp.type !== 'normal' && emp.type !== 'zusatzkraft' && emp.type !== 'leitung' && emp.type !== 'stellv_leitung';
        const isPracticeDay = (emp.presenceDays || []).includes(day);
        
        if (isSpecialType && !isPracticeDay) return; // Zählen an Nicht-Praxistagen null

        shift.segments.forEach(seg => {
          let effectiveCatId = seg.categoryId;
          if (seg.subCategoryId) {
            const sub = subCategories.find(sc => sc.id === seg.subCategoryId);
            if (sub) effectiveCatId = sub.parentCategoryId;
          }
          if (effectiveCatId !== careCategoryId) return;

          const assignedGroup = seg.overriddenGroupId || emp.groupId;
          if (assignedGroup !== group.id) return;

          const sMin = timeToMinutes(seg.startTime);
          const eMin = timeToMinutes(seg.endTime);
          for (let m = sMin; m < eMin; m++) {
            if (m >= 0 && m < 24 * 60) {
              coverage[m]++;
              if (!isSpecialType) realEducatorCoverage[m]++;
            }
          }
        });
      });

      hours.forEach(range => {
        const rStart = timeToMinutes(range.start);
        const rEnd = timeToMinutes(range.end);

        for (let m = rStart; m < rEnd; m += 15) {
          const timeHHMM = minutesToTime(m);
          if (group.edgeTimes?.[day] && isTimeInRanges(timeHHMM, group.edgeTimes[day])) {
            continue;
          }

          let minStaffInSlot = Infinity;
          let realEducatorsInSlot = Infinity;
          const slotEnd = Math.min(m + 15, rEnd);
          for (let t = m; t < slotEnd; t++) {
            minStaffInSlot = Math.min(minStaffInSlot, coverage[t]);
            realEducatorsInSlot = Math.min(realEducatorsInSlot, realEducatorCoverage[t]);
          }

          const missingTotal = Math.max(0, minStaff - minStaffInSlot);
          const missingReal = Math.max(0, 1 - realEducatorsInSlot);
          const missingCount = Math.max(missingTotal, missingReal);

          if (missingCount > 0) {
            deficits.push({
              groupId: group.id,
              groupName: group.name,
              dayOfWeek: day,
              startMinute: m,
              endMinute: slotEnd,
              missingCount: missingCount,
              minStaffRequired: minStaff,
              actualStaff: minStaffInSlot
            });
          }
        }
      });
    });
  });

  return deficits;
};

/**
 * Berechnet für alle Mitarbeiter die tatsächliche bezahlte Arbeitszeit (ohne Pause)
 * aus der shifts-Liste.
 */
const computeAssignedMinutesMap = (shifts) => {
  const map = {};
  shifts.forEach(shift => {
    if (!map[shift.employeeId]) map[shift.employeeId] = 0;
    shift.segments.forEach(seg => {
      if (seg.categoryId === PAUSE_CATEGORY.id) return;
      const s = timeToMinutes(seg.startTime);
      const e = timeToMinutes(seg.endTime);
      if (e > s) map[shift.employeeId] += (e - s);
    });
  });
  return map;
};

/**
 * VOLLSTÄNDIGER DIENSTPLAN-GENERATOR
 *
 * Präzise Sollstunden-Einhaltung & Lückenlose Betreuung:
 * 1. Feste Vorgaben verankern.
 * 2. Berechne für jeden Mitarbeiter ein exaktes Tagesziel (z.B. 39h auf 5 Tage = 4x 7h45 + 1x 8h00).
 * 3. Schichten tageweise den Gruppenöffnungszeiten zuteilen (Früh/Spät/Mitte), OHNE das Sollkontingent zu überziehen!
 * 4. Verfügungszeit (VZ) wird INNERHALB des bezahlten Stundenbudgets als VZ-Kategorie markiert,
 *    sodass VZ niemals zusätzliche Überstunden erzeugt.
 */
export const generateFullSchedule = ({
  groups = [],
  employees = [],
  categories = [],
  subCategories = [],
  disposalTimeRules = [],
  facilitySettings = null,
  sickDays = {},
  options = {
    honorWishes: true,
    targetMaxDailyHours: 8.5,
    toleranceWeeklyHours: 0,
    includeTeamMeetings: true,
  }
}) => {
  const careCategory = findCareCategory(categories);
  const disposalCategory = findDisposalCategory(categories);
  const leadershipCategory = findLeadershipCategory(categories);

  if (!careCategory) {
    throw new Error('Es konnte keine Betreuungskategorie gefunden werden. Bitte lege eine Kategorie für "Betreuung" an.');
  }

  const toleranceMinutes = Math.round((Number(options.toleranceWeeklyHours) || 0) * 60);

  // 1. Mitarbeiter initialisieren
  const employeePool = employees.map(emp => {
    const contractedHours = Number(emp.contractedHoursPerWeek) || 0;
    const targetWeeklyMinutes = Math.round(contractedHours * 60);

    const targetDisposalMinutes = disposalCategory
      ? getEmployeeTargetDisposalMinutes(emp, disposalTimeRules)
      : 0;
    const targetLeadershipMinutes = (leadershipCategory && emp.leadershipReleasePercent > 0)
      ? getEmployeeTargetLeadershipMinutes(emp)
      : 0;
    // Berechne voraussichtlichen Teamsitzungs-Bedarf
    let teamMeetingBudget = 0;
    const teamMeetings = facilitySettings?.teamMeetings || [];
    const shouldIncludeMeetings = options.includeTeamMeetings !== false;

    if (shouldIncludeMeetings && teamMeetings.length > 0) {
      teamMeetings.forEach(meeting => {
        const day = meeting.day;
        if (!WEEK_DAYS_PLAN.includes(day)) return;

        const meetStart = timeToMinutes(meeting.startTime);
        const meetEnd = timeToMinutes(meeting.endTime);
        const meetDuration = meetEnd - meetStart;
        if (meetDuration <= 0) return;

        const fullTime = contractedHours >= 38; 
        if (meeting.participantScope === 'fulltime_only' && !fullTime) return;
        if (meeting.meetingType === 'group_internal' && meeting.targetGroupId && emp.groupId !== meeting.targetGroupId) return;
        if (options.honorWishes && emp.wishes?.[day]?.dayOff && emp.wishes?.[day]?.requirementType === 'fixed') return;

        const isBiweeklyPartTime = meeting.interval === 'biweekly' && !fullTime;
        let isOutsideNormalHours = false;
        const empGroup = groups.find(g => g.id === emp.groupId) || groups[0];
        const groupHours = empGroup?.openingHours?.[day] || [];
        
        let groupEndMin = 960; // 16:00
        if (groupHours.length > 0) {
          groupEndMin = Math.max(...groupHours.map(r => timeToMinutes(r.end)));
          if (meetEnd > groupEndMin || meetStart >= groupEndMin) isOutsideNormalHours = true;
        } else if (meetStart >= 960) {
          isOutsideNormalHours = true;
        }

        // NUR Meetings, die außerhalb der regulären Gruppen-Öffnungszeiten liegen,
        // verlängern die Arbeitszeit über den Tagesdienst hinaus.
        if (isOutsideNormalHours) {
          let effectiveDuration = meetDuration;
          if (isBiweeklyPartTime) {
            effectiveDuration = Math.round((meetDuration / 2) / 15) * 15;
            effectiveDuration = Math.max(15, effectiveDuration);
          }
          teamMeetingBudget += effectiveDuration;
        }
      });
    }

    const planningTargetWeeklyMinutes = targetWeeklyMinutes;

    // Wichtig: die leitungsfreistellung wird immer auf kosten der betreuung gemacht, nie auf kosten der Verfügung!
    const targetCareMinutes = Math.max(0, targetWeeklyMinutes - targetDisposalMinutes - targetLeadershipMinutes);

    const availableDays = WEEK_DAYS_PLAN.filter(day => {
      const check = isEmployeeAvailableOnDay(emp, day, sickDays, options);
      if (!check.available) return false;

      // Wenn Mitarbeiterwünsche berücksichtigt werden sollen und der Mitarbeiter einen Wunsch nach freiem Tag hat:
      // Schließe diesen Tag von der Soll-Berechnung aus, solange ihm noch mindestens 1 Arbeitstag verbleibt!
      if (options.honorWishes && emp.wishes?.[day]?.dayOff) {
        const otherAvailableDays = WEEK_DAYS_PLAN.filter(d => {
          if (d === day) return false;
          return isEmployeeAvailableOnDay(emp, d, sickDays, options).available;
        });
        if (otherAvailableDays.length > 0) {
          return false;
        }
      }
      return true;
    });

    // Verteile die planningTargetWeeklyMinutes (Netto) exakt auf die availableDays (auf 15-Minuten-Raster)
    const dayTargetMap = {};
    if (availableDays.length > 0) {
      let rem = planningTargetWeeklyMinutes;
      const basePerDay = Math.floor((planningTargetWeeklyMinutes / availableDays.length) / 15) * 15;
      availableDays.forEach((day) => {
        dayTargetMap[day] = basePerDay;
        rem -= basePerDay;
      });
      // Rest-Minuten in 15er Schritten auf die ersten Tage verteilen
      let dayIdx = 0;
      while (rem >= 15 && dayIdx < availableDays.length) {
        dayTargetMap[availableDays[dayIdx]] += 15;
        rem -= 15;
        dayIdx++;
      }
    }

    return {
      ...emp,
      contractedHours,
      targetWeeklyMinutes,
      planningTargetWeeklyMinutes,
      targetDisposalMinutes,
      targetLeadershipMinutes,
      targetCareMinutes,
      availableDays,
      dayTargetMap,
      assignedWeeklyMinutes: 0,
      assignedCareMinutes: 0,
      assignedDisposalMinutes: 0,
      assignedLeadershipMinutes: 0,
      dailyMinutes: {
        Montag: 0,
        Dienstag: 0,
        Mittwoch: 0,
        Donnerstag: 0,
        Freitag: 0,
      }
    };
  });

  const newShifts = [];

  // ===== DIAGNOSTIK START =====
  const _diagLog = {};
  const _diagSnapshot = (phase) => {
    employeePool.forEach(emp => {
      if (!_diagLog[emp.id]) _diagLog[emp.id] = { name: emp.name, target: emp.planningTargetWeeklyMinutes, targetTotal: emp.targetWeeklyMinutes, phases: {} };
      // Berechne tatsächliche Minuten aus Segmenten
      let actualMin = 0;
      newShifts.filter(s => s.employeeId === emp.id).forEach(s => {
        s.segments.forEach(seg => {
          if (seg.categoryId === '_pause_system_id') return;
          const sm = timeToMinutes(seg.startTime);
          const em = timeToMinutes(seg.endTime);
          if (em > sm) actualMin += (em - sm);
        });
      });
      _diagLog[emp.id].phases[phase] = { actual: actualMin, internal: emp.assignedWeeklyMinutes };
    });
  };
  // ===== DIAGNOSTIK END =====


  const addShift = (employeeId, dayOfWeek, segments) => {
    let existingShift = newShifts.find(s => s.employeeId === employeeId && s.dayOfWeek === dayOfWeek);
    if (!existingShift) {
      existingShift = {
        id: `gen-shift-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        employeeId,
        dayOfWeek,
        segments: []
      };
      newShifts.push(existingShift);
    }
    existingShift.segments.push(...segments);
    existingShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  };

  const getGroupCoverageAtMinute = (groupId, day, minute, minStaff = 2, excludeEmployeeId = null) => {
    let count = 0;
    let realCount = 0;
    newShifts.filter(s => s.dayOfWeek === day).forEach(s => {
      if (s.employeeId === excludeEmployeeId) return;
      const emp = employeePool.find(e => e.id === s.employeeId);
      if (!emp) return;

      const isSick = (sickDays[emp.id] || []).includes(day);
      if (isSick) return;

      const isSpecialType = emp.type !== 'normal' && emp.type !== 'zusatzkraft' && emp.type !== 'leitung' && emp.type !== 'stellv_leitung';
      const isPracticeDay = (emp.presenceDays || []).includes(day);
      if (isSpecialType && !isPracticeDay) return;

      s.segments.forEach(seg => {
        if (seg.categoryId !== careCategory.id) return;
        const assigned = seg.overriddenGroupId || emp.groupId;
        if (assigned !== groupId) return;
        const sM = timeToMinutes(seg.startTime);
        const eM = timeToMinutes(seg.endTime);
        if (minute >= sM && minute < eM) {
          count++;
          if (!isSpecialType) realCount++;
        }
      });
    });
    const missing = Math.max(minStaff - count, 1 - realCount);
    return minStaff - missing;
  };

  // PHASE 1: Feste Vorgaben (🔒 feste Zeiten) eintragen
  WEEK_DAYS_PLAN.forEach(day => {
    employeePool.forEach(emp => {
      const wish = emp.wishes?.[day];
      if (wish && wish.requirementType === 'fixed' && !wish.dayOff && wish.startTime && wish.endTime) {
        const sMin = timeToMinutes(wish.startTime);
        const eMin = timeToMinutes(wish.endTime);
        const rawDuration = eMin - sMin;
        if (rawDuration > 0) {
          const workMin = rawDuration > 6 * 60 ? rawDuration - 30 : rawDuration;
          const { segments } = buildShiftSegmentsWithBreaks(workMin, sMin, careCategory.id, null);
          addShift(emp.id, day, segments);

          emp.assignedWeeklyMinutes += workMin;
          emp.assignedCareMinutes += workMin;
          emp.dailyMinutes[day] += workMin;
        }
      }
    });
  });

  _diagSnapshot('Phase1_FesteVorgaben');
  // PHASE 1.5: Leitungsabdeckung am Abend fixieren
  // Wenn die Option aktiv ist, wird VOR der normalen Kernbesetzung sichergestellt,
  // dass eine Leitungskraft die späteste Schicht im Haus abdeckt.
  if (facilitySettings?.requireLeadershipUntilClose) {
    WEEK_DAYS_PLAN.forEach(day => {
      let facilityEndMin = 0;
      let lateGroup = null;
      groups.forEach(g => {
        if (g.daysWithOpeningHours?.[day]) {
          (g.openingHours?.[day] || []).forEach(r => {
            const end = timeToMinutes(r.end);
            if (end > facilityEndMin) {
              facilityEndMin = end;
              lateGroup = g;
            }
          });
        }
      });

      if (facilityEndMin > 0 && lateGroup) {
        const existingLateLeader = employeePool.find(emp => 
           Number(emp.leadershipReleasePercent) > 0 && 
           newShifts.some(s => s.employeeId === emp.id && s.dayOfWeek === day && timeToMinutes(s.segments[s.segments.length-1]?.endTime || '00:00') >= facilityEndMin)
        );

        if (!existingLateLeader) {
          const leaderCands = employeePool.filter(emp => 
            Number(emp.leadershipReleasePercent) > 0 &&
            isEmployeeAvailableOnDay(emp, day, sickDays, options).available &&
            emp.dailyMinutes[day] === 0 &&
            ((emp.planningTargetWeeklyMinutes + toleranceMinutes) - emp.assignedWeeklyMinutes) >= 120
          ).sort((a, b) => {
            return (a.lateShiftsCount || 0) - (b.lateShiftsCount || 0);
          });

          if (leaderCands.length > 0) {
            const chosen = leaderCands[0];
            const remainingForEmp = (chosen.planningTargetWeeklyMinutes + toleranceMinutes) - chosen.assignedWeeklyMinutes;
            const plannedDaily = chosen.dayTargetMap[day] || chosen.targetDailyMinutes || 360;
            let targetDaily = Math.min(plannedDaily, remainingForEmp);
            targetDaily = Math.min(Math.round((options.targetMaxDailyHours || 8.5) * 60), targetDaily);
            targetDaily = Math.max(120, Math.floor(targetDaily / 15) * 15);

            const pauseTime = targetDaily > 6 * 60 ? 30 : 0;
            const totalSpan = targetDaily + pauseTime;
            
            let startMin = facilityEndMin - totalSpan;
            startMin = Math.max(0, Math.round(startMin / 15) * 15);
            
            // Die Leitung bleibt in ihrer eigenen Gruppe (null).
            // Wenn ihre Gruppe früher schließt, wird die Zeit danach zu VZ/LF, was genau das ist,
            // was eine Leitungskraft für Büroarbeit am Nachmittag braucht.
            const isOverriddenGroup = null;
            
            const { segments } = buildShiftSegmentsWithBreaks(
              targetDaily,
              startMin,
              careCategory.id,
              isOverriddenGroup,
              null
            );
            
            addShift(chosen.id, day, segments);
            chosen.assignedWeeklyMinutes += targetDaily;
            chosen.assignedCareMinutes += targetDaily;
            chosen.dailyMinutes[day] += targetDaily;
            chosen.lateShiftsCount = (chosen.lateShiftsCount || 0) + 1;
          }
        }
      }
    });
  }

  _diagSnapshot('Phase1.5_Leitung');
  // PHASE 2: Öffnungszeiten & Mindestbesetzung der Gruppen bedienen
  // Wichtig: Gruppen mit langen Öffnungszeiten (GT / Ganztagsbetreuung) ZUERST bedienen!
  // Dadurch werden Stammkräfte und Springer optimal auf die anspruchsvollen Gruppen verteilt.
  const sortedGroups = [...groups].sort((a, b) => {
    // Ermittle maximale Öffnungsdauer der Gruppen
    let maxA = 0;
    let maxB = 0;
    WEEK_DAYS_PLAN.forEach(day => {
      (a.openingHours?.[day] || []).forEach(r => {
        maxA = Math.max(maxA, timeToMinutes(r.end) - timeToMinutes(r.start));
      });
      (b.openingHours?.[day] || []).forEach(r => {
        maxB = Math.max(maxB, timeToMinutes(r.end) - timeToMinutes(r.start));
      });
    });
    return maxB - maxA;
  });

  WEEK_DAYS_PLAN.forEach(day => {
    let facilityEndMin = 0;
    groups.forEach(g => {
      if (g.daysWithOpeningHours?.[day]) {
        (g.openingHours?.[day] || []).forEach(r => {
          facilityEndMin = Math.max(facilityEndMin, timeToMinutes(r.end));
        });
      }
    });

    sortedGroups.forEach(group => {
      if (group.disableStaffingWarning) return;
      const isOpen = group.daysWithOpeningHours?.[day] ?? false;
      const hours = group.openingHours?.[day] || [];
      if (!isOpen || hours.length === 0) return;

      const minStaff = group.minStaffRequired ?? 2;

      hours.forEach(range => {
        const rStart = timeToMinutes(range.start);
        const rEnd = timeToMinutes(range.end);
        const openingSpan = rEnd - rStart;

        let maxIterations = 20;
        while (maxIterations-- > 0) {
          // Lücke ermitteln: Prüfe ZUERST Spätdienste (bis rEnd), dann Frühdienste (ab rStart), dann interne Lücken!
          const lateCoverage = getGroupCoverageAtMinute(group.id, day, rEnd - 15, minStaff);
          const earlyCoverage = getGroupCoverageAtMinute(group.id, day, rStart, minStaff);

          let worstDeficit = 0;
          let worstMinute = -1;
          let shiftRole = 'middle';

          if (lateCoverage < minStaff) {
            worstDeficit = minStaff - lateCoverage;
            worstMinute = rEnd - 15;
            shiftRole = 'late';
          } else if (earlyCoverage < minStaff) {
            worstDeficit = minStaff - earlyCoverage;
            worstMinute = rStart;
            shiftRole = 'early';
          } else {
            // Wenn beide Randzeiten besetzt sind, suche die größte Lücke im Tagesverlauf
            for (let m = rStart; m < rEnd; m += 15) {
              const timeHHMM = minutesToTime(m);
              if (group.edgeTimes?.[day] && isTimeInRanges(timeHHMM, group.edgeTimes[day])) {
                continue;
              }
              const currentStaff = getGroupCoverageAtMinute(group.id, day, m, minStaff);
              const deficit = minStaff - currentStaff;
              if (deficit > worstDeficit) {
                worstDeficit = deficit;
                worstMinute = m;
              }
            }

            if (worstMinute >= rEnd - 150) {
              shiftRole = 'late';
            } else if (worstMinute <= rStart + 60) {
              shiftRole = 'early';
            } else if (worstMinute < rStart + (openingSpan / 2)) {
              shiftRole = 'early_mid';
            }
          }

          if (worstDeficit <= 0 || worstMinute === -1) {
            break; // Alles besetzt!
          }

          // Kandidaten suchen, die an diesem Tag verfügbar sind und noch Stundenbudget haben:
          // Stammkräfte werden bevorzugt. Gibt es in der Gruppe keine freien Kräfte mehr,
          // dürfen Springer oder Erzieher aus Nicht-GT-Gruppen mit overriddenGroupId aushelfen!
          let candidates = employeePool.filter(emp => {
            const isSpecialType = emp.type !== 'normal' && emp.type !== 'zusatzkraft' && emp.type !== 'leitung' && emp.type !== 'stellv_leitung';
            const isPracticeDay = (emp.presenceDays || []).includes(day);
            if (isSpecialType && !isPracticeDay) return false; // Nicht-Praxistage beheben keine Defizite

            const isGroupMatch = emp.groupId === group.id || !emp.groupId;
            const allowCrossGroup = true; // Jeder Erzieher kann auch als Vertretung/Aushilfe in einer anderen Gruppe Betreuung machen!
            if (!isGroupMatch && !allowCrossGroup) return false;

            const check = isEmployeeAvailableOnDay(emp, day, sickDays, options);
            if (!check.available) return false;
            if (emp.dailyMinutes[day] > 0) return false;

            // Hat er noch Budget? Mindestens 2h müssen ins Soll passen
            const remainingBudget = (emp.planningTargetWeeklyMinutes + toleranceMinutes) - emp.assignedWeeklyMinutes;
            return remainingBudget >= 120;
          }).sort((a, b) => {
            if (shiftRole === 'late') {
              // Leitungsabdeckung am Tagesende erzwingen - HÖCHSTE PRIORITÄT (vor Stammkraft!)
              if (facilitySettings?.requireLeadershipUntilClose && rEnd === facilityEndMin) {
                const hasLeadershipLate = newShifts.some(s => {
                  if (s.dayOfWeek !== day) return false;
                  const e = employeePool.find(x => x.id === s.employeeId);
                  if (!e || !(e.type === 'leitung' || e.type === 'stellv_leitung' || Number(e.leadershipReleasePercent) > 0)) return false;
                  const lastSeg = s.segments[s.segments.length - 1];
                  if (!lastSeg) return false;
                  return timeToMinutes(lastSeg.endTime) >= facilityEndMin;
                });

                if (!hasLeadershipLate) {
                  const isLeitungA = (a.type === 'leitung' || a.type === 'stellv_leitung' || Number(a.leadershipReleasePercent) > 0) ? 1 : 0;
                  const isLeitungB = (b.type === 'leitung' || b.type === 'stellv_leitung' || Number(b.leadershipReleasePercent) > 0) ? 1 : 0;
                  if (isLeitungB !== isLeitungA) return isLeitungB - isLeitungA;
                }
              }
            }

            if (shiftRole === 'early') {
              // Vollzeitkräfte an Tagen mit Abend-Teamsitzung NIEMALS in den Frühdienst setzen,
              // wenn ein anderer Kandidat verfügbar ist, damit keine Lücken entstehen!
              const hasEveningMeetingA = (facilitySettings?.teamMeetings || []).some(m => m.day === day && timeToMinutes(m.startTime) >= 960 && (m.participantScope !== 'parttime_only')) && isFullTimeEmployee(a);
              const hasEveningMeetingB = (facilitySettings?.teamMeetings || []).some(m => m.day === day && timeToMinutes(m.startTime) >= 960 && (m.participantScope !== 'parttime_only')) && isFullTimeEmployee(b);
              if (hasEveningMeetingA !== hasEveningMeetingB) {
                return hasEveningMeetingA ? 1 : -1;
              }
            }

            if (shiftRole === 'late') {
              // Vollzeitkräfte an Tagen mit Teamsitzung für Spätdienste priorisieren,
              // damit sie nahtlos bis zum Beginn der Sitzung im Haus bleiben
              const hasMeetingTodayA = (facilitySettings?.teamMeetings || []).some(m => m.day === day && (m.participantScope !== 'parttime_only')) && isFullTimeEmployee(a);
              const hasMeetingTodayB = (facilitySettings?.teamMeetings || []).some(m => m.day === day && (m.participantScope !== 'parttime_only')) && isFullTimeEmployee(b);
              if (hasMeetingTodayA !== hasMeetingTodayB) {
                return hasMeetingTodayA ? -1 : 1;
              }
            }

            const isStammA = a.groupId === group.id ? 1 : 0;
            const isStammB = b.groupId === group.id ? 1 : 0;
            if (isStammB !== isStammA) return isStammB - isStammA;

            if (shiftRole === 'late') {
              const lateA = a.lateShiftsCount || 0;
              const lateB = b.lateShiftsCount || 0;
              if (lateA !== lateB) return lateA - lateB;
            }

            const remA = a.planningTargetWeeklyMinutes - a.assignedWeeklyMinutes;
            const remB = b.planningTargetWeeklyMinutes - b.assignedWeeklyMinutes;
            return remB - remA;
          });

          // 2. WICHTIGER FALLBACK: Wenn alle Mitarbeiter an diesem Tag bereits eine Schicht haben,
          // aber immer noch eine Unterbesetzung besteht:
          // Wir suchen eine Kraft (Stammkraft oder Kollege/FSJler aus anderer Gruppe),
          // deren Schicht früher aufhört und die noch Restbudget im Tag und in der Woche hat,
          // um ihren Dienst bis zum Ende der Öffnungszeit zu verlängern (in dieser Gruppe)!
          if (candidates.length === 0) {
            const extendableCandidates = employeePool.filter(emp => {
              const isSpecialType = emp.type !== 'normal' && emp.type !== 'zusatzkraft' && emp.type !== 'leitung' && emp.type !== 'stellv_leitung';
              const isPracticeDay = (emp.presenceDays || []).includes(day);
              if (isSpecialType && !isPracticeDay) return false; // Nicht-Praxistage beheben keine Defizite

              const empShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === day);
              if (!empShift || empShift.segments.length === 0) return false;

              // Schicht muss vor rEnd aufhören
              const lastSeg = empShift.segments[empShift.segments.length - 1];
              const sEnd = timeToMinutes(lastSeg.endTime);
              if (sEnd >= rEnd) return false;

              // Hat er noch Zeit im täglichen Maximum (z.B. max 8.5h)?
              const currentDaily = emp.dailyMinutes[day] || 0;
              const maxDaily = Math.round((options.targetMaxDailyHours || 8.5) * 60);
              const remainingDailyBudget = maxDaily - currentDaily;
              if (remainingDailyBudget < 30) return false;

              // Hat er noch Wochenbudget?
              const remainingWeeklyBudget = (emp.planningTargetWeeklyMinutes + toleranceMinutes) - emp.assignedWeeklyMinutes;
              if (remainingWeeklyBudget < 30) return false;

              return true;
            }).sort((a, b) => {
              // Leitungsabdeckung bei Verlängerungen priorisieren - HÖCHSTE PRIORITÄT
              if (shiftRole === 'late' && facilitySettings?.requireLeadershipUntilClose && rEnd === facilityEndMin) {
                const hasLeadershipLate = newShifts.some(s => {
                  if (s.dayOfWeek !== day) return false;
                  const e = employeePool.find(x => x.id === s.employeeId);
                  if (!e || !(e.type === 'leitung' || e.type === 'stellv_leitung' || Number(e.leadershipReleasePercent) > 0)) return false;
                  const lastSeg = s.segments[s.segments.length - 1];
                  if (!lastSeg) return false;
                  return timeToMinutes(lastSeg.endTime) >= facilityEndMin;
                });
                if (!hasLeadershipLate) {
                  const isLeitungA = (a.type === 'leitung' || a.type === 'stellv_leitung' || Number(a.leadershipReleasePercent) > 0) ? 1 : 0;
                  const isLeitungB = (b.type === 'leitung' || b.type === 'stellv_leitung' || Number(b.leadershipReleasePercent) > 0) ? 1 : 0;
                  if (isLeitungB !== isLeitungA) return isLeitungB - isLeitungA;
                }
              }

              // Stammkräfte zuerst, sonst FSJ / Springer / Kollegen
              const isStammA = a.groupId === group.id ? 1 : 0;
              const isStammB = b.groupId === group.id ? 1 : 0;
              if (isStammB !== isStammA) return isStammB - isStammA;

              // Schichten, die am nächsten an der Lücke liegen, bevorzugen
              const shiftA = newShifts.find(s => s.employeeId === a.id && s.dayOfWeek === day);
              const shiftB = newShifts.find(s => s.employeeId === b.id && s.dayOfWeek === day);
              const endA = timeToMinutes(shiftA.segments[shiftA.segments.length - 1].endTime);
              const endB = timeToMinutes(shiftB.segments[shiftB.segments.length - 1].endTime);
              return endB - endA;
            });

            if (extendableCandidates.length > 0) {
              const extEmp = extendableCandidates[0];
              const empShift = newShifts.find(s => s.employeeId === extEmp.id && s.dayOfWeek === day);
              const lastSeg = empShift.segments[empShift.segments.length - 1];
              const extStart = timeToMinutes(lastSeg.endTime);

              // Berechne, wie viel er verlängern kann (bis zu rEnd)
              const maxAddDaily = Math.round((options.targetMaxDailyHours || 8.5) * 60) - extEmp.dailyMinutes[day];
              const maxAddWeekly = (extEmp.planningTargetWeeklyMinutes + toleranceMinutes) - extEmp.assignedWeeklyMinutes;
              const neededMinutes = rEnd - extStart;
              let addMins = Math.min(neededMinutes, Math.min(maxAddDaily, maxAddWeekly));
              addMins = Math.floor(addMins / 15) * 15;

              if (addMins >= 15) {
                const extEnd = extStart + addMins;
                const isCross = extEmp.groupId !== group.id ? group.id : (lastSeg.overriddenGroupId || null);

                // Füge das Betreuungssegment für diese Gruppe an
                empShift.segments.push({
                  categoryId: careCategory.id,
                  subCategoryId: '',
                  startTime: minutesToTime(extStart),
                  endTime: minutesToTime(extEnd),
                  overriddenGroupId: isCross
                });
                empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

                extEmp.assignedWeeklyMinutes += addMins;
                extEmp.assignedCareMinutes += addMins;
                extEmp.dailyMinutes[day] += addMins;
                continue; // Nächste Lückenprüfung!
              }
            }

            break; // Keine Kandidaten mehr
          }

          let chosen = candidates[0];
          if (options.honorWishes && candidates.length > 1) {
            const nonWishOff = candidates.find(c => !c.wishes?.[day]?.dayOff);
            if (nonWishOff) chosen = nonWishOff;
          }

          // STRIKTE TAGESARBEITSZEIT:
          // Darf das Tagesziel (dayTargetMap) und das verbleibende Restbudget NIEMALS überschreiten!
          const remainingForEmp = (chosen.planningTargetWeeklyMinutes + toleranceMinutes) - chosen.assignedWeeklyMinutes;
          const plannedDaily = chosen.dayTargetMap[day] || chosen.targetDailyMinutes || 360;
          let targetDaily = Math.min(plannedDaily, remainingForEmp);
          targetDaily = Math.min(Math.round((options.targetMaxDailyHours || 8.5) * 60), targetDaily);
          targetDaily = Math.max(120, Math.floor(targetDaily / 15) * 15);

          if (targetDaily <= 0) break;

          const pauseTime = targetDaily > 6 * 60 ? 30 : 0;
          const totalSpan = targetDaily + pauseTime;

          let startMin = rStart;
          if (shiftRole === 'late') {
            // Spätdienst MUSS bis genau zum Ende der Öffnungszeit (rEnd) gehen!
            startMin = Math.max(rStart, rEnd - totalSpan);
            startMin = Math.round(startMin / 15) * 15;
          } else if (shiftRole === 'early') {
            if (earlyCoverage >= minStaff) {
              startMin = rStart + 30; // Gestaffelter Frühdienst (z.B. 08:00 statt 07:30)
            } else {
              startMin = rStart;
            }
          } else if (shiftRole === 'early_mid') {
            if (earlyCoverage >= minStaff) {
              startMin = Math.max(rStart + 30, Math.min(worstMinute, rStart + 60));
            } else {
              startMin = Math.max(rStart, Math.min(worstMinute, rStart + 45));
            }
            startMin = Math.round(startMin / 15) * 15;
          } else {
            // Zentriere die Schicht so, dass die gefundene Lücke (worstMinute) sicher abgedeckt ist!
            startMin = Math.max(rStart, Math.min(worstMinute - 90, rEnd - totalSpan));
            startMin = Math.round(startMin / 15) * 15;
          }

          let endMin = startMin + totalSpan;
          if (endMin > rEnd) {
            endMin = rEnd;
            startMin = Math.max(rStart, endMin - totalSpan);
          }

          // Pausen-Staffelung für diese Gruppe an diesem Tag:
          // Ermittle bestehende Pausenzeiten von Kollegen in dieser Gruppe
          const existingBreaks = [];
          newShifts.filter(s => s.dayOfWeek === day).forEach(s => {
            const e = employeePool.find(emp => emp.id === s.employeeId);
            const isGrp = (e?.groupId === group.id) || s.segments.some(seg => seg.overriddenGroupId === group.id);
            if (isGrp) {
              s.segments.filter(seg => seg.categoryId === PAUSE_CATEGORY.id).forEach(pSeg => {
                existingBreaks.push({ start: timeToMinutes(pSeg.startTime), end: timeToMinutes(pSeg.endTime) });
              });
            }
          });

          // Wähle bevorzugte Pausenzeit, die weder mit bestehenden Pausen kollidiert
          // NOCH dazu führt, dass die Betreuung unter die Mindestbesetzung fällt!
          let preferredBreak = null;
          if (targetDaily > 6 * 60) {
            const breakCandidates = [
              startMin + 210, startMin + 240, startMin + 270, startMin + 300, 
              startMin + 180, startMin + 330, startMin + 150
            ];
            for (const cand of breakCandidates) {
              const candEnd = cand + 30;
              const hasBreakOverlap = existingBreaks.some(b => Math.max(cand, b.start) < Math.min(candEnd, b.end));
              if (hasBreakOverlap) continue;

              // Prüfe, ob in diesem Zeitfenster (cand bis candEnd) noch mindestens minStaff Kräfte da sind
              let coverageOk = true;
              for (let m = cand; m < candEnd; m += 15) {
                const currentCov = getGroupCoverageAtMinute(group.id, day, m, minStaff);
                // Wenn wir Pause machen, fällt unsere Kraft weg. Bleibt dann noch minStaff übrig?
                // (Hinweis: Während des Planens dieser Schicht ist der gewählte Mitarbeiter noch gar nicht in newShifts!)
                // Wenn also currentCov < minStaff ist, würde die Pause genau in ein Loch fallen.
                // Wir wollen die Pause dann legen, wenn am MEISTEN andere Kräfte da sind (z.B. >= minStaff)
                if (currentCov < minStaff) {
                  coverageOk = false;
                  break;
                }
              }

              if (coverageOk) {
                preferredBreak = cand;
                break;
              }
            }

            // Fallback falls alle Zeiten eng sind: Nimm die Zeit mit der höchsten Besetzung
            if (!preferredBreak) {
              let bestCand = breakCandidates[0];
              let maxCov = -1;
              for (const cand of breakCandidates) {
                let minCovInWindow = Infinity;
                for (let m = cand; m < cand + 30; m += 15) {
                  minCovInWindow = Math.min(minCovInWindow, getGroupCoverageAtMinute(group.id, day, m, minStaff));
                }
                if (minCovInWindow > maxCov) {
                  maxCov = minCovInWindow;
                  bestCand = cand;
                }
              }
              preferredBreak = bestCand;
            }
          }

          const isOverriddenGroup = (chosen.groupId && chosen.groupId !== group.id) ? group.id : (chosen.groupId ? null : group.id);
          const { segments } = buildShiftSegmentsWithBreaks(
            targetDaily,
            startMin,
            careCategory.id,
            isOverriddenGroup,
            preferredBreak
          );

          addShift(chosen.id, day, segments);
          chosen.assignedWeeklyMinutes += targetDaily;
          chosen.assignedCareMinutes += targetDaily;
          chosen.dailyMinutes[day] += targetDaily;
          if (shiftRole === 'late') {
            chosen.lateShiftsCount = (chosen.lateShiftsCount || 0) + 1;
          }
        }
      });
    });
  });

  _diagSnapshot('Phase2_Gruppenbesetzung');

  // PHASE 2.5: Teamsitzungen aus den Einrichtungseinstellungen eintragen
  // Findet VOR Phase 3 (Auffüllen) statt, damit das verbleibende Restbudget für jeden Mitarbeiter exakt berechnet wird!
  const teamMeetings = facilitySettings?.teamMeetings || [];
  const shouldIncludeMeetings = options.includeTeamMeetings !== false;

  if (shouldIncludeMeetings && teamMeetings.length > 0) {
    teamMeetings.forEach(meeting => {
      const day = meeting.day;
      if (!WEEK_DAYS_PLAN.includes(day)) return;

      const meetStart = timeToMinutes(meeting.startTime);
      const meetEnd = timeToMinutes(meeting.endTime);
      const meetDuration = meetEnd - meetStart;
      if (meetDuration <= 0) return;

      // Ermittle Kategorie und Unterkategorie für die Teamsitzung
      let meetingCatId = disposalCategory ? disposalCategory.id : careCategory.id;
      let meetingSubCatId = meeting.subCategoryId || '';

      if (meetingSubCatId) {
        const subCat = (subCategories || []).find(sc => sc.id === meetingSubCatId);
        if (subCat && subCat.parentCategoryId) {
          meetingCatId = subCat.parentCategoryId;
        }
      }

      employeePool.forEach(emp => {
        // Prüfe Teilnehmerkreis
        const fullTime = emp.contractedHoursPerWeek >= 38;
        if (meeting.participantScope === 'fulltime_only' && !fullTime) {
          return;
        }

        // Prüfe Gruppe bei gruppeninterner Teamsitzung
        if (meeting.meetingType === 'group_internal') {
          if (meeting.targetGroupId && emp.groupId !== meeting.targetGroupId) {
            return;
          }
        }

        // Prüfe Verfügbarkeit an diesem Wochentag (Krankheit, Azubi-Schultag)
        const check = isEmployeeAvailableOnDay(emp, day, sickDays, options);
        if (!check.available) return;

        // Fester freier Tag als Wunsch?
        if (options.honorWishes && emp.wishes?.[day]?.dayOff && emp.wishes?.[day]?.requirementType === 'fixed') {
          return;
        }

        // Prüfe, ob es sich um eine 2-wöchentliche Teamsitzung für eine Teilzeitkraft handelt
        const isBiweeklyPartTime = meeting.interval === 'biweekly' && !fullTime;

        // Anwesenheitszeiten der Gruppe ermitteln, um zu prüfen, ob die Zeit außerhalb der regulären Öffnungszeit liegt
        let isOutsideNormalHours = false;
        const empGroup = groups.find(g => g.id === emp.groupId) || groups[0];
        const groupHours = empGroup?.openingHours?.[day] || [];
        if (groupHours.length > 0) {
          const groupEndMin = Math.max(...groupHours.map(r => timeToMinutes(r.end)));
          if (meetEnd > groupEndMin || meetStart >= 960) { // 960 = 16:00 Uhr
            isOutsideNormalHours = true;
          }
        } else if (meetStart >= 960) {
          isOutsideNormalHours = true;
        }

        let effectiveDuration = meetDuration;
        let effectiveEnd = meetEnd;

        if (isBiweeklyPartTime && isOutsideNormalHours) {
          effectiveDuration = Math.round((meetDuration / 2) / 15) * 15;
          effectiveDuration = Math.max(15, effectiveDuration);
          effectiveEnd = meetStart + effectiveDuration;
        }

        const newMeetingSegment = {
          categoryId: meetingCatId,
          subCategoryId: meetingSubCatId,
          startTime: minutesToTime(meetStart),
          endTime: minutesToTime(effectiveEnd),
          isTeamMeeting: true,
          overriddenGroupId: meeting.meetingType === 'group_internal' ? (meeting.targetGroupId || emp.groupId) : null,
        };

        const empShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === day);

        if (empShift && empShift.segments.length > 0) {
          // Prüfe Überlappung mit bestehenden Segmenten an diesem Tag
          const overlappingSegs = empShift.segments.filter(seg => {
            const s = timeToMinutes(seg.startTime);
            const e = timeToMinutes(seg.endTime);
            return Math.max(s, meetStart) < Math.min(e, effectiveEnd);
          });

          if (overlappingSegs.length > 0) {
            // Schneide das Zeitfenster [meetStart, effectiveEnd] aus bestehenden Segmenten sauber heraus
            const nonOverlapping = [];
            overlappingSegs.forEach(seg => {
              const s = timeToMinutes(seg.startTime);
              const e = timeToMinutes(seg.endTime);
              // Teil vor dem Meeting
              if (s < meetStart) {
                nonOverlapping.push({ ...seg, endTime: minutesToTime(meetStart) });
              }
              // Teil nach dem Meeting
              if (e > effectiveEnd) {
                nonOverlapping.push({ ...seg, startTime: minutesToTime(effectiveEnd) });
              }
            });

            // Ersetze überlappende Segmente durch geteilte Segmente + Meeting-Segment
            empShift.segments = empShift.segments.filter(seg => !overlappingSegs.includes(seg));
            empShift.segments.push(...nonOverlapping, newMeetingSegment);
            empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          } else {
            const lastExistingSeg = empShift.segments[empShift.segments.length - 1];
            const lastExistingEnd = timeToMinutes(lastExistingSeg.endTime);
            const gap = meetStart - lastExistingEnd;

            if (fullTime && gap > 0) {
              const firstExistingSeg = empShift.segments[0];
              const firstExistingStart = timeToMinutes(firstExistingSeg.startTime);

              const wish = emp.wishes?.[day];
              const fixedWishStart = (wish && wish.requirementType === 'fixed' && wish.startTime) ? timeToMinutes(wish.startTime) : null;
              const minStaff = empGroup?.minStaffRequired ?? 2;

              let canShiftBy = 0;
              if (fixedWishStart === null) {
                for (let shiftStep = 15; shiftStep <= gap; shiftStep += 15) {
                  let stepSafe = true;
                  if (empGroup && !empGroup.disableStaffingWarning) {
                    for (let m = firstExistingStart; m < firstExistingStart + shiftStep; m += 15) {
                      const cov = getGroupCoverageAtMinute(empGroup.id, day, m, minStaff, emp.id);
                      if (cov < minStaff) {
                        stepSafe = false;
                        break;
                      }
                    }
                  }
                  if (stepSafe) {
                    canShiftBy = shiftStep;
                  } else {
                    break;
                  }
                }
              }

              if (canShiftBy > 0) {
                empShift.segments.forEach(seg => {
                  const s = timeToMinutes(seg.startTime) + canShiftBy;
                  const e = timeToMinutes(seg.endTime) + canShiftBy;
                  seg.startTime = minutesToTime(s);
                  seg.endTime = minutesToTime(e);
                });
              }

              // Nach dem Verschieben: Ist immer noch eine Lücke bis zur Teamsitzung vorhanden?
              const curLastSeg = empShift.segments[empShift.segments.length - 1];
              const curLastEnd = timeToMinutes(curLastSeg.endTime);
              const remainingGap = meetStart - curLastEnd;

              if (remainingGap > 0) {
                // Vollzeitkräfte dürfen vor der Teamsitzung NIEMALS heimgeschickt werden!
                // Überbrücke die verbleibende Zeit bis zum Beginn der Sitzung nahtlos mit VZ oder Betreuung:
                const bridgeCategory = disposalCategory ? disposalCategory.id : careCategory.id;
                empShift.segments.push({
                  categoryId: bridgeCategory,
                  subCategoryId: '',
                  startTime: minutesToTime(curLastEnd),
                  endTime: minutesToTime(meetStart),
                  overriddenGroupId: null
                });
                empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
              }
            }

            empShift.segments.push(newMeetingSegment);
            empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          }
        } else {
          addShift(emp.id, day, [newMeetingSegment]);
        }
      });
    });
  }

  // Zähler nach Phase 4c exakt mit den erstellten Segmenten synchronisieren
  employeePool.forEach(emp => {
    let careMin = 0;
    let dispMin = 0;
    let leadMin = 0;
    let totalWork = 0;
    WEEK_DAYS_PLAN.forEach(day => {
      let daily = 0;
      newShifts.filter(s => s.employeeId === emp.id && s.dayOfWeek === day).forEach(s => {
        s.segments.forEach(seg => {
          if (seg.categoryId === PAUSE_CATEGORY.id) return;
          const dur = timeToMinutes(seg.endTime) - timeToMinutes(seg.startTime);
          if (dur > 0) {
            daily += dur;
            totalWork += dur;
            if (seg.categoryId === careCategory.id) careMin += dur;
            else if (disposalCategory && seg.categoryId === disposalCategory.id) dispMin += dur;
            else if (leadershipCategory && seg.categoryId === leadershipCategory.id) leadMin += dur;
          }
        });
      });
      emp.dailyMinutes[day] = daily;
    });
    emp.assignedWeeklyMinutes = totalWork;
    emp.assignedCareMinutes = careMin;
    emp.assignedDisposalMinutes = dispMin;
    emp.assignedLeadershipMinutes = leadMin;
  });

  _diagSnapshot('Phase4c_Teamsitzungen');

  // PHASE 3: Exaktes Auffüllen auf Sollstunden (Ohne Überziehen!)
  // Jeder Mitarbeiter, der noch Reststunden im Soll hat, bekommt diese exakt zugewiesen
  employeePool.forEach(emp => {
    let remainingMinutes = emp.targetWeeklyMinutes - emp.assignedWeeklyMinutes;
    if (remainingMinutes <= 0) return;

    // 1. Zuerst noch freie Tage belegen (oder Tage, an denen bisher NUR eine Teamsitzung liegt)
    const freeDays = emp.availableDays.filter(d => {
      const existingShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === d);
      if (!existingShift || existingShift.segments.length === 0) return true;
      // Hat der Tag nur eine Teamsitzung oder Pause? Dann fehlt noch der reguläre Tagesdienst!
      return existingShift.segments.every(s => s.isTeamMeeting || s.categoryId === PAUSE_CATEGORY.id);
    });

    for (const day of freeDays) {
      remainingMinutes = emp.targetWeeklyMinutes - emp.assignedWeeklyMinutes;
      if (remainingMinutes <= 0) break;

      const wish = emp.wishes?.[day];
      if (options.honorWishes && wish && wish.requirementType !== 'fixed' && wish.dayOff && freeDays.length > 1) {
        continue;
      }

      const existingShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === day);
      const existingMeeting = existingShift?.segments.find(s => s.isTeamMeeting);
      const meetStartMin = existingMeeting ? timeToMinutes(existingMeeting.startTime) : null;

      // Zielstunden für diesen freien Tag: genau dayTargetMap oder Rest
      let hoursToAssign = Math.min(
        remainingMinutes,
        emp.dayTargetMap[day] || emp.targetDailyMinutes || 360
      );
      hoursToAssign = Math.floor(hoursToAssign / 15) * 15;
      if (hoursToAssign < 60) continue;

      const empGroup = groups.find(g => g.id === emp.groupId) || groups[0];
      const hours = empGroup?.openingHours?.[day] || [{ start: '08:00', end: '16:30' }];
      let rStart = timeToMinutes(hours[0]?.start || '08:00');

      if (wish && wish.startTime) {
        rStart = Math.max(rStart, timeToMinutes(wish.startTime));
      }

      // Staffelung: Wenn zu Dienstbeginn (z.B. 07:30) bereits mindestens minStaff Kräfte anwesend sind,
      // lasse zusätzliche Kräfte (besonders Teilzeitkräfte) um 08:00 oder 08:30 Uhr beginnen,
      // damit ihre Arbeitszeit nicht früh morgens verpufft, sondern genau in die Mittags- und Pausenzeit reicht!
      const minStaff = empGroup?.minStaffRequired ?? 2;
      if (!wish?.startTime && empGroup && !empGroup.disableStaffingWarning) {
        const covAtStart = getGroupCoverageAtMinute(empGroup.id, day, rStart, minStaff);
        if (covAtStart >= minStaff) {
          const pauseTime = hoursToAssign > 6 * 60 ? 30 : 0;
          const totalSpan = hoursToAssign + pauseTime;
          const maxAllowedEnd = meetStartMin !== null ? meetStartMin : timeToMinutes(hours[hours.length - 1]?.end || '16:30');
          const candStarts = [rStart + 30, rStart + 60];
          for (const cand of candStarts) {
            if (cand + totalSpan <= maxAllowedEnd) {
              rStart = cand;
              break;
            }
          }
        }
      }

      // Wenn später am Tag ein Meeting liegt, Schicht vor dem Meeting enden lassen
      if (meetStartMin !== null) {
        const pauseTime = hoursToAssign > 6 * 60 ? 30 : 0;
        const totalSpan = hoursToAssign + pauseTime;
        const isFullTime = (emp.contractedHoursPerWeek || 0) >= 38;
        if (isFullTime || (rStart + totalSpan > meetStartMin)) {
          rStart = Math.max(timeToMinutes(hours[0]?.start || '07:30'), meetStartMin - totalSpan);
          rStart = Math.round(rStart / 15) * 15;
        }
      }

      const { segments } = buildShiftSegmentsWithBreaks(
        hoursToAssign,
        rStart,
        careCategory.id,
        emp.groupId ? null : empGroup?.id || null
      );

      if (existingShift) {
        const meetings = existingShift.segments.filter(s => s.isTeamMeeting);
        existingShift.segments = [...segments, ...meetings].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      } else {
        addShift(emp.id, day, segments);
      }

      emp.assignedWeeklyMinutes += hoursToAssign;
      emp.assignedCareMinutes += hoursToAssign;
      emp.dailyMinutes[day] += hoursToAssign;
    }

    // 2. Falls immer noch Restminuten offen sind (z.B. 15, 30 oder 45 Min):
    // Schichten um genau den Rest verlängern (exakt auf 0 Differenz!),
    // und falls die Schicht dabei über 6 Stunden wächst, die Pause sauber berücksichtigen.
    remainingMinutes = emp.targetWeeklyMinutes - emp.assignedWeeklyMinutes;
    if (remainingMinutes >= 15) {
      const empShifts = newShifts.filter(s => s.employeeId === emp.id);

      for (const shift of empShifts) {
        if (remainingMinutes < 15) break;

        const currentWork = getEmployeeDailyMinutes(emp.id, shift.dayOfWeek, newShifts);
        const maxDaily = Math.round((options.targetMaxDailyHours || 8.5) * 60);
        const add = Math.min(remainingMinutes, Math.max(0, maxDaily - currentWork));
        const addRounded = Math.floor(add / 15) * 15;
        if (addRounded < 15) continue;

        const newWorkMinutes = currentWork + addRounded;
        if (newWorkMinutes > (options.targetMaxDailyHours || 8.5) * 60) continue;

        // Falls die Schicht ein Meeting enthält, nicht nach hinten über das Meeting hinaus verlängern!
        const hasMeeting = shift.segments.some(s => s.isTeamMeeting);
        if (hasMeeting) {
          const meetingSeg = shift.segments.find(s => s.isTeamMeeting);
          const meetStart = timeToMinutes(meetingSeg.startTime);
          const segBefore = shift.segments.filter(s => !s.isTeamMeeting && timeToMinutes(s.endTime) <= meetStart).pop();
          if (segBefore) {
            const curEnd = timeToMinutes(segBefore.endTime);
            const canAdd = Math.min(addRounded, meetStart - curEnd);
            if (canAdd >= 15) {
              segBefore.endTime = minutesToTime(curEnd + canAdd);
              emp.assignedWeeklyMinutes += canAdd;
              emp.assignedCareMinutes += canAdd;
              emp.dailyMinutes[shift.dayOfWeek] += canAdd;
              remainingMinutes -= canAdd;
            }
          }
          continue;
        }

        // Finde Startzeit der Schicht
        const firstSeg = shift.segments[0];
        const sMin = timeToMinutes(firstSeg.startTime);
        const isOverridden = firstSeg.overriddenGroupId || null;

        // Falls die Schicht bereits aus mehreren Segmenten besteht (z.B. verschiedene Gruppen, VZ, etc.),
        // hängen wir die Verlängerung ans letzte Segment an, anstatt alles plattzumachen!
        const hasCrossOrMulti = shift.segments.length > 2 || shift.segments.some(s => s.overriddenGroupId);
        if (hasCrossOrMulti) {
          const lastSeg = shift.segments[shift.segments.length - 1];
          const lastEnd = timeToMinutes(lastSeg.endTime);
          lastSeg.endTime = minutesToTime(lastEnd + addRounded);
        } else {
          // Schicht für diesen Tag komplett sauber neu bauen mit passender Pause
          const { segments: newSegments } = buildShiftSegmentsWithBreaks(
            newWorkMinutes,
            sMin,
            careCategory.id,
            isOverridden
          );
          shift.segments = newSegments;
        }

        emp.assignedWeeklyMinutes += addRounded;
        emp.assignedCareMinutes += addRounded;
        emp.dailyMinutes[shift.dayOfWeek] = newWorkMinutes;
        remainingMinutes -= addRounded;
      }
    }
  });

  _diagSnapshot('Phase3_Auffuellen');
  // PHASE 3.5: Joker-Zuteilung für alle Mitarbeiter
  // Wenn ein Mitarbeiter nach der Schließzeit seiner eigenen Gruppe noch Arbeitszeit hat,
  // wird diese Zeit nicht in VZ verpulvert, sondern er wird als Joker in die Gruppe mit der
  // längsten Öffnungszeit geschickt! (Das vermeidet auch VZ Überschuss bei regulären Erziehern)
  employeePool.forEach(emp => {
    const ownGroup = groups.find(g => g.id === emp.groupId);
    if (!ownGroup) return;

    WEEK_DAYS_PLAN.forEach(day => {
      const shift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === day);
      if (!shift || shift.segments.length === 0) return;

      const ownHours = ownGroup.openingHours?.[day] || [];
      const ownEndMin = ownHours.length > 0 ? Math.max(...ownHours.map(h => timeToMinutes(h.end))) : 1020;

      let lateGroup = null;
      let maxEndMin = 0;
      groups.forEach(g => {
        const h = g.openingHours?.[day] || [];
        const eMin = h.length > 0 ? Math.max(...h.map(x => timeToMinutes(x.end))) : 0;
        if (eMin > maxEndMin && eMin > ownEndMin && g.id !== ownGroup.id) {
          maxEndMin = eMin;
          lateGroup = g;
        }
      });

      if (!lateGroup) return;

      let newSegments = [];
      shift.segments.forEach(seg => {
        if (seg.categoryId !== careCategory.id) {
          newSegments.push(seg);
          return;
        }
        const sM = timeToMinutes(seg.startTime);
        const eM = timeToMinutes(seg.endTime);

        if (sM >= ownEndMin) {
          newSegments.push({...seg, overriddenGroupId: lateGroup.id});
        } else if (eM > ownEndMin) {
          newSegments.push({ ...seg, endTime: minutesToTime(ownEndMin) });
          newSegments.push({ ...seg, startTime: minutesToTime(ownEndMin), overriddenGroupId: lateGroup.id });
        } else {
          newSegments.push(seg);
        }
      });
      shift.segments = newSegments;
    });
  });

  _diagSnapshot('Phase3.5_Joker');
  // ZWISCHEN-CLEANUP WURDE ENTFERNT: Da wir am Ende von Phase 6 ein Late-Cleanup ausführen,
  // lassen wir die Betreuungszeiten hier absichtlich noch über die Öffnungszeiten hinauslaufen.
  // Dadurch kann Phase 4a (Leitungsfreistellung) am Nachmittag Zeit aus der Betreuungszeit schneiden.

  _diagSnapshot('Phase3.5_Cleanup');

  // PHASE 4a: Leitungsfreistellung einplanen
  // WICHTIGSTE REGELN:
  // 1. Leitungsfreistellung wird IMMER auf Kosten der Betreuung gemacht, NIE auf Kosten der Verfügung!
  // 2. Daher wandelt Leitungsfreistellung AUSSCHLIESSLICH Segmente der Betreuungskategorie (careCategory) um.
  // 3. Bevorzugt werden zusammenhängende Blöcke gebildet (Bürozeit für Leitungsaufgaben).
  if (leadershipCategory) {
    employeePool.forEach(emp => {
      const targetLeadership = emp.targetLeadershipMinutes;
      if (targetLeadership <= 0) return;

      let remainingLeadership = targetLeadership;
      let empShifts = newShifts.filter(s => s.employeeId === emp.id);

      // Sortiere Schichten nach der "Sicherheit" / Puffer in der Gruppe,
      // um LF natürlich auf die stärksten Tage zu verteilen.
      empShifts.sort((a, b) => {
        const getScore = (shift) => {
          let score = 0;
          const targetGroupId = emp.groupId;
          if (!targetGroupId) return 0;
          const targetGroup = groups.find(g => g.id === targetGroupId);
          if (!targetGroup) return 0;
          const minStaff = targetGroup.minStaffRequired ?? 2;
          const hours = targetGroup.openingHours?.[shift.dayOfWeek] || [];
          const openStart = hours.length > 0 ? Math.min(...hours.map(h => timeToMinutes(h.start))) : 420;
          const openEnd = hours.length > 0 ? Math.max(...hours.map(h => timeToMinutes(h.end))) : 1020;
          
          for (let m = openStart; m < openEnd; m += 60) {
            const cov = getGroupCoverageAtMinute(targetGroupId, shift.dayOfWeek, m, minStaff);
            score += (cov - minStaff);
          }
          return score;
        };
        return getScore(b) - getScore(a);
      });

      // Pass 1: Sichere Platzierungen (ohne Unterbesetzung in der Gruppe zu erzeugen)
      for (const shift of empShifts) {
        if (remainingLeadership <= 0) break;

        const wish = emp.wishes?.[shift.dayOfWeek] || {};
        if (wish.allowLF === false) continue;
        const pref = wish.leadershipPreference || 'none';

        let careSegs = shift.segments.filter(s => s.categoryId === careCategory.id);
        if (pref === 'afternoon') {
          careSegs.reverse();
        }

        for (const careSeg of careSegs) {
          if (remainingLeadership <= 0) break;

          const segStart = timeToMinutes(careSeg.startTime);
          const segEnd = timeToMinutes(careSeg.endTime);
          const segDuration = segEnd - segStart;

          if (segDuration >= 15) {
            const block = Math.min(remainingLeadership, segDuration);
            const rounded = Math.floor(block / 15) * 15;

            if (rounded >= 15) {
              const targetGroupId = careSeg.overriddenGroupId || emp.groupId;
              const targetGroup = groups.find(g => g.id === targetGroupId);
              const minStaff = targetGroup?.minStaffRequired ?? 2;

              const lfStart = (pref === 'afternoon') ? segEnd - rounded : segStart;
              const lfEnd = (pref === 'afternoon') ? segEnd : segStart + rounded;

              // Prüfe, ob die Zeit [lfStart -> lfEnd] sicher ist
              let safe = true;
              if (targetGroupId && targetGroup && !targetGroup.disableStaffingWarning) {
                const hours = targetGroup.openingHours?.[shift.dayOfWeek] || [];
                const openStart = hours.length > 0 ? Math.min(...hours.map(h => timeToMinutes(h.start))) : 0;
                const openEnd = hours.length > 0 ? Math.max(...hours.map(h => timeToMinutes(h.end))) : 0;

                for (let m = lfStart; m < lfEnd; m += 15) {
                  // Außerhalb der Öffnungszeiten ist immer safe
                  if (hours.length > 0 && (m < openStart || m >= openEnd)) continue;
                  
                  const currentCovWithoutMe = getGroupCoverageAtMinute(targetGroupId, shift.dayOfWeek, m, minStaff, emp.id);
                  if (currentCovWithoutMe < minStaff) { safe = false; break; }
                }
              }

              if (safe) {
                if (rounded === segDuration) {
                  careSeg.categoryId = leadershipCategory.id;
                  careSeg.subCategoryId = '';
                  careSeg.overriddenGroupId = null;
                } else {
                  if (pref === 'afternoon') {
                    careSeg.endTime = minutesToTime(lfStart);
                  } else {
                    careSeg.startTime = minutesToTime(lfEnd);
                  }
                  shift.segments.push({
                    categoryId: leadershipCategory.id,
                    subCategoryId: '',
                    startTime: minutesToTime(lfStart),
                    endTime: minutesToTime(lfEnd),
                    overriddenGroupId: null,
                  });
                  shift.segments = shift.segments.filter(s => s.startTime !== s.endTime);
                  shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
                }
                emp.assignedCareMinutes -= rounded;
                emp.assignedLeadershipMinutes = (emp.assignedLeadershipMinutes || 0) + rounded;
                remainingLeadership -= rounded;
              }
            }
          }
        }
      }

      // Pass 2: Fallback (Erzwungene Platzierung) falls noch Freistellung übrig ist
      // Leitungsfreistellung steht vertraglich zu; Phase 5 gleicht Lücken der Kinderbetreuung aus!
      if (remainingLeadership > 0) {
        for (const shift of empShifts) {
          if (remainingLeadership <= 0) break;

          const wish = emp.wishes?.[shift.dayOfWeek] || {};
          if (wish.allowLF === false) continue;
          const pref = wish.leadershipPreference || 'none';

          let careSegs = shift.segments.filter(s => s.categoryId === careCategory.id);
          if (pref === 'afternoon') {
            careSegs.reverse();
          }

          for (const careSeg of careSegs) {
            if (remainingLeadership <= 0) break;

            const segStart = timeToMinutes(careSeg.startTime);
            const segEnd = timeToMinutes(careSeg.endTime);
            const segDuration = segEnd - segStart;

            if (segDuration >= 15) {
              const block = Math.min(remainingLeadership, segDuration);
              const rounded = Math.floor(block / 15) * 15;

              if (rounded >= 15) {
                if (rounded === segDuration) {
                  careSeg.categoryId = leadershipCategory.id;
                  careSeg.subCategoryId = '';
                  careSeg.overriddenGroupId = null;
                } else {
                  const lfStart = (pref === 'afternoon') ? segEnd - rounded : segStart;
                  const lfEnd = (pref === 'afternoon') ? segEnd : segStart + rounded;
                  
                  if (pref === 'afternoon') {
                    careSeg.endTime = minutesToTime(lfStart);
                  } else {
                    careSeg.startTime = minutesToTime(lfEnd);
                  }
                  shift.segments.push({
                    categoryId: leadershipCategory.id,
                    subCategoryId: '',
                    startTime: minutesToTime(lfStart),
                    endTime: minutesToTime(lfEnd),
                    overriddenGroupId: null,
                  });
                  shift.segments = shift.segments.filter(s => s.startTime !== s.endTime);
                  shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
                }
                emp.assignedCareMinutes -= rounded;
                emp.assignedLeadershipMinutes = (emp.assignedLeadershipMinutes || 0) + rounded;
                remainingLeadership -= rounded;
              }
            }
          }
        }
      }
    });
  }

  _diagSnapshot('Phase4a_Leitung');
  // PHASE 4b: Verfügungszeiten (VZ) einplanen
  // WICHTIGSTE REGELN:
  // 1. VZ darf NIE zusätzliche Arbeitszeit oben drauf packen! (Nur Umwandlung von Betreuung)
  // 2. VZ darf NIEMALS dazu führen, dass die Gruppe unter die Mindestbesetzung fällt!
  // 3. VZ von Mitarbeitern derselben Gruppe wird zeitlich versetzt vergeben (nicht alle ab 14:00 Uhr!)
  if (disposalCategory) {
    const DAYS = WEEK_DAYS_PLAN;
    const CHUNK_SIZE = 120; // Maximal 2 Stunden VZ auf einmal pro Iteration verteilen

    const placeChunk = (emp, shift, amount, mode, pref) => {
      // mode 1: Sichere Ränder
      // mode 2: Sicheres Sliding Window
      // mode 3: Erzwungenes Sliding Window
      
      const segmentIndices = [];
      for (let i = 0; i < shift.segments.length; i++) segmentIndices.push(i);
      if (pref !== 'morning') segmentIndices.reverse();
      
      for (const s of segmentIndices) {
        const careSeg = shift.segments[s];
        if (careSeg.categoryId !== careCategory.id || careSeg.isTeamMeeting) continue;
        
        const segStart = timeToMinutes(careSeg.startTime);
        const segEnd = timeToMinutes(careSeg.endTime);
        const segDuration = segEnd - segStart;
        if (segDuration <= 15) continue;
        
        const roundedVZ = Math.floor(Math.min(amount, segDuration) / 15) * 15;
        if (roundedVZ < 15) continue;
        
        const targetGroupId = careSeg.overriddenGroupId || emp.groupId;
        const targetGroup = groups.find(g => g.id === targetGroupId);
        const minStaff = targetGroup?.minStaffRequired ?? 2;
        
        if (mode === 1) {
          const checkAtEnd = () => {
            let safeAtEnd = true;
            const vzStartAtEnd = segEnd - roundedVZ;
            if (targetGroupId && targetGroup && !targetGroup.disableStaffingWarning) {
              for (let m = vzStartAtEnd; m < segEnd; m += 15) {
                if (getGroupCoverageAtMinute(targetGroupId, shift.dayOfWeek, m, minStaff, emp.id) < minStaff) { safeAtEnd = false; break; }
              }
            }
            if (safeAtEnd) {
              careSeg.endTime = minutesToTime(vzStartAtEnd);
              shift.segments.push({ categoryId: disposalCategory.id, subCategoryId: '', startTime: minutesToTime(vzStartAtEnd), endTime: minutesToTime(segEnd) });
              return roundedVZ;
            }
            return 0;
          };

          const checkAtStart = () => {
            let safeAtStart = true;
            const vzEndAtStart = segStart + roundedVZ;
            if (targetGroupId && targetGroup && !targetGroup.disableStaffingWarning) {
              for (let m = segStart; m < vzEndAtStart; m += 15) {
                if (getGroupCoverageAtMinute(targetGroupId, shift.dayOfWeek, m, minStaff, emp.id) < minStaff) { safeAtStart = false; break; }
              }
            }
            if (safeAtStart) {
              careSeg.startTime = minutesToTime(vzEndAtStart);
              shift.segments.push({ categoryId: disposalCategory.id, subCategoryId: '', startTime: minutesToTime(segStart), endTime: minutesToTime(vzEndAtStart) });
              return roundedVZ;
            }
            return 0;
          };

          if (pref === 'morning') {
            const placed = checkAtStart();
            if (placed) return placed;
            const placed2 = checkAtEnd();
            if (placed2) return placed2;
          } else {
            const placed = checkAtEnd();
            if (placed) return placed;
            const placed2 = checkAtStart();
            if (placed2) return placed2;
          }
        } else {
          // Mode 2 & 3: Sliding Window
          let bestStart = segEnd - roundedVZ;
          let bestScore = -999999;
          
          for (let m = segStart; m <= segEnd - roundedVZ; m += 15) {
            let score = 0;
            if (targetGroupId && targetGroup && !targetGroup.disableStaffingWarning) {
              for (let testM = m; testM < m + roundedVZ; testM += 15) {
                const cov = getGroupCoverageAtMinute(targetGroupId, shift.dayOfWeek, testM, minStaff);
                if (cov - 1 >= minStaff) score += (cov - 1 - minStaff + 1);
                else score -= 1000;
              }
            }
            if (score > bestScore || (score === bestScore && m > bestStart)) {
              bestScore = score; bestStart = m;
            }
          }
          
          if (mode === 2 && bestScore < 0) continue; // In Mode 2 dürfen keine Lücken entstehen
          
          const midStart = bestStart;
          const midEnd = midStart + roundedVZ;
          
          shift.segments.splice(s, 1);
          const originalEnd = careSeg.endTime;
          if (midEnd < segEnd) {
            shift.segments.splice(s, 0, { categoryId: careCategory.id, subCategoryId: careSeg.subCategoryId || '', startTime: minutesToTime(midEnd), endTime: originalEnd, overriddenGroupId: careSeg.overriddenGroupId });
          }
          shift.segments.splice(s, 0, { categoryId: disposalCategory.id, subCategoryId: '', startTime: minutesToTime(midStart), endTime: minutesToTime(midEnd), overriddenGroupId: null });
          if (midStart > segStart) {
            shift.segments.splice(s, 0, { categoryId: careCategory.id, subCategoryId: careSeg.subCategoryId || '', startTime: minutesToTime(segStart), endTime: minutesToTime(midStart), overriddenGroupId: careSeg.overriddenGroupId });
          }
          return roundedVZ;
        }
      }
      return 0;
    };

    const sortedGroups = [...groups].sort((a, b) => {
       const durA = DAYS.reduce((acc, day) => {
          const h = a.openingHours?.[day] || [];
          if(!h.length) return acc;
          return acc + (Math.max(...h.map(x=>timeToMinutes(x.end))) - Math.min(...h.map(x=>timeToMinutes(x.start))));
       }, 0);
       const durB = DAYS.reduce((acc, day) => {
          const h = b.openingHours?.[day] || [];
          if(!h.length) return acc;
          return acc + (Math.max(...h.map(x=>timeToMinutes(x.end))) - Math.min(...h.map(x=>timeToMinutes(x.start))));
       }, 0);
       return durB - durA;
    });

    [1, 2, 3].forEach(mode => {
      if (mode > 1) {
        for (const day of DAYS) {
          const lateGroups = sortedGroups.filter(g => {
            const h = g.openingHours?.[day] || [];
            if (!h.length) return false;
            return Math.max(...h.map(x => timeToMinutes(x.end))) >= 960;
          });
          lateGroups.forEach(g => {
            const jokerCands = employeePool.filter(e => (e.type === 'azubi' || e.type === 'zusatzkraft') && e.groupId !== g.id);
            jokerCands.forEach(joker => {
              const shift = newShifts.find(s => s.employeeId === joker.id && s.dayOfWeek === day);
              if (shift) {
                 shift.segments.forEach(seg => {
                   if (seg.categoryId === careCategory.id && timeToMinutes(seg.startTime) >= 780) {
                     seg.overriddenGroupId = g.id;
                   }
                 });
              }
            });
          });
        }
      }

      const allGroupsAndNull = [...sortedGroups, { id: null }];
      allGroupsAndNull.forEach(group => {
        let madeProgress = true;
        let failsafe = 0;
        while (madeProgress && failsafe < 50) {
          madeProgress = false;
          failsafe++;
          
          for (const day of DAYS) {
            employeePool.filter(e => e.groupId === group.id).forEach(emp => {
            let remainingVZ = Math.max(0, emp.targetDisposalMinutes - (emp.assignedDisposalMinutes || 0));
            if (remainingVZ < 15) return;
            
            const shift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === day);
            if (!shift) return;
            
            const wish = emp.wishes?.[day] || {};
            if (wish.allowVZ === false) return;
            
            const pref = wish.disposalPreference || 'none';
              const amountPlaced = placeChunk(emp, shift, Math.min(remainingVZ, CHUNK_SIZE), mode, pref);
            if (amountPlaced > 0) {
              shift.segments = shift.segments.filter(s => s.startTime !== s.endTime);
              shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
              emp.assignedCareMinutes -= amountPlaced;
              emp.assignedDisposalMinutes += amountPlaced;
              madeProgress = true;
            }
          });
        }
      }
      });
    });
  }

  // =========================================================================
  _diagSnapshot('Phase4b_VZ');

  // =========================================================================
  // ZERO-GAP-PASS FÜR TEAMSITZUNGEN (Vollzeitkräfte vor Teamsitzung NICHT heimschiсken):
  // =========================================================================
  newShifts.forEach(shift => {
    const emp = employeePool.find(e => e.id === shift.employeeId);
    if (!emp || (emp.contractedHoursPerWeek || 0) < 38) return; // Nur Vollzeitkräfte

    const meetingSeg = shift.segments.find(s => s.isTeamMeeting);
    if (!meetingSeg) return; // Hat heute keine Teamsitzung

    const meetStart = timeToMinutes(meetingSeg.startTime);

    // Finde das letzte Segment VOR der Teamsitzung
    const segsBeforeMeeting = shift.segments.filter(s => !s.isTeamMeeting && timeToMinutes(s.endTime) <= meetStart);
    if (segsBeforeMeeting.length === 0) return;

    const lastSeg = segsBeforeMeeting[segsBeforeMeeting.length - 1];
    const lastEnd = timeToMinutes(lastSeg.endTime);
    const gap = meetStart - lastEnd;
    if (gap <= 0) return; // Nahtlos, kein Heimschicken!

    // Es gibt ein Gap vor der Teamsitzung (z.B. Schichtende 15:00, Meeting 17:00 -> 2h Gap)
    // 1. ZUERST PRÜFEN: Hat der Mitarbeiter an diesem Tag VZ-Segmente, die wir ans Ende (bis meetStart) verschieben können?
    const vzSegs = shift.segments.filter(s => disposalCategory && s.categoryId === disposalCategory.id && !s.isTeamMeeting);
    let gapRemaining = gap;

    if (vzSegs.length > 0) {
      let totalVzDuration = 0;
      vzSegs.forEach(vz => {
        const dur = timeToMinutes(vz.endTime) - timeToMinutes(vz.startTime);
        totalVzDuration += dur;
        vz.categoryId = careCategory.id; // Vorherige VZ-Zeit wird wieder Betreuung
      });

      // Erstelle ein VZ-Segment direkt vor dem Meeting: [meetStart - vzDur, meetStart]
      const vzStart = Math.max(timeToMinutes(shift.segments[0].startTime), meetStart - totalVzDuration);
      shift.segments.push({
        categoryId: disposalCategory.id,
        subCategoryId: '',
        startTime: minutesToTime(vzStart),
        endTime: minutesToTime(meetStart),
        overriddenGroupId: null
      });

      shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      const updatedSegs = shift.segments.filter(s => !s.isTeamMeeting && timeToMinutes(s.endTime) <= meetStart);
      const newLastEnd = timeToMinutes(updatedSegs[updatedSegs.length - 1].endTime);
      gapRemaining = meetStart - newLastEnd;
    }

    // 2. Falls immer noch ein Gap verbleibt:
    if (gapRemaining > 0) {
      const firstSeg = shift.segments[0];
      const firstStart = timeToMinutes(firstSeg.startTime);
      const empGroup = groups.find(g => g.id === emp.groupId) || groups[0];
      const minStaff = empGroup?.minStaffRequired ?? 2;

      const wish = emp.wishes?.[shift.dayOfWeek];
      const hasFixedStart = wish && wish.requirementType === 'fixed' && wish.startTime;

      let canShift = 0;
      if (!hasFixedStart) {
        for (let sStep = 15; sStep <= gapRemaining; sStep += 15) {
          let safe = true;
          for (let m = firstStart; m < firstStart + sStep; m += 15) {
            if (getGroupCoverageAtMinute(empGroup.id, shift.dayOfWeek, m, minStaff, emp.id) < minStaff) {
              safe = false;
              break;
            }
          }
          if (safe) canShift = sStep;
          else break;
        }
      }

      if (canShift > 0) {
        // NUR Segmente VOR dem Meeting verschieben und niemals über meetStart hinaus schieben!
        const segsBefore = shift.segments.filter(s => !s.isTeamMeeting && timeToMinutes(s.endTime) <= meetStart);
        segsBefore.forEach(s => {
          const origStart = timeToMinutes(s.startTime);
          const origEnd = timeToMinutes(s.endTime);
          s.startTime = minutesToTime(origStart + canShift);
          s.endTime = minutesToTime(Math.min(meetStart, origEnd + canShift));
        });
        gapRemaining -= canShift;
      }
    }

    // 3. Falls nach Schichtverschiebung und VZ-Umlagerung IMMER NOCH ein Rest-Gap bleibt:
    // Schließe das Rest-Gap zwingend mit VZ oder Betreuung (kein Heimschicken vor Meeting!)
    if (gapRemaining > 0) {
      const segsNow = shift.segments.filter(s => !s.isTeamMeeting && timeToMinutes(s.endTime) <= meetStart);
      const bridgeStart = segsNow.length > 0 ? timeToMinutes(segsNow[segsNow.length - 1].endTime) : meetStart;
      if (bridgeStart < meetStart) {
        const cat = disposalCategory ? disposalCategory.id : careCategory.id;

        shift.segments.push({
          categoryId: cat,
          subCategoryId: '',
          startTime: minutesToTime(bridgeStart),
          endTime: minutesToTime(meetStart),
          overriddenGroupId: null
        });

        if (cat === disposalCategory.id) {
          emp.assignedDisposalMinutes = (emp.assignedDisposalMinutes || 0) + (meetStart - bridgeStart);
        } else {
          emp.assignedCareMinutes = (emp.assignedCareMinutes || 0) + (meetStart - bridgeStart);
        }
        emp.assignedWeeklyMinutes += (meetStart - bridgeStart);
        emp.dailyMinutes[shift.dayOfWeek] = (emp.dailyMinutes[shift.dayOfWeek] || 0) + (meetStart - bridgeStart);
      }
    }

    shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  });

  // PHASE 4d: ARBEITSZEITGESETZ (ArbZG) & PAUSEN-NEUJUSTIERUNG
  // =========================================================================
  // Nach dem Hinzufügen von Teamsitzungen und Überbrückungen kann die Arbeitszeit
  // gestiegen sein (z.B. > 6h oder > 9h) oder die bisherige Pause liegt nicht mehr
  // optimal. Wir prüfen jede Schicht und stellen sicher:
  // 1. Keine überlappenden Segmente (Bild 1: sauberer Abschluss vor der Pause)
  // 2. Genau die gesetzliche Pause (30 Min bei > 6h, 45 Min bei > 9h)
  newShifts.forEach(shift => {
    if (!shift.segments || shift.segments.length === 0) return;

    // 1. Bereinige Überlappungen
    shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (let i = 0; i < shift.segments.length - 1; i++) {
      const curEnd = timeToMinutes(shift.segments[i].endTime);
      const nextStart = timeToMinutes(shift.segments[i + 1].startTime);
      if (curEnd > nextStart) {
        shift.segments[i].endTime = minutesToTime(nextStart);
      }
    }
    // Entferne 0-Minuten Segmente
    shift.segments = shift.segments.filter(s => timeToMinutes(s.endTime) > timeToMinutes(s.startTime));

    // 2. Gesamte Arbeitszeit und Pausenzeit an diesem Tag ermitteln
    let workMinutes = 0;
    let pauseMinutes = 0;
    shift.segments.forEach(s => {
      const dur = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
      if (s.categoryId === PAUSE_CATEGORY.id) {
        pauseMinutes += dur;
      } else {
        workMinutes += dur;
      }
    });

    // Lücken zwischen Schichten / Segmenten von mind. 15 Minuten gelten nach § 4 ArbZG als Ruhepause
    for (let i = 0; i < shift.segments.length - 1; i++) {
      const curEnd = timeToMinutes(shift.segments[i].endTime);
      const nextStart = timeToMinutes(shift.segments[i + 1].startTime);
      const gap = nextStart - curEnd;
      if (gap >= 15) {
        pauseMinutes += gap;
      }
    }

    const requiredPause = workMinutes > 9 * 60 ? 45 : (workMinutes > 6 * 60 ? 30 : 0);

    // ArbZG: Max. Arbeitszeit von 10h (600 Min) erzwingen, indem die nötige Pause verlängert wird
    let finalRequiredPause = requiredPause;
    const maxWorkMin = 10 * 60;
    if (workMinutes > maxWorkMin) {
      finalRequiredPause += (workMinutes - maxWorkMin);
    }

    if (finalRequiredPause > pauseMinutes) {
      const missingPause = finalRequiredPause - pauseMinutes;
      // Suche eine bestehende Pause zum Verlängern oder füge eine (zweite) Pause ein
      const existingPause = shift.segments.find(s => s.categoryId === PAUSE_CATEGORY.id);
      if (existingPause) {
        const pIdx = shift.segments.indexOf(existingPause);
        const pStart = timeToMinutes(existingPause.startTime);
        const pEnd = timeToMinutes(existingPause.endTime);
        const newPEnd = pEnd + missingPause;
        
        // Prüfe, ob die Schicht ein Meeting enthält
        const meetingSeg = shift.segments.find(s => s.isTeamMeeting);
        const meetStart = meetingSeg ? timeToMinutes(meetingSeg.startTime) : Infinity;

        // Wenn wir nach hinten verlängern, niemals in oder über das Meeting schieben!
        // Die zusätzliche Pause absorbiert Arbeitszeit davor/danach, anstatt die Schicht ins Unendliche zu verlängern:
        if (newPEnd <= meetStart) {
          existingPause.endTime = minutesToTime(newPEnd);
          // Passe Segmente an, die in das verlängerte Pausenintervall [pEnd, newPEnd] fallen
          for (let j = 0; j < shift.segments.length; j++) {
            if (j === pIdx) continue;
            const seg = shift.segments[j];
            const sStart = timeToMinutes(seg.startTime);
            const sEnd = timeToMinutes(seg.endTime);
            if (sStart >= pEnd && sStart < newPEnd) {
              if (sEnd <= newPEnd) {
                // Segment wird vollständig von Pause absorbiert
                seg.startTime = minutesToTime(newPEnd);
                seg.endTime = minutesToTime(newPEnd);
              } else {
                seg.startTime = minutesToTime(newPEnd);
              }
            } else if (sStart < pEnd && sEnd > pEnd) {
              seg.endTime = minutesToTime(pStart);
            }
          }
        } else {
          // Falls newPEnd das Meeting verletzen würde: Pause nach vorne vergrößern
          const newPStart = Math.max(0, pStart - missingPause);
          existingPause.startTime = minutesToTime(newPStart);
          for (let j = 0; j < shift.segments.length; j++) {
            if (j === pIdx) continue;
            const seg = shift.segments[j];
            const sStart = timeToMinutes(seg.startTime);
            const sEnd = timeToMinutes(seg.endTime);
            if (sEnd > newPStart && sEnd <= pEnd) {
              if (sStart >= newPStart) {
                seg.startTime = minutesToTime(newPStart);
                seg.endTime = minutesToTime(newPStart);
              } else {
                seg.endTime = minutesToTime(newPStart);
              }
            }
          }
        }
      } else if (workMinutes > 6 * 60) {
        // Es gibt noch gar keine Pause! Suche ein geeignetes langes Arbeitssegment (bevorzugt nicht Teamsitzung)
        const longWorkSeg = [...shift.segments].reverse().find(s => 
          s.categoryId !== PAUSE_CATEGORY.id && !s.isTeamMeeting && (timeToMinutes(s.endTime) - timeToMinutes(s.startTime) >= requiredPause + 30)
        );
        if (longWorkSeg) {
          const sMin = timeToMinutes(longWorkSeg.startTime);
          const eMin = timeToMinutes(longWorkSeg.endTime);
          const dur = eMin - sMin;
          
          // Prüfe, ob danach direkt ein festes Segment (z.B. Teamsitzung) anschließt
          const hasFollowingBlock = shift.segments.some(s => s !== longWorkSeg && timeToMinutes(s.startTime) >= eMin && timeToMinutes(s.startTime) - eMin < requiredPause);
          
          if (hasFollowingBlock) {
            // Nach hinten kann nicht verlängert werden; verschiebe Schichtstart nach vorne
            const newStart = Math.max(0, sMin - requiredPause);
            const pStart = newStart + Math.round((dur / 2) / 15) * 15;
            const pEnd = pStart + requiredPause;
            
            longWorkSeg.startTime = minutesToTime(newStart);
            longWorkSeg.endTime = minutesToTime(pStart);

            shift.segments.push({
              categoryId: PAUSE_CATEGORY.id,
              subCategoryId: '',
              startTime: minutesToTime(pStart),
              endTime: minutesToTime(pEnd),
            });
            
            shift.segments.push({
              categoryId: longWorkSeg.categoryId,
              subCategoryId: longWorkSeg.subCategoryId || '',
              startTime: minutesToTime(pEnd),
              endTime: minutesToTime(eMin),
              overriddenGroupId: longWorkSeg.overriddenGroupId || null
            });
          } else {
            const pStart = sMin + Math.round((dur / 2) / 15) * 15;
            const pEnd = pStart + requiredPause;
            const restDur = eMin - pStart;

            longWorkSeg.endTime = minutesToTime(pStart);

            shift.segments.push({
              categoryId: PAUSE_CATEGORY.id,
              subCategoryId: '',
              startTime: minutesToTime(pStart),
              endTime: minutesToTime(pEnd),
            });
            
            if (restDur > 0) {
              shift.segments.push({
                categoryId: longWorkSeg.categoryId,
                subCategoryId: longWorkSeg.subCategoryId || '',
                startTime: minutesToTime(pEnd),
                endTime: minutesToTime(pEnd + restDur),
                overriddenGroupId: longWorkSeg.overriddenGroupId || null
              });
            }
            
            // Alle anderen Segmente, die nach longWorkSeg kamen, ebenfalls verschieben
            for (const seg of shift.segments) {
              if (seg !== longWorkSeg && seg.categoryId !== PAUSE_CATEGORY.id) {
                const sStart = timeToMinutes(seg.startTime);
                if (sStart >= eMin && (seg.startTime !== minutesToTime(pEnd))) {
                  if (seg.isTeamMeeting) continue; // Teamsitzung hat feste Uhrzeit, niemals verschieben!
                  const sEnd = timeToMinutes(seg.endTime);
                  seg.startTime = minutesToTime(sStart + requiredPause);
                  seg.endTime = minutesToTime(sEnd + requiredPause);
                }
              }
            }
          }
          
          shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
        }
      }

      // Finale Überlappungsprüfung (falls z.B. eine verschobene Betreuungszeit jetzt in eine Teamsitzung reinragt)
      shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      for (let i = 0; i < shift.segments.length - 1; i++) {
        const curEnd = timeToMinutes(shift.segments[i].endTime);
        const nextStart = timeToMinutes(shift.segments[i + 1].startTime);
        if (curEnd > nextStart) {
          // Kürze das vorherige Segment (Betreuung), um Platz für das feste Segment (z.B. Teamsitzung) zu machen
          shift.segments[i].endTime = minutesToTime(nextStart);
        }
      }
      shift.segments = shift.segments.filter(s => timeToMinutes(s.endTime) > timeToMinutes(s.startTime));
    }
  });

  // =========================================================================
  _diagSnapshot('Phase4d_Pausen');
  // PHASE 5: INTELLIGENTER PRÜF- UND REPARATUR-DURCHGANG (2. Durchgang)
  // =========================================================================
  // Prüft den fertigen Plan auf jegliche verbliebenen Unterbesetzungen / Warnungen
  // und passt ihn systematisch an:
  // Schritt 5a: Wenn während einer Unterbesetzung Kollegen in VZ sind -> VZ wieder in Betreuung wandeln!
  // Schritt 5b: Schichtverschiebung (Shifting) -> Frühschichten, die vor Schließzeit enden, nach hinten schieben, wenn morgens Puffer da ist!
  // Schritt 5c: Schichtverlängerung (Extension) -> Wenn Kollegen noch Tages-/Wochenbudget haben, Dienst nach hinten verlängern!
  let repairRounds = 5;
  while (repairRounds-- > 0) {
    const currentDeficits = calculateGroupDeficits(groups, employees, newShifts, careCategory.id, sickDays, subCategories);
    if (currentDeficits.length === 0) {
      break; // Perfekt! Keine Unterbesetzungen mehr vorhanden.
    }

    let repairMade = false;

    for (const deficit of currentDeficits) {
      const defDay = deficit.dayOfWeek;
      const defGroup = groups.find(g => g.id === deficit.groupId);
      if (!defGroup) continue;

      // 5a. Rollback von VZ (AKTIVIERT)
      // Wenn Lücken entstehen (z.B. durch LF, Pausen oder Teamsitzungen), muss Verfügungszeit notfalls weichen.
      if (disposalCategory) {
        const vzCandidates = employeePool.filter(emp => {
          if (emp.groupId !== defGroup.id && emp.groupId) return false;
          const empShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === defDay);
          if (!empShift) return false;
          return empShift.segments.some(seg => {
            if (seg.categoryId !== disposalCategory.id) return false;
            const sM = timeToMinutes(seg.startTime);
            const eM = timeToMinutes(seg.endTime);
            return sM < deficit.endMinute && eM > deficit.startMinute;
          });
        });

        for (const cand of vzCandidates) {
          const empShift = newShifts.find(s => s.employeeId === cand.id && s.dayOfWeek === defDay);
          const segIdx = empShift.segments.findIndex(seg => {
            if (seg.categoryId !== disposalCategory.id) return false;
            const sM = timeToMinutes(seg.startTime);
            const eM = timeToMinutes(seg.endTime);
            return sM < deficit.endMinute && eM > deficit.startMinute;
          });

          if (segIdx !== -1) {
            const origSeg = empShift.segments[segIdx];
            const origStart = timeToMinutes(origSeg.startTime);
            const origEnd = timeToMinutes(origSeg.endTime);
            
            const overlapStart = Math.max(origStart, deficit.startMinute);
            const overlapEnd = Math.min(origEnd, deficit.endMinute);
            
            const newSegs = [];
            if (origStart < overlapStart) {
              newSegs.push({ ...origSeg, endTime: minutesToTime(overlapStart) });
            }
            newSegs.push({
              categoryId: careCategory.id,
              subCategoryId: '',
              startTime: minutesToTime(overlapStart),
              endTime: minutesToTime(overlapEnd),
              overriddenGroupId: defGroup.id
            });
            if (overlapEnd < origEnd) {
              newSegs.push({ ...origSeg, startTime: minutesToTime(overlapEnd) });
            }
            
            empShift.segments.splice(segIdx, 1, ...newSegs);
            empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
            
            cand.assignedDisposalMinutes -= (overlapEnd - overlapStart);
            cand.assignedCareMinutes += (overlapEnd - overlapStart);
            repairMade = true;
            break;
          }
        }
        if (repairMade) break;
      }

      // 5b. Schichtverschiebung (Shifting):
      // Wenn das Defizit am Vormittag/Mittag/Nachmittag liegt (z.B. 11:30–12:30), prüfen ob eine Kraft morgens früher da ist,
      // als die Mindestbesetzung es erfordert, und verschiebe deren Schicht um 30, 45 oder 60 Min nach hinten!
      const rHours = defGroup.openingHours?.[defDay] || [];
      const openStart = rHours[0] ? timeToMinutes(rHours[0].start) : 420;
      const openEnd = rHours[rHours.length - 1] ? timeToMinutes(rHours[rHours.length - 1].end) : 1020;

      if (deficit.startMinute >= openStart + 120) { // Defizit liegt ab Vormittag (z.B. ab 10:30 oder 11:30)
        const shiftCandidates = employeePool.filter(emp => {
          const empShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === defDay);
          if (!empShift || empShift.segments.length === 0) return false;

          // Keine festen Mitarbeiterwünsche mit fester Startzeit verletzen
          const wish = emp.wishes?.[defDay];
          if (wish && wish.requirementType === 'fixed' && wish.startTime) return false;

          const isGroupMatch = emp.groupId === defGroup.id || !emp.groupId;
          if (!isGroupMatch) return false;

          // Ermittle Segmente vor einem eventuellen Meeting
          const meetingSeg = empShift.segments.find(s => s.isTeamMeeting);
          const meetStart = meetingSeg ? timeToMinutes(meetingSeg.startTime) : Infinity;
          const segsBeforeMeeting = empShift.segments.filter(s => !s.isTeamMeeting && timeToMinutes(s.endTime) <= meetStart);
          if (segsBeforeMeeting.length === 0) return false;

          const firstSeg = segsBeforeMeeting[0];
          const lastSeg = segsBeforeMeeting[segsBeforeMeeting.length - 1];
          const sStart = timeToMinutes(firstSeg.startTime);
          const sEnd = timeToMinutes(lastSeg.endTime);

          // Schicht muss früher enden als Schließzeit/Meeting und früher beginnen
          const maxAllowedEnd = Math.min(openEnd, meetStart);
          return sEnd < maxAllowedEnd && sStart <= openStart + 60;
        });

        for (const cand of shiftCandidates) {
          const empShift = newShifts.find(s => s.employeeId === cand.id && s.dayOfWeek === defDay);
          const meetingSeg = empShift.segments.find(s => s.isTeamMeeting);
          const meetStart = meetingSeg ? timeToMinutes(meetingSeg.startTime) : Infinity;
          const segsBefore = empShift.segments.filter(s => !s.isTeamMeeting && timeToMinutes(s.endTime) <= meetStart);
          const firstSeg = segsBefore[0];
          const lastSeg = segsBefore[segsBefore.length - 1];
          const oldStart = timeToMinutes(firstSeg.startTime);
          const oldEnd = timeToMinutes(lastSeg.endTime);
          const maxAllowedEnd = Math.min(openEnd, meetStart);

          // Wieviel können wir nach hinten schieben?
          const neededToCoverDeficit = deficit.endMinute > oldEnd ? Math.ceil((deficit.endMinute - oldEnd) / 15) * 15 : 30;
          const shiftBy = Math.min(maxAllowedEnd - oldEnd, Math.min(neededToCoverDeficit, 60));
          if (shiftBy < 15) continue;

          // Prüfe, ob morgens bei Wegfall der Zeit [oldStart -> oldStart + shiftBy] noch genügend Betreuung da ist
          let morningSafe = true;
          for (let m = oldStart; m < oldStart + shiftBy; m += 15) {
            const timeHHMM = minutesToTime(m);
            if (defGroup.edgeTimes?.[defDay] && isTimeInRanges(timeHHMM, defGroup.edgeTimes[defDay])) {
              continue;
            }
            const covWithoutMe = getGroupCoverageAtMinute(defGroup.id, defDay, m, defGroup.minStaffRequired ?? 2, cand.id);
            if (covWithoutMe < (defGroup.minStaffRequired ?? 2)) {
              morningSafe = false;
              break;
            }
          }

          if (morningSafe) {
            // Verschiebe die Segmente vor dem Meeting um shiftBy nach hinten (Teamsitzung bleibt unberührt!)
            segsBefore.forEach(seg => {
              const segS = timeToMinutes(seg.startTime) + shiftBy;
              const segE = timeToMinutes(seg.endTime) + shiftBy;
              seg.startTime = minutesToTime(segS);
              seg.endTime = minutesToTime(segE);
            });
            empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
            repairMade = true;
            break;
          }
        }
        if (repairMade) break;
      }

      // 5c. Schichtverlängerung (Extension):
      // Finde eine Kraft, die an dem Tag arbeitet und deren Dienst bis zum Defizit-Ende verlängert werden kann
      const extCandidates = employeePool.filter(emp => {
        const empShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === defDay);
        if (!empShift || empShift.segments.length === 0) return false;

        const isGroupMatch = emp.groupId === defGroup.id || !emp.groupId;
        if (!isGroupMatch) return false;

        const lastSeg = empShift.segments[empShift.segments.length - 1];
        if (lastSeg.isTeamMeeting) return false;
        const sEnd = timeToMinutes(lastSeg.endTime);
        if (sEnd >= deficit.endMinute) return false;

        const currentDaily = emp.dailyMinutes[defDay] || 0;
        const maxDaily = Math.round((options.targetMaxDailyHours || 8.5) * 60);
        const hasDailyBudget = (maxDaily - currentDaily >= 15);
        const hasWeeklyBudget = ((emp.planningTargetWeeklyMinutes + toleranceMinutes) - emp.assignedWeeklyMinutes >= 15);
        return hasDailyBudget && hasWeeklyBudget;
      });

      if (extCandidates.length > 0) {
        const bestCand = extCandidates[0];
        const empShift = newShifts.find(s => s.employeeId === bestCand.id && s.dayOfWeek === defDay);
        const lastSeg = empShift.segments[empShift.segments.length - 1];
        const curEnd = timeToMinutes(lastSeg.endTime);
        
        // Prüfe, ob danach ein anderes Segment (z.B. Teamsitzung) beginnt
        const nextSeg = empShift.segments.find(s => timeToMinutes(s.startTime) >= curEnd && s !== lastSeg);
        const maxExtendTo = nextSeg ? timeToMinutes(nextSeg.startTime) : deficit.endMinute;
        const needed = Math.min(maxExtendTo - curEnd, Math.min(deficit.endMinute - curEnd, 60));

        if (needed >= 15) {
          if (lastSeg.categoryId === careCategory.id) {
            lastSeg.endTime = minutesToTime(curEnd + needed);
          } else {
            empShift.segments.push({
              categoryId: careCategory.id,
              subCategoryId: '',
              startTime: minutesToTime(curEnd),
              endTime: minutesToTime(curEnd + needed),
              overriddenGroupId: bestCand.groupId === defGroup.id ? null : defGroup.id
            });
          }
          empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          bestCand.assignedWeeklyMinutes += needed;
          bestCand.assignedCareMinutes += needed;
          bestCand.dailyMinutes[defDay] += needed;
          repairMade = true;
          break;
        }
      }

      // 5d. GRUPPENÜBERGREIFENDE AUSHILFE / VERTRETUNG (Cross-Group Assistance):
      // Wenn in dieser Gruppe (z.B. Gruppe Rot) eine Unterbesetzung besteht, suche einen Erzieher
      // aus einer Nicht-GT-Gruppe (z.B. Gruppe Blau oder Grün), der während der Defizitzeit im Dienst ist,
      // in dessen eigener Gruppe zu dieser Zeit ein PERSONENÜBERHANG (z.B. >= 3 Kräfte) herrscht.
      // Teile dessen Schicht auf und setze overriddenGroupId auf die bedürftige Gruppe!
      const donorCandidates = employeePool.filter(emp => {
        if (emp.groupId === defGroup.id) return false; // Nur andere Gruppen
        
        const isSpecialType = emp.type !== 'normal' && emp.type !== 'zusatzkraft' && emp.type !== 'leitung' && emp.type !== 'stellv_leitung';
        const isPracticeDay = (emp.presenceDays || []).includes(defDay);
        if (isSpecialType && !isPracticeDay) return false; // Nicht-Praxistage beheben keine Defizite
        
        const empShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === defDay);
        if (!empShift) return false;

        // Prüfe, ob er während des Defizits in Betreuung ist (und nicht in einer Teamsitzung!)
        const careSeg = empShift.segments.find(seg => {
          if (seg.categoryId !== careCategory.id || seg.isTeamMeeting) return false;
          const sM = timeToMinutes(seg.startTime);
          const eM = timeToMinutes(seg.endTime);
          return sM <= deficit.startMinute && eM >= deficit.endMinute;
        });
        if (!careSeg) return false;

        // Prüfe, ob seine Stammgruppe in dieser Zeit noch genug Personal hat (Überhang)
        const ownGroupId = emp.groupId;
        if (!ownGroupId) return true; // Springer ohne feste Gruppe kann sofort helfen!
        const ownGroup = groups.find(g => g.id === ownGroupId);
        const ownMinStaff = ownGroup?.minStaffRequired ?? 2;

        for (let m = deficit.startMinute; m < deficit.endMinute; m += 15) {
          const ownCovWithoutMe = getGroupCoverageAtMinute(ownGroupId, defDay, m, ownMinStaff, emp.id);
          if (ownCovWithoutMe < ownMinStaff) return false; // Eigene Gruppe würde unterbesetzt
        }

        return true;
      });

      if (donorCandidates.length > 0) {
        const donor = donorCandidates[0];
        const donorShift = newShifts.find(s => s.employeeId === donor.id && s.dayOfWeek === defDay);
        const careSegIdx = donorShift.segments.findIndex(seg => {
          if (seg.categoryId !== careCategory.id) return false;
          const sM = timeToMinutes(seg.startTime);
          const eM = timeToMinutes(seg.endTime);
          return sM <= deficit.startMinute && eM >= deficit.endMinute;
        });

        if (careSegIdx !== -1) {
          const origSeg = donorShift.segments[careSegIdx];
          const origStart = timeToMinutes(origSeg.startTime);
          const origEnd = timeToMinutes(origSeg.endTime);

          // Ersetze das Segment durch bis zu drei Teile: Vorher, Defizit-Aushilfe in neuer Gruppe, Nachher
          const newSegs = [];
          if (origStart < deficit.startMinute) {
            newSegs.push({
              ...origSeg,
              startTime: minutesToTime(origStart),
              endTime: minutesToTime(deficit.startMinute)
            });
          }
          newSegs.push({
            categoryId: careCategory.id,
            subCategoryId: origSeg.subCategoryId || '',
            startTime: minutesToTime(deficit.startMinute),
            endTime: minutesToTime(deficit.endMinute),
            overriddenGroupId: defGroup.id // <- Betreuung für die GT-Gruppe!
          });
          if (deficit.endMinute < origEnd) {
            newSegs.push({
              ...origSeg,
              startTime: minutesToTime(deficit.endMinute),
              endTime: minutesToTime(origEnd)
            });
          }

          donorShift.segments.splice(careSegIdx, 1, ...newSegs);
          donorShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
          repairMade = true;
          break;
        }
      }

      // 5e. PAUSEN-ENTZERRUNG (Break Shift):
      // Wenn die Unterbesetzung genau durch eine Pause entsteht (z.B. Kollege hat Pause 11:15–11:45
      // und dadurch ist von 11:15–11:30 nur noch 1 Person da):
      // Verschiebe die Pause dieser Person um 15, 30 oder 45 Minuten vor oder zurück!
      const breakCandidates = employeePool.filter(emp => {
        const empShift = newShifts.find(s => s.employeeId === emp.id && s.dayOfWeek === defDay);
        if (!empShift) return false;
        const isGrp = (emp.groupId === defGroup.id) || empShift.segments.some(seg => seg.overriddenGroupId === defGroup.id);
        if (!isGrp) return false;

        return empShift.segments.some(seg => {
          if (seg.categoryId !== PAUSE_CATEGORY.id) return false;
          const sM = timeToMinutes(seg.startTime);
          const eM = timeToMinutes(seg.endTime);
          return Math.max(sM, deficit.startMinute) < Math.min(eM, deficit.endMinute);
        });
      });

      if (breakCandidates.length > 0) {
        for (const bCand of breakCandidates) {
          const empShift = newShifts.find(s => s.employeeId === bCand.id && s.dayOfWeek === defDay);
          const pSegIdx = empShift.segments.findIndex(seg => seg.categoryId === PAUSE_CATEGORY.id);
          if (pSegIdx === -1) continue;

          const pSeg = empShift.segments[pSegIdx];
          const oldPStart = timeToMinutes(pSeg.startTime);
          const oldPEnd = timeToMinutes(pSeg.endTime);
          const pDuration = oldPEnd - oldPStart;

          const firstSeg = empShift.segments[0];
          const lastSeg = empShift.segments[empShift.segments.length - 1];
          const sStart = timeToMinutes(firstSeg.startTime);
          const sEnd = timeToMinutes(lastSeg.endTime);

          // Teste alternative Pausenzeiten (z.B. +30 Min, -30 Min, +45 Min)
          const offsets = [30, -30, 45, -45, 60, -60];
          for (const off of offsets) {
            const newPStart = oldPStart + off;
            const newPEnd = newPStart + pDuration;

            // Schicht temporär modifizieren und prüfen, ob die neue Pausenzeit besser ist und keine neue Unterbesetzung erzeugt
            const prevWorkSeg = empShift.segments[pSegIdx - 1];
            const nextWorkSeg = empShift.segments[pSegIdx + 1];
            if (!prevWorkSeg || !nextWorkSeg) continue;

            const origPrevEnd = prevWorkSeg.endTime;
            const origPStart = pSeg.startTime;
            const origPEnd = pSeg.endTime;
            const origNextStart = nextWorkSeg.startTime;

            // Temporär anwenden
            prevWorkSeg.endTime = minutesToTime(newPStart);
            pSeg.startTime = minutesToTime(newPStart);
            pSeg.endTime = minutesToTime(newPEnd);
            nextWorkSeg.startTime = minutesToTime(newPEnd);

            // Prüfe, ob zur neuen Pausenzeit die Mindestbesetzung eingehalten ist
            let safe = true;
            for (let m = newPStart; m < newPEnd; m += 15) {
              const cov = getGroupCoverageAtMinute(defGroup.id, defDay, m, defGroup.minStaffRequired ?? 2);
              if (cov < (defGroup.minStaffRequired ?? 2)) {
                safe = false;
                break;
              }
            }

            if (safe) {
              empShift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
              repairMade = true;
              break;
            } else {
              // Rückgängig machen
              prevWorkSeg.endTime = origPrevEnd;
              pSeg.startTime = origPStart;
              pSeg.endTime = origPEnd;
              nextWorkSeg.startTime = origNextStart;
            }
          }
          if (repairMade) break;
        }
        if (repairMade) break;
      }
    }

    if (!repairMade) {
      break; // Keine weiteren automatischen Korrekturen möglich
    }
  }
  _diagSnapshot('After_Phase5_Repair');

  // Finale Segment-Bereinigung und Pausen-Validierung nach Phase 5 Reparaturen:
  newShifts.forEach(shift => {
    if (!shift.segments || shift.segments.length === 0) return;

    // Sortieren und Überlappungen ausschließen
    shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    for (let i = 0; i < shift.segments.length - 1; i++) {
      const curEnd = timeToMinutes(shift.segments[i].endTime);
      const nextStart = timeToMinutes(shift.segments[i + 1].startTime);
      if (curEnd > nextStart) {
        shift.segments[i].endTime = minutesToTime(nextStart);
      }
    }
    shift.segments = shift.segments.filter(s => timeToMinutes(s.endTime) > timeToMinutes(s.startTime));

    // Arbeitszeit und Pause prüfen
    let workMinutes = 0;
    let pauseMinutes = 0;
    shift.segments.forEach(s => {
      const dur = timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
      if (s.categoryId === PAUSE_CATEGORY.id) {
        pauseMinutes += dur;
      } else {
        workMinutes += dur;
      }
    });

    const requiredPause = workMinutes > 9 * 60 ? 45 : (workMinutes > 6 * 60 ? 30 : 0);
    if (requiredPause > pauseMinutes) {
      const missingPause = requiredPause - pauseMinutes;
      const existingPause = shift.segments.find(s => s.categoryId === PAUSE_CATEGORY.id);
      if (existingPause) {
        const pIdx = shift.segments.indexOf(existingPause);
        const nextSeg = shift.segments[pIdx + 1];
        if (nextSeg && timeToMinutes(nextSeg.endTime) - timeToMinutes(nextSeg.startTime) > missingPause) {
          const newPEnd = timeToMinutes(existingPause.endTime) + missingPause;
          existingPause.endTime = minutesToTime(newPEnd);
          nextSeg.startTime = minutesToTime(newPEnd);
        } else {
          const prevSeg = shift.segments[pIdx - 1];
          if (prevSeg && timeToMinutes(prevSeg.endTime) - timeToMinutes(prevSeg.startTime) > missingPause) {
            const newPStart = timeToMinutes(existingPause.startTime) - missingPause;
            existingPause.startTime = minutesToTime(newPStart);
            prevSeg.endTime = minutesToTime(newPStart);
          }
        }
      }
    }
  });

  // ARBEITSZEIT-ABGLEICH (UNTER- UND ÜBERSTUNDEN VERMEIDEN):
  employeePool.forEach(emp => {
    let curTotal = 0;
    const empShifts = newShifts.filter(s => s.employeeId === emp.id);
    empShifts.forEach(s => {
      s.segments.forEach(seg => {
        if (seg.categoryId === PAUSE_CATEGORY.id) return;
        curTotal += (timeToMinutes(seg.endTime) - timeToMinutes(seg.startTime));
      });
    });

    let diff = emp.targetWeeklyMinutes - curTotal;
    if (diff >= 15) {
      // Unterstunden ausgleichen (z.B. durch 45m Pausenverlängerung nach ArbZG verloren gegangen)
      const addMins = Math.floor(diff / 15) * 15;
      const candidateShift = empShifts.find(s => {
        if (s.segments.some(seg => seg.isTeamMeeting)) return false;
        const dWork = getEmployeeDailyMinutes(emp.id, s.dayOfWeek, newShifts);
        return dWork + addMins <= (options.targetMaxDailyHours || 8.5) * 60;
      });

      if (candidateShift && candidateShift.segments.length > 0) {
        const lastSeg = candidateShift.segments[candidateShift.segments.length - 1];
        const curEnd = timeToMinutes(lastSeg.endTime);
        lastSeg.endTime = minutesToTime(curEnd + addMins);
        emp.assignedWeeklyMinutes += addMins;
        if (lastSeg.categoryId === careCategory.id) emp.assignedCareMinutes += addMins;
        else emp.assignedDisposalMinutes += addMins;
        emp.dailyMinutes[candidateShift.dayOfWeek] = (emp.dailyMinutes[candidateShift.dayOfWeek] || 0) + addMins;
      }
    } else if (diff <= -15) {
      // Überstunden kappen / ausgleichen (z.B. 40h statt 39h):
      // Überzählige Betreuungszeit auf die vertraglichen Sollstunden zurückführen,
      // ABER NUR DORT, WO DIE MINDESTBESETZUNG DER KINDERBETREUUNG ZU 100% ERHALTEN BLEIBT!
      let overMins = Math.floor(Math.abs(diff) / 15) * 15;
      
      // In 15-Minuten-Schritten suchen wir die beste Stelle zum Abbau
      let maxSteps = overMins / 15;
      while (maxSteps > 0 && overMins >= 15) {
        maxSteps--;
        let stepCut = false;

        // Prüfe alle Tage des Mitarbeiters
        for (const day of WEEK_DAYS_PLAN) {
          if (stepCut || overMins < 15) break;

          const shift = empShifts.find(s => s.dayOfWeek === day);
          if (!shift || !shift.segments || shift.segments.length === 0) continue;

          // 1. ZUERST PRÜFEN: Schichtende (Nachmittags) um 15 Minuten verkürzen
          for (let i = shift.segments.length - 1; i >= 0; i--) {
            if (stepCut || overMins < 15) break;
            const seg = shift.segments[i];
            if (seg.categoryId !== careCategory.id || seg.isTeamMeeting) continue;
            // WICHTIG: Nur kürzen, wenn seg das LETZTE Segment der gesamten Schicht ist!
            if (i !== shift.segments.length - 1) continue;
            // WICHTIG: Wenn an diesem Tag eine Teamsitzung liegt, niemals das Schichtende vor der Sitzung kürzen (Lückenverbot)!
            if (shift.segments.some(s => s.isTeamMeeting)) continue;

            const sStart = timeToMinutes(seg.startTime);
            const sEnd = timeToMinutes(seg.endTime);
            if (sEnd - sStart <= 15) continue;

            const targetGroupId = seg.overriddenGroupId || emp.groupId;
            const targetGroup = groups.find(g => g.id === targetGroupId);
            const minStaff = targetGroup?.minStaffRequired ?? 2;
            const isEdgeTime = targetGroup?.edgeTimes?.[day] && isTimeInRanges(minutesToTime(sEnd - 15), targetGroup.edgeTimes[day]);
            const effectiveMinStaff = isEdgeTime ? 1 : minStaff;

            // STRIKTE PRÜFUNG: Ist die Gruppe von sEnd - 15 bis sEnd auch OHNE diesen Mitarbeiter noch ausreichend besetzt?
            let safeToCut = true;
            for (let m = sEnd - 15; m < sEnd; m += 15) {
              if (getGroupCoverageAtMinute(targetGroupId, day, m, effectiveMinStaff, emp.id) < effectiveMinStaff) {
                safeToCut = false;
                break;
              }
            }

            if (safeToCut) {
              seg.endTime = minutesToTime(sEnd - 15);
              overMins -= 15;
              emp.assignedWeeklyMinutes -= 15;
              emp.assignedCareMinutes -= 15;
              emp.dailyMinutes[day] = Math.max(0, (emp.dailyMinutes[day] || 0) - 15);
              stepCut = true;
              break;
            }
          }

          // 2. FALLS SCHICHTENDE NICHT SICHER WAR: Schichtanfang (Morgens) um 15 Minuten nach hinten schieben
          if (!stepCut && overMins >= 15) {
            for (let i = 0; i < shift.segments.length; i++) {
              if (stepCut || overMins < 15) break;
              const seg = shift.segments[i];
              if (seg.categoryId !== careCategory.id || seg.isTeamMeeting) continue;
              // WICHTIG: Nur verschieben, wenn seg das ALLERERSTE Segment der gesamten Schicht ist!
              if (i !== 0) continue;

              const sStart = timeToMinutes(seg.startTime);
              const sEnd = timeToMinutes(seg.endTime);
              if (sEnd - sStart <= 15) continue;

              // Feste Mitarbeiterwünsche bezüglich Startzeit nicht verletzen
              const wish = emp.wishes?.[day];
              if (wish && wish.requirementType === 'fixed' && wish.startTime) {
                if (sStart + 15 > timeToMinutes(wish.startTime)) continue;
              }

              const targetGroupId = seg.overriddenGroupId || emp.groupId;
              const targetGroup = groups.find(g => g.id === targetGroupId);
              const minStaff = targetGroup?.minStaffRequired ?? 2;
              const isEdgeTime = targetGroup?.edgeTimes?.[day] && isTimeInRanges(minutesToTime(sStart), targetGroup.edgeTimes[day]);
              const effectiveMinStaff = isEdgeTime ? 1 : minStaff;

              // STRIKTE PRÜFUNG: Ist die Gruppe von sStart bis sStart + 15 auch OHNE diesen Mitarbeiter noch ausreichend besetzt?
              let safeToCut = true;
              for (let m = sStart; m < sStart + 15; m += 15) {
                if (getGroupCoverageAtMinute(targetGroupId, day, m, effectiveMinStaff, emp.id) < effectiveMinStaff) {
                  safeToCut = false;
                  break;
                }
              }

              if (safeToCut) {
                seg.startTime = minutesToTime(sStart + 15);
                overMins -= 15;
                emp.assignedWeeklyMinutes -= 15;
                emp.assignedCareMinutes -= 15;
                emp.dailyMinutes[day] = Math.max(0, (emp.dailyMinutes[day] || 0) - 15);
                stepCut = true;
                break;
              }
            }
          }
        }

        // Falls in dieser Runde an keinem Tag/Uhrzeit sicher gekürzt werden konnte,
        // brechen wir ab, um auf keinen Fall eine Unterbesetzung zu erzeugen!
        if (!stepCut) {
          break;
        }
      }
    }
  });

  _diagSnapshot('After_Pausen_Validierung');

  // ZWANGS-CLEANUP GANZ AM SCHLUSS:
  // Jegliche Betreuungszeit, die (durch Verschiebungen aus Phase 4/5) nach den Öffnungszeiten der Gruppe liegt,
  // wird zwingend in VZ umgewandelt! Betreuung ist unmöglich ohne Kinder.
  if (disposalCategory) {
    newShifts.forEach(shift => {
      const emp = employeePool.find(e => e.id === shift.employeeId);
      if (!emp) return;
      
      let newSegments = [];
      shift.segments.forEach(seg => {
        if (seg.categoryId === careCategory.id && !seg.isTeamMeeting) {
           const targetGroup = groups.find(g => g.id === (seg.overriddenGroupId || emp.groupId)) || groups[0];
           const hours = targetGroup?.openingHours?.[shift.dayOfWeek] || [];
           const openStart = hours.length > 0 ? Math.min(...hours.map(h => timeToMinutes(h.start))) : 0;
           const openEnd = hours.length > 0 ? Math.max(...hours.map(h => timeToMinutes(h.end))) : 0;
           
           const segStart = timeToMinutes(seg.startTime);
           const segEnd = timeToMinutes(seg.endTime);
           const inStart = Math.max(segStart, openStart);
           const inEnd = Math.min(segEnd, openEnd);
           
           if (hours.length === 0 || inStart >= inEnd) {
              // Alles liegt außerhalb: Vollständig in VZ umwandeln (NIEMALS LÖSCHEN!)
              const convert = segEnd - segStart;
              newSegments.push({...seg, categoryId: disposalCategory.id, overriddenGroupId: null});
              emp.assignedCareMinutes -= convert;
              emp.assignedDisposalMinutes += convert;
           } else {
              if (segStart < inStart) {
                 const convert = inStart - segStart;
                 newSegments.push({...seg, startTime: minutesToTime(segStart), endTime: minutesToTime(inStart), categoryId: disposalCategory.id, overriddenGroupId: null});
                 emp.assignedCareMinutes -= convert;
                 emp.assignedDisposalMinutes += convert;
              }
              newSegments.push({...seg, startTime: minutesToTime(inStart), endTime: minutesToTime(inEnd)});
              if (segEnd > inEnd) {
                 // Prüfe, ob eine andere Gruppe (z.B. GT-Gruppe) noch geöffnet ist
                 let lateGroup = null;
                 let maxEnd = 0;
                 groups.forEach(g => {
                   const gh = g.openingHours?.[shift.dayOfWeek] || [];
                   const ge = gh.length > 0 ? Math.max(...gh.map(x => timeToMinutes(x.end))) : 0;
                   if (ge > inEnd && ge > maxEnd) {
                     maxEnd = ge;
                     lateGroup = g;
                   }
                 });

                 if (lateGroup && segEnd <= maxEnd) {
                   // Betreuung in der länger geöffneten Gruppe als Joker/Vertretung
                   newSegments.push({...seg, startTime: minutesToTime(inEnd), endTime: minutesToTime(segEnd), overriddenGroupId: lateGroup.id});
                 } else if (lateGroup && segEnd > maxEnd) {
                   newSegments.push({...seg, startTime: minutesToTime(inEnd), endTime: minutesToTime(maxEnd), overriddenGroupId: lateGroup.id});
                   const convert = segEnd - maxEnd;
                   newSegments.push({...seg, startTime: minutesToTime(maxEnd), endTime: minutesToTime(segEnd), categoryId: disposalCategory.id, overriddenGroupId: null});
                   emp.assignedCareMinutes -= convert;
                   emp.assignedDisposalMinutes += convert;
                 } else {
                   // Keine Gruppe mehr offen: In VZ umwandeln (NIEMALS LÖSCHEN!)
                   const convert = segEnd - inEnd;
                   newSegments.push({...seg, startTime: minutesToTime(inEnd), endTime: minutesToTime(segEnd), categoryId: disposalCategory.id, overriddenGroupId: null});
                   emp.assignedCareMinutes -= convert;
                   emp.assignedDisposalMinutes += convert;
                 }
              }
           }
        } else {
           newSegments.push(seg);
        }
      });
      shift.segments = newSegments;
    });
  }
  _diagSnapshot('After_Zwangs_Cleanup');

  // =========================================================================
  // UNIVERSALER ZERO-GAP-ENFORCER:
  // Regel 1: Bei Vollzeitkräften (>= 38h) darf es NIEMALS Lücken geben!
  //          Weder tagsüber noch vor einer Teamsitzung.
  // Regel 2: Bei Teilzeitkräften (< 38h) gibt es nur die Ausnahme bei Teamsitzungen.
  //          Tagsüber darf es auch bei Teilzeitkräften NIEMALS Lücken geben!
  // =========================================================================
  newShifts.forEach(shift => {
    if (!shift.segments || shift.segments.length <= 1) return;

    const emp = employeePool.find(e => e.id === shift.employeeId);
    if (!emp) return;

    const fullTime = isFullTimeEmployee(emp);

    let safety = 50;
    while (safety-- > 0) {
      shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      let hadChanges = false;

      for (let i = 0; i < shift.segments.length - 1; i++) {
        const curSeg = shift.segments[i];
        const nextSeg = shift.segments[i + 1];
        const curEnd = timeToMinutes(curSeg.endTime);
        const nextStart = timeToMinutes(nextSeg.startTime);

        if (curEnd > nextStart) {
          curSeg.endTime = minutesToTime(nextStart);
          hadChanges = true;
          break;
        }

        const gap = nextStart - curEnd;
        if (gap <= 0) continue;

        // Teilzeitkraft mit Lücke vor Teamsitzung ist als EINZIGE Ausnahme erlaubt
        if (!fullTime && nextSeg.isTeamMeeting) {
          continue;
        }

        // Vollzeitkraft vor Teamsitzung: Lücke MUSS geschlossen werden!
        if (fullTime && nextSeg.isTeamMeeting) {
          // 1. Prüfe zuerst, ob die Schicht nach hinten verschoben werden kann (z.B. 07:30 -> 09:30)
          const firstSeg = shift.segments[0];
          const firstStart = timeToMinutes(firstSeg.startTime);
          const empGroup = groups.find(g => g.id === emp.groupId) || groups[0];
          const minStaff = empGroup?.minStaffRequired ?? 2;
          
          const wish = emp.wishes?.[shift.dayOfWeek];
          const hasFixedStart = wish && wish.requirementType === 'fixed' && wish.startTime;

          let canShift = 0;
          if (!hasFixedStart) {
            for (let sStep = 15; sStep <= gap; sStep += 15) {
              let safe = true;
              for (let m = firstStart; m < firstStart + sStep; m += 15) {
                if (getGroupCoverageAtMinute(empGroup.id, shift.dayOfWeek, m, minStaff, emp.id) < minStaff) {
                  safe = false;
                  break;
                }
              }
              if (safe) canShift = sStep;
              else break;
            }
          }

          if (canShift > 0) {
            for (let k = 0; k <= i; k++) {
              const s = shift.segments[k];
              s.startTime = minutesToTime(timeToMinutes(s.startTime) + canShift);
              s.endTime = minutesToTime(timeToMinutes(s.endTime) + canShift);
            }
            hadChanges = true;
            break;
          }

          // 2. Prüfe, ob frühere VZ an das Ende vor die Sitzung verschoben werden kann
          const vzIdx = shift.segments.findIndex(s => disposalCategory && s.categoryId === disposalCategory.id && !s.isTeamMeeting && timeToMinutes(s.endTime) <= curEnd);
          if (vzIdx !== -1) {
            const vz = shift.segments[vzIdx];
            const vzDur = timeToMinutes(vz.endTime) - timeToMinutes(vz.startTime);
            vz.categoryId = careCategory.id;
            const newVzStart = Math.max(curEnd, nextStart - vzDur);
            if (newVzStart > curEnd) {
              curSeg.endTime = minutesToTime(newVzStart);
            }
            shift.segments.push({
              categoryId: disposalCategory.id,
              subCategoryId: '',
              startTime: minutesToTime(newVzStart),
              endTime: minutesToTime(nextStart),
              overriddenGroupId: null
            });
            hadChanges = true;
            break;
          }

          // 3. Ansonsten: Schließe die Lücke nahtlos mit VZ oder Betreuung
          const bridgeCat = disposalCategory ? disposalCategory.id : careCategory.id;
          shift.segments.push({
            categoryId: bridgeCat,
            subCategoryId: '',
            startTime: minutesToTime(curEnd),
            endTime: minutesToTime(nextStart),
            overriddenGroupId: null
          });
          hadChanges = true;
          break;
        }

        // Lücke tagsüber (Vollzeit ODER Teilzeit):
        const hasPause = shift.segments.some(s => s.categoryId === PAUSE_CATEGORY.id);
        let work = 0;
        shift.segments.forEach(s => {
          if (s.categoryId !== PAUSE_CATEGORY.id) work += (timeToMinutes(s.endTime) - timeToMinutes(s.startTime));
        });
        if (!hasPause && work > 360 && (gap === 30 || gap === 45)) {
          shift.segments.push({
            categoryId: PAUSE_CATEGORY.id,
            subCategoryId: '',
            startTime: minutesToTime(curEnd),
            endTime: minutesToTime(nextStart)
          });
          hadChanges = true;
          break;
        }

        // Teamsitzung darf NIEMALS als curSeg verlängert werden!
        if (curSeg.isTeamMeeting) {
          continue;
        }

        // Ansonsten: Nahtlos zusammenziehen!
        if (curSeg.categoryId !== PAUSE_CATEGORY.id) {
          curSeg.endTime = minutesToTime(nextStart);
        } else {
          nextSeg.startTime = minutesToTime(curEnd);
        }
        hadChanges = true;
        break;
      }

      // Entferne versehentliche Segmente nach einer abendlichen Teamsitzung (Meeting ab 16:00 Uhr):
      // Nach der Abendsitzung ist Feierabend!
      const eveningMeeting = shift.segments.find(s => s.isTeamMeeting && timeToMinutes(s.startTime) >= 960);
      if (eveningMeeting) {
        const meetEnd = timeToMinutes(eveningMeeting.endTime);
        shift.segments = shift.segments.filter(s => s.isTeamMeeting || timeToMinutes(s.startTime) < meetEnd);
      }

      if (!hadChanges) break;
    }

    // Finale Segment-Bereinigung: Benachbarte Blöcke der exakt gleichen Kategorie zusammenfassen
    shift.segments.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const merged = [];
    for (const seg of shift.segments) {
      if (timeToMinutes(seg.endTime) <= timeToMinutes(seg.startTime)) continue;
      if (merged.length === 0) {
        merged.push({ ...seg });
        continue;
      }
      const last = merged[merged.length - 1];
      if (last.endTime === seg.startTime &&
          last.categoryId === seg.categoryId &&
          (last.subCategoryId || '') === (seg.subCategoryId || '') &&
          (last.overriddenGroupId || null) === (seg.overriddenGroupId || null) &&
          !!last.isTeamMeeting === !!seg.isTeamMeeting) {
        last.endTime = seg.endTime;
      } else {
        merged.push({ ...seg });
      }
    }
    shift.segments = merged;
  });

  // Qualitätsbericht erstellen: Exakte Ist-Stunden aus den generierten Schichten ermitteln
  _diagSnapshot('Final');
  // Print Diagnostik
  console.log('\n=== GENERATOR DIAGNOSTIK ===');
  Object.values(_diagLog).forEach(emp => {
    const phases = emp.phases;
    const phaseNames = Object.keys(phases);
    let prevActual = 0;
    const deltas = phaseNames.map(p => {
      const delta = phases[p].actual - prevActual;
      prevActual = phases[p].actual;
      return delta > 0 ? '+' + (delta/60).toFixed(2) + 'h' : '';
    }).filter(Boolean);
    const final = phases['Final']?.actual || 0;
    const diff = final - emp.targetTotal;
    if (Math.abs(diff) > 15) {
      console.log(emp.name + ': Soll=' + (emp.targetTotal/60).toFixed(1) + 'h, Ist=' + (final/60).toFixed(2) + 'h, Diff=' + (diff/60).toFixed(2) + 'h');
      phaseNames.forEach(p => {
        if (phases[p].actual > 0) {
          console.log('  ' + p + ': actual=' + (phases[p].actual/60).toFixed(2) + 'h, internal=' + (phases[p].internal/60).toFixed(2) + 'h');
        }
      });
    }
  });
  console.log('=== ENDE DIAGNOSTIK ===\n');
  const finalMinutesMap = computeAssignedMinutesMap(newShifts);
  const remainingDeficits = calculateGroupDeficits(groups, employees, newShifts, careCategory.id, sickDays, subCategories);

  const report = {
    totalShiftsCreated: newShifts.length,
    remainingDeficits,
    employeeUtilization: employeePool.map(e => {
      const actualAssignedMins = finalMinutesMap[e.id] || 0;
      const diffMins = actualAssignedMins - e.targetWeeklyMinutes;
      return {
        id: e.id,
        name: e.name,
        contractedHours: e.contractedHours.toFixed(1),
        targetHours: (e.targetWeeklyMinutes / 60).toFixed(1),
        assignedHours: (actualAssignedMins / 60).toFixed(1),
        assignedCareHours: (e.assignedCareMinutes / 60).toFixed(1),
        assignedDisposalHours: (e.assignedDisposalMinutes / 60).toFixed(1),
        difference: (diffMins / 60).toFixed(1),
      };
    })
  };

  return {
    shifts: newShifts,
    remainingDeficits,
    report,
  };
};

/**
 * Automatischer Ersatzplan-Generator (Minimal-Perturbation bei Ausfall / Krankheit)
 */
export const generateReplacementSchedule = ({
  currentShifts = [],
  groups = [],
  employees = [],
  categories = [],
  subCategories = [],
  sickDays = {},
  options = {
    allowOvertimeHours: 2.0,
    convertDisposalTimeToCare: true,
  }
}) => {
  const careCategory = findCareCategory(categories);
  const disposalCategory = findDisposalCategory(categories);

  const modifiedShifts = deepClone(currentShifts);
  const changeLog = [];

  if (!careCategory) {
    throw new Error('Keine Betreuungskategorie definiert.');
  }

  let deficits = calculateGroupDeficits(groups, employees, modifiedShifts, careCategory.id, sickDays, subCategories);

  // Stufe 1: Verfügungszeit (VZ) gesunder Kollegen in Betreuung umwandeln
  if (options.convertDisposalTimeToCare && disposalCategory && deficits.length > 0) {
    deficits.forEach(deficit => {
      const healthyColleaguesInGroup = modifiedShifts.filter(s =>
        s.dayOfWeek === deficit.dayOfWeek &&
        !(sickDays[s.employeeId] || []).includes(deficit.dayOfWeek)
      );

      for (const shift of healthyColleaguesInGroup) {
        const emp = employees.find(e => e.id === shift.employeeId);
        if (!emp) continue;
        const isSameGroupOrFloater = (emp.groupId === deficit.groupId) || (!emp.groupId);
        if (!isSameGroupOrFloater) continue;

        for (const seg of shift.segments) {
          if (seg.categoryId === disposalCategory.id) {
            const segStart = timeToMinutes(seg.startTime);
            const segEnd = timeToMinutes(seg.endTime);

            if (segStart < deficit.endMinute && segEnd > deficit.startMinute) {
              seg.categoryId = careCategory.id;
              seg.overriddenGroupId = deficit.groupId;
              changeLog.push({
                type: 'disposal_to_care',
                employeeName: emp.name,
                dayOfWeek: deficit.dayOfWeek,
                description: `Verfügungszeit (${seg.startTime}-${seg.endTime}) von ${emp.name} temporär in Betreuung für ${deficit.groupName} umgewandelt.`
              });
              break;
            }
          }
        }
      }
    });

    deficits = calculateGroupDeficits(groups, employees, modifiedShifts, careCategory.id, sickDays, subCategories);
  }

  // Stufe 2: Schichten gesunder Kollegen moderat vorverlegen oder verlängern
  if (deficits.length > 0) {
    deficits.forEach(deficit => {
      const candidates = employees.filter(emp => {
        if ((sickDays[emp.id] || []).includes(deficit.dayOfWeek)) return false;
        return emp.groupId === deficit.groupId || !emp.groupId;
      });

      for (const candidate of candidates) {
        let empShift = modifiedShifts.find(s => s.employeeId === candidate.id && s.dayOfWeek === deficit.dayOfWeek);

        if (empShift) {
          const firstSeg = empShift.segments[0];
          const lastSeg = empShift.segments[empShift.segments.length - 1];
          if (!firstSeg || !lastSeg) continue;

          const currentStart = timeToMinutes(firstSeg.startTime);
          const currentEnd = timeToMinutes(lastSeg.endTime);

          if (deficit.startMinute < currentStart && deficit.endMinute <= currentStart + 60) {
            const newStart = Math.max(deficit.startMinute, currentStart - 60);
            const check = isTimeWindowValidForEmployee(candidate, deficit.dayOfWeek, newStart, currentEnd, sickDays);
            if (check.valid) {
              firstSeg.startTime = minutesToTime(newStart);
              changeLog.push({
                type: 'shift_extended',
                employeeName: candidate.name,
                dayOfWeek: deficit.dayOfWeek,
                description: `Dienstbeginn von ${candidate.name} um ${currentStart - newStart} Min. nach vorne verlegt (${minutesToTime(newStart)} statt ${minutesToTime(currentStart)}).`
              });
              break;
            }
          }

          if (deficit.endMinute > currentEnd && deficit.startMinute >= currentEnd - 60) {
            const newEnd = Math.min(deficit.endMinute, currentEnd + 60);
            const check = isTimeWindowValidForEmployee(candidate, deficit.dayOfWeek, currentStart, newEnd, sickDays);
            if (check.valid) {
              lastSeg.endTime = minutesToTime(newEnd);
              changeLog.push({
                type: 'shift_extended',
                employeeName: candidate.name,
                dayOfWeek: deficit.dayOfWeek,
                description: `Dienstende von ${candidate.name} um ${newEnd - currentEnd} Min. verlängert (bis ${minutesToTime(newEnd)}).`
              });
              break;
            }
          }
        } else {
          const check = isTimeWindowValidForEmployee(candidate, deficit.dayOfWeek, deficit.startMinute, deficit.endMinute, sickDays);
          if (check.valid) {
            const weeklyHours = getEmployeeWeeklyHours(candidate.id, modifiedShifts);
            if (weeklyHours + 4 <= (candidate.contractedHoursPerWeek || 0) + options.allowOvertimeHours) {
              const duration = deficit.endMinute - deficit.startMinute;
              const { segments } = buildShiftSegmentsWithBreaks(
                duration,
                deficit.startMinute,
                careCategory.id,
                candidate.groupId ? null : deficit.groupId
              );

              modifiedShifts.push({
                id: `rep-shift-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
                employeeId: candidate.id,
                dayOfWeek: deficit.dayOfWeek,
                segments
              });
              changeLog.push({
                type: 'replacement_cover',
                employeeName: candidate.name,
                dayOfWeek: deficit.dayOfWeek,
                description: `${candidate.name} springt als Vertretung ein (${minutesToTime(deficit.startMinute)}-${minutesToTime(deficit.endMinute)}) für ${deficit.groupName}.`
              });
              break;
            }
          }
        }
      }
    });
  }

  const finalDeficits = calculateGroupDeficits(groups, employees, modifiedShifts, careCategory.id, sickDays, subCategories);

  return {
    shifts: modifiedShifts,
    changeLog,
    remainingDeficits: finalDeficits,
    success: finalDeficits.length === 0,
  };
};
