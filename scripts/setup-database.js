const { Client } = require('pg');
const knex = require('knex');
const config = require('../knexfile');

async function setupDatabase() {
  console.log('🔧 开始设置PostgreSQL数据库...');
  
  const environment = process.env.NODE_ENV || 'development';
  const dbConfig = config[environment];
  
  // 连接到PostgreSQL服务器（不指定数据库）
  const client = new Client({
    host: dbConfig.connection.host,
    port: dbConfig.connection.port,
    user: dbConfig.connection.user,
    password: dbConfig.connection.password,
    database: 'postgres' // 连接到默认数据库
  });
  
  try {
    await client.connect();
    console.log('✅ 连接到PostgreSQL服务器成功');
    
    // 检查数据库是否存在
    const dbName = dbConfig.connection.database;
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    
    if (result.rows.length === 0) {
      console.log(`📝 创建数据库: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ 数据库 ${dbName} 创建成功`);
    } else {
      console.log(`✅ 数据库 ${dbName} 已存在`);
    }
    
  } catch (error) {
    console.error('❌ 数据库设置失败:', error.message);
    throw error;
  } finally {
    await client.end();
  }
  
  // 运行迁移
  console.log('🔄 运行数据库迁移...');
  const db = knex(dbConfig);
  
  try {
    await db.migrate.latest();
    console.log('✅ 数据库迁移完成');
    
    // 运行种子数据
    console.log('🌱 运行种子数据...');
    await db.seed.run();
    console.log('✅ 种子数据完成');
    
  } catch (error) {
    console.error('❌ 迁移或种子数据失败:', error.message);
    throw error;
  } finally {
    await db.destroy();
  }
  
  console.log('🎉 数据库设置完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ 数据库设置成功！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 数据库设置失败:', error);
      process.exit(1);
    });
}

module.exports = setupDatabase; 