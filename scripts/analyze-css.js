#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function analyzeCSS() {
  const cssPath = path.join(__dirname, '../assets/css/tailwind.css');
  
  if (!fs.existsSync(cssPath)) {
    console.log('❌ CSS文件不存在，请先运行 npm run build:css');
    return;
  }
  
  const stats = fs.statSync(cssPath);
  const content = fs.readFileSync(cssPath, 'utf8');
  
  // 计算文件大小
  const size = stats.size;
  const gzippedSize = require('zlib').gzipSync(content).length;
  
  // 分析CSS规则
  const lines = content.split('\n');
  const rules = lines.filter(line => line.includes('{') && line.includes('}')).length;
  const selectors = content.match(/[^{}]+{/g)?.length || 0;
  
  // 分析Tailwind类使用情况
  const tailwindClasses = content.match(/\.([a-zA-Z0-9_-]+)/g) || [];
  const uniqueClasses = [...new Set(tailwindClasses)];
  
  console.log('📊 CSS文件分析报告');
  console.log('='.repeat(50));
  console.log(`📁 文件路径: ${cssPath}`);
  console.log(`📏 文件大小: ${formatBytes(size)}`);
  console.log(`🗜️  Gzip大小: ${formatBytes(gzippedSize)}`);
  console.log(`📈 压缩率: ${((1 - gzippedSize / size) * 100).toFixed(1)}%`);
  console.log(`📋 CSS规则数: ${rules}`);
  console.log(`🎯 选择器数: ${selectors}`);
  console.log(`🏷️  Tailwind类数: ${uniqueClasses.length}`);
  console.log('');
  
  // 分析最大的类
  const classSizes = {};
  const classRegex = /\.([a-zA-Z0-9_-]+)\s*{[^}]*}/g;
  let match;
  
  while ((match = classRegex.exec(content)) !== null) {
    const className = match[1];
    const classContent = match[0];
    classSizes[className] = classContent.length;
  }
  
  const sortedClasses = Object.entries(classSizes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  console.log('🔝 最大的10个CSS类:');
  sortedClasses.forEach(([className, size], index) => {
    console.log(`  ${index + 1}. ${className}: ${size} 字符`);
  });
  
  console.log('');
  console.log('💡 优化建议:');
  if (size > 100 * 1024) { // 大于100KB
    console.log('  ⚠️  CSS文件较大，建议检查是否有未使用的样式');
  }
  if (gzippedSize > 30 * 1024) { // 大于30KB gzipped
    console.log('  ⚠️  Gzip后文件仍然较大，考虑进一步优化');
  }
  if (uniqueClasses.length > 1000) {
    console.log('  ⚠️  Tailwind类数量较多，检查是否有重复或未使用的类');
  }
  
  console.log('  ✅ 建议在生产环境中启用PurgeCSS来清理未使用的样式');
  console.log('  ✅ 考虑使用CDN来提供CSS文件');
  console.log('  ✅ 启用HTTP/2服务器推送来优化CSS加载');
}

if (require.main === module) {
  analyzeCSS();
}

module.exports = analyzeCSS; 