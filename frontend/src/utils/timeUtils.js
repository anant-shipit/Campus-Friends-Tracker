// Time slot definitions matching the backend's 14 × 50-minute slots.
const SLOT_TIMES = [
  { start: '08:00', end: '08:50', startMin: 480, endMin: 530 },
  { start: '08:50', end: '09:40', startMin: 530, endMin: 580 },
  { start: '09:40', end: '10:30', startMin: 580, endMin: 630 },
  { start: '10:30', end: '11:20', startMin: 630, endMin: 680 },
  { start: '11:20', end: '12:10', startMin: 680, endMin: 730 },
  { start: '12:10', end: '13:00', startMin: 730, endMin: 780 },
  { start: '13:00', end: '13:50', startMin: 780, endMin: 830 },
  { start: '13:50', end: '14:40', startMin: 830, endMin: 880 },
  { start: '14:40', end: '15:30', startMin: 880, endMin: 930 },
  { start: '15:30', end: '16:20', startMin: 930, endMin: 980 },
  { start: '16:20', end: '17:10', startMin: 980, endMin: 1030 },
  { start: '17:10', end: '18:00', startMin: 1030, endMin: 1080 },
  { start: '18:00', end: '18:50', startMin: 1080, endMin: 1130 },
  { start: '18:50', end: '19:40', startMin: 1130, endMin: 1180 },
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/**
 * Convert JS Date.getDay() (0=Sun) to our index (0=Mon..4=Fri, -1 for weekends).
 */
export function weekdayToIndex(jsDay) {
  if (jsDay >= 1 && jsDay <= 5) return jsDay - 1;
  return -1;
}

/**
 * Get today's day index (0=Mon..4=Fri), defaults to 0 on weekends.
 */
export function getTodayIndex() {
  const idx = weekdayToIndex(new Date().getDay());
  return idx >= 0 ? idx : 0;
}

/**
 * Get current slot index (0-13) or -1 if outside class hours.
 */
export function getCurrentSlotIndex(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < SLOT_TIMES.length; i++) {
    if (minutes >= SLOT_TIMES[i].startMin && minutes < SLOT_TIMES[i].endMin) {
      return i;
    }
  }
  return -1;
}

/**
 * Check if today is a weekend.
 */
export function isWeekend(now = new Date()) {
  return weekdayToIndex(now.getDay()) < 0;
}

/**
 * Format time string "HH:MM" or "HH:MM:SS" to "H:MM AM/PM".
 */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Compute the real-time status for a friend given cached timetable data.
 * @param {Object} friend - { id, name, batchCode }
 * @param {Object} timetable - The cached master timetable { batchCode: { dayIndex: [slots] } }
 * @param {Date} now - Current time
 * @returns {Object} FriendStatus { ...friend, currentStatus, currentClass, nextClass }
 */
export function computeFriendStatus(friend, timetable, now = new Date()) {
  const status = {
    ...friend,
    currentStatus: 'free',
    currentClass: null,
    nextClass: null,
  };

  const dayIdx = weekdayToIndex(now.getDay());

  // Weekends: everyone is free.
  if (dayIdx < 0 || dayIdx > 4) return status;

  // Get today's slots for this friend's batch.
  const batchSchedule = timetable?.[friend.batchCode];
  if (!batchSchedule) return status;

  const slots = batchSchedule[dayIdx];
  if (!slots || slots.length === 0) return status;

  const currentSlotIdx = getCurrentSlotIndex(now);

  // Check current slot.
  if (currentSlotIdx >= 0) {
    const slot = slots.find((s) => s.slotIndex === currentSlotIdx) || slots[currentSlotIdx];
    if (slot && slot.classType && slot.classType !== 'free') {
      status.currentStatus = 'in_class';
      status.currentClass = {
        subjectName: slot.subjectName || '',
        classType: slot.classType,
        room: slot.room || '',
        startsAt: slot.startTime || '',
        endsAt: slot.endTime || '',
      };
    }
  }

  // Find next non-free slot.
  let searchFrom = currentSlotIdx >= 0 ? currentSlotIdx + 1 : 0;
  for (let i = searchFrom; i < 14; i++) {
    const slot = slots.find((s) => s.slotIndex === i) || slots[i];
    if (slot && slot.classType && slot.classType !== 'free') {
      status.nextClass = {
        subjectName: slot.subjectName || '',
        classType: slot.classType,
        room: slot.room || '',
        startsAt: slot.startTime || '',
        endsAt: slot.endTime || '',
      };
      break;
    }
  }

  return status;
}

/**
 * Get day schedule slots for a batch from cached timetable.
 */
export function getDaySchedule(timetable, batchCode, dayIndex) {
  return timetable?.[batchCode]?.[dayIndex] || [];
}

/**
 * Find common free slots across multiple batch codes on a given day.
 */
export function findCommonFreeSlots(timetable, batchCodes, dayIndex) {
  const busySlots = new Set();

  for (const code of batchCodes) {
    const slots = getDaySchedule(timetable, code, dayIndex);
    for (const s of slots) {
      if (s.classType && s.classType !== 'free') {
        busySlots.add(s.slotIndex);
      }
    }
  }

  const freeSlots = [];
  for (let i = 0; i < SLOT_TIMES.length; i++) {
    if (!busySlots.has(i)) {
      freeSlots.push({
        slotIndex: i,
        startTime: SLOT_TIMES[i].start,
        endTime: SLOT_TIMES[i].end,
      });
    }
  }

  return freeSlots;
}

/**
 * Find "Private Session" slots where ALL roommates are currently in class simultaneously.
 */
export function getPrivateSessionSlots(timetable, roommateBatchCodes, dayIndex) {
  if (roommateBatchCodes.length === 0) return [];

  const privateSlots = [];
  
  for (let i = 0; i < SLOT_TIMES.length; i++) {
    let allInClass = true;
    for (const code of roommateBatchCodes) {
      const slots = getDaySchedule(timetable, code, dayIndex);
      const s = slots.find((slot) => slot.slotIndex === i) || slots[i];
      if (!s || !s.classType || s.classType === 'free') {
        allInClass = false;
        break;
      }
    }
    
    if (allInClass) {
      privateSlots.push({
        slotIndex: i,
        startTime: SLOT_TIMES[i].start,
        endTime: SLOT_TIMES[i].end,
      });
    }
  }

  // Merge consecutive slots
  const merged = [];
  if (privateSlots.length > 0) {
    let current = { ...privateSlots[0] };
    for (let i = 1; i < privateSlots.length; i++) {
      if (privateSlots[i].slotIndex === current.slotIndex + 1) {
        current.endTime = privateSlots[i].endTime;
        current.slotIndex = privateSlots[i].slotIndex;
      } else {
        merged.push(current);
        current = { ...privateSlots[i] };
      }
    }
    merged.push(current);
  }

  return merged;
}

export { SLOT_TIMES, DAY_NAMES };
