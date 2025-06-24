# Cloudflare D1 数据库设置指南

## 🚀 为什么需要 D1 数据库？

Cloudflare Pages 是无服务器环境，每次请求都会重新初始化，导致：
- 数据库重置
- 用户数据丢失
- 密码重新生成

## 📋 设置步骤

### 1. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare
```bash
wrangler login
```

### 3. 创建 D1 数据库
```bash
wrangler d1 create study-tracker-db
```

### 4. 获取数据库 ID
```bash
wrangler d1 list
```

### 5. 配置 wrangler.toml
```toml
name = "study-tracker"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "study-tracker-db"
database_id = "your-database-id-here"
```

### 6. 创建数据库表
```bash
wrangler d1 execute study-tracker-db --file=./database/schema.sql
```

### 7. 设置环境变量
在 Cloudflare Pages 控制台设置：
```
JWT_SECRET=your-super-secret-jwt-key
DB_BINDING=DB
```

## 🔧 修改代码以支持 D1

### 1. 创建 D1 适配器
```javascript
// database/d1-adapter.js
export class D1Adapter {
    constructor(db) {
        this.db = db;
    }
    
    async query(sql, params = []) {
        return await this.db.prepare(sql).bind(...params).all();
    }
    
    async run(sql, params = []) {
        return await this.db.prepare(sql).bind(...params).run();
    }
    
    async get(sql, params = []) {
        return await this.db.prepare(sql).bind(...params).first();
    }
}
```

### 2. 修改数据库初始化
```javascript
// 使用 D1 而不是 SQLite
const adapter = new D1Adapter(env.DB);
```

## 📊 数据库迁移

### 创建迁移脚本
```sql
-- database/schema.sql
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
);

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
);

CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'registration',
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_date ON study_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_project ON study_records(user_id, project_name);
CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at);
```

## 🔐 设置默认管理员

### 1. 生成密码哈希
```bash
node -e "
const bcrypt = require('bcryptjs');
const password = 'admin123';
bcrypt.hash(password, 12).then(hash => {
    console.log('Password hash:', hash);
    console.log('Default password:', password);
});
"
```

### 2. 插入默认管理员
```sql
INSERT INTO users (username, password_hash, email, role, is_first_admin) 
VALUES ('admin', 'your-hash-here', 'admin@system.local', 'admin', 1);

INSERT INTO system_config (key, value) VALUES 
('registration_enabled', 'true'),
('first_admin_created', 'true');
```

## 🚀 部署

### 1. 构建项目
```bash
npm run build
```

### 2. 部署到 Cloudflare Pages
```bash
wrangler pages deploy dist
```

## ✅ 验证部署

1. 访问您的 Cloudflare Pages URL
2. 使用默认凭据登录：
   - 用户名：`admin`
   - 密码：`admin123`（或您设置的密码）
3. 立即修改默认密码

## 🔧 故障排除

### 常见问题：
1. **数据库连接失败**：检查 D1 数据库 ID 和绑定
2. **表不存在**：运行数据库迁移脚本
3. **权限错误**：检查 Wrangler 权限设置

### 调试命令：
```bash
# 查看数据库状态
wrangler d1 execute study-tracker-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# 查看用户表
wrangler d1 execute study-tracker-db --command="SELECT * FROM users;"
``` 