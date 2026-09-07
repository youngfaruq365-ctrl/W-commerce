const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure stats directory exists
const logDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let metaText = '';
    if (meta && Object.keys(meta).length > 0) {
        try {
            metaText = ` ${JSON.stringify(meta)}`;
        } catch (error) {
            metaText = ` ${JSON.stringify({ meta: 'unserializable' })}`;
        }
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaText}`;
});

// Configure Winston
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Log errors to error.log
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error'
        }),
        // Log everything to combined.log
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log')
        })
    ]
});

// If we're not in production then log to the `console` as well
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat
        )
    }));
}

// Stream for Morgan (HTTP request logger)
logger.stream = {
    write: function (message) {
        // Use the 'info' log level so the output will be picked up by both transports (file and console)
        logger.info(message.trim());
    }
};

module.exports = logger;
