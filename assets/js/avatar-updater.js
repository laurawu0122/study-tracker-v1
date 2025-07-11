// 防止重复加载
if (window.AvatarUpdater) {
    console.log('AvatarUpdater 已经加载过，跳过重复加载');
} else {
// 全局头像更新管理器
class AvatarUpdater {
  constructor() {
    this.updateCallbacks = new Map();
    this.init();
  }

  init() {
    // 监听头像上传成功事件
    document.addEventListener('avatarUploaded', (event) => {
      const { avatarUrl, userId } = event.detail;
      this.updateAllAvatarDisplays(avatarUrl, userId);
    });

    // 监听头像删除事件
    document.addEventListener('avatarDeleted', (event) => {
      const { userId } = event.detail;
      this.removeAllAvatarDisplays(userId);
    });
  }

  // 注册页面特定的头像更新回调
  registerUpdateCallback(pageId, callback) {
    this.updateCallbacks.set(pageId, callback);
  }

  // 移除页面特定的头像更新回调
  unregisterUpdateCallback(pageId) {
    this.updateCallbacks.delete(pageId);
  }

  // 更新所有头像显示
  updateAllAvatarDisplays(avatarUrl, userId = null) {
    console.log('🔄 开始更新头像显示:', { avatarUrl, userId });

    // 1. 更新侧边栏头像
    this.updateSidebarAvatars(avatarUrl, userId);

    // 2. 更新头部头像
    this.updateHeaderAvatars(avatarUrl, userId);

    // 3. 更新用户列表中的头像
    this.updateUserListAvatars(avatarUrl, userId);

    // 4. 更新兑换记录中的头像
    this.updateExchangeRecordAvatars(avatarUrl, userId);

    // 5. 调用页面特定的更新回调
    this.callPageSpecificCallbacks(avatarUrl, userId);

    console.log('✅ 头像更新完成');
  }

  // 移除所有头像显示（头像被删除时）
  removeAllAvatarDisplays(userId) {
    console.log('🗑️ 开始移除头像显示:', { userId });

    // 1. 移除侧边栏头像
    this.removeSidebarAvatars(userId);

    // 2. 移除头部头像
    this.removeHeaderAvatars(userId);

    // 3. 移除用户列表中的头像
    this.removeUserListAvatars(userId);

    // 4. 移除兑换记录中的头像
    this.removeExchangeRecordAvatars(userId);

    console.log('✅ 头像移除完成');
  }

  // 更新侧边栏头像
  updateSidebarAvatars(avatarUrl, userId) {
    const sidebarAvatars = document.querySelectorAll('.sidebar-avatar, .mobile-sidebar-avatar');
    sidebarAvatars.forEach(avatar => {
      if (userId && avatar.dataset.userId && avatar.dataset.userId !== userId.toString()) {
        return; // 不是目标用户，跳过
      }
      
      if (avatar.tagName === 'IMG') {
        avatar.src = avatarUrl;
      } else {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.className = avatar.className + ' w-full h-full object-cover';
        img.alt = '用户头像';
        avatar.innerHTML = '';
        avatar.appendChild(img);
      }
    });
  }

  // 更新头部头像
  updateHeaderAvatars(avatarUrl, userId) {
    const headerAvatars = document.querySelectorAll('.header-avatar');
    headerAvatars.forEach(avatar => {
      if (userId && avatar.dataset.userId && avatar.dataset.userId !== userId.toString()) {
        return; // 不是目标用户，跳过
      }
      
      if (avatar.tagName === 'IMG') {
        avatar.src = avatarUrl;
      } else {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.className = avatar.className + ' w-full h-full object-cover';
        img.alt = '用户头像';
        avatar.innerHTML = '';
        avatar.appendChild(img);
      }
    });
  }

  // 更新用户列表中的头像
  updateUserListAvatars(avatarUrl, userId) {
    if (!userId) return;

    const userRows = document.querySelectorAll(`tr[data-user-id="${userId}"]`);
    userRows.forEach(row => {
      const avatarContainer = row.querySelector('.flex-shrink-0.h-10.w-10');
      if (avatarContainer) {
        avatarContainer.innerHTML = `
          <img class="h-10 w-10 rounded-full object-cover" 
               src="${avatarUrl}" 
               alt="用户头像" 
               onerror="this.parentElement.innerHTML='<div class=\\'h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center\\'><span class=\\'text-sm font-medium text-gray-700 dark:text-gray-300\\'>${userId}</span></div>'">
        `;
      }
    });
  }

  // 更新兑换记录中的头像
  updateExchangeRecordAvatars(avatarUrl, userId) {
    if (!userId) return;

    // 查找兑换记录中该用户的头像
    const exchangeRows = document.querySelectorAll('tr[data-exchange-id]');
    exchangeRows.forEach(row => {
      const userAvatarContainer = row.querySelector('.flex-shrink-0.h-10.w-10');
      if (userAvatarContainer && row.dataset.userId === userId.toString()) {
        userAvatarContainer.innerHTML = `
          <img class="h-10 w-10 rounded-full object-cover" 
               src="${avatarUrl}" 
               alt="用户头像" 
               onerror="this.parentElement.innerHTML='<div class=\\'h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center\\'><span class=\\'text-sm font-medium text-gray-700 dark:text-gray-300\\'>${userId}</span></div>'">
        `;
      }
    });
  }

  // 移除侧边栏头像
  removeSidebarAvatars(userId) {
    const sidebarAvatars = document.querySelectorAll('.sidebar-avatar, .mobile-sidebar-avatar');
    sidebarAvatars.forEach(avatar => {
      if (userId && avatar.dataset.userId && avatar.dataset.userId !== userId.toString()) {
        return; // 不是目标用户，跳过
      }
      
      if (avatar.tagName === 'IMG') {
        avatar.remove();
        const fallback = document.createElement('div');
        fallback.className = avatar.className + ' flex items-center justify-center';
        fallback.textContent = 'U';
        avatar.parentNode.replaceChild(fallback, avatar);
      }
    });
  }

  // 移除头部头像
  removeHeaderAvatars(userId) {
    const headerAvatars = document.querySelectorAll('.header-avatar');
    headerAvatars.forEach(avatar => {
      if (userId && avatar.dataset.userId && avatar.dataset.userId !== userId.toString()) {
        return; // 不是目标用户，跳过
      }
      
      if (avatar.tagName === 'IMG') {
        avatar.remove();
        const fallback = document.createElement('div');
        fallback.className = avatar.className + ' flex items-center justify-center';
        fallback.textContent = 'U';
        avatar.parentNode.replaceChild(fallback, avatar);
      }
    });
  }

  // 移除用户列表中的头像
  removeUserListAvatars(userId) {
    if (!userId) return;

    const userRows = document.querySelectorAll(`tr[data-user-id="${userId}"]`);
    userRows.forEach(row => {
      const avatarContainer = row.querySelector('.flex-shrink-0.h-10.w-10');
      if (avatarContainer) {
        avatarContainer.innerHTML = `
          <div class="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">U</span>
          </div>
        `;
      }
    });
  }

  // 移除兑换记录中的头像
  removeExchangeRecordAvatars(userId) {
    if (!userId) return;

    const exchangeRows = document.querySelectorAll('tr[data-exchange-id]');
    exchangeRows.forEach(row => {
      const userAvatarContainer = row.querySelector('.flex-shrink-0.h-10.w-10');
      if (userAvatarContainer && row.dataset.userId === userId.toString()) {
        userAvatarContainer.innerHTML = `
          <div class="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">U</span>
          </div>
        `;
      }
    });
  }

  // 调用页面特定的更新回调
  callPageSpecificCallbacks(avatarUrl, userId) {
    this.updateCallbacks.forEach((callback, pageId) => {
      try {
        callback(avatarUrl, userId);
      } catch (error) {
        console.error(`页面 ${pageId} 的头像更新回调执行失败:`, error);
      }
    });
  }

  // 触发头像上传成功事件
  static triggerAvatarUploaded(avatarUrl, userId = null) {
    document.dispatchEvent(new CustomEvent('avatarUploaded', {
      detail: { avatarUrl, userId }
    }));
  }

  // 触发头像删除事件
  static triggerAvatarDeleted(userId) {
    document.dispatchEvent(new CustomEvent('avatarDeleted', {
      detail: { userId }
    }));
  }
}

// 创建全局实例
window.avatarUpdater = new AvatarUpdater();

// 导出类供其他模块使用
window.AvatarUpdater = AvatarUpdater;
} 