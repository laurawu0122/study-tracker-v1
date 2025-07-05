// 通知角标管理服务
class NotificationBadgeManager {
  constructor() {
    this.badgeElements = {
      desktop: {
        badge: null,
        count: null
      },
      mobile: {
        badge: null,
        count: null
      }
    };
    this.currentCount = 0;
    this.lastNotificationTimestamp = null;
    this.isInitialized = false;
    this.pollingInterval = null;
    this.pollingIntervalMs = 30000; // 30秒轮询一次
    
    this.init();
  }

  init() {
    console.log('初始化通知角标管理器...');
    this.findBadgeElements();
    
    // 检查是否找到了角标元素
    const hasDesktopBadge = this.badgeElements.desktop.badge && this.badgeElements.desktop.count;
    const hasMobileBadge = this.badgeElements.mobile.badge && this.badgeElements.mobile.count;
    
    if (!hasDesktopBadge && !hasMobileBadge) {
      console.warn('未找到通知角标元素，跳过初始化');
      return;
    }
    
    this.startPolling();
    this.isInitialized = true;
    console.log('通知角标管理器初始化完成', {
      desktop: hasDesktopBadge,
      mobile: hasMobileBadge
    });
  }

  findBadgeElements() {
    // 查找桌面端角标元素
    this.badgeElements.desktop.badge = document.getElementById('notificationBadge');
    this.badgeElements.desktop.count = document.getElementById('notificationCount');
    
    // 查找移动端角标元素
    this.badgeElements.mobile.badge = document.getElementById('mobileNotificationBadge');
    this.badgeElements.mobile.count = document.getElementById('mobileNotificationCount');
    
    console.log('角标元素查找结果:', {
      desktop: {
        badge: !!this.badgeElements.desktop.badge,
        count: !!this.badgeElements.desktop.count
      },
      mobile: {
        badge: !!this.badgeElements.mobile.badge,
        count: !!this.badgeElements.mobile.count
      }
    });
  }

  async updateBadgeCount() {
    try {
      const response = await fetch('/api/notifications/unread-count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        const unreadCount = result.data?.unreadCount || 0;
        const latestTimestamp = result.data?.latestTimestamp;
        
        console.log('获取到未读通知数量:', unreadCount, '最新时间戳:', latestTimestamp);
        
        // 检查是否有新通知
        if (latestTimestamp && this.lastNotificationTimestamp) {
          const newTimestamp = new Date(latestTimestamp).getTime();
          const lastTimestamp = new Date(this.lastNotificationTimestamp).getTime();
          
          if (newTimestamp > lastTimestamp) {
            console.log('检测到新通知，触发实时更新');
            this.startRealTimePolling();
          }
        } else if (latestTimestamp && !this.lastNotificationTimestamp) {
          // 首次加载时，如果有通知，也启动实时轮询
          console.log('首次检测到通知，启动实时轮询');
          this.startRealTimePolling();
        }
        
        // 更新最后通知时间戳
        if (latestTimestamp) {
          this.lastNotificationTimestamp = latestTimestamp;
        }
        
        this.setBadgeCount(unreadCount);
      } else {
        console.error('获取未读通知数量失败:', response.status);
      }
    } catch (error) {
      console.error('获取未读通知数量出错:', error);
    }
  }

  setBadgeCount(count) {
    if (this.currentCount === count) {
      return; // 数量没有变化，不需要更新
    }

    this.currentCount = count;
    console.log('更新通知角标数量:', count);

    // 更新桌面端角标
    if (this.badgeElements.desktop.badge && this.badgeElements.desktop.count) {
      this.badgeElements.desktop.count.textContent = count;
      
      if (count > 0) {
        this.badgeElements.desktop.badge.classList.remove('hidden');
        // 添加动画效果
        this.badgeElements.desktop.badge.classList.add('animate-pulse');
        setTimeout(() => {
          this.badgeElements.desktop.badge.classList.remove('animate-pulse');
        }, 1000);
      } else {
        this.badgeElements.desktop.badge.classList.add('hidden');
      }
    }

    // 更新移动端角标
    if (this.badgeElements.mobile.badge && this.badgeElements.mobile.count) {
      this.badgeElements.mobile.count.textContent = count;
      
      if (count > 0) {
        this.badgeElements.mobile.badge.classList.remove('hidden');
        // 添加动画效果
        this.badgeElements.mobile.badge.classList.add('animate-pulse');
        setTimeout(() => {
          this.badgeElements.mobile.badge.classList.remove('animate-pulse');
        }, 1000);
      } else {
        this.badgeElements.mobile.badge.classList.add('hidden');
      }
    }

    // 如果数量超过99，显示99+
    if (count > 99) {
      if (this.badgeElements.desktop.count) {
        this.badgeElements.desktop.count.textContent = '99+';
      }
      if (this.badgeElements.mobile.count) {
        this.badgeElements.mobile.count.textContent = '99+';
      }
    }
  }

