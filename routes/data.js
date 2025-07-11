const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const path = require('path');

const router = express.Router();

// 文件上传配置
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB，与安全验证一致
        files: 1, // 只允许上传1个文件
        fieldSize: 1024 * 1024 // 字段大小限制
    },
    fileFilter: (req, file, cb) => {
        // 文件类型检查
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/octet-stream' // 通用二进制文件
        ];
        
        const allowedExtensions = ['.xlsx', '.xls'];
        
        // 检查MIME类型或文件扩展名
        const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
        const isValidExtension = allowedExtensions.some(ext => 
            file.originalname.toLowerCase().endsWith(ext)
        );
        
        if (isValidMimeType || isValidExtension) {
            cb(null, true);
        } else {
            console.log('文件类型检查失败:', {
                filename: file.originalname,
                mimetype: file.mimetype
            });
            cb(new Error('只支持Excel文件(.xlsx/.xls)格式'), false);
        }
    }
});

// 所有路由都需要认证
router.use(authenticateToken);

// 获取用户的所有学习记录
router.get('/records', async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, search, projectName, date } = req.query;
        const offset = (page - 1) * limit;

        let query = db('study_records')
            .where('user_id', userId)
            .orderBy('date', 'desc')
            .orderBy('created_at', 'desc');

        // 搜索功能
        if (search) {
            query = query.where(function() {
                this.where('project_name', 'ILIKE', `%${search}%`)
                     .orWhere('notes', 'ILIKE', `%${search}%`);
            });
        }

        // 项目筛选
        if (projectName) {
            query = query.where('project_name', projectName);
        }

        // 日期筛选
        if (date) {
            query = query.where('date', date);
        }

        // 获取总数
        const totalQuery = query.clone();
        const [{ total }] = await totalQuery.count('* as total');

        // 获取分页数据
        const records = await query
            .select('*')
            .limit(limit)
            .offset(offset);

        res.json({
            records,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error('获取学习记录错误:', error);
        res.status(500).json({ error: '获取数据失败' });
    }
});

// 添加新的学习记录
router.post('/records', [
    body('date').isDate().withMessage('日期格式无效'),
    body('project_name').notEmpty().withMessage('项目名称不能为空'),
    body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式无效'),
    body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式无效'),
    body('duration').isInt({ min: 1 }).withMessage('持续时间必须大于0')
], async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { date, project_name, start_time, end_time, duration, notes, category, difficulty } = req.body;
        const userId = req.user.id;

        const [result] = await db('study_records').insert({
            user_id: userId,
            date: date,
            project_name: project_name,
            start_time: start_time,
            end_time: end_time,
            duration: duration,
            notes: notes || null,
            category: category || null,
            difficulty: difficulty || null,
            created_at: new Date(),
            updated_at: new Date()
        }).returning('id');

        res.status(201).json({
            message: '记录添加成功',
            id: result.id
        });

    } catch (error) {
        console.error('添加学习记录错误:', error);
        res.status(500).json({ error: '添加记录失败' });
    }
});

// 更新学习记录
router.put('/records/:id', [
    body('date').isDate().withMessage('日期格式无效'),
    body('project_name').notEmpty().withMessage('项目名称不能为空'),
    body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式无效'),
    body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式无效'),
    body('duration').isInt({ min: 1 }).withMessage('持续时间必须大于0')
], async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { id } = req.params;
        const { date, project_name, start_time, end_time, duration, notes, category, difficulty } = req.body;
        const userId = req.user.id;

        // 检查记录是否存在且属于当前用户
        const existingRecord = await db('study_records')
            .where('id', id)
            .where('user_id', userId)
            .first();

        if (!existingRecord) {
            return res.status(404).json({ error: '记录不存在或无权限访问' });
        }

        // 更新记录
        await db('study_records')
            .where('id', id)
            .where('user_id', userId)
            .update({
                date: date,
                project_name: project_name,
                start_time: start_time,
                end_time: end_time,
                duration: duration,
                notes: notes || null,
                category: category || null,
                difficulty: difficulty || null,
                updated_at: new Date()
            });

        res.json({ message: '记录更新成功' });

    } catch (error) {
        console.error('更新学习记录错误:', error);
        res.status(500).json({ error: '更新记录失败' });
    }
});

