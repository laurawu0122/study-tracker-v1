// 全局函数，用于处理按钮点击
window.handleSearchClick = function() {
    console.log('全局查询按钮点击处理函数被调用');
    if (window.adminApp && window.adminApp.filterUsers) {
        window.adminApp.filterUsers();
    } else {
        console.error('adminApp.filterUsers 方法不存在');
    }
};

window.handleResetClick = function() {
    console.log('全局重置按钮点击处理函数被调用');
    if (window.adminApp && window.adminApp.resetFilters) {
        window.adminApp.resetFilters();
    } else {
        console.error('adminApp.resetFilters 方法不存在');
    }
};

// 系统管理页面功能
function initializeAdminPage() {
  console.log('初始化系统管理页面...');
  
  const tabButtons = document.querySelectorAll('.tab-btn');
  const contentArea = document.getElementById('adminContent');
  let currentTab = null;

  if (!contentArea) {
    console.error('找不到 adminContent 元素');
    return;
  }

  // Tab切换功能
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      console.log('点击Tab:', this.getAttribute('data-tab'));
      const tabName = this.getAttribute('data-tab');
      
      // 更新Tab样式
      tabButtons.forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
        btn.classList.add('border-transparent', 'text-gray-600', 'dark:text-gray-300');
      });
      
      this.classList.remove('border-transparent', 'text-gray-600', 'dark:text-gray-300');
      this.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
      
      // 加载对应内容
      loadTabContent(tabName);
      currentTab = tabName;
    });
  });

  // 加载Tab内容
  async function loadTabContent(tabName) {
    console.log('开始加载Tab内容:', tabName);
    const contentArea = document.getElementById('adminContent');
    console.log('adminContent元素:', contentArea);
    
    if (!contentArea) {
      console.error('找不到 adminContent 元素！');
      return;
    }
    
    try {
      // 显示加载状态
      contentArea.innerHTML = `
        <div class="flex justify-center items-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span class="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      `;

      // Add a small delay to prevent rapid successive requests
      await new Promise(resolve => setTimeout(resolve, 200));

      const response = await fetch(`/api/admin/page/${tabName}`, {
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      contentArea.innerHTML = html;

      // 手动执行所有 script 标签，确保动态加载的页面JS能生效
      const scripts = contentArea.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) {
          newScript.src = oldScript.src;
        } else {
          newScript.textContent = oldScript.textContent;
        }
        // 复制所有属性
        Array.from(oldScript.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      // 初始化Tab特定的功能
      initializeTabFunctions(tabName);

    } catch (error) {
      console.error('加载页面内容失败:', error);
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="text-center py-12">
            <div class="text-red-500 text-lg font-medium">加载失败</div>
            <div class="text-gray-600 mt-2">${error.message}</div>
          </div>
        `;
      }
    }
  }

  // 初始化Tab特定功能
  function initializeTabFunctions(tabName) {
    console.log('初始化Tab功能:', tabName);
    switch(tabName) {
      case 'users':
        initializeUserManagement();
        break;
      case 'data':
        initializeDataManagement();
        break;
      case 'achievements':
        initializeAchievementManagement();
        break;
      case 'config':
        initializeSystemConfig();
        break;
      case 'testdata':
        if (window.adminApp && window.adminApp.initTestDataManagement) {
          window.adminApp.initTestDataManagement();
        }
        break;
    }
  }

  // 成就管理功能
  function initializeAchievementManagement() {
    console.log('初始化成就管理功能');
    
    // 检查是否已经有实例
    if (window.achievementManager) {
      console.log('✅ 成就管理器实例已存在，跳过初始化');
      return;
    }
    
    // 检查是否已加载AchievementManager
    if (typeof AchievementManager === 'undefined') {
      // 动态加载JS文件
      const script = document.createElement('script');
      script.src = '/assets/js/admin-achievements.js';
      script.onload = () => {
        setTimeout(() => {
          if (typeof AchievementManager !== 'undefined') {
            const manager = new AchievementManager();
            // 确保实例被暴露到全局作用域
            window.achievementManager = manager;
            console.log('✅ 成就管理器实例创建成功');
          } else {
            console.error('AchievementManager 类仍未找到');
          }
        }, 100);
      };
      document.body.appendChild(script);
    } else {
      setTimeout(() => {
        const manager = new AchievementManager();
        // 确保实例被暴露到全局作用域
        window.achievementManager = manager;
        console.log('✅ 成就管理器实例创建成功');
      }, 100);
    }
  }

  // 用户管理功能
  function initializeUserManagement() {
    console.log('初始化用户管理功能');
    
    // 等待一小段时间确保DOM完全加载
    setTimeout(() => {
      // 调用用户模态框的事件绑定函数
      if (window.userModalFunctions && window.userModalFunctions.bindUserModalEvents) {
        console.log('调用用户模态框事件绑定函数');
        window.userModalFunctions.bindUserModalEvents();
      } else {
        console.log('用户模态框函数未找到，尝试直接绑定事件');
        // 直接绑定添加用户按钮事件
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
          // 移除之前的事件监听器（如果存在）
          addUserBtn.removeEventListener('click', handleAddUserClick);
          addUserBtn.addEventListener('click', handleAddUserClick);
          console.log('已直接绑定添加用户按钮事件');
        } else {
          console.error('未找到addUserBtn元素');
        }
      }
    }, 100);
    
    // 搜索功能
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function() {
        // 使用 AdminApp 实例加载用户列表
        if (window.adminApp && window.adminApp.loadUsers) {
          window.adminApp.loadUsers();
        }
      }, 300));
    }

    // 筛选功能
    const filterSelects = document.querySelectorAll('.user-filter');
    filterSelects.forEach(select => {
      select.addEventListener('change', function() {
        // 使用 AdminApp 实例加载用户列表
        if (window.adminApp && window.adminApp.loadUsers) {
          window.adminApp.loadUsers();
        }
      });
    });

    // 初始加载 - 使用 AdminApp 实例，带重试机制
    function tryLoadUsers(retryCount = 0) {
      if (window.adminApp && window.adminApp.loadUsers) {
        console.log('AdminApp 实例已准备好，开始加载用户列表');
        window.adminApp.loadUsers();
      } else if (retryCount < 10) {
        console.log(`AdminApp 实例未准备好，${retryCount + 1}/10 次重试...`);
        setTimeout(() => {
          tryLoadUsers(retryCount + 1);
        }, 200);
      } else {
        console.error('AdminApp 实例初始化失败，无法加载用户列表');
      }
    }
    
    tryLoadUsers();
  }

  // 处理添加用户按钮点击
  function handleAddUserClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('添加用户按钮被点击（admin.js）');
    
    // 等待一小段时间确保用户管理页面的JavaScript已经加载
    setTimeout(() => {
      // 尝试调用AdminApp的模态框显示函数
      if (window.adminApp && window.adminApp.showUserModal) {
        console.log('调用window.adminApp.showUserModal');
        window.adminApp.showUserModal();
      } else {
        console.error('adminApp.showUserModal函数未找到，尝试备用方案');
        // 备用方案：直接显示模态框
        const modal = document.getElementById('userModal');
        if (modal) {
          modal.classList.remove('hidden');
          console.log('使用备用方案显示模态框');
          
          // 尝试添加动画效果
          const modalContent = document.getElementById('modalContent');
          if (modalContent) {
            setTimeout(() => {
              modalContent.classList.remove('scale-95', 'opacity-0');
              modalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
          }
        } else {
          console.error('模态框元素未找到');
        }
      }
    }, 100);
  }

  // 数据管理功能
  function initializeDataManagement() {
    console.log('初始化数据管理功能');
    // 移除这行，不需要在操作日志中显示页面加载信息
    // this.addOperationLog('📊 加载数据管理页面', 'info');
    
    // 修复：直接调用函数，不使用this
    if (window.adminApp && window.adminApp.loadOperationLogs) {
      window.adminApp.loadOperationLogs();
    }
    if (window.adminApp && window.adminApp.loadUserDataUserFilter) {
      window.adminApp.loadUserDataUserFilter();
    }
    if (window.adminApp && window.adminApp.loadLogsUserFilter) {
      window.adminApp.loadLogsUserFilter();
    }
  }

  // 系统配置功能
  function initializeSystemConfig() {
    console.log('初始化系统配置功能');
    // 初始化配置标签页
    if (window.adminApp && window.adminApp.initConfigTabs) {
      window.adminApp.initConfigTabs();
    }
    // 加载系统配置
    loadSystemConfig();
  }

  // 统计分析功能
  function initializeStatistics() {
    console.log('初始化统计分析功能');
    // 加载统计图表
    loadStatisticsData();
  }

  // 工具函数
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

  // 默认加载用户管理Tab
  if (tabButtons.length > 0) {
    console.log('自动点击第一个Tab');
    tabButtons[0].click();
  }
}

// 用户管理相关函数
async function loadUsers(page = 1) {
  try {
    const searchValue = document.getElementById('userSearch')?.value || '';
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    const params = new URLSearchParams({
      page,
      search: searchValue,
      role: roleFilter,
      is_active: statusFilter
    });

    const response = await fetch(`/api/admin/users?${params}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();

    if (data.success) {
      // renderUserTable(data.users, data.pagination); // 删除全局调用，交由 AdminApp 实例处理
    } else {
      showError('加载用户列表失败: ' + data.error);
    }
  } catch (error) {
    showError('加载用户列表失败: ' + error.message);
  }
}

function renderPagination(pagination) {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;

  // 检查pagination是否存在
  if (!pagination) {
    paginationContainer.innerHTML = '<div class="text-sm text-gray-500">暂无分页信息</div>';
    return;
  }

  const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;
  
  let paginationHTML = '<div class="flex items-center justify-between">';
  paginationHTML += '<div class="text-sm text-gray-700 dark:text-gray-300">';
  paginationHTML += `第 ${currentPage} 页，共 ${totalPages} 页`;
  paginationHTML += '</div>';
  
  paginationHTML += '<div class="flex space-x-2">';
  
  if (hasPrevPage) {
    paginationHTML += `<button class="prev-page-btn px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-page="${currentPage - 1}">上一页</button>`;
  }
  
  if (hasNextPage) {
    paginationHTML += `<button class="next-page-btn px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-page="${currentPage + 1}">下一页</button>`;
  }
  
  paginationHTML += '</div></div>';
  
  paginationContainer.innerHTML = paginationHTML;

  // 绑定分页按钮事件
  bindPaginationEvents();
}

async function loadUsersPage(page) {
  // 获取当前的搜索和筛选参数
  const searchTerm = document.getElementById('userSearch')?.value || '';
  const roleFilter = document.getElementById('roleFilter')?.value || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  
  // 构建查询参数
  const params = new URLSearchParams();
  params.append('page', page);
  if (searchTerm) params.append('search', searchTerm);
  if (roleFilter) params.append('role', roleFilter);
  if (statusFilter) params.append('status', statusFilter);
  
  // 重新加载用户数据
  await loadUsersWithParams(params.toString());
}

// 数据管理相关函数
async function loadDataStats() {
  try {
    const response = await fetch('/api/admin/data/stats', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      renderDataStats(data.stats);
    } else {
      showError('加载数据统计失败: ' + data.error);
    }
  } catch (error) {
    showError('加载数据统计失败: ' + error.message);
  }
}

function renderDataStats(stats) {
  const statsContainer = document.getElementById('dataStats');
  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div class="text-2xl font-bold text-blue-600">${stats.totalUsers}</div>
        <div class="text-gray-600 dark:text-gray-400">总用户数</div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div class="text-2xl font-bold text-green-600">${stats.totalProjects}</div>
        <div class="text-gray-600 dark:text-gray-400">总项目数</div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div class="text-2xl font-bold text-purple-600">${stats.totalSessions}</div>
        <div class="text-gray-600 dark:text-gray-400">总会话数</div>
      </div>
    </div>
  `;
}

// 系统配置相关函数
async function loadSystemConfig() {
  try {
    const response = await fetch('/api/admin/config', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      renderSystemConfig(data.config);
    } else {
      showError('加载系统配置失败: ' + data.error);
    }
  } catch (error) {
    showError('加载系统配置失败: ' + error.message);
  }
}

function renderSystemConfig(config) {
  const configContainer = document.getElementById('systemConfig');
  if (!configContainer) return;

  configContainer.innerHTML = `
    <form id="configForm" class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">系统名称</label>
        <input type="text" name="systemName" value="${config.systemName || ''}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">最大文件上传大小 (MB)</label>
        <input type="number" name="maxFileSize" value="${config.maxFileSize || 10}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">允许的文件类型</label>
        <input type="text" name="allowedFileTypes" value="${config.allowedFileTypes || 'xlsx,csv'}" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
      </div>
      <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        保存配置
      </button>
    </form>
  `;
}

async function saveSystemConfig() {
  try {
    const formData = new FormData(document.getElementById('configForm'));
    const config = Object.fromEntries(formData);
    
    const response = await fetch('/api/admin/config', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    const data = await response.json();
    
    if (data.success) {
      showSuccess('配置保存成功');
    } else {
      showError('配置保存失败: ' + data.error);
    }
  } catch (error) {
    showError('配置保存失败: ' + error.message);
  }
}

// 统计分析相关函数
async function loadStatisticsData() {
  try {
    const response = await fetch('/api/admin/stats', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      renderStatistics(data.statistics);
    } else {
      showError('加载统计数据失败: ' + data.error);
    }
  } catch (error) {
    showError('加载统计数据失败: ' + error.message);
  }
}

function renderStatistics(statistics) {
  const statsContainer = document.getElementById('statistics');
  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">用户活跃度</h3>
        <div class="text-3xl font-bold text-blue-600">${statistics.activeUsers || 0}</div>
        <div class="text-gray-600 dark:text-gray-400">活跃用户数</div>
      </div>
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">学习时长</h3>
        <div class="text-3xl font-bold text-green-600">${statistics.totalStudyHours || 0}</div>
        <div class="text-gray-600 dark:text-gray-400">总学习小时</div>
      </div>
    </div>
  `;
}

// 通用函数
function showSuccess(message) {
  // 这里可以添加成功提示的UI
  console.log('成功:', message);
  alert('成功: ' + message);
}

function showError(message) {
  // 这里可以添加错误提示的UI
  console.error('错误:', message);
  alert('错误: ' + message);
}

// 用户操作函数
async function editUser(id) {
  console.log('编辑用户:', id);
  // 实现编辑用户功能
  try {
    // 获取用户信息
    const response = await fetch(`/api/admin/users/${id}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // 显示编辑模态框，填充用户数据
        if (window.adminApp) {
          window.adminApp.showUserModal(data.user);
        } else {
          console.error('adminApp 未初始化');
        }
      } else {
        if (window.adminApp) {
          window.adminApp.showMessage('获取用户信息失败: ' + data.error, 'error');
        }
      }
    } else {
      if (window.adminApp) {
        window.adminApp.showMessage('获取用户信息失败', 'error');
      }
    }
  } catch (error) {
    console.error('编辑用户失败:', error);
    if (window.adminApp) {
      window.adminApp.showMessage('编辑用户失败: ' + error.message, 'error');
    }
  }
}

// 全局确认对话框函数
function showConfirmDialog(title, message, confirmText = '确定', cancelText = '取消') {
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

// 绑定到window对象
window.editUser = editUser;

async function toggleUserStatus(userId) {
  try {
    const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
    const currentStatus = userRow.querySelector('.status-badge').textContent === '激活';
    const newStatus = !currentStatus;

    const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_active: newStatus })
    });

    const data = await response.json();
    
    if (data.success) {
      showSuccess(data.message);
      loadUsers(); // 重新加载用户列表
    } else {
      showError('切换用户状态失败: ' + data.error);
    }
  } catch (error) {
    showError('切换用户状态失败: ' + error.message);
  }
}

async function deleteUser(id) {
  console.log('删除用户:', id);
  // 实现删除用户功能
  const confirmed = await showConfirmDialog(
    '删除用户',
    '确定要删除这个用户吗？此操作不可撤销。',
    '删除',
    '取消'
  );
  
  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      if (window.adminApp) {
        window.adminApp.showMessage(data.message, 'success');
        window.adminApp.loadUsers(); // 重新加载用户列表
      }
    } else {
      if (window.adminApp) {
        window.adminApp.showMessage('删除用户失败: ' + data.error, 'error');
      }
    }
  } catch (error) {
    console.error('删除用户失败:', error);
    if (window.adminApp) {
      window.adminApp.showMessage('删除用户失败: ' + error.message, 'error');
    }
  }
}

// 绑定到window对象
window.deleteUser = deleteUser;

class AdminApp {
    constructor() {
        this.currentTab = 'users';
        this.userListInterval = null; // 初始化用户列表自动刷新定时器
        
        // 系统信息更新定时器
        this.systemInfoTimers = {
            staticInfo: null,      // 静态信息（Node.js版本、数据库类型、数据库版本）
            uptime: null,          // 运行时间 - 30秒
            resources: null,       // 系统资源（内存、CPU、连接数）- 30秒
            diskSpace: null        // 磁盘空间 - 6小时
        };
        
        // 系统信息缓存
        this.systemInfoCache = {
            staticInfo: null,
            lastUptimeUpdate: 0,
            lastResourcesUpdate: 0,
            lastDiskSpaceUpdate: 0
        };
        
        this.init();
    }

    init() {
        console.log('AdminApp 初始化...');
        this.bindEvents();
        this.loadTabContent('users');
    }

    // 工具方法
    debounce(func, wait) {
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

    bindEvents() {
        // Tab 切换事件
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        console.log('切换到tab:', tabName);
        
        // 如果切换到非用户管理页面，清理用户列表定时器
        if (tabName !== 'users' && this.userListInterval) {
            clearInterval(this.userListInterval);
            this.userListInterval = null;
            console.log('已清理用户列表自动刷新定时器');
        }
        
        // 如果切换到非系统配置页面，清理系统信息定时器
        if (tabName !== 'config') {
            this.clearSystemInfoTimers();
            console.log('已清理系统信息定时器');
        }
        
        // 更新tab按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
        
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('border-transparent', 'text-gray-500');
            activeBtn.classList.add('border-blue-500', 'text-blue-600', 'dark:text-blue-400');
        }
        
        this.currentTab = tabName;
        this.loadTabContent(tabName);
    }

    async loadTabContent(tabName) {
        console.log('开始加载Tab内容:', tabName);
        const contentDiv = document.getElementById('adminContent');
        console.log('adminContent元素:', contentDiv);
        
        if (!contentDiv) {
            console.error('找不到 adminContent 元素！');
            return;
        }
        
        try {
            // 显示加载状态
            contentDiv.innerHTML = `
                <div class="flex justify-center items-center py-12">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span class="ml-2 text-gray-600 dark:text-gray-400">加载中...</span>
                </div>
            `;

            // Add a small delay to prevent rapid successive requests
            await new Promise(resolve => setTimeout(resolve, 200));

            const response = await fetch(`/api/admin/page/${tabName}`, {
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            contentDiv.innerHTML = html;

            // 手动执行所有 script 标签，确保动态加载的页面JS能生效
            const scripts = contentDiv.querySelectorAll('script');
            scripts.forEach(oldScript => {
                try {
                    const newScript = document.createElement('script');
                    if (oldScript.src) {
                        newScript.src = oldScript.src;
                    } else {
                        newScript.textContent = oldScript.textContent;
                    }
                    // 复制所有属性
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                } catch (error) {
                    console.error('执行script标签时出错:', error);
                    // 如果替换失败，尝试直接执行script内容
                    if (oldScript.textContent) {
                        try {
                            eval(oldScript.textContent);
                        } catch (evalError) {
                            console.error('直接执行script内容失败:', evalError);
                        }
                    }
                }
            });

            // 初始化Tab特定的功能
            this.initializeTabFunctions(tabName);

        } catch (error) {
            console.error('加载页面内容失败:', error);
            if (contentDiv) {
                contentDiv.innerHTML = `
                    <div class="text-center py-12">
                        <div class="text-red-500 text-lg font-medium">加载失败</div>
                        <div class="text-gray-600 mt-2">${error.message}</div>
                    </div>
                `;
            }
        }
    }

    // 初始化Tab特定功能
    initializeTabFunctions(tabName) {
        console.log('🔥 初始化Tab功能:', tabName);
        switch(tabName) {
            case 'users':
                console.log('🔥 调用 initUserManagement');
                this.initUserManagement();
                break;
            case 'data':
                console.log('🔥 调用 initDataManagement');
                this.initDataManagement();
                break;
            case 'achievements':
                // 动态加载成就管理 JS
                if (typeof AchievementManager === 'undefined') {
                    const script = document.createElement('script');
                    script.src = '/assets/js/admin-achievements.js';
                    script.onload = () => {
                        setTimeout(() => {
                            if (typeof AchievementManager !== 'undefined') {
                                new AchievementManager();
                            } else {
                                console.error('AchievementManager 类仍未找到');
                            }
                        }, 100);
                    };
                    document.body.appendChild(script);
                } else {
                    setTimeout(() => {
                        new AchievementManager();
                    }, 100);
                }
                break;
            case 'config':
                console.log('🔥 调用 initSystemConfig');
                this.initSystemConfig();
                break;
            case 'testdata':
                console.log('🔥 调用 initTestDataManagement');
                this.initTestDataManagement();
                break;
        }
    }

    // 用户管理功能
    initUserManagement() {
        console.log('初始化用户管理...');
        
        // 延迟执行，确保DOM完全加载
        setTimeout(() => {
            this.bindUserManagementEvents();
        }, 100);
    }

    // 绑定用户管理事件
    bindUserManagementEvents() {
        console.log('开始绑定用户管理事件...');
        
        // 绑定添加用户按钮事件
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            console.log('找到添加用户按钮，绑定事件');
            addUserBtn.addEventListener('click', () => this.showUserModal());
        } else {
            console.error('未找到添加用户按钮');
        }

        // 绑定查询按钮事件
        const searchBtn = document.getElementById('searchBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (searchBtn) {
            console.log('找到查询按钮，绑定事件');
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('查询按钮被点击');
                this.filterUsers();
            });
        } else {
            console.error('未找到查询按钮');
        }
        
        if (resetBtn) {
            console.log('找到重置按钮，绑定事件');
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('重置按钮被点击');
                this.resetFilters();
            });
        }

        // 搜索框支持回车键查询
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    console.log('搜索框回车键被按下');
                    this.filterUsers();
                }
            });
        }

        // 延迟绑定模态框事件，确保DOM已加载
        this.bindModalEventsWithRetry();
        
        // 加载用户列表
        this.loadUsers();
        
        // 优化自动刷新机制 - 只在没有用户交互时刷新
        if (this.userListInterval) {
            clearInterval(this.userListInterval);
        }
        
        let lastUserInteraction = Date.now();
        const INTERACTION_TIMEOUT = 60000; // 1分钟内无交互才自动刷新
        
        // 监听用户交互
        const userInteractionEvents = ['click', 'input', 'change', 'keydown'];
        userInteractionEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                lastUserInteraction = Date.now();
            }, true);
        });
        
        this.userListInterval = setInterval(() => {
            const timeSinceLastInteraction = Date.now() - lastUserInteraction;
            if (timeSinceLastInteraction > INTERACTION_TIMEOUT) {
                console.log('用户无交互超过1分钟，自动刷新用户列表...');
                this.loadUsers();
            } else {
                console.log(`用户最近有交互(${Math.round(timeSinceLastInteraction/1000)}秒前)，跳过自动刷新`);
            }
        }, 30000); // 30秒检查一次
    }

    // 带重试机制的模态框事件绑定
    bindModalEventsWithRetry(retryCount = 0) {
        const maxRetries = 10;
        const modal = document.getElementById('userModal');
        
        if (modal) {
            console.log('找到模态框，绑定事件');
            this.bindModalCloseEvents();
        } else if (retryCount < maxRetries) {
            console.log(`模态框未找到，${retryCount + 1}/${maxRetries} 次重试...`);
            setTimeout(() => {
                this.bindModalEventsWithRetry(retryCount + 1);
            }, 100);
        } else {
            console.error('模态框事件绑定失败，已达到最大重试次数');
        }
    }

    async loadUsers() {
        try {
            // 减少延迟从100ms到50ms，提高响应速度
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 获取当前的搜索和筛选参数
            const searchTerm = document.getElementById('userSearch')?.value || '';
            const roleFilter = document.getElementById('roleFilter')?.value || '';
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            
            // 构建查询参数
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (roleFilter) params.append('role', roleFilter);
            if (statusFilter) params.append('status', statusFilter);
            
            const queryString = params.toString();
            const url = queryString ? `/api/admin/users?${queryString}` : '/api/admin/users';
            
            console.log('loadUsers 开始请求:', {
                url,
                searchTerm,
                roleFilter,
                statusFilter,
                timestamp: new Date().toLocaleTimeString()
            });
            
            const startTime = Date.now();
            const response = await fetch(url);
            const endTime = Date.now();
            
            console.log(`loadUsers 请求完成，耗时: ${endTime - startTime}ms`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('loadUsers 渲染数据:', {
                        userCount: data.users?.length || 0,
                        pagination: data.pagination
                    });
                    this.renderUserTable(data.users || [], data.pagination);
                } else {
                    console.error('加载用户数据失败:', data.error);
                    this.showMessage('加载用户数据失败: ' + data.error, 'error');
                }
            } else {
                console.error('加载用户数据失败:', response.status);
                this.showMessage('加载用户数据失败', 'error');
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
            this.showMessage('加载用户数据失败: ' + error.message, 'error');
        }
    }

    renderUserTable(users, pagination) {
        const tbody = document.getElementById('userTableBody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            ${user.avatar ? 
                              `<img class="h-10 w-10 rounded-full object-cover" src="/uploads/avatars/${user.avatar}" alt="${user.username}" onerror="this.parentElement.innerHTML='<div class=\\'h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center\\'><span class=\\'text-sm font-medium text-gray-700 dark:text-gray-300\\'>${user.username.charAt(0).toUpperCase()}</span></div>'">` :
                              `<div class="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${user.username.charAt(0).toUpperCase()}</span>
                              </div>`
                            }
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900 dark:text-white">${user.username}</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
                        ${user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${user.is_active ? '活跃' : '非活跃'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${user.created_at ? new Date(user.created_at).toLocaleString('zh-CN') : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${user.last_login_at ? new Date(user.last_login_at).toLocaleString('zh-CN') : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="edit-user-btn text-blue-600 hover:text-blue-900 mr-3" data-user-id="${user.id}">编辑</button>
                    <button class="delete-user-btn text-red-600 hover:text-red-900" data-user-id="${user.id}">删除</button>
                </td>
            </tr>
        `).join('');

        // 绑定编辑和删除按钮事件
        this.bindUserActionEvents();

        // 渲染分页
        this.renderPagination(pagination);
    }

    renderPagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        // 检查pagination是否存在
        if (!pagination) {
            paginationContainer.innerHTML = '<div class="text-sm text-gray-500">暂无分页信息</div>';
            return;
        }

        const { currentPage, totalPages, hasNextPage, hasPrevPage } = pagination;
        
        let paginationHTML = '<div class="flex items-center justify-between">';
        paginationHTML += '<div class="text-sm text-gray-700 dark:text-gray-300">';
        paginationHTML += `第 ${currentPage} 页，共 ${totalPages} 页`;
        paginationHTML += '</div>';
        
        paginationHTML += '<div class="flex space-x-2">';
        
        if (hasPrevPage) {
            paginationHTML += `<button class="prev-page-btn px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-page="${currentPage - 1}">上一页</button>`;
        }
        
        if (hasNextPage) {
            paginationHTML += `<button class="next-page-btn px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-page="${currentPage + 1}">下一页</button>`;
        }
        
        paginationHTML += '</div></div>';
        
        paginationContainer.innerHTML = paginationHTML;

        // 绑定分页按钮事件
        this.bindPaginationEvents();
    }

    bindPaginationEvents() {
        // 绑定上一页按钮事件
        const prevButtons = document.querySelectorAll('.prev-page-btn');
        prevButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                console.log('上一页按钮被点击，页码:', page);
                this.loadUsersPage(page);
            });
        });

        // 绑定下一页按钮事件
        const nextButtons = document.querySelectorAll('.next-page-btn');
        nextButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                console.log('下一页按钮被点击，页码:', page);
                this.loadUsersPage(page);
            });
        });
    }

    async loadUsersPage(page) {
        // 获取当前的搜索和筛选参数
        const searchTerm = document.getElementById('userSearch')?.value || '';
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        
        // 构建查询参数
        const params = new URLSearchParams();
        params.append('page', page);
        if (searchTerm) params.append('search', searchTerm);
        if (roleFilter) params.append('role', roleFilter);
        if (statusFilter) params.append('status', statusFilter);
        
        // 重新加载用户数据
        await this.loadUsersWithParams(params.toString());
    }

    showUserModal(user = null) {
        console.log('显示用户模态框');
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        
        if (!modal) {
            console.error('模态框元素未找到');
            return;
        }

        // 重新绑定模态框事件
        this.bindModalCloseEvents();
        
        // 设置标题
        if (title) {
            title.textContent = user ? '编辑用户' : '添加新用户';
        }
        
        // 重置表单
        const form = document.getElementById('userForm');
        if (form) {
            form.reset();
            if (user) {
                form.dataset.userId = user.id;
                // 填充用户数据
                const usernameInput = document.getElementById('username');
                const emailInput = document.getElementById('email');
                const roleSelect = document.getElementById('role');
                const passwordInput = document.getElementById('password');
                const submitBtn = form.querySelector('button[type="submit"]');
                
                if (usernameInput) usernameInput.value = user.username;
                if (emailInput) emailInput.value = user.email;
                if (roleSelect) roleSelect.value = user.role;
                
                // 编辑模式下密码字段变为可选
                if (passwordInput) {
                    passwordInput.required = false;
                    passwordInput.placeholder = '留空则不修改密码';
                }
                
                // 修改提交按钮文本
                if (submitBtn) {
                    const icon = submitBtn.querySelector('svg');
                    submitBtn.innerHTML = '';
                    if (icon) submitBtn.appendChild(icon);
                    submitBtn.appendChild(document.createTextNode(' 更新用户'));
                }
            } else {
                delete form.dataset.userId;
                
                // 添加模式下密码字段为必填
                const passwordInput = document.getElementById('password');
                if (passwordInput) {
                    passwordInput.required = true;
                    passwordInput.placeholder = '请输入密码';
                }
                
                // 修改提交按钮文本
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    const icon = submitBtn.querySelector('svg');
                    submitBtn.innerHTML = '';
                    if (icon) submitBtn.appendChild(icon);
                    submitBtn.appendChild(document.createTextNode(' 创建用户'));
                }
            }
        }
        
        // 显示模态框
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // 添加动画效果
        setTimeout(() => {
            const modalContent = document.getElementById('modalContent');
            if (modalContent) {
                modalContent.classList.remove('scale-95', 'opacity-0');
                modalContent.classList.add('scale-100', 'opacity-100');
            }
        }, 10);
    }

    hideUserModal() {
        const modal = document.getElementById('userModal');
        const modalContent = document.getElementById('modalContent');
        
        if (modal && modalContent) {
            // 触发关闭动画
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
            
            // 等待动画完成后隐藏模态框
            setTimeout(() => {
                modal.classList.add('hidden');
                // 重置表单
                const form = document.getElementById('userForm');
                if (form) {
                    form.reset();
                }
            }, 300);
        }
    }

    bindModalCloseEvents() {
        console.log('绑定模态框关闭事件...');
        
        // 关闭按钮
        const closeBtn = document.getElementById('closeUserModal');
        if (closeBtn) {
            console.log('找到关闭按钮，绑定事件');
            // 移除之前的事件监听器
            closeBtn.removeEventListener('click', this.handleCloseModal);
            closeBtn.addEventListener('click', this.handleCloseModal);
        } else {
            console.log('未找到关闭按钮');
        }
        
        // 取消按钮
        const cancelBtn = document.getElementById('cancelUserBtn');
        if (cancelBtn) {
            console.log('找到取消按钮，绑定事件');
            // 移除之前的事件监听器
            cancelBtn.removeEventListener('click', this.handleCloseModal);
            cancelBtn.addEventListener('click', this.handleCloseModal);
        } else {
            console.log('未找到取消按钮');
        }
        
        // 点击背景关闭 - 已禁用，防止误操作
        const modal = document.getElementById('userModal');
        if (modal) {
            console.log('找到模态框，绑定背景点击事件');
            // 移除之前的事件监听器
            // modal.removeEventListener('click', this.handleBackgroundClick);
            // modal.addEventListener('click', this.handleBackgroundClick);
        } else {
            console.log('未找到模态框');
        }
        
        // 表单提交
        const form = document.getElementById('userForm');
        if (form) {
            console.log('找到表单，绑定提交事件');
            // 移除之前的事件监听器
            form.removeEventListener('submit', this.handleUserSubmit);
            form.addEventListener('submit', this.handleUserSubmit);
        } else {
            console.log('未找到表单');
        }
    }

    // 处理关闭模态框
    handleCloseModal = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('模态框关闭按钮被点击');
        this.hideUserModal();
    }

    // 处理背景点击
    handleBackgroundClick = (e) => {
        if (e.target === e.currentTarget) {
            console.log('模态框背景被点击');
            this.hideUserModal();
        }
    }

    handleUserSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const userId = e.target.dataset.userId;
        
        // 构建请求数据
        const requestData = {
            username: formData.get('username'),
            email: formData.get('email'),
            role: formData.get('role')
        };
        
        // 如果是添加用户或者编辑时密码不为空，则包含密码字段
        const password = formData.get('password');
        if (!userId || password) {
            requestData.password = password;
        }
        
        try {
            const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
            const method = userId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hideUserModal();
                // 重新加载用户列表
                await this.loadUsers();
                this.showMessage('用户保存成功', 'success');
            } else {
                this.showMessage(data.error || '保存失败', 'error');
            }
        } catch (error) {
            console.error('保存用户失败:', error);
            this.showMessage('保存失败', 'error');
        }
    }

    // 数据管理功能
    initDataManagement() {
        console.log('初始化数据管理...');
        
        // 添加系统操作日志
        this.addOperationLog('📊 加载数据管理页面', 'info');
        
        // 加载操作日志
        this.loadOperationLogs();
        
        // 加载用户数据查看区域的用户筛选选项
        this.loadUserDataUserFilter();
        
        // 加载操作日志区域的用户筛选选项
        this.loadLogsUserFilter();
        
        // 绑定事件
        this.bindDataManagementEvents();
    }

    // 加载操作日志
    async loadOperationLogs() {
        try {
            // 移除这行，不需要在操作日志中显示加载过程
            // this.addOperationLog('📋 正在加载操作日志...', 'info');
            
            const response = await fetch('/api/admin/data/user-operation-logs?limit=10&page=1');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 移除这行，不需要在操作日志中显示加载成功
                    // this.addOperationLog('✅ 操作日志加载成功', 'success');
                    this.renderLogsPagination(data.pagination);
                } else {
                    this.addOperationLog('❌ 操作日志加载失败: ' + data.error, 'error');
                }
            }
        } catch (error) {
            this.addOperationLog('❌ 操作日志加载失败: ' + error.message, 'error');
        }
    }

    // 加载用户筛选选项（用于用户数据查看区域）
    async loadUserDataUserFilter() {
        try {
            const response = await fetch('/api/admin/users?limit=1000');
            if (response.ok) {
                const data = await response.json();
                if (data.success && Array.isArray(data.users)) {
                    this.renderUserDataUserFilterOptions(data.users);
                }
            }
        } catch (e) {
            console.error('加载用户数据筛选选项失败', e);
        }
    }

    // 渲染用户数据查看区域的用户筛选选项
    renderUserDataUserFilterOptions(users) {
        const userFilter = document.getElementById('userFilter');
        if (!userFilter) return;

        // 清空现有选项
        userFilter.innerHTML = '<option value="">所有用户</option>';

        // 添加用户选项
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.username;
            userFilter.appendChild(option);
        });
    }

    // 加载操作日志用户筛选选项（用于最近数据操作记录区域）
    async loadLogsUserFilter() {
        try {
            console.log('开始加载用户列表到logsUserFilter...');
            const response = await fetch('/api/admin/users?all=1');
            if (response.ok) {
                const data = await response.json();
                console.log('获取到用户数据:', data);
                if (data.success && Array.isArray(data.users)) {
                    const logsUserFilter = document.getElementById('logsUserFilter');
                    if (logsUserFilter) {
                        console.log('找到logsUserFilter元素，开始填充用户选项');
                        logsUserFilter.innerHTML = '<option value="">所有用户</option>' +
                            data.users.map(user => `<option value="${user.id}">${user.username || user.email || `用户${user.id}`}</option>`).join('');
                        console.log('用户列表填充完成，共', data.users.length, '个用户');
                    } else {
                        console.log('找不到logsUserFilter元素，尝试查找其他用户筛选器');
                        // 尝试查找其他可能的用户筛选器
                        const alternativeFilter = document.querySelector('.logs-user-filter, .user-filter, [data-filter="logs-user"]');
                        if (alternativeFilter) {
                            console.log('找到替代用户筛选器');
                            alternativeFilter.innerHTML = '<option value="">所有用户</option>' +
                                data.users.map(user => `<option value="${user.id}">${user.username || user.email || `用户${user.id}`}</option>`).join('');
                        }
                    }
                }
            }
        } catch (e) {
            console.error('加载操作日志用户筛选选项失败', e);
        }
    }

    // HTML转义方法
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#39;');
    }

    resetFilters() {
        console.log('重置筛选条件...');
        
        // 清空搜索框
        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.value = '';
        }
        
        // 重置角色筛选
        const roleFilter = document.getElementById('roleFilter');
        if (roleFilter) {
            roleFilter.value = '';
        }
        
        // 重置状态筛选
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.value = '';
        }
        
        console.log('筛选条件已重置，重新加载用户列表');
        
        // 重新加载用户列表
        this.loadUsers();
    }

    filterUsers() {
        console.log('执行用户筛选...');
        
        // 获取筛选参数
        const searchTerm = document.getElementById('userSearch')?.value || '';
        const roleFilter = document.getElementById('roleFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        
        console.log('筛选参数:', {
            searchTerm,
            roleFilter,
            statusFilter
        });
        
        // 重新加载用户列表
        this.loadUsers();
    }

    async loadUsersWithParams(queryString = '') {
        try {
            const url = queryString ? `/api/admin/users?${queryString}` : '/api/admin/users';
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderUserTable(data.users || [], data.pagination);
                } else {
                    console.error('加载用户数据失败:', data.error);
                    this.showMessage('加载用户数据失败: ' + data.error, 'error');
                }
            } else {
                console.error('加载用户数据失败:', response.status);
                this.showMessage('加载用户数据失败', 'error');
            }
        } catch (error) {
            console.error('加载用户数据失败:', error);
            this.showMessage('加载用户数据失败: ' + error.message, 'error');
        }
    }

    editUser(id) {
        console.log('AdminApp.editUser 被调用:', id);
        // 直接实现编辑用户功能
        this.performEditUser(id);
    }

    deleteUser(id) {
        console.log('AdminApp.deleteUser 被调用:', id);
        // 直接实现删除用户功能
        this.performDeleteUser(id);
    }

    async performEditUser(id) {
        console.log('执行编辑用户:', id);
        try {
            // 获取用户信息
            const response = await fetch(`/api/admin/users/${id}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // 显示编辑模态框，填充用户数据
                    this.showUserModal(data.user);
                } else {
                    this.showMessage('获取用户信息失败: ' + data.error, 'error');
                }
            } else {
                this.showMessage('获取用户信息失败', 'error');
            }
        } catch (error) {
            console.error('编辑用户失败:', error);
            this.showMessage('编辑用户失败: ' + error.message, 'error');
        }
    }

    async performDeleteUser(id) {
        console.log('执行删除用户:', id);
        const confirmed = await this.showConfirmDialog(
            '删除用户',
            '确定要删除这个用户吗？此操作不可撤销。',
            '删除',
            '取消'
        );
        
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.showMessage(data.message, 'success');
                this.loadUsers(); // 重新加载用户列表
            } else {
                this.showMessage('删除用户失败: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            this.showMessage('删除用户失败: ' + error.message, 'error');
        }
    }

    bindUserActionEvents() {
        console.log('开始绑定用户操作事件...');
        
        // 绑定编辑按钮事件
        const editButtons = document.querySelectorAll('.edit-user-btn');
        console.log('找到编辑按钮数量:', editButtons.length);
        
        editButtons.forEach((button, index) => {
            console.log(`绑定编辑按钮 ${index + 1}:`, button);
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = e.target.dataset.userId;
                console.log('编辑按钮被点击，用户ID:', userId);
                this.editUser(userId);
            });
        });

        // 绑定删除按钮事件
        const deleteButtons = document.querySelectorAll('.delete-user-btn');
        console.log('找到删除按钮数量:', deleteButtons.length);
        
        deleteButtons.forEach((button, index) => {
            console.log(`绑定删除按钮 ${index + 1}:`, button);
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const userId = e.target.dataset.userId;
                console.log('删除按钮被点击，用户ID:', userId);
                this.deleteUser(userId);
            });
        });
        
        console.log('用户操作事件绑定完成');
    }

    // 显示消息提示
    showMessage(message, type = 'info') {
        console.log(`显示消息 [${type}]:`, message);
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 px-6 py-3 rounded-md text-white z-[9999] ${
            type === 'success' ? 'bg-green-600' : 
            type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
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

    // 绑定数据管理事件
    bindDataManagementEvents() {
        console.log('绑定数据管理事件...');
        
        // 绑定数据操作按钮事件
        const backupBtn = document.getElementById('backupDataBtn');
        const cleanBtn = document.getElementById('cleanDataBtn');
        const resetBtn = document.getElementById('resetDataBtn');
        
        if (backupBtn) {
            backupBtn.addEventListener('click', () => this.backupData());
            console.log('备份按钮事件已绑定');
        }
        if (cleanBtn) {
            cleanBtn.addEventListener('click', () => this.cleanData());
            console.log('清理按钮事件已绑定');
        }
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetData());
            console.log('重置按钮事件已绑定');
        }
        
        // 绑定操作日志相关事件
        const searchLogsBtn = document.getElementById('searchLogsBtn');
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        
        if (searchLogsBtn) {
            searchLogsBtn.addEventListener('click', () => this.searchLogs());
            console.log('搜索日志按钮事件已绑定');
        }
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => this.clearLogsDisplay());
            console.log('清空日志按钮事件已绑定');
        }
        
        // 绑定用户数据查看相关事件
        const dataTypeSelect = document.getElementById('dataTypeSelect');
        const userFilter = document.getElementById('userFilter');
        const dataSearch = document.getElementById('dataSearch');
        const searchUserDataBtn = document.getElementById('searchUserDataBtn');
        const clearUserDataBtn = document.getElementById('clearUserDataBtn');
        
        if (dataTypeSelect) {
            dataTypeSelect.addEventListener('change', () => this.switchDataType());
            console.log('数据类型选择事件已绑定');
        }
        if (searchUserDataBtn) {
            searchUserDataBtn.addEventListener('click', () => this.searchUserData());
            console.log('搜索用户数据按钮事件已绑定');
        }
        if (clearUserDataBtn) {
            clearUserDataBtn.addEventListener('click', () => this.clearUserDataDisplay());
            console.log('清空用户数据按钮事件已绑定');
        }
        
        console.log('数据管理事件绑定完成');
    }

    // 数据备份功能
    async backupData() {
        try {
            this.showMessage('正在准备数据备份...', 'info');
            
            const response = await fetch('/api/admin/data/backup', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `系统数据备份_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showMessage('数据备份成功！文件已下载', 'success');
                
                // 刷新操作日志
                this.loadOperationLogs();
            } else {
                const data = await response.json();
                this.showMessage('数据备份失败: ' + (data.error || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('数据备份失败:', error);
            this.showMessage('数据备份失败: ' + error.message, 'error');
        } finally {
            backupBtn.disabled = false;
            backupBtn.textContent = originalText;
        }
    }

    // 数据清理功能
    async cleanData() {
        if (!confirm('确定要清理数据吗？此操作将删除过期的数据！')) {
            return;
        }
        
        const cleanBtn = document.getElementById('cleanDataBtn');
        const originalText = cleanBtn.textContent;
        
        try {
            cleanBtn.disabled = true;
            cleanBtn.textContent = '清理中...';
            
            const response = await fetch('/api/admin/data/clean', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 移除成功日志，因为这是敏感操作
                // this.addOperationLog('✅ 数据清理成功', 'warning');
                this.showMessage('数据清理成功！', 'success');
                this.loadOperationLogs(); // 刷新日志
            } else {
                this.addOperationLog('❌ 数据清理失败: ' + data.error, 'error');
                this.showMessage('数据清理失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.addOperationLog('❌ 数据清理失败: ' + error.message, 'error');
            this.showMessage('数据清理失败: ' + error.message, 'error');
        } finally {
            cleanBtn.disabled = false;
            cleanBtn.textContent = originalText;
        }
    }

    // 数据重置功能
    async resetData() {
        if (!confirm('⚠️ 警告：此操作将重置所有数据！此操作不可恢复！\n\n确定要继续吗？')) {
            return;
        }
        
        const resetBtn = document.getElementById('resetDataBtn');
        const originalText = resetBtn.textContent;
        
        try {
            resetBtn.disabled = true;
            resetBtn.textContent = '重置中...';
            
            const response = await fetch('/api/admin/data/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 移除成功日志，因为这是危险操作
                // this.addOperationLog('⚠️ 数据重置成功 - 危险操作', 'critical');
                this.showMessage('数据重置成功！', 'success');
                this.loadOperationLogs(); // 刷新日志
            } else {
                this.addOperationLog('❌ 数据重置失败: ' + data.error, 'error');
                this.showMessage('数据重置失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.addOperationLog('❌ 数据重置失败: ' + error.message, 'error');
            this.showMessage('数据重置失败: ' + error.message, 'error');
        } finally {
            resetBtn.disabled = false;
            resetBtn.textContent = originalText;
        }
    }

    // 搜索日志
    searchLogs() {
        const searchInput = document.getElementById('logSearch');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        
        if (!searchTerm) {
            this.showMessage('请输入搜索关键词', 'warning');
            return;
        }
        
        // 移除这行，不需要在操作日志中显示搜索过程
        // this.addOperationLog('🔍 正在搜索操作日志...', 'info');
        
        // 构建搜索参数
        const params = new URLSearchParams();
        params.append('search', searchTerm);
        params.append('limit', '10');
        params.append('page', '1');
        
        // 调用全局函数加载日志
        loadRecentOperationLogs(params.toString());
        
        // 显示搜索条件（可选，如果需要的话）
        const searchConditions = [];
        if (searchTerm) searchConditions.push(`关键词: ${searchTerm}`);
        
        if (searchConditions.length > 0) {
            // 移除这行，不需要在操作日志中显示搜索条件
            // this.addOperationLog(`🔍 搜索条件: ${searchConditions.join(', ')}`, 'info');
        }
    }

    clearLogsDisplay() {
        const tableBody = document.getElementById('recentDataTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500 dark:text-gray-400">暂无数据</td></tr>';
        }
        
        // 移除这行，不需要在操作日志中显示清空操作
        // this.addOperationLog('🗑️ 清空日志显示', 'warning');
        
        this.showMessage('日志显示已清空', 'info');
    }

    // 切换数据类型
    switchDataType() {
        console.log('切换数据类型');
        const dataTypeSelect = document.getElementById('dataTypeSelect');
        if (dataTypeSelect) {
            const dataType = dataTypeSelect.value;
            this.loadUserData(dataType);
        }
    }

    // 搜索用户数据
    searchUserData() {
        console.log('搜索用户数据');
        const userFilter = document.getElementById('userFilter');
        const dataSearch = document.getElementById('dataSearch');
        
        const userId = userFilter?.value || '';
        const searchTerm = dataSearch?.value || '';
        
        // 构建查询参数
        const params = new URLSearchParams();
        if (userId) params.append('userId', userId);
        if (searchTerm) params.append('search', searchTerm);
        
        // 这里需要实现具体的搜索逻辑
        console.log('搜索参数:', { userId, searchTerm });
    }

    // 清空用户数据显示
    clearUserDataDisplay() {
        console.log('清空用户数据显示');
        const tableBody = document.getElementById('userDataTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">暂无数据</td></tr>';
        }
        
        // 清空筛选条件
        const userFilter = document.getElementById('userFilter');
        const dataSearch = document.getElementById('dataSearch');
        
        if (userFilter) userFilter.value = '';
        if (dataSearch) dataSearch.value = '';
    }

    // 加载用户数据
    loadUserData(dataType) {
        console.log('加载用户数据:', dataType);
        // 这里需要实现具体的加载逻辑
        // 根据dataType加载不同类型的用户数据
    }

    // 渲染日志分页
    renderLogsPagination(pagination) {
        console.log('渲染日志分页:', pagination);
        const paginationContainer = document.getElementById('logsPagination');
        if (!paginationContainer) {
            console.log('找不到logsPagination容器，尝试查找其他分页容器');
            // 尝试查找其他可能的分页容器
            const alternativeContainer = document.querySelector('.logs-pagination, .pagination, [data-pagination="logs"]');
            if (alternativeContainer) {
                console.log('找到替代分页容器');
                this.renderPaginationToContainer(pagination, alternativeContainer);
            }
            return;
        }
        
        this.renderPaginationToContainer(pagination, paginationContainer);
    }
    
    renderPaginationToContainer(pagination, container) {
        if (!pagination || !container) return;
        
        if (!pagination || pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        if (!pagination || pagination.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="flex items-center justify-between">';
        paginationHTML += '<div class="text-sm text-gray-700 dark:text-gray-300">';
        paginationHTML += `显示第 ${pagination.currentPage} 页，共 ${pagination.totalPages} 页`;
        paginationHTML += '</div>';
        paginationHTML += '<div class="flex space-x-2">';

        // 上一页按钮
        if (pagination.currentPage > 1) {
            paginationHTML += `<button onclick="loadRecentOperationLogs('page=${pagination.currentPage - 1}')" class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600">上一页</button>`;
        }

        // 页码按钮
        const startPage = Math.max(1, pagination.currentPage - 2);
        const endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            if (i === pagination.currentPage) {
                paginationHTML += `<span class="px-3 py-1 text-sm bg-blue-600 text-white rounded">${i}</span>`;
            } else {
                paginationHTML += `<button onclick="loadRecentOperationLogs('page=${i}')" class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600">${i}</button>`;
            }
        }

        // 下一页按钮
        if (pagination.currentPage < pagination.totalPages) {
            paginationHTML += `<button onclick="loadRecentOperationLogs('page=${pagination.currentPage + 1}')" class="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600">下一页</button>`;
        }

        paginationHTML += '</div></div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    // 系统配置功能
    initSystemConfig() {
        console.log('🔥🔥🔥 initSystemConfig 方法被调用 🔥🔥🔥');
        
        // 检查是否已经初始化过，但允许重新初始化（当页面内容重新加载时）
        if (this.systemConfigInitialized) {
            console.log('系统配置已经初始化过，重新初始化...');
            // 不返回，继续执行重新初始化
        }
        
        // 初始化标签页切换
        this.initConfigTabs();
        
        // 加载系统配置
        this.loadSystemConfig();
        
        // 初始化系统信息更新
        this.initSystemInfoUpdates();
        
        // 绑定保存配置按钮事件
        const saveBtn = document.getElementById('saveConfigBtn');
        console.log('查找保存配置按钮:', saveBtn);
        
        if (saveBtn) {
            console.log('找到保存配置按钮，绑定点击事件');
            console.log('按钮ID:', saveBtn.id);
            console.log('按钮文本:', saveBtn.textContent);
            console.log('按钮可见性:', saveBtn.offsetParent !== null);
            console.log('按钮样式:', window.getComputedStyle(saveBtn));
            
            // 使用 onclick 直接绑定，避免多次绑定问题
            saveBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 保存配置按钮被点击 (onclick)');
                console.log('事件对象:', e);
                console.log('事件目标:', e.target);
                this.saveAllConfig();
            };
            
            // 添加额外的测试事件，确保按钮可以响应
            saveBtn.addEventListener('click', (e) => {
                console.log('🔥 保存按钮 addEventListener 被触发');
                alert('保存按钮被点击了！');
            });
            
            console.log('保存配置按钮事件绑定完成 (onclick)');
            
            // 添加额外的调试信息
            saveBtn.addEventListener('mouseenter', () => {
                console.log('鼠标悬停在保存按钮上');
            });
            
            saveBtn.addEventListener('mousedown', () => {
                console.log('鼠标按下保存按钮');
            });
            
        } else {
            console.error('找不到保存配置按钮');
            console.log('页面中的所有按钮:');
            document.querySelectorAll('button').forEach((btn, index) => {
                console.log(`${index}: ${btn.id} - ${btn.textContent}`);
            });
        }
        
        // 标记为已初始化
        this.systemConfigInitialized = true;
    }
    
    // 初始化配置标签页
    initConfigTabs() {
        console.log('初始化配置标签页...');
        const tabButtons = document.querySelectorAll('.config-tab-btn');
        const tabContents = document.querySelectorAll('.config-tab-content');
        
        console.log(`找到 ${tabButtons.length} 个标签按钮`);
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = button.getAttribute('data-tab');
                console.log('点击标签页:', targetTab);
                
                // 移除所有活动状态
                tabButtons.forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-600');
                    btn.classList.add('border-transparent', 'text-gray-500');
                });
                
                tabContents.forEach(content => {
                    content.classList.add('hidden');
                });
                
                // 激活当前标签页
                button.classList.remove('border-transparent', 'text-gray-500');
                button.classList.add('border-blue-500', 'text-blue-600');
                
                const targetContent = document.getElementById(targetTab + 'Config');
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                    console.log('显示标签页内容:', targetTab);
                    
                    // 如果是SMTP标签页，加载SMTP配置
                    if (targetTab === 'smtp') {
                        this.loadSmtpConfigContent();
                    }
                } else {
                    console.error('找不到标签页内容:', targetTab + 'Config');
                }
            });
        });
        
        // 默认激活第一个标签页
        if (tabButtons.length > 0) {
            console.log('默认激活第一个标签页');
            tabButtons[0].click();
        }
    }
    
    // 加载SMTP配置内容
    async loadSmtpConfigContent() {
        console.log('加载SMTP配置内容...');
        const smtpContent = document.getElementById('smtpConfigContent');
        
        if (!smtpContent) {
            console.error('找不到SMTP配置容器');
            return;
        }
        
        try {
            const response = await fetch('/admin/page/smtp-config', {
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const html = await response.text();
                smtpContent.innerHTML = html;
                console.log('SMTP配置内容加载成功');
                
                // 初始化SMTP配置
                if (window.smtpConfig && window.smtpConfig.init) {
                    window.smtpConfig.init();
                }
            } else {
                smtpContent.innerHTML = '<p class="text-red-600">加载SMTP配置失败</p>';
                console.error('SMTP配置加载失败:', response.status);
            }
        } catch (error) {
            smtpContent.innerHTML = '<p class="text-red-600">加载SMTP配置失败: ' + error.message + '</p>';
            console.error('SMTP配置加载错误:', error);
        }
    }
    
    // 加载系统配置
    async loadSystemConfig() {
        console.log('加载系统配置...');
        try {
            const response = await fetch('/api/admin/config', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderSystemConfig(data.config);
                console.log('系统配置加载成功');
            } else {
                this.showMessage('加载系统配置失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.showMessage('加载系统配置失败: ' + error.message, 'error');
            console.error('系统配置加载错误:', error);
        }
    }
    
    // 渲染系统配置
    renderSystemConfig(config) {
        console.log('渲染系统配置:', config);
        
        // 基本设置
        const elements = {
            systemName: document.getElementById('systemName'),
            systemVersion: document.getElementById('systemVersion'),
            adminEmail: document.getElementById('adminEmail'),
            timezone: document.getElementById('timezone'),
            defaultStudyTime: document.getElementById('defaultStudyTime'),
            dailyGoal: document.getElementById('dailyGoal'),
            reminderTime: document.getElementById('reminderTime'),
            autoSaveInterval: document.getElementById('autoSaveInterval'),
            browserNotifications: document.getElementById('browserNotifications'),
            studyReminders: document.getElementById('studyReminders'),
            sessionTimeout: document.getElementById('sessionTimeout'),
            maxLoginAttempts: document.getElementById('maxLoginAttempts'),
            minPasswordLength: document.getElementById('minPasswordLength'),
            backupFrequency: document.getElementById('backupFrequency'),
            debugMode: document.getElementById('debugMode'),
            maintenanceMode: document.getElementById('maintenanceMode')
        };
        
        // 设置基本配置
        if (elements.systemName && config.systemName) elements.systemName.value = config.systemName;
        if (elements.systemVersion && config.systemVersion) elements.systemVersion.value = config.systemVersion;
        if (elements.adminEmail && config.adminEmail) elements.adminEmail.value = config.adminEmail;
        if (elements.timezone && config.timezone) elements.timezone.value = config.timezone;
        
        // 更新系统名称显示
        this.updateSystemNameDisplay(config.systemName);
        
        // 设置学习配置
        if (elements.defaultStudyTime && config.defaultStudyTime) elements.defaultStudyTime.value = config.defaultStudyTime;
        if (elements.dailyGoal && config.dailyGoal) elements.dailyGoal.value = config.dailyGoal;
        if (elements.reminderTime && config.reminderTime) elements.reminderTime.value = config.reminderTime;
        if (elements.autoSaveInterval && config.autoSaveInterval) elements.autoSaveInterval.value = config.autoSaveInterval;
        
        // 设置通知配置
        if (elements.browserNotifications && config.browserNotifications !== undefined) elements.browserNotifications.checked = config.browserNotifications;
        if (elements.studyReminders && config.studyReminders !== undefined) elements.studyReminders.checked = config.studyReminders;
        
        // 设置安全配置
        if (elements.sessionTimeout && config.sessionTimeout) elements.sessionTimeout.value = config.sessionTimeout;
        if (elements.maxLoginAttempts && config.maxLoginAttempts) elements.maxLoginAttempts.value = config.maxLoginAttempts;
        if (elements.minPasswordLength && config.minPasswordLength) elements.minPasswordLength.value = config.minPasswordLength;
        if (elements.backupFrequency && config.backupFrequency) elements.backupFrequency.value = config.backupFrequency;
        
        // 设置高级配置
        if (elements.debugMode && config.debugMode !== undefined) elements.debugMode.checked = config.debugMode;
        if (elements.maintenanceMode && config.maintenanceMode !== undefined) elements.maintenanceMode.checked = config.maintenanceMode;
    }
    
    // 初始化系统信息更新
    initSystemInfoUpdates() {
        console.log('🔥 初始化系统信息更新...');
        
        // 清理可能存在的旧定时器
        this.clearSystemInfoTimers();
        
        // 立即加载一次静态信息（Node.js版本、数据库类型、数据库版本）
        this.loadStaticSystemInfo();
        
        // 立即加载一次所有信息
        this.loadSystemInfo();
        
        // 设置定时器
        // 运行时间 - 30秒更新一次
        this.systemInfoTimers.uptime = setInterval(() => {
            console.log('🔥 定时更新运行时间...');
            this.updateUptime();
        }, 30000);
        
        // 系统资源（内存、CPU、连接数）- 30秒更新一次
        this.systemInfoTimers.resources = setInterval(() => {
            console.log('🔥 定时更新系统资源...');
            this.updateSystemResources();
        }, 30000);
        
        // 磁盘空间 - 6小时更新一次
        this.systemInfoTimers.diskSpace = setInterval(() => {
            console.log('🔥 定时更新磁盘空间...');
            this.updateDiskSpace();
        }, 6 * 60 * 60 * 1000); // 6小时
        
        console.log('🔥 系统信息更新定时器设置完成');
        console.log('🔥 定时器状态:', this.systemInfoTimers);
        
        // 添加页面可见性检测，确保页面可见时才更新
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                console.log('🔥 页面变为可见，立即更新系统信息');
                this.updateUptime();
                this.updateSystemResources();
            }
        });
        
        // 添加页面焦点检测
        window.addEventListener('focus', () => {
            console.log('🔥 页面获得焦点，立即更新系统信息');
            this.updateUptime();
            this.updateSystemResources();
        });
        
        // 确保定时器在页面卸载时被清理
        window.addEventListener('beforeunload', () => {
            this.clearSystemInfoTimers();
        });
    }
    
    // 加载静态系统信息（Node.js版本、数据库类型、数据库版本）
    async loadStaticSystemInfo() {
        console.log('加载静态系统信息...');
        try {
            const response = await fetch('/api/admin/system/info', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success && data.info) {
                this.systemInfoCache.staticInfo = {
                    nodeVersion: data.info.nodeVersion,
                    dbType: data.info.database?.type,
                    dbVersion: data.info.database?.version
                };
                
                // 更新静态信息显示
                this.updateStaticInfoDisplay();
                console.log('静态系统信息加载成功');
            }
        } catch (error) {
            console.error('加载静态系统信息失败:', error);
        }
    }
    
    // 更新静态信息显示
    updateStaticInfoDisplay() {
        if (!this.systemInfoCache.staticInfo) return;
        
        const { nodeVersion, dbType, dbVersion } = this.systemInfoCache.staticInfo;
        
        const nodeVersionEl = document.getElementById('nodeVersion');
        const dbTypeEl = document.getElementById('dbType');
        const dbVersionEl = document.getElementById('dbVersion');
        
        if (nodeVersionEl && nodeVersion) nodeVersionEl.textContent = nodeVersion;
        if (dbTypeEl && dbType) dbTypeEl.textContent = dbType;
        if (dbVersionEl && dbVersion) dbVersionEl.textContent = dbVersion;
    }
    
    // 更新运行时间
    async updateUptime() {
        console.log('🔥 更新运行时间...');
        try {
            const response = await fetch('/api/admin/system/info', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success && data.info && data.info.uptime) {
                const uptimeEl = document.getElementById('uptime');
                if (uptimeEl) {
                    uptimeEl.textContent = this.formatUptime(data.info.uptime);
                    console.log('🔥 运行时间更新成功:', this.formatUptime(data.info.uptime));
                } else {
                    console.warn('🔥 找不到运行时间显示元素');
                }
                this.systemInfoCache.lastUptimeUpdate = Date.now();
            } else {
                console.error('🔥 运行时间更新失败: 服务器返回无效数据');
            }
        } catch (error) {
            console.error('🔥 更新运行时间失败:', error);
            // 显示错误状态
            const uptimeEl = document.getElementById('uptime');
            if (uptimeEl) {
                uptimeEl.textContent = '更新失败';
                uptimeEl.style.color = '#ef4444';
            }
        }
    }
    
    // 更新系统资源
    async updateSystemResources() {
        console.log('🔥 更新系统资源...');
        try {
            const response = await fetch('/api/admin/system/info', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success && data.info) {
                // 内存使用率
                const memoryUsageText = document.getElementById('memoryUsageText');
                const memPercent = data.info.memory && data.info.memory.usagePercent !== undefined ? data.info.memory.usagePercent : null;
                if (memoryUsageText && memPercent !== null) {
                    memoryUsageText.textContent = memPercent + '%';
                    console.log('🔥 内存使用率更新成功:', memPercent + '%');
                } else {
                    console.warn('🔥 找不到内存使用率显示元素或数据无效');
                }

                // CPU使用率
                const cpuUsageText = document.getElementById('cpuUsageText');
                let cpuPercent = null;
                if (typeof data.info.cpuUsage === 'string' && data.info.cpuUsage.endsWith('%')) {
                    cpuPercent = parseFloat(data.info.cpuUsage);
                } else if (typeof data.info.cpuUsage === 'number') {
                    cpuPercent = data.info.cpuUsage;
                }
                if (cpuUsageText && cpuPercent !== null && !isNaN(cpuPercent)) {
                    cpuUsageText.textContent = cpuPercent.toFixed(1) + '%';
                    console.log('🔥 CPU使用率更新成功:', cpuPercent.toFixed(1) + '%');
                } else {
                    console.warn('🔥 找不到CPU使用率显示元素或数据无效');
                }

                // 连接数
                const connectionsEl = document.getElementById('connections');
                if (connectionsEl && data.info.database && data.info.database.connections) {
                    connectionsEl.textContent = data.info.database.connections;
                    console.log('🔥 连接数更新成功:', data.info.database.connections);
                } else {
                    console.warn('🔥 找不到连接数显示元素或数据无效');
                }

                this.systemInfoCache.lastResourcesUpdate = Date.now();
                console.log('🔥 系统资源更新完成');
            } else {
                console.error('🔥 系统资源更新失败: 服务器返回无效数据');
                this.showSystemResourceError();
            }
        } catch (error) {
            console.error('🔥 更新系统资源失败:', error);
            this.showSystemResourceError();
        }
    }
    
    // 显示系统资源错误状态
    showSystemResourceError() {
        const elements = [
            { id: 'memoryUsageText', text: '更新失败' },
            { id: 'cpuUsageText', text: '更新失败' },
            { id: 'connections', text: '更新失败' }
        ];
        
        elements.forEach(({ id, text }) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = text;
                el.style.color = '#ef4444';
            }
        });
    }
    
    // 更新磁盘空间
    async updateDiskSpace() {
        console.log('🔥 更新磁盘空间...');
        try {
            const response = await fetch('/api/admin/system/info', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            if (data.success && data.info && data.info.diskSpace) {
                const diskSpaceText = document.getElementById('diskSpaceText');
                if (diskSpaceText) {
                    diskSpaceText.textContent = data.info.diskSpace;
                    console.log('🔥 磁盘空间更新成功:', data.info.diskSpace);
                } else {
                    console.warn('🔥 找不到磁盘空间显示元素');
                }
                this.systemInfoCache.lastDiskSpaceUpdate = Date.now();
            } else {
                console.error('🔥 磁盘空间更新失败: 服务器返回无效数据');
                this.showDiskSpaceError();
            }
        } catch (error) {
            console.error('🔥 更新磁盘空间失败:', error);
            this.showDiskSpaceError();
        }
    }
    
    // 显示磁盘空间错误状态
    showDiskSpaceError() {
        const diskSpaceText = document.getElementById('diskSpaceText');
        if (diskSpaceText) {
            diskSpaceText.textContent = '更新失败';
            diskSpaceText.style.color = '#ef4444';
        }
    }
    
    // 清理系统信息定时器
    clearSystemInfoTimers() {
        console.log('🔥 清理系统信息定时器...');
        let clearedCount = 0;
        
        Object.entries(this.systemInfoTimers).forEach(([name, timer]) => {
            if (timer) {
                clearInterval(timer);
                this.systemInfoTimers[name] = null;
                clearedCount++;
                console.log(`🔥 已清理定时器: ${name}`);
            }
        });
        
        console.log(`🔥 系统信息定时器清理完成，共清理了 ${clearedCount} 个定时器`);
        console.log('🔥 清理后的定时器状态:', this.systemInfoTimers);
    }
    
    // 加载系统信息（完整版本，用于初始加载）
    async loadSystemInfo() {
        console.log('🔥 加载完整系统信息...');
        try {
            const response = await fetch('/api/admin/system/info', {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            
            console.log('🔥 系统信息API响应:', data);
            
            if (data.success) {
                this.renderSystemInfo(data.info);
                console.log('🔥 完整系统信息加载成功');
            } else {
                console.error('🔥 系统信息API返回失败:', data);
            }
        } catch (error) {
            console.error('🔥 加载系统信息失败:', error);
        }
    }
    
    // 渲染系统信息
    renderSystemInfo(info) {
        console.log('🔥 渲染系统信息:', info);
        
        // 缓存静态信息
        if (info.nodeVersion || (info.database && info.database.type)) {
            this.systemInfoCache.staticInfo = {
                nodeVersion: info.nodeVersion,
                dbType: info.database?.type,
                dbVersion: info.database?.version
            };
        }
        
        // 更新静态信息显示（如果还没有显示过）
        this.updateStaticInfoDisplay();
        
        // 更新动态信息
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl && info.uptime) {
            uptimeEl.textContent = this.formatUptime(info.uptime);
            console.log('🔥 更新运行时间:', this.formatUptime(info.uptime));
        }
        
        // 内存使用率 - 只更新文本
        const memoryUsageText = document.getElementById('memoryUsageText');
        if (memoryUsageText && info.memory && info.memory.usagePercent != null) {
            memoryUsageText.textContent = info.memory.usagePercent + '%';
        }

        // CPU 使用率 - 只更新文本
        const cpuUsageText = document.getElementById('cpuUsageText');
        if (cpuUsageText && info.cpuUsage) {
            // CPU使用率可能是字符串格式如 "45.2%"
            let cpuPercent = info.cpuUsage;
            if (typeof cpuPercent === 'string' && cpuPercent.endsWith('%')) {
                cpuPercent = cpuPercent.replace('%', '');
            }
            cpuUsageText.textContent = cpuPercent + '%';
        }

        // 磁盘空间使用率 - 只更新文本
        const diskSpaceText = document.getElementById('diskSpaceText');
        if (diskSpaceText && info.diskSpace) {
            // 磁盘空间可能是字符串格式如 "45.8% (45.8GB / 256GB)"
            let diskPercent = info.diskSpace;
            if (typeof diskPercent === 'string') {
                const match = diskPercent.match(/^([\d.]+)%/);
                if (match) {
                    diskPercent = match[1];
                }
            }
            diskSpaceText.textContent = diskPercent + '%';
        }
        
        // 连接数
        const connectionsEl = document.getElementById('connections');
        if (connectionsEl && info.database && info.database.connections) {
            connectionsEl.textContent = info.database.connections;
            console.log('🔥 更新连接数:', info.database.connections);
        }
        
        // 更新缓存时间戳
        this.systemInfoCache.lastUptimeUpdate = Date.now();
        this.systemInfoCache.lastResourcesUpdate = Date.now();
        this.systemInfoCache.lastDiskSpaceUpdate = Date.now();
        
        console.log('🔥 系统信息渲染完成');
    }
    
    // 格式化运行时间
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}天 ${hours}小时 ${minutes}分钟`;
        } else if (hours > 0) {
            return `${hours}小时 ${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }

    // 保存所有配置
    async saveAllConfig() {
        console.log('=== saveAllConfig 方法被调用 ===');
        console.log('保存系统配置...');
        
        // 检查按钮是否存在
        const saveBtn = document.getElementById('saveConfigBtn');
        console.log('saveAllConfig中的按钮检查:', saveBtn);
        if (!saveBtn) {
            console.error('找不到保存配置按钮');
            return;
        }
        
        // 禁用按钮防止重复点击
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';
        
        try {
            const configData = {
                systemName: document.getElementById('systemName')?.value || '',
                systemVersion: document.getElementById('systemVersion')?.value || '',
                adminEmail: document.getElementById('adminEmail')?.value || '',
                timezone: document.getElementById('timezone')?.value || 'Asia/Shanghai',
                defaultStudyTime: document.getElementById('defaultStudyTime')?.value || 30,
                dailyGoal: document.getElementById('dailyGoal')?.value || 120,
                reminderTime: document.getElementById('reminderTime')?.value || '09:00',
                autoSaveInterval: document.getElementById('autoSaveInterval')?.value || 60,
                browserNotifications: document.getElementById('browserNotifications')?.checked || false,
                studyReminders: document.getElementById('studyReminders')?.checked || false,
                sessionTimeout: document.getElementById('sessionTimeout')?.value || 30,
                maxLoginAttempts: document.getElementById('maxLoginAttempts')?.value || 5,
                minPasswordLength: document.getElementById('minPasswordLength')?.value || 8,
                backupFrequency: document.getElementById('backupFrequency')?.value || 7,
                debugMode: document.getElementById('debugMode')?.checked || false,
                maintenanceMode: document.getElementById('maintenanceMode')?.checked || false
            };
            
            console.log('保存的配置数据:', configData);
            console.log('发送请求到:', '/api/admin/config');
            
            const response = await fetch('/api/admin/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // 确保发送cookies
                body: JSON.stringify(configData)
            });
            
            console.log('响应状态:', response.status);
            console.log('响应头:', response.headers);
            
            const data = await response.json();
            console.log('响应数据:', data);
            
            if (data.success) {
                this.showMessage('配置保存成功', 'success');
                console.log('配置保存成功');
                
                // 更新系统名称显示
                this.updateSystemNameDisplay(configData.systemName);
            } else {
                this.showMessage('配置保存失败: ' + data.error, 'error');
                console.error('配置保存失败:', data.error);
            }
        } catch (error) {
            this.showMessage('配置保存失败: ' + error.message, 'error');
            console.error('配置保存错误:', error);
        } finally {
            // 恢复按钮状态
            saveBtn.disabled = false;
            saveBtn.textContent = '保存配置';
        }
    }

    // 测试数据管理功能
    initTestDataManagement() {
        console.log('初始化测试数据管理功能');
        // 移除这行，不需要在操作日志中显示页面加载信息
        // this.addOperationLog('🧪 加载测试数据管理页面', 'info');
        
        this.bindTestDataManagementEvents();
    }

    // 绑定测试数据管理事件
    bindTestDataManagementEvents() {
        console.log('开始绑定测试数据管理事件...');
        
        // 绑定生成测试数据按钮事件
        const generateBtn = document.getElementById('generateTestDataBtn');
        if (generateBtn) {
            console.log('找到生成测试数据按钮，绑定事件');
            generateBtn.addEventListener('click', () => this.generateTestData());
        } else {
            console.error('未找到生成测试数据按钮');
        }
        
        // 绑定清除测试数据按钮事件
        const clearBtn = document.getElementById('clearTestDataBtn');
        if (clearBtn) {
            console.log('找到清除测试数据按钮，绑定事件');
            clearBtn.addEventListener('click', () => this.clearTestData());
        } else {
            console.error('未找到清除测试数据按钮');
        }
    }

    // 生成测试数据
    async generateTestData() {
        const generateBtn = document.getElementById('generateTestDataBtn');
        const originalText = generateBtn.textContent;
        
        try {
            generateBtn.disabled = true;
            generateBtn.textContent = '生成中...';
            
            // 收集表单数据
            const formData = new FormData(document.getElementById('testDataForm'));
            const config = {
                projectCount: parseInt(formData.get('projectCount')),
                projectType: formData.get('projectType'),
                recordCount: parseInt(formData.get('recordCount')),
                timeRange: parseInt(formData.get('timeRange')),
                dailyRecords: parseInt(formData.get('dailyRecords')),
                minDuration: parseInt(formData.get('minDuration')),
                maxDuration: parseInt(formData.get('maxDuration'))
            };
            
            const response = await fetch('/api/admin/testdata/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 测试数据生成成功 - 绿色字体显示（操作成功）
                this.addOperationLog('✅ 测试数据生成成功', 'success');
                this.showMessage('测试数据生成成功！', 'success');
            } else {
                // 测试数据生成失败 - 黄色字体显示（普通警告）
                this.addOperationLog('⚠️ 测试数据生成失败: ' + data.error, 'warning');
                this.showMessage('测试数据生成失败: ' + data.error, 'error');
            }
        } catch (error) {
            // 测试数据生成失败 - 黄色字体显示（普通警告）
            this.addOperationLog('⚠️ 测试数据生成失败: ' + error.message, 'warning');
            this.showMessage('测试数据生成失败: ' + error.message, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = originalText;
        }
    }

    // 清除测试数据
    async clearTestData() {
        if (!confirm('确定要清除所有测试数据吗？此操作不可恢复！')) {
            return;
        }
        
        const clearBtn = document.getElementById('clearTestDataBtn');
        const originalText = clearBtn.textContent;
        
        try {
            clearBtn.disabled = true;
            clearBtn.textContent = '清除中...';
            
            const response = await fetch('/api/admin/testdata/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 清除测试数据成功 - 红色字体显示（敏感操作）
                this.addOperationLog('🗑️ 清除测试数据成功', 'critical');
                this.showMessage('测试数据清除成功！', 'success');
            } else {
                this.addOperationLog('❌ 清除测试数据失败: ' + data.error, 'error');
                this.showMessage('测试数据清除失败: ' + data.error, 'error');
            }
        } catch (error) {
            this.addOperationLog('❌ 清除测试数据失败: ' + error.message, 'error');
            this.showMessage('测试数据清除失败: ' + error.message, 'error');
        } finally {
            clearBtn.disabled = false;
            clearBtn.textContent = originalText;
        }
    }

    // 更新系统名称显示
    updateSystemNameDisplay(systemName) {
        console.log('AdminApp更新系统名称显示:', systemName);
        
        // 调用全局的系统名称更新函数
        if (window.updateSystemNameDisplay) {
            window.updateSystemNameDisplay(systemName);
        }
    }

    // 添加操作日志
    addOperationLog(message, type = 'info') {
        const log = document.getElementById('operationLog');
        if (!log) return;
        
        // 修改时间戳格式为：2025-06-21 18:38:49
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        const logItem = document.createElement('div');
        
        // 根据操作类型定义颜色样式，支持暗黑模式
        let styleClass = '';
        switch (type) {
            case 'success':
                // 成功操作：绿色系
                styleClass = 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-l-4 border-green-500';
                break;
            case 'error':
            case 'danger':
                // 危险/错误操作：红色系
                styleClass = 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-l-4 border-red-500';
                break;
            case 'warning':
                // 警告操作：黄色系（普通警告）
                styleClass = 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-l-4 border-yellow-500';
                break;
            case 'info':
                // 信息操作：蓝色系
                styleClass = 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-l-4 border-blue-500';
                break;
            case 'critical':
                // 严重操作：深红色系（敏感操作）
                styleClass = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-l-4 border-red-600 font-semibold';
                break;
            default:
                // 默认：灰色系
                styleClass = 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-l-4 border-gray-400';
        }
        
        logItem.className = `text-sm p-3 rounded-r ${styleClass} opacity-0 transform translate-y-2 transition-all duration-300 ease-out`;
        logItem.textContent = `[${timestamp}] ${message}`;
        
        // 移除"暂无操作记录"提示
        if (log.children.length === 1 && log.children[0].textContent === '暂无操作记录') {
            log.innerHTML = '';
        }
        
        // 插入到顶部
        log.insertBefore(logItem, log.firstChild);
        
        // 强制重绘，然后添加动画效果
        logItem.offsetHeight; // 触发重绘
        logItem.classList.remove('opacity-0', 'translate-y-2');
        logItem.classList.add('opacity-100', 'translate-y-0');
        
        // 限制日志数量
        if (log.children.length > 20) {
            const lastChild = log.lastChild;
            if (lastChild) {
                lastChild.classList.add('opacity-0', 'translate-y-2');
                setTimeout(() => {
                    if (lastChild.parentNode) {
                        lastChild.parentNode.removeChild(lastChild);
                    }
                }, 300);
            }
        }
        
        // 自动滚动到顶部
        log.scrollTop = 0;
    }

    // 渲染数据统计
    renderDataStats(stats) {
        const projectsCountEl = document.getElementById('currentProjectsCount');
        const recordsCountEl = document.getElementById('currentRecordsCount');
        const totalTimeEl = document.getElementById('currentTotalTime');
        
        if (projectsCountEl) projectsCountEl.textContent = stats.projectsCount;
        if (recordsCountEl) recordsCountEl.textContent = stats.recordsCount;
        if (totalTimeEl) totalTimeEl.textContent = stats.totalHours;
    }

    // 手动刷新系统信息
    async refreshSystemInfo() {
        console.log('🔥 手动刷新系统信息...');
        
        // 显示刷新状态
        const refreshBtn = document.getElementById('refreshSystemInfoBtn');
        if (refreshBtn) {
            const originalText = refreshBtn.innerHTML;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>刷新中...';
            refreshBtn.disabled = true;
            
            try {
                // 立即更新所有系统信息
                await Promise.all([
                    this.updateUptime(),
                    this.updateSystemResources(),
                    this.updateDiskSpace()
                ]);
                
                console.log('🔥 手动刷新系统信息完成');
                
                // 恢复按钮状态
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.disabled = false;
                }, 1000);
                
            } catch (error) {
                console.error('🔥 手动刷新系统信息失败:', error);
                
                // 恢复按钮状态
                setTimeout(() => {
                    refreshBtn.innerHTML = originalText;
                    refreshBtn.disabled = false;
                }, 1000);
            }
        }
    }
}

