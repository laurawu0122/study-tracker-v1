exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // 添加通知设置字段
    table.boolean('email_notifications').defaultTo(true).notNullable();
    table.boolean('browser_notifications').defaultTo(true).notNullable();
    table.boolean('study_reminders').defaultTo(true).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    // 移除通知设置字段
    table.dropColumn('email_notifications');
    table.dropColumn('browser_notifications');
    table.dropColumn('study_reminders');
  });
}; 