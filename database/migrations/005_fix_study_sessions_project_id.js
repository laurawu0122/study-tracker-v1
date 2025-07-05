exports.up = function(knex) {
  return knex.schema.alterTable('study_sessions', function(table) {
    // 删除现有的外键约束
    table.dropForeign(['project_id']);
    
    // 修改project_id列为可空
    table.integer('project_id').unsigned().nullable().alter();
    
    // 重新添加外键约束，但允许SET NULL
    table.foreign('project_id').references('id').inTable('study_projects').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('study_sessions', function(table) {
    // 删除外键约束
    table.dropForeign(['project_id']);
    
    // 恢复为不可空
    table.integer('project_id').unsigned().notNullable().alter();
    
    // 重新添加外键约束
    table.foreign('project_id').references('id').inTable('study_projects').onDelete('CASCADE');
  });
}; 