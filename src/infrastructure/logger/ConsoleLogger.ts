export interface ILogger {
  info(message: string): void;
  error(message: string): void;
  debug(message: string): void;
  warn(message: string): void;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

export class ConsoleLogger implements ILogger {
  info(message: string): void {
    console.log(`[${formatTimestamp()}] [INFO] ${message}`);
  }
  error(message: string): void {
    console.error(`[${formatTimestamp()}] [ERROR] ${message}`);
  }
  debug(message: string): void {
    console.debug(`[${formatTimestamp()}] [DEBUG] ${message}`);
  }
  warn(message: string): void {
    console.warn(`[${formatTimestamp()}] [WARN] ${message}`);
  }
}
