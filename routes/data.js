const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// 文件上传配置
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        // 更宽松的文件类型检查
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'text/csv', // .csv
            'application/csv', // .csv
            'application/excel', // .xls
            'application/vnd.msexcel', // .xls
            'application/octet-stream' // 通用二进制文件
        ];
        
        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        
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
            cb(new Error('只支持Excel文件(.xlsx/.xls)和CSV文件格式'), false);
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

// 仪表板Excel解析接口
router.post('/dashboard/parse-excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上传文件' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    // 将中文字段名映射为英文字段名
    const data = rawData.map(row => ({
      date: row['日期'] || row['date'],
      projectName: row['学习项目名称'] || row['projectName'],
      startTime: row['项目开始时间'] || row['startTime'],
      endTime: row['项目结束时间'] || row['endTime'],
      duration: row['项目完成时间'] || row['duration']
    }));
    
    res.json({ success: true, data });
  } catch (err) {
    console.error('Excel解析失败:', err);
    res.status(500).json({ error: 'Excel解析失败' });
  }
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
    res.render('admin/config', { layout: false, user: req.user });
  } else {
    res.render('admin/config', { user: req.user });
  }
});

module.exports = router; 