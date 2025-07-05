// 全局系统名称更新函数
window.updateSystemNameDisplay = function(systemName) {
    console.log('全局更新系统名称显示:', systemName);
    
    // 更新登录页面的系统名称
    const loginSystemName = document.getElementById('loginSystemName');
    if (loginSystemName) {
        loginSystemName.textContent = systemName || '学习追踪系统';
    }
    
    // 更新侧边栏的系统名称
    const sidebarSystemName = document.getElementById('sidebarSystemName');
    if (sidebarSystemName) {
        sidebarSystemName.textContent = `📚 ${systemName || '学习追踪'}`;
    }
    
    // 更新移动端侧边栏的系统名称
    const mobileSidebarSystemName = document.getElementById('mobileSidebarSystemName');
    if (mobileSidebarSystemName) {
        mobileSidebarSystemName.textContent = `📚 ${systemName || '学习追踪'}`;
    }
    
    // 更新浏览器标题
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        const currentTitle = pageTitle.textContent;
        const baseTitle = currentTitle.split(' - ')[0]; // 获取页面标题部分
        pageTitle.textContent = `${baseTitle} - ${systemName || '学习项目追踪系统'}`;
    }
    
    // 同时更新document.title
    const currentTitle = document.title;
    const baseTitle = currentTitle.split(' - ')[0];
    document.title = `${baseTitle} - ${systemName || '学习项目追踪系统'}`;
    
    console.log('全局系统名称更新完成');
};

