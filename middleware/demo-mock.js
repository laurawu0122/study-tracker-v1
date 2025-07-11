const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const url = require('url');

// 演示数据生成函数
function generateDemoData() {
  // 生成500个学习项目
  const projects = [];
  const projectNames = [
    'JavaScript 进阶学习', 'Python 数据分析', 'React 框架学习', '算法与数据结构',
    '数据库设计', 'Node.js 后端开发', 'Vue.js 前端框架', 'TypeScript 编程',
    '机器学习基础', '深度学习入门', '数据可视化', 'Web安全开发',
    '移动端开发', '云计算基础', 'DevOps 实践', '微服务架构',
    'Docker 容器化', 'Kubernetes 编排', '区块链技术', '人工智能应用',
    '大数据处理', '自然语言处理', '计算机视觉', '软件测试',
    '项目管理', '产品设计', '用户体验设计', '前端工程化',
    '后端架构设计', 'API 设计', 'GraphQL 开发', 'RESTful API',
    '数据库优化', '缓存策略', '消息队列', '搜索引擎',
    '推荐系统', '实时通信', 'WebSocket 开发', 'PWA 应用',
    '小程序开发', 'Flutter 跨平台', 'React Native', 'Electron 桌面应用',
    'Linux 系统管理', '网络编程', '并发编程', '函数式编程',
    '设计模式', '代码重构', '性能优化', '代码审查'
  ];

  const projectDescriptions = [
    '深入学习JavaScript高级特性和最佳实践',
    '学习使用Python进行数据分析和可视化',
    '掌握React框架的核心概念和开发技巧',
    '系统学习经典算法和数据结构',
    '学习关系型数据库设计原则和优化',
    '掌握Node.js后端开发技术栈',
    '学习Vue.js前端框架和生态系统',
    '掌握TypeScript类型系统和高级特性',
    '学习机器学习基础理论和实践',
    '深入理解深度学习原理和应用',
    '学习数据可视化技术和工具',
    '掌握Web安全开发最佳实践',
    '学习移动端开发技术和框架',
    '了解云计算基础概念和服务',
    '学习DevOps实践和工具链',
    '掌握微服务架构设计原则',
    '学习Docker容器化技术',
    '掌握Kubernetes集群管理',
    '了解区块链技术原理和应用',
    '学习人工智能应用开发',
    '掌握大数据处理技术',
    '学习自然语言处理技术',
    '掌握计算机视觉算法',
    '学习软件测试方法和工具',
    '掌握项目管理方法论',
    '学习产品设计思维',
    '掌握用户体验设计原则',
    '学习前端工程化实践',
    '掌握后端架构设计模式',
    '学习API设计最佳实践',
    '掌握GraphQL查询语言',
    '学习RESTful API设计',
    '掌握数据库性能优化',
    '学习缓存策略和实现',
    '掌握消息队列技术',
    '学习搜索引擎原理',
    '掌握推荐系统算法',
    '学习实时通信技术',
    '掌握WebSocket开发',
    '学习PWA应用开发',
    '掌握小程序开发技术',
    '学习Flutter跨平台开发',
    '掌握React Native开发',
    '学习Electron桌面应用开发',
    '掌握Linux系统管理',
    '学习网络编程技术',
    '掌握并发编程模式',
    '学习函数式编程范式',
    '掌握设计模式应用',
    '学习代码重构技巧',
    '掌握性能优化方法',
    '学习代码审查实践'
  ];

  const statuses = ['in_progress', 'completed', 'planned'];
  const baseDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  for (let i = 1; i <= 15; i++) {
    const projectIndex = (i - 1) % projectNames.length;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const totalSessions = Math.floor(Math.random() * 50) + 10;
    const completedSessions = status === 'completed' ? totalSessions : Math.floor(Math.random() * totalSessions);
    const totalDuration = Math.floor(Math.random() * 2000) + 300;
    const createdDate = new Date(baseDate.getTime() + Math.random() * (endDate.getTime() - baseDate.getTime()));
    const lastStudied = new Date(createdDate.getTime() + Math.random() * (Date.now() - createdDate.getTime()));

    projects.push({
      id: i,
      name: projectNames[projectIndex],
      description: projectDescriptions[projectIndex],
      status: status,
      total_sessions: totalSessions,
      completed_sessions: completedSessions,
      total_duration: totalDuration,
      created_at: createdDate.toISOString(),
      last_studied: lastStudied.toISOString()
    });
  }

  // 生成500条学习记录，项目名称来自项目管理数据
  const studyRecords = [];
  const notes = [
    '学习了核心概念和基础语法',
    '完成了实践项目和练习',
    '复习了重要知识点',
    '解决了技术难点和问题',
    '学习了新的框架和工具',
    '优化了代码结构和性能',
    '学习了最佳实践和设计模式',
    '完成了项目实战练习',
    '学习了高级特性和技巧',
    '复习了考试重点内容',
    '学习了新技术和趋势',
    '完成了团队协作项目',
    '学习了文档和规范',
    '解决了bug和调试问题',
    '学习了测试和部署',
    '复习了面试重点内容',
    '学习了开源项目源码',
    '完成了个人项目开发',
    '学习了性能优化技巧',
    '复习了基础知识'
  ];

  // 生成2025年的学习记录数据，确保日历能显示数据
  const baseStudyDate = new Date('2025-01-01');
  const endStudyDate = new Date('2025-12-31');
  
  for (let i = 1; i <= 500; i++) {
    const project = projects[Math.floor(Math.random() * projects.length)];
    const duration = Math.floor(Math.random() * 120) + 15; // 15-135分钟
    const studyDate = new Date(baseStudyDate.getTime() + Math.random() * (endStudyDate.getTime() - baseStudyDate.getTime()));
    const note = notes[Math.floor(Math.random() * notes.length)];
    
    // 生成合理的时间范围
    const startHour = Math.floor(Math.random() * 12) + 8; // 8:00 - 19:59
    const startMinute = Math.floor(Math.random() * 60);
    const endHour = startHour + Math.floor(duration / 60);
    const endMinute = duration % 60;

    studyRecords.push({
      id: i,
      project_name: project.name,
      duration: duration,
      date: studyDate.toISOString().split('T')[0],
      study_date: studyDate.toISOString().split('T')[0], // 添加study_date字段
      notes: `${project.name} - ${note}`,
      start_time: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
      end_time: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      start_time_new: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
      end_time_new: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      created_at: studyDate.toISOString(),
      updated_at: studyDate.toISOString()
    });
  }

  // 生成积分兑换相关的演示数据
  const pointsExchangeData = {
    // 用户积分信息
    userPoints: {
      total_points: 50000,
      available_points: 48500,
      used_points: 1500,
      earned_points: 51500
    },
    
    // 商品分类
    categories: [
      { id: 1, name: '学习工具', description: '提升学习效率的虚拟工具', icon: '🛠️', sort_order: 1 },
      { id: 2, name: '成就徽章', description: '特殊的成就徽章和装饰', icon: '🏆', sort_order: 2 },
      { id: 3, name: '特权功能', description: '解锁特殊功能和使用权限', icon: '⭐', sort_order: 3 },
      { id: 4, name: '纪念品', description: '学习历程纪念品', icon: '🎁', sort_order: 4 },
      { id: 5, name: '课程', description: '在线学习课程', icon: '📚', sort_order: 5 },
      { id: 6, name: '书籍', description: '技术书籍和资料', icon: '📖', sort_order: 6 },
      { id: 7, name: '工具', description: '开发工具和服务', icon: '🔧', sort_order: 7 },
      { id: 8, name: '周边', description: '学习用品和周边', icon: '🎒', sort_order: 8 },
      { id: 9, name: '服务', description: '专业服务', icon: '👨‍🏫', sort_order: 9 }
    ],
    
    // 兑换商品
    products: [
      {
        id: 1,
        name: '专注模式',
        description: '解锁专注模式，屏蔽干扰，提升学习效率',
        category_id: 1,
        category_name: '学习工具',
        image_url: '/assets/ico/focus-mode.svg',
        points_required: 100,
        stock_quantity: -1,
        exchange_limit_per_user: 1,
        requires_approval: false,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        name: '学习报告',
        description: '获得详细的学习分析报告',
        category_id: 1,
        category_name: '学习工具',
        image_url: '/assets/ico/analytics-report.svg',
        points_required: 50,
        stock_quantity: -1,
        exchange_limit_per_user: 5,
        requires_approval: false,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 3,
        name: '黄金徽章',
        description: '获得特殊的黄金成就徽章',
        category_id: 2,
        category_name: '成就徽章',
        image_url: '/assets/ico/gold-badge.svg',
        points_required: 200,
        stock_quantity: 100,
        exchange_limit_per_user: 1,
        requires_approval: true,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 4,
        name: '高级主题',
        description: '解锁高级界面主题',
        category_id: 3,
        category_name: '特权功能',
        image_url: '/assets/ico/premium-theme.svg',
        points_required: 150,
        stock_quantity: -1,
        exchange_limit_per_user: 1,
        requires_approval: false,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 5,
        name: 'JavaScript进阶课程',
        description: '包含完整的学习路径和实战项目',
        category_id: 5,
        category_name: '课程',
        image_url: '/assets/ico/certificate.svg',
        points_required: 5000,
        stock_quantity: 10,
        exchange_limit_per_user: 1,
        requires_approval: true,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 6,
        name: '技术书籍合集',
        description: '精选的技术书籍，涵盖多个领域',
        category_id: 6,
        category_name: '书籍',
        image_url: '/assets/ico/knowledge-star.svg',
        points_required: 2000,
        stock_quantity: 25,
        exchange_limit_per_user: 3,
        requires_approval: true,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 7,
        name: '在线工具会员',
        description: '提供各种开发工具的会员服务',
        category_id: 7,
        category_name: '工具',
        image_url: '/assets/ico/efficiency-focus.svg',
        points_required: 3000,
        stock_quantity: 50,
        exchange_limit_per_user: 2,
        requires_approval: true,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 8,
        name: '学习周边套装',
        description: '高质量的学习用品和周边产品',
        category_id: 8,
        category_name: '周边',
        image_url: '/assets/ico/community-active.svg',
        points_required: 800,
        stock_quantity: 100,
        exchange_limit_per_user: 5,
        requires_approval: false,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 9,
        name: '一对一技术辅导',
        description: '专业导师一对一技术指导',
        category_id: 9,
        category_name: '服务',
        image_url: '/assets/ico/study-expert.svg',
        points_required: 8000,
        stock_quantity: 5,
        exchange_limit_per_user: 1,
        requires_approval: true,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      },
      {
        id: 10,
        name: '学习纪念徽章',
        description: '纪念你的学习历程',
        category_id: 4,
        category_name: '纪念品',
        image_url: '/assets/ico/special-milestone.svg',
        points_required: 300,
        stock_quantity: 200,
        exchange_limit_per_user: 1,
        requires_approval: false,
        status: 'active',
        created_at: '2025-01-01T00:00:00.000Z'
      }
    ],
    
    // 兑换记录（用户视角）
    exchanges: [
      {
        id: 1,
        product_id: 6,
        product_name: '技术书籍合集',
        category_name: '书籍',
        points_used: 2000,
        quantity: 1,
        status: 'approved',
        exchange_date: '2025-07-01T10:30:00.000Z',
        completed_at: '2025-07-01T11:00:00.000Z',
        created_at: '2025-07-01T10:30:00.000Z'
      },
      {
        id: 2,
        product_id: 8,
        product_name: '学习周边套装',
        category_name: '周边',
        points_used: 800,
        quantity: 1,
        status: 'pending',
        exchange_date: '2025-07-05T14:20:00.000Z',
        created_at: '2025-07-05T14:20:00.000Z'
      },
      {
        id: 3,
        product_id: 7,
        product_name: '在线工具会员',
        category_name: '工具',
        points_used: 3000,
        quantity: 1,
        status: 'approved',
        exchange_date: '2025-06-20T09:15:00.000Z',
        completed_at: '2025-06-20T10:00:00.000Z',
        created_at: '2025-06-20T09:15:00.000Z'
      },
      {
        id: 4,
        product_id: 5,
        product_name: 'JavaScript进阶课程',
        category_name: '课程',
        points_used: 5000,
        quantity: 1,
        status: 'pending',
        exchange_date: '2025-07-08T16:45:00.000Z',
        created_at: '2025-07-08T16:45:00.000Z'
      },
      {
        id: 5,
        product_id: 1,
        product_name: '专注模式',
        category_name: '学习工具',
        points_used: 100,
        quantity: 1,
        status: 'completed',
        exchange_date: '2025-06-15T13:30:00.000Z',
        completed_at: '2025-06-15T13:35:00.000Z',
        created_at: '2025-06-15T13:30:00.000Z'
      },
      {
        id: 6,
        product_id: 2,
        product_name: '学习报告',
        category_name: '学习工具',
        points_used: 50,
        quantity: 2,
        status: 'completed',
        exchange_date: '2025-06-25T11:20:00.000Z',
        completed_at: '2025-06-25T11:25:00.000Z',
        created_at: '2025-06-25T11:20:00.000Z'
      },
      {
        id: 7,
        product_id: 9,
        product_name: '一对一技术辅导',
        category_name: '服务',
        points_used: 8000,
        quantity: 1,
        status: 'rejected',
        exchange_date: '2025-07-06T13:30:00.000Z',
        rejected_at: '2025-07-06T14:00:00.000Z',
        rejection_reason: '库存不足',
        created_at: '2025-07-06T13:30:00.000Z'
      },
      {
        id: 8,
        product_id: 3,
        product_name: '黄金徽章',
        category_name: '成就徽章',
        points_used: 200,
        quantity: 1,
        status: 'pending',
        exchange_date: '2025-07-09T15:45:00.000Z',
        created_at: '2025-07-09T15:45:00.000Z'
      }
    ],
    
    // 积分记录
    pointsRecords: [
      {
        id: 1,
        type: 'earn',
        points: 1000,
        description: '完成学习任务奖励',
        date: '2025-07-09T08:00:00.000Z',
        created_at: '2025-07-09T08:00:00.000Z'
      },
      {
        id: 2,
        type: 'spend',
        points: -2000,
        description: '兑换技术书籍合集',
        date: '2025-07-01T10:30:00.000Z',
        created_at: '2025-07-01T10:30:00.000Z'
      },
      {
        id: 3,
        type: 'earn',
        points: 500,
        description: '连续学习7天奖励',
        date: '2025-07-08T08:00:00.000Z',
        created_at: '2025-07-08T08:00:00.000Z'
      },
      {
        id: 4,
        type: 'spend',
        points: -800,
        description: '兑换学习周边套装',
        date: '2025-07-05T14:20:00.000Z',
        created_at: '2025-07-05T14:20:00.000Z'
      },
      {
        id: 5,
        type: 'earn',
        points: 2000,
        description: '完成项目里程碑',
        date: '2025-07-03T15:30:00.000Z',
        created_at: '2025-07-03T15:30:00.000Z'
      },
      {
        id: 6,
        type: 'spend',
        points: -3000,
        description: '兑换在线工具会员',
        date: '2025-06-20T09:15:00.000Z',
        created_at: '2025-06-20T09:15:00.000Z'
      },
      {
        id: 7,
        type: 'earn',
        points: 1500,
        description: '学习时长达到目标',
        date: '2025-06-25T12:00:00.000Z',
        created_at: '2025-06-25T12:00:00.000Z'
      },
      {
        id: 8,
        type: 'spend',
        points: -5000,
        description: '兑换JavaScript进阶课程',
        date: '2025-07-08T16:45:00.000Z',
        created_at: '2025-07-08T16:45:00.000Z'
      },
      {
        id: 9,
        type: 'earn',
        points: 800,
        description: '获得成就奖励',
        date: '2025-06-28T10:00:00.000Z',
        created_at: '2025-06-28T10:00:00.000Z'
      },
      {
        id: 10,
        type: 'spend',
        points: -100,
        description: '兑换专注模式',
        date: '2025-06-15T13:30:00.000Z',
        created_at: '2025-06-15T13:30:00.000Z'
      },
      {
        id: 11,
        type: 'spend',
        points: -100,
        description: '兑换学习报告 x2',
        date: '2025-06-25T11:20:00.000Z',
        created_at: '2025-06-25T11:20:00.000Z'
      },
      {
        id: 12,
        type: 'spend',
        points: -8000,
        description: '兑换一对一技术辅导（已拒绝）',
        date: '2025-07-06T13:30:00.000Z',
        created_at: '2025-07-06T13:30:00.000Z'
      },
      {
        id: 13,
        type: 'spend',
        points: -200,
        description: '兑换黄金徽章',
        date: '2025-07-09T15:45:00.000Z',
        created_at: '2025-07-09T15:45:00.000Z'
      }
    ],
    
    // 兑换审核记录（管理员视角）
    approvalRecords: [
      {
        id: 1,
        user_id: 161,
        username: 'admin',
        email: 'admin@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 6,
        product_name: '技术书籍合集',
        product_description: '精选的技术书籍，涵盖多个领域',
        product_image: '/assets/ico/knowledge-star.svg',
        category_name: '书籍',
        points_spent: 2000,
        quantity: 1,
        status: 'approved',
        exchange_date: '2025-07-01T10:30:00.000Z',
        approved_at: '2025-07-01T11:00:00.000Z',
        approved_by: 1,
        approved_by_username: 'admin',
        approval_notes: '审核通过',
        created_at: '2025-07-01T10:30:00.000Z'
      },
      {
        id: 2,
        user_id: 162,
        username: 'testuser',
        email: 'testuser@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 8,
        product_name: '学习周边套装',
        product_description: '高质量的学习用品和周边产品',
        product_image: '/assets/ico/community-active.svg',
        category_name: '周边',
        points_spent: 800,
        quantity: 1,
        status: 'pending',
        exchange_date: '2025-07-05T14:20:00.000Z',
        created_at: '2025-07-05T14:20:00.000Z'
      },
      {
        id: 3,
        user_id: 163,
        username: 'test7',
        email: 'test7@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 7,
        product_name: '在线工具会员',
        product_description: '提供各种开发工具的会员服务',
        product_image: '/assets/ico/efficiency-focus.svg',
        category_name: '工具',
        points_spent: 3000,
        quantity: 1,
        status: 'approved',
        exchange_date: '2025-07-02T09:15:00.000Z',
        approved_at: '2025-07-02T10:00:00.000Z',
        approved_by: 1,
        approved_by_username: 'admin',
        approval_notes: '审核通过',
        created_at: '2025-07-02T09:15:00.000Z'
      },
      {
        id: 4,
        user_id: 162,
        username: 'testuser',
        email: 'testuser@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 5,
        product_name: 'JavaScript进阶课程',
        product_description: '包含完整的学习路径和实战项目',
        product_image: '/assets/ico/certificate.svg',
        category_name: '课程',
        points_spent: 5000,
        quantity: 1,
        status: 'processing',
        exchange_date: '2025-07-08T16:45:00.000Z',
        created_at: '2025-07-08T16:45:00.000Z'
      },
      {
        id: 5,
        user_id: 161,
        username: 'admin',
        email: 'admin@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 9,
        product_name: '一对一技术辅导',
        product_description: '专业导师一对一技术指导',
        product_image: '/assets/ico/study-expert.svg',
        category_name: '服务',
        points_spent: 8000,
        quantity: 1,
        status: 'rejected',
        exchange_date: '2025-07-06T13:30:00.000Z',
        rejected_at: '2025-07-06T14:00:00.000Z',
        approved_by: 1,
        approved_by_username: 'admin',
        approval_notes: '库存不足，暂时无法提供此服务',
        created_at: '2025-07-06T13:30:00.000Z'
      },
      {
        id: 6,
        user_id: 163,
        username: 'test7',
        email: 'test7@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 3,
        product_name: '黄金徽章',
        product_description: '获得特殊的黄金成就徽章',
        product_image: '/assets/ico/gold-badge.svg',
        category_name: '成就徽章',
        points_spent: 200,
        quantity: 1,
        status: 'pending',
        exchange_date: '2025-07-09T15:45:00.000Z',
        created_at: '2025-07-09T15:45:00.000Z'
      },
      {
        id: 7,
        user_id: 162,
        username: 'testuser',
        email: 'testuser@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 6,
        product_name: '技术书籍合集',
        product_description: '精选的技术书籍，涵盖多个领域',
        product_image: '/assets/ico/knowledge-star.svg',
        category_name: '书籍',
        points_spent: 2000,
        quantity: 1,
        status: 'completed',
        exchange_date: '2025-07-03T11:20:00.000Z',
        completed_at: '2025-07-03T12:00:00.000Z',
        approved_at: '2025-07-03T11:30:00.000Z',
        approved_by: 1,
        approved_by_username: 'admin',
        approval_notes: '审核通过',
        created_at: '2025-07-03T11:20:00.000Z'
      },
      {
        id: 8,
        user_id: 161,
        username: 'admin',
        email: 'admin@example.com',
        user_avatar: '/assets/ico/default.svg',
        product_id: 4,
        product_name: '高级主题',
        product_description: '解锁高级界面主题',
        product_image: '/assets/ico/premium-theme.svg',
        category_name: '特权功能',
        points_spent: 150,
        quantity: 1,
        status: 'completed',
        exchange_date: '2025-07-04T14:30:00.000Z',
        completed_at: '2025-07-04T14:35:00.000Z',
        created_at: '2025-07-04T14:30:00.000Z'
      }
    ],
    
    // 积分规则
    pointsRules: [
      { id: 1, action: 'study_session', points: 10, description: '完成学习会话' },
      { id: 2, action: 'project_complete', points: 50, description: '完成学习项目' },
      { id: 3, action: 'streak_7', points: 100, description: '连续学习7天' },
      { id: 4, action: 'streak_30', points: 500, description: '连续学习30天' },
      { id: 5, action: 'achievement_earned', points: 200, description: '获得成就' },
      { id: 6, action: 'daily_login', points: 5, description: '每日登录' },
      { id: 7, action: 'weekly_goal', points: 300, description: '完成周目标' },
      { id: 8, action: 'monthly_goal', points: 1000, description: '完成月目标' }
    ]
  };

  return { projects, studyRecords, pointsExchangeData };
}

