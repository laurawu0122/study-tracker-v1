const fs = require('fs');
const path = require('path');

// 需要清理的文件类型
const FILE_EXTENSIONS = ['.js', '.hbs'];
// 需要清理的目录
const DIRECTORIES = [
    'assets/js',
    'views',
    'routes',
    'services',
    'middleware'
];

// 需要保留的console语句（包含这些关键词的不会被删除）
const PRESERVE_KEYWORDS = [
    'console.error',
    'console.warn',
    'console.info'
];

// 调试相关的console语句模式
const DEBUG_PATTERNS = [
    /console\.log\s*\(/g,
    /console\.debug\s*\(/g
];

function shouldPreserveConsole(line) {
    return PRESERVE_KEYWORDS.some(keyword => line.includes(keyword));
}

function cleanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let modified = false;
        let removedCount = 0;

        const cleanedLines = lines.filter(line => {
            const trimmedLine = line.trim();
            
            // 跳过空行和注释
            if (!trimmedLine || trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
                return true;
            }

            // 检查是否包含调试console语句
            const hasDebugConsole = DEBUG_PATTERNS.some(pattern => pattern.test(trimmedLine));
            
            if (hasDebugConsole && !shouldPreserveConsole(trimmedLine)) {
                modified = true;
                removedCount++;
                return false; // 删除这行
            }
            
            return true;
        });

        if (modified) {
            fs.writeFileSync(filePath, cleanedLines.join('\n'), 'utf8');
            console.log(`✅ 清理文件: ${filePath} (移除了 ${removedCount} 行调试代码)`);
            return removedCount;
        }
        
        return 0;
    } catch (error) {
        console.error(`❌ 处理文件失败: ${filePath}`, error.message);
        return 0;
    }
}

function processDirectory(dirPath) {
    let totalRemoved = 0;
    
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // 递归处理子目录
                totalRemoved += processDirectory(fullPath);
            } else if (stat.isFile()) {
                // 检查文件扩展名
                const ext = path.extname(item);
                if (FILE_EXTENSIONS.includes(ext)) {
                    totalRemoved += cleanFile(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`❌ 处理目录失败: ${dirPath}`, error.message);
    }
    
    return totalRemoved;
}

function main() {
    console.log('🧹 开始清理前端调试代码...');
    
    let totalRemoved = 0;
    
    for (const dir of DIRECTORIES) {
        if (fs.existsSync(dir)) {
            console.log(`📁 处理目录: ${dir}`);
            totalRemoved += processDirectory(dir);
        } else {
            console.log(`⚠️  目录不存在: ${dir}`);
        }
    }
    
    console.log(`\n🎉 清理完成！总共移除了 ${totalRemoved} 行调试代码`);
    console.log('\n📝 清理说明:');
    console.log('- 移除了 console.log() 和 console.debug() 语句');
    console.log('- 保留了 console.error(), console.warn(), console.info() 语句');
    console.log('- 保留了注释和空行');
    console.log('- 只处理了 .js 和 .hbs 文件');
}

if (require.main === module) {
    main();
}

module.exports = { cleanFile, processDirectory }; 