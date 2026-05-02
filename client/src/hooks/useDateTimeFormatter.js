import { useEffect, useState, useCallback } from 'react';
import dateTimeFormatter from '../utils/dateTimeFormatter';

/**
 * Hook for formatting dates and times with restaurant timezone settings
 * Automatically updates when settings change
 */
export function useDateTimeFormatter() {
  const [, setRefresh] = useState(0);

  // Update formatter when settings might have changed
  useEffect(() => {
    dateTimeFormatter.updateSettings();
    setRefresh(prev => prev + 1);
  }, []);

  const formatDate = useCallback((date, options) => {
    return dateTimeFormatter.formatDate(date, options);
  }, []);

  const formatTime = useCallback((date, options) => {
    return dateTimeFormatter.formatTime(date, options);
  }, []);

  const formatDateTime = useCallback((date, options) => {
    return dateTimeFormatter.formatDateTime(date, options);
  }, []);

  const formatTimeWithWeekday = useCallback((date) => {
    return dateTimeFormatter.formatTimeWithWeekday(date);
  }, []);

  const getCurrentDate = useCallback(() => {
    return dateTimeFormatter.getCurrentDate();
  }, []);

  const getCurrentTime = useCallback(() => {
    return dateTimeFormatter.getCurrentTime();
  }, []);

  const isToday = useCallback((date) => {
    return dateTimeFormatter.isToday(date);
  }, []);

  const getTimezoneOffset = useCallback(() => {
    return dateTimeFormatter.getTimezoneOffset();
  }, []);

  return {
    formatDate,
    formatTime,
    formatDateTime,
    formatTimeWithWeekday,
    getCurrentDate,
    getCurrentTime,
    isToday,
    getTimezoneOffset,
    timezone: dateTimeFormatter.settings.timezone,
    timeFormat: dateTimeFormatter.settings.timeFormat,
    dateFormat: dateTimeFormatter.settings.dateFormat
  };
}
