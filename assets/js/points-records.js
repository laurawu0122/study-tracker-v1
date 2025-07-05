// 积分明细页面类
class PointsRecordsPage {
  constructor() {
    this.records = [];
    this.userPoints = {};
    this.currentFilters = {
      search: '',
      type: ''
    };
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalRecords = 0;
    
    this.init();
  }

  async init() {
    await this.loadUserPoints();
    await this.loadRecords();
    this.bindEvents();
  }

  async loadUserPoints() {
    try {
      const response = await fetch('/api/points-exchange/user-points', {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        this.userPoints = data.data;
        this.updatePointsDisplay();
      }
    } catch (error) {
      console.error('加载用户积分失败:', error);
    }
  }

  updatePointsDisplay() {
    document.getElementById('totalPoints').textContent = this.userPoints.total_points || 0;
    document.getElementById('availablePoints').textContent = this.userPoints.available_points || 0;
    document.getElementById('usedPoints').textContent = this.userPoints.used_points || 0;
  }

  async loadRecords() {
    this.showLoading(true);
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: 10
      });
      if (this.currentFilters.type) params.append('record_type', this.currentFilters.type);
      if (this.currentFilters.search) params.append('search', this.currentFilters.search);

      const response = await fetch(`/api/points-exchange/points-records?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        this.records = data.data.records;
        this.totalRecords = data.data.pagination.total;
        this.totalPages = data.data.pagination.totalPages;
        this.renderRecords();
        this.renderPagination();
      } else {
        console.error('加载积分记录失败:', data.error);
        this.showNotification('加载积分记录失败', 'error');
      }
    } catch (error) {
      console.error('加载积分记录失败:', error);
      this.showNotification('加载积分记录失败', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  renderRecords() {
    const container = document.getElementById('recordsList');
    if (!container) return;

    if (this.records.length === 0) {
      container.innerHTML = '';
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();
    container.innerHTML = '';
    
    this.records.forEach(record => {
      const item = this.createRecordItem(record);
      container.appendChild(item);
    });
  }

  createRecordItem(record) {
    const item = document.createElement('div');
    item.className = 'p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200';
    
    const typeConfig = this.getTypeConfig(record.record_type);
    const date = this.formatDateTime(record.created_at);
    const isPositive = record.points_change > 0;

    item.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex-shrink-0">
            <div class="w-12 h-12 rounded-full flex items-center justify-center ${typeConfig.bgClass}">
              <i class="${typeConfig.icon} text-xl ${typeConfig.iconClass}"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              ${record.description || typeConfig.text}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              ${record.rule_name ? `规则: ${record.rule_name}` : ''}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              ${date}
            </p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
            ${isPositive ? '+' : ''}${record.points_change}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            余额: ${record.balance_after}
          </div>
        </div>
      </div>
    `;

    return item;
  }

  formatDateTime(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  getTypeConfig(type) {
    const configs = {
      earned: { 
        text: '获得积分', 
        icon: 'fas fa-plus-circle', 
        iconClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-900'
      },
      used: { 
        text: '使用积分', 
        icon: 'fas fa-minus-circle', 
        iconClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-900'
      },
      bonus: { 
        text: '奖励积分', 
        icon: 'fas fa-gift', 
        iconClass: 'text-purple-600 dark:text-purple-400',
        bgClass: 'bg-purple-100 dark:bg-purple-900'
      },
      expired: { 
        text: '过期积分', 
        icon: 'fas fa-clock', 
        iconClass: 'text-gray-600 dark:text-gray-400',
        bgClass: 'bg-gray-100 dark:bg-gray-700'
      }
    };
    return configs[type] || configs.earned;
  }

  showLoading(show) {
    const loading = document.getElementById('loadingState');
    if (show) {
      loading.classList.remove('hidden');
    } else {
      loading.classList.add('hidden');
    }
  }

  bindEvents() {
    // 搜索功能
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.currentFilters.search = e.target.value;
      this.currentPage = 1; // 重置到第一页
      // 使用防抖，避免频繁请求
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.filterRecords();
      }, 300);
    });

    // 类型筛选
    document.getElementById('typeFilter').addEventListener('change', (e) => {
      this.currentFilters.type = e.target.value;
      this.currentPage = 1; // 重置到第一页
      this.loadRecords();
    });

    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.currentPage = 1; // 重置到第一页
      this.loadUserPoints();
      this.loadRecords();
    });
  }

  filterRecords() {
    // 直接调用后端API进行搜索
    this.loadRecords();
  }

  renderFilteredRecords(records) {
    const container = document.getElementById('recordsList');
    if (!container) return;

    if (records.length === 0) {
      container.innerHTML = '';
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();
    container.innerHTML = '';
    
    records.forEach(record => {
      const item = this.createRecordItem(record);
      container.appendChild(item);
    });
  }

  getToken() {
    return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || 
           localStorage.getItem('token');
  }

  showEmptyState() {
    document.getElementById('emptyState').classList.remove('hidden');
  }

  hideEmptyState() {
    document.getElementById('emptyState').classList.add('hidden');
  }

  renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    if (this.totalPages <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          显示第 ${(this.currentPage - 1) * 10 + 1} 到 ${Math.min(this.currentPage * 10, this.totalRecords)} 条，共 ${this.totalRecords} 条
        </div>
        <div class="flex space-x-2">
          ${this.currentPage > 1 ? `<button onclick="pointsRecordsPage.changePage(${this.currentPage - 1})" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">上一页</button>` : ''}
          ${this.currentPage < this.totalPages ? `<button onclick="pointsRecordsPage.changePage(${this.currentPage + 1})" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">下一页</button>` : ''}
        </div>
      </div>
    `;
  }

  changePage(page) {
    this.currentPage = page;
    this.loadRecords();
  }
}

// 页面加载完成后初始化
let pointsRecordsPage = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pointsRecordsPage = new PointsRecordsPage();
  });
} else {
  pointsRecordsPage = new PointsRecordsPage();
} 