/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 检查是否已存在quantity字段
  const hasQuantity = await knex.schema.hasColumn('exchange_records', 'quantity');
  
  if (!hasQuantity) {
    await knex.schema.alterTable('exchange_records', (table) => {
      table.integer('quantity').defaultTo(1).comment('兑换数量');
    });
    
    console.log('✅ 已为exchange_records表添加quantity字段');
  } else {
    console.log('ℹ️ quantity字段已存在，跳过添加');
  }
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasQuantity = await knex.schema.hasColumn('exchange_records', 'quantity');
  
  if (hasQuantity) {
    await knex.schema.alterTable('exchange_records', (table) => {
      table.dropColumn('quantity');
    });
    
    console.log('✅ 已从exchange_records表移除quantity字段');
  }
}; 