// 删除学习记录
router.delete('/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deletedCount = await db('study_records')
            .where('id', id)
            .where('user_id', userId)
            .del();

        if (deletedCount === 0) {
            return res.status(404).json({ error: '记录不存在或无权限删除' });
        }

        res.json({ message: '记录删除成功' });

    } catch (error) {
        console.error('删除学习记录错误:', error);
        res.status(500).json({ error: '删除记录失败' });
    }
});

// 批量导入Excel数据
router.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请选择要导入的文件' });
        }

        const userId = req.user.id;

        // 读取Excel文件
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

        if (jsonData.length === 0) {
            return res.status(400).json({ error: 'Excel文件为空或格式不正确' });
        }

        // 开始事务
        const trx = await db.transaction();

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const row of jsonData) {
                try {
                    // 数据验证和转换
                    const date = row['日期'] || row['date'];
                    const projectName = row['学习项目名称'] || row['project_name'] || row['项目名称'];
                    const startTime = row['项目开始时间'] || row['start_time'] || row['开始时间'];
                    const endTime = row['项目结束时间'] || row['end_time'] || row['结束时间'];
                    const duration = row['项目完成时间'] || row['duration'] || row['完成时间'];

                    if (!date || !projectName || !startTime || !endTime || !duration) {
                        errorCount++;
                        continue;
                    }

                    // 计算持续时间（如果Excel中没有提供）
                    let finalDuration = duration;
                    if (typeof duration === 'string' && duration.includes(':')) {
                        const [hours, minutes] = duration.split(':').map(Number);
                        finalDuration = hours * 60 + minutes;
                    }

                    await trx('study_records').insert({
                        user_id: userId,
                        date: date,
                        project_name: projectName,
                        start_time: startTime,
                        end_time: endTime,
                        duration: finalDuration,
                        created_at: new Date(),
                        updated_at: new Date()
                    });

                    successCount++;
                } catch (error) {
                    errorCount++;
                }
            }

            await trx.commit();

            res.json({
                message: '导入完成',
                successCount: successCount,
                errorCount: errorCount,
                totalCount: jsonData.length
            });

        } catch (error) {
            await trx.rollback();
            throw error;
        }

    } catch (error) {
        console.error('导入Excel错误:', error);
        res.status(500).json({ error: '导入失败' });
    }
});

// 导出数据为Excel
router.get('/export', async (req, res) => {
    try {
        const userId = req.user.id;

        const rows = await db('study_records')
            .where('user_id', userId)
            .select('date', 'project_name', 'start_time', 'end_time', 'duration')
            .orderBy('date', 'desc')
            .orderBy('created_at', 'desc');

        // 转换数据格式
        const exportData = rows.map(row => ({
            '日期': row.date,
            '学习项目名称': row.project_name,
            '项目开始时间': row.start_time,
            '项目结束时间': row.end_time,
            '项目完成时间': row.duration
        }));

        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // 设置列宽
        const colWidths = [
            { wch: 12 }, // 日期
            { wch: 20 }, // 项目名称
            { wch: 12 }, // 开始时间
            { wch: 12 }, // 结束时间
            { wch: 12 }  // 完成时间
        ];
        worksheet['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, '学习记录');

        // 生成Excel文件
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=学习记录_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(excelBuffer);

    } catch (error) {
        console.error('导出数据错误:', error);
        res.status(500).json({ error: '导出失败' });
    }
});

// 获取统计数据
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await db('study_records')
            .where('user_id', userId)
            .select(
                db.raw('COUNT(*) as total_records'),
                db.raw('SUM(duration) as total_duration'),
                db.raw('COUNT(DISTINCT date) as total_days'),
                db.raw('AVG(duration) as avg_duration')
            )
            .first();

        res.json({
            totalRecords: stats.total_records || 0,
            totalDuration: stats.total_duration || 0,
            totalDays: stats.total_days || 0,
            avgDuration: Math.round(stats.avg_duration || 0),
            avgDailyDuration: stats.total_days > 0 ? Math.round(stats.total_duration / stats.total_days) : 0
        });

    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({ error: '获取统计数据失败' });
    }
});

