// 移动端优化JavaScript

// 检测移动设备
function isMobileDevice() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 检测触摸设备
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// 移动端初始化
function initMobileOptimizations() {
    if (!isMobileDevice()) return;
    
    console.log('初始化移动端优化...');
    
    // 优化触摸交互
    optimizeTouchInteractions();
    
    // 优化滚动性能
    optimizeScrollPerformance();
    
    // 优化图表显示
    optimizeChartDisplay();
    
    // 添加手势支持
    addGestureSupport();
    
    // 优化表单交互
    optimizeFormInteractions();
    
    // 添加移动端特定功能
    addMobileSpecificFeatures();
}

// 优化触摸交互
function optimizeTouchInteractions() {
    // 移除所有hover效果，避免触摸设备上的问题
    const style = document.createElement('style');
    style.textContent = `
        @media (hover: none) and (pointer: coarse) {
            *:hover {
                transform: none !important;
                box-shadow: none !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 为所有按钮添加触摸反馈
    const buttons = document.querySelectorAll('button, .export-btn, .quick-date-btn, .pagination-btn, .page-number-btn');
    buttons.forEach(button => {
        button.addEventListener('touchstart', function(e) {
            this.style.transform = 'scale(0.95)';
            this.style.transition = 'transform 0.1s ease';
        });
        
        button.addEventListener('touchend', function(e) {
            this.style.transform = 'scale(1)';
        });
        
        button.addEventListener('touchcancel', function(e) {
            this.style.transform = 'scale(1)';
        });
    });
}

// 优化滚动性能
function optimizeScrollPerformance() {
    // 为可滚动容器添加硬件加速
    const scrollContainers = document.querySelectorAll('.chart-container, .table-wrapper, .container');
    scrollContainers.forEach(container => {
        container.style.webkitOverflowScrolling = 'touch';
        container.style.overscrollBehavior = 'contain';
        container.style.willChange = 'scroll-position';
    });
    
    // 优化滚动事件
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(function() {
            // 滚动停止后的处理
        }, 100);
    }, { passive: true });
}

// 优化图表显示
function optimizeChartDisplay() {
    // 监听窗口大小变化，重新渲染图表
    let resizeTimeout;
    window.addEventListener('resize', function() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(function() {
            if (window.chartInstance) {
                window.chartInstance.resize();
            }
        }, 250);
    });
    
    // 优化图表容器
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        // 添加触摸滚动提示
        if (container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight) {
            container.classList.add('has-scroll');
        }
    });
}

// 添加手势支持
function addGestureSupport() {
    if (!isTouchDevice()) return;
    
    // 添加滑动切换图表类型
    let startX = 0;
    let startY = 0;
    let isScrolling = false;
    
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isScrolling = false;
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);
        
        if (deltaY > deltaX) {
            isScrolling = true;
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        if (!startX || !startY || isScrolling) {
            startX = startY = 0;
            return;
        }
        
        const deltaX = e.changedTouches[0].clientX - startX;
        const deltaY = e.changedTouches[0].clientY - startY;
        
        // 水平滑动切换图表类型
        if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 30) {
            const chartTypeSelect = document.getElementById('chartTypeSelect');
            if (chartTypeSelect) {
                const options = chartTypeSelect.options;
                const currentIndex = chartTypeSelect.selectedIndex;
                
                if (deltaX > 0) {
                    // 向右滑动，切换到上一个图表类型
                    const newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
                    chartTypeSelect.selectedIndex = newIndex;
                } else {
                    // 向左滑动，切换到下一个图表类型
                    const newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
                    chartTypeSelect.selectedIndex = newIndex;
                }
                
                // 触发change事件
                chartTypeSelect.dispatchEvent(new Event('change'));
            }
        }
        
        startX = startY = 0;
    }, { passive: true });
}

// 优化表单交互
function optimizeFormInteractions() {
    // 防止iOS缩放
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], input[type="date"], select, textarea');
    inputs.forEach(input => {
        input.style.fontSize = '16px';
        
        // 添加焦点优化
        input.addEventListener('focus', function() {
            // 滚动到输入框位置
            setTimeout(() => {
                this.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    });
    
    // 优化文件上传
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.files.length > 0) {
                // 显示文件选择反馈
                const feedback = document.createElement('div');
                feedback.textContent = `已选择: ${this.files[0].name}`;
                feedback.style.cssText = `
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--success-color);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    z-index: 1000;
                    animation: slideDown 0.3s ease;
                `;
                document.body.appendChild(feedback);
                
                setTimeout(() => {
                    feedback.remove();
                }, 2000);
            }
        });
    });
}

// 添加移动端特定功能
function addMobileSpecificFeatures() {
    // 添加下拉刷新功能
    let startY = 0;
    let pullDistance = 0;
    const pullThreshold = 80;
    
    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0) {
            startY = e.touches[0].clientY;
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        if (startY && window.scrollY === 0) {
            pullDistance = e.touches[0].clientY - startY;
            if (pullDistance > 0) {
                e.preventDefault();
                document.body.style.transform = `translateY(${Math.min(pullDistance * 0.5, pullThreshold)}px)`;
            }
        }
    }, { passive: false });
    
    document.addEventListener('touchend', function(e) {
        if (pullDistance > pullThreshold) {
            // 触发刷新
            location.reload();
        }
        document.body.style.transform = '';
        startY = 0;
        pullDistance = 0;
    }, { passive: true });
    
    // 添加长按功能
    let longPressTimer;
    const longPressDelay = 500;
    
    document.addEventListener('touchstart', function(e) {
        const target = e.target;
        if (target.matches('.stat-card, .export-btn')) {
            longPressTimer = setTimeout(() => {
                // 长按反馈
                target.style.transform = 'scale(0.95)';
                target.style.opacity = '0.8';
                
                // 显示操作菜单
                showContextMenu(e, target);
            }, longPressDelay);
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        const target = e.target;
        if (target.matches('.stat-card, .export-btn')) {
            target.style.transform = '';
            target.style.opacity = '';
        }
    }, { passive: true });
    
    document.addEventListener('touchmove', function(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }, { passive: true });
}

// 显示上下文菜单
function showContextMenu(e, target) {
    const menu = document.createElement('div');
    menu.className = 'mobile-context-menu';
    menu.style.cssText = `
        position: fixed;
        top: ${e.touches[0].clientY}px;
        left: ${e.touches[0].clientX}px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 0;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        min-width: 120px;
        transform: translate(-50%, -100%);
    `;
    
    const actions = [
        { text: '复制', action: () => copyToClipboard(target.textContent) },
        { text: '分享', action: () => shareContent(target.textContent) }
    ];
    
    actions.forEach(({ text, action }) => {
        const item = document.createElement('div');
        item.textContent = text;
        item.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        item.addEventListener('click', action);
        item.addEventListener('touchstart', function() {
            this.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        item.addEventListener('touchend', function() {
            this.style.background = '';
        });
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('touchstart', function closeMenu() {
            menu.remove();
            document.removeEventListener('touchstart', closeMenu);
        }, { once: true });
    }, 100);
}

// 复制到剪贴板
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
        });
    } else {
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('已复制到剪贴板');
    }
}

// 分享内容
function shareContent(text) {
    if (navigator.share) {
        navigator.share({
            title: '学习项目分析',
            text: text,
            url: window.location.href
        });
    } else {
        showToast('分享功能不可用');
    }
}

// 显示提示信息
function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    .mobile-context-menu {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
`;
document.head.appendChild(style);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (isMobileDevice()) {
        initMobileOptimizations();
    }
});

// 导出函数供其他脚本使用
window.mobileOptimizations = {
    isMobileDevice,
    isTouchDevice,
    initMobileOptimizations
}; 