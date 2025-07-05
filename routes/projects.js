const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const jwt = require('jsonwebtoken');
const xlsx = require('xlsx');
const achievementService = require('../services/achievements');
const { createNotification } = require('./notifications');

const router = express.Router();

// JWT middleware (import from auth.js)
const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '未登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
};

// Validation middleware for creating projects
const validateProjectCreate = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('项目名称不能为空且长度不能超过255个字符')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 50 })
    .withMessage('项目描述不能超过50个字符')
    .trim()
    .escape(),
  body('start_date')
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  body('completion_date')
    .optional()
    .isISO8601()
    .withMessage('完成日期格式不正确'),
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('预估时间必须是非负数'),
  body('actual_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('实际时间必须是非负数'),
  body('difficulty_level')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('难度等级必须是1-5之间的整数'),
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed', 'paused'])
    .withMessage('状态值不正确'),
];

// Validation middleware for updating projects
const validateProjectUpdate = [
  body('name')
    .isLength({ min: 1, max: 255 })
    .withMessage('项目名称不能为空且长度不能超过255个字符')
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 50 })
    .withMessage('项目描述不能超过50个字符')
    .trim()
    .escape(),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('开始日期格式不正确'),
  body('completion_date')
    .optional()
    .isISO8601()
    .withMessage('完成日期格式不正确'),
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('预估时间必须是非负数'),
  body('actual_hours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('实际时间必须是非负数'),
  body('difficulty_level')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('难度等级必须是1-5之间的整数'),
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed', 'paused'])
    .withMessage('状态值不正确'),
];