// 读取Excel文件的函数
function readExcelFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('Excel文件不存在:', filePath);
      return null;
    }
    
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      console.error('Excel文件数据不足');
      return null;
    }
    
    // 获取表头
    const headers = data[0];
    const records = [];
    
    // 处理数据行
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length === 0 || row.every(cell => !cell)) continue; // 跳过空行
      
      const record = {};
      headers.forEach((header, index) => {
        if (header && row[index] !== undefined) {
          record[header] = row[index];
        }
      });
      records.push(record);
    }
    
    return records;
  } catch (error) {
    console.error('读取Excel文件失败:', error);
    return null;
  }
}

// 生成演示数据
const { projects, studyRecords, pointsExchangeData } = generateDemoData();

const demoData = {
  // 用户数据
  user: {
    id: 1,
    username: '演示用户',
    email: 'demo@example.com',
    points: pointsExchangeData.userPoints.available_points,
    avatar: '/assets/ico/default.svg',
    achievements: [
      { id: 1, name: '学习新手', icon: '/assets/ico/achievements/first-study.svg', earned_at: '2025-01-15T10:00:00.000Z' },
      { id: 2, name: '专注达人', icon: '/assets/ico/achievements/streak-7.svg', earned_at: '2025-01-20T14:30:00.000Z' }
    ]
  },
  
  // 用户积分信息
  userPoints: pointsExchangeData.userPoints,

  // 积分商城商品
  products: pointsExchangeData.products,

  // 兑换记录
  exchanges: pointsExchangeData.exchanges,
  
  // 商品分类
  categories: pointsExchangeData.categories,

  // 成就数据
  achievements: [
    {
      id: 1,
      name: '学习新手',
      description: '完成第一次学习会话',
      icon: '/assets/ico/achievements/first-study.svg',
      category: '学习',
      progress: { current: 1, required: 1, completed: true },
      earned_at: '2025-01-15T10:00:00.000Z'
    },
    {
      id: 2,
      name: '专注达人',
      description: '连续学习7天',
      icon: '/assets/ico/achievements/streak-7.svg',
      category: '专注',
      progress: { current: 7, required: 7, completed: true },
      earned_at: '2025-01-20T14:30:00.000Z'
    },
    {
      id: 3,
      name: '学习专家',
      description: '连续学习30天',
      icon: '/assets/ico/achievements/streak-30.svg',
      category: '专注',
      progress: { current: 15, required: 30, completed: false },
      earned_at: null
    },
    {
      id: 4,
      name: '项目完成者',
      description: '完成5个学习项目',
      icon: '/assets/ico/achievements/project-complete.svg',
      category: '学习',
      progress: { current: 3, required: 5, completed: false },
      earned_at: null
    }
  ],

  // 学习记录 - 使用生成的500条数据
  studyRecords: studyRecords,

  // 学习项目 - 使用生成的500条数据
  projects: projects,
  
  // 积分记录
  pointsRecords: pointsExchangeData.pointsRecords,
  
  // 兑换审核记录（管理员视角）
  approvalRecords: pointsExchangeData.approvalRecords,

  // 通知数据
  notifications: [
    {
      id: 1,
      title: '成就解锁',
      message: '恭喜获得"学习新手"成就！',
      type: 'achievement',
      is_read: false,
      created_at: '2025-01-15T10:00:00.000Z'
    },
    {
      id: 2,
      title: '兑换成功',
      message: '学习时长延长券兑换成功',
      type: 'exchange',
      is_read: true,
      created_at: '2025-01-20T10:00:00.000Z'
    },
    {
      id: 3,
      title: '学习提醒',
      message: '今天还没有学习记录，记得保持学习习惯',
      type: 'reminder',
      is_read: false,
      created_at: '2025-01-21T08:00:00.000Z'
    }
  ],

  // 分析数据
  analytics: {
    totalStudyTime: 285,
    totalSessions: 25,
    averageSessionTime: 11.4,
    currentStreak: 7,
    longestStreak: 15,
    monthlyData: [
      { month: '1月', sessions: 8, duration: 360 },
      { month: '2月', sessions: 12, duration: 540 },
      { month: '3月', sessions: 15, duration: 675 },
      { month: '4月', sessions: 10, duration: 450 },
      { month: '5月', sessions: 18, duration: 810 },
      { month: '6月', sessions: 20, duration: 900 }
    ],
    projectStats: [
      { name: 'JavaScript', sessions: 8, duration: 360 },
      { name: 'Python', sessions: 6, duration: 450 },
      { name: 'React', sessions: 20, duration: 1200 },
      { name: '算法', sessions: 12, duration: 900 }
    ],
    timeDistribution: [
      { category: '编程语言', percentage: 40 },
      { category: '框架学习', percentage: 30 },
      { category: '算法', percentage: 20 },
      { category: '其他', percentage: 10 }
    ]
  }
};

