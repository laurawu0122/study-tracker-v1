exports.up = function(knex) {
  return knex.schema.alterTable('study_projects', function(table) {
    // 添加评级标准字段
    table.json('rating_standards').nullable().comment('项目评级标准');
    table.string('project_type', 50).nullable().comment('项目类型：math/english/custom');
    
    // 添加索引
    table.index(['project_type']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('study_projects', function(table) {
    table.dropColumn('rating_standards');
    table.dropColumn('project_type');
  });
}; 