// Get all projects for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, search } = req.query;
    const offset = (page - 1) * limit;

    let query = db('study_projects')
      .where('user_id', req.user.id)
      .orderBy('created_at', 'desc');

    // Apply filters
    if (status) {
      query = query.where('status', status);
    }

    if (category) {
      query = query.where('category', category);
    }

    if (search) {
      query = query.where(function() {
        this.where('name', 'like', `%${search}%`)
          .orWhere('description', 'like', `%${search}%`);
      });
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ total }] = await totalQuery.clearOrder().count('* as total');

    // Get paginated results
    const projects = await query
      .limit(limit)
      .offset(offset);

    res.json({
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取项目列表错误:', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await db('study_projects')
      .where('id', id)
      .where('user_id', req.user.id)
      .first();

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    res.json({ project });

  } catch (error) {
    console.error('获取项目详情错误:', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

// Create new project
router.post('/', authenticateToken, validateProjectCreate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const {
      name,
      description,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      difficulty_level,
      status,
      category,
      notes
    } = req.body;

    const [result] = await db('study_projects').insert({
      user_id: req.user.id,
      name,
      description,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      difficulty_level: difficulty_level || 3,
      status: status || 'in_progress',
      category,
      notes,
      created_at: new Date(),
      updated_at: new Date()
    }).returning('id');

    const projectId = result.id;

    const project = await db('study_projects')
      .where('id', projectId)
      .first();

    res.status(201).json({
      message: '项目创建成功',
      project
    });

    // 发送项目创建通知
    try {
      await createNotification(
        req.user.id,
        'success',
        '📝 新项目已创建',
        `您已成功创建项目"${name}"，开始您的学习之旅吧！`,
        {
          project_id: projectId,
          project_name: name,
          status: status || 'in_progress',
          category: category
        }
      );
    } catch (notificationError) {
      console.error('发送项目创建通知失败:', notificationError);
      // 不影响主流程，只记录错误
    }

  } catch (error) {
    console.error('创建项目错误:', error);
    res.status(500).json({ error: '创建项目失败' });
  }
});

// Update project
router.put('/:id', authenticateToken, validateProjectUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: '输入验证失败',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const {
      name,
      description,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      difficulty_level,
      status,
      category,
      notes
    } = req.body;

    // Check if project exists and belongs to user
    const existingProject = await db('study_projects')
      .where('id', id)
      .where('user_id', req.user.id)
      .first();

    if (!existingProject) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // Build update object with only provided fields
    const updateData = {
      updated_at: new Date()
    };

    // Only update fields that are provided in the request
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (completion_date !== undefined) updateData.completion_date = completion_date;
    if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours;
    if (actual_hours !== undefined) updateData.actual_hours = actual_hours;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (status !== undefined) updateData.status = status;
    if (category !== undefined) updateData.category = category;
    if (notes !== undefined) updateData.notes = notes;

    // Update project
    await db('study_projects')
      .where('id', id)
      .update(updateData);

    // 如果项目名称更新了，同步更新相关学习记录的project_name字段
    if (name !== undefined && name !== existingProject.name) {
      await db('study_sessions')
        .where('project_id', id)
        .update({
          project_name: name,
          updated_at: new Date()
        });
      
      console.log(`项目名称从"${existingProject.name}"更新为"${name}"，已同步更新相关学习记录`);
    }

    const updatedProject = await db('study_projects')
      .where('id', id)
      .first();

    res.json({
      message: '项目更新成功',
      project: updatedProject
    });

    // 如果项目状态变为已完成，触发成就检查
    if (status === 'completed' && existingProject.status !== 'completed') {
      try {
        await achievementService.checkAndUpdateAchievements(req.user.id, 'project_completion', {
          project_id: id,
          project_name: updatedProject.name,
          completion_date: updatedProject.completion_date
        });
      } catch (achievementError) {
        console.error('成就检查失败:', achievementError);
        // 不影响主流程，只记录错误
      }
    }

    // 发送项目状态变更通知
    try {
      if (status !== undefined && status !== existingProject.status) {
        const statusText = {
          'not_started': '未开始',
          'in_progress': '进行中',
          'completed': '已完成',
          'paused': '已暂停'
        };

        const notificationType = status === 'completed' ? 'success' : 
                               status === 'paused' ? 'warning' : 'info';
        
        const notificationTitle = status === 'completed' ? '🎉 项目已完成' :
                                status === 'paused' ? '⏸️ 项目已暂停' :
                                '📋 项目状态更新';

        await createNotification(
          req.user.id,
          notificationType,
          notificationTitle,
          `项目"${updatedProject.name}"状态已更新为：${statusText[status]}`,
          {
            project_id: id,
            project_name: updatedProject.name,
            old_status: existingProject.status,
            new_status: status,
            status_text: statusText[status]
          }
        );
      }
    } catch (notificationError) {
      console.error('发送项目状态变更通知失败:', notificationError);
      // 不影响主流程，只记录错误
    }

  } catch (error) {
    console.error('更新项目错误:', error);
    res.status(500).json({ error: '更新项目失败' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and belongs to user
    const project = await db('study_projects')
      .where('id', id)
      .where('user_id', req.user.id)
      .first();

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // Delete project (cascade will handle related sessions)
    await db('study_projects')
      .where('id', id)
      .del();

    res.json({ message: '项目删除成功' });

    // 发送项目删除通知
    try {
      await createNotification(
        req.user.id,
        'info',
        '🗑️ 项目已删除',
        `项目"${project.name}"已被删除。`,
        {
          project_id: id,
          project_name: project.name,
          deleted_at: new Date()
        }
      );
    } catch (notificationError) {
      console.error('发送项目删除通知失败:', notificationError);
      // 不影响主流程，只记录错误
    }

  } catch (error) {
    console.error('删除项目错误:', error);
    res.status(500).json({ error: '删除项目失败' });
  }
});

// Get project statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists and belongs to user
    const project = await db('study_projects')
      .where('id', id)
      .where('user_id', req.user.id)
      .first();

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // Get sessions for this project
    const sessions = await db('study_sessions')
      .where('project_id', id)
      .orderBy('start_time', 'desc');

    // Calculate statistics
    const totalSessions = sessions.length;
    const totalHours = sessions.reduce((sum, session) => sum + (session.duration_hours || 0), 0);
    const avgProductivity = sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + (session.productivity_rating || 0), 0) / sessions.length 
      : 0;

    // Get sessions by date for chart
    const sessionsByDate = await db('study_sessions')
      .select(
        db.raw('DATE(start_time) as date'),
        db.raw('SUM(duration_hours) as total_hours'),
        db.raw('COUNT(*) as session_count')
      )
      .where('project_id', id)
      .groupBy(db.raw('DATE(start_time)'))
      .orderBy('date');

    res.json({
      stats: {
        totalSessions,
        totalHours,
        avgProductivity: Math.round(avgProductivity * 10) / 10,
        estimatedHours: project.estimated_hours,
        actualHours: project.actual_hours,
        efficiency: project.estimated_hours 
          ? Math.round((project.actual_hours / project.estimated_hours) * 100) 
          : null
      },
      sessionsByDate
    });

  } catch (error) {
    console.error('获取项目统计错误:', error);
    res.status(500).json({ error: '获取项目统计失败' });
  }
});

// 批量删除项目
router.delete('/batch', authenticateToken, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '缺少项目ID' });
  }
  try {
    await db('study_projects').whereIn('id', ids).andWhere('user_id', req.user.id).del();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '批量删除失败' });
  }
});

// 批量状态切换
router.put('/batch-status', authenticateToken, async (req, res) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !status) {
    return res.status(400).json({ error: '缺少参数' });
  }
  try {
    await db('study_projects').whereIn('id', ids).andWhere('user_id', req.user.id).update({ status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '批量状态更新失败' });
  }
});