// 获取图表数据
router.get('/chart-data', async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'line', projectName } = req.query;

        let chartData = {};

        if (type === 'line') {
            // 获取最近30天的学习时长趋势
            const trendData = await db('study_records')
                .where('user_id', userId)
                .where('date', '>=', db.raw('CURRENT_DATE - INTERVAL \'30 days\''))
                .select(
                    'date',
                    db.raw('SUM(duration) as total_duration')
                )
                .groupBy('date')
                .orderBy('date', 'asc');

            chartData = {
                labels: trendData.map(d => d.date),
                datasets: [{
                    label: '学习时长(分钟)',
                    data: trendData.map(d => d.total_duration),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            };
        } else if (type === 'pie') {
            // 获取项目时间占比
            let query = db('study_records')
                .where('user_id', userId)
                .select(
                    'project_name',
                    db.raw('SUM(duration) as total_duration')
                )
                .groupBy('project_name')
                .orderBy('total_duration', 'desc');

            if (projectName) {
                query = query.where('project_name', projectName);
            }

            const pieData = await query.limit(10);

            chartData = {
                labels: pieData.map(d => d.project_name),
                datasets: [{
                    data: pieData.map(d => d.total_duration),
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
                    ]
                }]
            };
        }

        res.json(chartData);

    } catch (error) {
        console.error('获取图表数据错误:', error);
        res.status(500).json({ error: '获取图表数据失败' });
    }
});

// 获取项目列表API
router.get('/api/projects', async (req, res) => {
    try {
        const userId = req.user.id;

        const projects = await db('study_records')
            .where('user_id', userId)
            .select('project_name')
            .distinct()
            .orderBy('project_name');

        const projectNames = projects.map(p => p.project_name);
        res.json({ projects: projectNames });

    } catch (error) {
        console.error('获取项目列表错误:', error);
        res.status(500).json({ error: '获取项目列表失败' });
    }
});

