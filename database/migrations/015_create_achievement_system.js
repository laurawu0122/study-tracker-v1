/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. 成就类型表 - 定义成就的大分类
  await knex.schema.createTable('achievement_categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().comment('成就分类名称');
    table.string('description', 500).comment('分类描述');
    table.string('icon', 100).comment('分类图标');
    table.integer('sort_order').defaultTo(0).comment('排序');
    table.boolean('is_active').defaultTo(true).comment('是否启用');
    table.timestamps(true, true);
  });

  // 2. 成就定义表 - 具体的成就配置
  await knex.schema.createTable('achievements', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().references('id').inTable('achievement_categories').onDelete('CASCADE');
    table.string('name', 100).notNullable().comment('成就名称');
    table.string('description', 500).comment('成就描述');
    table.string('icon', 100).comment('成就图标');
    table.string('badge_style', 50).defaultTo('default').comment('徽章样式');
    table.string('trigger_type', 50).notNullable().comment('触发类型: project_completion, consecutive_days, total_hours, efficiency');
    table.json('trigger_conditions').comment('触发条件配置');
    table.integer('required_count').defaultTo(1).comment('需要达到的次数');
    table.integer('level').defaultTo(1).comment('成就等级: 1=铜牌, 2=银牌, 3=金牌, 4=钻石');
    table.integer('points').defaultTo(0).comment('获得积分');
    table.boolean('is_active').defaultTo(true).comment('是否启用');
    table.integer('sort_order').defaultTo(0).comment('排序');
    table.timestamps(true, true);
  });

  // 3. 用户成就表 - 记录用户获得的成就
  await knex.schema.createTable('user_achievements', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('achievement_id').unsigned().references('id').inTable('achievements').onDelete('CASCADE');
    table.integer('current_progress').defaultTo(0).comment('当前进度');
    table.boolean('is_completed').defaultTo(false).comment('是否已完成');
    table.timestamp('completed_at').nullable().comment('完成时间');
    table.json('completion_data').comment('完成时的相关数据');
    table.timestamps(true, true);
    
    // 确保每个用户每个成就只有一条记录
    table.unique(['user_id', 'achievement_id']);
  });

  // 4. 成就进度表 - 实时跟踪用户进度
  await knex.schema.createTable('achievement_progress', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('progress_type', 50).notNullable().comment('进度类型');
    table.string('target_id', 100).comment('目标ID（如项目ID）');
    table.integer('current_value').defaultTo(0).comment('当前值');
    table.integer('target_value').defaultTo(0).comment('目标值');
    table.date('last_updated').comment('最后更新日期');
    table.timestamps(true, true);
    
    // 确保每个用户每种进度类型只有一条记录
    table.unique(['user_id', 'progress_type', 'target_id']);
  });

  // 5. 项目成就配置表 - 每个项目的成就配置
  await knex.schema.createTable('project_achievement_configs', (table) => {
    table.increments('id').primary();
    table.integer('project_id').unsigned().references('id').inTable('study_projects').onDelete('CASCADE');
    table.integer('excellent_duration').defaultTo(60).comment('优秀时长（分钟）');
    table.integer('good_duration').defaultTo(30).comment('良好时长（分钟）');
    table.integer('pass_duration').defaultTo(15).comment('及格时长（分钟）');
    table.boolean('enable_achievements').defaultTo(true).comment('是否启用成就');
    table.timestamps(true, true);
    
    table.unique(['project_id']);
  });

  // 插入默认成就分类
  await knex('achievement_categories').insert([
    {
      name: '学习时长成就',
      description: '基于累计学习时长获得的成就',
      icon: '⏰',
      sort_order: 1
    },
    {
      name: '项目完成成就',
      description: '基于项目完成情况获得的成就',
      icon: '✅',
      sort_order: 2
    },
    {
      name: '连续签到成就',
      description: '基于连续学习天数获得的成就',
      icon: '📅',
      sort_order: 3
    },
    {
      name: '效率成就',
      description: '基于学习效率获得的成就',
      icon: '⚡',
      sort_order: 4
    },
    {
      name: '特殊成就',
      description: '特殊条件和里程碑成就',
      icon: '🏆',
      sort_order: 5
    }
  ]);

  // 插入默认成就定义
  await knex('achievements').insert([
    // 学习时长成就
    {
      category_id: 1,
      name: '学习新手',
      description: '累计学习时长达到1小时',
      icon: '🥉',
      trigger_type: 'total_hours',
      trigger_conditions: JSON.stringify({ hours: 1 }),
      required_count: 1,
      level: 1,
      points: 10
    },
    {
      category_id: 1,
      name: '学习达人',
      description: '累计学习时长达到10小时',
      icon: '🥈',
      trigger_type: 'total_hours',
      trigger_conditions: JSON.stringify({ hours: 10 }),
      required_count: 1,
      level: 2,
      points: 50
    },
    {
      category_id: 1,
      name: '学习大师',
      description: '累计学习时长达到100小时',
      icon: '🥇',
      trigger_type: 'total_hours',
      trigger_conditions: JSON.stringify({ hours: 100 }),
      required_count: 1,
      level: 3,
      points: 200
    },
    // 连续签到成就
    {
      category_id: 3,
      name: '坚持一周',
      description: '连续学习7天',
      icon: '📅',
      trigger_type: 'consecutive_days',
      trigger_conditions: JSON.stringify({ days: 7 }),
      required_count: 1,
      level: 1,
      points: 20
    },
    {
      category_id: 3,
      name: '坚持一月',
      description: '连续学习30天',
      icon: '📅',
      trigger_type: 'consecutive_days',
      trigger_conditions: JSON.stringify({ days: 30 }),
      required_count: 1,
      level: 2,
      points: 100
    },
    // 项目完成成就
    {
      category_id: 2,
      name: '项目完成者',
      description: '完成第一个项目',
      icon: '✅',
      trigger_type: 'project_completion',
      trigger_conditions: JSON.stringify({ count: 1 }),
      required_count: 1,
      level: 1,
      points: 30
    },
    {
      category_id: 2,
      name: '项目专家',
      description: '完成10个项目',
      icon: '✅',
      trigger_type: 'project_completion',
      trigger_conditions: JSON.stringify({ count: 10 }),
      required_count: 1,
      level: 2,
      points: 150
    }
  ]);
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('achievement_progress');
  await knex.schema.dropTableIfExists('project_achievement_configs');
  await knex.schema.dropTableIfExists('achievements');
  await knex.schema.dropTableIfExists('achievement_categories');
}; 