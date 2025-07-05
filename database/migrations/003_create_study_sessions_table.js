exports.up = function(knex) {
  return knex.schema.createTable('study_sessions', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('project_id').unsigned().nullable();
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').nullable();
    table.decimal('duration_hours', 8, 2).nullable();
    table.text('notes').nullable();
    table.string('location', 255).nullable();
    table.integer('productivity_rating').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign keys
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('project_id').references('id').inTable('study_projects').onDelete('SET NULL');
    
    // Indexes
    table.index(['user_id']);
    table.index(['project_id']);
    table.index(['start_time']);
    table.index(['end_time']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('study_sessions');
}; 