// 积分兑换页面类
class PointsExchangePage {
  constructor() {
    this.products = [];
    this.categories = [];
    this.userPoints = 0;
    this.currentFilters = {
      search: '',
      category: '',
      maxPoints: ''
    };
    this.eventListeners = []; // 存储事件监听器，用于清理
    
    // 等待DOM加载完成后再初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      // DOM已经加载完成，延迟一点确保所有元素都已渲染
      setTimeout(() => this.init(), 100);
    }
  }

  async init() {
    console.log('开始初始化积分兑换页面');
    
    // 检查必要的DOM元素是否存在
    const requiredElements = [
      'userPoints',
      'categoryFilter', 
      'productsGrid',
      'loadingState',
      'emptyState'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
      console.error('缺少必要的DOM元素:', missingElements);
      // 等待一段时间后重试
      setTimeout(() => this.init(), 500);
      return;
    }
    
    console.log('DOM元素检查通过，开始加载数据');
    
    try {
      await this.loadUserPoints();
      await this.loadCategories();
      await this.loadProducts();
      this.bindEvents();
      console.log('积分兑换页面初始化完成');
    } catch (error) {
      console.error('积分兑换页面初始化失败:', error);
    }
  }

  // 清理页面实例
  destroy() {
    console.log('开始清理积分兑换页面实例');
    
    // 移除所有事件监听器
    this.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    this.eventListeners = [];
    
    // 清理定时器
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }
    
    // 清理数据
    this.products = [];
    this.categories = [];
    this.userPoints = 0;
    this.currentFilters = {
      search: '',
      category: '',
      maxPoints: ''
    };
    
    console.log('积分兑换页面实例清理完成');
  }

  // 添加事件监听器（带清理功能）
  addEventListener(element, event, handler) {
    if (element && element.addEventListener) {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    }
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
      console.log('用户积分API响应:', data);
      
      if (data.success && data.data) {
        this.userPoints = data.data.available_points || 0;
        const userPointsElement = document.getElementById('userPoints');
        if (userPointsElement) {
          userPointsElement.textContent = this.userPoints;
        }
        console.log('用户积分加载成功:', this.userPoints);
      } else {
        console.error('用户积分API返回错误:', data);
        this.userPoints = 0;
      }
    } catch (error) {
      console.error('加载用户积分失败:', error);
      this.userPoints = 0;
    }
  }

  async loadCategories() {
    try {
      const response = await fetch('/api/points-exchange/categories', {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        credentials: 'include'
      });
      const data = await response.json();
      console.log('商品分类API响应:', data);
      
      if (data.success && data.data) {
        this.categories = data.data;
        this.renderCategoryFilter();
        console.log('商品分类加载成功，数量:', this.categories.length);
      } else {
        console.error('商品分类API返回错误:', data);
      }
    } catch (error) {
      console.error('加载商品分类失败:', error);
    }
  }

  async loadProducts() {
    this.showLoading(true);
    try {
      const params = new URLSearchParams();
      if (this.currentFilters.category) params.append('category_id', this.currentFilters.category);
      if (this.currentFilters.maxPoints) params.append('max_points', this.currentFilters.maxPoints);
      if (this.currentFilters.search) params.append('search', this.currentFilters.search);

      const response = await fetch(`/api/points-exchange/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        credentials: 'include'
      });
      const data = await response.json();
      console.log('商品API响应:', data);
      
      if (data.success && data.data) {
        this.products = data.data;
        this.renderProducts();
        console.log('商品加载成功，数量:', this.products.length);
      } else {
        console.error('商品API返回错误:', data);
      }
    } catch (error) {
      console.error('加载商品失败:', error);
    } finally {
      this.showLoading(false);
    }
  }

  renderCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) {
      console.error('找不到categoryFilter元素');
      return;
    }
    
    select.innerHTML = '<option value="">全部分类</option>';
    
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      select.appendChild(option);
    });
  }

  renderProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    if (!grid) {
      console.error('找不到productsGrid元素');
      return;
    }
    grid.innerHTML = '';
    if (this.products.length === 0) {
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
      return;
    }
    if (emptyState) {
      emptyState.classList.add('hidden');
    }
    // 只渲染一次每个商品
    this.products.forEach(product => {
      const card = this.createProductCard(product);
      grid.appendChild(card);
    });
  }

  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 cursor-pointer';
    
    const canAfford = this.userPoints >= product.points_required;
    const stockStatus = product.stock_quantity === -1 ? '无限' : product.stock_quantity;

    card.innerHTML = `
      <div class="relative">
        <div class="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          ${product.image_url ? 
            `<img src="${product.image_url}" alt="${product.name}" class="h-full w-full object-cover">` :
            `<i class="fas fa-image text-4xl text-gray-400"></i>`
          }
        </div>
        ${product.requires_approval ? 
          '<div class="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">需审核</div>' : ''
        }
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-2">${product.name}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">${product.description || ''}</p>
        <div class="flex justify-between items-center mb-3">
          <span class="text-sm text-gray-600 dark:text-gray-300">${product.category_name}</span>
          <span class="text-sm text-gray-600 dark:text-gray-300">库存: ${stockStatus}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <span class="text-yellow-600 dark:text-yellow-400 font-bold">${product.points_required}</span>
            <span class="text-sm text-gray-600 dark:text-gray-300 ml-1">积分</span>
          </div>
          <button class="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${
            canAfford ? 
              'bg-purple-600 hover:bg-purple-700 text-white' : 
              'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }">
            ${canAfford ? '立即兑换' : '积分不足'}
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', () => this.showProductModal(product));
    return card;
  }

  showProductModal(product) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.id = 'productModal';
    
    const canAfford = this.userPoints >= product.points_required;
    const stockStatus = product.stock_quantity === -1 ? '无限' : product.stock_quantity;
    const maxQuantity = product.stock_quantity === -1 ? 10 : Math.min(stockStatus, 10); // 限制最大数量为10
    
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 transform transition-all duration-300">
        <div class="text-center">
          <div class="mx-auto h-32 w-32 mb-4 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            ${product.image_url ? 
              `<img src="${product.image_url}" alt="${product.name}" class="h-full w-full object-cover rounded-lg">` :
              `<i class="fas fa-image text-4xl text-gray-400"></i>`
            }
          </div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-2">${product.name}</h3>
          <p class="text-gray-600 dark:text-gray-300 mb-4">${product.description || ''}</p>
          <div class="flex justify-between items-center mb-4">
            <span class="text-sm text-gray-600 dark:text-gray-300">分类：</span>
            <span class="text-sm font-medium text-gray-800 dark:text-white">${product.category_name}</span>
          </div>
          <div class="flex justify-between items-center mb-4">
            <span class="text-sm text-gray-600 dark:text-gray-300">库存：</span>
            <span class="text-sm font-medium text-gray-800 dark:text-white">${stockStatus}</span>
          </div>
          <div class="flex justify-between items-center mb-4">
            <span class="text-sm text-gray-600 dark:text-gray-300">单价：</span>
            <span class="text-lg font-bold text-yellow-600 dark:text-yellow-400">${product.points_required} 积分</span>
          </div>
          
          <!-- 数量选择器 -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">兑换数量：</label>
            <div class="flex items-center justify-center space-x-3">
              <button id="decreaseBtn" class="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
                <i class="fas fa-minus text-xs"></i>
              </button>
              <input type="text" id="quantityInput" value="1" 
                     class="w-16 text-center border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                     pattern="[0-9]*" inputmode="numeric">
              <button id="increaseBtn" class="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center">
                <i class="fas fa-plus text-xs"></i>
              </button>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              总计：<span id="totalPoints" class="font-medium">${product.points_required}</span> 积分
            </div>
          </div>
          
          <div id="modalMessage" class="mb-4 text-sm text-center hidden"></div>
          <div class="flex space-x-3">
            <button id="cancelBtn" class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300">
              取消
            </button>
            <button id="exchangeBtn" class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-300">
              立即兑换
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 绑定数量选择事件
    const quantityInput = modal.querySelector('#quantityInput');
    const decreaseBtn = modal.querySelector('#decreaseBtn');
    const increaseBtn = modal.querySelector('#increaseBtn');
    const totalPoints = modal.querySelector('#totalPoints');
    const exchangeBtn = modal.querySelector('#exchangeBtn');

    // 更新总积分显示
    const updateTotalPoints = () => {
      const quantity = parseInt(quantityInput.value) || 1;
      const total = quantity * product.points_required;
      totalPoints.textContent = total;
      
      // 检查是否有足够积分
      const canAffordTotal = this.userPoints >= total;
      exchangeBtn.disabled = !canAffordTotal;
      exchangeBtn.className = `flex-1 px-4 py-2 rounded-lg transition-colors duration-300 ${
        canAffordTotal ? 
          'bg-purple-600 hover:bg-purple-700 text-white' : 
          'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
      }`;
      exchangeBtn.textContent = canAffordTotal ? '立即兑换' : '积分不足';
    };

    // 数量增减事件
    decreaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value) || 1;
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
        updateTotalPoints();
      }
    });

    increaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value) || 1;
      if (currentValue < maxQuantity) {
        quantityInput.value = currentValue + 1;
        updateTotalPoints();
      }
    });

    // 手动输入数量 - 只允许数字输入
    quantityInput.addEventListener('input', (e) => {
      // 只允许数字
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      
      // 确保数量在有效范围内
      let value = parseInt(e.target.value) || 1;
      if (value < 1) {
        value = 1;
        e.target.value = '1';
      } else if (value > maxQuantity) {
        value = maxQuantity;
        e.target.value = maxQuantity.toString();
      }
      
      updateTotalPoints();
    });
    
    // 失去焦点时验证和格式化
    quantityInput.addEventListener('blur', (e) => {
      let value = parseInt(e.target.value) || 1;
      if (value < 1) {
        value = 1;
      } else if (value > maxQuantity) {
        value = maxQuantity;
      }
      e.target.value = value.toString();
      updateTotalPoints();
    });

    // 初始化状态
    updateTotalPoints();

    // 绑定取消按钮事件
    const cancelBtn = modal.querySelector('#cancelBtn');
    cancelBtn.addEventListener('click', () => {
      closeProductModal();
    });

    // 绑定兑换事件（防止重复点击）
    let isExchanging = false;
    exchangeBtn.addEventListener('click', async () => {
      if (isExchanging) return; // 防止重复点击
      
      const quantity = parseInt(quantityInput.value) || 1;
      const totalCost = quantity * product.points_required;
      
      if (this.userPoints < totalCost) {
        this.showModalMessage(modal, '积分不足，无法兑换', 'error');
        return;
      }

      isExchanging = true;
      exchangeBtn.disabled = true; // 只禁用按钮，不变文案
      
      try {
        const result = await this.exchangeProduct(product, quantity, modal, exchangeBtn);
        // 由exchangeProduct负责处理按钮状态
      } catch (error) {
        // 如果兑换失败，重新启用按钮
        exchangeBtn.disabled = false;
        exchangeBtn.textContent = '立即兑换';
      } finally {
        isExchanging = false;
      }
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeProductModal();
      }
    });

    // ESC键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        closeProductModal();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  // 显示模态框消息
  showModalMessage(modal, message, type = 'info') {
    const messageDiv = modal.querySelector('#modalMessage');
    if (messageDiv) {
      messageDiv.textContent = message;
      messageDiv.className = `mb-4 text-sm text-center ${
        type === 'success' ? 'text-green-600' : 
        type === 'error' ? 'text-red-600' : 
        type === 'warning' ? 'text-yellow-600' : 
        'text-blue-600'
      }`;
      messageDiv.classList.remove('hidden');
    }
  }

  // 修改exchangeProduct方法，增加exchangeBtn参数，处理按钮状态
  async exchangeProduct(product, quantity = 1, modal = null, exchangeBtn = null) {
    modal = modal || document.getElementById('productModal');
    if (!modal) return;

    const totalCost = quantity * product.points_required;
    
    // 清除之前的消息
    this.showModalMessage(modal, '', 'info');
    this.showModalMessage(modal, '正在处理兑换请求...', 'info');

    try {
      const response = await fetch(`/api/points-exchange/products/${product.id}/exchange`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: quantity }),
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        const message = data.data.requires_approval 
          ? `已申请兑换 ${quantity} 个"${product.name}"，等待审核` 
          : `成功兑换 ${quantity} 个"${product.name}"！`;
        
        this.showModalMessage(modal, message, 'success');
        
        // 立即更新通知角标
        if (window.immediateNotificationUpdate) {
          window.immediateNotificationUpdate();
        }
        if (window.notificationBadgeManager) {
          window.notificationBadgeManager.immediateUpdate();
        }
        await this.loadUserPoints();
        await this.loadProducts();
        // 按钮变为已兑换并禁用
        if (exchangeBtn) {
          exchangeBtn.disabled = true;
          exchangeBtn.textContent = '已兑换';
        }
        
        // 修改：根据商品类型决定关闭弹窗的时机
        if (data.data.requires_approval) {
          // 需要审核的商品：立即关闭弹窗
          setTimeout(() => {
            closeProductModal();
          }, 100);
        } else {
          // 直接兑换的商品：延迟关闭弹窗，让用户看到成功消息
          setTimeout(() => {
            closeProductModal();
          }, 800);
        }
              } else {
          this.showModalMessage(modal, data.error || '兑换失败', 'error');
          // 重新启用按钮
          if (exchangeBtn) {
            exchangeBtn.disabled = false;
            exchangeBtn.textContent = '立即兑换';
          }
          // 兑换失败时不自动关闭弹窗，让用户手动关闭
        }
    } catch (error) {
      this.showModalMessage(modal, '兑换失败，请重试', 'error');
      if (exchangeBtn) {
        exchangeBtn.disabled = false;
        exchangeBtn.textContent = '立即兑换';
      }
    }
  }

  showLoading(show) {
    const loading = document.getElementById('loadingState');
    if (!loading) {
      console.error('找不到loadingState元素');
      return;
    }
    
    if (show) {
      loading.classList.remove('hidden');
    } else {
      loading.classList.add('hidden');
    }
  }

  bindEvents() {
    // 搜索功能
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      this.addEventListener(searchInput, 'input', (e) => {
        this.currentFilters.search = e.target.value;
        // 使用防抖，避免频繁请求
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.filterProducts();
        }, 300);
      });
    }

    // 分类筛选
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      this.addEventListener(categoryFilter, 'change', (e) => {
        this.currentFilters.category = e.target.value;
        this.loadProducts();
      });
    }

    // 积分筛选
    const pointsFilter = document.getElementById('pointsFilter');
    if (pointsFilter) {
      this.addEventListener(pointsFilter, 'change', (e) => {
        this.currentFilters.maxPoints = e.target.value;
        this.loadProducts();
      });
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      this.addEventListener(refreshBtn, 'click', () => {
        this.loadProducts();
      });
    }
  }

  filterProducts() {
    // 直接调用后端API进行搜索
    this.loadProducts();
  }

  renderFilteredProducts(products) {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!grid) {
      console.error('找不到productsGrid元素');
      return;
    }
    
    grid.innerHTML = '';

    if (products.length === 0) {
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
      return;
    }

    if (emptyState) {
      emptyState.classList.add('hidden');
    }

    products.forEach(product => {
      const card = this.createProductCard(product);
      grid.appendChild(card);
    });
  }

  getToken() {
    // 从cookie或localStorage获取token
    return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || 
           localStorage.getItem('token');
  }
}

// 全局函数
function closeProductModal() {
  const modal = document.getElementById('productModal');
  if (modal) {
    // 在删除弹窗前，重置按钮状态
    const exchangeBtn = modal.querySelector('#exchangeBtn');
    if (exchangeBtn) {
      exchangeBtn.disabled = false;
      exchangeBtn.textContent = '立即兑换';
    }
    modal.remove();
  }
}

// 页面实例由动态脚本管理器管理
// 不再自动创建实例，由 scriptManager.initializePage() 调用 