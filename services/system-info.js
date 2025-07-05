const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

class SystemInfoService {
  constructor() {
    this.platform = os.platform();
    this.arch = os.arch();
    this.cpuUsageHistory = [];
    this.lastCpuUsage = null;
  }

  // 获取基本系统信息
  getBasicInfo() {
    return {
      platform: this.getPlatformName(),
      arch: this.arch,
      nodeVersion: process.version,
      hostname: os.hostname(),
      release: os.release(),
      type: os.type(),
      uptime: os.uptime(),
      loadAverage: os.loadavg()
    };
  }

  // 获取内存信息
  getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    
    return {
      total: this.formatBytes(total),
      free: this.formatBytes(free),
      used: this.formatBytes(used),
      usagePercent: ((used / total) * 100).toFixed(1)
    };
  }

  // 获取CPU使用率
  async getCpuUsage() {
    try {
      if (this.platform === 'win32') {
        return await this.getWindowsCpuUsage();
      } else if (this.platform === 'darwin') {
        return await this.getMacCpuUsage();
      } else {
        return await this.getLinuxCpuUsage();
      }
    } catch (error) {
      console.error('获取CPU使用率失败:', error);
      return 'N/A';
    }
  }

  // Windows CPU使用率
  async getWindowsCpuUsage() {
    try {
      const { stdout } = await execAsync('wmic cpu get loadpercentage /value');
      const match = stdout.match(/LoadPercentage=(\d+)/);
      return match ? `${match[1]}%` : 'N/A';
    } catch (error) {
      console.error('Windows CPU使用率获取失败:', error);
      return 'N/A';
    }
  }

  // macOS CPU使用率
  async getMacCpuUsage() {
    try {
      const { stdout } = await execAsync('top -l 1 -n 0 | grep "CPU usage"');
      const match = stdout.match(/CPU usage: (\d+\.?\d*)%/);
      return match ? `${parseFloat(match[1]).toFixed(1)}%` : 'N/A';
    } catch (error) {
      console.error('macOS CPU使用率获取失败:', error);
      return 'N/A';
    }
  }

  // Linux CPU使用率
  async getLinuxCpuUsage() {
    try {
      const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | cut -d"%" -f1');
      const usage = parseFloat(stdout.trim());
      return isNaN(usage) ? 'N/A' : `${usage.toFixed(1)}%`;
    } catch (error) {
      console.error('Linux CPU使用率获取失败:', error);
      return 'N/A';
    }
  }

  // 获取磁盘空间信息
  async getDiskSpace() {
    try {
      if (this.platform === 'win32') {
        return await this.getWindowsDiskSpace();
      } else if (this.platform === 'darwin') {
        return await this.getMacDiskSpace();
      } else {
        return await this.getLinuxDiskSpace();
      }
    } catch (error) {
      console.error('获取磁盘空间失败:', error);
      return 'N/A';
    }
  }

  // Windows磁盘空间
  async getWindowsDiskSpace() {
    try {
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption /format:csv');
      const lines = stdout.split('\n').filter(line => line.includes(','));
      let totalFree = 0;
      let totalSize = 0;
      
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 4) {
          const free = parseInt(parts[2]) || 0;
          const size = parseInt(parts[3]) || 0;
          totalFree += free;
          totalSize += size;
        }
      }
      
      const used = totalSize - totalFree;
      const usagePercent = ((used / totalSize) * 100).toFixed(1);
      return `${usagePercent}% (${this.formatBytes(used)} / ${this.formatBytes(totalSize)})`;
    } catch (error) {
      console.error('Windows磁盘空间获取失败:', error);
      return 'N/A';
    }
  }

  // macOS磁盘空间
  async getMacDiskSpace() {
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 5) {
        const used = parts[2];
        const total = parts[1];
        const usagePercent = parts[4].replace('%', '');
        return `${usagePercent}% (${used} / ${total})`;
      }
      return 'N/A';
    } catch (error) {
      console.error('macOS磁盘空间获取失败:', error);
      return 'N/A';
    }
  }

  // Linux磁盘空间
  async getLinuxDiskSpace() {
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 5) {
        const used = parts[2];
        const total = parts[1];
        const usagePercent = parts[4].replace('%', '');
        return `${usagePercent}% (${used} / ${total})`;
      }
      return 'N/A';
    } catch (error) {
      console.error('Linux磁盘空间获取失败:', error);
      return 'N/A';
    }
  }

  // 获取数据库信息
  async getDatabaseInfo() {
    try {
      const { knex } = require('../database/db');
      
      // 获取数据库类型
      const dbType = this.getDatabaseType();
      
      // 获取数据库版本
      const dbVersion = await this.getDatabaseVersion(knex);
      
      // 获取连接数
      const connections = await this.getDatabaseConnections(knex);
      
      return {
        type: dbType,
        version: dbVersion,
        connections: connections
      };
    } catch (error) {
      console.error('获取数据库信息失败:', error);
      return {
        type: 'Unknown',
        version: 'N/A',
        connections: 'N/A'
      };
    }
  }

  // 获取数据库类型
  getDatabaseType() {
    const dbConfig = require('../knexfile');
    const client = dbConfig.development.client;
    
    const dbTypeMap = {
      'postgresql': 'PostgreSQL',
      'mysql': 'MySQL',
      'mssql': 'SQL Server',
      'oracledb': 'Oracle'
    };
    
    return dbTypeMap[client] || client;
  }

  // 获取数据库版本
  async getDatabaseVersion(db) {
    try {
      const dbConfig = require('../knexfile');
      const client = dbConfig.development.client;
      
      if (client === 'postgresql') {
        const result = await db.raw('SELECT version()');
        const version = result.rows[0].version;
        const match = version.match(/PostgreSQL (\d+\.\d+)/);
        return match ? match[1] : version;
      } else if (client === 'mysql') {
        const result = await db.raw('SELECT VERSION() as version');
        return result[0][0].version;
      } else {
        return 'N/A';
      }
    } catch (error) {
      console.error('获取数据库版本失败:', error);
      return 'N/A';
    }
  }

  // 获取数据库连接数
  async getDatabaseConnections(db) {
    try {
      const dbConfig = require('../knexfile');
      const client = dbConfig.development.client;
      
      if (client === 'postgresql') {
        const result = await db.raw(`
          SELECT count(*) as connections 
          FROM pg_stat_activity 
          WHERE state = 'active'
        `);
        return result.rows[0].connections.toString();
      } else if (client === 'mysql') {
        const result = await db.raw('SHOW STATUS LIKE "Threads_connected"');
        return result[0][0].Value;
      } else {
        return 'N/A';
      }
    } catch (error) {
      console.error('获取数据库连接数失败:', error);
      return 'N/A';
    }
  }

  // 获取平台名称
  getPlatformName() {
    const platformMap = {
      'darwin': 'macOS',
      'win32': 'Windows',
      'linux': 'Linux',
      'freebsd': 'FreeBSD',
      'openbsd': 'OpenBSD',
      'sunos': 'SunOS'
    };
    
    return platformMap[this.platform] || this.platform;
  }

  // 格式化字节数
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 获取完整的系统信息
  async getFullSystemInfo() {
    const basicInfo = this.getBasicInfo();
    const memoryInfo = this.getMemoryInfo();
    const cpuUsage = await this.getCpuUsage();
    const diskSpace = await this.getDiskSpace();
    const dbInfo = await this.getDatabaseInfo();

    return {
      // 基本系统信息
      platform: basicInfo.platform,
      arch: basicInfo.arch,
      nodeVersion: basicInfo.nodeVersion,
      hostname: basicInfo.hostname,
      release: basicInfo.release,
      uptime: basicInfo.uptime,
      loadAverage: basicInfo.loadAverage,
      
      // 内存信息
      memory: {
        total: memoryInfo.total,
        free: memoryInfo.free,
        used: memoryInfo.used,
        usagePercent: memoryInfo.usagePercent
      },
      
      // 系统资源
      cpuUsage: cpuUsage,
      diskSpace: diskSpace,
      
      // 数据库信息
      database: {
        type: dbInfo.type,
        version: dbInfo.version,
        connections: dbInfo.connections
      }
    };
  }
}

module.exports = new SystemInfoService(); 