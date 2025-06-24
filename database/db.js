const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'studytracker.db');

// 确保数据目录存在
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

let db;

// 生成随机默认管理员密码
function generateDefaultAdminPassword() {
    const crypto = require('crypto');
    
    // 优先使用环境变量中的密码
    if (process.env.DEFAULT_ADMIN_PASSWORD) {
        return process.env.DEFAULT_ADMIN_PASSWORD;
    }
    
    // 检查是否在Vercel或Cloudflare Pages环境中
    if (process.env.VERCEL || process.env.CF_PAGES || process.env.NODE_ENV === 'production') {
        // 在生产环境中使用固定密码，避免每次重置
        return 'Admin123!';
    }
    
    // 本地开发环境使用随机密码
    return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// 默认管理员密码 - 根据环境决定是否重新生成
const DEFAULT_ADMIN_PASSWORD = generateDefaultAdminPassword();

function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('数据库连接失败:', err);
                reject(err);
                return;
            }
            console.log('数据库连接成功');
            
            // 启用外键约束
            db.run('PRAGMA foreign_keys = ON');
            
            // 创建系统配置表
            db.run(`
                CREATE TABLE IF NOT EXISTS system_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('创建系统配置表失败:', err);
                    reject(err);
                    return;
                }
                
                // 创建用户表
                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        email TEXT UNIQUE,
                        role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
                        is_first_admin BOOLEAN DEFAULT 0,
                        is_active BOOLEAN DEFAULT 1,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_login DATETIME,
                        password_changed BOOLEAN DEFAULT 0
                    )
                `, (err) => {
                    if (err) {
                        console.error('创建用户表失败:', err);
                        reject(err);
                        return;
                    }
                    
                    // 创建学习数据表
                    db.run(`
                        CREATE TABLE IF NOT EXISTS study_records (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            date TEXT NOT NULL,
                            project_name TEXT NOT NULL,
                            start_time TEXT NOT NULL,
                            end_time TEXT NOT NULL,
                            duration INTEGER NOT NULL,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                        )
                    `, (err) => {
                        if (err) {
                            console.error('创建学习记录表失败:', err);
                            reject(err);
                            return;
                        }
                        
                        // 创建验证码表
                        db.run(`
                            CREATE TABLE IF NOT EXISTS verification_codes (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                email TEXT NOT NULL,
                                code TEXT NOT NULL,
                                type TEXT NOT NULL DEFAULT 'registration',
                                expires_at DATETIME NOT NULL,
                                used BOOLEAN DEFAULT 0,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                        `, (err) => {
                            if (err) {
                                console.error('创建验证码表失败:', err);
                                reject(err);
                                return;
                            }
                            
                            // 创建索引
                            db.run('CREATE INDEX IF NOT EXISTS idx_user_date ON study_records(user_id, date)');
                            db.run('CREATE INDEX IF NOT EXISTS idx_user_project ON study_records(user_id, project_name)');
                            db.run('CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email)');
                            db.run('CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at)');
                            
                            // 初始化系统配置
                            initializeSystemConfig().then(() => {
                                console.log('数据库初始化完成');
                                resolve();
                            }).catch((err) => {
                                console.error('初始化系统配置失败:', err);
                                reject(err);
                            });
                        });
                    });
                });
            });
        });
    });
}

// 初始化系统配置
async function initializeSystemConfig() {
    return new Promise((resolve, reject) => {
        // 检查是否已有管理员
        db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row.count === 0) {
                // 没有管理员，创建默认管理员账户
                createDefaultAdmin().then(resolve).catch(reject);
            } else {
                // 已有管理员，设置系统配置
                setSystemConfigs().then(resolve).catch(reject);
            }
        });
    });
}