// 仪表板Excel解析接口 - 加强安全防护
router.post('/dashboard/parse-excel', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  const securityLog = {
    timestamp: new Date().toISOString(),
    event: 'dashboard_excel_parse',
    userId: req.user?.id || 'anonymous',
    username: req.user?.username || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    fileInfo: null,
    validationResults: [],
    errors: [],
    processingTime: 0
  };

  try {
    // 1. 基础权限验证
    if (!req.user) {
      securityLog.errors.push('未授权访问');
      console.log('🔒 安全事件:', securityLog);
      return res.status(401).json({ error: '请先登录' });
    }

    // 2. 文件存在性检查
    if (!req.file) {
      securityLog.errors.push('未上传文件');
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '未上传文件' });
    }

    // 3. 文件信息记录
    securityLog.fileInfo = {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      encoding: req.file.encoding
    };

    // 4. 文件大小限制 (20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (req.file.size > MAX_FILE_SIZE) {
      securityLog.errors.push(`文件大小超限: ${req.file.size} bytes`);
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '文件大小不能超过20MB' });
    }

    // 5. 文件类型验证
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      securityLog.errors.push(`不允许的文件类型: ${req.file.mimetype}`);
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '只支持Excel文件格式' });
    }

    // 6. 文件名安全验证
    const fileName = req.file.originalname;
    if (!fileName || fileName.length > 255) {
      securityLog.errors.push('文件名无效或过长');
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '文件名无效' });
    }

    // 检查文件名是否包含危险字符
    const dangerousPatterns = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousPatterns.test(fileName)) {
      securityLog.errors.push('文件名包含危险字符');
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '文件名包含非法字符' });
    }

    // 7. 文件扩展名验证
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(fileName).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      securityLog.errors.push(`不允许的文件扩展名: ${fileExtension}`);
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '只支持.xlsx和.xls格式' });
    }

    // 8. 文件内容魔数验证
    const excelSignatures = [
      Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP/XLSX
      Buffer.from([0x50, 0x4B, 0x05, 0x06]), // ZIP/XLSX
      Buffer.from([0x50, 0x4B, 0x07, 0x08]), // ZIP/XLSX
      Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) // XLS
    ];

    const fileBuffer = req.file.buffer;
    const isValidSignature = excelSignatures.some(signature => 
      fileBuffer.slice(0, signature.length).equals(signature)
    );

    if (!isValidSignature) {
      securityLog.errors.push('文件签名验证失败');
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '文件格式验证失败' });
    }

    // 9. 恶意代码检测
    const maliciousPatterns = [
      // JavaScript代码
      /<script[^>]*>/i, /javascript:/i, /eval\s*\(/i, /Function\s*\(/i,
      // SQL注入
      /union\s+select/i, /drop\s+table/i, /insert\s+into/i, /delete\s+from/i,
      // 系统命令
      /system\s*\(/i, /exec\s*\(/i, /shell_exec\s*\(/i, /passthru\s*\(/i,
      // 文件操作
      /file_get_contents/i, /fopen\s*\(/i, /fwrite\s*\(/i,
      // 网络请求
      /curl_exec/i, /fsockopen/i,
      // 编码绕过
      /base64_decode/i, /urldecode/i, /hex2bin/i,
      // 反序列化
      /unserialize/i, /__destruct/i
    ];

    const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 100000)); // 检查前100KB
    for (const pattern of maliciousPatterns) {
      if (pattern.test(fileContent)) {
        securityLog.errors.push(`检测到恶意代码模式: ${pattern.source}`);
        console.log('🔒 安全事件:', securityLog);
        return res.status(400).json({ error: '文件内容包含非法代码' });
      }
    }

    // 10. Excel文件结构验证
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      securityLog.errors.push('Excel文件没有工作表');
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: 'Excel文件格式无效' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      securityLog.errors.push('无法读取工作表');
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: '无法读取工作表' });
    }

    // 11. 数据行数限制 (防止大量数据攻击)
    const rawData = XLSX.utils.sheet_to_json(sheet);
    const MAX_ROWS = 1000;
    
    if (rawData.length > MAX_ROWS) {
      securityLog.errors.push(`数据行数超限: ${rawData.length} > ${MAX_ROWS}`);
      console.log('🔒 安全事件:', securityLog);
      return res.status(400).json({ error: `数据行数不能超过${MAX_ROWS}行` });
    }

    // 12. 数据内容验证
    const validatedData = [];
    const requiredFields = ['日期', '学习项目名称', '项目开始时间', '项目结束时间', '项目完成时间'];
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 2; // Excel行号从2开始
      
      // 检查必要字段
      const missingFields = requiredFields.filter(field => !row[field]);
      if (missingFields.length > 0) {
        securityLog.errors.push(`第${rowNumber}行缺少必要字段: ${missingFields.join(', ')}`);
        continue;
      }

      // 数据长度限制
      const fieldLengths = {
        '学习项目名称': 100,
        '项目开始时间': 50,
        '项目结束时间': 50,
        '项目完成时间': 20
      };

      for (const [field, maxLength] of Object.entries(fieldLengths)) {
        if (row[field] && row[field].toString().length > maxLength) {
          securityLog.errors.push(`第${rowNumber}行${field}过长: ${row[field].toString().length} > ${maxLength}`);
          continue;
        }
      }

      // 日期格式验证，支持 YYYY-MM-DD、YYYY.MM.DD、YYYY/MM/DD
      let rawDate = row['日期'] ? row['日期'].toString().trim() : '';
      let normalizedDate = rawDate.replace(/[./]/g, '-');
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(normalizedDate)) {
        securityLog.errors.push(`第${rowNumber}行日期格式无效: ${row['日期']}`);
        continue;
      }
      row['日期'] = normalizedDate; // 标准化后写回

      // 时间格式验证，支持 H:mm 和 HH:mm，自动补零为 HH:mm
      const timeFields = ['项目开始时间', '项目结束时间'];
      const timeRegex = /^([0-1]?\d|2[0-3]):[0-5]\d$/;
      let timeValid = true;
      for (const field of timeFields) {
        let t = row[field] ? row[field].toString().trim() : '';
        if (!timeRegex.test(t)) {
          securityLog.errors.push(`第${rowNumber}行时间格式无效`);
          timeValid = false;
          break;
        }
        // 自动补零为 HH:mm
        if (t.length === 4) t = '0' + t;
        row[field] = t;
      }
      if (!timeValid) continue;

      // 数值验证
      const duration = parseInt(row['项目完成时间']);
      if (isNaN(duration) || duration < 0 || duration > 1440) { // 最大24小时
        securityLog.errors.push(`第${rowNumber}行完成时间无效: ${row['项目完成时间']}`);
        continue;
      }

      // 数据清理和转换
      const cleanRow = {
        date: row['日期'].toString().trim(),
        projectName: row['学习项目名称'].toString().trim().substring(0, 100),
        startTime: row['项目开始时间'].toString().trim(),
        endTime: row['项目结束时间'].toString().trim(),
        duration: duration
      };

      validatedData.push(cleanRow);
    }

    // 13. 记录验证结果
    securityLog.validationResults = {
      totalRows: rawData.length,
      validRows: validatedData.length,
      invalidRows: rawData.length - validatedData.length
    };

    // 14. 频率限制检查 (使用session)
    const sessionKey = `excel_parse_${req.user.id}`;
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (!req.session[sessionKey]) {
      req.session[sessionKey] = { count: 0, firstRequest: currentTime };
    }
    
    const sessionData = req.session[sessionKey];
    
    // 重置计数器 (如果超过1小时)
    if (currentTime - sessionData.firstRequest > oneHour) {
      sessionData.count = 0;
      sessionData.firstRequest = currentTime;
    }
    
    // 检查频率限制 (每小时最多10次)
    const MAX_REQUESTS_PER_HOUR = 10;
    if (sessionData.count >= MAX_REQUESTS_PER_HOUR) {
      securityLog.errors.push('频率限制: 每小时最多10次解析请求');
      console.log('🔒 安全事件:', securityLog);
      return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
    }
    
    sessionData.count++;

    // 15. 记录操作日志到数据库
    try {
      await db('data_operation_logs').insert({
        user_id: req.user.id,
        operation_type: 'dashboard_excel_parse',
        target_user_id: req.user.id,
        details: JSON.stringify({
          fileName: fileName,
          fileSize: req.file.size,
          totalRows: rawData.length,
          validRows: validatedData.length,
          errors: securityLog.errors,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }),
        created_at: new Date()
      });
    } catch (logError) {
      console.error('记录操作日志失败:', logError);
    }

    // 16. 计算处理时间
    securityLog.processingTime = Date.now() - startTime;

    // 17. 输出安全日志
    console.log('🔒 安全事件:', securityLog);

    // 18. 返回结果
    if (validatedData.length === 0) {
      return res.status(400).json({ 
        error: '没有有效的数据行',
        details: securityLog.errors
      });
    }

    res.json({ 
      success: true, 
      data: validatedData,
      summary: {
        totalRows: rawData.length,
        validRows: validatedData.length,
        invalidRows: rawData.length - validatedData.length,
        errors: securityLog.errors
      }
    });

  } catch (err) {
    securityLog.errors.push(`处理异常: ${err.message}`);
    securityLog.processingTime = Date.now() - startTime;
    console.error('Excel解析失败:', err);
    console.log('🔒 安全事件:', securityLog);
    res.status(500).json({ error: 'Excel解析失败' });
  }
});

