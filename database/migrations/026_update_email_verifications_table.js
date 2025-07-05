/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('email_verifications', function(table) {
    // 添加user_id字段
    table.integer('user_id').unsigned().nullable().after('id');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // 添加type字段
    table.string('type', 50).defaultTo('registration').after('verification_code');
    
    // 将is_used重命名为used
    table.renameColumn('is_used', 'used');
    
    // 添加索引
    table.index(['user_id', 'type']);
    table.index(['user_id', 'verification_code', 'type']);
  });
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('email_verifications', function(table) {
    // 删除索引
    table.dropIndex(['user_id', 'type']);
    table.dropIndex(['user_id', 'verification_code', 'type']);
    
    // 重命名used为is_used
    table.renameColumn('used', 'is_used');
    
    // 删除type字段
    table.dropColumn('type');
    
    // 删除user_id字段
    table.dropForeign(['user_id']);
    table.dropColumn('user_id');
  });
}; 