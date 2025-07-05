exports.up = function(knex) {
  return knex.schema.createTable('notification_settings', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('project_reminders').defaultTo(true); // 项目提醒
    table.boolean('progress_reminders').defaultTo(true); // 进度提醒
    table.boolean('study_goals').defaultTo(true); // 学习目标提醒
    table.boolean('weekly_reports').defaultTo(true); // 周报提醒
    table.boolean('email_notifications').defaultTo(false); // 邮件通知
    table.boolean('browser_notifications').defaultTo(true); // 浏览器通知
    table.time('daily_reminder_time').defaultTo('09:00'); // 每日提醒时间
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notification_settings');
}; 