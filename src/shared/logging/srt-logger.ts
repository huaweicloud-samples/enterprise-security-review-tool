import * as path from "path";
import * as fs from "fs";
import winston from "winston";

/**
 * 轻量日志封装（基于 winston）。
 * 日志落盘到 <应用目录>/logs/srt.log，并同步输出到控制台。
 */
const appDir = process.cwd();

export class SrtLogger {
  private static logger: winston.Logger | null = null;

  private static getLogger(): winston.Logger {
    if (!SrtLogger.logger) {
      const logDir = path.join(appDir, ".srt", "logs");
      fs.mkdirSync(logDir, { recursive: true });
      SrtLogger.logger = winston.createLogger({
        level: "info",
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`),
        ),
        transports: [
          new winston.transports.File({ filename: path.join(logDir, "srt.log") }),
          new winston.transports.Console({ format: winston.format.simple() }),
        ],
      });
    }
    return SrtLogger.logger;
  }

  static logInfo(message: string, meta?: Record<string, unknown>): void {
    SrtLogger.getLogger().info(meta ? `${message} ${JSON.stringify(meta)}` : message);
  }

  static logError(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const detail = error ? ` ${error.message}` : "";
    SrtLogger.getLogger().error(meta ? `${message}${detail} ${JSON.stringify(meta)}` : `${message}${detail}`);
  }
}
