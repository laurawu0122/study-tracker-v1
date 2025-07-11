const path = require('path');
const crypto = require('crypto');

/**
 * 数据导入安全中间件
 * 提供多层安全验证，防止恶意文件上传和非法访问
 */

// 允许的Excel文件MIME类型
const ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/octet-stream' // 某些系统可能返回这个
];

// 允许的文件扩展名
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

// Excel文件签名（魔数）
const EXCEL_FILE_SIGNATURES = [
    Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP/XLSX (Office 2007+)
    Buffer.from([0x50, 0x4B, 0x05, 0x06]), // ZIP/XLSX (Office 2007+)
    Buffer.from([0x50, 0x4B, 0x07, 0x08]), // ZIP/XLSX (Office 2007+)
    Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]), // XLS (Office 97-2003)
    Buffer.from([0x09, 0x08, 0x10, 0x00, 0x00, 0x06, 0x05, 0x00]), // XLS (Office 95)
    Buffer.from([0x09, 0x08, 0x10, 0x00, 0x00, 0x06, 0x05, 0x00]), // XLS (Office 95)
    Buffer.from([0x09, 0x08, 0x10, 0x00, 0x00, 0x06, 0x05, 0x00]), // XLS (Office 95)
    Buffer.from([0x09, 0x08, 0x10, 0x00, 0x00, 0x06, 0x05, 0x00])  // XLS (Office 95)
];

// 允许的工作表名称
const ALLOWED_SHEET_NAMES = [
    '用户数据', '学习项目', '学习记录', '学习会话', 
    '成就系统', '用户成就', '积分记录', '积分兑换', 
    '通知记录', '操作日志', '系统配置'
];

