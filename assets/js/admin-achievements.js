// 成就管理JavaScript文件
console.log('🎯 成就管理JavaScript文件已加载 - ' + new Date().toLocaleTimeString());

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

// 全局变量，防止重复初始化
let achievementManager;

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
    this.selectedIcon = null;
    this.currentEditingAchievement = null;
    this.currentEditingCategory = null;
    this.uploading = false;
    this.statsRefreshInterval = null; // 统计信息刷新定时器
    
    this.init();
  }

  async init() {
    console.log('🚀 初始化成就管理器');
    // 临时设置页面标识，让EventManager能正确识别当前页面
    document.body.setAttribute('data-page', 'admin-achievements');
    
    await this.loadCategories();
    await this.loadAchievements();
    await this.loadStats();
    this.setupEventListeners();
    this.setupFilters();
    
    // 设置定时刷新统计信息（每30秒刷新一次）
    this.statsRefreshInterval = setInterval(() => {
      console.log('📊 定时刷新成就统计信息...');
      this.loadStats();
    }, 30000);
    
    // 页面卸载时清理定时器
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  // EventManager 需要的 buttonClick 方法
  buttonClick(data, event) {
    console.log('🎯 AchievementManager.buttonClick 被调用', data, event);
    const { action, target } = data;
    
    switch (action) {
      case 'addAchievementBtn':
        this.showAchievementModal();
        break;
      case 'addCategoryBtn':
        this.showCategoryModal();
        break;
      case 'downloadIconsBtn':
        this.downloadIcons();
        break;
      case 'iconPickerBtn':
        this.showIconPickerModal();
        break;
      case 'uploadIconBtn':
        this.triggerIconUpload();
        break;
      case 'resetFiltersBtn':
        this.resetFilters();
        break;
      default:
        console.warn('未识别的按钮动作:', action);
    }
  }

  // 清理定时器
  cleanup() {
    if (this.statsRefreshInterval) {
      clearInterval(this.statsRefreshInterval);
      this.statsRefreshInterval = null;
      console.log('📊 清理成就统计信息刷新定时器');
    }
  }

  // 合并后的事件监听器
  setupEventListeners() {
    // 按钮点击事件（EventManager分发用）
    document.addEventListener('click', (e) => {
      const target = e.target;
      // 按钮分发
      if (target.id === 'addAchievementBtn' || target.closest('#addAchievementBtn')) {
        e.preventDefault();
        this.showAchievementModal();
      }
      if (target.id === 'addCategoryBtn' || target.closest('#addCategoryBtn')) {
        e.preventDefault();
        this.showCategoryModal();
      }
      if (target.id === 'downloadIconsBtn' || target.closest('#downloadIconsBtn')) {
        e.preventDefault();
        this.downloadIcons();
      }
      if (target.id === 'iconPickerBtn' || target.closest('#iconPickerBtn')) {
        e.preventDefault();
        this.showIconPickerModal();
      }
      if (target.id === 'uploadIconBtn' || target.closest('#uploadIconBtn')) {
        e.preventDefault();
        this.triggerIconUpload();
      }
      if (target.id === 'resetFiltersBtn' || target.closest('#resetFiltersBtn')) {
        e.preventDefault();
        this.resetFilters();
      }
      // 图标选择器点击事件
      if (e.target.classList.contains('icon-item') || e.target.closest('.icon-item')) {
        const item = e.target.classList.contains('icon-item') ? e.target : e.target.closest('.icon-item');
        // 移除所有选中
        document.querySelectorAll('.icon-item.selected').forEach(el => el.classList.remove('selected'));
        // 当前项加选中
        item.classList.add('selected');
        // 自动滚动到可见
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        // 触发原有逻辑
        this.selectIcon(item.dataset.icon);
      }
    });

    // 表单提交事件
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'achievementForm') {
        e.preventDefault();
        this.saveAchievement();
      }
      if (e.target.id === 'categoryForm') {
        e.preventDefault();
        this.saveCategory();
      }
    });
  }

  // 设置筛选器
  setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');

    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this.filters.search = e.target.value;
        this.currentPage = 1;
        this.loadAchievements();
      }, 300));
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.filters.category = e.target.value;
        this.currentPage = 1;
        this.loadAchievements();
      });
    }

    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.filters.status = e.target.value;
        this.currentPage = 1;
        this.loadAchievements();
      });
    }
  }

  // 重置筛选器
  resetFilters() {
    this.filters = { search: '', category: '', status: '' };
    this.currentPage = 1;
    
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    this.loadAchievements();
  }

  // 加载成就列表
  async loadAchievements() {
    try {
      console.log('📋 加载成就列表');
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize,
        search: this.filters.search,
        category: this.filters.category,
        status: this.filters.status
      });

      const response = await fetch(this.getApiUrl(`/api/admin/achievements?${params}`), {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.achievements = data.achievements || [];
      this.renderAchievements();
      this.renderPagination(data.pagination);
    } catch (error) {
      console.error('获取成就列表失败:', error);
      this.showToast('获取成就列表失败', 'error');
    }
  }

  // 渲染成就列表
  renderAchievements() {
    const tbody = document.getElementById('achievementsTableBody');
    if (!tbody) return;

    tbody.innerHTML = this.achievements.map(achievement => `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="w-8 h-8 flex items-center justify-center">
              ${this.renderIcon(achievement.icon)}
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900 dark:text-white">${achievement.name}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">${achievement.description || ''}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ${achievement.category_name || '未分类'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          ${this.getTriggerTypeText(achievement.trigger_type)} ${achievement.required_count}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          ${achievement.points} 积分
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${achievement.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
            ${achievement.is_active ? '启用' : '禁用'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <button onclick="achievementManager.editAchievement(${achievement.id})" 
                  class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
            编辑
          </button>
          <button onclick="achievementManager.deleteAchievement(${achievement.id})" 
                  class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
            删除
          </button>
        </td>
      </tr>
    `).join('');
  }

  // 渲染图标
  renderIcon(icon) {
    if (!icon) {
      return '<span class="text-gray-400 text-lg">🏆</span>';
    }
    
    if (icon.startsWith('http') || icon.startsWith('/')) {
      return `<img src="${icon}" alt="图标" class="w-6 h-6 object-contain">`;
    }
    
    if (icon.length <= 2) {
      return `<span class="text-lg">${icon}</span>`;
    }
    
    return `<img src="${icon}" alt="图标" class="w-6 h-6 object-contain">`;
  }

  // 获取触发类型文本
  getTriggerTypeText(triggerType) {
    const types = {
      'total_duration': '总学习时长',
      'total_sessions': '总学习次数',
      'consecutive_days': '连续学习天数',
      'total_projects': '完成项目数'
    };
    return types[triggerType] || triggerType;
  }

  // 渲染分页
  renderPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv || !pagination) return;

    const { page, totalPages, total } = pagination;
    
    let paginationHTML = `
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-700 dark:text-gray-300">
          显示第 ${(page - 1) * this.pageSize + 1} 到 ${Math.min(page * this.pageSize, total)} 条，共 ${total} 条记录
        </div>
        <div class="flex space-x-2">
    `;

    // 上一页
    if (page > 1) {
      paginationHTML += `
        <button onclick="achievementManager.goToPage(${page - 1})" 
                class="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
          上一页
        </button>
      `;
    }

    // 页码
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      paginationHTML += `
        <button onclick="achievementManager.goToPage(${i})" 
                class="px-3 py-1 text-sm ${i === page ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'} rounded-md">
          ${i}
        </button>
      `;
    }

    // 下一页
    if (page < totalPages) {
      paginationHTML += `
        <button onclick="achievementManager.goToPage(${page + 1})" 
                class="px-3 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600">
          下一页
        </button>
      `;
    }

    paginationHTML += '</div></div>';
    paginationDiv.innerHTML = paginationHTML;
  }

  // 跳转到指定页面
  goToPage(page) {
    this.currentPage = page;
    this.loadAchievements();
  }

  // 加载分类列表
  async loadCategories() {
    try {
      console.log('📂 加载分类列表');
      const response = await fetch(this.getApiUrl('/api/admin/achievement-categories'), {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.categories = data.data || [];
      this.renderCategoryOptions();
    } catch (error) {
      console.error('获取分类列表失败:', error);
    }
  }

  // 渲染分类选项
  renderCategoryOptions() {
    const categorySelect = document.getElementById('achievementCategory');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const options = this.categories.map(category => 
      `<option value="${category.id}">${category.name}</option>`
    ).join('');

    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">选择分类</option>' + options;
    }
    
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">所有分类</option>' + options;
    }
  }

  // 加载统计数据
  async loadStats() {
    try {
      console.log('📊 加载统计数据');
      const response = await fetch(this.getApiUrl('/api/admin/achievement-stats'), {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        this.renderStats(result.data);
      } else {
        console.error('统计数据格式错误:', result);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  }

  // 渲染统计数据
  renderStats(stats) {
    console.log('📊 渲染统计数据:', stats);
    const elements = {
      totalAchievements: stats.totalAchievements || 0,
      totalCategories: stats.totalCategories || 0,
      totalUsers: stats.activeUsers || 0, // API返回的是activeUsers
      totalPoints: stats.totalPoints || 0
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value.toLocaleString();
        console.log(`✅ 更新 ${id}: ${value}`);
      } else {
        console.warn(`⚠️ 找不到元素: ${id}`);
      }
    });
  }

  // 显示成就模态框
  async showAchievementModal(achievement = null) {
    console.log('🎯 显示成就模态框', achievement);
    this.currentEditingAchievement = achievement;
    
    const modal = document.getElementById('achievementModal');
    const modalTitle = document.getElementById('achievementModalTitle');
    const form = document.getElementById('achievementForm');
    
    if (!modal || !modalTitle || !form) {
      console.error('模态框元素未找到');
      return;
    }

    // 设置标题
    modalTitle.textContent = achievement ? '编辑成就' : '添加成就';
    
    // 重置表单
    form.reset();
    
    // 重新加载分类选项，确保显示最新的分类列表
    await this.loadCategories();
    
    // 填充表单数据
    if (achievement) {
      this.populateAchievementForm(achievement);
    } else {
      // 设置默认值
      const pointsField = document.getElementById('achievementPoints');
      const countField = document.getElementById('requiredCount');
      const activeField = document.getElementById('achievementActive');
      
      if (pointsField) pointsField.value = '0';
      if (countField) countField.value = '1';
      if (activeField) activeField.checked = true;
    }
    
    // 显示模态框 - 修复显示逻辑
    modal.classList.remove('hidden');
    
    // 获取内层容器并修复其样式 - 使用更精确的选择器
    const modalContent = modal.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl.shadow-2xl');
    if (modalContent) {
      modalContent.classList.remove('opacity-0');
      modalContent.classList.remove('scale-95');
      modalContent.classList.add('opacity-100');
      modalContent.classList.add('scale-100');
    }
    
    // 更新图标预览
    this.updateIconPreview();
  }

  // 填充成就表单
  populateAchievementForm(achievement) {
    const fields = {
      achievementId: achievement.id,
      achievementName: achievement.name,
      achievementCategory: achievement.category_id,
      achievementDescription: achievement.description || '',
      achievementIcon: achievement.icon || '',
      triggerType: achievement.trigger_type,
      requiredCount: achievement.required_count || 1,
      achievementPoints: achievement.points || 0,
      achievementActive: achievement.is_active
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        if (element.type === 'checkbox') {
          element.checked = value;
        } else {
          element.value = value;
        }
      }
    });
  }

  // 关闭成就模态框
  closeAchievementModal() {
    console.log('❌ 关闭成就模态框');
    const modal = document.getElementById('achievementModal');
    if (modal) {
      modal.classList.add('hidden');
      
      // 获取内层容器并修复其样式 - 使用更精确的选择器
      const modalContent = modal.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl.shadow-2xl');
      if (modalContent) {
        modalContent.classList.remove('opacity-100');
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('opacity-0');
        modalContent.classList.add('scale-95');
      }
    }
    this.currentEditingAchievement = null;
    this.selectedIcon = null;
  }

  // 保存成就
  async saveAchievement() {
    try {
      console.log('💾 保存成就');
      const form = document.getElementById('achievementForm');
      const formData = new FormData(form);
      
      const achievementData = {
        name: formData.get('name'),
        category_id: formData.get('category_id'),
        description: formData.get('description'),
        icon: formData.get('icon'),
        trigger_type: formData.get('trigger_type'),
        required_count: parseInt(formData.get('required_count')),
        points: parseInt(formData.get('points')),
        is_active: formData.get('is_active') === 'on'
      };

      if (this.currentEditingAchievement) {
        achievementData.id = this.currentEditingAchievement.id;
      }

      const url = this.currentEditingAchievement 
        ? this.getApiUrl(`/api/admin/achievements/${this.currentEditingAchievement.id}`)
        : this.getApiUrl('/api/admin/achievements');
      
      const method = this.currentEditingAchievement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(achievementData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.showToast(this.currentEditingAchievement ? '成就更新成功' : '成就创建成功', 'success');
        this.closeAchievementModal();
        await this.loadAchievements();
        await this.loadStats();
      } else {
        throw new Error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存成就失败:', error);
      this.showToast('保存失败: ' + error.message, 'error');
    }
  }

  // 编辑成就
  async editAchievement(id) {
    try {
      console.log('✏️ 编辑成就', id);
      const response = await fetch(this.getApiUrl(`/api/admin/achievements/${id}`), {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.achievement) {
        this.showAchievementModal(data.achievement);
      }
    } catch (error) {
      console.error('编辑成就失败:', error);
      this.showToast('获取成就详情失败', 'error');
    }
  }

  // 删除成就
  async deleteAchievement(id) {
    try {
      console.log('🗑️ 删除成就', id);
      
      // 获取成就信息用于显示名称
      const achievement = this.achievements.find(a => a.id === id);
      if (!achievement) {
        this.showToast('成就不存在', 'error');
        return;
      }

      // 使用自定义确认对话框
      const confirmed = await this.showConfirmDialog(
        '删除成就',
        `确定要删除成就"${achievement.name}"吗？此操作不可撤销！`,
        '删除',
        '取消'
      );

      if (!confirmed) {
        return;
      }

      const response = await fetch(this.getApiUrl(`/api/admin/achievements/${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.showToast('成就删除成功', 'success');
        await this.loadAchievements();
        await this.loadStats();
      } else {
        throw new Error(result.message || '删除失败');
      }
    } catch (error) {
      console.error('删除成就失败:', error);
      this.showToast('删除失败: ' + error.message, 'error');
    }
  }

  // 显示分类模态框
  showCategoryModal(category = null) {
    console.log('📂 显示分类模态框', category);
    this.currentEditingCategory = category;
    
    const modal = document.getElementById('categoryModal');
    const modalTitle = document.getElementById('categoryModalTitle');
    const form = document.getElementById('categoryForm');
    
    if (!modal || !modalTitle || !form) {
      console.error('分类模态框元素未找到');
      return;
    }

    // 设置标题
    modalTitle.textContent = category ? '编辑分类' : '添加分类';
    
    // 重置表单
    form.reset();
    
    // 填充表单数据
    if (category) {
      this.populateCategoryForm(category);
    }
    
    // 显示模态框 - 修复显示逻辑
    modal.classList.remove('hidden');
    
    // 获取内层容器并修复其样式 - 使用更精确的选择器
    const modalContent = modal.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl.shadow-2xl');
    if (modalContent) {
      modalContent.classList.remove('opacity-0');
      modalContent.classList.remove('scale-95');
      modalContent.classList.add('opacity-100');
      modalContent.classList.add('scale-100');
    }
  }

  // 填充分类表单
  populateCategoryForm(category) {
    const fields = {
      categoryId: category.id,
      categoryName: category.name,
      categoryDescription: category.description || ''
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = value;
      }
    });
  }

  // 关闭分类模态框
  closeCategoryModal() {
    console.log('❌ 关闭分类模态框');
    const modal = document.getElementById('categoryModal');
    if (modal) {
      modal.classList.add('hidden');
      // 获取内层容器并修复其样式 - 使用更精确的选择器
      const modalContent = modal.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl.shadow-2xl');
      if (modalContent) {
        modalContent.classList.remove('opacity-100');
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('opacity-0');
        modalContent.classList.add('scale-95');
      }
    }
    this.currentEditingCategory = null;
  }

  // 保存分类
  async saveCategory() {
    try {
      console.log('💾 保存分类');
      const form = document.getElementById('categoryForm');
      const formData = new FormData(form);
      
      const categoryData = {
        name: formData.get('name'),
        description: formData.get('description')
      };

      if (this.currentEditingCategory) {
        categoryData.id = this.currentEditingCategory.id;
      }

      const response = await fetch(this.getApiUrl('/api/admin/achievement-categories'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.showToast(this.currentEditingCategory ? '分类更新成功' : '分类创建成功', 'success');
        this.closeCategoryModal();
        
        // 重新加载分类列表和统计数据
        await this.loadCategories();
        await this.loadStats();
        
        // 如果成就弹窗是打开的，也要更新其中的分类选择器
        const achievementModal = document.getElementById('achievementModal');
        if (achievementModal && !achievementModal.classList.contains('hidden')) {
          this.renderCategoryOptions();
        }
      } else {
        throw new Error(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存分类失败:', error);
      this.showToast('保存失败: ' + error.message, 'error');
    }
  }

  // 显示图标选择器模态框
  showIconPickerModal() {
    console.log('🎨 显示图标选择器模态框');
    const modal = document.getElementById('iconPickerModal');
    if (modal) {
      modal.classList.remove('hidden');
      // 获取内层容器并修复其样式 - 使用更精确的选择器
      const modalContent = modal.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl.shadow-2xl');
      if (modalContent) {
        modalContent.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('opacity-100');
        modalContent.classList.add('scale-100');
      }
      this.loadIcons();
      // 自动高亮当前选中
      setTimeout(() => {
        if (this.selectedIcon) {
          document.querySelectorAll('.icon-item.selected').forEach(el => el.classList.remove('selected'));
          const current = document.querySelector('.icon-item[data-icon="' + this.selectedIcon + '"]');
          if (current) current.classList.add('selected');
        }
      }, 50);
    }
  }

  // 关闭图标选择器模态框
  closeIconPickerModal() {
    console.log('❌ 关闭图标选择器模态框');
    const modal = document.getElementById('iconPickerModal');
    if (modal) {
      modal.classList.add('hidden');
      // 获取内层容器并修复其样式 - 使用更精确的选择器
      const modalContent = modal.querySelector('.bg-white.dark\\:bg-gray-900.rounded-2xl.shadow-2xl');
      if (modalContent) {
        modalContent.classList.remove('opacity-100');
        modalContent.classList.remove('scale-100');
        modalContent.classList.add('opacity-0');
        modalContent.classList.add('scale-95');
      }
    }
  }

  // 加载图标
  async loadIcons() {
    try {
      console.log('🖼️ 加载图标');
      const loading = document.getElementById('iconLoading');
      const grid = document.getElementById('iconGrid');
      const noResults = document.getElementById('iconNoResults');
      
      if (loading) loading.classList.remove('hidden');
      if (grid) grid.innerHTML = '';
      if (noResults) noResults.classList.add('hidden');

      // 加载Emoji图标
      const emojiIcons = this.getEmojiIcons();
      
      // 加载系统图标
      const systemIcons = await this.getSystemIcons();
      
      // 加载自定义图标
      const customIcons = await this.getCustomIcons();
      
      // 合并所有图标
      const allIcons = [
        ...emojiIcons.map(icon => ({ ...icon, category: 'emoji' })),
        ...systemIcons.map(icon => ({ ...icon, category: 'system' })),
        ...customIcons.map(icon => ({ ...icon, category: 'custom' }))
      ];

      this.renderIcons(allIcons);
      
      if (loading) loading.classList.add('hidden');
    } catch (error) {
      console.error('加载图标失败:', error);
      this.showToast('加载图标失败', 'error');
    }
  }

  // 获取Emoji图标
  getEmojiIcons() {
    return [
      '🏆', '🥇', '🥈', '🥉', '⭐', '🌟', '💎', '🎖️', '🏅', '🎯',
      '📚', '📖', '📝', '✏️', '🖊️', '📐', '🧮', '📊', '📈', '💡',
      '🎨', '🎭', '🎬', '🎤', '🎧', '🎼', '🎹', '🎸', '🎺', '🎻',
      '🎮', '🎲', '🧩', '💸', '💰', '💳', '🔨', '🛠️', '🔧', '⚙️'
    ].map(emoji => ({
      id: emoji,
      name: emoji,
      path: emoji,
      type: 'emoji'
    }));
  }

  // 获取系统图标
  async getSystemIcons() {
    try {
      const response = await fetch(this.getApiUrl('/api/admin/icons/system'), {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.icons || [];
    } catch (error) {
      console.error('获取系统图标失败:', error);
      return [];
    }
  }

  // 获取自定义图标
  async getCustomIcons() {
    try {
      const response = await fetch(this.getApiUrl('/api/admin/icons/custom'), {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.icons || [];
    } catch (error) {
      console.error('获取自定义图标失败:', error);
      return [];
    }
  }

  // 渲染图标网格
  renderIcons(icons) {
    const grid = document.getElementById('iconGrid');
    const loading = document.getElementById('iconLoading');
    
    if (!grid) return;

    // 隐藏加载状态
    if (loading) loading.classList.add('hidden');

    // 过滤图标
    let filteredIcons = icons;
    
    if (filteredIcons.length === 0) {
      grid.innerHTML = `
        <div class="col-span-5 text-center py-8 text-gray-500">
          <div class="text-4xl mb-2">😕</div>
          <p>演示图标</p>
        </div>
      `;
      return;
    }

    // 渲染emoji网格（每行10个）
    grid.innerHTML = filteredIcons.map(icon => {
      const isEmoji = icon.type === 'emoji' || icon.path.length <= 2;
      const iconContent = isEmoji ? icon.path : this.renderIcon(icon.path);
      return `
        <div class="icon-item flex items-center justify-center cursor-pointer p-2 m-1 rounded-lg border border-transparent hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 select-none text-2xl"
             data-icon="${icon.path}"
             title="${icon.name || icon.path}">
          ${iconContent}
        </div>
      `;
    }).join('');
    // 设置grid样式
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(10, minmax(0, 1fr))';
    grid.style.gap = '8px';
  }

  // 选择图标
  selectIcon(iconPath) {
    console.log('✅ 选择图标:', iconPath);
    this.selectedIcon = iconPath;
    
    // 更新选择状态
    document.querySelectorAll('.icon-item').forEach(item => {
      item.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'border-blue-300', 'dark:border-blue-600');
      if (item.dataset.icon === iconPath) {
        item.classList.add('bg-blue-100', 'dark:bg-blue-900', 'border-blue-300', 'dark:border-blue-600');
      }
    });
    
    // 更新成就表单中的图标字段
    const iconInput = document.getElementById('achievementIcon');
    if (iconInput) {
      iconInput.value = iconPath;
      this.updateIconPreview();
    }
  }

  // 选择当前图标
  selectCurrentIcon() {
    if (this.selectedIcon) {
      this.closeIconPickerModal();
      this.showToast('图标选择成功', 'success');
    } else {
      this.showToast('请先选择一个图标', 'warning');
    }
  }

  // 触发图标上传（加锁防止多次弹窗）
  triggerIconUpload() {
    if (this.uploading) return; // 防止多次触发
    this.uploading = true;
    const fileInput = document.getElementById('iconFileInput');
    if (fileInput) {
      // 清空上次选择，防止同一文件无法重复上传
      fileInput.value = '';
      
      // 每次点击时重新绑定change事件，确保input元素有效
      const changeHandler = (e) => {
        const file = e.target.files[0];
        if (file) {
          this.handleIconUpload(file);
        }
        this.uploading = false;
        // 解绑事件，防止重复绑定
        fileInput.removeEventListener('change', changeHandler);
      };
      
      fileInput.addEventListener('change', changeHandler);
      fileInput.click();
    } else {
      this.uploading = false;
    }
  }

  // 处理图标上传
  async handleIconUpload(file) {
    if (!file) return;

    try {
      console.log('📤 上传图标:', file.name);
      
      const formData = new FormData();
      formData.append('icon', file);

      const response = await fetch(this.getApiUrl('/api/upload/achievement-icon'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.showToast('图标上传成功', 'success');
        
        // 更新图标输入框
        const iconInput = document.getElementById('achievementIcon');
        if (iconInput) {
          iconInput.value = result.data.path;
          this.updateIconPreview();
        }
        
        // 重新加载图标选择器
        if (document.getElementById('iconPickerModal') && !document.getElementById('iconPickerModal').classList.contains('hidden')) {
          this.loadIcons();
        }
      } else {
        throw new Error(result.error || '上传失败');
      }
    } catch (error) {
      console.error('图标上传失败:', error);
      this.showToast('图标上传失败: ' + error.message, 'error');
      this.uploading = false; // 确保在错误时也重置状态
    }
  }

  // 更新图标预览
  updateIconPreview() {
    const iconInput = document.getElementById('achievementIcon');
    const previewContainer = document.getElementById('previewContainer');
    const previewText = document.getElementById('previewText');
    const previewPath = document.getElementById('previewPath');
    
    if (!iconInput || !previewContainer || !previewText || !previewPath) return;

    const iconPath = iconInput.value.trim();
    
    if (!iconPath) {
      previewContainer.innerHTML = '<span class="text-gray-400 text-xs">预览</span>';
      previewPath.textContent = '';
      return;
    }

    previewPath.textContent = iconPath;
    
    if (iconPath.length <= 2) {
      // Emoji
      previewContainer.innerHTML = `<span class="text-lg">${iconPath}</span>`;
    } else if (iconPath.startsWith('http') || iconPath.startsWith('/')) {
      // 图片路径
      previewContainer.innerHTML = `<img src="${iconPath}" alt="图标" class="w-6 h-6 object-contain">`;
    } else {
      // 其他
      previewContainer.innerHTML = `<span class="text-gray-400 text-xs">预览</span>`;
    }
  }

  // 下载图标
  async downloadIcons() {
    try {
      console.log('📥 下载图标');
      
      const response = await fetch(this.getApiUrl('/api/admin/achievements/download-icons'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.showToast('图标下载完成: ' + result.message, 'success');
        console.log('下载结果:', result.results);
      } else {
        throw new Error(result.error || '下载失败');
      }
    } catch (error) {
      console.error('下载图标失败:', error);
      this.showToast('下载图标失败: ' + error.message, 'error');
    }
  }

  // 获取Token
  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  // 显示Toast消息
  showToast(message, type = 'info') {
    // 使用演示模式通知系统
    window.demoModeShowToast(message, type);
  }

  // 处理上传图标按钮点击
  handleUploadIconClick() {
    console.log('📤 处理上传图标按钮点击');
    this.triggerIconUpload();
  }

  // 显示图标选择器
  showIconPicker() {
    console.log('🎨 显示图标选择器');
    this.showIconPickerModal();
  }

  // 处理文件输入框点击
  handleFileInputClick() {
    console.log('📁 处理文件输入框点击');
    const fileInput = document.getElementById('iconFileInput');
    if (fileInput) {
      fileInput.click();
    }
  }

  // 更新触发器配置
  updateTriggerConfig(triggerType) {
    console.log('⚙️ 更新触发器配置:', triggerType);
    // 这里可以根据触发器类型显示/隐藏相关配置字段
  }

  // 显示确认对话框
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
              <button type="button" class="confirm-cancel-btn flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300">
                ${cancelText}
              </button>
              <button type="button" class="confirm-confirm-btn flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-300">
                ${confirmText}
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 使用类选择器而不是ID，避免与全局监听器冲突
      const confirmBtn = modal.querySelector('.confirm-confirm-btn');
      const cancelBtn = modal.querySelector('.confirm-cancel-btn');

      let isResolved = false;

      const cleanup = () => {
        if (isResolved) return;
        isResolved = true;
        
        // 移除ESC键监听器
        document.removeEventListener('keydown', handleEsc);
        
        // 安全移除模态框
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      };

      // 确认按钮事件
      const handleConfirm = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        resolve(true);
      };

      // 取消按钮事件
      const handleCancel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        resolve(false);
      };

      // 绑定事件监听器
      confirmBtn.addEventListener('click', handleConfirm, { once: true });
      cancelBtn.addEventListener('click', handleCancel, { once: true });

      // 点击背景关闭
      const handleBackgroundClick = (e) => {
        if (e.target === modal) {
          e.preventDefault();
          e.stopPropagation();
          cleanup();
          resolve(false);
        }
      };
      modal.addEventListener('click', handleBackgroundClick, { once: true });

      // ESC键关闭
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cleanup();
          resolve(false);
        }
      };
      document.addEventListener('keydown', handleEsc);
    });
  }

  // fetch 路径适配函数
  getApiUrl(path) {
    return window.isDemo ? `/demo${path}` : path;
  }
}

// 初始化函数
function initializeAchievementManager() {
  if (!achievementManager) {
    achievementManager = new AchievementManager();
    window.achievementManager = achievementManager;
    window.AchievementManager = { instance: achievementManager };
    if (window.EventManager) {
      window.EventManager.registerPageManager('admin-achievements', achievementManager);
    }
  }
  return achievementManager;
}

// DOMContentLoaded 或 SPA 入口调用
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAchievementManager);
} else {
  initializeAchievementManager();
}

// 全局函数
function closeAchievementModal() {
  if (achievementManager) {
    achievementManager.closeAchievementModal();
  }
}

function closeCategoryModal() {
  if (achievementManager) {
    achievementManager.closeCategoryModal();
  }
}

function closeIconPickerModal() {
  if (achievementManager) {
    achievementManager.closeIconPickerModal();
  }
}

function saveAchievement() {
  if (achievementManager) {
    achievementManager.saveAchievement();
  }
}

function saveCategory() {
  if (achievementManager) {
    achievementManager.saveCategory();
  }
}

function selectCurrentIcon() {
  if (achievementManager) {
    achievementManager.selectCurrentIcon();
  }
}

// 图标选择器搜索和筛选
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('iconSearchInput');
  const categoryFilter = document.getElementById('iconCategoryFilter');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      if (achievementManager) {
        achievementManager.loadIcons();
      }
    }, 300));
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
      if (achievementManager) {
        achievementManager.loadIcons();
      }
    });
  }
  
  // 图标输入框变化时更新预览
  const iconInput = document.getElementById('achievementIcon');
  if (iconInput) {
    iconInput.addEventListener('input', () => {
      if (achievementManager) {
        achievementManager.updateIconPreview();
      }
    });
  }
});

console.log('✅ 成就管理JavaScript文件加载完成');