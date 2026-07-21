const winston = require('winston');
import * as dotenv from "dotenv";
import { format } from "winston";
const DailyRotateFile = require('winston-daily-rotate-file');
import { traceContext } from './trace.context';

dotenv.config();

const logger = winston.createLogger({
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
    format.printf(info => {
      // Agregar trace_id del contexto actual
      const currentTraceId = traceContext.getTraceId();
      const metadata = (info.metadata && typeof info.metadata === 'object' && Object.keys(info.metadata).length)
        ? JSON.stringify(info.metadata)
        : '';
      return `${info.timestamp} ${info.level}: [${currentTraceId}] ${info.message} ${metadata}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: false,
      maxFiles: '180d',
    }),
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      zippedArchive: false,
      maxFiles: '180d',
    })
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: format.combine(
      format.colorize(),
      format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      format.printf(info => {
        // Agregar trace_id del contexto actual para consola también
        const currentTraceId = traceContext.getTraceId();
        const metadata = (info.metadata && typeof info.metadata === 'object' && Object.keys(info.metadata).length)
          ? JSON.stringify(info.metadata)
          : '';
        return `${info.timestamp} ${info.level}: [${currentTraceId}] ${info.message} ${metadata}`;
      })
    )
  }));
}

export { logger };