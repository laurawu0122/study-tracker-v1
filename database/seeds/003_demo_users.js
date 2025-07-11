const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // 检查是否已经存在demo用户
  const existingDemoUsers = await knex('users').whereIn('username', ['demo_user1', 'demo_user2', 'demo_user3', 'test_student', 'study_enthusiast']).first();
  
  if (existingDemoUsers) {
    console.log('✅ Demo用户已存在，跳过创建');
    return;
  }
  
  // 创建demo用户的密码哈希
  const demoPassword = 'Demo123!';
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  
  // Demo用户数据
  const demoUsers = [
    {
      username: 'demo_user1',
      email: 'demo1@study-tracker.com',
      password_hash: passwordHash,
      role: 'user',
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date('2024-01-15'),
      updated_at: new Date(),
      last_login_at: new Date('2024-12-20 14:30:00')
    },
    {
      username: 'demo_user2',
      email: 'demo2@study-tracker.com',
      password_hash: passwordHash,
      role: 'user',
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date('2024-02-20'),
      updated_at: new Date(),
      last_login_at: new Date('2024-12-19 09:15:00')
    },
    {
      username: 'demo_user3',
      email: 'demo3@study-tracker.com',
      password_hash: passwordHash,
      role: 'user',
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date('2024-03-10'),
      updated_at: new Date(),
      last_login_at: new Date('2024-12-18 16:45:00')
    },
    {
      username: 'test_student',
      email: 'student@study-tracker.com',
      password_hash: passwordHash,
      role: 'user',
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date('2024-04-05'),
      updated_at: new Date(),
      last_login_at: new Date('2024-12-21 11:20:00')
    },
    {
      username: 'study_enthusiast',
      email: 'enthusiast@study-tracker.com',
      password_hash: passwordHash,
      role: 'user',
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date('2024-05-12'),
      updated_at: new Date(),
      last_login_at: new Date('2024-12-20 20:10:00')
    }
  ];
  
  // 插入demo用户
  const userIds = await knex('users').insert(demoUsers).returning('id');
  
  console.log(`✅ 创建 ${userIds.length} 个demo用户成功`);
  
  // 为每个demo用户创建积分记录
  const pointsRecords = userIds.map((userId, index) => ({
    user_id: userId,
    total_points: [1500, 2300, 800, 3200, 1800][index], // 不同的积分数量
    available_points: [1200, 1800, 600, 2500, 1400][index],
    used_points: [300, 500, 200, 700, 400][index],
    last_updated: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  }));
  
  await knex('user_points').insert(pointsRecords);
  
  console.log('✅ 为demo用户创建积分记录成功');
  
  // 为demo用户创建一些学习项目记录
  const projects = [];
  const projectNames = [
    'JavaScript基础学习',
    'React框架入门',
    'Node.js后端开发',
    '数据库设计原理',
    '算法与数据结构',
    'Web安全基础',
    '移动端开发',
    '云计算技术'
  ];
  
  userIds.forEach((userId, userIndex) => {
    // 每个用户创建2-3个项目
    const userProjectCount = [2, 3, 2, 3, 2][userIndex];
    for (let i = 0; i < userProjectCount; i++) {
      projects.push({
        user_id: userId,
        name: projectNames[(userIndex * 3 + i) % projectNames.length],
        description: `这是用户 ${demoUsers[userIndex].username} 的学习项目`,
        status: ['in_progress', 'completed', 'planned'][Math.floor(Math.random() * 3)],
        created_at: new Date(`2024-${String(6 + i).padStart(2, '0')}-${String(10 + i).padStart(2, '0')}`),
        updated_at: new Date()
      });
    }
  });
  
  await knex('study_projects').insert(projects);
  
  console.log('✅ 为demo用户创建学习项目记录成功');
  
  // 为demo用户创建一些学习会话记录
  const sessions = [];
  
  userIds.forEach((userId, userIndex) => {
    // 每个用户创建3-5个学习会话
    const sessionCount = [3, 4, 3, 5, 4][userIndex];
    for (let i = 0; i < sessionCount; i++) {
      const sessionDate = new Date(`2024-12-${String(15 + i).padStart(2, '0')}`);
      const duration = [45, 60, 90, 30, 75][i % 5]; // 不同的学习时长
      
      sessions.push({
        user_id: userId,
        project_id: null, // 暂时不关联具体项目
        study_date: sessionDate,
        start_time: new Date(sessionDate.getTime() + (9 + i) * 3600000), // 9点开始，每小时递增
        end_time: new Date(sessionDate.getTime() + (9 + i) * 3600000 + duration * 60000),
        duration_minutes: duration,
        notes: `这是第${i + 1}次学习会话，持续了${duration}分钟`,
        created_at: sessionDate,
        updated_at: sessionDate
      });
    }
  });
  
  await knex('study_sessions').insert(sessions);
  
  console.log('✅ 为demo用户创建学习会话记录成功');
  
  console.log('🎉 Demo环境数据创建完成！');
  console.log('📝 Demo用户登录信息：');
  console.log('   用户名: demo_user1, demo_user2, demo_user3, test_student, study_enthusiast');
  console.log('   密码: Demo123!');
}; 