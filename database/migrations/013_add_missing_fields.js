exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // 添加一些可能缺失的字段
    if (!knex.schema.hasColumn('users', 'last_login_at')) {
      table.timestamp('last_login_at');
    }
    if (!knex.schema.hasColumn('users', 'is_active')) {
      table.boolean('is_active').defaultTo(true);
    }
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    // 只在字段存在时才尝试删除
    table.dropColumn('last_login_at');
    table.dropColumn('is_active');
  });
}; 