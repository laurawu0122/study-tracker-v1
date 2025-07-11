#!/usr/bin/env node

/**
 * 生产环境检查脚本
 * 用于检查项目是否适合部署到生产环境
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色定义
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// 日志函数
function log(message, color = 'blue') {
    console.log(`${colors[color]}[${new Date().toISOString()}]${colors.reset} ${message}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

// 检查文件是否存在
function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        logSuccess(`${description}: ${filePath}`);
        return true;
    } else {
        logError(`${description}: ${filePath} (文件不存在)`);
        return false;
    }
}

// 检查环境变量
function checkEnvironmentVariables() {
    log('检查环境变量配置...', 'blue');
    
    const requiredVars = [
        'NODE_ENV',
        'PORT',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME'
    ];
    
    const optionalVars = [
        'EMAIL_HOST',
        'EMAIL_PORT',
        'EMAIL_USER',
        'EMAIL_PASS',
        'DEFAULT_ADMIN_PASSWORD'
    ];
    
    let allRequired = true;
    
    requiredVars.forEach(varName => {
        if (process.env[varName]) {
            logSuccess(`必需环境变量: ${varName}`);
        } else {
            logError(`必需环境变量: ${varName} (未设置)`);
            allRequired = false;
        }
    });
    
    optionalVars.forEach(varName => {
        if (process.env[varName]) {
            logSuccess(`可选环境变量: ${varName}`);
        } else {
            logWarning(`可选环境变量: ${varName} (未设置)`);
        }
    });
    
    return allRequired;
}

// 检查安全配置
function checkSecurityConfig() {
    log('检查安全配置...', 'blue');
    
    const securityChecks = [
        {
            name: 'Helmet 安全头',
            check: () => {
                const serverContent = fs.readFileSync('server.js', 'utf8');
                return serverContent.includes('helmet');
            }
        },
        {
            name: 'CORS 配置',
            check: () => {
                const serverContent = fs.readFileSync('server.js', 'utf8');
                return serverContent.includes('cors');
            }
        },
        {
            name: '速率限制',
            check: () => {
                const serverContent = fs.readFileSync('server.js', 'utf8');
                return serverContent.includes('express-rate-limit');
            }
        },
        {
            name: 'JWT 密钥长度',
            check: () => {
                const jwtSecret = process.env.JWT_SECRET;
                return jwtSecret && jwtSecret.length >= 32;
            }
        }
    ];
    
    let allPassed = true;
    
    securityChecks.forEach(check => {
        if (check.check()) {
            logSuccess(check.name);
        } else {
            logError(check.name);
            allPassed = false;
        }
    });
    
    return allPassed;
}

// 检查数据库配置
function checkDatabaseConfig() {
    log('检查数据库配置...', 'blue');
    
    const dbChecks = [
        {
            name: 'Knex 配置文件',
            file: 'knexfile.js'
        },
        {
            name: '数据库连接文件',
            file: 'database/db.js'
        },
        {
            name: '迁移文件目录',
            file: 'database/migrations'
        },
        {
            name: '种子文件目录',
            file: 'database/seeds'
        }
    ];
    
    let allPassed = true;
    
    dbChecks.forEach(check => {
        if (checkFile(check.file, check.name)) {
            logSuccess(check.name);
        } else {
            allPassed = false;
        }
    });
    
    return allPassed;
}

// 检查 Docker 配置
function checkDockerConfig() {
    log('检查 Docker 配置...', 'blue');
    
    const dockerFiles = [
        'Dockerfile',
        'docker-compose.yml',
        'docker-compose.prod.yml',
        '.dockerignore'
    ];
    
    let allPassed = true;
    
    dockerFiles.forEach(file => {
        if (checkFile(file, `Docker 文件: ${file}`)) {
            logSuccess(`Docker 文件: ${file}`);
        } else {
            allPassed = false;
        }
    });
    
    return allPassed;
}

// 检查依赖
function checkDependencies() {
    log('检查项目依赖...', 'blue');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // 检查必需依赖
        const requiredDeps = [
            'express',
            'pg',
            'knex',
            'bcrypt',
            'jsonwebtoken',
            'helmet',
            'cors',
            'express-rate-limit'
        ];
        
        let allPassed = true;
        
        requiredDeps.forEach(dep => {
            if (packageJson.dependencies && packageJson.dependencies[dep]) {
                logSuccess(`依赖: ${dep}`);
            } else {
                logError(`依赖: ${dep} (缺失)`);
                allPassed = false;
            }
        });
        
        return allPassed;
    } catch (error) {
        logError(`读取 package.json 失败: ${error.message}`);
        return false;
    }
}

// 检查日志配置
function checkLoggingConfig() {
    log('检查日志配置...', 'blue');
    
    const logChecks = [
        {
            name: '日志目录',
            file: 'logs'
        },
        {
            name: '日志工具',
            file: 'utils/logger.js'
        }
    ];
    
    let allPassed = true;
    
    logChecks.forEach(check => {
        if (checkFile(check.file, check.name)) {
            logSuccess(check.name);
        } else {
            allPassed = false;
        }
    });
    
    return allPassed;
}

// 检查敏感文件
function checkSensitiveFiles() {
    log('检查敏感文件...', 'blue');
    
    const sensitiveFiles = [
        '.env',
        '.env.local',
        '.env.production',
        'ADMIN_CREDENTIALS.md'
    ];
    
    let hasSensitiveFiles = false;
    
    sensitiveFiles.forEach(file => {
        if (fs.existsSync(file)) {
            logWarning(`敏感文件存在: ${file} (确保已添加到 .gitignore)`);
            hasSensitiveFiles = true;
        }
    });
    
    if (!hasSensitiveFiles) {
        logSuccess('未发现敏感文件');
    }
    
    return true;
}

// 主检查函数
async function runProductionCheck() {
    log('开始生产环境检查...', 'blue');
    console.log('');
    
    const checks = [
        { name: '环境变量', fn: checkEnvironmentVariables },
        { name: '安全配置', fn: checkSecurityConfig },
        { name: '数据库配置', fn: checkDatabaseConfig },
        { name: 'Docker 配置', fn: checkDockerConfig },
        { name: '项目依赖', fn: checkDependencies },
        { name: '日志配置', fn: checkLoggingConfig },
        { name: '敏感文件', fn: checkSensitiveFiles }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
        console.log('');
        const result = check.fn();
        if (!result) {
            allPassed = false;
        }
    }
    
    console.log('');
    console.log('='.repeat(50));
    
    if (allPassed) {
        logSuccess('所有检查通过！项目已准备好部署到生产环境。');
    } else {
        logError('部分检查失败，请修复上述问题后再部署。');
        process.exit(1);
    }
    
    console.log('');
    log('建议在部署前执行以下步骤:', 'blue');
    console.log('1. 运行 npm run build:css 构建前端资源');
    console.log('2. 运行 npm run db:migrate 执行数据库迁移');
    console.log('3. 测试所有功能是否正常');
    console.log('4. 备份数据库（如果适用）');
    console.log('5. 使用 Docker 部署: ./scripts/deploy.sh docker-prod');
}

// 运行检查
if (require.main === module) {
    runProductionCheck().catch(error => {
        logError(`检查过程中发生错误: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    runProductionCheck,
    checkEnvironmentVariables,
    checkSecurityConfig,
    checkDatabaseConfig,
    checkDockerConfig,
    checkDependencies,
    checkLoggingConfig,
    checkSensitiveFiles
}; 