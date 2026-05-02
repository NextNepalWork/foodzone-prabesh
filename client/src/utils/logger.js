// Production-safe logging utility
const logger = {
  log: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args);
    }
  },
  error: (...args) => {
    console.error(...args); // Always log errors
  },
  warn: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(...args);
    }
  }
};

export default logger;
