exports.up = function(knex) {
  return knex.schema.createTable('study_records', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.date('date').notNullable();
    table.string('project_name', 255).notNullable();
    table.string('start_time', 5).notNullable(); // HH:MM format
    table.string('end_time', 5).notNullable(); // HH:MM format
    table.integer('duration').unsigned().notNullable(); // minutes
    table.text('notes').nullable();
    table.string('category', 100).nullable();
    table.string('difficulty', 50).nullable();
    table.string('status', 50).defaultTo('completed').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Indexes
    table.index(['user_id']);
    table.index(['date']);
    table.index(['project_name']);
    table.index(['category']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('study_records');
}; 