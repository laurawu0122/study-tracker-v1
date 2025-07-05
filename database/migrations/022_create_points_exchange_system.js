/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. 积分规则表 - 定义如何根据学习记录获得积分
  await knex.schema.createTable('points_rules', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().comment('规则名称');
    table.string('description', 500).comment('规则描述');
    table.string('trigger_type', 50).notNullable().comment('触发类型: study_duration, project_completion, consecutive_days, efficiency_score');
    table.json('conditions').notNullable().comment('触发条件配置');
    table.integer('points').notNullable().defaultTo(0).comment('获得积分');
    table.boolean('is_active').defaultTo(true).comment('是否启用');
    table.integer('sort_order').defaultTo(0).comment('排序');
    table.timestamps(true, true);
  });

  // 2. 商品分类表
  await knex.schema.createTable('product_categories', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().comment('分类名称');
    table.string('description', 500).comment('分类描述');
    table.string('icon', 100).comment('分类图标');
    table.boolean('is_active').defaultTo(true).comment('是否启用');
    table.integer('sort_order').defaultTo(0).comment('排序');
    table.timestamps(true, true);
  });

  // 3. 虚拟商品表
  await knex.schema.createTable('virtual_products', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().references('id').inTable('product_categories').onDelete('SET NULL');
    table.string('name', 100).notNullable().comment('商品名称');
    table.text('description').comment('商品描述');
    table.string('image_url', 500).comment('商品图片URL');
    table.integer('points_required').notNullable().comment('所需积分');
    table.integer('stock_quantity').defaultTo(-1).comment('库存数量，-1表示无限');
    table.integer('exchange_limit_per_user').defaultTo(1).comment('每个用户兑换限制');
    table.boolean('is_active').defaultTo(true).comment('是否启用');
    table.boolean('requires_approval').defaultTo(false).comment('是否需要审核');
    table.integer('sort_order').defaultTo(0).comment('排序');
    table.timestamps(true, true);
  });

  // 4. 用户积分表
  await knex.schema.createTable('user_points', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('total_points').defaultTo(0).comment('总积分');
    table.integer('available_points').defaultTo(0).comment('可用积分');
    table.integer('used_points').defaultTo(0).comment('已使用积分');
    table.timestamp('last_updated').defaultTo(knex.fn.now()).comment('最后更新时间');
    table.timestamps(true, true);
    
    table.unique(['user_id']);
  });

  // 5. 积分记录表
  await knex.schema.createTable('points_records', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('points_rule_id').unsigned().references('id').inTable('points_rules').onDelete('SET NULL');
    table.string('record_type', 50).notNullable().comment('记录类型: earned, used, expired, bonus');
    table.integer('points_change').notNullable().comment('积分变化');
    table.integer('balance_after').notNullable().comment('变化后余额');
    table.string('description', 500).comment('记录描述');
    table.json('related_data').comment('相关数据');
    table.timestamps(true, true);
  });

  // 6. 兑换记录表
  await knex.schema.createTable('exchange_records', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('product_id').unsigned().references('id').inTable('virtual_products').onDelete('CASCADE');
    table.integer('points_spent').notNullable().comment('消耗积分');
    table.string('status', 50).defaultTo('pending').comment('状态: pending, approved, rejected, completed');
    table.text('admin_notes').comment('管理员备注');
    table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at').nullable().comment('审核时间');
    table.timestamp('completed_at').nullable().comment('完成时间');
    table.timestamps(true, true);
  });

  // 7. 用户兑换统计表
  await knex.schema.createTable('user_exchange_stats', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('product_id').unsigned().references('id').inTable('virtual_products').onDelete('CASCADE');
    table.integer('exchange_count').defaultTo(0).comment('兑换次数');
    table.integer('total_points_spent').defaultTo(0).comment('总消耗积分');
    table.timestamp('last_exchange_at').nullable().comment('最后兑换时间');
    table.timestamps(true, true);
    
    table.unique(['user_id', 'product_id']);
  });

  // 插入默认积分规则
  await knex('points_rules').insert([
    {
      name: '学习时长奖励',
      description: '每学习1小时获得10积分',
      trigger_type: 'study_duration',
      conditions: JSON.stringify({
        duration_minutes: 60,
        points_per_hour: 10
      }),
      points: 10,
      sort_order: 1
    },
    {
      name: '项目完成奖励',
      description: '完成一个项目获得50积分',
      trigger_type: 'project_completion',
      conditions: JSON.stringify({
        points_per_project: 50
      }),
      points: 50,
      sort_order: 2
    },
    {
      name: '连续学习奖励',
      description: '连续学习7天获得30积分',
      trigger_type: 'consecutive_days',
      conditions: JSON.stringify({
        days_required: 7,
        points_per_streak: 30
      }),
      points: 30,
      sort_order: 3
    },
    {
      name: '效率奖励',
      description: '学习效率达到80%以上获得20积分',
      trigger_type: 'efficiency_score',
      conditions: JSON.stringify({
        min_efficiency: 80,
        points_per_session: 20
      }),
      points: 20,
      sort_order: 4
    }
  ]);

  // 插入默认商品分类
  await knex('product_categories').insert([
    {
      name: '学习工具',
      description: '提升学习效率的虚拟工具',
      icon: '🛠️',
      sort_order: 1
    },
    {
      name: '成就徽章',
      description: '特殊的成就徽章和装饰',
      icon: '🏆',
      sort_order: 2
    },
    {
      name: '特权功能',
      description: '解锁特殊功能和使用权限',
      icon: '⭐',
      sort_order: 3
    },
    {
      name: '纪念品',
      description: '学习历程纪念品',
      icon: '🎁',
      sort_order: 4
    }
  ]);

  // 插入默认虚拟商品
  await knex('virtual_products').insert([
    {
      category_id: 1,
      name: '专注模式',
      description: '解锁专注模式，屏蔽干扰，提升学习效率',
      image_url: '/assets/ico/focus-mode.svg',
      points_required: 100,
      stock_quantity: -1,
      exchange_limit_per_user: 1,
      requires_approval: false
    },
    {
      category_id: 1,
      name: '学习报告',
      description: '获得详细的学习分析报告',
      image_url: '/assets/ico/analytics-report.svg',
      points_required: 50,
      stock_quantity: -1,
      exchange_limit_per_user: 5,
      requires_approval: false
    },
    {
      category_id: 2,
      name: '黄金徽章',
      description: '获得特殊的黄金成就徽章',
      image_url: '/assets/ico/gold-badge.svg',
      points_required: 200,
      stock_quantity: 100,
      exchange_limit_per_user: 1,
      requires_approval: true
    },
    {
      category_id: 3,
      name: '高级主题',
      description: '解锁高级界面主题',
      image_url: '/assets/ico/premium-theme.svg',
      points_required: 150,
      stock_quantity: -1,
      exchange_limit_per_user: 1,
      requires_approval: false
    },
    {
      category_id: 4,
      name: '学习证书',
      description: '获得学习成就证书',
      image_url: '/assets/ico/certificate.svg',
      points_required: 300,
      stock_quantity: -1,
      exchange_limit_per_user: 1,
      requires_approval: true
    }
  ]);
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_exchange_stats');
  await knex.schema.dropTableIfExists('exchange_records');
  await knex.schema.dropTableIfExists('points_records');
  await knex.schema.dropTableIfExists('user_points');
  await knex.schema.dropTableIfExists('virtual_products');
  await knex.schema.dropTableIfExists('product_categories');
  await knex.schema.dropTableIfExists('points_rules');
}; 