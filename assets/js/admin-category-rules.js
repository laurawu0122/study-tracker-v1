// 分类和积分规则管理功能
class CategoryRulesManager {
  constructor() {
    this.categories = [];
    this.pointsRules = [];
    this.currentCategory = null;
    this.currentRule = null;
    this.isEditingCategory = false;
    this.isEditingRule = false;
    
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
  }

  async loadData() {
    try {
      // 加载分类数据
      const categoriesResponse = await fetch('/api/points-exchange/admin/categories');
      const categoriesResult = await categoriesResponse.json();
      if (categoriesResult.success) {
        this.categories = categoriesResult.data;
      }

      // 加载积分规则数据
      const rulesResponse = await fetch('/api/points-exchange/admin/points-rules');
      const rulesResult = await rulesResponse.json();
      if (rulesResult.success) {
        this.pointsRules = rulesResult.data;
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      this.showNotification('加载数据失败', 'error');
    }
  }

  bindEvents() {
    // 分类管理事件
    document.addEventListener('click', (e) => {
      if (e.target.id === 'closeCategoryModalBtn' || e.target.id === 'cancelCategoryBtn') {
        e.preventDefault();
        this.closeCategoryModal();
      } else if (e.target.id === 'saveCategoryBtn') {
        e.preventDefault();
        this.saveCategory();
      } else if (e.target.id === 'addCategoryBtn') {
        e.preventDefault();
        this.showCategoryForm();
      }
    });

    // 积分规则管理事件
    document.addEventListener('click', (e) => {
      if (e.target.id === 'closeRulesModalBtn' || e.target.id === 'cancelRuleBtn') {
        e.preventDefault();
        this.closeRulesModal();
      } else if (e.target.id === 'saveRuleBtn') {
        e.preventDefault();
        this.saveRule();
      } else if (e.target.id === 'addRuleBtn') {
        e.preventDefault();
        this.showRuleForm();
      }
    });

    // 触发类型变化事件
    document.getElementById('ruleTriggerType')?.addEventListener('change', (e) => {
      this.showConditionForm(e.target.value);
    });

    // 点击弹窗外部关闭
    document.addEventListener('click', (e) => {
      const categoryModal = document.getElementById('categoryModal');
      const rulesModal = document.getElementById('rulesModal');
      
      if (categoryModal && e.target === categoryModal) {
        this.closeCategoryModal();
      }
      if (rulesModal && e.target === rulesModal) {
        this.closeRulesModal();
      }
    });
  }

  // 分类管理方法
  openCategoryModal() {
    this.currentCategory = null;
    this.isEditingCategory = false;
    
    const modal = document.getElementById('categoryModal');
    const modalTitle = document.getElementById('categoryModalTitle');
    const categoryList = document.getElementById('categoryList');
    const categoryForm = document.getElementById('categoryForm');
    const saveBtn = document.getElementById('saveCategoryBtn');
    
    modalTitle.textContent = '分类管理';
    categoryForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
    
    this.renderCategoryList();
    
    // 禁用背景滚动
    document.body.style.overflow = 'hidden';
    
    modal.classList.remove('hidden');
    setTimeout(() => {
      const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
      if (modalContent) {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }
    }, 10);
  }

  closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }
    
    setTimeout(() => {
      modal.classList.add('hidden');
      // 恢复背景滚动
      document.body.style.overflow = '';
    }, 300);
    
