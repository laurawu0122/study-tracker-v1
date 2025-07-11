# 📝 日志系统使用指南

## 概述

本项目使用统一的日志系统来管理错误处理和调试信息。所有后端错误统一使用 `console.error()` 输出，重要错误会写入日志文件。前端调试信息可临时使用 `console.log()`，上线前需要清理。

## 日志系统特性

### 日志级别
- **ERROR**: 错误信息，会输出到控制台和 error.log 文件
- **WARN**: 警告信息，会输出到控制台和 warn.log 文件  
- **INFO**: 一般信息，会输出到控制台和 info.log 文件
- **DEBUG**: 调试信息，会输出到控制台和 debug.log 文件

### 特殊日志类型
- **SECURITY**: 安全相关事件，记录到 security.log
- **OPERATION**: 用户操作记录，记录到 operations.log
- **PERFORMANCE**: 性能数据，记录到 performance.log

## 使用方法

### 1. 引入日志模块

```javascript
const logger = require('../utils/logger');
```

### 2. 基本日志记录

```javascript
// 错误日志
logger.error('数据库连接失败', { error: error.message, stack: error.stack });

// 警告日志
logger.warn('用户登录失败次数过多', { userId: user.id, attempts: 5 });

// 信息日志
logger.info('用户登录成功', { userId: user.id, username: user.username });

// 调试日志
logger.debug('开始处理请求', { url: req.url, method: req.method });
```

### 3. 特殊日志记录

```javascript
// 安全日志
logger.security('登录失败', { 
    ip: req.ip, 
    username: req.body.username,
    reason: '密码错误' 
});

// 操作日志
logger.operation('创建项目', req.user.id, {
    projectName: '学习项目',
    projectId: project.id
});

// 性能日志
logger.performance('数据库查询', 150, {
    query: 'SELECT * FROM users',
    resultCount: 100
});
```

## 错误处理规范

### 后端错误处理

1. **所有错误必须使用 `console.error()` 或 `logger.error()`**
2. **重要错误必须写入日志文件**
3. **错误信息应包含足够的上下文**

```javascript
// ✅ 正确的错误处理
try {
    const result = await db.query('SELECT * FROM users');
    return result;
} catch (error) {
    logger.error('数据库查询失败', {
        error: error.message,
        stack: error.stack,
        query: 'SELECT * FROM users',
        userId: req.user?.id
    });
    throw error;
}

// ❌ 错误的错误处理
try {
    const result = await db.query('SELECT * FROM users');
    return result;
} catch (error) {
    console.log('查询失败:', error); // 不应该使用 console.log
    throw error;
}
```

### 前端调试信息

1. **开发阶段可以使用 `console.log()` 进行调试**
2. **上线前必须清理所有调试代码**
3. **使用清理脚本自动移除调试代码**

```javascript
// 开发阶段 - 可以临时使用
console.log('用户数据:', userData);
console.log('表单提交:', formData);

// 上线前 - 使用清理脚本移除
// npm run clean:debug
```

## 日志文件管理

### 日志文件位置
所有日志文件存储在 `logs/` 目录下：
- `error.log` - 错误日志
- `warn.log` - 警告日志  
- `info.log` - 信息日志
- `debug.log` - 调试日志
- `security.log` - 安全日志
- `operations.log` - 操作日志
- `performance.log` - 性能日志

### 查看日志

```bash
# 查看错误日志
npm run log:view

# 查看所有日志
npm run log:view-all

# 查看特定日志文件
tail -f logs/security.log
```

### 日志轮转
建议定期清理日志文件，避免占用过多磁盘空间：

```bash
# 清理30天前的日志
find logs/ -name "*.log" -mtime +30 -delete
```

## 环境变量配置

在 `.env` 文件中配置日志级别：

```bash
# 日志配置
LOG_LEVEL=info  # error, warn, info, debug
LOG_SECURITY_EVENTS=true
```

## 中间件使用

### 错误处理中间件

```javascript
const { errorHandler, asyncHandler } = require('../middleware/error-handler');

// 使用异步错误包装器
router.get('/users', asyncHandler(async (req, res) => {
    const users = await db.getUsers();
    res.json(users);
}));

// 使用错误处理中间件（在 app.js 的最后）
app.use(errorHandler);
```

### 性能监控中间件

```javascript
const { performanceMonitor, requestLogger } = require('../middleware/error-handler');

// 在路由之前添加
app.use(performanceMonitor);
app.use(requestLogger);
```

## 清理调试代码

### 自动清理

```bash
# 清理所有调试 console.log 语句
npm run clean:debug
```

### 清理规则
- 移除 `console.log()` 和 `console.debug()` 语句
- 保留 `console.error()`, `console.warn()`, `console.info()` 语句
- 保留注释和空行
- 只处理 `.js` 和 `.hbs` 文件

### 手动清理检查清单
- [ ] 检查 `assets/js/` 目录下的前端代码
- [ ] 检查 `routes/` 目录下的路由文件
- [ ] 检查 `services/` 目录下的服务文件
- [ ] 检查 `middleware/` 目录下的中间件文件
- [ ] 检查 `views/` 目录下的模板文件

## 最佳实践

### 1. 错误日志记录
- 始终包含错误消息和堆栈信息
- 添加相关的上下文信息（用户ID、请求URL等）
- 使用结构化数据而不是字符串拼接

### 2. 性能日志记录
- 记录慢查询和慢请求
- 监控关键操作的执行时间
- 定期分析性能日志

### 3. 安全日志记录
- 记录所有登录尝试（成功和失败）
- 记录敏感操作（密码修改、权限变更等）
- 记录异常访问模式

### 4. 操作日志记录
- 记录用户的重要操作
- 包含操作前后的状态变化
- 便于审计和问题追踪

## 注意事项

1. **不要在生产环境使用 DEBUG 级别日志**
2. **敏感信息不要记录到日志中（密码、令牌等）**
3. **定期检查和清理日志文件**
4. **监控日志文件大小，避免磁盘空间不足**
5. **重要操作必须有相应的日志记录**

## 故障排除

### 常见问题

1. **日志文件无法创建**
   - 检查 `logs/` 目录权限
   - 确保应用有写入权限

2. **日志级别不生效**
   - 检查 `LOG_LEVEL` 环境变量设置
   - 重启应用使配置生效

3. **日志文件过大**
   - 调整日志级别
   - 实施日志轮转策略
   - 定期清理旧日志文件 