// Multer错误处理专用中间件（必须放在路由后）
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小不能超过20MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '只能上传一个文件' });
    }
    return res.status(400).json({ error: '文件上传失败' });
  }
  if (err) {
    return res.status(400).json({ error: err.message || '文件上传失败' });
  }
  next();
});

// 仪表板
router.get('/dashboard', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/dashboard', { layout: false, user: req.user });
  } else {
    res.render('pages/dashboard', { user: req.user });
  }
});

// 项目管理
router.get('/projects', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/projects', { layout: false, user: req.user });
  } else {
    res.render('pages/projects', { user: req.user });
  }
});

// 学习记录
router.get('/sessions', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/sessions', { layout: false, user: req.user });
  } else {
    res.render('pages/sessions', { user: req.user });
  }
});

// 通知中心
router.get('/notifications', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/notifications', { layout: false, user: req.user });
  } else {
    res.render('pages/notifications', { user: req.user });
  }
});

// 成就徽章
router.get('/achievements', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/achievements', { layout: false, user: req.user });
  } else {
    res.render('pages/achievements', { user: req.user });
  }
});

// 积分兑换
router.get('/points-exchange', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/points-exchange', { layout: false, user: req.user });
  } else {
    res.render('pages/points-exchange', { user: req.user });
  }
});

// 兑换记录
router.get('/exchange-records', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/exchange-records', { layout: false, user: req.user });
  } else {
    res.render('pages/exchange-records', { user: req.user });
  }
});

// 积分明细
router.get('/points-records', (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/points-records', { layout: false, user: req.user });
  } else {
    res.render('pages/points-records', { user: req.user });
  }
});



// 系统管理
router.get('/admin', adminMiddleware, (req, res) => {
  if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
    res.render('pages/admin', { layout: false, user: req.user });
  } else {
    res.render('pages/admin', { user: req.user });
  }
});

module.exports = router; 