import type { Logger } from "./types.js";

/** Default logger that writes to the console. */
export const consoleLogger: Logger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

/** A logger that discards all output, handy for tests. */
export const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