// Export projects
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.query;
    let projectIds = [];
    
    if (ids) {
      projectIds = ids.split(',').map(id => parseInt(id));
    }

    let query = db('study_projects')
      .where('user_id', req.user.id)
      .select('*')
      .orderBy('created_at', 'desc');

    if (projectIds.length > 0) {
      query = query.whereIn('id', projectIds);
    }

    const projects = await query;

    // Convert to Excel format
    const workbook = xlsx.utils.book_new();
    
    const worksheet = xlsx.utils.json_to_sheet(projects.map(project => ({
      '项目名称': project.name,
      '描述': project.description || '',
      '分类': getCategoryText(project.category),
      '难度等级': project.difficulty_level,
      '预计时长(小时)': project.estimated_hours,
      '实际时长(小时)': project.actual_hours || '',
      '状态': getStatusText(project.status),
      '开始时间': project.start_date ? new Date(project.start_date).toLocaleDateString('zh-CN') : '',
      '完成时间': project.completion_date ? new Date(project.completion_date).toLocaleDateString('zh-CN') : '',
      '创建时间': new Date(project.created_at).toLocaleDateString('zh-CN')
    })));

    xlsx.utils.book_append_sheet(workbook, worksheet, '学习项目');

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=学习项目.xlsx');

    // Write to response
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);

  } catch (error) {
    console.error('导出项目错误:', error);
    res.status(500).json({ error: '导出项目失败' });
  }
});