// 初始化管理应用
let adminApp;

// 确保在DOM加载完成后初始化
function initializeAdminApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            adminApp = new AdminApp();
            window.adminApp = adminApp;
            console.log('AdminApp已初始化:', window.adminApp);
        });
    } else {
        // DOM已经加载完成
        adminApp = new AdminApp();
        window.adminApp = adminApp;
        window.currentAdminApp = adminApp; // 添加全局引用
        console.log('AdminApp已初始化:', window.adminApp);
    }
}

// 全局导出 AdminApp 类
window.AdminApp = AdminApp;

// 添加全局调试函数
window.debugAdminApp = function() {
    console.log('=== AdminApp 调试信息 ===');
    console.log('AdminApp 类:', AdminApp);
    console.log('window.AdminApp:', window.AdminApp);
    console.log('当前 AdminApp 实例:', window.adminApp);
    
    // 检查保存按钮
    const saveBtn = document.getElementById('saveConfigBtn');
    console.log('保存按钮:', saveBtn);
    if (saveBtn) {
        console.log('按钮事件监听器:', saveBtn.onclick);
        console.log('按钮是否可见:', saveBtn.offsetParent !== null);
        console.log('按钮是否禁用:', saveBtn.disabled);
    }
    
    // 测试消息显示
    if (window.adminApp && window.adminApp.showMessage) {
        window.adminApp.showMessage('调试消息测试', 'info');
    }
};

