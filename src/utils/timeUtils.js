// Helper function to compare semantic versions (e.g., "1.0.0" vs "1.0.1")
export const compareVersions = (version1, version2) => {
  const cleanV1 = version1.replace(/\s*\(.*\)\s*$/, '');
  const cleanV2 = version2.replace(/\s*\(.*\)\s*$/, '');
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

// Helper function to convert HH:MM to minutes from midnight
export const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes from midnight to HH:MM
export const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper function to validate time format (e.g., "07:30")
export const isValidTime = (time) => {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(time);
};

// Helper function to check if a given time (HH:MM) falls within any of the provided ranges
export const isTimeInRanges = (time, ranges) => {
  if (!time || !ranges || ranges.length === 0) {
    return false;
  }

  const [currentHour, currentMinute] = time.split(':').map(Number);
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  for (const range of ranges) {
    const [startHour, startMinute] = range.start.split(':').map(Number);
    const [endHour, endMinute] = range.end.split(':').map(Number);

    let startTimeInMinutes = startHour * 60 + startMinute;
    let endTimeInMinutes = endHour * 60 + endMinute;

    // Handle overnight ranges (e.g., 22:00 - 06:00)
    if (endTimeInMinutes < startTimeInMinutes) {
      // If the time is after start and before midnight, OR after midnight and before end
      if (currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes) {
        return true;
      }
    } else {
      // Normal range
      if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
        return true;
      }
    }
  }
  return false;
};

// Helper function to merge overlapping or adjacent time ranges
export const mergeTimeRanges = (ranges) => {
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

// Helper to format minutes into "X.YYh" (decimal hours) or "Xh" for whole hours
export const formatMinutesToDecimalHours = (totalMinutes) => {
  const hours = totalMinutes / 60;
  if (hours % 1 === 0) {
    return hours.toFixed(0) + 'h';
  }
  return hours.toFixed(2) + 'h';
};
