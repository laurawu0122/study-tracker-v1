exports.up = function(knex) {
  return knex.schema.createTable('notifications', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable().defaultTo('info'); // urgent, upcoming, info, success, warning
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.json('data').nullable(); // 存储额外数据
    table.boolean('read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // 索引
    table.index(['user_id', 'read']);
    table.index(['user_id', 'type']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('notifications');
}; 