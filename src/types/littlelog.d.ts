declare module "@littlethings/log" {
  /**
   * Log levels that can be set with `configure`.
   */
  export declare enum LogLevel {
    Silent = "SILENT",
    Info = "INFO",
    Debug = "DEBUG",
    Trace = "TRACE",
  }
  export interface LogConfig {
    /**
     * How verbose the logging should be.
     * Defaults to `process.env.LOG_LEVEL`.
     */
    level: LogLevel;
    /**
     * An optional filter used to filter logs based on prefix.
     * Defaults to `undefined`.
     */
    filter: string | RegExp | undefined;
    /**
     * Whether or not to log prefixes before messages.
     * Defaults to `true`.
     */
    prefix: boolean;
    /**
     * Whether or not to log timestamps.
     * Defaults to `true`.
     */
    timestamp: boolean;
    /**
     * Whether or not to enable color logging.
     * Defaults to `true` if in a TTY, otherwise defaults to `false`.
     */
    color: boolean;
    /**
     * Whether or not to enable icons in logs.
     * Defaults to `false`.
     */
    icons: boolean;
  }
  /**
   * Configure LittleLog's output.
   */
  export declare function configure(value: Partial<LogConfig>): void;
  /**
   * A convenience type for use with `parseLogLevelNumber`.
   */
  export declare type LogLevelAsNumber = 0 | 1 | 2;
  /**
   * Take a number and return the name of the LogLevel it corresponds to.
   */
  export declare function parseLogLevelNumber(
    level: LogLevelAsNumber,
  ): LogLevel.Info | LogLevel.Debug | LogLevel.Trace | undefined;
  declare class LittleLog {
    private prefix;
    constructor(prefix: Array<string>);
    static create(prefix?: string): LittleLog;
    child(prefix: string): LittleLog;
    private log;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    debug: (...args: any[]) => void;
    trace: (...args: any[]) => void;
    error: (...args: any[]) => void;
    fatal: (...args: any[]) => void;
  }
  export type { LittleLog };
  declare const _default: LittleLog;
  export default _default;
}
