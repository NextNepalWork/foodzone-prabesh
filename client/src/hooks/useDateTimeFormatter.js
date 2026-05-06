import { useEffect, useState } from 'react';
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

  // Don't use useCallback - we want these to use the latest settings
  const formatDate = (date, options) => {
    return dateTimeFormatter.formatDate(date, options);
  };

  const formatTime = (date, options) => {
    return dateTimeFormatter.formatTime(date, options);
  };

  const formatDateTime = (date, options) => {
    return dateTimeFormatter.formatDateTime(date, options);
  };

  const formatTimeWithWeekday = (date) => {
    return dateTimeFormatter.formatTimeWithWeekday(date);
  };

  const getCurrentDate = () => {
    return dateTimeFormatter.getCurrentDate();
  };

  const getCurrentTime = () => {
    return dateTimeFormatter.getCurrentTime();
  };

  const isToday = (date) => {
    return dateTimeFormatter.isToday(date);
  };

  const getTimezoneOffset = () => {
    return dateTimeFormatter.getTimezoneOffset();
  };

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
