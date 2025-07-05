// 兑换记录页面类
class ExchangeRecordsPage {
  constructor() {
    this.records = [];
    this.currentFilters = {
      search: '',
      status: ''
    };
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalRecords = 0;
    
    this.init();
  }

  async init() {
    await this.loadRecords();
    this.bindEvents();
  }

  async loadRecords() {
    this.showLoading(true);
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: 10
      });
      if (this.currentFilters.status) params.append('status', this.currentFilters.status);
      if (this.currentFilters.search) params.append('search', this.currentFilters.search);

      const response = await fetch(`/api/points-exchange/exchange-records?${params}`, {
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
        console.error('加载兑换记录失败:', data.error);
        this.showNotification('加载兑换记录失败', 'error');
      }
    } catch (error) {
      console.error('加载兑换记录失败:', error);
      this.showNotification('加载兑换记录失败', 'error');
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
          ${this.currentPage > 1 ? `<button onclick="exchangeRecordsPage.changePage(${this.currentPage - 1})" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">上一页</button>` : ''}
          ${this.currentPage < this.totalPages ? `<button onclick="exchangeRecordsPage.changePage(${this.currentPage + 1})" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">下一页</button>` : ''}
        </div>
      </div>
    `;
  }

  changePage(page) {
    this.currentPage = page;
    this.loadRecords();
  }

  createRecordItem(record) {
    const item = document.createElement('div');
    item.className = 'p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200';
    
    const statusConfig = this.getStatusConfig(record.status);
    const date = this.formatDateTime(record.created_at);
    const quantity = record.quantity || 1;

    item.innerHTML = `
      <div class="flex items-center space-x-4">
        <div class="flex-shrink-0">
          <div class="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            ${record.product_image ? 
              `<img src="${record.product_image}" alt="${record.product_name}" class="w-full h-full object-cover rounded-lg">` :
              `<i class="fas fa-image text-2xl text-gray-400"></i>`
            }
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
              ${record.product_name}
              ${quantity > 1 ? `<span class="text-sm text-gray-500 dark:text-gray-400 ml-2">x${quantity}</span>` : ''}
            </h3>
            <span class="px-2 py-1 text-xs font-medium rounded-full ${statusConfig.class}">
              ${statusConfig.text}
            </span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            ${record.product_description || ''}
          </p>
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
              <span>消耗积分: <span class="font-medium text-yellow-600 dark:text-yellow-400">${record.points_spent}</span></span>
              <span>兑换时间: ${date}</span>
              ${quantity > 1 ? `<span>数量: <span class="font-medium">${quantity}</span></span>` : ''}
            </div>
          </div>
          ${record.approval_notes ? `
            <div class="mt-2 p-2 bg-gray-50 rounded">
              <strong>管理员备注:</strong> ${record.approval_notes}
            </div>
          ` : ''}
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

  getStatusConfig(status) {
    const configs = {
      pending: { text: '待审核', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      approved: { text: '已通过', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      rejected: { text: '已拒绝', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      completed: { text: '已完成', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
    };
    return configs[status] || configs.pending;
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
      this.loadRecords(); // 直接请求后端
    });

    // 状态筛选
    document.getElementById('statusFilter').addEventListener('change', (e) => {
      this.currentFilters.status = e.target.value;
      this.currentPage = 1; // 重置到第一页
      this.loadRecords();
    });

    // 刷新按钮
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.currentPage = 1; // 重置到第一页
      this.loadRecords();
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
}

// 页面加载完成后初始化
let exchangeRecordsPage = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    exchangeRecordsPage = new ExchangeRecordsPage();
  });
} else {
  exchangeRecordsPage = new ExchangeRecordsPage();
} 