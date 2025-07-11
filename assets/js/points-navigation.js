/**
 * 积分相关菜单导航脚本
 * 专门处理积分兑换、兑换记录、积分明细三个菜单项的导航功能
 * 使用增强的动态脚本加载系统，确保SPA页面切换100%生效
 */

// 防止重复加载
if (window.PointsNavigation) {
    console.log('PointsNavigation 已经加载过，跳过重复加载');
} else {

class PointsNavigation {
  constructor() {
    this.currentPage = '';
    this.init();
  }

  init() {
    this.detectCurrentPage();
    this.bindNavigationEvents();
    this.highlightCurrentPage();
  }

  // 检测当前页面
  detectCurrentPage() {
    const path = window.location.pathname;
    if (path === '/points-exchange') {
      this.currentPage = 'points-exchange';
    } else if (path === '/exchange-records') {
      this.currentPage = 'exchange-records';
    } else if (path === '/points-records') {
      this.currentPage = 'points-records';
    }
  }

  // 绑定导航事件
  bindNavigationEvents() {
    // 桌面端导航链接
    this.bindDesktopNavigation();
    
    // 移动端导航链接
    this.bindMobileNavigation();
  }

  // 绑定桌面端导航
  bindDesktopNavigation() {
    // 积分兑换
    const pointsExchangeLink = document.querySelector('a[href="/points-exchange"]');
    if (pointsExchangeLink) {
      pointsExchangeLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('/points-exchange', 'points-exchange');
      });
    }

    // 兑换记录
    const exchangeRecordsLink = document.querySelector('a[href="/exchange-records"]');
    if (exchangeRecordsLink) {
      exchangeRecordsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('/exchange-records', 'exchange-records');
      });
    }

    // 积分明细
    const pointsRecordsLink = document.querySelector('a[href="/points-records"]');
    if (pointsRecordsLink) {
      pointsRecordsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('/points-records', 'points-records');
      });
    }
  }

  // 绑定移动端导航
  bindMobileNavigation() {
    // 移动端积分兑换
    const mobilePointsExchangeLink = document.querySelector('.mobile-nav-link[href="/points-exchange"]');
    if (mobilePointsExchangeLink) {
      mobilePointsExchangeLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('/points-exchange', 'points-exchange');
        this.closeMobileSidebar();
      });
    }

    // 移动端兑换记录
    const mobileExchangeRecordsLink = document.querySelector('.mobile-nav-link[href="/exchange-records"]');
    if (mobileExchangeRecordsLink) {
      mobileExchangeRecordsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('/exchange-records', 'exchange-records');
        this.closeMobileSidebar();
      });
    }

    // 移动端积分明细
    const mobilePointsRecordsLink = document.querySelector('.mobile-nav-link[href="/points-records"]');
    if (mobilePointsRecordsLink) {
      mobilePointsRecordsLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateToPage('/points-records', 'points-records');
        this.closeMobileSidebar();
      });
    }
  }

  // 页面导航 - 使用增强导航系统
  async navigateToPage(url, pageType) {
    console.log(`积分导航到页面: ${url}, 类型: ${pageType}`);
    
    try {
      // 使用增强导航系统
      if (window.enhancedNavigate) {
        await window.enhancedNavigate(url, pageType);
      } else {
        // 回退到传统导航
        console.warn('增强导航系统不可用，使用传统导航');
        window.location.href = url;
        return;
      }
      
      // 更新当前页面状态
      this.currentPage = pageType;
      this.highlightCurrentPage();
      
      console.log(`积分页面导航成功: ${pageType}`);
      
    } catch (error) {
      console.error('积分页面导航失败:', error);
      this.showErrorMessage('页面加载失败，请稍后重试');
      
      // 如果增强导航失败，回退到传统导航
      window.location.href = url;
    }
  }

  // 高亮当前页面
  highlightCurrentPage() {
    // 移除所有高亮
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
      link.classList.remove('bg-primary-100', 'text-primary-700', 'dark:bg-primary-900', 'dark:text-primary-300');
      link.classList.add('text-gray-600', 'hover:bg-gray-100', 'dark:text-gray-400', 'dark:hover:bg-gray-700');
    });

    // 根据当前页面添加高亮
    let activeLink = null;
    
    switch (this.currentPage) {
      case 'points-exchange':
        activeLink = document.querySelector('a[href="/points-exchange"]');
        break;
      case 'exchange-records':
        activeLink = document.querySelector('a[href="/exchange-records"]');
        break;
      case 'points-records':
        activeLink = document.querySelector('a[href="/points-records"]');
        break;
    }

    if (activeLink) {
      activeLink.classList.remove('text-gray-600', 'hover:bg-gray-100', 'dark:text-gray-400', 'dark:hover:bg-gray-700');
      activeLink.classList.add('bg-primary-100', 'text-primary-700', 'dark:bg-primary-900', 'dark:text-primary-300');
    }
  }

  // 显示错误消息
  showErrorMessage(message) {
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else {
      window.demoModeAlert(message);
    }
  }

  // 关闭移动端侧边栏
  closeMobileSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    if (sidebar) {
      sidebar.classList.add('hidden');
    }
  }
}

// 创建积分导航实例
if (!window.pointsNavigation) {
    window.pointsNavigation = new PointsNavigation();
}

// 处理浏览器前进后退
window.addEventListener('popstate', (event) => {
  if (window.pointsNavigation) {
    window.pointsNavigation.detectCurrentPage();
    window.pointsNavigation.highlightCurrentPage();
  }
});

// 导出到全局作用域
window.PointsNavigation = PointsNavigation;
} 