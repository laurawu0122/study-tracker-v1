/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('🔧 添加成就图标字段...');
  
  // 检查 achievements 表是否有 icon 字段
  const hasIconColumn = await knex.schema.hasColumn('achievements', 'icon');
  
  if (!hasIconColumn) {
    await knex.schema.alterTable('achievements', (table) => {
      table.string('icon', 200).comment('成就图标');
    });
    console.log('✅ 已添加 icon 字段到 achievements 表');
  } else {
    console.log('ℹ️ icon 字段已存在');
  }
  
  // 检查 achievement_categories 表是否有 icon 字段
  const hasCategoryIconColumn = await knex.schema.hasColumn('achievement_categories', 'icon');
  
  if (!hasCategoryIconColumn) {
    await knex.schema.alterTable('achievement_categories', (table) => {
      table.string('icon', 100).comment('分类图标');
    });
    console.log('✅ 已添加 icon 字段到 achievement_categories 表');
  } else {
    console.log('ℹ️ achievement_categories.icon 字段已存在');
  }
  
  // 更新现有成就的图标
  console.log('📝 更新成就图标...');
  await knex.raw(`
    UPDATE achievements 
    SET icon = CASE 
      WHEN name LIKE '%学习时长%' THEN '/assets/ico/time-master.svg'
      WHEN name LIKE '%连续学习%' THEN '/assets/ico/streak-7.svg'
      WHEN name LIKE '%项目完成%' THEN '/assets/ico/project-complete.svg'
      WHEN name LIKE '%知识之星%' THEN '/assets/ico/knowledge-star.svg'
      WHEN name LIKE '%学习专家%' THEN '/assets/ico/study-expert.svg'
      WHEN name LIKE '%学习冠军%' THEN '/assets/ico/study-champion.svg'
      WHEN name LIKE '%首次学习%' THEN '/assets/ico/first-study.svg'
      WHEN name LIKE '%社区活跃%' THEN '/assets/ico/community-active.svg'
      WHEN name LIKE '%节日特别%' THEN '/assets/ico/holiday-special.svg'
      ELSE '/assets/ico/study-expert.svg'
    END
    WHERE icon IS NULL OR icon = ''
  `);
  
  // 更新分类图标
  await knex.raw(`
    UPDATE achievement_categories 
    SET icon = CASE 
      WHEN name = '学习时长' THEN 'fa-solid fa-clock'
      WHEN name = '连续学习' THEN 'fa-solid fa-fire'
      WHEN name = '项目完成' THEN 'fa-solid fa-check-circle'
      WHEN name = '知识积累' THEN 'fa-solid fa-star'
      WHEN name = '学习效率' THEN 'fa-solid fa-chart-line'
      ELSE 'fa-solid fa-trophy'
    END
    WHERE icon IS NULL OR icon = ''
  `);
  
  console.log('✅ 成就图标字段修复完成');
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('🔄 回滚成就图标字段...');
  
  await knex.schema.alterTable('achievements', (table) => {
    table.dropColumn('icon');
  });
  
  await knex.schema.alterTable('achievement_categories', (table) => {
    table.dropColumn('icon');
  });
  
  console.log('✅ 回滚完成');
};
