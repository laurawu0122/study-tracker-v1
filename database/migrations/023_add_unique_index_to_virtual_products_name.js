exports.up = function(knex) {
  return knex.schema.alterTable('virtual_products', function(table) {
    table.unique('name', 'virtual_products_name_unique');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('virtual_products', function(table) {
    table.dropUnique('name', 'virtual_products_name_unique');
  });
}; 