// Import projects from Excel file
router.post('/import', authenticateToken, async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: '请选择文件' });
    }

    const file = req.files.file;
    
    // 检查文件类型
    const isExcel = file.mimetype.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.mimetype.includes('csv') || file.name.endsWith('.csv') || file.mimetype === 'application/octet-stream';
    
    if (!isExcel && !isCSV) {
      return res.status(400).json({ error: '请上传Excel文件(.xlsx或.xls)或CSV文件(.csv)' });
    }

    let data;
    
    if (isExcel) {
      // 读取Excel文件
      console.log('=== 处理Excel文件 ===');
      console.log('文件名:', file.name);
      console.log('文件大小:', file.size);
      console.log('文件类型:', file.mimetype);
      
      const workbook = xlsx.read(file.data, { type: 'buffer' });
      console.log('工作表名称:', workbook.SheetNames);
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('Excel解析结果:');
      console.log('数据行数:', data.length);
      console.log('标题行:', data[0]);
      console.log('第一行数据:', data[1]);
    } else {
      // 读取CSV文件
      console.log('=== 处理CSV文件 ===');
      console.log('文件名:', file.name);
      console.log('文件大小:', file.size);
      console.log('文件类型:', file.mimetype);
      
      const csvContent = file.data.toString('utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      data = lines.map(line => line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, '')));
      
      console.log('CSV解析结果:');
      console.log('数据行数:', data.length);
      console.log('标题行:', data[0]);
      console.log('第一行数据:', data[1]);
    }
    
    if (data.length < 2) {
      return res.status(400).json({ error: '文件格式不正确，至少需要包含标题行和一行数据' });
    }

    // 获取标题行
    const headers = data[0];
    const rows = data.slice(1);
    
    console.log('文件标题行:', headers);
    
    // 灵活的列名映射
    const columnMappings = {
      // 项目名称列
      name: ['项目名称', '学习项目名称', 'name', 'project_name', 'projectName', '项目名', '学习项目'],
      // 开始时间列
      startDate: ['开始时间', '项目开始时间', 'start_date', 'startDate', 'start_time', '开始日期', '起始时间'],
      // 完成时间列
      endDate: ['完成时间', '项目结束时间', 'end_date', 'endDate', 'end_time', 'completion_date', '结束时间', '完成日期'],
      // 耗时列
      duration: ['耗时(小时)', '项目完成时间', 'duration', 'hours', 'time_spent', '耗时', '时间', '时长'],
      // 难度等级列
      difficulty: ['难度等级', 'difficulty', 'difficulty_level', 'level', '难度', '等级'],
      // 备注列
      notes: ['备注', 'notes', 'description', 'desc', '说明', '描述'],
      // 分类列
      category: ['分类', 'category', 'type', '类型', '类别']
    };

    // 找到对应的列索引
    const columnIndexes = {};
    for (const [key, possibleNames] of Object.entries(columnMappings)) {
      columnIndexes[key] = -1;
      for (const name of possibleNames) {
        const index = headers.findIndex(header => 
          header && header.toString().toLowerCase().includes(name.toLowerCase())
        );
        if (index !== -1) {
          columnIndexes[key] = index;
          break;
        }
      }
    }

    console.log('列索引映射:', columnIndexes);

    // 验证必需的列
    const requiredColumns = ['name', 'startDate'];
    const missingColumns = requiredColumns.filter(col => columnIndexes[col] === -1);
    
    if (missingColumns.length > 0) {
      const missingNames = missingColumns.map(col => columnMappings[col][0]).join(', ');
      return res.status(400).json({ 
        error: `文件缺少必需的列: ${missingNames}`,
        availableColumns: headers
      });
    }

    let imported = 0;
    let errors = [];

    // 处理每一行数据
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      try {
        // 提取数据
        const name = columnIndexes.name !== -1 ? row[columnIndexes.name] : '';
        const startDateStr = columnIndexes.startDate !== -1 ? row[columnIndexes.startDate] : '';
        const endDateStr = columnIndexes.endDate !== -1 ? row[columnIndexes.endDate] : '';
        const duration = columnIndexes.duration !== -1 ? row[columnIndexes.duration] : '';
        const difficulty = columnIndexes.difficulty !== -1 ? row[columnIndexes.difficulty] : '3';
        const notes = columnIndexes.notes !== -1 ? row[columnIndexes.notes] : '';
        const category = columnIndexes.category !== -1 ? row[columnIndexes.category] : 'other';

        // 验证数据
        if (!name || !startDateStr) {
          errors.push(`第${i + 2}行: 项目名称和开始时间不能为空`);
          continue;
        }

        // 解析日期
        let startDate, endDate;
        try {
          // 尝试多种日期格式
          const dateFormats = [
            'YYYY-MM-DD',
            'MM/DD/YYYY',
            'DD/MM/YYYY',
            'YYYY/MM/DD'
          ];
          
          startDate = parseDate(startDateStr);
          if (!startDate) {
            errors.push(`第${i + 2}行: 开始时间格式不正确 (${startDateStr})`);
            continue;
          }
          
          if (endDateStr) {
            endDate = parseDate(endDateStr);
            if (!endDate) {
              errors.push(`第${i + 2}行: 完成时间格式不正确 (${endDateStr})`);
              continue;
            }
          }
        } catch (dateError) {
          errors.push(`第${i + 2}行: 日期格式不正确`);
          continue;
        }

        // 验证数值
        const durationHours = parseFloat(duration) || 0;
        const difficultyLevel = parseInt(difficulty) || 3;
        
        if (difficultyLevel < 1 || difficultyLevel > 5) {
          errors.push(`第${i + 2}行: 难度等级必须在1-5之间`);
          continue;
        }

        // 确定项目状态
        let status = 'active';
        if (endDate && endDate < new Date()) {
          status = 'completed';
        }

        // 计算进度
        let progress = 0;
        if (endDate && startDate) {
          const totalDuration = endDate - startDate;
          const elapsed = new Date() - startDate;
          progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
        }

        // 插入数据库
        const [projectId] = await db('study_projects').insert({
          user_id: req.user.id,
          name: name.toString().trim(),
          description: notes.toString().trim(),
          start_date: startDate,
          completion_date: endDate || null,
          estimated_hours: durationHours,
          actual_hours: durationHours,
          difficulty_level: difficultyLevel,
          status,
          category: mapCategory(category.toString().trim()),
          notes: notes.toString().trim(),
          progress,
          created_at: new Date(),
          updated_at: new Date()
        }).returning('id');

        imported++;

      } catch (rowError) {
        console.error(`处理第${i + 2}行时出错:`, rowError);
        errors.push(`第${i + 2}行: 数据处理失败`);
      }
    }

    res.json({
      message: `成功导入 ${imported} 个项目`,
      imported,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('导入文件错误:', error);
    res.status(500).json({ error: '导入失败，请检查文件格式' });
  }
});

// 辅助函数：解析日期
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // 移除引号和空格
  dateStr = dateStr.toString().trim().replace(/^["']|["']$/g, '');
  
  // 尝试直接解析
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // 尝试解析不同格式
  const patterns = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/ // YYYY/MM/DD
  ];
  
  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

// Helper function to map category
function mapCategory(category) {
  const categoryMap = {
    '编程': 'programming',
    '语言学习': 'language',
    '设计': 'design',
    '商业': 'business',
    '其他': 'other'
  };
  
  return categoryMap[category] || 'other';
}

// Helper functions
function getStatusText(status) {
  const statusMap = {
    'active': '进行中',
    'completed': '已完成',
    'paused': '已暂停'
  };
  return statusMap[status] || status;
}

function getCategoryText(category) {
  const categoryMap = {
    'programming': '编程',
    'language': '语言学习',
    'design': '设计',
    'business': '商业',
    'other': '其他'
  };
  return categoryMap[category] || category;
}

module.exports = router; 