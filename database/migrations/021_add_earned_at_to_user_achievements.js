/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 添加 earned_at 字段到 user_achievements 表...');
  
  // 检查 user_achievements 表是否有 earned_at 字段
  const hasEarnedAtColumn = await knex.schema.hasColumn('user_achievements', 'earned_at');
  
  if (!hasEarnedAtColumn) {
    await knex.schema.alterTable('user_achievements', (table) => {
      table.timestamp('earned_at').nullable().comment('获得成就的时间');
    });
    console.log('✅ 已添加 earned_at 字段到 user_achievements 表');
    
    // 将 completed_at 的值复制到 earned_at（如果 completed_at 不为空）
    await knex.raw(`
      UPDATE user_achievements 
      SET earned_at = completed_at 
      WHERE completed_at IS NOT NULL AND earned_at IS NULL
    `);
    console.log('✅ 已从 completed_at 复制数据到 earned_at');
  } else {
    console.log('ℹ️ earned_at 字段已存在');
  }
  
  console.log('✅ user_achievements.earned_at 字段修复完成');
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔄 回滚 earned_at 字段...');
  
  await knex.schema.alterTable('user_achievements', (table) => {
    table.dropColumn('earned_at');
  });
  
  console.log('✅ 回滚完成');
}; 