// 兑换审核管理
class AdminExchangeApproval {
  constructor() {
    console.log('AdminExchangeApproval 构造函数被调用');
    this.exchanges = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalRecords = 0;
    this.filters = {
      status: '',
      user_id: ''
    };
    
    this.init();
    this.initToast();
  }

  // 初始化 Toast UI
  initToast() {
    // 创建 Toast 容器
    if (!document.getElementById('toast-container')) {
      const toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
      document.body.appendChild(toastContainer);
    }
  }

  // 显示 Toast 消息
  showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    const typeConfig = {
      success: {
        bg: 'bg-green-500',
        icon: 'fas fa-check-circle',
        text: 'text-white'
      },
      error: {
        bg: 'bg-red-500',
        icon: 'fas fa-exclamation-circle',
        text: 'text-white'
      },
      warning: {
        bg: 'bg-yellow-500',
        icon: 'fas fa-exclamation-triangle',
        text: 'text-white'
      },
      info: {
        bg: 'bg-blue-500',
        icon: 'fas fa-info-circle',
        text: 'text-white'
      }
    };

    const config = typeConfig[type] || typeConfig.info;

    toast.className = `${config.bg} ${config.text} px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0 flex items-center space-x-3 min-w-80`;
    toast.innerHTML = `
      <i class="${config.icon} text-lg"></i>
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200 transition-colors">
        <i class="fas fa-times"></i>
      </button>
    `;

    toastContainer.appendChild(toast);

