exports.up = function(knex) {
  return knex.schema.createTable('study_projects', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.date('start_date').notNullable();
    table.date('completion_date').nullable();
    table.decimal('estimated_hours', 8, 2).nullable();
    table.decimal('actual_hours', 8, 2).nullable();
    table.integer('difficulty_level').unsigned().defaultTo(3).notNullable();
    table.string('status', 20).defaultTo('in_progress').notNullable();
    table.string('category', 100).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes
    table.index(['user_id']);
    table.index(['status']);
    table.index(['category']);
    table.index(['start_date']);
    table.index(['completion_date']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('study_projects');
}; 