    this.currentCategory = null;
    this.isEditingCategory = false;
  }

  renderCategoryList() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;

    if (this.categories.length === 0) {
      categoryList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          暂无分类数据
        </div>
      `;
      return;
    }

    categoryList.innerHTML = this.categories.map(category => `
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 flex items-center justify-center text-lg">
            ${category.icon || '📁'}
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white">${category.name}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">${category.description || '暂无描述'}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="px-2 py-1 text-xs rounded-full ${category.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
            ${category.is_active ? '启用' : '禁用'}
          </span>
          <button onclick="if(window.categoryRulesManager) window.categoryRulesManager.editCategory(${category.id})" 
                  class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            编辑
          </button>
          <button onclick="if(window.categoryRulesManager) window.categoryRulesManager.deleteCategory(${category.id})" 
                  class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md">
            删除
          </button>
        </div>
      </div>
    `).join('');
  }

  showCategoryForm(category = null) {
    this.currentCategory = category;
    this.isEditingCategory = !!category;
    
    const categoryForm = document.getElementById('categoryForm');
    const categoryFormTitle = document.getElementById('categoryFormTitle');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const form = document.getElementById('categoryFormElement');
    
    if (category) {
      categoryFormTitle.textContent = '编辑分类';
      this.fillCategoryForm(category);
    } else {
      categoryFormTitle.textContent = '添加分类';
      form.reset();
    }
    
    categoryForm.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
  }

  fillCategoryForm(category) {
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryIcon').value = category.icon || '';
    document.getElementById('categorySort').value = category.sort_order || 0;
    document.getElementById('categoryActive').checked = category.is_active !== false;
  }

  async saveCategory() {
    const form = document.getElementById('categoryFormElement');
    const formData = new FormData(form);
    
    const categoryData = {
      name: formData.get('name'),
      description: formData.get('description'),
      icon: formData.get('icon'),
      sort_order: formData.get('sort_order'),
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const url = this.isEditingCategory 
        ? `/api/points-exchange/admin/categories/${this.currentCategory.id}`
        : '/api/points-exchange/admin/categories';
      
      const method = this.isEditingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification(result.message || '保存成功', 'success');
        await this.loadData();
        this.renderCategoryList();
        this.hideCategoryForm();
      } else {
        this.showNotification(result.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存分类失败:', error);
      this.showNotification('保存失败', 'error');
    }
  }

  hideCategoryForm() {
    const categoryForm = document.getElementById('categoryForm');
    const saveBtn = document.getElementById('saveCategoryBtn');
    categoryForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
  }

  async editCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      this.showCategoryForm(category);
    }
  }

  async deleteCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return;

    if (!confirm(`确定要删除分类"${category.name}"吗？此操作不可恢复！`)) return;

    try {
      const response = await fetch(`/api/points-exchange/admin/categories/${categoryId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('分类删除成功', 'success');
        await this.loadData();
        this.renderCategoryList();
      } else {
        this.showNotification(result.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  // 积分规则管理方法
  openRulesModal() {
    this.currentRule = null;
    this.isEditingRule = false;
    
    const modal = document.getElementById('rulesModal');
    const modalTitle = document.getElementById('rulesModalTitle');
    const rulesList = document.getElementById('rulesList');
    const ruleForm = document.getElementById('ruleForm');
    const saveBtn = document.getElementById('saveRuleBtn');
    
    modalTitle.textContent = '积分规则管理';
    ruleForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
    
    this.renderRulesList();
    
    // 禁用背景滚动
    document.body.style.overflow = 'hidden';
    
    modal.classList.remove('hidden');
    setTimeout(() => {
      const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
      if (modalContent) {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }
    }, 10);
  }

  closeRulesModal() {
    const modal = document.getElementById('rulesModal');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }
    
    setTimeout(() => {
      modal.classList.add('hidden');
      // 恢复背景滚动
      document.body.style.overflow = '';
    }, 300);
    
    this.currentRule = null;
    this.isEditingRule = false;
  }

  renderRulesList() {
    const rulesList = document.getElementById('rulesList');
    if (!rulesList) return;

    if (this.pointsRules.length === 0) {
      rulesList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          暂无积分规则数据
        </div>
      `;
      return;
    }

    rulesList.innerHTML = this.pointsRules.map(rule => {
      const triggerTypeText = {
        'study_duration': '学习时长',
        'project_completion': '项目完成',
        'consecutive_days': '连续学习',
        'efficiency_score': '学习效率'
      }[rule.trigger_type] || rule.trigger_type;

      return `
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 flex items-center justify-center text-lg">
              ⭐
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">${rule.name}</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">${rule.description || '暂无描述'}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">触发类型: ${triggerTypeText} | 积分: ${rule.points}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full ${rule.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
              ${rule.is_active ? '启用' : '禁用'}
            </span>
            <button onclick="if(window.categoryRulesManager) window.categoryRulesManager.editRule(${rule.id})" 
                    class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">
              编辑
            </button>
            <button onclick="if(window.categoryRulesManager) window.categoryRulesManager.deleteRule(${rule.id})" 
                    class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md">
              删除
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  showRuleForm(rule = null) {
    this.currentRule = rule;
    this.isEditingRule = !!rule;
    
    const ruleForm = document.getElementById('ruleForm');
    const ruleFormTitle = document.getElementById('ruleFormTitle');
    const saveBtn = document.getElementById('saveRuleBtn');
    const form = document.getElementById('ruleFormElement');
    
    if (rule) {
      ruleFormTitle.textContent = '编辑积分规则';
      this.fillRuleForm(rule);
    } else {
      ruleFormTitle.textContent = '添加积分规则';
      form.reset();
      this.hideAllConditionForms();
    }
    
    ruleForm.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
  }

  fillRuleForm(rule) {
    document.getElementById('ruleId').value = rule.id;
    document.getElementById('ruleName').value = rule.name;
    document.getElementById('ruleDescription').value = rule.description || '';
    document.getElementById('ruleTriggerType').value = rule.trigger_type;
    document.getElementById('rulePoints').value = rule.points;
    document.getElementById('ruleSort').value = rule.sort_order || 0;
    document.getElementById('ruleActive').checked = rule.is_active !== false;
    
    // 显示对应的条件表单
    this.showConditionForm(rule.trigger_type);
    
    // 填充条件数据
    if (rule.conditions) {
      const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
      this.fillConditionForm(rule.trigger_type, conditions);
    }
  }

  showConditionForm(triggerType) {
    this.hideAllConditionForms();
    
    switch (triggerType) {
      case 'study_duration':
        document.getElementById('studyDurationConditions').classList.remove('hidden');
        break;
      case 'project_completion':
        document.getElementById('projectCompletionConditions').classList.remove('hidden');
        break;
      case 'consecutive_days':
        document.getElementById('consecutiveDaysConditions').classList.remove('hidden');
        break;
      case 'efficiency_score':
        document.getElementById('efficiencyConditions').classList.remove('hidden');
        break;
    }
  }

  hideAllConditionForms() {
    const conditionForms = [
      'studyDurationConditions',
      'projectCompletionConditions', 
      'consecutiveDaysConditions',
      'efficiencyConditions'
    ];
    
    conditionForms.forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
  }

  fillConditionForm(triggerType, conditions) {
    switch (triggerType) {
      case 'study_duration':
        document.getElementById('durationMinutes').value = conditions.duration_minutes || 60;
        document.getElementById('pointsPerHour').value = conditions.points_per_hour || 10;
        break;
      case 'project_completion':
        document.getElementById('pointsPerProject').value = conditions.points_per_project || 50;
        break;
      case 'consecutive_days':
        document.getElementById('daysRequired').value = conditions.days_required || 7;
        document.getElementById('pointsPerStreak').value = conditions.points_per_streak || 30;
        break;
      case 'efficiency_score':
        document.getElementById('minEfficiency').value = conditions.min_efficiency || 80;
        document.getElementById('pointsPerSession').value = conditions.points_per_session || 20;
        break;
    }
  }

  async saveRule() {
    const form = document.getElementById('ruleFormElement');
    const formData = new FormData(form);
    
    const triggerType = formData.get('trigger_type');
    const conditions = this.buildConditions(triggerType, formData);
    
    const ruleData = {
      name: formData.get('name'),
      description: formData.get('description'),
      trigger_type: triggerType,
      conditions: conditions,
      points: parseInt(formData.get('points')),
      sort_order: parseInt(formData.get('sort_order')) || 0,
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const url = this.isEditingRule 
        ? `/api/points-exchange/admin/points-rules/${this.currentRule.id}`
        : '/api/points-exchange/admin/points-rules';
      
      const method = this.isEditingRule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ruleData)
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification(result.message || '保存成功', 'success');
        await this.loadData();
        this.renderRulesList();
        this.hideRuleForm();
      } else {
        this.showNotification(result.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存积分规则失败:', error);
      this.showNotification('保存失败', 'error');
    }
  }

  buildConditions(triggerType, formData) {
    switch (triggerType) {
      case 'study_duration':
        return {
          duration_minutes: parseInt(formData.get('duration_minutes')) || 60,
          points_per_hour: parseInt(formData.get('points_per_hour')) || 10
        };
      case 'project_completion':
        return {
          points_per_project: parseInt(formData.get('points_per_project')) || 50
        };
      case 'consecutive_days':
        return {
          days_required: parseInt(formData.get('days_required')) || 7,
          points_per_streak: parseInt(formData.get('points_per_streak')) || 30
        };
      case 'efficiency_score':
        return {
          min_efficiency: parseInt(formData.get('min_efficiency')) || 80,
          points_per_session: parseInt(formData.get('points_per_session')) || 20
        };
      default:
        return {};
    }
  }

  hideRuleForm() {
    const ruleForm = document.getElementById('ruleForm');
    const saveBtn = document.getElementById('saveRuleBtn');
    ruleForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
  }

  async editRule(ruleId) {
    const rule = this.pointsRules.find(r => r.id === ruleId);
    if (rule) {
      this.showRuleForm(rule);
    }
  }

  async deleteRule(ruleId) {
    const rule = this.pointsRules.find(r => r.id === ruleId);
    if (!rule) return;

    if (!confirm(`确定要删除积分规则"${rule.name}"吗？此操作不可恢复！`)) return;

    try {
      const response = await fetch(`/api/points-exchange/admin/points-rules/${ruleId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('积分规则删除成功', 'success');
        await this.loadData();
        this.renderRulesList();
      } else {
        this.showNotification(result.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除积分规则失败:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    const colors = {
      success: 'bg-green-500 text-white',
      error: 'bg-red-500 text-white',
      warning: 'bg-yellow-500 text-white',
      info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info'} mr-2"></i>
        <span>${message}</span>
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
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// 全局函数
function openCategoryModal() {
  if (window.categoryRulesManager) {
    window.categoryRulesManager.openCategoryModal();
  }
}

function openRulesModal() {
  if (window.categoryRulesManager) {
    window.categoryRulesManager.openRulesModal();
  }
}

// 初始化
let categoryRulesManager;
document.addEventListener('DOMContentLoaded', () => {
  categoryRulesManager = new CategoryRulesManager();
  window.categoryRulesManager = categoryRulesManager;
}); 