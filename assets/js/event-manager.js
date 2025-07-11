/**
 * 统一事件管理器
 * 管理整个项目中所有按钮的事件绑定，避免冲突和重复绑定
 */
class EventManager {
    constructor() {
        this.listeners = new Map();
        this.delegatedListeners = new Map();
        this.pageManagers = new Map();
        this.debug = true; // 开发环境调试开关
        
        // 初始化全局事件委托
        this.initGlobalDelegation();
        
        if (this.debug) {
            console.log('🎯 EventManager 初始化完成');
        }
    }
    
    /**
     * 初始化全局事件委托
     */
    initGlobalDelegation() {
        // 全局点击事件委托
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });
        
        // 全局表单提交事件委托
        document.addEventListener('submit', (e) => {
            this.handleGlobalSubmit(e);
        });
        
        // 全局输入变化事件委托
        document.addEventListener('change', (e) => {
            this.handleGlobalChange(e);
        });
        
        if (this.debug) {
            console.log('🌐 全局事件委托已初始化');
        }
    }
    
    /**
     * 处理全局点击事件
     */
    handleGlobalClick(e) {
        const target = e.target;
        
        // 检查是否有 data-action 属性
        const actionButton = target.closest('[data-action]');
        if (actionButton) {
            const action = actionButton.getAttribute('data-action');
            const data = this.extractDataAttributes(actionButton);
            
            if (this.debug) {
                console.log(`🎯 全局点击事件: ${action}`, data);
            }
            
            this.executeAction(action, data, e);
            return;
        }
        
        // 检查是否有特定的类名
        if (target.classList.contains('tab-btn')) {
            const tab = target.dataset.tab;
            if (tab) {
                this.executeAction('switchTab', { tab }, e);
                return;
            }
        }
        
        // 检查是否有特定的ID
        const buttonId = target.id || target.closest('[id]')?.id;
        if (buttonId) {
            this.executeAction('buttonClick', { buttonId, element: target }, e);
        }
    }
    
    /**
     * 处理全局表单提交事件
     */
    handleGlobalSubmit(e) {
        const form = e.target;
        const formId = form.id;
        
        if (this.debug) {
            console.log(`📝 全局表单提交: ${formId}`);
        }
        
        this.executeAction('formSubmit', { formId, form }, e);
    }
    
    /**
     * 处理全局输入变化事件
     */
    handleGlobalChange(e) {
        const element = e.target;
        const elementId = element.id;
        const elementType = element.type || element.tagName.toLowerCase();
        
        if (this.debug) {
            console.log(`🔄 全局输入变化: ${elementId} (${elementType})`);
        }
        
        this.executeAction('inputChange', { elementId, elementType, element }, e);
    }
    
    /**
     * 执行动作
     */
    executeAction(action, data, event) {
        // 查找对应的页面管理器
        const currentPage = this.getCurrentPage();
        const pageManager = this.pageManagers.get(currentPage);
        
        if (pageManager && typeof pageManager[action] === 'function') {
            try {
                pageManager[action](data, event);
            } catch (error) {
                console.error(`❌ 执行动作 ${action} 时出错:`, error);
            }
        } else {
            if (this.debug) {
                console.warn(`⚠️ 未找到动作处理器: ${action} (页面: ${currentPage})`);
            }
        }
    }
    
    /**
     * 获取当前页面标识
     */
    getCurrentPage() {
        // 从 body 的 data-page 属性获取
        const pageAttr = document.body.getAttribute('data-page');
        if (pageAttr) return pageAttr;
        
        // 从 URL 路径推断
        const path = window.location.pathname;
        if (path.includes('/admin')) return 'admin';
        if (path.includes('/projects')) return 'projects';
        if (path.includes('/sessions')) return 'sessions';
        if (path.includes('/dashboard')) return 'dashboard';
        if (path.includes('/notifications')) return 'notifications';
        if (path.includes('/achievements')) return 'achievements';
        if (path.includes('/points')) return 'points';
        if (path.includes('/analytics')) return 'analytics';
        
        return 'home';
    }
    
    /**
     * 注册页面管理器
     */
    registerPageManager(pageName, manager) {
        this.pageManagers.set(pageName, manager);
        
        if (this.debug) {
            console.log(`📋 注册页面管理器: ${pageName}`);
        }
    }
    
    /**
     * 绑定元素事件（传统方式，用于特殊情况）
     */
    bind(elementId, eventType, handler, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            if (this.debug) {
                console.warn(`⚠️ 元素 ${elementId} 未找到，无法绑定事件`);
            }
            return false;
        }
        
        const key = `${elementId}_${eventType}`;
        
        // 如果已经绑定过，先移除旧的事件监听器
        if (this.listeners.has(key)) {
            const oldHandler = this.listeners.get(key);
            element.removeEventListener(eventType, oldHandler);
            if (this.debug) {
                console.log(`🔄 移除旧的事件监听器: ${elementId} -> ${eventType}`);
            }
        }
        
        // 绑定新的事件监听器
        element.addEventListener(eventType, handler, options);
        this.listeners.set(key, handler);
        
        if (this.debug) {
            console.log(`✅ 事件绑定成功: ${elementId} -> ${eventType}`);
        }
        return true;
    }
    
    /**
     * 移除事件监听器
     */
    unbind(elementId, eventType) {
        const key = `${elementId}_${eventType}`;
        const element = document.getElementById(elementId);
        
        if (this.listeners.has(key) && element) {
            const handler = this.listeners.get(key);
            element.removeEventListener(eventType, handler);
            this.listeners.delete(key);
            
            if (this.debug) {
                console.log(`🗑️ 事件移除成功: ${elementId} -> ${eventType}`);
            }
            return true;
        }
        
        return false;
    }
    
    /**
     * 清除所有事件监听器
     */
    clear() {
        this.listeners.forEach((handler, key) => {
            const [elementId, eventType] = key.split('_');
            const element = document.getElementById(elementId);
            if (element) {
                element.removeEventListener(eventType, handler);
            }
        });
        this.listeners.clear();
        
        if (this.debug) {
            console.log('🧹 所有事件监听器已清除');
        }
    }
    
    /**
     * 提取数据属性
     */
    extractDataAttributes(element) {
        const data = {};
        const attributes = element.attributes;
        
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            if (attr.name.startsWith('data-')) {
                const key = attr.name.replace('data-', '');
                data[key] = attr.value;
            }
        }
        
        return data;
    }
    
    /**
     * 设置调试模式
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`🔧 事件管理器调试模式: ${enabled ? '开启' : '关闭'}`);
    }
    
    /**
     * 获取事件统计信息
     */
    getStats() {
        return {
            listeners: this.listeners.size,
            delegatedListeners: this.delegatedListeners.size,
            pageManagers: this.pageManagers.size,
            currentPage: this.getCurrentPage()
        };
    }
}

// 创建全局事件管理器实例
window.eventManager = new EventManager();

// 导出给模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventManager;
} 