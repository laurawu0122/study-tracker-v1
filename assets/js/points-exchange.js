// 音效管理类
class SoundManager {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.isEnabled = true;
    this.initAudioContext();
  }

  // 初始化音频上下文
  initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('音频上下文初始化失败:', error);
      this.isEnabled = false;
    }
  }

  // 播放气泡音效
  playBubbleSound(type = 'pop', volume = 0.3) {
    if (!this.isEnabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      // 根据类型设置不同的音效
      switch (type) {
        case 'rise':
          // 上升气泡音效 - 高音调上升
          oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.3);
          break;
        case 'pop':
          // 爆炸气泡音效 - 短促的爆裂声
          oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
          break;
        case 'trail':
          // 轨迹气泡音效 - 清脆的叮声
          oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.2);
          break;
        default:
          oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime);
      }

      // 设置音量包络
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
      
    } catch (error) {
      console.warn('播放音效失败:', error);
    }
  }

  // 播放多个气泡音效（用于爆炸效果）
  playBubbleExplosion(count = 6) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playBubbleSound('pop', 0.2 + Math.random() * 0.3);
      }, i * 50);
    }
  }

  // 播放轨迹气泡音效
  playTrailBubbles(count = 4) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.playBubbleSound('trail', 0.1 + Math.random() * 0.2);
      }, i * 200);
    }
  }

  // 播放单个卡片音效
  playCardSound(index, total) {
    // 根据卡片在序列中的位置调整音效
    const volume = 0.2 + (index / total) * 0.3; // 音量逐渐增大
    const delay = index * 50; // 延迟时间
    
    setTimeout(() => {
      this.playBubbleSound('rise', volume);
    }, delay);
  }

  // 启用/禁用音效
  toggleSound() {
    this.isEnabled = !this.isEnabled;
    console.log('音效已', this.isEnabled ? '启用' : '禁用');
  }
}

