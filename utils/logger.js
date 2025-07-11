const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.ensureLogDirectory();
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.logLevels[process.env.LOG_LEVEL?.toUpperCase()] ?? this.logLevels.INFO;
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    formatMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data) {
            if (typeof data === 'object') {
                formattedMessage += ` ${JSON.stringify(data, null, 2)}`;
            } else {
                formattedMessage += ` ${data}`;
            }
        }
        
        return formattedMessage;
    }

    writeToFile(filename, message) {
        const filePath = path.join(this.logDir, filename);
        const logMessage = message + '\n';
        
        try {
            fs.appendFileSync(filePath, logMessage, 'utf8');
        } catch (error) {
            console.error('写入日志文件失败:', error);
        }
    }

    shouldLog(level) {
        return this.logLevels[level] <= this.currentLevel;
    }

    error(message, data = null) {
        if (!this.shouldLog('ERROR')) return;
        
        const formattedMessage = this.formatMessage('ERROR', message, data);
        console.error(formattedMessage);
        this.writeToFile('error.log', formattedMessage);
    }

    warn(message, data = null) {
        if (!this.shouldLog('WARN')) return;
        
        const formattedMessage = this.formatMessage('WARN', message, data);
        console.warn(formattedMessage);
        this.writeToFile('warn.log', formattedMessage);
    }

    info(message, data = null) {
        if (!this.shouldLog('INFO')) return;
        
        const formattedMessage = this.formatMessage('INFO', message, data);
        console.log(formattedMessage);
        this.writeToFile('info.log', formattedMessage);
    }

    debug(message, data = null) {
        if (!this.shouldLog('DEBUG')) return;
        
        const formattedMessage = this.formatMessage('DEBUG', message, data);
        console.log(formattedMessage);
        this.writeToFile('debug.log', formattedMessage);
    }

    // 安全日志 - 记录安全相关事件
    security(event, data = null) {
        const formattedMessage = this.formatMessage('SECURITY', event, data);
        console.warn(formattedMessage);
        this.writeToFile('security.log', formattedMessage);
    }

    // 操作日志 - 记录用户操作
    operation(operation, userId, details = null) {
        const data = {
            operation,
            userId,
            timestamp: this.getTimestamp(),
            details
        };
        const formattedMessage = this.formatMessage('OPERATION', operation, data);
        console.log(formattedMessage);
        this.writeToFile('operations.log', formattedMessage);
    }

    // 性能日志 - 记录性能相关数据
    performance(operation, duration, data = null) {
        const perfData = {
            operation,
            duration: `${duration}ms`,
            timestamp: this.getTimestamp(),
            ...data
        };
        const formattedMessage = this.formatMessage('PERFORMANCE', operation, perfData);
        console.log(formattedMessage);
        this.writeToFile('performance.log', formattedMessage);
    }
}

// 创建单例实例
const logger = new Logger();

module.exports = logger; 