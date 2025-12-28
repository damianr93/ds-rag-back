export function formatLog(level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG', message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

export const log = {
  info: (message: string) => console.log(formatLog('INFO', message)),
  error: (message: string, error?: any) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(formatLog('ERROR', `${message}${errorMsg ? ` - ${errorMsg}` : ''}`));
  },
  warn: (message: string) => console.warn(formatLog('WARN', message)),
  debug: (message: string) => console.debug(formatLog('DEBUG', message)),
};
