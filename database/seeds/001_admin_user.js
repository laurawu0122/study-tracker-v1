const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // 检查admin用户是否已存在
  const existingAdmin = await knex('users').where('username', 'admin').first();
  
  if (existingAdmin) {
    console.log('✅ Admin用户已存在，跳过创建');
    return;
  }
  
  // 只在admin用户不存在时创建
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  
  const [adminId] = await knex('users').insert([
    {
      username: 'admin',
      email: 'admin@study-tracker.com',
      password_hash: passwordHash,
      role: 'admin',
      is_active: true,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]).returning('id');
  
  console.log(`✅ 创建admin用户成功，ID: ${adminId}`);
  
  // 为admin用户创建积分记录
  await knex('user_points').insert({
    user_id: adminId,
    total_points: 100000,
    available_points: 100000,
    used_points: 0,
    last_updated: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  });
  
  console.log('✅ 为admin用户创建积分记录成功');
}; 