// 创建默认管理员账户
async function createDefaultAdmin() {
    return new Promise((resolve, reject) => {
        const bcrypt = require('bcryptjs');
        
        bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12).then(passwordHash => {
            db.run(
                'INSERT INTO users (username, password_hash, email, role, is_first_admin) VALUES (?, ?, ?, ?, ?)',
                ['admin', passwordHash, 'admin@system.local', 'admin', 1],
                function(err) {
                    if (err) {
                        console.error('创建默认管理员失败:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log('默认管理员账户创建成功');
                    console.log(`默认用户名: admin`);
                    console.log('⚠️  请首次登录后立即修改默认密码！');
                    console.log('⚠️  默认密码请查看系统日志或联系管理员');
                    
                    // 将生成的密码写入临时文件，供管理员查看
                    const fs = require('fs');
                    const passwordFile = path.join(__dirname, '..', 'data', 'admin_password.txt');
                    fs.writeFileSync(passwordFile, `默认管理员密码: ${DEFAULT_ADMIN_PASSWORD}\n生成时间: ${new Date().toISOString()}\n⚠️  请及时删除此文件！`);
                    console.log(`⚠️  默认密码已保存到: ${passwordFile}`);
                    console.log('⚠️  请及时删除该文件以确保安全！');
                    
                    setSystemConfigs().then(resolve).catch(reject);
                }
            );
        }).catch(reject);
    });
}

// 设置系统配置
async function setSystemConfigs() {
    return new Promise((resolve, reject) => {
        const configs = [
            ['registration_enabled', 'true'],
            ['first_admin_created', 'true'],
            ['default_admin_password', DEFAULT_ADMIN_PASSWORD]
        ];
        
        let completed = 0;
        configs.forEach(([key, value]) => {
            db.run(
                'INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
                [key, value],
                (err) => {
                    if (err) {
                        console.error(`设置配置 ${key} 失败:`, err);
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === configs.length) {
                        resolve();
                    }
                }
            );
        });
    });
}

// 检查是否是第一个管理员
async function isFirstAdminLogin(username) {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT is_first_admin, password_changed FROM users WHERE username = ? AND role = "admin"',
            [username],
            (err, user) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(user && user.is_first_admin && !user.password_changed);
            }
        );
    });
}

// 标记管理员已更改密码
async function markAdminPasswordChanged(userId) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET password_changed = 1, is_first_admin = 0 WHERE id = ?',
            [userId],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

// 获取系统配置
function getSystemConfig(key) {
    return new Promise((resolve, reject) => {
        db.get('SELECT value FROM system_config WHERE key = ?', [key], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.value : null);
            }
        });
    });
}

// 更新系统配置
function updateSystemConfig(key, value) {
    return new Promise((resolve, reject) => {
        db.run(
            'INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
            [key, value],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

function getDatabase() {
    if (!db) {
        throw new Error('数据库未初始化');
    }
    return db;
}

function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('关闭数据库失败:', err);
            } else {
                console.log('数据库连接已关闭');
            }
        });
    }
}

// 验证码管理函数
async function saveVerificationCode(email, code, type = 'registration') {
    return new Promise((resolve, reject) => {
        // 设置10分钟过期时间
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        
        // 先删除该邮箱的旧验证码
        db.run('DELETE FROM verification_codes WHERE email = ? AND type = ?', [email, type], (err) => {
            if (err) {
                console.error('删除旧验证码失败:', err);
                reject(err);
                return;
            }
            
            // 保存新验证码
            db.run(
                'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
                [email, code, type, expiresAt],
                function(err) {
                    if (err) {
                        console.error('保存验证码失败:', err);
                        reject(err);
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    });
}

async function verifyCode(email, code, type = 'registration') {
    return new Promise((resolve, reject) => {
        db.get(
            'SELECT id, used, expires_at FROM verification_codes WHERE email = ? AND code = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
            [email, code, type],
            (err, row) => {
                if (err) {
                    console.error('查询验证码失败:', err);
                    reject(err);
                    return;
                }
                
                if (!row) {
                    resolve({ valid: false, reason: '验证码不存在' });
                    return;
                }
                
                if (row.used) {
                    resolve({ valid: false, reason: '验证码已使用' });
                    return;
                }
                
                const now = new Date();
                const expiresAt = new Date(row.expires_at);
                
                if (now > expiresAt) {
                    resolve({ valid: false, reason: '验证码已过期' });
                    return;
                }
                
                // 标记验证码为已使用
                db.run('UPDATE verification_codes SET used = 1 WHERE id = ?', [row.id], (err) => {
                    if (err) {
                        console.error('标记验证码为已使用失败:', err);
                    }
                });
                
                resolve({ valid: true });
            }
        );
    });
}

// 清理过期验证码
async function cleanupExpiredCodes() {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM verification_codes WHERE expires_at < datetime("now")', (err) => {
            if (err) {
                console.error('清理过期验证码失败:', err);
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// 数据库连接状态检查
function checkDatabaseConnection() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        db.get('SELECT 1', (err) => {
            if (err) {
                console.error('数据库连接检查失败:', err);
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

// 定期检查数据库连接
setInterval(() => {
    checkDatabaseConnection().catch(err => {
        console.error('数据库连接异常:', err);
        // 可以在这里添加重连逻辑
    });
}, 300000); // 每5分钟检查一次

module.exports = {
    initDatabase,
    getDatabase,
    closeDatabase,
    isFirstAdminLogin,
    markAdminPasswordChanged,
    getSystemConfig,
    updateSystemConfig,
    saveVerificationCode,
    verifyCode,
    cleanupExpiredCodes,
    checkDatabaseConnection,
    DEFAULT_ADMIN_PASSWORD
}; 