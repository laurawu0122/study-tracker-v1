// 成就管理JavaScript文件
console.log('🎯 成就管理JavaScript文件已加载 - ' + new Date().toLocaleTimeString());

// 防止重复声明
if (typeof window.AchievementManager !== 'undefined') {
  console.log('⚠️ AchievementManager 已存在，跳过重复声明');
} else {
  console.log('✅ 首次加载 AchievementManager');
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 成就管理页面类
class AchievementManager {
  constructor() {
    console.log('🏆 AchievementManager 构造函数被调用');
    this.achievements = [];
    this.categories = [];
    this.currentPage = 1;
    this.pageSize = 10;
    this.filters = {
      search: '',
      category: '',
      status: ''
    };
    this.retryCount = 0;
    this.init();
  }
  
  // 检查是否在成就管理页面
  checkIfAchievementPage() {
    // 方法1：检查URL路径
    if (window.location.pathname.includes('admin') && window.location.hash.includes('achievements')) {
      return true;
    }
    
    // 方法2：检查当前激活的标签页
    const activeTab = document.querySelector('.tab-button.active, .nav-link.active');
    if (activeTab && activeTab.textContent.includes('成就')) {
      return true;
    }
    
    // 方法3：检查页面内容
    const achievementButtons = document.querySelectorAll('#downloadIconsBtn, #addCategoryBtn, #addAchievementBtn');
    if (achievementButtons.length > 0) {
      return true;
    }
    
    // 方法4：检查成就相关的DOM元素
    const achievementElements = document.querySelectorAll('#achievementsTableBody, #achievementModal, #categoryModal');
    if (achievementElements.length > 0) {
      return true;
    }
    
    return false;
  }
  
  async init() {
    console.log('🚀 开始初始化成就管理器...');
    // 等待DOM完全加载
    if (document.readyState === 'loading') {
      console.log('⏳ DOM还在加载中，等待...');
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    
      // 检查是否在成就管理页面 - 改进检测逻辑
  const isAchievementPage = this.checkIfAchievementPage();
  
  console.log('📄 页面检查结果:', {
    isAchievementPage: isAchievementPage
  });
  
  if (!isAchievementPage) {
    console.log('❌ 不在成就管理页面，跳过初始化');
    return;
  }
    
    // 等待更长时间确保所有元素都加载完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 检查必要的DOM元素是否存在
    const requiredElements = [
      'totalAchievements',
      'totalCategories', 
      'activeUsers',
      'totalPoints',
      'achievementsTableBody'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
      console.warn('缺少必要的DOM元素:', missingElements);
      // 等待更长时间后重试，最多重试3次
      if (this.retryCount < 3) {
        this.retryCount = (this.retryCount || 0) + 1;
        console.log(`重试初始化 (${this.retryCount}/3)...`);
        setTimeout(() => this.init(), 1000);
        return;
      } else {
        console.error('初始化失败：DOM元素未找到');
        return;
      }
    }
    
    console.log('成就管理页面初始化开始...');
    await this.loadCategories();
    await this.loadAchievements();
    this.setupEventListeners();
    await this.updateStats();
    console.log('成就管理页面初始化完成');
  }
  
  async loadCategories() {
    try {
      const response = await fetch('/api/admin/achievement-categories');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          this.categories = result.data || [];
          this.populateCategoryFilters();
        } else {
          console.error('加载分类失败: API返回格式错误');
        }
      } else {
        console.error('加载分类失败:', response.statusText);
      }
    } catch (error) {
      console.error('加载分类出错:', error);
    }
  }
  
  async loadAchievements() {
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        search: this.filters.search,
        category: this.filters.category,
        status: this.filters.status
      });
      
      const response = await fetch(`/api/admin/achievements?${params}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          this.achievements = result.achievements || [];
          this.renderAchievements();
          this.renderPagination(result.pagination);
        } else {
          console.error('加载成就失败: API返回格式错误');
        }
      } else {
        console.error('加载成就失败:', response.statusText);
      }
    } catch (error) {
      console.error('加载成就出错:', error);
    }
  }
  
  populateCategoryFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const achievementCategory = document.getElementById('achievementCategory');
    
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">全部分类</option>';
      this.categories.forEach(category => {
        categoryFilter.innerHTML += `<option value="${category.id}">${category.name}</option>`;
      });
    }
    
    if (achievementCategory) {
      achievementCategory.innerHTML = '<option value="">选择分类</option>';
      this.categories.forEach(category => {
        achievementCategory.innerHTML += `<option value="${category.id}">${category.name}</option>`;
      });
    }
  }
  
  renderAchievements() {
    const tbody = document.getElementById('achievementsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (this.achievements.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
            暂无成就数据
          </td>
        </tr>
      `;
      return;
    }
    
    this.achievements.forEach(achievement => {
      const category = this.categories.find(c => c.id === achievement.category_id);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <img class="h-10 w-10 rounded-full" src="${achievement.icon || '/assets/ico/default-achievement.svg'}" alt="${achievement.name}">
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${achievement.name}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${achievement.description || ''}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          ${category ? category.name : '未分类'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          ${this.getTriggerTypeText(achievement.trigger_type)} (${achievement.required_count}次)
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          ${achievement.points || 0}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${achievement.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
            ${achievement.is_active ? '启用' : '禁用'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-3 edit-achievement-btn" data-id="${achievement.id}">编辑</button>
          <button class="text-red-600 hover:text-red-900 delete-achievement-btn" data-id="${achievement.id}">删除</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    this.bindAchievementActions();
  }
  
  getTriggerTypeText(triggerType) {
    const triggerTypes = {
      'total_duration': '总学习时长',
      'consecutive_days': '连续学习天数',
      'project_completion': '项目完成',
      'daily_frequency': '每日学习频率',
      'weekly_frequency': '每周学习频率',
      'monthly_frequency': '每月学习频率',
      'efficiency': '学习效率',
      'milestone': '里程碑'
    };
    return triggerTypes[triggerType] || triggerType;
  }
  
  renderPagination(pagination) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl || !pagination) return;
    
    const { currentPage, totalPages, total } = pagination;
    
    paginationEl.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          显示第 ${(currentPage - 1) * this.pageSize + 1} 到 ${Math.min(currentPage * this.pageSize, total)} 条，共 ${total} 条记录
        </div>
        <div class="flex space-x-2">
          <button class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}" 
                  ${currentPage === 1 ? 'disabled' : ''} onclick="achievementManager.goToPage(${currentPage - 1})">
            上一页
          </button>
          <span class="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
            第 ${currentPage} 页，共 ${totalPages} 页
          </span>
          <button class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}" 
                  ${currentPage === totalPages ? 'disabled' : ''} onclick="achievementManager.goToPage(${currentPage + 1})">
            下一页
          </button>
        </div>
      </div>
    `;
  }
  
  goToPage(page) {
    this.currentPage = page;
    this.loadAchievements();
  }
  
  async updateStats() {
    try {
      const response = await fetch('/api/admin/achievement-stats');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const stats = result.data;
          
          // 检查DOM元素是否存在
          const totalAchievementsEl = document.getElementById('totalAchievements');
          const totalCategoriesEl = document.getElementById('totalCategories');
          const activeUsersEl = document.getElementById('activeUsers');
          const totalPointsEl = document.getElementById('totalPoints');
          
          if (totalAchievementsEl) {
            totalAchievementsEl.textContent = stats.total_achievements || 0;
          }
          if (totalCategoriesEl) {
            totalCategoriesEl.textContent = stats.total_categories || 0;
          }
          if (activeUsersEl) {
            activeUsersEl.textContent = stats.active_users || 0;
          }
          if (totalPointsEl) {
            totalPointsEl.textContent = stats.total_points || 0;
          }
        }
      }
    } catch (error) {
      console.error('更新统计信息失败:', error);
    }
  }
  
  setupEventListeners() {
    // 搜索和筛选
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        this.filters.search = searchInput.value;
        this.currentPage = 1;
        this.loadAchievements();
      }, 300));
    }
    
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        this.filters.category = categoryFilter.value;
        this.currentPage = 1;
        this.loadAchievements();
      });
    }
    
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.filters.status = statusFilter.value;
        this.currentPage = 1;
        this.loadAchievements();
      });
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadAchievements();
        this.updateStats();
      });
    }
    
    // 添加按钮 - 使用事件委托确保按钮可用
    console.log('🔧 设置按钮事件监听器...');
    document.addEventListener('click', (e) => {
      console.log('点击事件触发，目标ID:', e.target.id, '目标类名:', e.target.className);
      if (e.target.id === 'addAchievementBtn' || e.target.closest('#addAchievementBtn')) {
        console.log('✅ 添加成就按钮被点击');
        this.showAchievementModal();
      } else if (e.target.id === 'addCategoryBtn' || e.target.closest('#addCategoryBtn')) {
        console.log('✅ 添加分类按钮被点击');
        this.showCategoryModal();
      } else if (e.target.id === 'downloadIconsBtn' || e.target.closest('#downloadIconsBtn')) {
        console.log('✅ 下载图标按钮被点击');
        this.downloadIcons();
      }
    });
    console.log('✅ 按钮事件监听器设置完成');
    
    // 表单事件
    const achievementForm = document.getElementById('achievementForm');
    if (achievementForm) {
      achievementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveAchievement();
      });
    }
    
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
      categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCategory();
      });
    }
    
    // 触发类型变化
    const triggerTypeSelect = document.getElementById('achievementTriggerType');
    if (triggerTypeSelect) {
      triggerTypeSelect.addEventListener('change', () => {
        this.updateTriggerConfig(triggerTypeSelect.value);
      });
    }
    
    // 图标输入变化
    const iconInput = document.getElementById('achievementIcon');
    if (iconInput) {
      iconInput.addEventListener('input', () => {
        this.updateIconPreview(iconInput.value);
      });
    }
    
    // 图标选择器按钮
    const iconPickerBtn = document.getElementById('iconPickerBtn');
    if (iconPickerBtn) {
      iconPickerBtn.addEventListener('click', () => {
        this.showIconPicker();
      });
    }
    
    // 模态框关闭事件
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal') || e.target.closest('.modal-close-btn')) {
        const modal = e.target.classList.contains('modal') ? e.target : e.target.closest('.modal');
        if (modal) {
          modal.classList.add('hidden');
        }
      }
    });
  }
  
  bindAchievementActions() {
    // 绑定编辑按钮
    document.querySelectorAll('.edit-achievement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        this.editAchievement(id);
      });
    });
    
    // 绑定删除按钮
    document.querySelectorAll('.delete-achievement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        this.deleteAchievement(id);
      });
    });
  }
  
  showAchievementModal(achievement = null) {
    const modal = document.getElementById('achievementModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('achievementForm');
    const modalContent = modal.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (achievement) {
      modalTitle.textContent = '编辑成就';
      this.populateAchievementForm(achievement);
    } else {
      modalTitle.textContent = '添加成就';
      form.reset();
      document.getElementById('achievementId').value = '';
    }
    
    modal.classList.remove('hidden');
    // 动画显示内容
    setTimeout(() => {
      if (modalContent) {
        modalContent.classList.remove('opacity-0', 'scale-95');
      }
    }, 10);
  }
  
  showCategoryModal(category = null) {
    const modal = document.getElementById('categoryModal');
    const modalTitle = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    const modalContent = modal.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (category) {
      modalTitle.textContent = '编辑分类';
      this.populateCategoryForm(category);
    } else {
      modalTitle.textContent = '添加分类';
      form.reset();
      document.getElementById('categoryId').value = '';
    }
    
    modal.classList.remove('hidden');
    // 动画显示内容
    setTimeout(() => {
      if (modalContent) {
        modalContent.classList.remove('opacity-0', 'scale-95');
      }
    }, 10);
  }
  
  populateAchievementForm(achievement) {
    document.getElementById('achievementId').value = achievement.id;
    document.getElementById('achievementName').value = achievement.name;
    document.getElementById('achievementCategory').value = achievement.category_id;
    document.getElementById('achievementDescription').value = achievement.description || '';
    document.getElementById('achievementIcon').value = achievement.icon || '';
    document.getElementById('achievementBadgeStyle').value = achievement.badge_style || 'default';
    document.getElementById('achievementLevel').value = achievement.level || '1';
    document.getElementById('achievementTriggerType').value = achievement.trigger_type;
    document.getElementById('achievementRequiredCount').value = achievement.required_count || 1;
    document.getElementById('achievementPoints').value = achievement.points || 0;
    document.getElementById('achievementSortOrder').value = achievement.sort_order || 0;
    document.getElementById('achievementStatus').value = achievement.is_active ? 'true' : 'false';
    
    this.updateTriggerConfig(achievement.trigger_type);
  }
  
  populateCategoryForm(category) {
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryIcon').value = category.icon || '';
    document.getElementById('categorySortOrder').value = category.sort_order || 0;
  }
  
  updateTriggerConfig(triggerType) {
    const configSection = document.getElementById('triggerConfigSection');
    const configFields = document.getElementById('triggerConfigFields');
    
    if (!configSection || !configFields) return;
    
    configFields.innerHTML = '';
    
    if (triggerType === 'total_duration') {
      configFields.innerHTML = `
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">目标时长（分钟）</label>
          <input type="number" name="trigger_config[target_duration]" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
        </div>
      `;
      configSection.classList.remove('hidden');
    } else if (triggerType === 'consecutive_days') {
      configFields.innerHTML = `
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">连续天数</label>
          <input type="number" name="trigger_config[consecutive_days]" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md">
        </div>
      `;
      configSection.classList.remove('hidden');
    } else {
      configSection.classList.add('hidden');
    }
  }
  
  async saveAchievement() {
    const form = document.getElementById('achievementForm');
    const formData = new FormData(form);
    const achievementId = formData.get('id');
    
    try {
      const response = await fetch(`/api/admin/achievements${achievementId ? `/${achievementId}` : ''}`, {
        method: achievementId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        closeAchievementModal();
        this.loadAchievements();
        this.updateStats();
        this.showNotification(achievementId ? '成就更新成功' : '成就创建成功', 'success');
      } else {
        const error = await response.json();
        this.showNotification(`保存失败: ${error.message || '未知错误'}`, 'error');
      }
    } catch (error) {
      console.error('保存成就失败:', error);
      this.showNotification('保存失败，请重试', 'error');
    }
  }
  
  async saveCategory() {
    const form = document.getElementById('categoryForm');
    const formData = new FormData(form);
    const categoryId = formData.get('id');
    
    try {
      const response = await fetch(`/api/admin/achievement-categories${categoryId ? `/${categoryId}` : ''}`, {
        method: categoryId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (response.ok) {
        closeCategoryModal();
        await this.loadCategories();
        this.loadAchievements();
        this.updateStats();
        this.showNotification(categoryId ? '分类更新成功' : '分类创建成功', 'success');
      } else {
        const error = await response.json();
        this.showNotification(`保存失败: ${error.message || '未知错误'}`, 'error');
      }
    } catch (error) {
      console.error('保存分类失败:', error);
      this.showNotification('保存失败，请重试', 'error');
    }
  }
  
  async editAchievement(id) {
    try {
      const response = await fetch(`/api/admin/achievements/${id}`);
      if (response.ok) {
        const achievement = await response.json();
        this.showAchievementModal(achievement);
      } else {
        this.showNotification('加载成就信息失败', 'error');
      }
    } catch (error) {
      console.error('编辑成就失败:', error);
      this.showNotification('编辑失败，请重试', 'error');
    }
  }
  
  async deleteAchievement(id) {
    const achievement = this.achievements.find(a => a.id === id);
    if (!achievement) return;
    
    const confirmed = await this.showConfirmDialog(
      '删除成就',
      `确定要删除成就"${achievement.name}"吗？此操作不可恢复！`,
      '删除',
      '取消'
    );
    
    if (!confirmed) return;
    
    try {
      const response = await fetch(`/api/admin/achievements/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.loadAchievements();
        this.updateStats();
        this.showNotification('成就删除成功', 'success');
      } else {
        const error = await response.json();
        this.showNotification(`删除失败: ${error.message || '未知错误'}`, 'error');
      }
    } catch (error) {
      console.error('删除成就失败:', error);
      this.showNotification('删除失败，请重试', 'error');
    }
  }
  
  // 图标下载功能
  async downloadIcons() {
    const downloadBtn = document.getElementById('downloadIconsBtn');
    if (!downloadBtn) return;
    
    // 显示确认对话框
    const confirmed = await this.showConfirmDialog(
      '下载成就图标',
      '确定要下载所有成就图标吗？这将从远程服务器获取最新的图标文件。',
      '开始下载',
      '取消'
    );
    
    if (!confirmed) return;
    
    // 显示加载状态
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>下载中...';
    downloadBtn.disabled = true;
    
    try {
      const response = await fetch('/api/admin/achievements/download-icons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 显示详细结果
        this.showDownloadResults(result.results);
        // 刷新成就列表以显示新图标
        await this.loadAchievements();
        this.showNotification('图标下载完成！', 'success');
      } else {
        this.showNotification(`下载失败: ${result.message || '未知错误'}`, 'error');
      }
    } catch (error) {
      console.error('图标下载失败:', error);
      this.showNotification('图标下载失败，请重试', 'error');
    } finally {
      // 恢复按钮状态
      downloadBtn.innerHTML = originalText;
      downloadBtn.disabled = false;
    }
  }
  
  // 显示下载结果
  showDownloadResults(results) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">图标下载结果</h3>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div class="space-y-2">
            ${results.map(result => `
              <div class="flex items-center text-sm">
                <span class="mr-2">${result.includes('✅') ? '✅' : '❌'}</span>
                <span class="${result.includes('✅') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${result}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onclick="this.closest('.fixed').remove()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
            确定
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  // 更新图标预览
  updateIconPreview(iconPath) {
    const iconPreview = document.getElementById('iconPreview');
    if (!iconPreview) return;
    
    iconPreview.innerHTML = '';
    const val = iconPath.trim();
    
    if (!val) return;
    
    if (val.endsWith('.svg')) {
      // SVG文件
      iconPreview.innerHTML = `<img src="${val}" alt="icon" class="w-8 h-8 object-contain">`;
    } else if (val.endsWith('.png') || val.endsWith('.jpg') || val.endsWith('.jpeg') || val.endsWith('.gif') || val.startsWith('data:image')) {
      // 图片文件
      iconPreview.innerHTML = `<img src="${val}" alt="icon" class="w-8 h-8 object-contain">`;
    } else if (val.startsWith('<svg')) {
      // SVG代码
      iconPreview.innerHTML = val;
    } else {
      // 其他情况
      iconPreview.textContent = '';
    }
  }
  
  // 显示图标选择器
  showIconPicker() {
    // 这里可以实现一个图标选择器模态框
    // 暂时简单提示用户输入路径
    const iconInput = document.getElementById('achievementIcon');
    if (iconInput) {
      const path = prompt('请输入图标路径（例如：/assets/ico/project-gold.svg）');
      if (path) {
        iconInput.value = path;
        this.updateIconPreview(path);
      }
    }
  }
  
  // 显示通知消息
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl transition-all duration-300 transform translate-x-full max-w-sm`;
    
    const colors = {
      success: 'bg-green-500 text-white border-l-4 border-green-600',
      error: 'bg-red-500 text-white border-l-4 border-red-600',
      warning: 'bg-yellow-500 text-white border-l-4 border-yellow-600',
      info: 'bg-blue-500 text-white border-l-4 border-blue-600'
    };
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
      <div class="flex items-start">
        <i class="${icons[type] || icons.info} mr-3 mt-0.5 text-lg"></i>
        <div class="flex-1">
          <div class="font-medium">${message}</div>
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
    
    // 自动隐藏（成功和错误消息显示更长时间）
    const duration = type === 'success' || type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
  
  // 显示确认对话框（与通知中心样式一致）
  showConfirmDialog(title, message, confirmText = '确定', cancelText = '取消') {
    return new Promise((resolve) => {
      // 创建模态框
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
      modal.id = 'confirmModal';
      
      modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 transform transition-all duration-300">
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <i class="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-xl"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">${title}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">${message}</p>
            <div class="flex space-x-3">
              <button id="cancelBtn" class="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300">
                ${cancelText}
              </button>
              <button id="confirmBtn" class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-300">
                ${confirmText}
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 绑定事件
      const confirmBtn = modal.querySelector('#confirmBtn');
      const cancelBtn = modal.querySelector('#cancelBtn');

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      // 点击背景关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });

      // ESC键关闭
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
          document.removeEventListener('keydown', handleEsc);
        }
      };
      document.addEventListener('keydown', handleEsc);
    });
  }
}

