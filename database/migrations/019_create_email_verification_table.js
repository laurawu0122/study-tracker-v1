/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('email_verifications', function(table) {
    table.increments('id').primary();
    table.string('email', 255).notNullable().index();
    table.string('verification_code', 10).notNullable();
    table.boolean('is_used').defaultTo(false).notNullable();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('used_at').nullable();
    
    // 索引
    table.index(['email', 'is_used']);
    table.index(['expires_at']);
  });
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('email_verifications');
}; 