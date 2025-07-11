const knex = require('knex');
const config = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];
const db = knex(dbConfig);

// 默认评级标准
const defaultRatingStandards = {
  excellent: 30,    // 优秀：≤30分钟
  good: 60,         // 良：30-60分钟
  average: 90,      // 中：60-90分钟
  poor: 9999        // 差：>90分钟
};

// 根据项目名称智能设置评级标准
function getRatingStandardsByProjectName(projectName) {
  const name = projectName.toLowerCase();
  
  // 数学相关项目 - 更严格的标准
  if (name.includes('数学') || name.includes('math') || name.includes('计算')) {
    return {
      excellent: 30,
      good: 60,
      average: 90,
      poor: 9999
    };
  }
  
  // 语言学习项目 - 中等标准
  if (name.includes('语文') || name.includes('英语') || name.includes('语言') || 
      name.includes('chinese') || name.includes('english') || name.includes('language')) {
    return {
      excellent: 20,
      good: 40,
      average: 60,
      poor: 9999
    };
  }
  
  // 编程/技术项目 - 较宽松标准
  if (name.includes('编程') || name.includes('代码') || name.includes('技术') ||
      name.includes('programming') || name.includes('code') || name.includes('tech')) {
    return {
      excellent: 45,
      good: 90,
      average: 120,
      poor: 9999
    };
  }
  
  // 设计/创意项目 - 较宽松标准
  if (name.includes('设计') || name.includes('创意') || name.includes('艺术') ||
      name.includes('design') || name.includes('creative') || name.includes('art')) {
    return {
      excellent: 45,
      good: 90,
      average: 120,
      poor: 9999
    };
  }
  
  // 商业/管理项目 - 中等标准
  if (name.includes('商业') || name.includes('管理') || name.includes('物流') ||
      name.includes('business') || name.includes('management') || name.includes('logistics')) {
    return {
      excellent: 25,
      good: 50,
      average: 75,
      poor: 9999
    };
  }
  
  // 其他项目使用默认标准
  return defaultRatingStandards;
}

// 根据项目名称智能设置项目类型
function getProjectTypeByProjectName(projectName) {
  const name = projectName.toLowerCase();
  
  if (name.includes('数学') || name.includes('math') || name.includes('计算')) {
    return 'math';
  }
  
  if (name.includes('语文') || name.includes('英语') || name.includes('语言') || 
      name.includes('chinese') || name.includes('english') || name.includes('language')) {
    return 'language';
  }
  
  if (name.includes('编程') || name.includes('代码') || name.includes('技术') ||
      name.includes('programming') || name.includes('code') || name.includes('tech')) {
    return 'programming';
  }
  
  if (name.includes('设计') || name.includes('创意') || name.includes('艺术') ||
      name.includes('design') || name.includes('creative') || name.includes('art')) {
    return 'design';
  }
  
  if (name.includes('商业') || name.includes('管理') || name.includes('物流') ||
      name.includes('business') || name.includes('management') || name.includes('logistics')) {
    return 'business';
  }
  
  return 'custom';
}

async function updateProjectRatingStandards() {
  try {
    console.log('开始更新项目评级标准...');
    
    // 获取所有没有评级标准的项目
    const projects = await db('study_projects')
      .whereNull('rating_standards')
      .select('*');
    
    console.log(`找到 ${projects.length} 个需要更新评级标准的项目`);
    
    if (projects.length === 0) {
      console.log('所有项目都已设置了评级标准');
      return;
    }
    
    // 批量更新项目
    for (const project of projects) {
      const ratingStandards = getRatingStandardsByProjectName(project.name);
      const projectType = getProjectTypeByProjectName(project.name);
      
      console.log(`更新项目 "${project.name}":`);
      console.log(`  评级标准: ${JSON.stringify(ratingStandards)}`);
      console.log(`  项目类型: ${projectType}`);
      
      await db('study_projects')
        .where('id', project.id)
        .update({
          rating_standards: JSON.stringify(ratingStandards),
          project_type: projectType,
          updated_at: new Date()
        });
    }
    
    console.log('✅ 项目评级标准更新完成！');
    
    // 验证更新结果
    const updatedProjects = await db('study_projects')
      .select('id', 'name', 'rating_standards', 'project_type');
    
    console.log('\n更新后的项目列表:');
    updatedProjects.forEach(project => {
      console.log(`- ${project.name} (ID: ${project.id})`);
      console.log(`  评级标准: ${project.rating_standards || '未设置'}`);
      console.log(`  项目类型: ${project.project_type || '未设置'}`);
    });
  } catch (error) {
    console.error('❌ 更新项目评级标准时出错:', error);
  } finally {
    await db.destroy();
  }
}

// 运行脚本
updateProjectRatingStandards();