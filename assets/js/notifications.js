// 通知页面类
class NotificationsPage {
    constructor() {
        this.notifications = [];
        this.stats = {};
        this.insights = [];
        this.settings = {};
        this.currentPage = 1;
        this.loading = false;
        
        console.log('NotificationsPage 构造函数被调用');
        this.init();
    }
    
    async init() {
        console.log('开始初始化通知应用...');
        
        try {
            // 将实例保存到全局变量，以便按钮点击事件可以访问
            window.notificationsPage = this;
            
            // 重置通知角标（用户进入通知页面时）
            if (window.resetNotificationBadge) {
                window.resetNotificationBadge();
            }
            
            // 先绑定事件，确保事件监听器已经设置
            this.bindEvents();
            
            // 然后加载数据
            await Promise.all([
                this.loadStats(),
                this.loadInsights(),
                this.loadSettings(),
                this.loadNotifications()
            ]);
            
            console.log('通知应用初始化完成');
        } catch (error) {
            console.error('初始化通知应用失败:', error);
        }
    }
    
    // 加载统计数据
    async loadStats() {
        try {
            const response = await fetch('/api/notifications/stats');
            if (response.ok) {
                this.stats = await response.json();
                this.renderStats();
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
        }
    }
    
    // 渲染统计卡片
    renderStats() {
        const container = document.getElementById('statsCards');
        if (!container) {
            console.warn('找不到统计卡片容器');
            return;
        }
        
        container.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">未读通知</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">${this.stats.unread || 0}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">今日通知</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">${this.stats.today || 0}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">总通知数</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">${this.stats.total || 0}</p>
                    </div>
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">即将到期</p>
                        <p class="text-2xl font-semibold text-gray-900 dark:text-white">${this.stats.upcoming || 0}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 加载学习洞察
    async loadInsights() {
        try {
            const response = await fetch('/api/notifications/insights');
            if (response.ok) {
                const data = await response.json();
                this.insights = data.insights;
                this.renderInsights(data);
            }
        } catch (error) {
            console.error('加载学习洞察失败:', error);
        }
    }
    
    // 渲染学习洞察
    renderInsights(data) {
        const container = document.getElementById('insightsContent');
        if (!container) {
            console.warn('找不到洞察内容容器');
            return;
        }
        
        if (this.insights.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500 dark:text-gray-400">暂无学习洞察</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${this.insights.map(insight => `
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div class="flex items-start">
                            <div class="flex-shrink-0">
                                ${this.getInsightIcon(insight.type)}
                            </div>
                            <div class="ml-3">
                                <h4 class="text-sm font-medium text-gray-900 dark:text-white">${insight.title}</h4>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${insight.message}</p>
                                <button class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-2" 
                                        onclick="window.notificationsPage.handleInsightAction('${insight.type}', '${insight.action}')">
                                    ${insight.action}
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">${data.stats.totalMinutes}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">本周学习(分钟)</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">${data.stats.averageMinutes}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">平均时长(分钟)</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">${data.stats.sessionCount}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">学习次数</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">${data.stats.topProject || '无'}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">专注项目</p>
                </div>
            </div>
        `;
    }
    
    // 获取洞察图标
    getInsightIcon(type) {
        const icons = {
            success: '<div class="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>',
            warning: '<div class="w-6 h-6 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg></div>',
            info: '<div class="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>'
        };
        return icons[type] || icons.info;
    }
    
    // 处理洞察操作
    handleInsightAction(type, action) {
        console.log('处理洞察操作:', type, action);
        
        switch (action) {
            case '查看统计':
                this.navigateToAnalytics();
                break;
            case '查看详情':
                this.navigateToProjects();
                break;
            case '设置目标':
                this.navigateToProjects();
                break;
            case '查看进度':
                this.navigateToAnalytics();
                break;
            default:
                console.log('未知的洞察操作:', action);
        }
    }
    
    // 导航到分析页面
    navigateToAnalytics() {
        console.log('导航到分析页面');
        
        // 显示加载提示
        if (window.showNotification) {
            window.showNotification('正在跳转到数据分析页面...', 'info', 2000);
        }
        
        // 检查是否在SPA环境中
        if (typeof showContent === 'function') {
            // 使用SPA导航
            showContent('analytics');
        } else {
            // 回退到传统导航
            setTimeout(() => {
                window.location.href = '/analytics';
            }, 500);
        }
    }
    
    // 导航到项目页面
    navigateToProjects() {
        console.log('导航到项目页面');
        
        // 显示加载提示
        if (window.showNotification) {
            window.showNotification('正在跳转到项目管理页面...', 'info', 2000);
        }
        
        // 检查是否在SPA环境中
        if (typeof showContent === 'function') {
            // 使用SPA导航
            showContent('projects');
        } else {
            // 回退到传统导航
            setTimeout(() => {
                window.location.href = '/projects';
            }, 500);
        }
    }
    
    // 加载通知设置
    async loadSettings() {
        try {
            console.log('开始加载通知设置...');
            const response = await fetch('/api/notifications/settings');
            console.log('加载设置响应状态:', response.status);
            
            if (response.ok) {
                this.settings = await response.json();
                console.log('加载到的设置:', this.settings);
                
                // 确保DOM元素已经准备好后再渲染
                setTimeout(() => {
                    this.renderSettings();
                }, 100);
            } else {
                console.error('加载设置失败，状态码:', response.status);
                const errorText = await response.text();
                console.error('错误详情:', errorText);
            }
        } catch (error) {
            console.error('加载通知设置失败:', error);
        }
    }
    
    // 渲染通知设置
    renderSettings() {
        console.log('渲染通知设置，当前设置:', this.settings);
        
        // 检查设置对象是否存在
        if (!this.settings) {
            console.warn('设置对象不存在，使用默认值');
            this.settings = {
                project_reminders: true,
                progress_reminders: true,
                study_goals: true,
                weekly_reports: true,
                email_notifications: false,
                browser_notifications: true,
                daily_reminder_time: '09:00'
            };
        }
        
        // 安全地设置复选框状态，确保元素存在且设置值有效
        const elements = {
            'projectReminders': this.settings.project_reminders,
            'progressReminders': this.settings.progress_reminders,
            'studyGoals': this.settings.study_goals,
            'weeklyReports': this.settings.weekly_reports,
            'emailNotifications': this.settings.email_notifications,
            'browserNotifications': this.settings.browser_notifications
        };
        
        console.log('准备设置的复选框状态:', elements);
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                const boolValue = Boolean(value);
                element.checked = boolValue;
                console.log(`✓ 设置 ${id}: ${boolValue} (原始值: ${value})`);
            } else {
                console.error(`✗ 找不到元素: ${id}`);
            }
        });
        
        // 设置时间输入
        const timeElement = document.getElementById('dailyReminderTime');
        if (timeElement) {
            const timeValue = this.settings.daily_reminder_time || '09:00';
            // 处理时间格式，确保是 HH:MM 格式
            const formattedTime = timeValue.includes(':') ? timeValue.split(':').slice(0, 2).join(':') : '09:00';
            timeElement.value = formattedTime;
            console.log(`✓ 设置 dailyReminderTime: ${formattedTime} (原始值: ${timeValue})`);
        } else {
            console.error('✗ 找不到元素: dailyReminderTime');
        }
        
        console.log('渲染设置完成');
    }
    
    // 加载通知列表
    async loadNotifications() {
        this.showLoading();
        try {
            const filterType = document.getElementById('filterType')?.value || 'all';
            const unreadOnly = document.getElementById('unreadOnly')?.checked || false;
            
            let url = `/api/notifications?page=${this.currentPage}&limit=10`;
            if (filterType !== 'all') url += `&type=${filterType}`;
            if (unreadOnly) url += `&unread=true`;
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                this.notifications = data.notifications;
                this.renderNotifications();
                this.renderPagination(data.pagination);
            } else {
                this.showError('加载通知失败');
            }
        } catch (error) {
            console.error('加载通知失败:', error);
            this.showError('网络错误，请稍后重试');
        } finally {
            this.hideLoading();
        }
    }
    
    // 渲染通知列表
    renderNotifications() {
        if (this.notifications.length === 0) {
            this.showEmptyState();
        } else {
            this.showNotificationsList();
            this.renderNotificationsList();
        }
    }
    
    // 渲染通知列表项
    renderNotificationsList() {
        const list = document.getElementById('notificationsList');
        if (!list) {
            console.warn('找不到通知列表容器');
            return;
        }
        
        list.innerHTML = '';
        
        this.notifications.forEach(notification => {
            const item = this.createNotificationItem(notification);
            list.appendChild(item);
        });
    }
    
    // 创建通知项
    createNotificationItem(notification) {
        const li = document.createElement('li');
        li.className = `px-6 py-4 ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`;
        
        const typeIcon = this.getNotificationIcon(notification.type);
        const typeLabel = this.getTypeLabel(notification.type);
        
        li.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    ${typeIcon}
                </div>
                <div class="ml-4 flex-1">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <p class="text-sm font-medium text-gray-900 dark:text-white">${notification.title}</p>
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeLabel.class}">
                                ${typeLabel.text}
                            </span>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${!notification.read ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">未读</span>' : ''}
                            <button onclick="window.notificationsPage.deleteNotification(${notification.id})" class="text-gray-400 hover:text-red-500">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${notification.message}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-2">${this.formatDateTime(notification.created_at)}</p>
                </div>
            </div>
        `;
        
        // 添加点击事件标记已读
        if (!notification.read) {
            li.addEventListener('click', () => this.markAsRead(notification.id));
            li.style.cursor = 'pointer';
        }
        
        return li;
    }
    
    // 获取通知类型标签
    getTypeLabel(type) {
        const labels = {
            urgent: { text: '紧急', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
            upcoming: { text: '即将到期', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
            info: { text: '信息', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
            success: { text: '成功', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
            warning: { text: '警告', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
        };
        return labels[type] || labels.info;
    }
    
    // 获取通知图标
    getNotificationIcon(type) {
        const icons = {
            urgent: '<div class="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg></div>',
            upcoming: '<div class="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>',
            success: '<div class="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>',
            warning: '<div class="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg></div>',
            info: '<div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>'
        };
        return icons[type] || icons.info;
    }
    
    // 渲染分页
    renderPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!container) {
            console.warn('找不到分页容器');
            return;
        }
        
        if (pagination.pages <= 1) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        container.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="text-sm text-gray-700 dark:text-gray-300">
                    显示第 ${(pagination.page - 1) * pagination.limit + 1} 到 ${Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 ${pagination.total} 条
                </div>
                <div class="flex space-x-2">
                    ${pagination.page > 1 ? `<button onclick="window.notificationsPage.changePage(${pagination.page - 1})" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">上一页</button>` : ''}
                    ${pagination.page < pagination.pages ? `<button onclick="window.notificationsPage.changePage(${pagination.page + 1})" class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">下一页</button>` : ''}
                </div>
            </div>
        `;
    }
    
    // 切换页面
    changePage(page) {
        this.currentPage = page;
        this.loadNotifications();
    }
    
    // 标记已读
    async markAsRead(id) {
        try {
            const response = await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT'
            });
            if (response.ok) {
                await this.loadNotifications();
                await this.loadStats();
            }
        } catch (error) {
            console.error('标记已读失败:', error);
        }
    }
    
    // 删除通知
    async deleteNotification(id) {
        const confirmed = await this.showConfirmDialog(
            '删除通知',
            '确定要删除这条通知吗？',
            '删除',
            '取消'
        );
        
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                await this.loadNotifications();
                await this.loadStats();
                this.showToast('通知已删除', 'success');
            }
        } catch (error) {
            console.error('删除通知失败:', error);
            this.showToast('删除通知失败', 'error');
        }
    }
    
    // 标记全部已读
    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT'
            });
            if (response.ok) {
                await this.loadNotifications();
                await this.loadStats();
            }
        } catch (error) {
            console.error('标记全部已读失败:', error);
        }
    }
    
    // 清空全部通知
    async clearAllNotifications() {
        // 使用自定义确认对话框替代alert
        const confirmed = await this.showConfirmDialog(
            '清空所有通知',
            '确定要清空所有通知吗？此操作不可恢复。',
            '清空全部',
            '取消'
        );
        
        if (!confirmed) return;
        
        try {
            const response = await fetch('/api/notifications/clear-all', {
                method: 'DELETE'
            });
            if (response.ok) {
                await this.loadNotifications();
                await this.loadStats();
                this.showToast('所有通知已清空', 'success');
            }
        } catch (error) {
            console.error('清空通知失败:', error);
            this.showToast('清空通知失败', 'error');
        }
    }
    
    // 保存设置
    async saveSettings() {
        console.log('saveSettings 被调用');
        
        // 安全地获取表单元素的值
        const getElementValue = (id, isCheckbox = false) => {
            const element = document.getElementById(id);
            if (!element) {
                console.warn(`找不到元素: ${id}`);
                return isCheckbox ? false : '';
            }
            return isCheckbox ? element.checked : element.value;
        };
        
        const settings = {
            project_reminders: getElementValue('projectReminders', true),
            progress_reminders: getElementValue('progressReminders', true),
            study_goals: getElementValue('studyGoals', true),
            weekly_reports: getElementValue('weeklyReports', true),
            email_notifications: getElementValue('emailNotifications', true),
            browser_notifications: getElementValue('browserNotifications', true),
            daily_reminder_time: getElementValue('dailyReminderTime', false)
        };
        
        console.log('准备保存的设置:', settings);
        
        try {
            const response = await fetch('/api/notifications/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            console.log('保存设置响应状态:', response.status);
            
            if (response.ok) {
                console.log('设置保存成功');
                const result = await response.json();
                console.log('服务器返回的设置:', result);
                
                // 更新本地设置对象
                this.settings = result;
                
                this.showSuccess('设置已保存');
                
                // 重新渲染设置以确保UI同步
                this.renderSettings();
            } else {
                console.error('保存设置失败，状态码:', response.status);
                const errorText = await response.text();
                console.error('错误详情:', errorText);
                this.showError('保存设置失败');
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            this.showError('网络错误，请稍后重试');
        }
    }
    
    // 绑定事件
    bindEvents() {
        console.log('开始绑定事件...');
        
        // 过滤事件
        const filterType = document.getElementById('filterType');
        if (filterType) {
            filterType.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadNotifications();
            });
        }
        
        const unreadOnly = document.getElementById('unreadOnly');
        if (unreadOnly) {
            unreadOnly.addEventListener('change', () => {
                this.currentPage = 1;
                this.loadNotifications();
            });
        }
        
        // 操作按钮事件
        const markAllRead = document.getElementById('markAllRead');
        if (markAllRead) {
            markAllRead.addEventListener('click', () => this.markAllAsRead());
        }
        
        const clearAll = document.getElementById('clearAll');
        if (clearAll) {
            clearAll.addEventListener('click', () => this.clearAllNotifications());
        }
        
        // 设置表单事件
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault(); // 阻止表单默认提交行为
                this.saveSettings();
            });
            console.log('设置表单事件已绑定');
        } else {
            console.warn('找不到设置表单');
        }
        
        console.log('事件绑定完成');
    }
    
    // 显示状态控制
    showLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'flex';
        }
        
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.style.display = 'none';
        }
        
        const pagination = document.getElementById('pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
    }
    
    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    }
    
    showEmptyState() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.style.display = 'none';
        }
        
        const pagination = document.getElementById('pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
    }
    
    showNotificationsList() {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.style.display = 'block';
        }
    }
    
    // 工具方法
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
    
    // 通知方法
    showSuccess(message) {
        // 创建一个简单的成功提示，不会导致页面重定向
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    showError(message) {
        // 创建一个简单的错误提示，不会导致页面重定向
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 显示动画
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
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

    // 显示Toast通知
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl transition-all duration-300 transform translate-x-full max-w-sm`;
        
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
        
        toast.className += ` ${colors[type] || colors.info}`;
        toast.innerHTML = `
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
        
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    // 销毁方法
    destroy() {
        console.log('销毁通知页面实例');
        // 清理事件监听器
        // 这里可以添加清理逻辑
    }
}

// 暴露到全局作用域
window.NotificationsPage = NotificationsPage; 