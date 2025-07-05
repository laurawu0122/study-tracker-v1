/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('study_sessions', function(table) {
    // 添加新字段
    table.date('study_date').comment('学习日期');
    table.string('project_name', 100).comment('学习项目名称');
    table.time('start_time_new').comment('开始时间（新格式）');
    table.time('end_time_new').comment('结束时间（新格式）');
    table.integer('duration').comment('学习时长（分钟）');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('study_sessions', function(table) {
    // 删除新添加的字段
    table.dropColumn('study_date');
    table.dropColumn('project_name');
    table.dropColumn('start_time_new');
    table.dropColumn('end_time_new');
    table.dropColumn('duration');
  });
}; 