    // 动画进入
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0');
      toast.classList.add('translate-x-0', 'opacity-100');
    }, 10);

    // 自动移除
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }, duration);
  }

  // 显示确认对话框
  showConfirmDialog(message, onConfirm, onCancel = null) {
    return new Promise((resolve) => {
      // 移除已存在的确认对话框
      const existingDialog = document.querySelector('.confirm-dialog');
      if (existingDialog) {
        existingDialog.remove();
      }

      // 创建确认对话框
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
      dialog.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 transform transition-all duration-300">
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <i class="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">确认操作</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">${message}</p>
            <div class="flex space-x-3">
              <button id="cancelBtn" class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300">
                取消
              </button>
              <button id="confirmBtn" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-300">
                确认
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // 绑定事件
      const confirmBtn = dialog.querySelector('#confirmBtn');
      const cancelBtn = dialog.querySelector('#cancelBtn');

      const cleanup = () => {
        if (dialog.parentElement) {
          dialog.parentElement.removeChild(dialog);
        }
      };

      const handleConfirm = () => {
        cleanup();
        if (onConfirm) {
          onConfirm();
        }
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        if (onCancel) {
          onCancel();
        }
        resolve(false);
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);

      // 点击背景关闭
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          handleCancel();
        }
      });

      // ESC键关闭
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
          document.removeEventListener('keydown', handleEsc);
        }
      };
      document.addEventListener('keydown', handleEsc);
    });
  }

  async init() {
    console.log('AdminExchangeApproval init 开始');
    await this.loadData();
    this.bindEvents();
    this.updateStats();
    console.log('AdminExchangeApproval init 完成');
  }

  async loadData() {
    try {
      await this.loadExchangeRecords();
    } catch (error) {
      console.error('加载数据失败:', error);
      this.showToast('加载数据失败', 'error');
    }
  }

  async loadExchangeRecords(page = 1) {
    try {
      const params = new URLSearchParams({
        page: page,
        limit: 20,
        ...this.filters
      });

      const response = await fetch(`/api/points-exchange/admin/exchange-records?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        this.exchanges = data.data.records || [];
        this.currentPage = data.data.pagination.page;
        this.totalPages = data.data.pagination.totalPages;
        this.totalRecords = data.data.pagination.total;
        
        this.renderExchangeRecords();
        this.renderPagination();
      } else {
        console.error('加载兑换记录失败:', data.error);
      }
    } catch (error) {
      console.error('加载兑换记录失败:', error);
    }
  }

  bindEvents() {
    console.log('绑定事件开始');
    
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.refreshData();
    });

    document.getElementById('filterBtn')?.addEventListener('click', () => {
      this.loadExchangeRecords(1);
    });

    document.getElementById('statusFilter')?.addEventListener('change', () => {
      this.loadExchangeRecords(1);
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.filterExchanges();
    });

    // 绑定表格事件
    this.bindTableEvents();
    
    // 绑定分页事件
    this.bindPaginationEvents();
    
    console.log('绑定事件完成');
  }

  bindTableEvents() {
    console.log('绑定表格事件开始');
    const tbody = document.getElementById('exchangeTableBody');
    if (!tbody) {
      console.error('找不到 exchangeTableBody 元素');
      return;
    }

    // 移除之前的事件监听器，防止重复绑定
    const newTbody = tbody.cloneNode(true);
    tbody.parentNode.replaceChild(newTbody, tbody);
    newTbody.id = 'exchangeTableBody';

    // 使用事件委托，监听tbody的点击事件
    newTbody.addEventListener('click', (e) => {
      console.log('表格点击事件触发', e.target);
      console.log('点击的元素类名:', e.target.className);
      console.log('点击的元素标签:', e.target.tagName);
      
      // 阻止事件冒泡
      e.stopPropagation();
      
      // 查找最近的按钮元素（包括图标元素）
      const button = e.target.closest('button[data-action]');
      if (!button) {
        console.log('点击的不是按钮或没有data-action属性');
        return;
      }

      const action = button.getAttribute('data-action');
      const exchangeId = button.getAttribute('data-exchange-id');
      console.log('按钮点击:', action, exchangeId);
      console.log('按钮元素:', button);

      // 防止重复点击
      if (button.disabled) {
        console.log('按钮已被禁用，忽略点击');
        return;
      }

      // 临时禁用按钮
      button.disabled = true;
      setTimeout(() => {
        button.disabled = false;
      }, 1000);

      if (action === 'approve') {
        console.log('准备审核兑换记录');
        const isApproved = button.getAttribute('data-approve') === 'true';
        this.approveExchangeRecord(exchangeId, isApproved);
      } else if (action === 'view') {
        console.log('准备查看详情');
        this.viewExchangeDetails(exchangeId);
      } else if (action === 'delete') {
        console.log('准备删除兑换记录');
        this.deleteExchangeRecord(exchangeId);
      }
    });
    console.log('绑定表格事件完成');
  }

  bindPaginationEvents() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
      paginationContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('page-link')) {
          e.preventDefault();
          const page = parseInt(e.target.getAttribute('data-page'));
          if (page && page !== this.currentPage) {
            this.goToPage(page);
          }
        }
      });
    }
  }

  filterExchanges() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    const filteredExchanges = this.exchanges.filter(exchange => {
      const matchesUsername = exchange.username?.toLowerCase().includes(searchTerm);
      const matchesProduct = exchange.product_name?.toLowerCase().includes(searchTerm);
      return matchesUsername || matchesProduct;
    });

    this.renderExchangeRecords(filteredExchanges);
  }

  renderExchangeRecords(exchanges = this.exchanges) {
    console.log('渲染兑换记录开始，数量:', exchanges.length);
    const tbody = document.getElementById('exchangeTableBody');
    if (!tbody) {
      console.error('找不到 exchangeTableBody 元素');
      return;
    }

    tbody.innerHTML = '';

    if (exchanges.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
            暂无兑换记录
          </td>
        </tr>
      `;
      return;
    }

    exchanges.forEach(exchange => {
      const statusConfig = this.getStatusConfig(exchange.status);
      const date = this.formatDateTime(exchange.created_at);
      const quantity = exchange.quantity || 1;

      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
      row.setAttribute('data-exchange-id', exchange.id);
      row.setAttribute('data-user-id', exchange.user_id);
      
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              ${exchange.user_avatar ? 
                `<img class="h-10 w-10 rounded-full object-cover" src="/uploads/avatars/${exchange.user_avatar}" alt="${exchange.username}" onerror="this.parentElement.innerHTML='<div class=\\'h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center\\'><span class=\\'text-sm font-medium text-gray-700 dark:text-gray-300\\'>${exchange.username ? exchange.username.charAt(0).toUpperCase() : 'U'}</span></div>'">` :
                `<div class="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ${exchange.username ? exchange.username.charAt(0).toUpperCase() : 'U'}
                  </span>
                </div>`
              }
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${exchange.username || '未知用户'}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${exchange.email || '无邮箱'}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <img class="h-10 w-10 rounded-lg object-cover" 
                   src="${exchange.product_image || '/assets/ico/knowledge-star.svg'}" 
                   alt="${exchange.product_name}"
                   onerror="this.src='/assets/ico/knowledge-star.svg'">
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                ${exchange.product_name || '未知商品'}
                ${quantity > 1 ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">x${quantity}</span>` : ''}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${exchange.product_description || ''}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <span class="font-medium">${exchange.points_spent}</span> 积分
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.class}">
            ${statusConfig.text}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
          ${date}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex space-x-2">
            <button data-action="view" 
                    data-exchange-id="${exchange.id}"
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <i class="fas fa-eye"></i>
            </button>
            ${exchange.status === 'pending' ? `
              <button data-action="approve" 
                      data-exchange-id="${exchange.id}"
                      data-approve="true"
                      class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title="通过申请">
                <i class="fas fa-check"></i>
              </button>
              <button data-action="approve" 
                      data-exchange-id="${exchange.id}"
                      data-approve="false"
                      class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="拒绝申请">
                <i class="fas fa-times"></i>
              </button>
            ` : ''}
            <button data-action="delete" 
                    data-exchange-id="${exchange.id}"
                    class="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="删除记录">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      
      tbody.appendChild(row);
    });

    console.log('渲染兑换记录完成');
    
    // 重新绑定表格事件
    this.bindTableEvents();
  }

  renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;

    if (this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = '<nav class="flex items-center justify-between">';
    paginationHTML += '<div class="flex-1 flex justify-between sm:hidden">';
    
    if (this.currentPage > 1) {
      paginationHTML += `<a href="#" class="page-link relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" data-page="${this.currentPage - 1}">上一页</a>`;
    }
    
    if (this.currentPage < this.totalPages) {
      paginationHTML += `<a href="#" class="page-link ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50" data-page="${this.currentPage + 1}">下一页</a>`;
    }
    
    paginationHTML += '</div>';
    paginationHTML += '<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">';
    paginationHTML += `<div class="text-sm text-gray-700 dark:text-gray-300">显示第 ${(this.currentPage - 1) * 20 + 1} 到 ${Math.min(this.currentPage * 20, this.totalRecords)} 条，共 ${this.totalRecords} 条记录</div>`;
    paginationHTML += '<div>';
    paginationHTML += '<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">';

    // 上一页
    if (this.currentPage > 1) {
      paginationHTML += `<a href="#" class="page-link relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" data-page="${this.currentPage - 1}">上一页</a>`;
    }

    // 页码
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === this.currentPage;
      paginationHTML += `<a href="#" class="page-link relative inline-flex items-center px-4 py-2 border text-sm font-medium ${isActive ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}" data-page="${i}">${i}</a>`;
    }

    // 下一页
    if (this.currentPage < this.totalPages) {
      paginationHTML += `<a href="#" class="page-link relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50" data-page="${this.currentPage + 1}">下一页</a>`;
    }

    paginationHTML += '</nav>';
    paginationHTML += '</div>';
    paginationHTML += '</div>';
    paginationHTML += '</nav>';

    paginationContainer.innerHTML = paginationHTML;
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    this.loadExchangeRecords(page);
  }

  async refreshData() {
    await this.loadExchangeRecords(this.currentPage);
    this.showToast('数据已刷新', 'success');
  }

  async updateStats() {
    try {
      const response = await fetch('/api/points-exchange/admin/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const stats = data.data;
          
          // 更新统计信息
          const pendingCount = document.getElementById('pendingCount');
          const approvedCount = document.getElementById('approvedCount');
          const rejectedCount = document.getElementById('rejectedCount');
          const totalCount = document.getElementById('totalCount');

          if (pendingCount) pendingCount.textContent = stats.pending || 0;
          if (approvedCount) approvedCount.textContent = stats.approved || 0;
          if (rejectedCount) rejectedCount.textContent = stats.rejected || 0;
          if (totalCount) totalCount.textContent = stats.total || 0;
        }
      }
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }

  openApprovalModal(exchangeId) {
    console.log('openApprovalModal 被调用，exchangeId:', exchangeId);
    const exchange = this.exchanges.find(e => e.id == exchangeId);
    if (!exchange) {
      console.error('找不到对应的兑换记录:', exchangeId);
      return;
    }
    console.log('找到兑换记录:', exchange);

    this.currentExchange = exchange;
    
    // 填充模态框内容
    const exchangeDetails = document.getElementById('exchangeDetails');
    if (exchangeDetails) {
      exchangeDetails.innerHTML = `
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">用户：</span>
            <span class="text-sm font-medium">${exchange.username}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">商品：</span>
            <span class="text-sm font-medium">${exchange.product_name}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">积分：</span>
            <span class="text-sm font-medium">${exchange.points_spent}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">申请时间：</span>
            <span class="text-sm font-medium">${new Date(exchange.created_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      `;
    }

    // 显示模态框
    const modal = document.getElementById('approvalModal');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    console.log('模态框元素:', modal);
    console.log('模态框内容元素:', modalContent);
    
    if (modal && modalContent) {
      document.getElementById('exchangeId').value = exchangeId;
      console.log('移除hidden类');
      modal.classList.remove('hidden');
      
      setTimeout(() => {
        console.log('添加动画类');
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }, 10);
    } else {
      console.error('找不到模态框元素');
    }
  }

  viewExchangeDetails(exchangeId) {
    console.log('viewExchangeDetails 被调用，exchangeId:', exchangeId);
    const exchange = this.exchanges.find(e => e.id == exchangeId);
    if (!exchange) {
      console.error('找不到对应的兑换记录:', exchangeId);
      this.showNotification('找不到兑换记录', 'error');
      return;
    }

    console.log('找到兑换记录:', exchange);

    const statusConfig = this.getStatusConfig(exchange.status);
    const createdDate = new Date(exchange.created_at).toLocaleString('zh-CN');
    const completedDate = exchange.completed_at ? new Date(exchange.completed_at).toLocaleString('zh-CN') : '未完成';
    const quantity = exchange.quantity || 1;

    // 填充用户信息
    const userDetails = document.getElementById('userDetails');
    if (userDetails) {
      userDetails.innerHTML = `
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">用户名：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.username || '未知用户'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">邮箱：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.email || '无邮箱'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">用户ID：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.user_id}</span>
        </div>
      `;
    }

    // 填充商品信息
    const productDetails = document.getElementById('productDetails');
    if (productDetails) {
      productDetails.innerHTML = `
        <div class="flex items-center space-x-2 mb-2">
          <img class="w-8 h-8 rounded-lg object-cover" 
               src="${exchange.product_image || '/assets/ico/knowledge-star.svg'}" 
               alt="${exchange.product_name}"
               onerror="this.src='/assets/ico/knowledge-star.svg'">
          <div>
            <div class="text-xs font-medium text-gray-900 dark:text-white">${exchange.product_name || '未知商品'}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">商品ID: ${exchange.product_id}</div>
          </div>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">商品描述：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.product_description || '无描述'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">商品分类：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.category_name || '未分类'}</span>
        </div>
        ${quantity > 1 ? `
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">兑换数量：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${quantity}</span>
        </div>
        ` : ''}
      `;
    }

    // 填充兑换信息
    const exchangeInfo = document.getElementById('exchangeInfo');
    if (exchangeInfo) {
      exchangeInfo.innerHTML = `
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">兑换ID：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.id}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">消耗积分：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.points_spent} 积分</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">兑换状态：</span>
          <span class="text-xs font-medium ${exchange.status === 'approved' ? 'text-green-600 dark:text-green-400' : exchange.status === 'rejected' ? 'text-red-600 dark:text-red-400' : exchange.status === 'completed' ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}">
            ${statusConfig.text}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">申请时间：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${createdDate}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">完成时间：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${completedDate}</span>
        </div>
        ${exchange.requires_approval ? `
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">需要审批：</span>
          <span class="text-xs font-medium text-orange-600 dark:text-orange-400">是</span>
        </div>
        ` : ''}
      `;
    }

    // 填充审核信息（如果有）
    const approvalInfoSection = document.getElementById('approvalInfoSection');
    const approvalInfo = document.getElementById('approvalInfo');
    
    if (approvalInfoSection && approvalInfo) {
      if (exchange.status === 'approved' || exchange.status === 'rejected') {
        approvalInfoSection.classList.remove('hidden');
        approvalInfo.innerHTML = `
          <div class="flex justify-between">
            <span class="text-xs text-gray-600 dark:text-gray-400">审核结果：</span>
            <span class="text-xs font-medium ${exchange.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
              ${exchange.status === 'approved' ? '通过' : '拒绝'}
            </span>
          </div>
          ${exchange.approval_notes ? `
          <div class="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.approval_notes}</span>
          </div>
          ` : ''}
          ${exchange.approved_by_username ? `
          <div class="flex justify-between">
            <span class="text-xs text-gray-600 dark:text-gray-400">审核人：</span>
            <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.approved_by_username}</span>
          </div>
          ` : ''}
          ${exchange.approved_at ? `
          <div class="flex justify-between">
            <span class="text-xs text-gray-600 dark:text-gray-400">审核时间：</span>
            <span class="text-xs font-medium text-gray-900 dark:text-white">${new Date(exchange.approved_at).toLocaleString('zh-CN')}</span>
          </div>
          ` : ''}
        `;
      } else {
        approvalInfoSection.classList.add('hidden');
      }
    }

    // 显示详情模态框
    const modal = document.getElementById('detailsModal');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (modal && modalContent) {
      console.log('显示详情模态框');
      modal.classList.remove('hidden');
      
      setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }, 10);
    } else {
      console.error('找不到详情模态框元素');
    }
  }

  async approveExchangeRecord(exchangeId, isApproved) {
    console.log('approveExchangeRecord 被调用:', exchangeId, isApproved);
    
    // 确认操作
    const action = isApproved ? '通过' : '拒绝';
    const message = `确定要${action}这个兑换申请吗？此操作不可撤销。`;
    
    const confirmed = await this.showConfirmDialog(message);
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/points-exchange/admin/exchanges/${exchangeId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          approved: isApproved,
          notes: '' // 可以后续添加备注输入功能
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.showToast(`兑换申请已${action}`, 'success');
        
        // 刷新数据
        await this.refreshData();
      } else {
        this.showToast(result.error || '操作失败', 'error');
      }
    } catch (error) {
      console.error('审核操作失败:', error);
      this.showToast('操作失败，请重试', 'error');
    }
  }

  async deleteExchangeRecord(exchangeId) {
    console.log('deleteExchangeRecord 被调用:', exchangeId);
    
    // 确认删除操作
    const message = '确定要删除这个兑换记录吗？此操作不可撤销，删除后将无法恢复。';
    
    const confirmed = await this.showConfirmDialog(message);
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/points-exchange/admin/exchanges/${exchangeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      
      if (result.success) {
        this.showToast('兑换记录已删除', 'success');
        
        // 刷新数据
        await this.refreshData();
      } else {
        this.showToast(result.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除操作失败:', error);
      this.showToast('删除失败，请重试', 'error');
    }
  }

  showNotification(message, type = 'info', duration = 3000) {
    if (window.showNotification) {
      window.showNotification(message, type, duration);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  getStatusConfig(status) {
    const statusConfig = {
      pending: {
        class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        text: '待审核'
      },
      approved: {
        class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        text: '已通过'
      },
      rejected: {
        class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        text: '已拒绝'
      },
      completed: {
        class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        text: '已完成'
      }
    };

    return statusConfig[status] || statusConfig.pending;
  }

  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  }
}

// 全局函数
function closeApprovalModal() {
  const modal = document.getElementById('approvalModal');
  const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
  
  if (modal && modalContent) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
  
  if (modal && modalContent) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }
}

async function approveExchange(isApproved) {
  const exchangeId = document.getElementById('exchangeId').value;
  const notes = document.getElementById('approvalNotes').value;
  
  if (!exchangeId) return;

  try {
    const response = await fetch(`/api/points-exchange/admin/exchanges/${exchangeId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        approved: isApproved,
        notes: notes
      })
    });

    const result = await response.json();
    
    if (result.success) {
      const action = isApproved ? '通过' : '拒绝';
      if (window.adminExchangeApproval) {
        window.adminExchangeApproval.showToast(`兑换申请已${action}`, 'success');
      }
      closeApprovalModal();
      
      // 刷新数据
      if (window.adminExchangeApproval) {
        window.adminExchangeApproval.refreshData();
      }
    } else {
      if (window.adminExchangeApproval) {
        window.adminExchangeApproval.showToast(result.error || '操作失败', 'error');
      }
    }
  } catch (error) {
    console.error('审核操作失败:', error);
    if (window.adminExchangeApproval) {
      window.adminExchangeApproval.showToast('操作失败，请重试', 'error');
    }
  }
}

// 全局实例
let adminExchangeApproval;

// 初始化函数
function initAdminExchangeApproval() {
  if (typeof AdminExchangeApproval !== 'undefined') {
    adminExchangeApproval = new AdminExchangeApproval();
    adminExchangeApproval.init();
    window.adminExchangeApproval = adminExchangeApproval;
    console.log('AdminExchangeApproval 实例已创建');
  } else {
    console.error('AdminExchangeApproval 类未定义');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminExchangeApproval);
} else {
  initAdminExchangeApproval();
}