exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // 添加头像字段
    table.string('avatar', 255);
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('avatar');
  });
}; 