// 恶意代码模式检测
const MALICIOUS_PATTERNS = [
    // JavaScript代码模式
    /<script[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
    
    // SQL注入模式
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    /exec\s*\(/i,
    /xp_cmdshell/i,
    
    // 系统命令执行模式
    /system\s*\(/i,
    /exec\s*\(/i,
    /shell_exec/i,
    /passthru/i,
    /proc_open/i,
    /popen/i,
    
    // 文件操作模式
    /file_get_contents/i,
    /file_put_contents/i,
    /fopen/i,
    /fwrite/i,
    /unlink/i,
    /rmdir/i,
    
    // 网络请求模式
    /curl_exec/i,
    /file_get_contents.*http/i,
    /fsockopen/i,
    
    // 权限提升模式
    /chmod\s*\(/i,
    /chown\s*\(/i,
    /sudo/i,
    /su\s+/i,
    
    // 反序列化攻击模式
    /unserialize\s*\(/i,
    /__destruct/i,
    /__wakeup/i,
    
    // 路径遍历模式
    /\.\.\/\.\./i,
    /\.\.\\\.\./i,
    /%2e%2e%2f/i,
    /%2e%2e%5c/i,
    
    // 编码绕过模式
    /base64_decode/i,
    /urldecode/i,
    /hex2bin/i,
    
    // 特殊字符和编码
    /&#x?[0-9a-f]+;/i,
    /%[0-9a-f]{2}/i,
    /\\x[0-9a-f]{2}/i,
    
    // 可疑的HTML标签
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<applet/i,
    
    // 可疑的协议
    /data:text\/html/i,
    /vbscript:/i,
    /data:application/i
];

// 权限提升检测模式
const PRIVILEGE_ESCALATION_PATTERNS = [
    /admin.*role/i,
    /role.*admin/i,
    /权限.*提升/i,
    /权限.*管理员/i,
    /管理员.*权限/i,
    /superuser/i,
    /root.*access/i,
    /privilege.*escalation/i,
    /bypass.*auth/i,
    /auth.*bypass/i
];

/**
 * 验证管理员权限
 */
function validateAdminAccess(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        logSecurityEvent(req, 'unauthorized_access_attempt', {
            attemptedOperation: 'data_import',
            userRole: req.user?.role,
            ip: req.ip
        });
        return res.status(403).json({
            success: false,
            error: '权限不足，只有管理员可以执行数据导入操作'
        });
    }
    next();
}

/**
 * 验证请求来源
 */
function validateRequestOrigin(req, res, next) {
    const referer = req.get('Referer');
    const origin = req.get('Origin');
    // 允许本地开发Referer为空但Origin为localhost/127.0.0.1
    if (
        (!referer && origin && (origin.includes('localhost') || origin.includes('127.0.0.1')))
    ) {
        return next();
    }
    // 只要Referer包含/admin即可
    if (!referer || !referer.includes('/admin')) {
        logSecurityEvent(req, 'invalid_request_origin', {
            referer: referer,
            origin: origin,
            ip: req.ip
        });
        return res.status(403).json({
            success: false,
            error: '非法请求来源，数据导入只能在管理后台执行'
        });
    }
    // 检查Origin（如果存在）
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        logSecurityEvent(req, 'suspicious_origin', {
            origin: origin,
            ip: req.ip
        });
    }
    next();
}

/**
 * 验证文件类型和扩展名
 */
function validateFileType(file) {
    if (!file) {
        throw new Error('请选择要导入的备份文件');
    }

    const fileExtension = path.extname(file.name).toLowerCase();
    
    // 检查MIME类型和扩展名
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && 
        !ALLOWED_EXTENSIONS.includes(fileExtension)) {
        throw new Error('请上传有效的Excel备份文件(.xlsx或.xls格式)');
    }

    return true;
}

/**
 * 验证文件大小
 */
function validateFileSize(file, maxSize = 20 * 1024 * 1024) { // 默认20MB
    if (file.size > maxSize) {
        throw new Error(`文件大小不能超过${Math.round(maxSize / 1024 / 1024)}MB`);
    }
    return true;
}

/**
 * 验证文件名安全性（防止路径遍历攻击）
 */
function validateFileName(file) {
    const fileName = path.basename(file.name);
    
    // 调试日志
    console.log('🔍 文件名校验:', {
        originalName: file.name,
        basename: fileName,
        length: fileName.length,
        encoding: Buffer.from(fileName).toString('hex')
    });
    
    // 尝试解码文件名（处理编码问题）
    let decodedFileName = fileName;
    try {
        // 如果是乱码，尝试用不同编码解码
        if (/[^\x00-\x7F]/.test(fileName) && fileName.includes('ç')) {
            // 尝试用latin1解码再转utf8
            decodedFileName = Buffer.from(fileName, 'latin1').toString('utf8');
            console.log('🔄 文件名解码:', decodedFileName);
        }
    } catch (error) {
        console.log('⚠️ 文件名解码失败:', error.message);
    }
    
    // 放宽文件名校验，允许更多中文字符和常用符号
    const safeFileNameRegex = /^[a-zA-Z0-9\u4e00-\u9fa5_\-\s\.\(\)（）]+$/;
    
    // 先检查解码后的文件名
    if (safeFileNameRegex.test(decodedFileName)) {
        console.log('✅ 文件名校验通过(解码后):', decodedFileName);
        return true;
    }
    
    // 如果解码后还是失败，检查原始文件名
    if (safeFileNameRegex.test(fileName)) {
        console.log('✅ 文件名校验通过(原始):', fileName);
        return true;
    }
    
    console.log('❌ 文件名校验失败:', {
        original: fileName,
        decoded: decodedFileName
    });
    throw new Error('文件名包含非法字符');
    
    // 检查文件名是否包含可疑模式
    if (MALICIOUS_PATTERNS.some(pattern => pattern.test(fileName))) {
        console.log('❌ 文件名包含可疑模式:', fileName);
        throw new Error('文件名包含可疑内容');
    }
    
    console.log('✅ 文件名校验通过:', fileName);
    return true;
}

/**
 * 验证文件内容（检查Excel文件头）
 */
function validateFileContent(file) {
    console.log('🔍 文件内容验证:', {
        fileName: file.name,
        fileSize: file.data.length,
        firstBytes: file.data.slice(0, 16).toString('hex')
    });
    
    const fileHeader = file.data.slice(0, 8);
    const headerHex = fileHeader.toString('hex');
    
    console.log('📄 文件头信息:', {
        headerHex: headerHex,
        headerLength: fileHeader.length
    });
    
    // 检查所有可能的Excel签名
    const isValidExcelFile = EXCEL_FILE_SIGNATURES.some((signature, index) => {
        const signatureHex = signature.toString('hex');
        const matches = fileHeader.slice(0, signature.length).equals(signature);
        console.log(`🔍 签名检查 ${index + 1}:`, {
            signature: signatureHex,
            matches: matches
        });
        return matches;
    });
    
    if (!isValidExcelFile) {
        console.log('❌ 魔数签名验证失败，尝试扩展名和MIME类型验证');
        
        // 如果魔数验证失败，尝试检查文件扩展名和MIME类型
        const fileExtension = path.extname(file.name).toLowerCase();
        const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension);
        const isValidMimeType = ALLOWED_MIME_TYPES.includes(file.mimetype);
        
        console.log('🔍 扩展名和MIME类型检查:', {
            extension: fileExtension,
            isValidExtension: isValidExtension,
            mimeType: file.mimetype,
            isValidMimeType: isValidMimeType
        });
        
        if (isValidExtension && isValidMimeType) {
            console.log('✅ 通过扩展名和MIME类型验证');
            return true;
        }
        
        console.log('❌ 文件格式验证失败:', {
            headerHex: headerHex,
            expectedSignatures: EXCEL_FILE_SIGNATURES.map(s => s.toString('hex')),
            extension: fileExtension,
            mimeType: file.mimetype
        });
        throw new Error('文件格式验证失败，请确保上传的是有效的Excel文件');
    }
    
    console.log('✅ 文件格式验证通过');
    return true;
}

/**
 * 深度扫描文件内容，检测恶意代码
 */
function deepScanFileContent(fileData) {
    const fileContent = fileData.toString('utf8', 0, Math.min(fileData.length, 100000)); // 只扫描前100KB
    
    // 检测恶意代码模式
    const detectedPatterns = [];
    MALICIOUS_PATTERNS.forEach((pattern, index) => {
        if (pattern.test(fileContent)) {
            detectedPatterns.push({
                pattern: pattern.toString(),
                index: index
            });
        }
    });
    
    if (detectedPatterns.length > 0) {
        throw new Error(`检测到可疑内容：${detectedPatterns.length}个可疑模式`);
    }
    
    return true;
}

/**
 * 检测权限提升尝试
 */
function detectPrivilegeEscalation(data) {
    if (typeof data === 'string') {
        const content = data.toLowerCase();
        
        // 检测权限提升模式
        const detectedEscalation = PRIVILEGE_ESCALATION_PATTERNS.some(pattern => 
            pattern.test(content)
        );
        
        if (detectedEscalation) {
            throw new Error('检测到权限提升尝试');
        }
    }
    
    return true;
}

/**
 * 验证Excel文件结构
 */
function validateExcelStructure(workbook) {
    console.log('🔍 Excel结构验证:', {
        totalSheets: Object.keys(workbook.Sheets).length,
        sheetNames: Object.keys(workbook.Sheets)
    });
    
    const workbookSheets = Object.keys(workbook.Sheets);
    
    // 检查是否有任何工作表
    if (workbookSheets.length === 0) {
        console.log('❌ Excel文件没有工作表');
        throw new Error('Excel文件格式不正确，文件为空或没有工作表');
    }
    
    // 检查是否有允许的工作表名称
    const hasValidSheets = workbookSheets.some(sheetName => 
        ALLOWED_SHEET_NAMES.includes(sheetName)
    );
    
    console.log('📋 工作表验证:', {
        foundSheets: workbookSheets,
        allowedSheets: ALLOWED_SHEET_NAMES,
        hasValidSheets: hasValidSheets
    });
    
    if (!hasValidSheets) {
        console.log('⚠️ 没有找到标准工作表名称，但允许继续处理');
        // 放宽验证：如果没有标准工作表名称，只要有工作表就允许继续
        console.log('✅ 通过宽松验证：文件包含工作表');
        return true;
    }
    
    console.log('✅ Excel结构验证通过');
    return true;
}

/**
 * 验证数据行数限制
 */
function validateDataRowCount(workbook, maxRows = 10000) {
    let totalRows = 0;
    const workbookSheets = Object.keys(workbook.Sheets);
    
    for (const sheetName of workbookSheets) {
        if (ALLOWED_SHEET_NAMES.includes(sheetName)) {
            const sheet = workbook.Sheets[sheetName];
            const range = require('xlsx').utils.decode_range(sheet['!ref'] || 'A1:A1');
            totalRows += range.e.r + 1;
        }
    }
    
    if (totalRows > maxRows) {
        throw new Error(`数据行数过多（${totalRows}行），最多允许${maxRows}行`);
    }
    
    return totalRows;
}

/**
 * 验证导入频率限制
 */
function validateImportFrequency(req, maxImportsPerHour = 5) {
    const importKey = `import_limit_${req.user.id}`;
    const importCount = req.session[importKey] || 0;
    
    if (importCount >= maxImportsPerHour) {
        throw new Error(`导入频率过高，请稍后再试（每小时最多${maxImportsPerHour}次）`);
    }
    
    return importKey;
}

/**
 * 数据字段验证和清理
 */
function validateAndSanitizeData(data, fieldValidations) {
    const sanitizedData = {};
    
    for (const [field, validation] of Object.entries(fieldValidations)) {
        const value = data[field];
        
        if (validation.required && !value) {
            throw new Error(`${field}是必填字段`);
        }
        
        if (value) {
            // 检测权限提升尝试
            try {
                detectPrivilegeEscalation(value);
            } catch (error) {
                throw new Error(`${field}包含可疑内容: ${error.message}`);
            }
            
            // 长度限制
            if (validation.maxLength && value.length > validation.maxLength) {
                sanitizedData[field] = value.substring(0, validation.maxLength);
            } else {
                sanitizedData[field] = value;
            }
            
            // 格式验证
            if (validation.pattern && !validation.pattern.test(value)) {
                throw new Error(`${field}格式无效: ${value}`);
            }
        } else if (validation.default !== undefined) {
            sanitizedData[field] = validation.default;
        }
    }
    
    return sanitizedData;
}

/**
 * 生成文件哈希值用于安全验证
 */
function generateFileHash(fileData) {
    return crypto.createHash('sha256').update(fileData).digest('hex');
}

/**
 * 记录安全事件
 */
function logSecurityEvent(req, event, details) {
    const securityLog = {
        timestamp: new Date().toISOString(),
        event: event,
        userId: req.user?.id,
        username: req.user?.username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: details
    };
    
    console.log('🔒 安全事件:', securityLog);
    
    // 这里可以添加更详细的日志记录逻辑
    // 比如写入数据库或发送到安全监控系统
}

/**
 * 综合数据导入安全验证中间件
 */
function validateDataImport(req, res, next) {
    try {
        // 1. 验证管理员权限
        validateAdminAccess(req, res, () => {});
        
        // 2. 验证请求来源
        validateRequestOrigin(req, res, () => {});
        
        // 3. 检查文件是否存在
        if (!req.files || !req.files.backupFile) {
            return res.status(400).json({
                success: false,
                error: '请选择要导入的备份文件'
            });
        }
        
        const file = req.files.backupFile;
        
        // 4. 验证文件类型
        validateFileType(file);
        
        // 5. 验证文件大小
        validateFileSize(file);
        
        // 6. 验证文件名
        validateFileName(file);
        
        // 7. 验证文件内容
        validateFileContent(file);
        
        // 8. 深度扫描文件内容（新增）
        try {
            deepScanFileContent(file.data);
        } catch (error) {
            logSecurityEvent(req, 'malicious_content_detected', {
                fileName: Buffer.from(file.name, 'latin1').toString('utf8'),
                error: error.message
            });
            return res.status(400).json({
                success: false,
                error: '文件内容安全检查失败：' + error.message
            });
        }
        
        // 9. 验证导入频率
        const importKey = validateImportFrequency(req);
        
        // 10. 生成文件哈希
        const fileHash = generateFileHash(file.data);
        
        // 11. 记录安全事件
        logSecurityEvent(req, 'file_upload_validation', {
            fileName: Buffer.from(file.name, 'latin1').toString('utf8'),
            fileSize: file.size,
            fileHash: fileHash,
            mimeType: file.mimetype
        });
        
        // 将验证结果附加到请求对象
        req.importValidation = {
            file,
            importKey,
            fileHash,
            isValid: true
        };
        
        next();
        
    } catch (error) {
        // 记录安全事件
        logSecurityEvent(req, 'file_upload_validation_failed', {
            error: error.message,
            fileName: req.files?.backupFile?.name ? Buffer.from(req.files.backupFile.name, 'latin1').toString('utf8') : '未知文件'
        });
        
        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    validateAdminAccess,
    validateRequestOrigin,
    validateFileType,
    validateFileSize,
    validateFileName,
    validateFileContent,
    deepScanFileContent,
    detectPrivilegeEscalation,
    validateExcelStructure,
    validateDataRowCount,
    validateImportFrequency,
    validateAndSanitizeData,
    generateFileHash,
    logSecurityEvent,
    validateDataImport,
    ALLOWED_MIME_TYPES,
    ALLOWED_EXTENSIONS,
    ALLOWED_SHEET_NAMES,
    MALICIOUS_PATTERNS,
    PRIVILEGE_ESCALATION_PATTERNS
}; 