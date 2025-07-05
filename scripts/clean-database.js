const { db } = require('../database/db');

async function cleanDatabase() {
  try {
    console.log('🔧 开始清理数据库...');
    
    // 获取所有表名
    const tables = await db.raw(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    console.log('📋 发现以下表:', tables.rows.map(row => row.tablename));
    
    // 禁用外键约束检查
    await db.raw('SET session_replication_role = replica;');
    
    // 删除所有表（按依赖关系顺序）
    const dropOrder = [
      'exchange_records',
      'user_exchange_stats', 
      'points_records',
      'user_points',
      'virtual_products',
      'product_categories',
      'points_rules',
      'user_achievements',
      'achievements',
      'notifications',
      'notification_settings',
      'study_records',
      'study_sessions',
      'study_projects',
      'email_verifications',
      'data_operation_logs',
      'system_config',
      'users',
      'knex_migrations',
      'knex_migrations_lock'
    ];
    
    for (const tableName of dropOrder) {
      try {
        await db.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
        console.log(`✅ 删除表: ${tableName}`);
      } catch (error) {
        console.log(`⚠️  删除表 ${tableName} 时出错:`, error.message);
      }
    }
    
    // 重新启用外键约束检查
    await db.raw('SET session_replication_role = DEFAULT;');
    
    console.log('✅ 数据库清理完成！');
    
  } catch (error) {
    console.error('❌ 清理数据库失败:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanDatabase()
    .then(() => {
      console.log('🎉 数据库清理成功！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 数据库清理失败:', error);
      process.exit(1);
    });
}

module.exports = cleanDatabase; 