/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 修改 start_time 和 end_time 字段长度，从 varchar(5) 改为 varchar(8)
  // 以支持 HH:MM:SS 格式的时间
  await knex.schema.alterTable('study_records', function(table) {
    table.string('start_time', 8).alter(); // 支持 HH:MM:SS 格式
    table.string('end_time', 8).alter(); // 支持 HH:MM:SS 格式
  });
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // 回滚到原来的 varchar(5) 格式
  await knex.schema.alterTable('study_records', function(table) {
    table.string('start_time', 5).alter(); // 回滚到 HH:MM 格式
    table.string('end_time', 5).alter(); // 回滚到 HH:MM 格式
  });
}; 