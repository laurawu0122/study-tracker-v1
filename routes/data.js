const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const XLSX = require('xlsx');

const router = express.Router();

// 文件上传配置
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel') {
            cb(null, true);
        } else {
            cb(new Error('只支持Excel文件格式'), false);
        }
    }
});

// 所有路由都需要认证
router.use(authenticateToken);

// 获取用户的所有学习记录
router.get('/records', (req, res) => {
    try {
        const db = getDatabase();
        const userId = req.user.id;

        db.all(
            'SELECT * FROM study_records WHERE user_id = ? ORDER BY date DESC, created_at DESC',
            [userId],
            (err, rows) => {
                if (err) {
                    console.error('获取学习记录失败:', err);
                    return res.status(500).json({ error: '获取数据失败' });
                }

                res.json({
                    records: rows,
                    count: rows.length
                });
            }
        );
    } catch (error) {
        console.error('获取学习记录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 添加新的学习记录
router.post('/records', [
    body('date').isDate().withMessage('日期格式无效'),
    body('project_name').notEmpty().withMessage('项目名称不能为空'),
    body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式无效'),
    body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式无效'),
    body('duration').isInt({ min: 1 }).withMessage('持续时间必须大于0')
], (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: '输入验证失败',
                details: errors.array() 
            });
        }

        const { date, project_name, start_time, end_time, duration } = req.body;
        const userId = req.user.id;
        const db = getDatabase();

        db.run(
            'INSERT INTO study_records (user_id, date, project_name, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, date, project_name, start_time, end_time, duration],
            function(err) {
                if (err) {
                    console.error('添加学习记录失败:', err);
                    return res.status(500).json({ error: '添加记录失败' });
                }

                res.status(201).json({
                    message: '记录添加成功',
                    id: this.lastID
                });
            }
        );
    } catch (error) {
        console.error('添加学习记录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新学习记录
router.put('/records/:id', [
    body('date').isDate().withMessage('日期格式无效'),
    body('project_name').notEmpty().withMessage('项目名称不能为空'),
    body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式无效'),
    body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式无效'),
    body('duration').isInt({ min: 1 }).withMessage('持续时间必须大于0')
], (req, res) => {
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
        const { date, project_name, start_time, end_time, duration } = req.body;
        const userId = req.user.id;
        const db = getDatabase();

        // 检查记录是否存在且属于当前用户
        db.get(
            'SELECT id FROM study_records WHERE id = ? AND user_id = ?',
            [id, userId],
            (err, row) => {
                if (err) {
                    console.error('查询记录失败:', err);
                    return res.status(500).json({ error: '服务器内部错误' });
                }

                if (!row) {
                    return res.status(404).json({ error: '记录不存在或无权限访问' });
                }

                // 更新记录
                db.run(
                    'UPDATE study_records SET date = ?, project_name = ?, start_time = ?, end_time = ?, duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
                    [date, project_name, start_time, end_time, duration, id, userId],
                    function(err) {
                        if (err) {
                            console.error('更新记录失败:', err);
                            return res.status(500).json({ error: '更新记录失败' });
                        }

                        res.json({ message: '记录更新成功' });
                    }
                );
            }
        );
    } catch (error) {
        console.error('更新学习记录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除学习记录
router.delete('/records/:id', (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const db = getDatabase();

        db.run(
            'DELETE FROM study_records WHERE id = ? AND user_id = ?',
            [id, userId],
            function(err) {
                if (err) {
                    console.error('删除记录失败:', err);
                    return res.status(500).json({ error: '删除记录失败' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: '记录不存在或无权限删除' });
                }

                res.json({ message: '记录删除成功' });
            }
        );
    } catch (error) {
        console.error('删除学习记录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 批量导入Excel数据
router.post('/import', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请选择要导入的文件' });
        }

        const userId = req.user.id;
        const db = getDatabase();

        // 读取Excel文件
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

        if (jsonData.length === 0) {
            return res.status(400).json({ error: 'Excel文件为空或格式不正确' });
        }

        // 开始事务
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const stmt = db.prepare(
                'INSERT INTO study_records (user_id, date, project_name, start_time, end_time, duration) VALUES (?, ?, ?, ?, ?, ?)'
            );

            let successCount = 0;
            let errorCount = 0;

            jsonData.forEach((row, index) => {
                try {
                    // 数据验证和转换
                    const date = row['日期'] || row['date'];
                    const projectName = row['学习项目名称'] || row['project_name'] || row['项目名称'];
                    const startTime = row['项目开始时间'] || row['start_time'] || row['开始时间'];
                    const endTime = row['项目结束时间'] || row['end_time'] || row['结束时间'];
                    const duration = row['项目完成时间'] || row['duration'] || row['完成时间'];

                    if (!date || !projectName || !startTime || !endTime || !duration) {
                        errorCount++;
                        return;
                    }

                    // 计算持续时间（如果Excel中没有提供）
                    let finalDuration = duration;
                    if (typeof duration === 'string' && duration.includes(':')) {
                        const [hours, minutes] = duration.split(':').map(Number);
                        finalDuration = hours * 60 + minutes;
                    }

                    stmt.run([userId, date, projectName, startTime, endTime, finalDuration], (err) => {
                        if (err) {
                            errorCount++;
                        } else {
                            successCount++;
                        }
                    });

                } catch (error) {
                    errorCount++;
                }
            });

            stmt.finalize((err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: '导入失败' });
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        return res.status(500).json({ error: '提交事务失败' });
                    }

                    res.json({
                        message: '导入完成',
                        successCount: successCount,
                        errorCount: errorCount,
                        totalCount: jsonData.length
                    });
                });
            });
        });

    } catch (error) {
        console.error('导入Excel错误:', error);
        res.status(500).json({ error: '导入失败' });
    }
});

// 导出数据为Excel
router.get('/export', (req, res) => {
    try {
        const userId = req.user.id;
        const db = getDatabase();

        db.all(
            'SELECT date, project_name, start_time, end_time, duration FROM study_records WHERE user_id = ? ORDER BY date DESC, created_at DESC',
            [userId],
            (err, rows) => {
                if (err) {
                    console.error('获取导出数据失败:', err);
                    return res.status(500).json({ error: '获取数据失败' });
                }

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
            }
        );
    } catch (error) {
        console.error('导出数据错误:', error);
        res.status(500).json({ error: '导出失败' });
    }
});

// 获取统计数据
router.get('/stats', (req, res) => {
    try {
        const userId = req.user.id;
        const db = getDatabase();

        db.get(
            `SELECT 
                COUNT(*) as total_records,
                SUM(duration) as total_duration,
                COUNT(DISTINCT date) as total_days,
                AVG(duration) as avg_duration
            FROM study_records 
            WHERE user_id = ?`,
            [userId],
            (err, stats) => {
                if (err) {
                    console.error('获取统计数据失败:', err);
                    return res.status(500).json({ error: '获取统计数据失败' });
                }

                res.json({
                    totalRecords: stats.total_records || 0,
                    totalDuration: stats.total_duration || 0,
                    totalDays: stats.total_days || 0,
                    avgDuration: Math.round(stats.avg_duration || 0),
                    avgDailyDuration: stats.total_days > 0 ? Math.round(stats.total_duration / stats.total_days) : 0
                });
            }
        );
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

module.exports = router; 