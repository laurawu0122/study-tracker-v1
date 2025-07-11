/**
 * 管理员页面事件管理器
 * 处理管理员界面的所有按钮事件
 */
class AdminEventManager {
    constructor(adminApp) {
        this.adminApp = adminApp;
        this.debug = true;
        
        // 注册到全局事件管理器
        if (window.eventManager) {
            window.eventManager.registerPageManager('admin', this);
        }
        
        if (this.debug) {
            console.log('🔧 AdminEventManager 初始化完成');
        }
    }
    
    /**
     * 处理按钮点击事件
     */
    buttonClick(data, event) {
        const { buttonId, element } = data;
        
        if (this.debug) {
            console.log(`🎯 管理员按钮点击: ${buttonId}`);
        }
        
        switch (buttonId) {
            // 数据管理相关
            case 'backupDataBtn':
                this.adminApp.backupData();
                break;
            case 'cleanDataBtn':
                this.adminApp.cleanData();
                break;
            case 'resetDataBtn':
                this.adminApp.resetData();
                break;
            case 'clearBtn':
                this.adminApp.clearTestData();
                break;
            case 'generateBtn':
                // 生成按钮通过表单提交处理
                break;
                
            // 操作日志相关
            case 'searchLogsBtn':
                this.adminApp.searchLogs();
                break;
            case 'clearLogsBtn':
                this.adminApp.clearLogsDisplay();
                break;
                
            // 用户数据查看相关
            case 'searchUserDataBtn':
                this.adminApp.searchUserData();
                break;
            case 'clearUserDataBtn':
                this.adminApp.clearUserDataDisplay();
                break;
                
            // 系统配置相关
            case 'saveAllConfigBtn':
                this.adminApp.saveAllConfig();
                break;
            case 'testConnectionBtn':
                this.adminApp.testSmtpConnection();
                break;
            case 'saveSmtpConfigBtn':
                this.adminApp.saveSmtpConfig();
                break;
                
            // 用户管理相关
            case 'addUserBtn':
                this.adminApp.showUserModal();
                break;
            case 'saveUserBtn':
                this.adminApp.handleUserSubmit(event);
                break;
            case 'closeUserModalBtn':
                this.adminApp.hideUserModal();
                break;
                
            // 成就管理相关
            case 'addAchievementBtn':
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.showAchievementModal();
                } else if (window.achievementManager) {
                    window.achievementManager.showAchievementModal();
                } else {
                    console.error('AchievementManager 实例未找到');
                }
                break;
            case 'addCategoryBtn':
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.showCategoryModal();
                } else if (window.achievementManager) {
                    window.achievementManager.showCategoryModal();
                } else {
                    console.error('AchievementManager 实例未找到');
                }
                break;
            case 'downloadIconsBtn':
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.downloadIcons();
                } else if (window.achievementManager) {
                    window.achievementManager.downloadIcons();
                } else {
                    console.error('AchievementManager 实例未找到');
                }
                break;
                
            // 积分兑换相关
            case 'addProductBtn':
                this.adminApp.openProductModal();
                break;
            case 'exchangeAddCategoryBtn':
                this.adminApp.openCategoryModal();
                break;
                
            // 成就管理相关按钮
            case 'uploadIconBtn':
                // 上传图标按钮 - 由 AchievementManager 处理
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.handleUploadIconClick();
                } else if (window.achievementManager) {
                    window.achievementManager.handleUploadIconClick();
                }
                break;
                
            case 'iconPickerBtn':
                // 图标选择器按钮 - 由 AchievementManager 处理
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.showIconPicker();
                } else if (window.achievementManager) {
                    window.achievementManager.showIconPicker();
                }
                break;
                
            default:
                if (this.debug) {
                    console.warn(`⚠️ 未处理的按钮ID: ${buttonId}`);
                }
        }
    }
    
    /**
     * 处理表单提交事件
     */
    formSubmit(data, event) {
        const { formId, form } = data;
        
        if (this.debug) {
            console.log(`📝 管理员表单提交: ${formId}`);
        }
        
        switch (formId) {
            case 'testDataForm':
                event.preventDefault();
                event.stopPropagation();
                this.adminApp.generateTestData();
                return false;
                
            case 'userForm':
                event.preventDefault();
                this.adminApp.handleUserSubmit(event);
                break;
                
            case 'achievementForm':
                event.preventDefault();
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.saveAchievement();
                } else if (window.achievementManager) {
                    window.achievementManager.saveAchievement();
                } else {
                    console.error('AchievementManager 实例未找到');
                }
                break;
                
            case 'categoryForm':
                event.preventDefault();
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.saveCategory();
                } else if (window.achievementManager) {
                    window.achievementManager.saveCategory();
                } else {
                    console.error('AchievementManager 实例未找到');
                }
                break;
                
            case 'productForm':
                event.preventDefault();
                this.adminApp.saveProduct();
                break;
                
            case 'smtpConfigForm':
                event.preventDefault();
                this.adminApp.saveSmtpConfig();
                break;
                
            default:
                if (this.debug) {
                    console.warn(`⚠️ 未处理的表单ID: ${formId}`);
                }
        }
    }
    
    /**
     * 处理输入变化事件
     */
    inputChange(data, event) {
        const { elementId, elementType, element } = data;
        
        if (this.debug) {
            console.log(`🔄 管理员输入变化: ${elementId} (${elementType})`);
        }
        
        switch (elementId) {
            case 'dataTypeSelect':
                this.adminApp.switchDataType();
                break;
                
            case 'achievementTriggerType':
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.updateTriggerConfig(element.value);
                } else if (window.achievementManager) {
                    window.achievementManager.updateTriggerConfig(element.value);
                } else {
                    console.error('AchievementManager 实例未找到');
                }
                break;
                
            case 'achievementIcon':
                if (window.AchievementManager && window.AchievementManager.instance) {
                    window.AchievementManager.instance.updateIconPreview(element.value);
                } else if (window.achievementManager) {
                    window.achievementManager.updateIconPreview(element.value);
                } else {
                    console.error('AchievementManager 实例未找到');
                }
                break;
                
            case 'smtpProvider':
                this.adminApp.updateSmtpProvider(element.value);
                break;
                
            default:
                if (this.debug) {
                    console.warn(`⚠️ 未处理的输入ID: ${elementId}`);
                }
        }
    }
    
    /**
     * 处理标签页切换
     */
    switchTab(data, event) {
        const { tab } = data;
        
        if (this.debug) {
            console.log(`📑 管理员标签页切换: ${tab}`);
        }
        
        this.adminApp.switchTab(tab);
    }
    
    /**
     * 处理 data-action 事件
     */
    executeAction(action, data, event) {
        if (this.debug) {
            console.log(`🎯 管理员动作执行: ${action}`, data);
        }
        
        switch (action) {
            // 测试数据管理
            case 'generate-test-data':
                // 通过表单提交处理
                break;
            case 'clear-test-data':
                this.adminApp.clearTestData();
                break;
                
            // 数据管理
            case 'backup-data':
                this.adminApp.backupData();
                break;
            case 'clean-data':
                this.adminApp.cleanData();
                break;
            case 'reset-data':
                this.adminApp.resetData();
                break;
                
            // 兑换审批
            case 'approve':
                const exchangeId = data.exchangeId;
                const isApproved = data.approve === 'true';
                this.adminApp.approveExchangeRecord(exchangeId, isApproved);
                break;
                
            case 'view':
                this.adminApp.viewExchangeDetails(data.exchangeId);
                break;
                
            case 'delete':
                this.adminApp.deleteExchangeRecord(data.exchangeId);
                break;
                
            // 用户管理
            case 'edit':
                this.adminApp.editUser(data.userId);
                break;
                
            case 'toggle':
                this.adminApp.toggleUserStatus(data.userId);
                break;
                
            case 'delete-user':
                this.adminApp.deleteUser(data.userId);
                break;
                
            // 成就管理
            case 'edit-achievement':
                this.adminApp.editAchievement(data.achievementId);
                break;
                
            case 'delete-achievement':
                this.adminApp.deleteAchievement(data.achievementId);
                break;
                
            case 'edit-category':
                this.adminApp.editCategory(data.categoryId);
                break;
                
            case 'delete-category':
                this.adminApp.deleteCategory(data.categoryId);
                break;
                
            // 积分兑换管理
            case 'edit-product':
                this.adminApp.editProduct(data.productId);
                break;
                
            case 'delete-product':
                this.adminApp.deleteProduct(data.productId);
                break;
                
            case 'show-category-form':
                this.adminApp.showCategoryForm();
                break;
                
            case 'show-rule-form':
                this.adminApp.showRuleForm();
                break;
                
            case 'save-category':
                this.adminApp.saveCategory();
                break;
                
            case 'save-rule':
                this.adminApp.saveRule();
                break;
                
            case 'close-category-modal':
                this.adminApp.closeCategoryModal();
                break;
                
            case 'close-rules-modal':
                this.adminApp.closeRulesModal();
                break;
                
            default:
                if (this.debug) {
                    console.warn(`⚠️ 未处理的动作: ${action}`);
                }
        }
    }
    
    /**
     * 设置调试模式
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`🔧 AdminEventManager 调试模式: ${enabled ? '开启' : '关闭'}`);
    }
}

// 导出给模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminEventManager;
} 