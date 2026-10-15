const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../logs');

// Ensure the logs directory exists
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Helper to get the current date string in YYYY-MM-DD format (local time)
 */
function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Helper to get the current date-time string in YYYY-MM-DD HH:mm:ss format
 */
function getLocalDateTimeString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Writes a log message to the console and to the daily log file.
 * @param {string} message 
 */
function log(message) {
    const timestamp = getLocalDateTimeString();
    const formattedMessage = `[${timestamp}] ${message}`;

    // Print to console
    console.log(formattedMessage);

    // Append to file
    const logFileName = `${getLocalDateString()}.log`;
    const logFilePath = path.join(logsDir, logFileName);

    try {
        fs.appendFileSync(logFilePath, formattedMessage + '\n', 'utf8');
    } catch (error) {
        console.error(`[Logger Error] Failed to write to log file: ${error.message}`);
    }
}

/**
 * Cleans up daily log files that are older than the specified retention days.
 */
function cleanupOldLogs() {
    try {
        const expiryDays = parseInt(process.env.LOG_EXPIRY_DAYS, 10);
        
        // Safeguard if parsing fails or user inputs negative/invalid number
        if (isNaN(expiryDays) || expiryDays < 0) {
            log(`[Logger] LOG_EXPIRY_DAYS is not configured or invalid (value: ${process.env.LOG_EXPIRY_DAYS}). Retaining all logs.`);
            return;
        }

        log(`[Logger] Running log cleanup check. Retention limit: ${expiryDays} days.`);

        const files = fs.readdirSync(logsDir);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let deletedCount = 0;

        for (const file of files) {
            if (path.extname(file) === '.log') {
                const nameWithoutExt = path.basename(file, '.log');
                const fileDate = new Date(nameWithoutExt);

                if (!isNaN(fileDate.getTime())) {
                    fileDate.setHours(0, 0, 0, 0);
                    
                    // Difference in milliseconds
                    const diffMs = today.getTime() - fileDate.getTime();
                    // Convert to days
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffDays > expiryDays) {
                        const filePath = path.join(logsDir, file);
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        log(`[Logger] Deleted expired log file: ${file} (Age: ${diffDays} days)`);
                    }
                }
            }
        }

        if (deletedCount > 0) {
            log(`[Logger] Cleanup completed. Deleted ${deletedCount} expired log file(s).`);
        } else {
            log(`[Logger] Cleanup completed. No expired log files found.`);
        }
    } catch (error) {
        console.error(`[Logger Error] Error running log cleanup:`, error);
    }
}

/**
 * Initializes and schedules log cleanup task.
 */
function startLogCleanupScheduler() {
    // Run cleanup once on server startup
    cleanupOldLogs();

    // Schedule cleanup to run every 24 hours
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(cleanupOldLogs, TWENTY_FOUR_HOURS);
    log(`[Logger] Automated log cleanup scheduler started (runs every 24 hours).`);
}

module.exports = {
    log,
    cleanupOldLogs,
    startLogCleanupScheduler
};
