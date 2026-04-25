const isDevelopment = import.meta.env.DEV;

type LogContext = Record<string, unknown>;

export const dashboardLogger = {
  warn(module: string, message: string, context?: LogContext) {
    console.warn(`[${module}] ${message}`, context ?? {});
  },
  error(module: string, message: string, context?: LogContext) {
    console.error(`[${module}] ${message}`, context ?? {});
  },
  debug(module: string, message: string, context?: LogContext) {
    if (isDevelopment) {
      console.debug(`[${module}] ${message}`, context ?? {});
    }
  }
};
