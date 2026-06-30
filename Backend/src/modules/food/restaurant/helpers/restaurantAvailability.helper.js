const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const normalizeDay = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  const match = DAY_NAMES.find((day) => day.toLowerCase() === trimmed);
  if (match) return match;
  const abbreviatedMatch = DAY_NAMES.find((day) =>
    day.toLowerCase().startsWith(trimmed.slice(0, 3)),
  );
  return abbreviatedMatch || null;
};

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return null;
  const raw = timeValue.trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase();
  const meridiemMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/);
  if (meridiemMatch) {
    let hour = Number(meridiemMatch[1]);
    const minute = Number(meridiemMatch[2]);
    const period = meridiemMatch[3];
    if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) return null;
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    if (hour < 0 || hour > 23) return null;
    return hour * 60 + minute;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!twentyFourHourMatch) return null;

  const hour = Number(twentyFourHourMatch[1]);
  const minute = Number(twentyFourHourMatch[2]);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
};

const getTodayTiming = (restaurant, dayName) => {
  const outletTimingsArray = restaurant?.outletTimings?.timings;
  if (Array.isArray(outletTimingsArray)) {
    const exact = outletTimingsArray.find((entry) => normalizeDay(entry?.day) === dayName);
    if (exact) return exact;
  }

  const outletTimingsObject = restaurant?.outletTimings;
  if (
    outletTimingsObject &&
    typeof outletTimingsObject === 'object' &&
    !Array.isArray(outletTimingsObject)
  ) {
    const direct = outletTimingsObject[dayName];
    if (direct && typeof direct === 'object') return direct;
  }

  return null;
};

const isWithinTimeWindow = (nowMinutes, openingMinutes, closingMinutes) => {
  if (openingMinutes === null || closingMinutes === null) return true;
  if (openingMinutes === closingMinutes) return true;

  if (closingMinutes > openingMinutes) {
    return nowMinutes >= openingMinutes && nowMinutes <= closingMinutes;
  }

  return nowMinutes >= openingMinutes || nowMinutes <= closingMinutes;
};

export function getRestaurantAvailabilityStatus(restaurant, now = new Date(), options = {}) {
  if (!restaurant) {
    return {
      isOpen: false,
      isAcceptingOrders: false,
      isWithinTimings: false,
      reason: 'missing-restaurant',
    };
  }

  const ignoreOperationalStatus = options?.ignoreOperationalStatus === true;
  const isActive = restaurant.isActive !== false;
  const isAcceptingOrders = restaurant.isAcceptingOrders !== false;

  if (!ignoreOperationalStatus && !isActive) {
    return {
      isOpen: false,
      isActive,
      isAcceptingOrders,
      isWithinTimings: false,
      reason: 'inactive',
    };
  }

  if (!ignoreOperationalStatus && !isAcceptingOrders) {
    return {
      isOpen: false,
      isActive,
      isAcceptingOrders,
      isWithinTimings: false,
      reason: 'not-accepting-orders',
    };
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const checkDayWindow = (targetDate) => {
    const dayName = DAY_NAMES[targetDate.getDay()];
    const timing = getTodayTiming(restaurant, dayName);
    const openDays = Array.isArray(restaurant.openDays) ? restaurant.openDays : [];

    if (timing && timing.isOpen === false) {
      return { isWithin: false, hasWindow: true, timing };
    }

    const openingTime =
      timing?.openingTime ||
      restaurant?.deliveryTimings?.openingTime ||
      restaurant?.openingTime ||
      null;
    const closingTime =
      timing?.closingTime ||
      restaurant?.deliveryTimings?.closingTime ||
      restaurant?.closingTime ||
      null;
    const openingMinutes = parseTimeToMinutes(openingTime);
    const closingMinutes = parseTimeToMinutes(closingTime);
    const hasExplicitWindow = Boolean(openingTime || closingTime);

    if (!timing && openDays.length > 0) {
      const normalizedOpenDays = new Set(
        openDays.map((d) => normalizeDay(d)).filter(Boolean),
      );
      if (normalizedOpenDays.size > 0 && !normalizedOpenDays.has(dayName)) {
        return { isWithin: false, hasWindow: true, reason: 'closed-day' };
      }
    }

    const isWithin = hasExplicitWindow
      ? openingMinutes !== null &&
        closingMinutes !== null &&
        isWithinTimeWindow(nowMinutes, openingMinutes, closingMinutes)
      : true;

    return {
      isWithin,
      hasWindow: hasExplicitWindow,
      openingTime,
      closingTime,
      openingMinutes,
      closingMinutes,
      timing,
    };
  };

  const today = checkDayWindow(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = checkDayWindow(yesterdayDate);

  const yesterdayCrossesMidnight =
    yesterday.openingMinutes !== null &&
    yesterday.closingMinutes !== null &&
    yesterday.closingMinutes < yesterday.openingMinutes;
  const isYesterdayStillOpen =
    yesterdayCrossesMidnight && nowMinutes <= yesterday.closingMinutes;
  const isTodayOpen = today.isWithin;
  const isOpenNow = isTodayOpen || isYesterdayStillOpen;

  return {
    isOpen: isOpenNow,
    isActive,
    isAcceptingOrders,
    isWithinTimings: isOpenNow,
    reason: isOpenNow
      ? isAcceptingOrders
        ? 'open'
        : 'open-by-timings'
      : today.hasWindow
        ? 'outside-hours'
        : 'no-timings',
  };
}

export function assertRestaurantAcceptingOrders(restaurant, at = new Date()) {
  const availability = getRestaurantAvailabilityStatus(restaurant, at);
  if (availability.isOpen) return availability;

  if (availability.reason === 'not-accepting-orders') {
    throw new Error('RESTAURANT_OFFLINE');
  }

  throw new Error('RESTAURANT_CLOSED');
}