// 全局函数
function closeAchievementModal() {
  const modal = document.getElementById('achievementModal');
  const modalContent = modal.querySelector('.bg-white, .dark\\:bg-gray-900');
  
  if (modalContent) {
    modalContent.classList.add('opacity-0', 'scale-95');
  }
  
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300); // 等待动画结束
}

function closeCategoryModal() {
  const modal = document.getElementById('categoryModal');
  const modalContent = modal.querySelector('.bg-white, .dark\\:bg-gray-900');
  
  if (modalContent) {
    modalContent.classList.add('opacity-0', 'scale-95');
  }
  
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300); // 等待动画结束
}

// 初始化成就管理器
console.log('🎬 准备初始化成就管理器...');

// 检查是否已经有实例
if (window.achievementManager) {
  console.log('✅ 成就管理器实例已存在，跳过自动初始化');
} else {
  let achievementManager;
  if (document.readyState === 'loading') {
    console.log('⏳ DOM还在加载，等待DOMContentLoaded事件...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('✅ DOMContentLoaded事件触发，创建AchievementManager实例');
      achievementManager = new AchievementManager();
      window.achievementManager = achievementManager;
    });
  } else {
    console.log('✅ DOM已加载完成，直接创建AchievementManager实例');
    achievementManager = new AchievementManager();
    window.achievementManager = achievementManager;
  }
} 