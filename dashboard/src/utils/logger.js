const winston = require('winston');
const path = require('path');

// Define log levels and colors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.metadata ? '\n' + JSON.stringify(info.metadata, null, 2) : ''}`
    )
);

// Define which logs to print based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};

// Create the logger
const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports: [
        // Console transport
        new winston.transports.Console(),
        
        // Write all logs with level 'error' and below to error.log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        
        // Write all logs to combined.log
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/combined.log'),
            format: winston.format.combine(
                winston.format.uncolorize(),
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ]
});

// Add colors to Winston
winston.addColors(colors);

// Create a stream object for Morgan
const stream = {
    write: (message) => logger.http(message.trim())
};

module.exports = {
    logger,
    stream
}; 