exports.up = function(knex) {
  return knex.schema.alterTable('data_operation_logs', function(table) {
    table.integer('target_user_id').nullable(); // 目标用户ID（用于用户相关操作）
    table.index('target_user_id'); // 添加索引
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('data_operation_logs', function(table) {
    table.dropColumn('target_user_id');
  });
}; 