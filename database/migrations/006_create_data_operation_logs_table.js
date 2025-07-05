exports.up = function(knex) {
  return knex.schema.createTable('data_operation_logs', function(table) {
    table.increments('id').primary();
    table.string('operation_type', 50).notNull(); // backup, reset, clean, import, export
    table.string('operation_name', 100).notNull(); // 操作名称
    table.text('description').nullable(); // 操作描述
    table.integer('user_id').notNull(); // 执行操作的用户ID
    table.string('user_username', 100).notNull(); // 执行操作的用户名
    table.json('details').nullable(); // 操作详情（JSON格式）
    table.string('status', 20).defaultTo('success'); // success, failed, partial
    table.text('error_message').nullable(); // 错误信息
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // 索引
    table.index('operation_type');
    table.index('user_id');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('data_operation_logs');
}; 