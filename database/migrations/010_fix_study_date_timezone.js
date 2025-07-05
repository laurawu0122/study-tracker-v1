/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // PostgreSQL版本 - 更新日期格式
  return knex.raw(`
    UPDATE study_sessions
    SET study_date = date(study_date)
    WHERE study_date IS NOT NULL;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // 无需回滚
  return Promise.resolve();
}; 