console.log('admin.js 加载完成，AdminApp 已导出到全局');

// 立即尝试初始化
initializeAdminApp();

// 备用初始化方法
document.addEventListener('DOMContentLoaded', () => {
            if (!window.adminApp) {
            adminApp = new AdminApp();
            window.adminApp = adminApp;
            window.currentAdminApp = adminApp; // 添加全局引用
            console.log('AdminApp备用初始化完成:', window.adminApp);
        }
});

// 加载日志数据函数，支持带参数
async function loadRecentOperationLogs(paramStr = '') {
    try {
        let url = '/api/admin/data/user-operation-logs?limit=10&page=1';
        if (paramStr) url += '&' + paramStr;
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // 渲染日志表格和分页
                renderRecentLogsTable(data.logs);
                if (window.adminApp && window.adminApp.renderLogsPagination) {
                    window.adminApp.renderLogsPagination(data.pagination);
                }
            }
        }
    } catch (e) { console.error('加载操作日志失败', e); }
}

// 渲染最近操作日志表格
function renderRecentLogsTable(logs) {
    console.log('渲染最近操作日志表格:', logs);
    const tableBody = document.getElementById('recentDataTableBody');
    if (!tableBody) {
        console.error('找不到recentDataTableBody元素');
        return;
    }

    if (!logs || logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500 dark:text-gray-400">暂无数据</td></tr>';
        return;
    }

    const rows = logs.map(log => {
        // 修改日期格式为：2025-06-21 18:38:49
        const date = new Date(log.created_at);
        const createdAt = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        
        // 根据操作类型和状态定义颜色样式
        const getOperationTypeStyle = (operationType) => {
            switch (operationType) {
                case 'reset':
                    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700';
                case 'backup':
                    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
                case 'clean':
                    return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
                case 'import':
                    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700';
                case 'export':
                    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700';
                default:
                    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600';
            }
        };

        const getStatusStyle = (status) => {
            switch (status) {
                case 'success':
                    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700';
                case 'failed':
                    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700';
                case 'partial':
                    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700';
                default:
                    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600';
            }
        };

        const getStatusText = (status) => {
            switch (status) {
                case 'success':
                    return '✅ 成功';
                case 'failed':
                    return '❌ 失败';
                case 'partial':
                    return '⚠️ 部分成功';
                default:
                    return '❓ 未知';
            }
        };
        
        return `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">${createdAt}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 text-xs font-medium rounded-full ${getOperationTypeStyle(log.operation_type)}">
                        ${log.operation_name}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">${log.user_username || '未知用户'}</td>
                <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title="${log.description || '-'}">${log.description || '-'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 text-xs font-semibold rounded-full ${getStatusStyle(log.status)}">
                        ${getStatusText(log.status)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rows;
}

// 全局刷新系统信息函数
window.refreshSystemInfo = function() {
    console.log('🔥 全局刷新系统信息函数被调用');
    if (window.adminApp && window.adminApp.refreshSystemInfo) {
        window.adminApp.refreshSystemInfo();
    } else if (window.currentAdminApp && window.currentAdminApp.refreshSystemInfo) {
        window.currentAdminApp.refreshSystemInfo();
    } else {
        console.error('🔥 AdminApp 不可用，无法刷新系统信息');
        alert('系统信息刷新功能暂时不可用');
    }
};