// 页面加载时初始化系统名称
window.initSystemName = async function() {
    try {
        const response = await fetch('/api/admin/config', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        
        if (data.success && data.config && data.config.systemName) {
            window.updateSystemNameDisplay(data.config.systemName);
        }
    } catch (error) {
        console.log('初始化系统名称失败:', error);
    }
};

// 全局通知系统
try {
    class NotificationSystem {
        constructor() {
            this.container = document.getElementById('notificationContainer');
            this.notifications = [];
            this.counter = 0;
            this.setupEventListeners();
        }
        setupEventListeners() {
            this.container.addEventListener('click', (e) => {
                if (e.target.closest('.notification-close-btn')) {
                    const notificationId = e.target.closest('.notification-item').id;
                    this.hide(notificationId);
                }
            });
        }
        show(message, type = 'info', duration = 5000) {
            const id = 'notification-' + (++this.counter);
            const notification = this.createNotification(id, message, type);
            this.container.appendChild(notification);
            this.container.style.display = 'block';
            this.notifications.push({ id, element: notification });
            setTimeout(() => { notification.classList.remove('translate-x-full', 'opacity-0'); }, 100);
            if (duration > 0) {
                setTimeout(() => { this.hide(id); }, duration);
            }
            return id;
        }
        createNotification(id, message, type) {
            const notification = document.createElement('div');
            notification.className = 'notification-item max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transform transition-all duration-300 translate-x-full opacity-0';
            notification.id = id;
            const bgColor = type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' :
                type === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
                type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400' :
                'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
            notification.innerHTML = `<div class="p-4 border ${bgColor}"><div class="flex"><div class="flex-1"><p class="text-sm font-medium">${message}</p></div><div class="ml-4 flex-shrink-0"><button class="notification-close-btn text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><span class="sr-only">关闭</span><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div></div></div>`;
            return notification;
        }
        hide(id) {
            const notification = this.notifications.find(n => n.id === id);
            if (notification) {
                notification.element.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => {
                    if (notification.element.parentNode) {
                        notification.element.parentNode.removeChild(notification.element);
                    }
                    this.notifications = this.notifications.filter(n => n.id !== id);
                    if (this.notifications.length === 0) {
                        this.container.style.display = 'none';
                    }
                }, 300);
            }
        }
        hideAll() {
            this.notifications.forEach(notification => { this.hide(notification.id); });
        }
    }
    window.notificationSystem = new NotificationSystem();
    window.showNotification = function(message, type, duration) {
        return window.notificationSystem.show(message, type, duration);
    };
    // 主题切换
    window.toggleDarkMode = function() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
        updateDarkModeIcons(document.documentElement.classList.contains('dark'));
    };
    function updateDarkModeIcons(isDark) {
        const desktopIcon = document.getElementById('desktopDarkModeIcon');
        const mobileIcon = document.getElementById('mobileDarkModeIcon');
        if (desktopIcon) desktopIcon.textContent = isDark ? '☀️' : '🌙';
        if (mobileIcon) mobileIcon.textContent = isDark ? '☀️' : '🌙';
    }
    window.updateDarkModeIcons = updateDarkModeIcons;
    function initDarkMode() {
        const savedMode = localStorage.getItem('darkMode');
        if (savedMode === 'true') document.documentElement.classList.add('dark');
        updateDarkModeIcons(document.documentElement.classList.contains('dark'));
    }
    // 个人设置弹窗功能
    function initProfileModal() {
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const avatarInput = document.getElementById('avatarInput');
        const avatarDisplay = document.getElementById('avatarDisplay');
        const avatarImage = document.getElementById('avatarImage');
        const avatarInitial = document.getElementById('avatarInitial');
        
        if (!changeAvatarBtn || !avatarInput) return;
        
        // 检查是否已经绑定过事件，避免重复绑定
        if (changeAvatarBtn.dataset.eventBound === 'true') {
            console.log('头像上传事件已绑定，跳过重复绑定');
            return;
        }
        
        console.log('开始绑定头像上传事件');
        
        changeAvatarBtn.addEventListener('click', function() { 
            console.log('头像上传按钮被点击');
            avatarInput.click(); 
        });
        
        avatarInput.addEventListener('change', function(e) {
            console.log('文件选择事件触发');
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) { 
                window.showNotification('请选择图片文件', 'error'); 
                return; 
            }
            if (file.size > 5 * 1024 * 1024) { 
                window.showNotification('图片文件大小不能超过5MB', 'error'); 
                return; 
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                if (avatarImage) { 
                    avatarImage.src = e.target.result; 
                    avatarImage.style.display = 'block'; 
                }
                if (avatarInitial) {
                    avatarInitial.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
            uploadAvatar(file);
        });
        
        // 标记事件已绑定
        changeAvatarBtn.dataset.eventBound = 'true';
        console.log('头像上传事件绑定完成');
    }
    
    async function uploadAvatar(file) {
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const avatarImage = document.getElementById('avatarImage');
        const avatarInitial = document.getElementById('avatarInitial');
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            changeAvatarBtn.disabled = true;
            changeAvatarBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>`;
            const response = await fetch('/api/users/avatar', { method: 'POST', credentials: 'include', body: formData });
            const result = await response.json();
            if (response.ok && result.success) {
                window.showNotification('头像上传成功', 'success');
                // 使用新的头像更新管理器
                if (window.avatarUpdater) {
                    window.avatarUpdater.updateAllAvatarDisplays(result.avatarUrl, result.userId);
                } else {
                    // 回退到原来的方法
                    updateAllAvatarDisplays(result.avatarUrl);
                }
            } else if (response.status === 401 || response.status === 403) {
                window.showNotification('登录已过期，请重新登录', 'error');
                document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                setTimeout(() => { window.location.href = '/login'; }, 2000);
            } else {
                window.showNotification(result.error || '头像上传失败', 'error');
                if (avatarImage) avatarImage.style.display = 'none';
                if (avatarInitial) avatarInitial.style.display = 'block';
            }
        } catch (error) {
            window.showNotification('网络错误，请重试', 'error');
            if (avatarImage) avatarImage.style.display = 'none';
            if (avatarInitial) avatarInitial.style.display = 'block';
        } finally {
            changeAvatarBtn.disabled = false;
            changeAvatarBtn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`;
        }
    }
    
    function updateAllAvatarDisplays(avatarUrl) {
        const sidebarAvatars = document.querySelectorAll('.sidebar-avatar, .mobile-sidebar-avatar');
        sidebarAvatars.forEach(avatar => {
            if (avatar.tagName === 'IMG') { avatar.src = avatarUrl; }
            else {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.className = avatar.className + ' w-full h-full object-cover';
                img.alt = '用户头像';
                avatar.innerHTML = '';
                avatar.appendChild(img);
            }
        });
        const headerAvatars = document.querySelectorAll('.header-avatar');
        headerAvatars.forEach(avatar => {
            if (avatar.tagName === 'IMG') { avatar.src = avatarUrl; }
            else {
                const img = document.createElement('img');
                img.src = avatarUrl;
                img.className = avatar.className + ' w-full h-full object-cover';
                img.alt = '用户头像';
                avatar.innerHTML = '';
                avatar.appendChild(img);
            }
        });
    }
    
    function showProfileModal() {
        const modal = document.getElementById('profileModal');
        const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
        
        if (modal && modalContent) {
            // 重置表单
            const form = document.getElementById('profileForm');
            if (form) {
                form.reset();
            }
            
            // 清除消息
            const messageDiv = document.getElementById('profileMessage');
            if (messageDiv) {
                messageDiv.innerHTML = '';
            }
            
            // 显示弹窗
            modal.classList.remove('hidden');
            
            // 添加显示动画
            setTimeout(() => {
                modalContent.classList.remove('scale-95', 'opacity-0');
                modalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
            
            // 关闭用户下拉菜单
            closeUserDropdown();
            
            // 加载用户通知设置
            loadNotificationSettings();
        }
    }
    function hideProfileModal() {
        const modal = document.getElementById('profileModal');
        if (!modal) return;
        const modalContent = modal.querySelector('.bg-white, .dark\\:bg-gray-900');
        if (modalContent) {
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => { modal.classList.add('hidden'); }, 300);
        } else {
            modal.classList.add('hidden');
        }
    }
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            const loadingScreen = document.getElementById('loadingScreen');
            const mainContent = document.getElementById('mainContent');
            
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            if (mainContent) {
                mainContent.style.display = 'flex';
            }
            initDarkMode();
            initProfileModal();
            // 个人设置弹窗按钮
            const openProfileModalBtn = document.getElementById('openProfileModalBtn');
            const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
            const cancelProfileBtn = document.getElementById('cancelProfileBtn');
            if (openProfileModalBtn) openProfileModalBtn.addEventListener('click', showProfileModal);
            if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', hideProfileModal);
            if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', hideProfileModal);
            
            // 绑定个人设置表单提交事件
            const profileForm = document.getElementById('profileForm');
            if (profileForm) {
                profileForm.addEventListener('submit', handleProfileSubmit);
                console.log('个人设置表单提交事件已绑定');
            }
            
            // 绑定注销账户事件
            const deactivateAccountBtn = document.getElementById('deactivateAccountBtn');
            if (deactivateAccountBtn) {
                deactivateAccountBtn.addEventListener('click', showDeactivateModal);
                console.log('注销账户按钮事件已绑定');
            }
        }, 500);
    });
    
    // 处理个人设置表单提交
    async function handleProfileSubmit(e) {
        e.preventDefault();
        console.log('个人设置表单提交事件触发');
        
        // 详细调试cookie信息
        console.log('=== Cookie 调试信息 ===');
        console.log('document.cookie:', document.cookie);
        
        const allCookies = document.cookie.split(';').map(cookie => cookie.trim());
        console.log('所有cookie数组:', allCookies);
        
        const tokenCookie = allCookies.find(cookie => cookie.startsWith('token='));
        const authTokenCookie = allCookies.find(cookie => cookie.startsWith('authToken='));
        
        console.log('token cookie:', tokenCookie);
        console.log('authToken cookie:', authTokenCookie);
        
        const submitBtn = document.getElementById('saveProfileBtn');
        const messageDiv = document.getElementById('profileMessage');
        const originalText = submitBtn.innerHTML;
        
        // 显示加载状态
        submitBtn.innerHTML = `
            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            保存中...
        `;
        submitBtn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            
            console.log('表单数据:', data);
            
            // 获取认证token - 改进的逻辑
            let token = null;
            let authToken = null;
            
            if (tokenCookie) {
                token = tokenCookie.split('=')[1];
            }
            
            if (authTokenCookie) {
                authToken = authTokenCookie.split('=')[1];
            }
            
            // 优先使用token，如果没有则使用authToken
            const finalToken = token || authToken;
            
            console.log('获取到的token:', token ? token.substring(0, 20) + '...' : 'null');
            console.log('获取到的authToken:', authToken ? authToken.substring(0, 20) + '...' : 'null');
            console.log('最终使用的token:', finalToken ? finalToken.substring(0, 20) + '...' : 'null');
            
            if (!finalToken) {
                console.error('没有找到任何有效的token');
                messageDiv.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <p class="text-sm">登录已过期，请重新登录</p>
                    </div>
                `;
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }
            
            console.log('发送个人设置更新请求到 /api/users/profile');
            
            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                credentials: 'include', // 确保发送cookie
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('响应状态:', response.status);
            console.log('响应头:', Object.fromEntries(response.headers.entries()));
            
            const result = await response.json();
            console.log('响应结果:', result);

            if (response.ok) {
                messageDiv.innerHTML = `
                    <div class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                        <p class="text-sm">${result.message || '设置保存成功！'}</p>
                    </div>
                `;
                
                // 更新页面上的用户名显示
                const usernameElements = document.querySelectorAll('[data-username]');
                usernameElements.forEach(el => {
                    el.textContent = data.username;
                });
                
                // 3秒后关闭弹窗
                setTimeout(hideProfileModal, 3000);
            } else if (response.status === 401 || response.status === 403) {
                // 认证失败，清除cookie并重定向
                console.error('认证失败，状态码:', response.status);
                console.error('错误详情:', result);
                messageDiv.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <p class="text-sm">登录已过期，正在跳转到登录页面...</p>
                    </div>
                `;
                document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                console.error('保存失败，状态码:', response.status);
                console.error('错误详情:', result);
                messageDiv.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <p class="text-sm">${result.error || '保存失败，请重试'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('保存设置失败:', error);
            console.error('错误堆栈:', error.stack);
            messageDiv.innerHTML = `
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    <p class="text-sm">网络错误，请重试</p>
                </div>
            `;
        } finally {
            // 恢复按钮状态
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    // 加载用户通知设置
    async function loadNotificationSettings() {
        try {
            console.log('=== 加载通知设置开始 ===');
            console.log('document.cookie:', document.cookie);
            
            const response = await fetch('/api/users/notification-settings', {
                method: 'GET',
                credentials: 'include'
            });
            
            console.log('通知设置响应状态:', response.status);
            console.log('通知设置响应头:', Object.fromEntries(response.headers.entries()));
            
            if (response.ok) {
                const settings = await response.json();
                console.log('获取到的通知设置:', settings);
                
                // 设置复选框的值
                const emailNotifications = document.getElementById('emailNotifications');
                const browserNotifications = document.getElementById('browserNotifications');
                const studyReminders = document.getElementById('studyReminders');
                
                if (emailNotifications) emailNotifications.checked = settings.emailNotifications || false;
                if (browserNotifications) browserNotifications.checked = settings.browserNotifications || false;
                if (studyReminders) studyReminders.checked = settings.studyReminders || false;
                
                console.log('通知设置加载完成');
            } else {
                console.error('加载通知设置失败:', response.status);
                const errorText = await response.text();
                console.error('错误响应内容:', errorText);
            }
        } catch (error) {
            console.error('加载通知设置出错:', error);
            console.error('错误堆栈:', error.stack);
        }
    }
    
    // 注销账户相关函数
    function showDeactivateModal() {
        const modal = document.getElementById('deactivateModal');
        const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
        
        if (modal && modalContent) {
            // 重置表单
            const verificationCode = document.getElementById('verificationCode');
            const confirmDeactivate = document.getElementById('confirmDeactivate');
            const messageDiv = document.getElementById('deactivateMessage');
            
            if (verificationCode) verificationCode.value = '';
            if (confirmDeactivate) confirmDeactivate.value = '';
            if (messageDiv) messageDiv.innerHTML = '';
            
            // 显示弹窗
            modal.classList.remove('hidden');
            
            // 添加显示动画
            setTimeout(() => {
                modalContent.classList.remove('scale-95', 'opacity-0');
                modalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
            
            // 关闭个人设置弹窗
            hideProfileModal();
        }
    }
    
    function hideDeactivateModal() {
        const modal = document.getElementById('deactivateModal');
        const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
        
        if (modal && modalContent) {
            // 添加关闭动画
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
            
            // 等待动画完成后隐藏弹窗
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }
    }
    
    async function sendVerificationCode() {
        const sendBtn = document.getElementById('sendVerificationCodeBtn');
        const messageDiv = document.getElementById('deactivateMessage');
        
        if (!sendBtn) return;
        
        // 显示加载状态
        const originalText = sendBtn.innerHTML;
        sendBtn.innerHTML = `
            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            发送中...
        `;
        sendBtn.disabled = true;
        
        try {
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('token='))
                ?.split('=')[1];
            
            if (!token) {
                messageDiv.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <p class="text-sm">登录已过期，请重新登录</p>
                    </div>
                `;
                return;
            }
            
            const response = await fetch('/api/users/send-deactivation-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                messageDiv.innerHTML = `
                    <div class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                        <p class="text-sm">验证码已发送到您的邮箱，请查收</p>
                    </div>
                `;
                
                // 开始倒计时
                startCountdown(sendBtn, 60);
            } else {
                messageDiv.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <p class="text-sm">${result.error || '发送失败，请重试'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('发送验证码失败:', error);
            messageDiv.innerHTML = `
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    <p class="text-sm">网络错误，请重试</p>
                </div>
            `;
        } finally {
            // 恢复按钮状态（如果没有开始倒计时）
            if (!sendBtn.disabled) {
                sendBtn.innerHTML = originalText;
                sendBtn.disabled = false;
            }
        }
    }
    
    function startCountdown(button, seconds) {
        const originalText = button.innerHTML;
        let remaining = seconds;
        
        const countdown = setInterval(() => {
            remaining--;
            button.innerHTML = `${remaining}秒后重发`;
            
            if (remaining <= 0) {
                clearInterval(countdown);
                button.innerHTML = originalText;
                button.disabled = false;
            }
        }, 1000);
    }
    
    async function confirmDeactivate() {
        const verificationCode = document.getElementById('verificationCode')?.value?.trim();
        const confirmText = document.getElementById('confirmDeactivate')?.value?.trim();
        const messageDiv = document.getElementById('deactivateMessage');
        const confirmBtn = document.getElementById('confirmDeactivateBtn');
        
        if (!verificationCode) {
            messageDiv.innerHTML = `
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    <p class="text-sm">请输入验证码</p>
                </div>
            `;
            return;
        }
        
        if (confirmText !== '注销账户') {
            messageDiv.innerHTML = `
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    <p class="text-sm">请输入"注销账户"确认操作</p>
                </div>
            `;
            return;
        }
        
        // 显示加载状态
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = `
            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            处理中...
        `;
        confirmBtn.disabled = true;
        
        try {
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('token='))
                ?.split('=')[1];
            
            if (!token) {
                messageDiv.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <p class="text-sm">登录已过期，请重新登录</p>
                    </div>
                `;
                return;
            }
            
            const response = await fetch('/api/users/deactivate-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    verificationCode,
                    confirmText
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                messageDiv.innerHTML = `
                    <div class="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                        <p class="text-sm">账户注销成功，即将跳转到首页...</p>
                    </div>
                `;
                
                // 清除cookie并跳转
                document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);
            } else {
                messageDiv.innerHTML = `
                    <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        <p class="text-sm">${result.error || '注销失败，请重试'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('注销账户失败:', error);
            messageDiv.innerHTML = `
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    <p class="text-sm">网络错误，请重试</p>
                </div>
            `;
        } finally {
            // 恢复按钮状态
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    }
    
    // 暴露注销相关函数到全局作用域
    window.sendVerificationCode = sendVerificationCode;
    window.confirmDeactivate = confirmDeactivate;
    window.showDeactivateModal = showDeactivateModal;
    window.hideDeactivateModal = hideDeactivateModal;
    
} catch (e) { console.error('main.js 全局JS错误:', e); }

// 注册弹窗统一交互逻辑
(function() {
    function showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }
    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }
    
    // 初始化注册弹窗功能
    function initRegisterModal() {
        // 注册弹窗控制
        const registerModal = document.getElementById('registerModal');
        const closeRegisterModal = document.getElementById('closeRegisterModal');
        if (registerModal && closeRegisterModal) {
            closeRegisterModal.addEventListener('click', () => hideModal('registerModal'));
            registerModal.addEventListener('click', (e) => {
                if (e.target.id === 'registerModal') hideModal('registerModal');
            });
        }
        
        // 发送验证码
        const sendVerificationBtn = document.getElementById('sendVerificationBtn');
        if (sendVerificationBtn && !sendVerificationBtn.dataset.eventBound) {
            sendVerificationBtn.dataset.eventBound = 'true';
            sendVerificationBtn.addEventListener('click', async function() {
                const emailInput = document.getElementById('registerEmail');
                const messageDiv = document.getElementById('registerMessage');
                const email = emailInput.value.trim();
                if (!email) {
                    messageDiv.textContent = '请先输入邮箱地址';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    messageDiv.textContent = '请输入有效的邮箱地址';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    return;
                }
                sendVerificationBtn.disabled = true;
                let countdown = 60;
                const originalText = sendVerificationBtn.textContent;
                const timer = setInterval(() => {
                    sendVerificationBtn.textContent = `${countdown}秒后重试`;
                    countdown--;
                    if (countdown < 0) {
                        clearInterval(timer);
                        sendVerificationBtn.disabled = false;
                        sendVerificationBtn.textContent = originalText;
                    }
                }, 1000);
                try {
                    const response = await fetch('/api/auth/send-verification', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'HX-Request': 'true'
                        },
                        body: JSON.stringify({ email })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        messageDiv.textContent = '验证码已发送到您的邮箱，请注意查收';
                        messageDiv.className = 'text-green-500 font-semibold text-base text-center mt-2';
                    } else {
                        messageDiv.textContent = data.error || '发送验证码失败';
                        messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                        clearInterval(timer);
                        sendVerificationBtn.disabled = false;
                        sendVerificationBtn.textContent = originalText;
                    }
                } catch (error) {
                    messageDiv.textContent = '发送验证码失败，请稍后重试';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    clearInterval(timer);
                    sendVerificationBtn.disabled = false;
                    sendVerificationBtn.textContent = originalText;
                }
            });
        }
        
        // 注册表单提交
        const registerForm = document.getElementById('registerFormModal');
        if (registerForm && !registerForm.dataset.eventBound) {
            registerForm.dataset.eventBound = 'true';
            registerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const username = document.getElementById('registerUsername').value.trim();
                const email = document.getElementById('registerEmail').value.trim();
                const code = document.getElementById('verificationCode').value.trim();
                const password = document.getElementById('registerPassword').value;
                const confirmPassword = document.getElementById('registerConfirmPassword').value;
                const messageDiv = document.getElementById('registerMessage');
                if (!username || !email || !code || !password || !confirmPassword) {
                    messageDiv.textContent = '请完整填写所有信息';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    return;
                }
                if (password !== confirmPassword) {
                    messageDiv.textContent = '两次输入的密码不一致';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    messageDiv.textContent = '请输入有效的邮箱地址';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    return;
                }
                if (!/^[0-9]{6}$/.test(code)) {
                    messageDiv.textContent = '请输入6位验证码';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    return;
                }
                registerForm.querySelector('button[type="submit"]').disabled = true;
                registerForm.querySelector('button[type="submit"]').textContent = '注册中...';
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, email, verificationCode: code, password, confirmPassword })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        messageDiv.textContent = '注册成功！请登录您的账户。';
                        messageDiv.className = 'text-green-500 font-semibold text-base text-center mt-2';
                        setTimeout(() => {
                            hideModal('registerModal');
                            // 注册成功后显示登录弹窗
                            showModal('loginModal');
                        }, 1500);
                    } else {
                        messageDiv.textContent = data.error || '注册失败';
                        messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                    }
                } catch (error) {
                    messageDiv.textContent = '注册失败，请稍后重试';
                    messageDiv.className = 'text-red-500 font-semibold text-base text-center mt-2';
                } finally {
                    registerForm.querySelector('button[type="submit"]').disabled = false;
                    registerForm.querySelector('button[type="submit"]').textContent = '注册';
                }
            });
        }
    }
    
    // 暴露到全局作用域
    window.initRegisterModal = initRegisterModal;
    
    // 在DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initRegisterModal();
            // 初始化系统名称
            if (window.initSystemName) {
                window.initSystemName();
            }
        });
    } else {
        initRegisterModal();
        // 初始化系统名称
        if (window.initSystemName) {
            window.initSystemName();
        }
    }
    
    // 为了处理动态加载的内容，也监听弹窗显示事件
    document.addEventListener('click', function(e) {
        if (e.target.id === 'registerBtn' || e.target.closest('#registerBtn')) {
            // 延迟一点时间确保弹窗已渲染
            setTimeout(initRegisterModal, 100);
        }
    });
})(); 

// ==================== 动态脚本加载和初始化系统 ====================
// 这个系统确保SPA页面切换时JS脚本100%生效

class DynamicScriptManager {
  constructor() {
    this.loadedScripts = new Map(); // 记录已加载的脚本
    this.pageInstances = new Map(); // 记录页面实例
    this.scriptQueue = []; // 脚本加载队列
    this.isLoading = false; // 是否正在加载
  }

  // 清理页面实例
  cleanupPageInstance(pageType) {
    if (this.pageInstances.has(pageType)) {
      const instance = this.pageInstances.get(pageType);
      if (instance && typeof instance.destroy === 'function') {
        try {
          instance.destroy();
        } catch (error) {
          console.warn(`清理页面实例失败 ${pageType}:`, error);
        }
      }
      this.pageInstances.delete(pageType);
    }
  }

  // 动态加载脚本
  async loadScript(scriptPath, pageType) {
    return new Promise((resolve, reject) => {
      // 检查脚本是否已经加载
      if (this.loadedScripts.has(scriptPath)) {
        console.log(`脚本已加载: ${scriptPath}`);
        resolve();
        return;
      }

      console.log(`开始加载脚本: ${scriptPath}`);

      // 创建script标签
      const script = document.createElement('script');
      script.src = scriptPath;
      script.async = false; // 确保按顺序加载

      // 成功加载
      script.onload = () => {
        console.log(`脚本加载成功: ${scriptPath}`);
        this.loadedScripts.set(scriptPath, true);
        resolve();
      };

      // 加载失败
      script.onerror = () => {
        console.error(`脚本加载失败: ${scriptPath}`);
        reject(new Error(`Failed to load script: ${scriptPath}`));
      };

      // 添加到页面
      document.head.appendChild(script);
    });
  }

  // 初始化页面
  async initializePage(pageType) {
    console.log(`开始初始化页面: ${pageType}`);
    
    try {
      // 清理之前的页面实例
      this.cleanupPageInstance(pageType);

      // 根据页面类型加载对应的脚本和初始化
      switch (pageType) {
        case 'points-exchange':
          await this.initializePointsExchange();
          break;
        case 'exchange-records':
          await this.initializeExchangeRecords();
          break;
        case 'points-records':
          await this.initializePointsRecords();
          break;
        case 'projects':
          await this.initializeProjects();
          break;
        case 'sessions':
          await this.initializeSessions();
          break;
        case 'analytics':
          await this.initializeAnalytics();
          break;
        case 'achievements':
          await this.initializeAchievements();
          break;
        case 'notifications':
          await this.initializeNotifications();
          break;
        default:
          console.log(`未知页面类型: ${pageType}`);
      }

      console.log(`页面初始化完成: ${pageType}`);
    } catch (error) {
      console.error(`页面初始化失败 ${pageType}:`, error);
      throw error;
    }
  }

  // 初始化积分兑换页面
  async initializePointsExchange() {
    console.log('开始初始化积分兑换页面');
    
    // 加载脚本
    await this.loadScript('/assets/js/points-exchange.js', 'points-exchange');
    
    // 等待DOM更新
    await this.waitForDOMUpdate();
    
    // 创建页面实例
    if (typeof PointsExchangePage !== 'undefined') {
      const instance = new PointsExchangePage();
      this.pageInstances.set('points-exchange', instance);
      console.log('积分兑换页面实例创建成功');
    } else {
      console.error('PointsExchangePage类未定义');
    }
  }

  // 初始化兑换记录页面
  async initializeExchangeRecords() {
    console.log('开始初始化兑换记录页面');
    
    await this.loadScript('/assets/js/exchange-records.js', 'exchange-records');
    await this.waitForDOMUpdate();
    
    if (typeof ExchangeRecordsPage !== 'undefined') {
      const instance = new ExchangeRecordsPage();
      this.pageInstances.set('exchange-records', instance);
      console.log('兑换记录页面实例创建成功');
    }
  }

  // 初始化积分明细页面
  async initializePointsRecords() {
    console.log('开始初始化积分明细页面');
    
    await this.loadScript('/assets/js/points-records.js', 'points-records');
    await this.waitForDOMUpdate();
    
    if (typeof PointsRecordsPage !== 'undefined') {
      const instance = new PointsRecordsPage();
      this.pageInstances.set('points-records', instance);
      console.log('积分明细页面实例创建成功');
    }
  }

  // 初始化学习项目页面
  async initializeProjects() {
    console.log('开始初始化学习项目页面');
    
    await this.loadScript('/assets/js/projects.js', 'projects');
    await this.waitForDOMUpdate();
    
    if (typeof ProjectsPage !== 'undefined') {
      const instance = new ProjectsPage();
      this.pageInstances.set('projects', instance);
      console.log('学习项目页面实例创建成功');
    }
  }

  // 初始化学习记录页面
  async initializeSessions() {
    console.log('开始初始化学习记录页面');
    
    await this.loadScript('/assets/js/sessions.js', 'sessions');
    await this.waitForDOMUpdate();
    
    if (typeof SessionsPage !== 'undefined') {
      const instance = new SessionsPage();
      this.pageInstances.set('sessions', instance);
      console.log('学习记录页面实例创建成功');
    }
  }

  // 初始化数据分析页面
  async initializeAnalytics() {
    console.log('开始初始化数据分析页面');
    
    // analytics页面的JavaScript是内嵌的，不需要加载外部脚本
    await this.waitForDOMUpdate();
    
    // 查找页面中的script标签并执行
    const analyticsScripts = document.querySelectorAll('#dynamicContent script');
    console.log('找到的analytics脚本标签数量:', analyticsScripts.length);
    
    // 执行内嵌脚本
    analyticsScripts.forEach((script, index) => {
      console.log(`执行第${index + 1}个analytics脚本标签`);
      try {
        // 创建新的script元素并执行
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
        console.log(`第${index + 1}个analytics脚本标签执行完成`);
      } catch (error) {
        console.error(`执行第${index + 1}个analytics脚本标签失败:`, error);
      }
    });
    
    // 等待脚本执行完成，然后检查AnalyticsApp类
    setTimeout(() => {
      console.log('检查AnalyticsApp是否已定义:', typeof AnalyticsApp);
      
      if (typeof AnalyticsApp !== 'undefined') {
        console.log('AnalyticsApp 类已定义，尝试创建实例');
        try {
          // 检查是否已经存在实例
          if (window.analyticsApp) {
            console.log('清理现有 AnalyticsApp 实例');
            window.analyticsApp = null;
          }
          
          // 创建新实例
          window.analyticsApp = new AnalyticsApp();
          console.log('AnalyticsApp 实例创建成功');
        } catch (error) {
          console.error('创建 AnalyticsApp 实例失败:', error);
        }
      } else {
        console.error('AnalyticsApp 类未定义');
      }
    }, 100);
    
    console.log('数据分析页面实例创建成功');
  }

  // 初始化成就页面
  async initializeAchievements() {
    console.log('开始初始化成就页面');
    
    await this.loadScript('/assets/js/achievements.js', 'achievements');
    await this.waitForDOMUpdate();
    
    if (typeof AchievementsPage !== 'undefined') {
      const instance = new AchievementsPage();
      this.pageInstances.set('achievements', instance);
      console.log('成就页面实例创建成功');
    }
  }

  // 初始化通知页面
  async initializeNotifications() {
    console.log('开始初始化通知页面');
    
    await this.loadScript('/assets/js/notifications.js', 'notifications');
    await this.waitForDOMUpdate();
    
    if (typeof NotificationsPage !== 'undefined') {
      const instance = new NotificationsPage();
      this.pageInstances.set('notifications', instance);
      console.log('通知页面实例创建成功');
    }
  }

  // 等待DOM更新完成
  async waitForDOMUpdate() {
    return new Promise((resolve) => {
      // 使用requestAnimationFrame确保DOM更新完成
      requestAnimationFrame(() => {
        // 再等待一个微任务周期
        setTimeout(resolve, 50);
      });
    });
  }

  // 强制重新初始化页面
  async forceReinitializePage(pageType) {
    console.log(`强制重新初始化页面: ${pageType}`);
    
    // 清理已加载的脚本
    this.loadedScripts.delete(`/assets/js/${pageType}.js`);
    
    // 重新初始化
    await this.initializePage(pageType);
  }
}

// 创建全局脚本管理器实例
window.scriptManager = new DynamicScriptManager();

// 增强的导航函数
window.enhancedNavigate = async function(url, pageType) {
  console.log(`增强导航到: ${url}, 页面类型: ${pageType}`);
  
  try {
    // 显示加载状态
    showLoadingState();
    
    // 加载页面内容
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // 解析HTML并更新内容
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // 检查当前页面布局
    const currentHasSidebar = document.querySelector('.nav-link');
    
    if (currentHasSidebar) {
      // 主布局页面
      const currentMainContent = document.querySelector('#dynamicContent');
      if (currentMainContent) {
        currentMainContent.innerHTML = html;
      } else {
        throw new Error('无法找到动态内容区域');
      }
    } else {
      // 独立页面
      const bodyContent = doc.querySelector('body');
      if (bodyContent) {
        document.body.innerHTML = html;
      } else {
        throw new Error('无法找到页面内容');
      }
    }
    
    // 更新页面标题
    const title = doc.querySelector('title');
    if (title) {
      document.title = title.textContent;
    }
    
    // 更新URL
    window.history.pushState({ page: pageType }, '', url);
    
    // 等待DOM更新
    await window.scriptManager.waitForDOMUpdate();
    
    // 初始化页面脚本
    await window.scriptManager.initializePage(pageType);
    
    console.log(`增强导航成功: ${pageType}`);
    
  } catch (error) {
    console.error('增强导航失败:', error);
    showErrorMessage('页面加载失败，请稍后重试');
    
    // 回退到传统导航
    window.location.href = url;
  } finally {
    hideLoadingState();
  }
};

// 显示加载状态
function showLoadingState() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
  }
}

// 隐藏加载状态
function hideLoadingState() {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) {
    loadingScreen.style.display = 'none';
  }
}

// 显示错误消息
function showErrorMessage(message) {
  if (window.showNotification) {
    window.showNotification(message, 'error');
  } else {
    alert(message);
  }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，初始化动态脚本管理器');
  
  // 初始化系统名称
  if (window.initSystemName) {
    window.initSystemName();
  }
  
  // 初始化主题
  if (window.initDarkMode) {
    window.initDarkMode();
  }
  
  // 初始化个人设置弹窗
  if (typeof initProfileModal === 'function') {
    initProfileModal();
  }
  
  // 初始化注册弹窗
  if (typeof initRegisterModal === 'function') {
    initRegisterModal();
  }
  
  console.log('动态脚本管理器初始化完成');
});

// 导出到全局
window.DynamicScriptManager = DynamicScriptManager;

// 修复后的全局登出函数
window.logout = async function() {
    try {
        const response = await fetch('/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        if (response.ok) {
            // 清除本地token cookie
            document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            window.location.href = '/login';
        } else {
            window.showNotification && window.showNotification('退出登录失败', 'error');
        }
    } catch (e) {
        window.showNotification && window.showNotification('退出登录失败', 'error');
    }
}; 