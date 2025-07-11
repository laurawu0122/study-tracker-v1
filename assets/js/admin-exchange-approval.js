// 兑换审核管理
class AdminExchangeApproval {
  constructor() {
    console.log('AdminExchangeApproval 构造函数被调用');
    
    // 清理之前的实例
    if (window.adminExchangeApproval && window.adminExchangeApproval !== this) {
      console.log('清理之前的 AdminExchangeApproval 实例');
      window.adminExchangeApproval.destroy();
    }
    
    this.exchanges = [];
    this.pendingRecords = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalRecords = 0;
    this.filters = {
      status: '',
      user_id: ''
    };
    this.statsRefreshInterval = null;
    
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
    // 使用演示模式通知系统
    window.demoModeShowToast(message, type, duration);
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
    
    // 清理之前的定时器
    if (this.statsRefreshInterval) {
      clearInterval(this.statsRefreshInterval);
      this.statsRefreshInterval = null;
    }
    
    await this.loadData();
    this.bindEvents();
    await this.updateStats();
    
    // 设置定时刷新统计信息和兑换记录（每30秒刷新一次）
    this.statsRefreshInterval = setInterval(() => {
      console.log('定时刷新统计信息和兑换记录...');
      this.updateStats();
      this.loadExchangeRecords(this.currentPage); // 同时刷新兑换记录列表
    }, 30000);
    
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
    this.showUpdatingIndicator(true);
    
    try {
      const params = new URLSearchParams({
        page: page,
        limit: 10,
        ...this.filters
      });

      const response = await fetch(window.isDemo ? `/demo/api/points-exchange/admin/exchange-records?${params}` : getApiUrl(`/api/points-exchange/admin/exchange-records?${params}`), {
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
    } finally {
      this.showUpdatingIndicator(false);
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

    // 使用事件委托，监听tbody的点击事件
    tbody.addEventListener('click', (e) => {
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
        console.log('准备打开审核弹窗');
        this.openApprovalModal(exchangeId);
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
        // 检查是否是分页按钮
        if (e.target.id === 'prevBtn' || e.target.id === 'nextBtn') {
          e.preventDefault();
          const page = parseInt(e.target.getAttribute('data-page'));
          if (page && page !== this.currentPage && page >= 1 && page <= this.totalPages) {
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
      tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">演示兑换记录</td></tr>';
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
              <div class="text-sm font-medium text-gray-900 dark:text-white">${exchange.username || '演示用户'}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${exchange.email || 'demo@example.com'}</div>
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
                ${exchange.product_name || '演示商品'}
                ${quantity > 1 ? `<span class="text-xs text-gray-500 dark:text-gray-400 ml-1">x${quantity}</span>` : ''}
              </div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${exchange.product_description || '演示商品描述'}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <span class="font-medium">${exchange.points_spent || 0}</span> 积分
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
                      class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="审核申请">
                <i class="fas fa-clipboard-check"></i>
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
  }

  renderPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) return;

    if (this.totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    // 使用与项目管理页面一致的分页样式
    const startRecord = this.totalRecords > 0 ? (this.currentPage - 1) * 10 + 1 : 0;
    const endRecord = Math.min(this.currentPage * 10, this.totalRecords);
    
    let paginationHTML = '<div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">';
    
    // 左侧信息
    paginationHTML += '<div class="text-sm text-gray-700 dark:text-gray-300">';
    paginationHTML += `显示第 ${startRecord} 到 ${endRecord} 条，共 ${this.totalRecords} 条记录`;
    paginationHTML += '</div>';
    
    // 右侧分页按钮
    paginationHTML += '<div class="flex items-center space-x-2">';
    
    // 上一页按钮
    paginationHTML += `<button id="prevBtn" class="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" ${this.currentPage === 1 ? 'disabled' : ''} data-page="${this.currentPage - 1}">上一页</button>`;
    
    // 页码信息
    paginationHTML += `<span class="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">第 ${this.currentPage} 页，共 ${this.totalPages} 页</span>`;
    
    // 下一页按钮
    paginationHTML += `<button id="nextBtn" class="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" ${this.currentPage === this.totalPages ? 'disabled' : ''} data-page="${this.currentPage + 1}">下一页</button>`;
    
    paginationHTML += '</div>';
    paginationHTML += '</div>';

    paginationContainer.innerHTML = paginationHTML;
  }

  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    this.loadExchangeRecords(page);
  }

  async refreshData() {
    console.log('refreshData 开始执行...');
    // 同时刷新兑换记录和统计信息
    await Promise.all([
      this.loadExchangeRecords(this.currentPage),
      this.updateStats()
    ]);
    
    // 如果待审核弹窗是打开的，也刷新待审核记录
    const pendingModal = document.getElementById('pendingModal');
    if (pendingModal && !pendingModal.classList.contains('hidden')) {
      console.log('待审核弹窗已打开，刷新待审核记录');
      await this.loadPendingRecords();
    }
    
    console.log('兑换记录和统计信息更新完成');
    this.showToast('数据已刷新', 'success');
  }

  async updateStats() {
    console.log('开始更新统计信息...');
    try {
      const response = await fetch(window.isDemo ? '/demo/api/points-exchange/admin/exchange-stats' : getApiUrl('/api/points-exchange/admin/exchange-stats'), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const stats = data.data;
          console.log('获取到统计信息:', stats);
          
          // 更新统计信息
          const pendingCount = document.getElementById('pendingCount');
          const approvedCount = document.getElementById('approvedCount');
          const rejectedCount = document.getElementById('rejectedCount');
          const totalPoints = document.getElementById('totalPoints');

          if (pendingCount) {
            pendingCount.textContent = stats.pending || 0;
            console.log('更新待审核数量:', stats.pending || 0);
          }
          if (approvedCount) {
            approvedCount.textContent = stats.approved || 0;
            console.log('更新已通过数量:', stats.approved || 0);
          }
          if (rejectedCount) {
            rejectedCount.textContent = stats.rejected || 0;
            console.log('更新已拒绝数量:', stats.rejected || 0);
          }
          if (totalPoints) {
            totalPoints.textContent = stats.totalPoints || 0;
            console.log('更新总积分:', stats.totalPoints || 0);
          }
          
          console.log('统计信息更新完成');
        } else {
          console.error('获取统计信息失败:', data.error);
        }
      } else {
        console.error('统计信息API请求失败:', response.status);
      }
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }

  openApprovalModal(exchangeId) {
    console.log('openApprovalModal 被调用，exchangeId:', exchangeId);
    
    // 先关闭其他可能打开的弹窗
    this.closeAllModals();
    
    // 首先从主兑换记录列表中查找
    let exchange = this.exchanges.find(e => e.id == exchangeId);
    
    // 如果没找到，尝试从待审核记录中查找
    if (!exchange && this.pendingRecords) {
      exchange = this.pendingRecords.find(e => e.id == exchangeId);
    }
    
    if (!exchange) {
      console.error('找不到对应的兑换记录:', exchangeId);
      this.showToast('找不到对应的兑换记录', 'error');
      return;
    }
    console.log('找到兑换记录:', exchange);

    this.currentExchange = exchange;
    
    // 填充模态框内容
    const exchangeDetails = document.getElementById('exchangeDetails');
    if (exchangeDetails) {
      // 根据数据结构调整字段名
      const username = exchange.username || (exchange.user && exchange.user.username);
      const productName = exchange.product_name || (exchange.product && exchange.product.name);
      const pointsSpent = exchange.points_spent || exchange.points_required;
      
      exchangeDetails.innerHTML = `
        <div class="space-y-3">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">用户：</span>
            <span class="text-sm font-medium">${username}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">商品：</span>
            <span class="text-sm font-medium">${productName}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">积分：</span>
            <span class="text-sm font-medium">${pointsSpent}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">数量：</span>
            <span class="text-sm font-medium">${exchange.quantity || 1}</span>
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
    const modalContent = modal?.querySelector('.custom-modal-content');
    
    console.log('模态框元素:', modal);
    console.log('模态框内容元素:', modalContent);
    
    if (modal && modalContent) {
      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
      
      // 设置兑换ID
      document.getElementById('exchangeId').value = exchangeId;
      
      // 填充申请详情
      const username = exchange.username || (exchange.user && exchange.user.username) || '演示用户';
      const productName = exchange.product_name || (exchange.product && exchange.product.name) || '演示商品';
      const pointsSpent = exchange.points_spent || exchange.points_required || 0;
      const quantity = exchange.quantity || 1;
      const createdAt = new Date(exchange.created_at).toLocaleString('zh-CN');
      
      // 更新详情内容
      const detailsContainer = modalContent.querySelector('.bg-gray-50');
      if (detailsContainer) {
        const spans = detailsContainer.querySelectorAll('span:last-child');
        if (spans.length >= 5) {
          spans[0].textContent = username;
          spans[1].textContent = productName;
          spans[2].textContent = pointsSpent + ' 积分';
          spans[3].textContent = quantity;
          spans[4].textContent = createdAt;
        }
      }
      
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
    
    // 先关闭其他可能打开的弹窗
    this.closeAllModals();
    
    // 首先从主兑换记录列表中查找
    let exchange = this.exchanges.find(e => e.id == exchangeId);
    
    // 如果没找到，尝试从待审核记录中查找
    if (!exchange && this.pendingRecords) {
      exchange = this.pendingRecords.find(e => e.id == exchangeId);
    }
    
    if (!exchange) {
      console.error('找不到对应的兑换记录:', exchangeId);
      this.showToast('找不到对应的兑换记录', 'error');
      return;
    }

    console.log('找到兑换记录:', exchange);

    const statusConfig = this.getStatusConfig(exchange.status);
    const createdDate = exchange.created_at ? new Date(exchange.created_at).toLocaleString('zh-CN') : '2025-01-21 10:00:00';
    const completedDate = exchange.completed_at ? new Date(exchange.completed_at).toLocaleString('zh-CN') : '未完成';
    const quantity = exchange.quantity || 1;

    // 填充用户信息
    const userDetails = document.getElementById('userDetails');
    if (userDetails) {
      const username = exchange.username || (exchange.user && exchange.user.username);
      const email = exchange.email || (exchange.user && exchange.user.email);
      const userId = exchange.user_id || (exchange.user && exchange.user.id);
      
      userDetails.innerHTML = `
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">用户名：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${username || '演示用户'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">邮箱：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${email || 'demo@example.com'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">用户ID：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${userId || '1'}</span>
        </div>
      `;
    }

    // 填充商品信息
    const productDetails = document.getElementById('productDetails');
    if (productDetails) {
      const productName = exchange.product_name || (exchange.product && exchange.product.name);
      const productImage = exchange.product_image || (exchange.product && exchange.product.image_url);
      const productDescription = exchange.product_description || (exchange.product && exchange.product.description);
      const categoryName = exchange.category_name || (exchange.category && exchange.category.name);
      const productId = exchange.product_id || (exchange.product && exchange.product.id);
      
      productDetails.innerHTML = `
        <div class="flex items-center space-x-2 mb-2">
          <img class="w-8 h-8 rounded-lg object-cover" 
               src="${productImage || '/assets/ico/knowledge-star.svg'}" 
               alt="${productName}"
               onerror="this.src='/assets/ico/knowledge-star.svg'">
          <div>
            <div class="text-xs font-medium text-gray-900 dark:text-white">${productName || '演示商品'}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">商品ID: ${productId || '1'}</div>
          </div>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">商品描述：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${productDescription || '演示商品描述'}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">商品分类：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${categoryName || '演示分类'}</span>
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
      const pointsSpent = exchange.points_spent || exchange.points_required;
      
      exchangeInfo.innerHTML = `
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">兑换ID：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.id}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-xs text-gray-600 dark:text-gray-400">消耗积分：</span>
          <span class="text-xs font-medium text-gray-900 dark:text-white">${pointsSpent || 0} 积分</span>
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
        ${(exchange.requires_approval || (exchange.product && exchange.product.requires_approval)) ? `
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
          ${(exchange.approved_by_username || exchange.approved_by_user) ? `
          <div class="flex justify-between">
            <span class="text-xs text-gray-600 dark:text-gray-400">审核人：</span>
            <span class="text-xs font-medium text-gray-900 dark:text-white">${exchange.approved_by_username || exchange.approved_by_user}</span>
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
    const modalContent = modal?.querySelector('.custom-modal-content');
    
    if (modal && modalContent) {
      document.body.style.overflow = 'hidden';
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
      const response = await fetch(window.isDemo ? `/demo/api/points-exchange/admin/exchanges/${exchangeId}/approve` : getApiUrl(`/api/points-exchange/admin/exchanges/${exchangeId}/approve`), {
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
        console.log('审核操作成功，开始刷新数据...');
        await this.refreshData();
        console.log('数据刷新完成');
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
      const response = await fetch(window.isDemo ? `/demo/api/points-exchange/admin/exchanges/${exchangeId}` : getApiUrl(`/api/points-exchange/admin/exchanges/${exchangeId}`), {
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

  showUpdatingIndicator(show) {
    const indicator = document.getElementById('autoRefreshIndicator');
    if (!indicator) return;
    
    if (show) {
      indicator.classList.remove('hidden');
      indicator.querySelector('span').textContent = '更新中...';
    } else {
      indicator.querySelector('span').textContent = '自动更新中';
    }
  }

  formatDateTime(timestamp) {
    if (!timestamp) return '2025-01-21 10:00:00';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '2025-01-21 10:00:00';
    
    return date.toLocaleString('zh-CN');
  }

  // 清理资源
  destroy() {
    if (this.statsRefreshInterval) {
      clearInterval(this.statsRefreshInterval);
      this.statsRefreshInterval = null;
    }
  }

  // 关闭所有弹窗
  closeAllModals() {
    const modals = [
      'pendingModal',
      'userPointsModal', 
      'detailsModal'
    ];
    
    modals.forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (modal && !modal.classList.contains('hidden')) {
        const modalContent = modal.querySelector('.custom-modal-content');
        if (modalContent) {
          modalContent.classList.remove('scale-100', 'opacity-100');
          modalContent.classList.add('scale-95', 'opacity-0');
          setTimeout(() => {
            modal.classList.add('hidden');
          }, 300);
        }
      }
    });
    
    // 恢复背景滚动
    document.body.style.overflow = '';
  }

  // 用户积分弹窗相关方法
  async showUserPointsModal() {
    console.log('显示用户积分弹窗');
    
    // 先关闭其他可能打开的弹窗
    this.closeAllModals();
    
    const modal = document.getElementById('userPointsModal');
    const modalContent = modal?.querySelector('.custom-modal-content');
    if (modal && modalContent) {
      document.body.style.overflow = 'hidden';
      modal.classList.remove('hidden');
      setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }, 10);
      await this.loadUserPoints();
    }
  }

  closeUserPointsModal() {
    console.log('关闭用户积分弹窗');
    const modal = document.getElementById('userPointsModal');
    const modalContent = modal?.querySelector('.custom-modal-content');
    if (modal && modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }
  }

  async loadUserPoints() {
    try {
      console.log('开始加载用户积分数据...');
      
      const response = await fetch(getApiUrl('/api/admin/users/points'), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.renderUserPoints(data.users);
        } else {
          console.error('获取用户积分失败:', data.error);
          this.showToast('获取用户积分失败: ' + data.error, 'error');
        }
      } else {
        console.error('获取用户积分请求失败:', response.status);
        this.showToast('获取用户积分失败', 'error');
      }
    } catch (error) {
      console.error('加载用户积分数据失败:', error);
      this.showToast('加载用户积分数据失败: ' + error.message, 'error');
    }
  }

  renderUserPoints(users) {
    const userPointsList = document.getElementById('userPointsList');
    const totalUsersCount = document.getElementById('totalUsersCount');
    
    if (!userPointsList || !totalUsersCount) {
      console.error('用户积分列表元素未找到');
      return;
    }

    // 更新用户总数
    totalUsersCount.textContent = users.length;

    // 渲染用户积分列表
    const usersHTML = users.map((user, index) => {
      const roleBadge = user.role === 'admin' 
        ? '<span class="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">管理员</span>'
        : '<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">用户</span>';
      
      const lastUpdated = user.last_updated 
        ? new Date(user.last_updated).toLocaleString('zh-CN')
        : '未更新';
      
      // 头像显示逻辑
      const avatarHTML = user.avatar 
        ? `<img class="h-10 w-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600" src="/uploads/avatars/${user.avatar}" alt="${user.username}" onerror="this.parentElement.innerHTML='<div class=\\'h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600\\'><span class=\\'text-white text-sm font-semibold\\'>${user.username.charAt(0).toUpperCase()}</span></div>'">`
        : `<div class="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
            <span class="text-white text-sm font-semibold">${user.username.charAt(0).toUpperCase()}</span>
           </div>`;
      
      return `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 w-full">
          <!-- 用户信息行 -->
          <div class="flex items-center justify-between mb-3 w-full">
            <div class="flex items-center gap-2 flex-1">
              ${avatarHTML}
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-900 dark:text-white text-sm truncate">${user.username}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${user.email}</div>
              </div>
            </div>
            <div class="flex-shrink-0 ml-2">
              ${roleBadge}
            </div>
          </div>
          
          <!-- 积分信息行 - 横向排列 -->
          <div class="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-2 mb-2 w-full">
            <div class="flex-1 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">总积分</div>
              <div class="font-bold text-base text-purple-600 dark:text-purple-400">${user.total_points.toLocaleString()}</div>
            </div>
            <div class="flex-1 text-center border-r border-gray-200 dark:border-gray-600 last:border-r-0">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">可用积分</div>
              <div class="font-bold text-base text-green-600 dark:text-green-400">${user.available_points.toLocaleString()}</div>
            </div>
            <div class="flex-1 text-center">
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">已用积分</div>
              <div class="font-bold text-base text-orange-600 dark:text-orange-400">${user.used_points.toLocaleString()}</div>
            </div>
          </div>
          
          <!-- 更新时间 -->
          <div class="text-xs text-gray-500 dark:text-gray-400 text-center">
            <i class="fas fa-clock mr-1"></i>${lastUpdated}
          </div>
        </div>
      `;
    }).join('');

    userPointsList.innerHTML = usersHTML;
    console.log(`成功渲染 ${users.length} 个用户的积分信息`);
  }

  // 待审核弹窗相关方法
  async showPendingModal() {
    console.log('显示待审核弹窗');
    
    // 先关闭其他可能打开的弹窗
    this.closeAllModals();
    
    const modal = document.getElementById('pendingModal');
    const modalContent = modal?.querySelector('.custom-modal-content');
    if (modal && modalContent) {
      document.body.style.overflow = 'hidden';
      modal.classList.remove('hidden');
      setTimeout(() => {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }, 10);
      await this.loadPendingRecords();
    }
  }

  closePendingModal() {
    console.log('关闭待审核弹窗');
    const modal = document.getElementById('pendingModal');
    const modalContent = modal?.querySelector('.custom-modal-content');
    if (modal && modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }, 300);
    }
  }

  async loadPendingRecords() {
    try {
      console.log('开始加载待审核记录...');
      const response = await fetch(window.isDemo ? '/demo/api/points-exchange/admin/exchange/pending' : getApiUrl('/api/points-exchange/admin/exchange/pending'), {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // 保存待审核记录到实例中
          this.pendingRecords = data.records;
          this.renderPendingRecords(data.records);
          console.log(`成功加载 ${data.records.length} 条待审核记录`);
        } else {
          console.error('获取待审核记录失败:', data.error);
          this.showToast('获取待审核记录失败: ' + data.error, 'error');
        }
      } else {
        console.error('获取待审核记录请求失败:', response.status);
        this.showToast('获取待审核记录失败', 'error');
      }
    } catch (error) {
      console.error('加载待审核记录失败:', error);
      this.showToast('加载待审核记录失败: ' + error.message, 'error');
    }
  }

  renderPendingRecords(records) {
    const pendingRecordsList = document.getElementById('pendingRecordsList');
    const pendingRecordsCount = document.getElementById('pendingRecordsCount');
    
    if (!pendingRecordsList || !pendingRecordsCount) {
      console.error('待审核记录列表元素未找到');
      return;
    }

    // 更新记录总数
    pendingRecordsCount.textContent = records.length;

    if (records.length === 0) {
      pendingRecordsList.innerHTML = '<p>演示待审核记录</p>';
      return;
    }

    // 渲染待审核记录列表
    const recordsHTML = records.map((record, index) => {
      // 头像显示逻辑
      const avatarHTML = record.user.avatar 
        ? `<img class="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-600" src="/uploads/avatars/${record.user.avatar}" alt="${record.user.username}" onerror="this.parentElement.innerHTML='<div class=\\'h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border border-gray-200 dark:border-gray-600\\'><span class=\\'text-white text-xs font-semibold\\'>${record.user.username.charAt(0).toUpperCase()}</span></div>'">`
        : `<div class="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border border-gray-200 dark:border-gray-600">
            <span class="text-white text-xs font-semibold">${record.user.username.charAt(0).toUpperCase()}</span>
           </div>`;
      
      const createdTime = new Date(record.created_at).toLocaleString('zh-CN');
      
      return `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 w-full">
          <!-- 用户信息行 -->
          <div class="flex items-center justify-between mb-3 w-full">
            <div class="flex items-center gap-3 flex-1">
              ${avatarHTML}
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-900 dark:text-white text-sm truncate">${record.user.username}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${record.user.email}</div>
              </div>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              <i class="fas fa-clock mr-1"></i>${createdTime}
            </div>
          </div>
          
          <!-- 商品信息行 -->
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3 w-full">
            <div class="flex items-center justify-center space-x-4 w-full">
              <!-- 学习证书名称 -->
              <div class="flex-1 text-center min-w-0">
                <div class="font-medium text-gray-900 dark:text-white text-sm truncate">${record.product.name}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${record.product.description || '演示商品描述'}</div>
              </div>
              <!-- 积分信息 -->
              <div class="text-center flex-shrink-0">
                <div class="text-sm font-bold text-red-600 dark:text-red-400">-${record.points_required.toLocaleString()}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">积分</div>
              </div>
              <!-- 数量信息 -->
              <div class="text-center flex-shrink-0">
                <div class="text-sm font-bold text-blue-600 dark:text-blue-400">${record.quantity || 1}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">数量</div>
              </div>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="grid grid-cols-3 gap-2 w-full">
            <button onclick="viewExchangeDetails(${record.id})" class="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-sm w-full">
              <i class="fas fa-eye mr-1"></i>详情
            </button>
            <button onclick="openApprovalModal(${record.id})" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm w-full">
              <i class="fas fa-check mr-1"></i>审核
            </button>
            <button onclick="deleteExchangeRecord(${record.id})" class="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm w-full">
              <i class="fas fa-trash mr-1"></i>删除
            </button>
          </div>
        </div>
      `;
    }).join('');

    pendingRecordsList.innerHTML = recordsHTML;
    console.log(`成功渲染 ${records.length} 条待审核记录`);
  }
}

// 全局函数
function closeApprovalModal() {
  const modal = document.getElementById('approvalModal');
  const modalContent = modal?.querySelector('.custom-modal-content');
  
  if (modal && modalContent) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
      modal.classList.add('hidden');
      // 恢复背景滚动
      document.body.style.overflow = '';
    }, 300);
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('detailsModal');
  const modalContent = modal?.querySelector('.custom-modal-content');
  if (modal && modalContent) {
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  }
}

// 用户积分弹窗全局函数
function showUserPointsModal() {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.showUserPointsModal();
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

function closeUserPointsModal() {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.closeUserPointsModal();
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

function refreshUserPoints() {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.loadUserPoints();
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

// 待审核弹窗全局函数
function showPendingModal() {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.showPendingModal();
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

function closePendingModal() {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.closePendingModal();
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

function refreshPendingRecords() {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.loadPendingRecords();
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

// 添加缺失的全局函数
function openApprovalModal(exchangeId) {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.openApprovalModal(exchangeId);
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

function viewExchangeDetails(exchangeId) {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.viewExchangeDetails(exchangeId);
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

function deleteExchangeRecord(exchangeId) {
  if (window.adminExchangeApproval) {
    window.adminExchangeApproval.deleteExchangeRecord(exchangeId);
  } else {
    console.error('adminExchangeApproval 实例未找到');
  }
}

async function approveExchange(isApproved) {
  const exchangeId = document.getElementById('exchangeId').value;
  const notes = document.getElementById('approvalNotes').value;
  
  if (!exchangeId) return;

  try {
    const response = await fetch(window.isDemo ? `/demo/api/points-exchange/admin/exchanges/${exchangeId}/approve` : getApiUrl(`/api/points-exchange/admin/exchanges/${exchangeId}/approve`), {
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

// 初始化函数 - 由页面脚本执行逻辑调用
function initAdminExchangeApproval() {
  if (typeof AdminExchangeApproval !== 'undefined') {
    // 清理之前的实例
    if (window.adminExchangeApproval) {
      console.log('清理现有 AdminExchangeApproval 实例');
      window.adminExchangeApproval.destroy();
    }
    
    adminExchangeApproval = new AdminExchangeApproval();
    adminExchangeApproval.init();
    window.adminExchangeApproval = adminExchangeApproval;
    console.log('AdminExchangeApproval 实例已创建');
  } else {
    console.error('AdminExchangeApproval 类未定义');
  }
}

// fetch 路径适配函数
function getApiUrl(path) {
  return window.isDemo ? `/demo${path}` : path;
}