  startPolling() {
    // 立即执行一次
    this.updateBadgeCount();
    
    // 设置定时轮询
    this.pollingInterval = setInterval(() => {
      this.updateBadgeCount();
    }, this.pollingIntervalMs);
    
    console.log('通知角标轮询已启动，间隔:', this.pollingIntervalMs, 'ms');
  }

  // 设置更频繁的轮询（用于实时通知）
  startRealTimePolling() {
    // 停止原有的轮询
    this.stopPolling();
    
    // 立即执行一次
    this.updateBadgeCount();
    
    // 设置更频繁的轮询（3秒一次）
    this.pollingInterval = setInterval(() => {
      this.updateBadgeCount();
    }, 3000);
    
    console.log('实时通知角标轮询已启动，间隔: 3s');
    
    // 30秒后恢复正常轮询
    setTimeout(() => {
      this.stopPolling();
      this.startPolling();
    }, 30000);
  }

  // 立即更新角标（用于用户操作后立即响应）
  async immediateUpdate() {
    console.log('立即更新通知角标');
    await this.updateBadgeCount();
    
    // 启动实时轮询以确保不会遗漏
    this.startRealTimePolling();
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('通知角标轮询已停止');
    }
  }

  // 手动触发更新（用于实时通知）
  triggerUpdate() {
    console.log('手动触发通知角标更新');
    this.updateBadgeCount();
  }

  // 重置角标（当用户进入通知页面时调用）
  resetBadge() {
    console.log('重置通知角标');
    this.setBadgeCount(0);
  }

  // 销毁实例
  destroy() {
    this.stopPolling();
    this.isInitialized = false;
    console.log('通知角标管理器已销毁');
  }
}

// 全局实例管理
let notificationBadgeManager = null;

// 获取或创建实例
function getNotificationBadgeManager() {
  if (!notificationBadgeManager) {
    notificationBadgeManager = new NotificationBadgeManager();
    window.notificationBadgeManager = notificationBadgeManager;
  }
  return notificationBadgeManager;
}

// 初始化函数
function initNotificationBadge() {
  console.log('初始化通知角标...');
  const manager = getNotificationBadgeManager();
  return manager;
}

// DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  // 检查是否在通知页面，如果是则不显示角标
  if (window.location.pathname.includes('/notifications')) {
    console.log('当前在通知页面，跳过角标初始化');
    return;
  }
  
  // 延迟初始化，确保DOM完全加载
  setTimeout(() => {
    initNotificationBadge();
  }, 100);
});

// 为SPA环境提供的手动初始化函数
window.initNotificationBadge = initNotificationBadge;

// 全局函数，供其他模块调用
window.updateNotificationBadge = function() {
  if (window.notificationBadgeManager) {
    window.notificationBadgeManager.triggerUpdate();
  }
};

window.resetNotificationBadge = function() {
  if (window.notificationBadgeManager) {
    window.notificationBadgeManager.resetBadge();
  }
};

window.startRealTimeNotificationPolling = function() {
  if (window.notificationBadgeManager) {
    window.notificationBadgeManager.startRealTimePolling();
  }
};

window.immediateNotificationUpdate = function() {
  if (window.notificationBadgeManager) {
    window.notificationBadgeManager.immediateUpdate();
  }
};

// 页面可见性变化时更新角标
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.notificationBadgeManager) {
    console.log('页面变为可见，更新通知角标');
    window.notificationBadgeManager.triggerUpdate();
  }
});

// 窗口获得焦点时更新角标
window.addEventListener('focus', () => {
  if (window.notificationBadgeManager) {
    console.log('窗口获得焦点，更新通知角标');
    window.notificationBadgeManager.triggerUpdate();
  }
}); 