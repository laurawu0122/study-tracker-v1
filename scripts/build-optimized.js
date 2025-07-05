#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description}完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description}失败:`, error.message);
    return false;
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileSize(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath).size;
  }
  return 0;
}

function buildOptimized() {
  console.log('🚀 开始优化构建流程...');
  console.log('='.repeat(60));
  
  // 设置生产环境
  process.env.NODE_ENV = 'production';
  
  // 记录构建开始时间
  const startTime = Date.now();
  
  // 1. 清理旧的构建文件
  console.log('🧹 清理旧的构建文件...');
  const cssPath = path.join(__dirname, '../assets/css/tailwind.css');
  if (fs.existsSync(cssPath)) {
    const oldSize = getFileSize(cssPath);
    console.log(`📏 原始CSS文件大小: ${formatBytes(oldSize)}`);
  }
  
  // 2. 构建CSS（包含PurgeCSS优化）
  if (!runCommand('npm run build:css', '构建CSS（包含PurgeCSS优化）')) {
    process.exit(1);
  }
  
  // 3. 构建JavaScript
  if (!runCommand('npm run build:js', '构建JavaScript')) {
    process.exit(1);
  }
  
  // 4. 分析构建结果
  console.log('\n📊 构建结果分析:');
  console.log('-'.repeat(40));
  
  if (fs.existsSync(cssPath)) {
    const newSize = getFileSize(cssPath);
    const gzippedSize = require('zlib').gzipSync(fs.readFileSync(cssPath)).length;
    
    console.log(`📏 优化后CSS文件大小: ${formatBytes(newSize)}`);
    console.log(`🗜️  Gzip压缩后大小: ${formatBytes(gzippedSize)}`);
    
    if (fs.existsSync(cssPath)) {
      const oldSize = getFileSize(cssPath);
      if (oldSize > 0) {
        const reduction = ((oldSize - newSize) / oldSize * 100).toFixed(1);
        console.log(`📈 文件大小减少: ${reduction}%`);
      }
    }
  }
  
  // 5. 检查其他构建文件
  const jsPath = path.join(__dirname, '../assets/js/bundle.js');
  if (fs.existsSync(jsPath)) {
    const jsSize = getFileSize(jsPath);
    const jsGzippedSize = require('zlib').gzipSync(fs.readFileSync(jsPath)).length;
    console.log(`📏 JavaScript文件大小: ${formatBytes(jsSize)}`);
    console.log(`🗜️  JavaScript Gzip大小: ${formatBytes(jsGzippedSize)}`);
  }
  
  // 6. 计算构建时间
  const buildTime = Date.now() - startTime;
  console.log(`⏱️  总构建时间: ${buildTime}ms`);
  
  // 7. 生成构建报告
  const report = {
    timestamp: new Date().toISOString(),
    buildTime: buildTime,
    cssSize: fs.existsSync(cssPath) ? getFileSize(cssPath) : 0,
    cssGzippedSize: fs.existsSync(cssPath) ? require('zlib').gzipSync(fs.readFileSync(cssPath)).length : 0,
    jsSize: fs.existsSync(jsPath) ? getFileSize(jsPath) : 0,
    jsGzippedSize: fs.existsSync(jsPath) ? require('zlib').gzipSync(fs.readFileSync(jsPath)).length : 0,
    nodeEnv: process.env.NODE_ENV
  };
  
  const reportPath = path.join(__dirname, '../build-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 构建报告已保存到: ${reportPath}`);
  
  console.log('\n🎉 优化构建完成！');
  console.log('💡 优化效果:');
  console.log('  ✅ 使用PurgeCSS清理了未使用的CSS样式');
  console.log('  ✅ 使用cssnano压缩了CSS文件');
  console.log('  ✅ 启用了生产环境优化');
  console.log('  ✅ 生成了详细的构建报告');
  
  console.log('\n📋 可用的构建命令:');
  console.log('  npm run build:css        - 构建生产环境CSS');
  console.log('  npm run build:css:dev    - 构建开发环境CSS');
  console.log('  npm run build:css:watch  - 监听模式构建CSS');
  console.log('  npm run analyze:css      - 分析CSS文件');
  console.log('  npm run build            - 完整构建');
}

if (require.main === module) {
  buildOptimized();
}

module.exports = buildOptimized; 