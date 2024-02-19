import winston, { format, transports } from 'winston'
import { Service } from 'typedi'

// @ts-ignore
@Service()
export class LoggerService {
  private logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      // Specify the minimum level the logger should log.
      level: 'info',
      // Define multiple formats to be used together.
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss' // Customize timestamp format
        }),
        format.errors({ stack: true }), // Log the full stack trace on errors
        format.splat(), // Provides string interpolation
        format.json() // Log in JSON format
      ),
      // Define different transports for logging.
      transports: [
        // Console transport for logging to the console
        new transports.Console({
          format: format.combine(
            format.colorize(), // Colorize log levels
            format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`) // Customize console log format
          )
        }),
        // File transport for logging to a file
        new transports.File({
          filename: 'logs/combined.log', // All logs
          level: 'info'
        }),
        new transports.File({
          filename: 'logs/errors.log', // Error logs
          level: 'error',
          format: format.combine(
            format.json() // You might prefer JSON for file logging for easier parsing
          )
        })
      ]
    })
  }

  info(message: string, ...meta: any[]) {
    this.logger.info(message, ...meta)
  }

  error(message: string, ...meta: any[]) {
    this.logger.error(message, ...meta)
  }
}