// DEMO 路由统一去除 /demo 前缀
// 这个逻辑应该在中间件函数内部处理，而不是在模块级别

// DEMO token 校验兼容
function isDemoToken(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.cookies?.token;
  return token === 'demo-token';
}

// Demo Mock 中间件
function demoMockMiddleware(req, res, next) {
  // 判断是否为 /demo/api 路径
  const isDemoApi = req.originalUrl.startsWith('/demo/api');
  const isDemoUser = req.user && req.user.role === 'demo';
  const isDemoEnvironment = process.env.NODE_ENV === 'development' && req.originalUrl.startsWith('/api');
  
  console.log(`🔍 Demo中间件检查:`, {
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    isDemoApi,
    isDemoUser,
    isDemoEnvironment
  });
  
  if (isDemoApi || isDemoUser || isDemoEnvironment) {
    console.log(`🎭 Demo模式访问API: ${req.method} ${req.originalUrl}`);
    
    // 自动注入 demo 用户
    if (isDemoApi && !req.user) {
      req.user = {
        id: 'demo_user',
        username: '演示用户',
        email: 'demo@study-tracker.com',
        role: 'demo'
      };
    }
    
    // 统一处理路径
    const apiPath = req.originalUrl.replace(/^\/demo/, '');
    const method = req.method;

    // 定义需要拦截的敏感操作路径和方法
    const sensitiveOperations = [
      // 数据修改操作
      { path: '/api/sessions', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/projects', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/achievements', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/points-exchange/exchanges', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/points-exchange/products', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/points-exchange/categories', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/points-exchange/points-rules', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/admin/users', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/admin/achievements', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/admin/achievement-categories', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/admin/config', methods: ['POST', 'PUT'] },
      { path: '/api/admin/smtp-config', methods: ['POST', 'PUT'] },
      { path: '/api/admin/data', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/upload', methods: ['POST'] },
      { path: '/api/data/import', methods: ['POST'] },
      { path: '/api/data/export', methods: ['POST'] },
      { path: '/api/data/backup', methods: ['POST'] },
      { path: '/api/data/clean', methods: ['POST', 'DELETE'] },
      { path: '/api/data/reset', methods: ['POST', 'DELETE'] },
      { path: '/api/notifications', methods: ['POST', 'PUT', 'DELETE'] },
      { path: '/api/notifications/settings', methods: ['POST', 'PUT'] },
      { path: '/api/notifications/clear-all', methods: ['DELETE'] },
      // 用户资料更新在demo环境下应该允许
      // { path: '/api/user/profile', methods: ['POST', 'PUT'] },
      { path: '/api/user/avatar', methods: ['POST'] },
      { path: '/api/auth/register', methods: ['POST'] },
      // 登录和登出应该允许在demo模式下工作
      // { path: '/api/auth/login', methods: ['POST'] },
      // { path: '/api/auth/logout', methods: ['POST'] },
      { path: '/api/auth/change-password', methods: ['POST'] },
      { path: '/api/auth/reset-password', methods: ['POST'] },
      { path: '/api/auth/verify-email', methods: ['POST'] }
    ];

    // 检查是否为敏感操作 - 只拦截POST/PUT/DELETE，不拦截GET
    const isSensitiveOperation = sensitiveOperations.some(operation => {
      return apiPath.startsWith(operation.path) && operation.methods.includes(method);
    });

    // 特殊处理：积分兑换的POST请求在演示模式下应该允许
    const isPointsExchangePost = apiPath.match(/\/api\/points-exchange\/products\/\d+\/exchange$/) && method === 'POST';

    // 如果是敏感操作且不是GET请求，且不是积分兑换POST请求，返回演示模式禁止提示
    if (isSensitiveOperation && method !== 'GET' && !isPointsExchangePost) {
      return res.status(403).json({
        success: false,
        error: '演示系统禁止操作',
        message: '为了保护演示环境的数据安全，此操作已被禁用。此功能仅在生产环境中可用。',
        demo: true,
        operation: `${method} ${apiPath}`
      });
    }

    // 对于GET请求和其他非敏感操作，提供演示数据
    try {
      // 统一处理路径，忽略 query string
      const pathOnly = url.parse(apiPath).pathname;
      // 学习记录相关API
      if (apiPath.startsWith('/api/sessions') && method === 'GET') {
        // 日期详情API - 获取特定日期的学习记录（必须放在最前面）
        if (pathOnly.match(/\/date\/[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
          const dateMatch = pathOnly.match(/\/date\/(\d{4}-\d{2}-\d{2})$/);
          if (dateMatch) {
            const targetDate = dateMatch[1];
            const dayRecords = demoData.studyRecords.filter(record => record.date === targetDate);
            const sessions = dayRecords.map(record => ({
              id: record.id || Math.floor(Math.random() * 10000),
              study_date: record.date,
              project_name: record.project_name,
              start_time_new: record.start_time,
              end_time_new: record.end_time,
              duration: record.duration,
              notes: record.notes || '',
              created_at: record.date + 'T10:00:00.000Z',
              updated_at: record.date + 'T10:00:00.000Z'
            }));
            
            console.log('【DEBUG】日期详情API:', targetDate, '记录数:', dayRecords.length, sessions);
            
            return res.json({
              success: true,
              sessions
            });
          }
        }
        
        // 项目列表API - 用于学习记录中的项目选择器
        if (apiPath.includes('/projects/list')) {
          const projectNames = [...new Set(demoData.projects.map(p => p.name))];
          return res.json({
            success: true,
            projects: projectNames.map((name, index) => ({
              id: index + 1,
              name: name
            }))
          });
        }
        
        // 日历数据API
        if (apiPath.includes('/calendar')) {
          const year = parseInt(req.query.year) || 2025;
          const month = parseInt(req.query.month) || 1;
          
          // 生成该月的学习记录数据
          const calendarData = {};
          const daysInMonth = new Date(year, month, 0).getDate();
          
          for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayRecords = demoData.studyRecords.filter(r => r.date === date);
            
            if (dayRecords.length > 0) {
              calendarData[date] = dayRecords.map(record => ({
                project_name: record.project_name,
                duration: record.duration,
                start_time_new: record.start_time,
                end_time_new: record.end_time
              }));
            }
          }
          
          return res.json({
            success: true,
            calendarData
          });
        }
        
        // 分析数据API
        if (apiPath.includes('/analytics')) {
          const totalStudyTime = demoData.studyRecords.reduce((sum, r) => sum + r.duration, 0);
          const totalSessions = demoData.studyRecords.length;
          const averageSessionTime = totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0;
          
          return res.json({
            success: true,
            stats: {
              totalStudyTime,
              totalSessions,
              averageSessionTime,
              currentStreak: 7,
              longestStreak: 15
            }
          });
        }


        
        // 积分兑换相关API
        if (apiPath.startsWith('/api/points-exchange')) {
          if (!isDemoToken(req)) {
            return res.status(401).json({ success: false, error: '演示模式需要 demo-token' });
          }

          // 兑换记录接口 mock（用户端）
          if (apiPath === '/api/points-exchange/exchange-records' && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const status = req.query.status;
            let records = demoData.exchanges;
            if (status) {
              records = records.filter(r => r.status === status);
            }
            const total = records.length;
            const totalPages = Math.ceil(total / limit);
            const offset = (page - 1) * limit;
            const data = records.slice(offset, offset + limit);
            return res.json({
              success: true,
              data,
              pagination: { page, limit, total, totalPages }
            });
          }

          // 积分明细接口 mock
          if (apiPath === '/api/points-exchange/points-records' && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            let records = demoData.pointsRecords || [];
            const total = records.length;
            const totalPages = Math.ceil(total / limit);
            const offset = (page - 1) * limit;
            const data = records.slice(offset, offset + limit);
            return res.json({
              success: true,
              data,
              pagination: { page, limit, total, totalPages }
            });
          }

          // 管理端兑换记录接口 mock
          if (apiPath === '/api/points-exchange/admin/exchange-records' && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            let records = demoData.exchanges;
            const total = records.length;
            const totalPages = Math.ceil(total / limit);
            const offset = (page - 1) * limit;
            const data = records.slice(offset, offset + limit);
            return res.json({
              success: true,
              data,
              pagination: { page, limit, total, totalPages }
            });
          }

          // 获取积分信息
          if (apiPath.includes('/info') && method === 'GET') {
            return res.json({
              success: true,
              data: demoData.userPoints
            });
          }
          
          // 获取用户积分信息
          if (apiPath.includes('/user-points') && method === 'GET') {
            return res.json({
              success: true,
              data: demoData.userPoints
            });
          }
          
          // 获取商品分类
          if (apiPath.includes('/categories') && method === 'GET') {
            return res.json({
              success: true,
              data: demoData.categories
            });
          }
          
          // 获取兑换商品列表
          if (apiPath.includes('/products') && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let products = [...demoData.products];
            // 应用筛选
            if (req.query.category_id) {
              products = products.filter(p => p.category_id == req.query.category_id);
            }
            if (req.query.max_points) {
              products = products.filter(p => p.points_required <= parseInt(req.query.max_points));
            }
            if (req.query.search) {
              const search = req.query.search.toLowerCase();
              products = products.filter(p => 
                p.name.toLowerCase().includes(search) || 
                p.description.toLowerCase().includes(search)
              );
            }
            const total = products.length;
            const paginatedProducts = products.slice(offset, offset + limit);
            return res.json({
              success: true,
              data: paginatedProducts,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
              }
            });
          }
          
          // 获取商品详情
          if (pathOnly.match(/\/products\/\d+$/) && method === 'GET') {
            const productId = parseInt(pathOnly.split('/').pop());
            const product = demoData.products.find(p => p.id === productId);
            
            if (!product) {
              return res.status(404).json({ success: false, error: '商品不存在' });
            }
            
            return res.json({
              success: true,
              data: product
            });
          }
          
          // 获取兑换记录
          if (apiPath.includes('/exchange-records') && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            let records = [...demoData.exchanges];
            
            // 应用筛选
            if (req.query.status) {
              records = records.filter(r => r.status === req.query.status);
            }
            if (req.query.search) {
              const search = req.query.search.toLowerCase();
              records = records.filter(r => 
                r.product_name.toLowerCase().includes(search)
              );
            }
            
            const total = records.length;
            const paginatedRecords = records.slice(offset, offset + limit);
            
            return res.json({
              success: true,
              data: {
                records: paginatedRecords,
                pagination: {
                  page,
                  limit,
                  total,
                  totalPages: Math.ceil(total / limit)
                }
              }
            });
          }
          
          // 获取积分记录
          if (apiPath.includes('/points-records') && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            let records = [...demoData.pointsRecords];
            
            // 应用筛选
            if (req.query.record_type) {
              records = records.filter(r => r.type === req.query.record_type);
            }
            if (req.query.search) {
              const search = req.query.search.toLowerCase();
              records = records.filter(r => 
                r.description.toLowerCase().includes(search)
              );
            }
            
            const total = records.length;
            const paginatedRecords = records.slice(offset, offset + limit);
            
            return res.json({
              success: true,
              data: {
                records: paginatedRecords,
                pagination: {
                  page,
                  limit,
                  total,
                  totalPages: Math.ceil(total / limit)
                }
              }
            });
          }
        }
        
        // 管理员积分兑换相关API
        if (apiPath.startsWith('/api/points-exchange/admin')) {
          // 获取管理员商品列表
          if (apiPath.includes('/products') && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            let products = [...demoData.products];
            // 应用筛选
            if (req.query.category_id) {
              products = products.filter(p => p.category_id == req.query.category_id);
            }
            if (req.query.status) {
              products = products.filter(p => p.status === req.query.status);
            }
            if (req.query.search) {
              const search = req.query.search.toLowerCase();
              products = products.filter(p => 
                p.name.toLowerCase().includes(search) || 
                p.description.toLowerCase().includes(search)
              );
            }
            const total = products.length;
            const paginatedProducts = products.slice(offset, offset + limit);
            return res.json({
              success: true,
              data: paginatedProducts,
              pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
              }
            });
          }
          
          // 获取积分规则
          if (apiPath.includes('/points-rules') && method === 'GET') {
            return res.json({
              success: true,
              data: demoData.pointsRules
            });
          }
          
          // 获取兑换统计
          if (apiPath.includes('/exchange-stats') && method === 'GET') {
            const demoRecords = demoData.exchanges || demoData.exchangeRecords;
            const total = demoRecords.length;
            const pending = demoRecords.filter(e => e.status === 'pending').length;
            const approved = demoRecords.filter(e => e.status === 'approved').length;
            const rejected = demoRecords.filter(e => e.status === 'rejected').length;
            const totalPoints = demoRecords.reduce((sum, r) => sum + (r.points_spent || r.points_used || 0), 0);
            return res.json({
              success: true,
              data: {
                total,
                pending,
                approved,
                rejected,
                totalPoints
              }
            });
          }
          
          // 获取管理员兑换记录
          if (apiPath.includes('/exchange-records') && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            let records = [...demoData.exchanges];
            
            // 应用筛选
            if (req.query.status) {
              records = records.filter(r => r.status === req.query.status);
            }
            if (req.query.user_id) {
              records = records.filter(r => r.user_id == req.query.user_id);
            }
            if (req.query.search) {
              const search = req.query.search.toLowerCase();
              records = records.filter(r => 
                r.product_name.toLowerCase().includes(search) ||
                r.user_name.toLowerCase().includes(search)
              );
            }
            
            const total = records.length;
            const paginatedRecords = records.slice(offset, offset + limit);
            
            return res.json({
              success: true,
              data: {
                records: paginatedRecords,
                pagination: {
                  page,
                  limit,
                  total,
                  totalPages: Math.ceil(total / limit)
                }
              }
            });
          }
        }
        
        // 管理员兑换审核API
        if (apiPath.startsWith('/api/admin/exchange-approval')) {
          // 获取待审核记录
          if (apiPath.includes('/pending') && method === 'GET') {
            const pendingRecords = demoData.approvalRecords.filter(record => record.status === 'pending');
            return res.json({
              success: true,
              data: pendingRecords
            });
          }
          
          // 获取所有审核记录
          if (apiPath.includes('/records') && method === 'GET') {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            
            const records = demoData.approvalRecords.slice(offset, offset + limit);
            const total = demoData.approvalRecords.length;
            
            return res.json({
              success: true,
              data: {
                records,
                pagination: {
                  page,
                  limit,
                  total,
                  totalPages: Math.ceil(total / limit)
                }
              }
            });
          }
        }
        
        // 图表数据API
        if (apiPath.includes('/chart-data')) {
          const type = req.query.type || 'line';
          const timeRange = req.query.timeRange || '30';
          const projectName = req.query.projectName;
          const durationRange = req.query.durationRange;
          const startDate = req.query.startDate;
          const endDate = req.query.endDate;
          
          console.log('图表数据API参数:', { type, timeRange, projectName, durationRange, startDate, endDate });
          
          // 应用筛选条件到演示数据
          let filteredRecords = [...demoData.studyRecords];
          
          // 项目名称筛选
          if (projectName && projectName !== '') {
            filteredRecords = filteredRecords.filter(record => 
              record.project_name === projectName
            );
          }
          
          // 时长范围筛选
          if (durationRange && durationRange !== '') {
            if (durationRange === '120+') {
              filteredRecords = filteredRecords.filter(record => record.duration >= 120);
            } else {
              const [min, max] = durationRange.split('-').map(Number);
              if (max) {
                filteredRecords = filteredRecords.filter(record => 
                  record.duration >= min && record.duration < max
                );
              } else {
                filteredRecords = filteredRecords.filter(record => record.duration >= min);
              }
            }
          }
          
          // 时间范围筛选
          let chartStartDate, chartEndDate;
          if (timeRange === 'custom' && startDate && endDate) {
            chartStartDate = new Date(startDate);
            chartEndDate = new Date(endDate);
          } else {
            const days = parseInt(timeRange) || 30;
            chartEndDate = new Date();
            chartStartDate = new Date(chartEndDate.getTime() - days * 24 * 60 * 60 * 1000);
          }
          
          // 日期范围筛选
          filteredRecords = filteredRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= chartStartDate && recordDate <= chartEndDate;
          });
          
          console.log('图表数据筛选结果:', {
            originalTotal: demoData.studyRecords.length,
            filteredTotal: filteredRecords.length,
            dateRange: { start: chartStartDate.toISOString().split('T')[0], end: chartEndDate.toISOString().split('T')[0] }
          });
          
          if (type === 'line') {
            // 生成时间序列数据
            const chartData = {
              labels: [],
              datasets: [{
                label: '学习时长(分钟)',
                data: [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
              }]
            };
            
            // 按日期分组数据
            const dailyData = {};
            filteredRecords.forEach(record => {
              const date = record.date;
              if (!dailyData[date]) {
                dailyData[date] = 0;
              }
              dailyData[date] += record.duration;
            });
            
            // 生成日期范围内的所有日期
            for (let d = new Date(chartStartDate); d <= chartEndDate; d.setDate(d.getDate() + 1)) {
              const dateStr = d.toISOString().split('T')[0];
              const date = new Date(dateStr);
              const label = `${date.getMonth() + 1}.${date.getDate()}`;
              
              chartData.labels.push(label);
              chartData.datasets[0].data.push(dailyData[dateStr] || 0);
            }
            
            return res.json(chartData);
          } else if (type === 'bar') {
            // 生成柱状图数据
            const chartData = {
              labels: [],
              datasets: []
            };
            
            // 按项目分组数据
            const projectData = {};
            const dates = new Set();
            
            filteredRecords.forEach(record => {
              const date = record.date;
              const project = record.project_name;
              const duration = record.duration;
              
              dates.add(date);
              if (!projectData[project]) {
                projectData[project] = {};
              }
              if (!projectData[project][date]) {
                projectData[project][date] = 0;
              }
              projectData[project][date] += duration;
            });
            
            const sortedDates = Array.from(dates).sort();
            const colors = [
              'rgba(59, 130, 246, 0.8)',
              'rgba(16, 185, 129, 0.8)',
              'rgba(245, 158, 11, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(236, 72, 153, 0.8)',
              'rgba(34, 197, 94, 0.8)',
              'rgba(249, 115, 22, 0.8)'
            ];
            
            chartData.labels = sortedDates.map(d => {
              const date = new Date(d);
              return `${date.getMonth() + 1}.${date.getDate()}`;
            });
            
            Object.keys(projectData).forEach((project, index) => {
              chartData.datasets.push({
                label: project,
                data: sortedDates.map(date => projectData[project][date] || 0),
                backgroundColor: colors[index % colors.length],
                borderColor: colors[index % colors.length].replace('0.8', '1'),
                borderWidth: 1
              });
            });
            
            return res.json(chartData);
          }
        }
        
        // 默认学习记录列表API
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // 应用筛选条件
        let filteredRecords = [...demoData.studyRecords];
        
        // 时间范围筛选
        if (req.query.startDate && req.query.endDate) {
          filteredRecords = filteredRecords.filter(record => {
            const recordDate = record.date;
            return recordDate >= req.query.startDate && recordDate <= req.query.endDate;
          });
        }
        
        // 项目名称筛选
        if (req.query.projectName) {
          filteredRecords = filteredRecords.filter(record => 
            record.project_name === req.query.projectName
          );
        }
        
        // 时长范围筛选
        if (req.query.durationRange) {
          const [min, max] = req.query.durationRange.split('-').map(Number);
          filteredRecords = filteredRecords.filter(record => {
            if (req.query.durationRange === '120+') {
              return record.duration >= 120;
            } else if (max) {
              return record.duration >= min && record.duration <= max;
            } else {
              return record.duration >= min;
            }
          });
        }
        
        const total = filteredRecords.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const records = filteredRecords.slice(offset, offset + limit).map(record => ({
          ...record,
          study_date: record.date, // 确保前端能正确显示日期
          start_time_new: record.start_time, // 确保时间字段正确
          end_time_new: record.end_time, // 确保时间字段正确
          created_at: record.date + 'T10:00:00.000Z',
          updated_at: record.date + 'T10:00:00.000Z'
        }));
        
        console.log('【DEBUG】学习记录API筛选结果:', {
          originalTotal: demoData.studyRecords.length,
          filteredTotal: total,
          page,
          limit,
          totalPages,
          filters: {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            projectName: req.query.projectName,
            durationRange: req.query.durationRange
          }
        });
        
        return res.json({
          success: true,
          sessions: records,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        });
      }

      // 项目管理相关API
      if (apiPath.startsWith('/api/projects') && method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const total = demoData.projects.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const projects = demoData.projects.slice(offset, offset + limit);
        
        console.log('【DEBUG】项目管理API返回:', { 
          page, limit, total, totalPages, offset, 
          projectsLength: projects.length,
          projects: projects.map(p => ({ id: p.id, name: p.name }))
        });
        
        return res.json({
          success: true,
          projects: projects,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        });
      }

      // 仪表板数据API
      if (apiPath.startsWith('/api/dashboard') && method === 'GET') {
        return res.json({
          success: true,
          stats: {
            totalProjects: demoData.projects.length,
            totalStudyTime: demoData.analytics.totalStudyTime,
            totalSessions: demoData.analytics.totalSessions,
            currentStreak: demoData.analytics.currentStreak,
            todayStudyTime: 45,
            todaySessions: 1
          },
          weeklyData: [
            { date: '2025-01-14', time: 120 },
            { date: '2025-01-15', time: 180 },
            { date: '2025-01-16', time: 90 },
            { date: '2025-01-17', time: 150 },
            { date: '2025-01-18', time: 200 },
            { date: '2025-01-19', time: 160 },
            { date: '2025-01-20', time: 140 }
          ],
          recentActivities: demoData.studyRecords.slice(0, 3).map(record => ({
            project_name: record.project_name,
            notes: record.notes,
            duration: record.duration,
            study_date: record.date + ' 14:30:00'
          }))
        });
      }

      // 成就相关API
      if (apiPath.startsWith('/api/achievements') && method === 'GET') {
        return res.json({
          success: true,
          achievements: demoData.achievements,
          total: demoData.achievements.length
        });
      }

      // 积分商城相关API
      if (apiPath.startsWith('/api/points-exchange/products') && method === 'GET') {
        return res.json({
          success: true,
          data: demoData.products,
          total: demoData.products.length
        });
      }

      if (apiPath.startsWith('/api/points-exchange/exchanges') && method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const total = demoData.exchanges.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const exchanges = demoData.exchanges.slice(offset, offset + limit);
        
        return res.json({
          success: true,
          exchanges,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        });
      }

      // 通知相关API
      if (apiPath.startsWith('/api/notifications') && method === 'GET') {
        return res.json({
          success: true,
          notifications: demoData.notifications,
          unreadCount: demoData.notifications.filter(n => !n.is_read).length
        });
      }

      // 分析相关API
      if (apiPath.startsWith('/api/analytics') && method === 'GET') {
        if (apiPath.includes('monthly')) {
          return res.json({
            success: true,
            data: demoData.analytics.monthlyData
          });
        }
        if (apiPath.includes('projects')) {
          return res.json({
            success: true,
            data: demoData.analytics.projectStats
          });
        }
        if (apiPath.includes('distribution')) {
          return res.json({
            success: true,
            data: demoData.analytics.timeDistribution
          });
        }
        return res.json({
          success: true,
          ...demoData.analytics
        });
      }

      // 用户通知设置API - 在demo环境下允许（必须在通用用户API之前）
      if (apiPath.startsWith('/api/users/notification-settings') && method === 'GET') {
        return res.json({
          emailNotifications: true,
          browserNotifications: true,
          studyReminders: true,
          demo: true
        });
      }

      // 处理直接访问 /notification-settings 路径的情况
      if (apiPath === '/notification-settings' && method === 'GET') {
        return res.json({
          emailNotifications: true,
          browserNotifications: true,
          studyReminders: true,
          demo: true
        });
      }

      // 用户相关API
      if (apiPath.startsWith('/api/user') && method === 'GET') {
        return res.json({
          success: true,
          user: demoData.user
        });
      }

      // 系统配置API
      if (apiPath.startsWith('/api/admin/config') && method === 'GET') {
        return res.json({
          systemName: '学习项目追踪系统（演示版）',
          version: '2.0.0',
          demo: true
        });
      }

      // 用户管理相关API
      if (apiPath.startsWith('/api/admin/users') && method === 'GET') {
        return res.json({
          success: true,
          users: [
            { id: 1, username: '演示管理员', email: 'admin@demo.com', role: 'admin', is_active: true, avatar: '/assets/ico/default.svg', created_at: '2025-01-01T00:00:00.000Z' },
            { id: 2, username: '演示用户A', email: 'usera@demo.com', role: 'user', is_active: true, avatar: '/assets/ico/default.svg', created_at: '2025-01-15T00:00:00.000Z' },
            { id: 3, username: '演示用户B', email: 'userb@demo.com', role: 'user', is_active: false, avatar: '/assets/ico/default.svg', created_at: '2025-01-10T00:00:00.000Z' }
          ],
          pagination: { page: 1, limit: 10, total: 3, totalPages: 1 }
        });
      }

      // 用户积分信息API
      if (apiPath.startsWith('/api/admin/users/points') && method === 'GET') {
        return res.json({
          success: true,
          users: [
            {
              id: 1,
              username: 'demo_user1',
              email: 'demo1@example.com',
              role: 'user',
              is_active: true,
              avatar: null,
              total_points: 50000,
              available_points: 48500,
              used_points: 1500,
              last_updated: '2025-01-21T10:00:00.000Z'
            },
            {
              id: 2,
              username: 'demo_user2',
              email: 'demo2@example.com',
              role: 'user',
              is_active: true,
              avatar: null,
              total_points: 35000,
              available_points: 32000,
              used_points: 3000,
              last_updated: '2025-01-21T09:30:00.000Z'
            },
            {
              id: 3,
              username: 'demo_user3',
              email: 'demo3@example.com',
              role: 'user',
              is_active: true,
              avatar: null,
              total_points: 28000,
              available_points: 25000,
              used_points: 3000,
              last_updated: '2025-01-21T08:45:00.000Z'
            },
            {
              id: 4,
              username: 'test_student',
              email: 'student@example.com',
              role: 'user',
              is_active: true,
              avatar: null,
              total_points: 42000,
              available_points: 40000,
              used_points: 2000,
              last_updated: '2025-01-21T11:15:00.000Z'
            },
            {
              id: 5,
              username: 'study_enthusiast',
              email: 'enthusiast@example.com',
              role: 'user',
              is_active: true,
              avatar: null,
              total_points: 65000,
              available_points: 60000,
              used_points: 5000,
              last_updated: '2025-01-21T12:00:00.000Z'
            }
          ],
          total: 5
        });
      }

      // 成就分类API
      if (apiPath.startsWith('/api/admin/achievement-categories') && method === 'GET') {
        return res.json({
          success: true,
          categories: [
            { id: 1, name: '学习', description: '学习相关成就' },
            { id: 2, name: '专注', description: '专注相关成就' },
            { id: 3, name: '效率', description: '效率相关成就' },
            { id: 4, name: '特殊', description: '特殊成就' }
          ]
        });
      }

      // 成就管理API
      if (apiPath.startsWith('/api/admin/achievements') && method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const total = demoData.achievements.length;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const achievements = demoData.achievements.slice(offset, offset + limit);
        
        return res.json({
          success: true,
          achievements,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        });
      }

      // 成就统计API
      if (apiPath.startsWith('/api/admin/achievement-stats') && method === 'GET') {
        return res.json({
          success: true,
          stats: {
            totalAchievements: demoData.achievements.length,
            earnedAchievements: demoData.achievements.filter(a => a.earned_at).length,
            pendingAchievements: demoData.achievements.filter(a => !a.earned_at).length,
            categories: [
              { name: '学习', count: 2 },
              { name: '专注', count: 2 },
              { name: '效率', count: 0 },
              { name: '特殊', count: 0 }
            ]
          }
        });
      }

      // 积分兑换管理API
      if (apiPath.startsWith('/api/points-exchange/admin/categories') && method === 'GET') {
        return res.json({
          success: true,
          categories: [
            { id: 1, name: '功能券', description: '功能相关的兑换券' },
            { id: 2, name: '主题', description: '界面主题相关' },
            { id: 3, name: '报告', description: '学习报告相关' }
          ]
        });
      }

      if (apiPath.startsWith('/api/points-exchange/admin/products') && method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        let products = [...demoData.products];
        // 应用筛选
        if (req.query.category_id) {
          products = products.filter(p => p.category_id == req.query.category_id);
        }
        if (req.query.status) {
          products = products.filter(p => p.status === req.query.status);
        }
        if (req.query.search) {
          const search = req.query.search.toLowerCase();
          products = products.filter(p => 
            p.name.toLowerCase().includes(search) || 
            p.description.toLowerCase().includes(search)
          );
        }
        const total = products.length;
        const paginatedProducts = products.slice(offset, offset + limit);
        return res.json({
          success: true,
          data: paginatedProducts,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });
      }

      if (apiPath.startsWith('/api/points-exchange/admin/points-rules') && method === 'GET') {
        return res.json({
          success: true,
          data: pointsExchangeData.pointsRules
        });
      }

      if (apiPath.startsWith('/api/points-exchange/admin/exchange-stats') && method === 'GET') {
        const demoRecords = demoData.exchanges || demoData.exchangeRecords;
        const total = demoRecords.length;
        const pending = demoRecords.filter(e => e.status === 'pending').length;
        const approved = demoRecords.filter(e => e.status === 'approved').length;
        const rejected = demoRecords.filter(e => e.status === 'rejected').length;
        const totalPoints = demoRecords.reduce((sum, r) => sum + (r.points_spent || r.points_used || 0), 0);
        return res.json({
          success: true,
          data: {
            total,
            pending,
            approved,
            rejected,
            totalPoints
          }
        });
      }

      // 获取商品分类
      if (apiPath.startsWith('/api/points-exchange/categories') && method === 'GET') {
        return res.json({
          success: true,
          data: demoData.categories
        });
      }
      
      // 获取商品详情
      if (apiPath.match(/\/api\/points-exchange\/products\/\d+$/) && method === 'GET') {
        const productId = parseInt(apiPath.split('/').pop());
        const product = demoData.products.find(p => p.id === productId);
        
        if (!product) {
          return res.status(404).json({ success: false, error: '商品不存在' });
        }
        
        return res.json({
          success: true,
          data: product
        });
      }
      
      // 兑换商品
      if (apiPath.startsWith('/api/points-exchange/exchange') && method === 'POST') {
        return res.json({
          success: true,
          message: '兑换申请提交成功'
        });
      }
      
      // 兑换商品（新路径）
      if (apiPath.match(/\/api\/points-exchange\/products\/\d+\/exchange$/) && method === 'POST') {
        const productId = parseInt(apiPath.split('/')[4]);
        const product = demoData.products.find(p => p.id === productId);
        
        if (!product) {
          return res.status(404).json({ success: false, error: '商品不存在' });
        }
        
        // 模拟兑换成功
        const exchangeRecord = {
          id: Date.now(),
          user_id: req.user ? req.user.id : 161,
          product_id: productId,
          product_name: product.name,
          points_spent: product.points_required * (req.body.quantity || 1),
          quantity: req.body.quantity || 1,
          status: product.requires_approval ? 'pending' : 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: product.requires_approval ? null : new Date().toISOString()
        };
        
        // 添加到兑换记录
        if (!demoData.exchangeRecords) {
          demoData.exchangeRecords = [];
        }
        demoData.exchangeRecords.unshift(exchangeRecord);
        
        return res.json({
          success: true,
          data: {
            exchange_id: exchangeRecord.id,
            requires_approval: product.requires_approval,
            quantity: exchangeRecord.quantity,
            total_points: exchangeRecord.points_spent
          }
        });
      }
      
      // 获取用户积分信息
      if (apiPath.startsWith('/api/points-exchange/user-points') && method === 'GET') {
        return res.json({
          success: true,
          data: demoData.userPoints
        });
      }
      
      if (apiPath.startsWith('/api/points-exchange/admin/exchange-records') && method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        let records = [...demoData.approvalRecords];
        
        // 应用筛选
        if (req.query.status) {
          records = records.filter(r => r.status === req.query.status);
        }
        if (req.query.search) {
          const search = req.query.search.toLowerCase();
          records = records.filter(r => 
            r.username.toLowerCase().includes(search) || 
            r.product_name.toLowerCase().includes(search)
          );
        }
        
        const total = records.length;
        const paginatedRecords = records.slice(offset, offset + limit);
        
        return res.json({
          success: true,
          data: {
            records: paginatedRecords,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit)
            }
          }
        });
      }
      
      // 管理员兑换审核统计
      if (apiPath.startsWith('/api/admin/exchange-approval/stats') && method === 'GET') {
        const pendingCount = demoData.approvalRecords.filter(r => r.status === 'pending').length;
        const approvedCount = demoData.approvalRecords.filter(r => r.status === 'approved').length;
        const rejectedCount = demoData.approvalRecords.filter(r => r.status === 'rejected').length;
        const totalPoints = demoData.userPoints.total_points;
        
        return res.json({
          success: true,
          data: {
            pendingCount,
            approvedCount,
            rejectedCount,
            totalPoints
          }
        });
      }
      
      // 管理员兑换审核记录
      if (apiPath.startsWith('/api/admin/exchange-approval/records') && method === 'GET') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        let records = [...demoData.approvalRecords];
        
        // 应用筛选
        if (req.query.status) {
          records = records.filter(r => r.status === req.query.status);
        }
        if (req.query.search) {
          const search = req.query.search.toLowerCase();
          records = records.filter(r => 
            r.username.toLowerCase().includes(search) || 
            r.product_name.toLowerCase().includes(search)
          );
        }
        
        const total = records.length;
        const paginatedRecords = records.slice(offset, offset + limit);
        
        return res.json({
          success: true,
          data: {
            records: paginatedRecords,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit)
            }
          }
        });
      }
      
      // 管理员兑换审核详情
      if (apiPath.match(/\/api\/admin\/exchange-approval\/records\/\d+$/) && method === 'GET') {
        const recordId = parseInt(apiPath.split('/').pop());
        const record = demoData.approvalRecords.find(r => r.id === recordId);
        
        if (!record) {
          return res.status(404).json({ success: false, error: '记录不存在' });
        }
        
        return res.json({
          success: true,
          data: record
        });
      }
      
      // 管理员审核操作
      if (apiPath.match(/\/api\/admin\/exchange-approval\/records\/\d+\/approve$/) && method === 'POST') {
        return res.json({
          success: true,
          message: '审核操作成功'
        });
      }
      
      // 管理员添加/编辑商品
      if (apiPath.startsWith('/api/admin/points-exchange/products') && (method === 'POST' || method === 'PUT')) {
        return res.json({
          success: true,
          message: method === 'POST' ? '商品添加成功' : '商品更新成功'
        });
      }
      
      // 管理员删除商品
      if (apiPath.match(/\/api\/admin\/points-exchange\/products\/\d+$/) && method === 'DELETE') {
        return res.json({
          success: true,
          message: '商品删除成功'
        });
      }
      
      // 管理员积分规则
      if (apiPath.startsWith('/api/admin/points-exchange/rules') && method === 'GET') {
        return res.json({
          success: true,
          data: pointsExchangeData.pointsRules
        });
      }
      
      // 管理员更新积分规则
      if (apiPath.startsWith('/api/admin/points-exchange/rules') && method === 'PUT') {
        return res.json({
          success: true,
          message: '积分规则更新成功'
        });
      }

      // 数据操作日志API
      if (apiPath.startsWith('/api/admin/data/logs') && method === 'GET') {
        return res.json({
          success: true,
          logs: [
            {
              id: 1,
              user_id: 1,
              username: '演示管理员',
              operation_type: '数据导入',
              target_table: 'study_sessions',
              operation_details: '导入Excel文件数据',
              ip_address: '127.0.0.1',
              created_at: '2025-01-20T10:00:00.000Z'
            },
            {
              id: 2,
              user_id: 1,
              username: '演示管理员',
              operation_type: '数据备份',
              target_table: 'all',
              operation_details: '创建数据库备份',
              ip_address: '127.0.0.1',
              created_at: '2025-01-19T15:30:00.000Z'
            }
          ],
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 }
        });
      }

      // SMTP配置相关API
      if (apiPath.startsWith('/api/admin/smtp-config') && method === 'GET') {
        return res.json({
          success: true,
          config: {
            smtp_enabled: false,
            email_verification_enabled: true,
            smtp_provider: 'custom',
            smtp_secure: false,
            smtp_host: 'smtp.demo.com',
            smtp_port: 587,
            smtp_user: 'demo@example.com',
            smtp_pass: 'demo_password',
            smtp_from_name: '学习项目追踪系统',
            smtp_from_email: 'noreply@demo.com',
            verification_code_expire: 10,
            email_rate_limit: 60
          }
        });
      }

      // 仪表板Excel解析API - 支持GET和POST请求
      if (apiPath.startsWith('/api/data/dashboard/parse-excel')) {
        try {
          // 读取实际的Excel文件
          const excelFilePath = path.join(__dirname, '../excel_templates/生成的学习项目记录.xlsx');
          const records = readExcelFile(excelFilePath);
          
          if (!records || records.length === 0) {
            return res.json({
              success: false,
              message: 'Excel文件读取失败或为空',
              fileName: '生成的学习项目记录.xlsx',
              data: [],
              totalRecords: 0,
              importedRecords: 0,
              errors: ['文件读取失败']
            });
          }
          
          // 转换数据格式以匹配前端期望的格式
          const convertedData = records.map(record => ({
            date: record['日期'] || record.date || record.study_date || '2025-01-20',
            projectName: record['学习项目名称'] || record.project_name || record.projectName || '未知项目',
            startTime: record['项目开始时间'] || record.start_time || record.startTime || '09:00',
            endTime: record['项目结束时间'] || record.end_time || record.endTime || '10:00',
            duration: parseInt(record['项目完成时间'] || record.duration || record.time_spent || 60) || 60
          }));
          
          return res.json({
            success: true,
            message: 'Excel文件解析成功（演示模式）',
            fileName: '生成的学习项目记录.xlsx',
            data: convertedData,
            totalRecords: convertedData.length,
            importedRecords: convertedData.length,
            errors: []
          });
        } catch (error) {
          console.error('演示模式Excel解析错误:', error);
          return res.json({
            success: false,
            message: 'Excel文件解析失败',
            fileName: '生成的学习项目记录.xlsx',
            data: [],
            totalRecords: 0,
            importedRecords: 0,
            errors: [error.message]
          });
        }
      }

      // 对于其他GET请求，让它们继续到实际的路由处理
      if (method === 'GET') {
        return next();
      }

      // 对于登录和登出API，让它们继续到实际的路由处理
      if (apiPath.startsWith('/api/auth/login') && method === 'POST') {
        // 只要用户名包含 demo 或 演示 就允许登录
        const { username } = req.body;
        if (username && (username.includes('demo') || username.includes('演示'))) {
          // 生成一个永不过期的token（exp设置为2099年）
          const token = 'demo-token';
          return res.json({
            success: true,
            token,
            user: {
              id: 'demo',
              username: username,
              role: 'demo',
              email: username + '@demo.com',
              avatar: '/assets/ico/default.svg'
            }
          });
        } else {
          return res.status(401).json({ success: false, error: '仅支持演示用户登录' });
        }
      }
      if (apiPath.startsWith('/api/auth/logout')) {
        // 禁止demo用户退出登录
        return res.status(403).json({ success: false, error: '演示模式下不允许退出登录' });
      }

      // 用户资料更新API - 在demo环境下允许
      if (apiPath.startsWith('/api/users/profile') && method === 'PUT') {
        return res.json({
          success: true,
          message: '个人设置保存成功（演示模式）',
          demo: true
        });
      }

      // 用户通知设置API - 在demo环境下允许
      if (apiPath.startsWith('/api/users/notification-settings') && method === 'GET') {
        return res.json({
          emailNotifications: true,
          browserNotifications: true,
          studyReminders: true,
          demo: true
        });
      }

      // 默认返回成功响应
      return res.json({
        success: true,
        message: '演示模式API调用成功',
        demo: true
      });

    } catch (error) {
      console.error('Demo mock中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: '演示模式API调用失败',
        error: error.message
      });
    }
  }

  // 不是demo用户，继续正常流程
  next();
}

module.exports = {
  demoMockMiddleware,
  demoData
}; 