// 创建全局音效管理器
const soundManager = new SoundManager();

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
    
    // 全局拦截demo模式下的表单提交
    if (window.isDemo) {
      this.interceptDemoModeSubmissions();
    }
    
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
  
  // 拦截demo模式下的表单提交
  interceptDemoModeSubmissions() {
    // 使用新的精确按钮拦截系统
    if (window.isDemo && typeof window.initDemoModeButtonInterception === 'function') {
      window.initDemoModeButtonInterception();
    }
  }

  async loadUserPoints() {
    try {
      const response = await fetch(window.isDemo ? '/demo/api/points-exchange/user-points' : getApiUrl('/api/points-exchange/user-points'), {
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
      const response = await fetch(window.isDemo ? '/demo/api/points-exchange/categories' : getApiUrl('/api/points-exchange/categories'), {
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

      // 修正：demo模式下请求 demo API，且兼容 data 字段
      const apiUrl = window.isDemo
        ? `/demo/api/points-exchange/products?${params}`
        : getApiUrl(`/api/points-exchange/products?${params}`);
      const response = await fetch(apiUrl, {
        headers: window.isDemo ? {} : {
          'Authorization': `Bearer ${this.getToken()}`
        },
        credentials: 'include'
      });
      const res = await response.json();
      // 兼容 demo 和正式环境，优先取 res.data
      const products = Array.isArray(res.data) ? res.data : (Array.isArray(res.products) ? res.products : []);
      this.products = products;
      this.totalProducts = res.total || products.length;
      this.renderProducts();
      this.showLoading(false);
      if (products.length === 0) {
        this.showEmptyState(true);
      } else {
        this.showEmptyState(false);
      }
    } catch (err) {
      this.showLoading(false);
      this.showEmptyState(true);
      console.error('加载商品失败', err);
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
    const cancelBtn = modal.querySelector('#cancelBtn');
    // 修复：绑定取消按钮关闭弹窗
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        closeProductModal();
      });
    }

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
      const response = await fetch(window.isDemo ? `/demo/api/points-exchange/products/${product.id}/exchange` : getApiUrl(`/api/points-exchange/products/${product.id}/exchange`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: quantity }),
        credentials: 'include'
      });

      const data = await response.json();
      
      // 检查嵌套的success字段
      const isSuccess = data.success && (data.data ? data.data.success : true);
      
      if (isSuccess) {
        const exchangeData = data.data || data;
        const message = exchangeData.requires_approval 
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
        
        // 优化：立即关闭弹窗，然后执行飞入动画
        closeProductModal();
        
        // 延迟更长时间确保弹窗完全关闭，然后开始动画
        setTimeout(async () => {
          try {
            await this.animateProductToExchangeRecords(product, quantity, null, exchangeData.requires_approval);
          } catch (animError) {
            console.error('兑换动画异常:', animError);
            // 动画异常不影响用户体验，只记录日志
          }
        }, 200);
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
      // 只在网络/接口异常时提示失败
      console.error('兑换异常:', error);
      if (modal) this.showModalMessage(modal, '兑换失败，请重试', 'error');
      if (exchangeBtn) {
        exchangeBtn.disabled = false;
        exchangeBtn.textContent = '立即兑换';
      }
    }
  }

  // 新增：商品飞入兑换记录的动画方法
  async animateProductToExchangeRecords(product, quantity, modal, requiresApproval = false) {
    try {
      // 根据数量创建多个商品卡片
      const cards = [];
      for (let i = 0; i < quantity; i++) {
        const productCard = this.createAnimatedProductCard(product, 1); // 每个卡片显示数量为1
        cards.push(productCard);
      }
      
      // 获取原始商品卡片的位置（弹窗已关闭，从商品卡片开始）
      const originalProductCard = document.querySelector(`[data-product-id="${product.id}"]`);
      let startRect = { left: window.innerWidth / 2 - 100, top: window.innerHeight / 2 - 100, width: 200, height: 200 };
      
      if (originalProductCard) {
        const cardRect = originalProductCard.getBoundingClientRect();
        startRect = {
          left: cardRect.left + cardRect.width / 2 - 50,
          top: cardRect.top + cardRect.height / 2 - 50,
          width: 100,
          height: 100
        };
      }
      
      // 确保弹窗已经完全关闭
      const existingModal = document.getElementById('productModal');
      if (existingModal) {
        existingModal.remove();
      }
      
      // 获取兑换记录菜单的位置（通过导航菜单找到）
      const exchangeRecordsLink = document.querySelector('a[href="/exchange-records"], a[href*="exchange-records"]');
      let targetRect = { left: window.innerWidth - 100, top: 20, width: 60, height: 60 };
      
      if (exchangeRecordsLink) {
        const linkRect = exchangeRecordsLink.getBoundingClientRect();
        targetRect = {
          left: linkRect.left + linkRect.width / 2 - 30,
          top: linkRect.top + linkRect.height / 2 - 30,
          width: 60,
          height: 60
        };
      }
      
      // 创建起飞气泡效果（只在第一个卡片时创建）
      this.createBubbleEffect(startRect.left + startRect.width / 2, startRect.top + startRect.height / 2);
      
      // 依次执行每个卡片的动画
      for (let i = 0; i < cards.length; i++) {
        const productCard = cards[i];
        
        // 设置初始位置（从商品卡片位置开始，稍微错开）
        const offsetX = (i - (quantity - 1) / 2) * 15; // 水平错开
        const offsetY = (i - (quantity - 1) / 2) * 10; // 垂直错开
        
        productCard.style.position = 'fixed';
        productCard.style.left = `${startRect.left + offsetX}px`;
        productCard.style.top = `${startRect.top + offsetY}px`;
        productCard.style.width = `${startRect.width}px`;
        productCard.style.height = `${startRect.height}px`;
        productCard.style.zIndex = `9999`;
        productCard.style.transform = 'scale(1)';
        productCard.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        productCard.style.borderRadius = '8px';
        productCard.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.6)';
        
        document.body.appendChild(productCard);
        
        // 延迟执行每个卡片的动画
        await new Promise(resolve => {
          setTimeout(async () => {
            // 播放单个卡片音效
            soundManager.playCardSound(i, cards.length);
            
            // 第一阶段：弹性弹跳起飞
            setTimeout(() => {
              productCard.classList.add('elastic-bounce');
              productCard.style.boxShadow = '0 0 30px rgba(255, 99, 132, 0.8)';
              productCard.style.filter = 'brightness(1.3) hue-rotate(0deg)';
              
              // 第二阶段：彩虹轨迹飞行 + 轨迹气泡
              setTimeout(() => {
                productCard.classList.remove('elastic-bounce');
                productCard.style.left = `${targetRect.left}px`;
                productCard.style.top = `${targetRect.top}px`;
                productCard.style.width = `${targetRect.width}px`;
                productCard.style.height = `${targetRect.height}px`;
                productCard.style.transform = 'scale(0.5) rotate(180deg)';
                productCard.style.boxShadow = '0 0 40px rgba(54, 162, 235, 0.9)';
                productCard.style.filter = 'brightness(1.4) hue-rotate(180deg)';
                productCard.classList.add('rainbow-glow');
                
                // 创建轨迹气泡效果
                this.createTrailBubbles(startRect, targetRect);
                
                // 第三阶段：磁性吸附
                setTimeout(() => {
                  productCard.classList.add('magnetic-pull');
                  productCard.style.boxShadow = '0 0 50px rgba(75, 192, 192, 1)';
                  productCard.style.filter = 'brightness(1.5) hue-rotate(360deg)';
                  
                  // 第四阶段：粒子爆炸效果 + 气泡爆炸
                  setTimeout(() => {
                    this.createParticleExplosion(targetRect.left + targetRect.width/2, targetRect.top + targetRect.height/2);
                    this.createBubbleExplosion(targetRect.left + targetRect.width/2, targetRect.top + targetRect.height/2);
                    productCard.style.transform = 'scale(0.1) rotate(720deg)';
                    productCard.style.opacity = '0.3';
                    productCard.style.boxShadow = '0 0 60px rgba(255, 205, 86, 1)';
                    productCard.classList.add('pulse-glow');
                    
                    // 最终阶段：消失
                    setTimeout(() => {
                      productCard.remove();
                      resolve();
                    }, 200);
                  }, 300);
                }, 400);
              }, 300);
            }, 100);
          }, i * 120); // 每个卡片延迟120ms开始动画
        });
      }
      
      // 显示成功提示
      if (requiresApproval) {
        this.showExchangeApprovalNotification(product.name, quantity);
      } else {
        this.showExchangeSuccessNotification(product.name, quantity);
      }
      
      // 显示飞入动画提示
      if (quantity > 1) {
        this.showFlyingAnimationHint(quantity);
      }
    } catch (err) {
      // 动画异常只写console，不再弹窗提示
      console.error('animateProductToExchangeRecords异常:', err);
      closeProductModal();
    }
  }

  // 创建粒子爆炸效果
  createParticleExplosion(x, y) {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.className = 'fixed w-2 h-2 rounded-full z-[9998]';
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.backgroundColor = colors[i % colors.length];
      particle.style.boxShadow = `0 0 10px ${colors[i % colors.length]}`;
      particle.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      
      document.body.appendChild(particle);
      
      // 随机方向扩散
      const angle = (i / 12) * 2 * Math.PI;
      const distance = 50 + Math.random() * 30;
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;
      
      setTimeout(() => {
        particle.style.left = `${endX}px`;
        particle.style.top = `${endY}px`;
        particle.style.opacity = '0';
        particle.style.transform = 'scale(0)';
        
        setTimeout(() => {
          if (document.body.contains(particle)) {
            particle.remove();
          }
        }, 800);
      }, 50);
    }
  }

  // 创建气泡效果
  createBubbleEffect(x, y) {
    const bubbleColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    // 播放起飞气泡音效
    soundManager.playBubbleSound('rise', 0.2);
    
    for (let i = 0; i < 6; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'fixed rounded-full z-[9997] bubble-rise';
      bubble.style.left = `${x + (Math.random() - 0.5) * 40}px`;
      bubble.style.top = `${y + (Math.random() - 0.5) * 40}px`;
      bubble.style.width = `${8 + Math.random() * 12}px`;
      bubble.style.height = bubble.style.width;
      bubble.style.backgroundColor = bubbleColors[i % bubbleColors.length];
      bubble.style.opacity = '0.8';
      bubble.style.boxShadow = `0 0 8px ${bubbleColors[i % bubbleColors.length]}`;
      
      document.body.appendChild(bubble);
      
      // 自动清理
      setTimeout(() => {
        if (document.body.contains(bubble)) {
          bubble.remove();
        }
      }, 1000);
    }
  }

  // 创建轨迹气泡效果
  createTrailBubbles(startRect, targetRect) {
    const bubbleColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    // 播放轨迹气泡音效
    soundManager.playTrailBubbles(4);
    
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const bubble = document.createElement('div');
        bubble.className = 'fixed rounded-full z-[9996] bubble-pop';
        
        // 在起点和终点之间随机位置
        const progress = Math.random();
        const x = startRect.left + (targetRect.left - startRect.left) * progress;
        const y = startRect.top + (targetRect.top - startRect.top) * progress;
        
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        bubble.style.width = `${6 + Math.random() * 8}px`;
        bubble.style.height = bubble.style.width;
        bubble.style.backgroundColor = bubbleColors[i % bubbleColors.length];
        bubble.style.opacity = '0.6';
        bubble.style.boxShadow = `0 0 6px ${bubbleColors[i % bubbleColors.length]}`;
        
        document.body.appendChild(bubble);
        
        // 自动清理
        setTimeout(() => {
          if (document.body.contains(bubble)) {
            bubble.remove();
          }
        }, 800);
      }, i * 100);
    }
  }

  // 创建气泡爆炸效果
  createBubbleExplosion(x, y) {
    const bubbleColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    // 播放气泡爆炸音效
    soundManager.playBubbleExplosion(8);
    
    for (let i = 0; i < 12; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'fixed rounded-full z-[9995] bubble-pop';
      bubble.style.left = `${x}px`;
      bubble.style.top = `${y}px`;
      bubble.style.width = `${10 + Math.random() * 15}px`;
      bubble.style.height = bubble.style.width;
      bubble.style.backgroundColor = bubbleColors[i % bubbleColors.length];
      bubble.style.opacity = '0.9';
      bubble.style.boxShadow = `0 0 12px ${bubbleColors[i % bubbleColors.length]}`;
      
      document.body.appendChild(bubble);
      
      // 随机方向扩散
      const angle = (i / 12) * 2 * Math.PI;
      const distance = 30 + Math.random() * 40;
      const endX = x + Math.cos(angle) * distance;
      const endY = y + Math.sin(angle) * distance;
      
      setTimeout(() => {
        bubble.style.left = `${endX}px`;
        bubble.style.top = `${endY}px`;
        bubble.style.opacity = '0';
        bubble.style.transform = 'scale(0)';
        
        setTimeout(() => {
          if (document.body.contains(bubble)) {
            bubble.remove();
          }
        }, 800);
      }, 100);
    }
  }

  // 创建用于动画的商品卡片
  createAnimatedProductCard(product, quantity) {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 border-purple-500';
    
    card.innerHTML = `
      <div class="relative h-full">
        <div class="h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          ${product.image_url ? 
            `<img src="${product.image_url}" alt="${product.name}" class="h-full w-full object-cover">` :
            `<i class="fas fa-image text-2xl text-gray-400"></i>`
          }
        </div>
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
          <div class="text-white text-xs font-medium truncate">${product.name}</div>
          <div class="text-white text-xs opacity-90">x${quantity}</div>
        </div>
        <div class="absolute top-1 right-1 bg-purple-500 text-white text-xs px-1 py-0.5 rounded-full">
          <i class="fas fa-gift"></i>
        </div>
      </div>
    `;
    
    return card;
  }

  // 显示兑换成功通知
  showExchangeSuccessNotification(productName, quantity) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 px-6 py-4 bg-green-500 text-white rounded-lg shadow-xl transform translate-x-full transition-all duration-300 max-w-sm';
    
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <i class="fas fa-check-circle text-xl"></i>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium">兑换成功！</p>
          <p class="text-xs mt-1 opacity-90">${productName} x${quantity} 已添加到兑换记录</p>
        </div>
        <button class="ml-3 text-white hover:text-gray-200 transition-colors" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove();
        }
      }, 300);
    }, 4000);
  }

  // 显示兑换申请通知
  showExchangeApprovalNotification(productName, quantity) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 z-50 px-6 py-4 bg-yellow-500 text-white rounded-lg shadow-xl transform translate-x-full transition-all duration-300 max-w-sm';
    
    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <i class="fas fa-clock text-xl"></i>
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium">申请已提交！</p>
          <p class="text-xs mt-1 opacity-90">${productName} x${quantity} 等待审核中</p>
        </div>
        <button class="ml-3 text-white hover:text-gray-200 transition-colors" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove();
        }
      }, 300);
    }, 4000);
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

  showEmptyState(show) {
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      if (show) {
        emptyState.classList.remove('hidden');
      } else {
        emptyState.classList.add('hidden');
      }
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

    // 添加音效控制按钮
    this.addSoundControlButton();
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

  // 显示飞入动画提示
  showFlyingAnimationHint(quantity) {
    const hint = document.createElement('div');
    hint.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[10000] bg-black/80 text-white px-4 py-2 rounded-lg text-sm font-medium';
    hint.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-rocket mr-2 text-yellow-400"></i>
        <span>${quantity} 个商品正在飞入兑换记录...</span>
      </div>
    `;
    
    document.body.appendChild(hint);
    
    // 2秒后自动消失
    setTimeout(() => {
      if (document.body.contains(hint)) {
        hint.remove();
      }
    }, 2000);
  }

  // 添加音效控制按钮
  addSoundControlButton() {
    // 查找页面中的控制按钮区域
    const controlsContainer = document.querySelector('.flex.justify-between.items-center.mb-6') || 
                             document.querySelector('.mb-6') ||
                             document.body;
    
    // 创建音效控制按钮
    const soundButton = document.createElement('button');
    soundButton.id = 'soundToggleBtn';
    soundButton.className = 'flex items-center px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 text-sm';
    soundButton.innerHTML = `
      <i class="fas fa-volume-up mr-2"></i>
      <span>音效</span>
    `;
    
    // 绑定点击事件
    soundButton.addEventListener('click', () => {
      // 初始化音频上下文（浏览器要求用户交互后才能播放音频）
      if (soundManager.audioContext && soundManager.audioContext.state === 'suspended') {
        soundManager.audioContext.resume();
      }
      
      soundManager.toggleSound();
      
      // 更新按钮图标和文字
      const icon = soundButton.querySelector('i');
      const text = soundButton.querySelector('span');
      
      if (soundManager.isEnabled) {
        icon.className = 'fas fa-volume-up mr-2';
        text.textContent = '音效';
        soundButton.className = 'flex items-center px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 text-sm';
      } else {
        icon.className = 'fas fa-volume-mute mr-2';
        text.textContent = '静音';
        soundButton.className = 'flex items-center px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200 text-sm';
      }
    });
    
    // 插入到控制区域
    if (controlsContainer) {
      controlsContainer.appendChild(soundButton);
    }
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

// fetch 路径适配函数
function getApiUrl(path) {
  return window.isDemo ? `/demo${path}` : path;
} 