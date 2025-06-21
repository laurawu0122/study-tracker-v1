// 全局变量
let tableData = [];
let confirmedData = []; // 存储已确认的数据
let entryDateTime = new Date(); // 记录录入时间
let editingIndex = -1; // 当前编辑的数据索引，-1表示不是编辑模式
let mainChart = null; // 主图表实例
let currentTimeFilter = 7; // 当前时间筛选（默认7天）
let currentProjectFilter = ''; // 当前项目筛选
let currentChartType = 'trend'; // 当前图表类型

// 日历相关变量
let currentDate = new Date();
let calendarData = new Map(); // 存储日期对应的数据

// 项目配置管理相关变量
let projectConfigs = []; // 存储项目配置
let editingProjectIndex = -1; // 当前编辑的项目索引

// 分页和查询功能
let currentPage = 1;
let pageSize = 10;
let filteredData = [];
let queryFilters = {
    startDate: '',
    endDate: '',
    project: ''
};

// 添加表格行函数
function addRow() {
    addTableRow();
}

// 清空所有数据函数
function clearAllData() {
    if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
        // 清空表格数据
        tableData = [];
        confirmedData = [];
        
        // 清空表格
        const tbody = document.querySelector('#dataTable tbody');
        tbody.innerHTML = '';
        
        // 添加一个空行
        addTableRow();
        
        // 清空已确认数据表格
        updateConfirmedDataTable();
        
        // 清空移动端卡片
        const mobileCards = document.getElementById('mobileDataCards');
        if (mobileCards) {
            mobileCards.innerHTML = '';
        }
        
        // 清空日历数据
        calendarData.clear();
        updateCalendar();
        
        // 保存空数据
        saveConfirmedData();
        
        // 更新图表
        updateCharts();
        
        alert('所有数据已清空');
    }
}

// 页面加载时检查登录状态
document.addEventListener('DOMContentLoaded', function() {
    console.log('编辑器页面加载完成');
    
    // 记录页面加载时的录入时间
    entryDateTime = new Date();
    
    // 检查登录状态
    if (!checkLoginStatus()) {
        // 未登录，重定向到主页
        window.location.href = 'index.html';
        return;
    }
    
    // 加载项目配置（必须在初始化表格之前）
    loadProjectConfigs();
    
    // 初始化表格
    initTable();
    
    // 初始化事件监听
    initEventListeners();
    
    // 恢复已确认的数据
    loadConfirmedData();
    
    // 初始化图表
    initCharts();
    
    // 初始化图表筛选事件
    initChartFilters();
    
    // 初始化图表滚动监听器
    initChartScrollListener();
    
    // 确保统计信息正确显示
    updateCharts();
    
    // 初始化日历
    initCalendar();
    
    // 设置默认视图（PC端表格，移动端日历）
    setDefaultView();
    
    // 在数据更新后也要更新日历
    const originalUpdateConfirmedDataTable = updateConfirmedDataTable;
    updateConfirmedDataTable = function() {
        originalUpdateConfirmedDataTable();
        updateCalendarData();
    };
    
    console.log('编辑器初始化完成');
    
    // 确保项目名称选择器正确显示已配置的项目
    setTimeout(() => {
        updateAllProjectSelectors();
    }, 100);
    
    // 初始化分页和查询功能
    initPaginationAndQuery();
    
    // 在数据加载完成后更新显示
    setTimeout(() => {
        updateConfirmedDataTable();
    }, 100);
});

// 检查登录状态
function checkLoginStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        console.log('用户已登录:', JSON.parse(savedUser).username);
        return true;
    } else {
        console.log('用户未登录，重定向到主页');
        return false;
    }
}

// 初始化事件监听
function initEventListeners() {
    // 保存表格按钮
    document.getElementById('saveTable').addEventListener('click', function() {
        saveTableData();
    });
    
    // 导出Excel按钮
    document.getElementById('exportExcel').addEventListener('click', function() {
        exportToExcel();
    });
    
    // 添加行按钮
    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', function() {
            console.log('添加行按钮被点击');
            addRow();
        });
    }
    
    // 清空数据按钮
    const clearDataBtn = document.getElementById('clearDataBtn');
    if (clearDataBtn) {
        clearDataBtn.addEventListener('click', function() {
            console.log('清空数据按钮被点击');
            clearAllData();
        });
    }
    
    // 项目配置按钮
    const projectConfigBtn = document.getElementById('projectConfigBtn');
    if (projectConfigBtn) {
        projectConfigBtn.addEventListener('click', function() {
            console.log('项目配置按钮被点击');
            openProjectConfig();
        });
    }
    
    // 项目配置弹窗相关按钮
    const closeProjectConfigBtn = document.getElementById('closeProjectConfig');
    if (closeProjectConfigBtn) {
        closeProjectConfigBtn.addEventListener('click', function() {
            closeProjectConfig();
        });
    }
    
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', function() {
            console.log('添加项目按钮被点击');
            addProjectConfig();
        });
    }
    
    // 添加项目弹窗相关按钮
    const closeAddProject = document.getElementById('closeAddProject');
    if (closeAddProject) {
        closeAddProject.addEventListener('click', function() {
            closeAddProjectModal();
        });
    }
    
    const cancelAddProject = document.getElementById('cancelAddProject');
    if (cancelAddProject) {
        cancelAddProject.addEventListener('click', function() {
            closeAddProjectModal();
        });
    }
    
    const saveProjectBtn = document.getElementById('saveProjectBtn');
    if (saveProjectBtn) {
        saveProjectBtn.addEventListener('click', function() {
            console.log('保存项目按钮被点击');
            saveProjectConfig();
        });
    }
    
    // 编辑项目弹窗相关按钮
    const closeEditProject = document.getElementById('closeEditProject');
    if (closeEditProject) {
        closeEditProject.addEventListener('click', function() {
            closeEditProjectModal();
        });
    }
    
    const cancelEditProject = document.getElementById('cancelEditProject');
    if (cancelEditProject) {
        cancelEditProject.addEventListener('click', function() {
            closeEditProjectModal();
        });
    }
    
    const updateProjectBtn = document.getElementById('updateProjectBtn');
    if (updateProjectBtn) {
        updateProjectBtn.addEventListener('click', function() {
            console.log('更新项目按钮被点击');
            updateProjectConfig();
        });
    }
    
    // 初始化表情选择器事件
    initEmojiSelectors();
    
    // 其他事件监听器...
    initModalEvents();
    
    // 日历相关事件
    initCalendarEvents();
    
    // 表格视图切换
    const toggleTableViewBtn = document.getElementById('toggleTableView');
    if (toggleTableViewBtn) {
        toggleTableViewBtn.addEventListener('click', function() {
            toggleTableView();
        });
    }
    
    // 图表类型选择
    const chartTypeSelect = document.getElementById('chartTypeSelect');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', function() {
            updateChartType();
        });
    }
    
    // 时间筛选按钮
    const timeFilterBtns = document.querySelectorAll('.time-filter-btn');
    timeFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除其他按钮的active类
            timeFilterBtns.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的active类
            this.classList.add('active');
            
            // 更新当前时间筛选
            currentTimeFilter = parseInt(this.getAttribute('data-days'));
            updateCharts();
        });
    });
    
    // 项目筛选
    const chartProjectSelect = document.getElementById('chartProjectSelect');
    if (chartProjectSelect) {
        chartProjectSelect.addEventListener('change', function() {
            currentProjectFilter = this.value;
            updateCharts();
        });
    }
}

// 初始化表情选择器事件
function initEmojiSelectors() {
    // 添加项目弹窗中的表情选择器
    const excellentEmojiSelect = document.getElementById('excellentEmojiSelect');
    const goodEmojiSelect = document.getElementById('goodEmojiSelect');
    const poorEmojiSelect = document.getElementById('poorEmojiSelect');
    
    if (excellentEmojiSelect) {
        excellentEmojiSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('excellentEmoji').value = this.value;
            }
        });
        
        // 移动端特殊处理
        if (window.innerWidth <= 768) {
            excellentEmojiSelect.addEventListener('focus', function() {
                // 确保下拉框在移动端正确显示
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    }
    
    if (goodEmojiSelect) {
        goodEmojiSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('goodEmoji').value = this.value;
            }
        });
        
        // 移动端特殊处理
        if (window.innerWidth <= 768) {
            goodEmojiSelect.addEventListener('focus', function() {
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    }
    
    if (poorEmojiSelect) {
        poorEmojiSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('poorEmoji').value = this.value;
            }
        });
        
        // 移动端特殊处理
        if (window.innerWidth <= 768) {
            poorEmojiSelect.addEventListener('focus', function() {
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    }
    
    // 编辑项目弹窗中的表情选择器
    const editExcellentEmojiSelect = document.getElementById('editExcellentEmojiSelect');
    const editGoodEmojiSelect = document.getElementById('editGoodEmojiSelect');
    const editPoorEmojiSelect = document.getElementById('editPoorEmojiSelect');
    
    if (editExcellentEmojiSelect) {
        editExcellentEmojiSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('editExcellentEmoji').value = this.value;
            }
        });
        
        // 移动端特殊处理
        if (window.innerWidth <= 768) {
            editExcellentEmojiSelect.addEventListener('focus', function() {
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    }
    
    if (editGoodEmojiSelect) {
        editGoodEmojiSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('editGoodEmoji').value = this.value;
            }
        });
        
        // 移动端特殊处理
        if (window.innerWidth <= 768) {
            editGoodEmojiSelect.addEventListener('focus', function() {
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    }
    
    if (editPoorEmojiSelect) {
        editPoorEmojiSelect.addEventListener('change', function() {
            if (this.value) {
                document.getElementById('editPoorEmoji').value = this.value;
            }
        });
        
        // 移动端特殊处理
        if (window.innerWidth <= 768) {
            editPoorEmojiSelect.addEventListener('focus', function() {
                setTimeout(() => {
                    this.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            });
        }
    }
    
    // 监听窗口大小变化，重新初始化移动端处理
    window.addEventListener('resize', function() {
        // 延迟执行，确保窗口大小改变完成
        setTimeout(() => {
            initEmojiSelectors();
        }, 100);
    });
}

// 初始化表格
function initTable() {
    console.log('初始化表格');
    
    // 清空表格
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';
    
    // 添加一个空行
    addTableRow();
    
    // 清空移动端卡片
    const mobileCards = document.getElementById('mobileDataCards');
    if (mobileCards) {
        mobileCards.innerHTML = '';
    }
}

// 添加表格行
function addTableRow(data = null) {
    console.log('添加表格行，数据:', data);
    console.log('当前项目配置:', projectConfigs);
    
    const tbody = document.querySelector('#dataTable tbody');
    const mobileContainer = document.getElementById('mobileDataCards');
    
    const row = tbody.insertRow();
    row.className = 'data-row';
    
    // 添加输入单元格
    const columns = [
        { name: '日期', type: 'date' },
        { name: '学习项目名称', type: 'text' },
        { name: '项目开始时间', type: 'datetime-local' },
        { name: '项目结束时间', type: 'datetime-local' },
        { name: '项目完成时间', type: 'text' }
    ];
    
    columns.forEach(column => {
        const cell = row.insertCell();
        
        if (column.name === '学习项目名称') {
            // 创建下拉选择器
            const select = document.createElement('select');
            select.className = 'table-input';
            select.name = column.name;
            
            // 添加默认选项
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '请选择学习项目';
            select.appendChild(defaultOption);
            
            // 从项目配置中添加选项
            if (projectConfigs && projectConfigs.length > 0) {
                projectConfigs.forEach(config => {
                    const option = document.createElement('option');
                    option.value = config.name;
                    option.textContent = config.name;
                    select.appendChild(option);
                });
            } else {
                console.warn('项目配置为空，无法创建项目选择器选项');
            }
            
            // 如果有数据，设置选中值
            if (data && data[column.name]) {
                select.value = data[column.name];
            }
            
            cell.appendChild(select);
        } else {
            // 其他字段使用原来的输入框
            const input = document.createElement('input');
            input.type = column.type;
            input.className = 'table-input';
            input.name = column.name;
            
            if (column.name === '项目完成时间') {
                input.readOnly = true;
                input.placeholder = '自动计算';
            }
            
            if (data && data[column.name]) {
                input.value = data[column.name];
            }
            
            // 添加事件监听器
            if (column.name === '项目开始时间' || column.name === '项目结束时间') {
                input.addEventListener('change', () => {
                    console.log('时间输入变化，触发计算:', column.name);
                    calculateCompletionTime(row);
                });
                input.addEventListener('input', () => {
                    console.log('时间输入中，触发计算:', column.name);
                    calculateCompletionTime(row);
                });
            }
            
            // 为日期时间输入框添加焦点事件，修复移动端滚动时的弹窗定位
            if (column.type === 'date' || column.type === 'datetime-local') {
                // 在移动端，使用自定义的日期选择器
                if (window.innerWidth <= 768) {
                    input.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        showCustomDatePicker(this, column.type);
                    });
                    
                    // 禁用原生日期选择器
                    input.addEventListener('focus', function(e) {
                        e.preventDefault();
                        this.blur();
                    });
                    
                    // 防止双击选中文本
                    input.addEventListener('select', function(e) {
                        e.preventDefault();
                    });
                } else {
                    // 桌面端使用原生日期选择器
                    input.addEventListener('focus', function() {
                        // 延迟执行，确保弹窗已经显示
                        setTimeout(() => {
                            fixDatePickerPosition(this);
                        }, 100);
                    });
                }
            }
            
            cell.appendChild(input);
        }
    });
    
    // 添加操作按钮单元格
    const actionCell = row.insertCell();
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '确认';
    confirmBtn.className = 'confirm-btn';
    confirmBtn.onclick = function() {
        confirmRowData(row);
    };
    
    actionButtons.appendChild(confirmBtn);
    actionCell.appendChild(actionButtons);
    
    // 创建移动端卡片
    if (mobileContainer) {
        const cardData = data || {
            '日期': '',
            '学习项目名称': '',
            '项目开始时间': '',
            '项目结束时间': '',
            '项目完成时间': ''
        };
        const card = createMobileInputCard(cardData, tbody.rows.length - 1);
        card.dataset.rowIndex = tbody.rows.length - 1;
        mobileContainer.appendChild(card);
    }
    
    return row;
}

// 确认行数据
function confirmRowData(row) {
    const inputs = row.querySelectorAll('input');
    const selects = row.querySelectorAll('select');
    
    // 重新计算项目完成时间
    calculateCompletionTime(row);
    
    const rowData = {
        "日期": inputs[0].value,
        "学习项目名称": selects[0].value, // 使用select的值
        "项目开始时间": inputs[1].value,
        "项目结束时间": inputs[2].value,
        "项目完成时间": inputs[3].value
    };
    
    // 验证必填字段
    if (!rowData["日期"] || !rowData["学习项目名称"] || !rowData["项目开始时间"] || !rowData["项目结束时间"]) {
        alert('请填写完整的日期、项目名称、开始时间和结束时间');
        return;
    }
    
    // 验证项目完成时间是否已计算
    if (!rowData["项目完成时间"]) {
        alert('请确保项目结束时间晚于项目开始时间');
        return;
    }
    
    // 验证项目开始时间和结束时间不能超过录入时间
    const startTime = new Date(rowData["项目开始时间"]);
    const endTime = new Date(rowData["项目结束时间"]);
    
    if (startTime > entryDateTime) {
        alert('项目开始时间不能超过录入时间，请检查时间设置');
        return;
    }
    
    if (endTime > entryDateTime) {
        alert('项目结束时间不能超过录入时间，请检查时间设置');
        return;
    }
    
    // 添加到已确认数据
    confirmedData.push(rowData);
    console.log('confirmRowData: 添加新数据，当前confirmedData长度:', confirmedData.length);
    
    // 更新已确认数据表格
    updateConfirmedDataTable();
    
    // 保存到localStorage
    saveConfirmedData();
    
    // 更新图表和项目选择器
    updateCharts();
    
    // 删除当前输入行
    row.remove();
    
    // 如果输入表格为空，添加一个新的空行
    const tableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
    if (tableBody.rows.length === 0) {
        addTableRow();
    }
}

// 更新已确认数据表格
function updateConfirmedDataTable() {
    // 重新过滤数据
    filterData();
    
    // 确保当前页有效
    const totalPages = getTotalPages();
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    
    // 更新显示
    updatePagination();
    renderCurrentPage();
    updateQuerySummary();
}

// 创建移动端输入卡片（包含下拉选择器）
function createMobileInputCard(data, rowIndex) {
    const card = document.createElement('div');
    card.className = 'mobile-data-card';
    
    // 创建下拉选择器的选项
    let projectOptions = '<option value="">请选择学习项目</option>';
    projectConfigs.forEach(config => {
        const selected = data['学习项目名称'] === config.name ? 'selected' : '';
        projectOptions += `<option value="${config.name}" ${selected}>${config.name}</option>`;
    });
    
    card.innerHTML = `
        <div class="mobile-data-content">
            <div class="mobile-data-row">
                <span class="mobile-data-label">日期:</span>
                <input type="date" class="mobile-data-input" value="${data['日期'] || ''}" data-field="日期">
            </div>
            <div class="mobile-data-row">
                <span class="mobile-data-label">项目名称:</span>
                <select class="mobile-data-input" data-field="学习项目名称">
                    ${projectOptions}
                </select>
            </div>
            <div class="mobile-data-row">
                <span class="mobile-data-label">开始时间:</span>
                <input type="datetime-local" class="mobile-data-input" value="${data['项目开始时间'] || ''}" data-field="项目开始时间">
            </div>
            <div class="mobile-data-row">
                <span class="mobile-data-label">结束时间:</span>
                <input type="datetime-local" class="mobile-data-input" value="${data['项目结束时间'] || ''}" data-field="项目结束时间">
            </div>
            <div class="mobile-data-row">
                <span class="mobile-data-label">完成时间:</span>
                <input type="text" class="mobile-data-input" value="${data['项目完成时间'] || ''}" data-field="项目完成时间" readonly placeholder="自动计算">
            </div>
            <div class="mobile-data-actions">
                <button class="mobile-action-btn mobile-confirm-btn" data-row-index="${rowIndex}">确认</button>
            </div>
        </div>
    `;
    
    // 添加事件监听器
    const inputs = card.querySelectorAll('input');
    const selects = card.querySelectorAll('select');
    const confirmBtn = card.querySelector('.mobile-confirm-btn');
    
    // 为日期时间输入框添加自定义日期选择器
    inputs.forEach(input => {
        if (input.type === 'date' || input.type === 'datetime-local') {
            if (window.innerWidth <= 768) {
                input.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    showCustomDatePicker(this, this.type);
                });
                
                input.addEventListener('focus', function(e) {
                    e.preventDefault();
                    this.blur();
                });
                
                input.addEventListener('select', function(e) {
                    e.preventDefault();
                });
            }
        }
        
        // 为开始时间和结束时间添加计算完成时间的事件
        if (input.dataset.field === '项目开始时间' || input.dataset.field === '项目结束时间') {
            input.addEventListener('change', function() {
                calculateMobileCompletionTime(card);
            });
        }
    });
    
    // 确认按钮事件
    confirmBtn.addEventListener('click', function() {
        const tableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
        const row = tableBody.rows[rowIndex];
        if (row) {
            confirmRowData(row);
        }
    });
    
    return card;
}

// 计算移动端卡片中的项目完成时间
function calculateMobileCompletionTime(card) {
    const inputs = card.querySelectorAll('input');
    const startTimeInput = Array.from(inputs).find(input => input.dataset.field === '项目开始时间');
    const endTimeInput = Array.from(inputs).find(input => input.dataset.field === '项目结束时间');
    const completionTimeInput = Array.from(inputs).find(input => input.dataset.field === '项目完成时间');
    
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    
    if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (end > start) {
            const diffMs = end - start;
            const diffMinutes = Math.round(diffMs / (1000 * 60));
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            
            let timeString = '';
            if (hours > 0) {
                timeString += `${hours}小时`;
            }
            if (minutes > 0 || hours === 0) {
                timeString += `${minutes}分钟`;
            }
            
            completionTimeInput.value = timeString;
        } else {
            completionTimeInput.value = '';
        }
    } else {
        completionTimeInput.value = '';
    }
}

// 创建移动端数据卡片
function createMobileDataCard(data, index, isConfirmed = false) {
    const card = document.createElement('div');
    card.className = 'mobile-data-card';
    
    const projectName = data['学习项目名称'] || '未命名项目';
    const date = data['日期'] || '未知日期';
    const completionTime = data['项目完成时间'] || '-';
    
    // 更紧凑的布局：项目名称、日期、完成时间在一行，操作按钮在右侧
    card.innerHTML = `
        <div class="mobile-data-compact">
            <div class="mobile-data-main">
                <div class="mobile-data-title">${projectName}</div>
                <div class="mobile-data-info">
                    <span class="mobile-data-date">${date}</span>
                    <span class="mobile-data-time">${completionTime}</span>
                </div>
            </div>
            <div class="mobile-data-actions-compact">
                ${isConfirmed ? 
                    `<button class="mobile-action-btn-compact mobile-edit-btn" data-index="${index}" title="编辑">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.5-.5V9h-.5a.5.5 0 0 1-.5-.5V8h-.5a.5.5 0 0 1-.5-.5V7h-.5a.5.5 0 0 1-.5-.5V6H1a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H1v1h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H1v1h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H1a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-13z"/>
                        </svg>
                    </button>
                    <button class="mobile-action-btn-compact mobile-delete-btn" data-index="${index}" title="删除">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>` :
                    `<button class="mobile-action-btn-compact mobile-confirm-btn" data-row-index="${index}" title="确认">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                        </svg>
                    </button>
                    <button class="mobile-action-btn-compact mobile-delete-btn" data-row-index="${index}" title="删除">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>`
                }
            </div>
        </div>
    `;
    
    // 添加事件监听器
    const editBtn = card.querySelector('.mobile-edit-btn');
    const deleteBtn = card.querySelector('.mobile-delete-btn');
    const confirmBtn = card.querySelector('.mobile-confirm-btn');
    
    if (editBtn) {
        editBtn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            editConfirmedData(index);
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            if (isConfirmed) {
                deleteConfirmedData(index);
            } else {
                const rowIndex = parseInt(this.dataset.rowIndex);
                const tableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
                const row = tableBody.rows[rowIndex];
                if (row) {
                    deleteRow(row);
                }
            }
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const rowIndex = parseInt(this.dataset.rowIndex);
            const tableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
            const row = tableBody.rows[rowIndex];
            if (row) {
                confirmRowData(row);
            }
        });
    }
    
    return card;
}

// 格式化时间显示
function formatTimeDisplay(timeString) {
    if (!timeString) return '';
    
    try {
        // 如果是ISO格式的时间字符串，提取时间部分
        if (timeString.includes('T')) {
            const timePart = timeString.split('T')[1];
            // 只显示小时和分钟 (HH:MM)
            return timePart.substring(0, 5);
        }
        
        // 如果是其他格式，尝试解析
        const date = new Date(timeString);
        if (!isNaN(date.getTime())) {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        }
        
        return timeString;
    } catch (error) {
        console.error('时间格式化错误:', error);
        return timeString;
    }
}

// 编辑已确认数据
function editConfirmedData(index) {
    console.log('=== editConfirmedData被调用 ===');
    console.log('传入的index:', index);
    console.log('filteredData长度:', filteredData.length);
    console.log('filteredData:', filteredData);
    console.log('confirmedData长度:', confirmedData.length);
    
    // 使用filteredData而不是confirmedData
    const data = filteredData[index];
    console.log('获取到的数据:', data);
    
    if (!data) {
        console.error('无法获取数据，index超出范围');
        alert('无法获取数据，请刷新页面重试');
        return;
    }
    
    console.log('准备打开编辑弹窗...');
    // 打开编辑弹窗
    openEditModal(data, index);
    console.log('编辑弹窗应该已经打开');
}

// 删除已确认数据
function deleteConfirmedData(index) {
    console.log('=== deleteConfirmedData被调用 ===');
    console.log('传入的index:', index);
    console.log('filteredData长度:', filteredData.length);
    console.log('confirmedData长度:', confirmedData.length);
    
    if (confirm('确定要删除这条数据吗？')) {
        // 先获取要删除的数据
        const dataToDelete = filteredData[index];
        console.log('要删除的数据:', dataToDelete);
        
        if (!dataToDelete) {
            console.error('无法获取要删除的数据，index超出范围');
            alert('无法获取要删除的数据，请刷新页面重试');
            return;
        }
        
        // 从confirmedData中找到对应的数据并删除
        const confirmedIndex = confirmedData.findIndex(item => 
            item['日期'] === dataToDelete['日期'] && 
            item['学习项目名称'] === dataToDelete['学习项目名称'] &&
            item['项目开始时间'] === dataToDelete['项目开始时间']
        );
        console.log('在confirmedData中找到的索引:', confirmedIndex);
        
        if (confirmedIndex !== -1) {
            confirmedData.splice(confirmedIndex, 1);
            console.log('数据已从confirmedData中删除，当前长度:', confirmedData.length);
        }
        
        // 重新过滤数据
        filterData();
        
        updateConfirmedDataTable();
        saveConfirmedData();
        
        // 更新图表和项目选择器
        updateCharts();
        
        console.log('删除操作完成');
    } else {
        console.log('用户取消了删除操作');
    }
}

// 保存已确认数据到localStorage
function saveConfirmedData() {
    localStorage.setItem('confirmedData', JSON.stringify(confirmedData));
}

// 加载已确认数据
function loadConfirmedData() {
    const savedData = localStorage.getItem('confirmedData');
    if (savedData) {
        try {
            confirmedData = JSON.parse(savedData);
            console.log('loadConfirmedData: 加载了', confirmedData.length, '条数据');
            
            // 确保filteredData被正确初始化
            if (typeof filteredData === 'undefined') {
                filteredData = [...confirmedData];
            } else {
                filterData(); // 重新过滤数据
            }
            
            updateConfirmedDataTable();
            console.log(`加载了 ${confirmedData.length} 条已确认数据`);
            
            // 加载数据后更新图表和统计信息
            updateCharts();
            
            // 确保项目选择器更新
            setTimeout(() => {
                console.log('延迟更新项目选择器...');
                updateProjectSelect();
            }, 100);
        } catch (error) {
            console.error('加载已确认数据失败:', error);
            confirmedData = [];
            filteredData = [];
            updateCharts();
        }
    } else {
        // 即使没有数据也要更新图表，显示空状态
        console.log('loadConfirmedData: 没有保存的数据');
        confirmedData = [];
        filteredData = [];
        updateCharts();
        
        // 确保项目选择器更新
        setTimeout(() => {
            console.log('延迟更新项目选择器（无数据）...');
            updateProjectSelect();
        }, 100);
    }
}

// 计算项目完成时间
function calculateCompletionTime(row) {
    const inputs = row.querySelectorAll('input');
    const startTimeInput = inputs[1]; // 项目开始时间 (input[1])
    const endTimeInput = inputs[2];   // 项目结束时间 (input[2])
    const completionTimeInput = inputs[3]; // 项目完成时间 (input[3])
    
    console.log('计算完成时间:', {
        startTime: startTimeInput.value,
        endTime: endTimeInput.value,
        inputs: inputs.length
    });
    
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    
    if (startTime && endTime) {
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            // 验证时间是否超过录入时间
            if (start > entryDateTime) {
                completionTimeInput.value = '';
                alert('项目开始时间不能超过录入时间');
                return;
            }
            
            if (end > entryDateTime) {
                completionTimeInput.value = '';
                alert('项目结束时间不能超过录入时间');
                return;
            }
            
            if (end > start) {
                // 计算时间差（毫秒）
                const timeDiff = end.getTime() - start.getTime();
                // 转换为分钟并取整数
                const minutes = Math.round(timeDiff / (1000 * 60));
                completionTimeInput.value = `${minutes} 分钟`;
                console.log('计算完成，结果:', completionTimeInput.value);
            } else {
                completionTimeInput.value = '';
                alert('项目结束时间必须晚于项目开始时间');
            }
        } catch (error) {
            console.error('时间计算错误:', error);
            completionTimeInput.value = '';
        }
    } else {
        completionTimeInput.value = '';
    }
}

// 保存表格数据
function saveTableData() {
    if (confirmedData.length === 0) {
        alert('没有已确认的数据可保存');
        return;
    }
    
    // 保存到localStorage
    localStorage.setItem('editorData', JSON.stringify(confirmedData));
    alert(`成功保存 ${confirmedData.length} 条已确认数据！`);
}

// 导出到Excel
function exportToExcel() {
    if (confirmedData.length === 0) {
        alert('没有已确认的数据可导出');
                return;
            }
            
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(confirmedData);
    XLSX.utils.book_append_sheet(wb, ws, "学习数据");
    
    // 导出文件
    const fileName = `学习数据_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// 初始化弹窗事件
function initModalEvents() {
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const saveBtn = document.getElementById('saveEditBtn');
    
    // 关闭弹窗事件
    closeBtn.onclick = function() {
        closeModal();
    };
    
    cancelBtn.onclick = function() {
        closeModal();
    };
    
    // 点击弹窗外部关闭
    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
    
    // 保存按钮事件
    saveBtn.onclick = function() {
        saveEditData();
    };
    
    // 时间输入框变化事件
    document.getElementById('editStartTime').addEventListener('change', calculateEditCompletionTime);
    document.getElementById('editEndTime').addEventListener('change', calculateEditCompletionTime);
    
    // 在移动端，为编辑弹窗的日期时间输入框使用自定义选择器
    if (window.innerWidth <= 768) {
        document.getElementById('editDate').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showCustomDatePicker(this, 'date');
        });
        
        document.getElementById('editStartTime').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showCustomDatePicker(this, 'datetime-local');
        });
        
        document.getElementById('editEndTime').addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showCustomDatePicker(this, 'datetime-local');
        });
        
        // 禁用原生日期选择器
        document.getElementById('editDate').addEventListener('focus', function(e) {
            e.preventDefault();
            this.blur();
        });
        
        document.getElementById('editStartTime').addEventListener('focus', function(e) {
            e.preventDefault();
            this.blur();
        });
        
        document.getElementById('editEndTime').addEventListener('focus', function(e) {
            e.preventDefault();
            this.blur();
        });
        
        // 防止双击选中文本
        document.getElementById('editDate').addEventListener('select', function(e) {
            e.preventDefault();
        });
        
        document.getElementById('editStartTime').addEventListener('select', function(e) {
            e.preventDefault();
        });
        
        document.getElementById('editEndTime').addEventListener('select', function(e) {
            e.preventDefault();
        });
    } else {
        // 桌面端使用原生日期选择器
        document.getElementById('editDate').addEventListener('focus', function() {
            setTimeout(() => {
                fixModalDatePickerPosition(this);
            }, 100);
        });
        
        document.getElementById('editStartTime').addEventListener('focus', function() {
            setTimeout(() => {
                fixModalDatePickerPosition(this);
            }, 100);
        });
        
        document.getElementById('editEndTime').addEventListener('focus', function() {
            setTimeout(() => {
                fixModalDatePickerPosition(this);
            }, 100);
        });
    }
}

// 打开编辑弹窗
function openEditModal(data, index) {
    console.log('=== openEditModal被调用 ===');
    console.log('传入的数据:', data);
    console.log('传入的index:', index);
    
    const modal = document.getElementById('editModal');
    console.log('找到的modal元素:', modal);
    
    if (!modal) {
        console.error('找不到editModal元素！');
        alert('找不到编辑弹窗，请刷新页面重试');
        return;
    }
    
    // 更新项目选择器
    console.log('更新项目选择器...');
    updateAllProjectSelectors();
    
    // 填充表单数据
    console.log('填充表单数据...');
    document.getElementById('editDate').value = data['日期'] || '';
    document.getElementById('editProjectName').value = data['学习项目名称'] || '';
    document.getElementById('editStartTime').value = data['项目开始时间'] || '';
    document.getElementById('editEndTime').value = data['项目结束时间'] || '';
    document.getElementById('editCompletionTime').value = data['项目完成时间'] || '';
    
    // 设置时间输入框的最大值
    const year = entryDateTime.getFullYear();
    const month = String(entryDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(entryDateTime.getDate()).padStart(2, '0');
    const hours = String(entryDateTime.getHours()).padStart(2, '0');
    const minutes = String(entryDateTime.getMinutes()).padStart(2, '0');
    const maxDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    document.getElementById('editStartTime').max = maxDateTime;
    document.getElementById('editEndTime').max = maxDateTime;
    
    // 设置编辑索引
    editingIndex = index;
    console.log('设置editingIndex为:', editingIndex);
    
    // 显示弹窗
    console.log('显示弹窗...');
    modal.style.display = 'block';
    console.log('弹窗display样式已设置为block');
    
    // 聚焦到第一个输入框
    document.getElementById('editDate').focus();
    console.log('弹窗应该已经显示并聚焦到日期输入框');
}

// 关闭编辑弹窗
function closeModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    editingIndex = -1; // 重置编辑状态
}

// 计算编辑弹窗中的完成时间
function calculateEditCompletionTime() {
    const startTime = document.getElementById('editStartTime').value;
    const endTime = document.getElementById('editEndTime').value;
    const completionTimeInput = document.getElementById('editCompletionTime');
    
    if (startTime && endTime) {
        try {
            const start = new Date(startTime);
            const end = new Date(endTime);
            
            // 验证时间是否超过录入时间
            if (start > entryDateTime) {
                completionTimeInput.value = '';
                alert('项目开始时间不能超过录入时间');
                return;
            }
            
            if (end > entryDateTime) {
                completionTimeInput.value = '';
                alert('项目结束时间不能超过录入时间');
                return;
            }
            
                            if (end > start) {
                // 计算时间差（毫秒）
                                const timeDiff = end.getTime() - start.getTime();
                // 转换为分钟并取整数
                                const minutes = Math.round(timeDiff / (1000 * 60));
                completionTimeInput.value = `${minutes} 分钟`;
            } else {
                completionTimeInput.value = '';
                alert('项目结束时间必须晚于项目开始时间');
                            }
                        } catch (error) {
            console.error('时间计算错误:', error);
            completionTimeInput.value = '';
        }
    } else {
        completionTimeInput.value = '';
    }
}

// 保存编辑数据
function saveEditData() {
    const date = document.getElementById('editDate').value;
    const projectName = document.getElementById('editProjectName').value;
    const startTime = document.getElementById('editStartTime').value;
    const endTime = document.getElementById('editEndTime').value;
    const completionTime = document.getElementById('editCompletionTime').value;
    
    // 验证必填字段
    if (!date || !projectName || !startTime || !endTime) {
        alert('请填写完整的日期、项目名称、开始时间和结束时间');
        return;
    }
    
    // 验证项目完成时间是否已计算
    if (!completionTime) {
        alert('请确保项目结束时间晚于项目开始时间');
        return;
    }
    
    // 创建更新后的数据对象
    const updatedData = {
        "日期": date,
        "学习项目名称": projectName,
        "项目开始时间": startTime,
        "项目结束时间": endTime,
        "项目完成时间": completionTime
    };
    
    // 更新数据
    if (editingIndex >= 0) {
        // 先获取原始数据
        const originalData = filteredData[editingIndex];
        
        // 在confirmedData中找到对应的数据并更新
        const confirmedIndex = confirmedData.findIndex(item => 
            item['日期'] === originalData['日期'] && 
            item['学习项目名称'] === originalData['学习项目名称'] &&
            item['项目开始时间'] === originalData['项目开始时间']
        );
        if (confirmedIndex !== -1) {
            confirmedData[confirmedIndex] = updatedData;
            console.log('saveEditData: 更新数据，当前confirmedData长度:', confirmedData.length);
        }
    }
    
    // 重新过滤数据
    filterData();
    
    // 更新表格和保存数据
    updateConfirmedDataTable();
    saveConfirmedData();
    
    // 更新图表和项目选择器
    updateCharts();
    
    // 关闭弹窗
    closeModal();
}

// 初始化图表
function initCharts() {
    // 检查Chart.js是否可用
    if (typeof Chart === 'undefined') {
        console.error('Chart.js 库未加载');
        return;
    }
    
    // 重新创建图表
    const mainCtx = document.getElementById('mainChart');
    if (mainCtx) {
        const chartConfigs = {
            'trend': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '学习时间（分钟）',
                        data: [],
                        borderColor: '#007AFF',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    }
                }
            },
            'radar': {
                type: 'radar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '学习时间分布',
                        data: [],
                        backgroundColor: 'rgba(0, 122, 255, 0.2)',
                        borderColor: '#007AFF',
                        borderWidth: 2,
                        pointBackgroundColor: '#007AFF',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#007AFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        }
                    }
                }
            },
            'bar': {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '学习时间（分钟）',
                        data: [],
                        backgroundColor: 'rgba(0, 122, 255, 0.8)',
                        borderColor: '#007AFF',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '项目名称'
                            }
                        }
                    }
                }
            },
            'pie': {
                type: 'pie',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
                            '#5856D6', '#FF2D92', '#30D158', '#FF9F0A', '#FF453A'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed}分钟 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            },
            'daily': {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '每日学习时间（分钟）',
                        data: [],
                        backgroundColor: 'rgba(52, 199, 89, 0.8)',
                        borderColor: '#34C759',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    }
                }
            }
        };
        
        const config = chartConfigs[currentChartType];
        if (config) {
            mainChart = new Chart(mainCtx, config);
            console.log('图表已创建，类型:', currentChartType);
            
            // 确保图表更新后滚动支持仍然有效
            setTimeout(() => {
                adjustChartScrollSupport();
            }, 100);
        }
    }
    
    // 初始化图表滚动支持
    console.log('初始化图表滚动支持');
    adjustChartScrollSupport();
}

// 初始化图表筛选事件
function initChartFilters() {
    console.log('=== initChartFilters被调用 ===');
    
    // 项目筛选
    const projectSelect = document.getElementById('chartProjectSelect');
    console.log('找到的projectSelect元素:', projectSelect);
    
    if (projectSelect) {
        projectSelect.addEventListener('change', function() {
            console.log('=== 项目选择器change事件被触发 ===');
            console.log('选中的值:', this.value);
            console.log('之前的currentProjectFilter:', currentProjectFilter);
            
            currentProjectFilter = this.value;
            console.log('更新后的currentProjectFilter:', currentProjectFilter);
            
            console.log('准备调用updateCharts...');
            updateCharts();
            console.log('updateCharts调用完成');
        });
        console.log('项目选择器change事件监听器已绑定');
    } else {
        console.error('找不到chartProjectSelect元素！');
    }
    
    // 时间筛选按钮
    const timeFilterBtns = document.querySelectorAll('.time-filter-btn');
    console.log('找到的时间筛选按钮数量:', timeFilterBtns.length);
    
    timeFilterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('=== 时间筛选按钮被点击 ===');
            console.log('按钮的data-days:', this.dataset.days);
            
            // 移除所有活动状态
            timeFilterBtns.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的活动状态
            this.classList.add('active');
            // 更新筛选条件
            currentTimeFilter = parseInt(this.dataset.days);
            console.log('更新后的currentTimeFilter:', currentTimeFilter);
            
            updateCharts();
        });
    });
    
    // 图表类型选择器
    const chartTypeSelect = document.getElementById('chartTypeSelect');
    console.log('找到的chartTypeSelect元素:', chartTypeSelect);
    
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', function() {
            console.log('=== 图表类型选择器change事件被触发 ===');
            console.log('选中的图表类型:', this.value);
            
            currentChartType = this.value;
            updateChartType();
            updateCharts();
        });
        console.log('图表类型选择器change事件监听器已绑定');
    } else {
        console.error('找不到chartTypeSelect元素！');
    }
    
    console.log('=== initChartFilters完成 ===');
}

// 更新图表数据
function updateCharts() {
    console.log('=== updateCharts被调用 ===');
    console.log('confirmedData长度:', confirmedData.length);
    console.log('当前项目筛选条件:', currentProjectFilter);
    console.log('当前时间筛选条件:', currentTimeFilter);
    
    if (confirmedData.length === 0) {
        console.log('没有已确认数据，更新空统计信息');
        updateStats({});
        return;
    }
    
    // 筛选数据
    console.log('开始筛选数据...');
    const filteredData = filterDataForCharts(confirmedData);
    console.log('筛选后的数据长度:', filteredData.length);
    
    // 更新统计信息
    console.log('更新统计信息...');
    updateStats(filteredData);
    
    // 更新主图表
    console.log('更新主图表...');
    updateMainChart(filteredData);
    
    // 更新项目选择器
    console.log('更新项目选择器...');
    updateProjectSelect();
    
    // 确保图表更新后滚动支持仍然有效
    setTimeout(() => {
        adjustChartScrollSupport();
    }, 100);
    
    console.log('=== updateCharts完成 ===');
}

// 筛选图表数据
function filterDataForCharts(data) {
    console.log('=== filterDataForCharts被调用 ===');
    console.log('输入数据长度:', data.length);
    console.log('当前项目筛选条件:', currentProjectFilter);
    console.log('当前时间筛选条件:', currentTimeFilter);
    
    let filtered = [...data];
    console.log('初始筛选后数据长度:', filtered.length);
    
    // 项目筛选
    if (currentProjectFilter) {
        console.log('应用项目筛选，筛选条件:', currentProjectFilter);
        const beforeProjectFilter = filtered.length;
        filtered = filtered.filter(item => item['学习项目名称'] === currentProjectFilter);
        console.log('项目筛选前数据长度:', beforeProjectFilter, '筛选后:', filtered.length);
        
        // 显示筛选结果
        if (filtered.length > 0) {
            console.log('筛选后的数据示例:', filtered.slice(0, 3));
        } else {
            console.log('项目筛选后没有匹配的数据');
        }
    } else {
        console.log('没有项目筛选条件，跳过项目筛选');
    }
    
    // 时间筛选
    if (currentTimeFilter > 0) {
        console.log('应用时间筛选，筛选条件:', currentTimeFilter, '天前');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - currentTimeFilter);
        console.log('截止日期:', cutoffDate);
        
        const beforeTimeFilter = filtered.length;
        filtered = filtered.filter(item => {
            const itemDate = new Date(item['日期']);
            return itemDate >= cutoffDate;
        });
        console.log('时间筛选前数据长度:', beforeTimeFilter, '筛选后:', filtered.length);
    } else {
        console.log('没有时间筛选条件，跳过时间筛选');
    }
    
    console.log('最终筛选结果数据长度:', filtered.length);
    console.log('=== filterDataForCharts完成 ===');
    
    return filtered;
}

// 更新统计信息
function updateStats(data) {
    const totalProjects = data.length || 0;
    const totalTime = data.reduce((sum, item) => {
        const timeStr = item['项目完成时间'] || '0 分钟';
        const minutes = parseInt(timeStr) || 0;
        return sum + minutes;
    }, 0);
    
    const avgDailyTime = totalProjects > 0 ? Math.round(totalTime / totalProjects) : 0;
    
    // 计算日期范围
    let dateRange = '-';
    if (data.length > 0) {
        const dates = data.map(item => new Date(item['日期'])).sort((a, b) => a - b);
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        
        // 格式化日期为更简洁的格式
        const formatDate = (date) => {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}/${day}`;
        };
        
        // 如果开始和结束日期相同，只显示一个日期
        if (startDate.getTime() === endDate.getTime()) {
            dateRange = formatDate(startDate);
        } else {
            dateRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
        }
    }
    
    console.log('更新统计信息:', {
        totalProjects,
        totalTime,
        avgDailyTime,
        dateRange,
        dataLength: data.length
    });
    
    // 更新桌面端DOM
    const totalProjectsEl = document.getElementById('totalProjects');
    const totalTimeEl = document.getElementById('totalTime');
    const avgDailyTimeEl = document.getElementById('avgDailyTime');
    const dateRangeEl = document.getElementById('dateRange');
    
    if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
    if (totalTimeEl) totalTimeEl.innerHTML = `${totalTime}<span class="stat-unit">分钟</span>`;
    if (avgDailyTimeEl) avgDailyTimeEl.innerHTML = `${avgDailyTime}<span class="stat-unit">分钟</span>`;
    if (dateRangeEl) dateRangeEl.textContent = dateRange;
    
    // 更新移动端DOM
    const mobileTotalProjectsEl = document.getElementById('mobileTotalProjects');
    const mobileTotalTimeEl = document.getElementById('mobileTotalTime');
    const mobileAvgDailyTimeEl = document.getElementById('mobileAvgDailyTime');
    const mobileDateRangeEl = document.getElementById('mobileDateRange');
    
    console.log('移动端DOM元素:', {
        mobileTotalProjectsEl: !!mobileTotalProjectsEl,
        mobileTotalTimeEl: !!mobileTotalTimeEl,
        mobileAvgDailyTimeEl: !!mobileAvgDailyTimeEl,
        mobileDateRangeEl: !!mobileDateRangeEl
    });
    
    if (mobileTotalProjectsEl) {
        mobileTotalProjectsEl.textContent = totalProjects;
        console.log('已更新mobileTotalProjects:', totalProjects);
    }
    if (mobileTotalTimeEl) {
        mobileTotalTimeEl.innerHTML = `${totalTime}<span class="mobile-stat-unit">分钟</span>`;
        console.log('已更新mobileTotalTime:', totalTime);
    }
    if (mobileAvgDailyTimeEl) {
        mobileAvgDailyTimeEl.innerHTML = `${avgDailyTime}<span class="mobile-stat-unit">分钟</span>`;
        console.log('已更新mobileAvgDailyTime:', avgDailyTime);
    }
    if (mobileDateRangeEl) {
        mobileDateRangeEl.textContent = dateRange;
        console.log('已更新mobileDateRange:', dateRange);
    }
}

// 更新主图表
function updateMainChart(data) {
    console.log('=== updateMainChart被调用 ===');
    console.log('传入数据长度:', data.length);
    console.log('当前图表类型:', currentChartType);
    console.log('mainChart对象:', mainChart);
    
    if (!mainChart) {
        console.error('mainChart对象不存在，无法更新图表');
        return;
    }
    
    console.log('开始更新图表，类型:', currentChartType);
    
    switch (currentChartType) {
        case 'trend':
            console.log('更新趋势图...');
            updateTrendChart(data);
            break;
        case 'radar':
            console.log('更新雷达图...');
            updateRadarChart(data);
            break;
        case 'bar':
            console.log('更新柱状图...');
            updateBarChart(data);
            break;
        case 'pie':
            console.log('更新饼图...');
            updatePieChart(data);
            break;
        case 'daily':
            console.log('更新每日图表...');
            updateDailyChart(data);
            break;
        default:
            console.error('未知的图表类型:', currentChartType);
    }
    
    console.log('=== updateMainChart完成 ===');
}

// 更新图表类型
function updateChartType() {
    console.log('切换图表类型到:', currentChartType);
    
    // 销毁当前图表
    if (mainChart) {
        mainChart.destroy();
        mainChart = null;
    }
    
    // 更新图表标题
    const chartTitle = document.getElementById('chartTitle');
    if (chartTitle) {
        const titles = {
            'trend': '学习时间趋势 (折线图)',
            'radar': '项目分布 (雷达图)',
            'bar': '项目时间对比 (柱状图)',
            'pie': '项目时间占比 (饼图)',
            'daily': '每日学习时长 (柱状图)'
        };
        chartTitle.textContent = titles[currentChartType] || '图表';
    }
    
    // 重新创建图表
    const mainCtx = document.getElementById('mainChart');
    if (mainCtx) {
        const chartConfigs = {
            'trend': {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '学习时间（分钟）',
                        data: [],
                        borderColor: '#007AFF',
                        backgroundColor: 'rgba(0, 122, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    }
                }
            },
            'radar': {
                type: 'radar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '学习时间分布',
                        data: [],
                        backgroundColor: 'rgba(0, 122, 255, 0.2)',
                        borderColor: '#007AFF',
                        borderWidth: 2,
                        pointBackgroundColor: '#007AFF',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#007AFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        }
                    }
                }
            },
            'bar': {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '学习时间（分钟）',
                        data: [],
                        backgroundColor: 'rgba(0, 122, 255, 0.8)',
                        borderColor: '#007AFF',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '项目名称'
                            }
                        }
                    }
                }
            },
            'pie': {
                type: 'pie',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
                            '#5856D6', '#FF2D92', '#30D158', '#FF9F0A', '#FF453A'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed}分钟 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            },
            'daily': {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '每日学习时间（分钟）',
                        data: [],
                        backgroundColor: 'rgba(52, 199, 89, 0.8)',
                        borderColor: '#34C759',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '时间（分钟）'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: '日期'
                            }
                        }
                    }
                }
            }
        };
        
        const config = chartConfigs[currentChartType];
        if (config) {
            mainChart = new Chart(mainCtx, config);
            console.log('新图表已创建，类型:', currentChartType);
            
            // 确保图表更新后滚动支持仍然有效
            setTimeout(() => {
                adjustChartScrollSupport();
            }, 100);
        }
    } else {
        console.error('找不到mainChart canvas元素');
    }
    
    // 获取图表容器
    const chartContainer = document.querySelector('.chart-container');
    
    // 定义需要横向滚动的图表类型
    const scrollableChartTypes = ['trend', 'bar', 'daily'];
    
    console.log('在updateChartType中检查滚动支持');
    console.log('当前窗口宽度:', window.innerWidth);
    console.log('当前图表类型:', currentChartType);
    console.log('是否需要滚动:', window.innerWidth <= 768 && scrollableChartTypes.includes(currentChartType));
    
    // 在移动端为需要横向滚动的图表类型添加滚动支持
    if (window.innerWidth <= 768 && scrollableChartTypes.includes(currentChartType)) {
        if (chartContainer) {
            chartContainer.classList.add('scrollable');
            console.log('已添加scrollable类');
            // 已移除canvas宽度强制设置
            if (!chartContainer.hasAttribute('data-scroll-listener')) {
                chartContainer.addEventListener('scroll', function() {
                    if (this.scrollLeft > 0) {
                        this.classList.add('scrolled');
                    } else {
                        this.classList.remove('scrolled');
                    }
                });
                chartContainer.setAttribute('data-scroll-listener', 'true');
                console.log('滚动事件监听器已添加');
            }
        }
    } else {
        // 移除滚动支持
        if (chartContainer) {
            chartContainer.classList.remove('scrollable', 'scrolled');
            console.log('已移除scrollable类');
            // 已移除canvas样式恢复
        }
    }
}

// 更新趋势图表
function updateTrendChart(data) {
    if (!mainChart || currentChartType !== 'trend') return;
    
    // 按日期分组数据
    const dailyData = {};
    data.forEach(item => {
        const date = item['日期'];
        const timeStr = item['项目完成时间'] || '0 分钟';
        const minutes = parseInt(timeStr) || 0;
        
        if (dailyData[date]) {
            dailyData[date] += minutes;
        } else {
            dailyData[date] = minutes;
        }
    });
    
    // 排序日期
    const sortedDates = Object.keys(dailyData).sort();
    
    mainChart.data.labels = sortedDates;
    mainChart.data.datasets[0].data = sortedDates.map(date => dailyData[date]);
    mainChart.update();
}

// 更新雷达图表
function updateRadarChart(data) {
    if (!mainChart || currentChartType !== 'radar') return;
    
    // 按项目分组数据
    const projectData = {};
    data.forEach(item => {
        const project = item['学习项目名称'];
        const timeStr = item['项目完成时间'] || '0 分钟';
        const minutes = parseInt(timeStr) || 0;
        
        if (projectData[project]) {
            projectData[project] += minutes;
        } else {
            projectData[project] = minutes;
        }
    });
    
    // 获取前10个项目（按时间排序）
    const sortedProjects = Object.entries(projectData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    mainChart.data.labels = sortedProjects.map(([project]) => project);
    mainChart.data.datasets[0].data = sortedProjects.map(([, time]) => time);
    mainChart.update();
}

// 更新柱状图（项目时间对比）
function updateBarChart(data) {
    if (!mainChart || currentChartType !== 'bar') return;
    
    // 按项目分组数据
    const projectData = {};
    data.forEach(item => {
        const project = item['学习项目名称'];
        const timeStr = item['项目完成时间'] || '0 分钟';
        const minutes = parseInt(timeStr) || 0;
        
        if (projectData[project]) {
            projectData[project] += minutes;
        } else {
            projectData[project] = minutes;
        }
    });
    
    // 获取前8个项目（按时间排序）
    const sortedProjects = Object.entries(projectData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    mainChart.data.labels = sortedProjects.map(([project]) => project);
    mainChart.data.datasets[0].data = sortedProjects.map(([, time]) => time);
    mainChart.update();
}

// 更新饼图（项目时间占比）
function updatePieChart(data) {
    if (!mainChart || currentChartType !== 'pie') return;
    
    // 按项目分组数据
    const projectData = {};
    data.forEach(item => {
        const project = item['学习项目名称'];
        const timeStr = item['项目完成时间'] || '0 分钟';
        const minutes = parseInt(timeStr) || 0;
        
        if (projectData[project]) {
            projectData[project] += minutes;
        } else {
            projectData[project] = minutes;
        }
    });
    
    // 获取前8个项目（按时间排序）
    const sortedProjects = Object.entries(projectData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    mainChart.data.labels = sortedProjects.map(([project]) => project);
    mainChart.data.datasets[0].data = sortedProjects.map(([, time]) => time);
    mainChart.update();
}

// 更新每日学习时长柱状图
function updateDailyChart(data) {
    if (!mainChart || currentChartType !== 'daily') return;
    
    // 按日期分组数据
    const dailyData = {};
    data.forEach(item => {
        const date = item['日期'];
        const timeStr = item['项目完成时间'] || '0 分钟';
        const minutes = parseInt(timeStr) || 0;
        
        if (dailyData[date]) {
            dailyData[date] += minutes;
        } else {
            dailyData[date] = minutes;
        }
    });
    
    // 排序日期
    const sortedDates = Object.keys(dailyData).sort();
    
    mainChart.data.labels = sortedDates;
    mainChart.data.datasets[0].data = sortedDates.map(date => dailyData[date]);
    mainChart.update();
}

// 更新项目选择器
function updateProjectSelect() {
    const projectSelect = document.getElementById('chartProjectSelect');
    if (!projectSelect) {
        console.log('找不到chartProjectSelect元素');
        return;
    }
    
    // 从项目配置中获取项目名称列表
    const projects = projectConfigs.map(config => config.name).filter(Boolean);
    console.log('updateProjectSelect被调用，项目配置列表:', projects);
    console.log('当前projectConfigs长度:', projectConfigs.length);
    
    // 保存当前选中的值
    const currentValue = projectSelect.value;
    console.log('当前选中的值:', currentValue);
    
    // 清空现有选项（保留"全部项目"选项）
    projectSelect.innerHTML = '<option value="">全部项目</option>';
    
    // 添加项目选项
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        // 如果这个项目是当前选中的，设置为选中状态
        if (project === currentValue) {
            option.selected = true;
        }
        projectSelect.appendChild(option);
    });
    
    // 如果当前选中的值在新的项目列表中不存在，重置为"全部项目"
    if (currentValue && !projects.includes(currentValue)) {
        projectSelect.value = '';
        currentProjectFilter = '';
        console.log('重置项目筛选为全部项目');
    }
    
    console.log('项目选择器更新完成，选项数量:', projectSelect.options.length);
}

// 修复移动端日期选择器定位问题
function fixDatePickerPosition(inputElement) {
    // 检查是否在移动端
    if (window.innerWidth <= 768) {
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            const scrollLeft = tableContainer.scrollLeft;
            const inputRect = inputElement.getBoundingClientRect();
            const containerRect = tableContainer.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            
            // 计算输入框相对于视口的位置
            const inputLeft = inputRect.left;
            const inputRight = inputRect.right;
            
            // 如果输入框在视口左侧边缘，需要向右滚动
            if (inputLeft < 20) {
                const targetScrollLeft = scrollLeft - (20 - inputLeft);
                tableContainer.scrollTo({
                    left: Math.max(0, targetScrollLeft),
                    behavior: 'smooth'
                });
            }
            // 如果输入框在视口右侧边缘，需要向左滚动
            else if (inputRight > viewportWidth - 20) {
                const targetScrollLeft = scrollLeft + (inputRight - viewportWidth + 20);
                tableContainer.scrollTo({
                    left: targetScrollLeft,
                    behavior: 'smooth'
                });
            }
            
            // 确保输入框在视口中央附近
            const inputCenter = (inputLeft + inputRight) / 2;
            const viewportCenter = viewportWidth / 2;
            const centerOffset = inputCenter - viewportCenter;
            
            if (Math.abs(centerOffset) > 100) {
                const targetScrollLeft = scrollLeft + centerOffset;
                tableContainer.scrollTo({
                    left: Math.max(0, targetScrollLeft),
                    behavior: 'smooth'
                });
            }
        }
    }
}

// 修复编辑弹窗的日期选择器定位问题
function fixModalDatePickerPosition(inputElement) {
    // 检查是否在移动端
    if (window.innerWidth <= 768) {
        const modal = document.getElementById('editModal');
        if (modal) {
            const modalRect = modal.getBoundingClientRect();
            const inputRect = inputElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            
            // 计算输入框相对于视口的位置
            const inputLeft = inputRect.left;
            const inputRight = inputRect.right;
            
            // 如果输入框在视口左侧边缘，需要调整弹窗位置
            if (inputLeft < 20) {
                // 尝试将弹窗向右移动
                const currentLeft = parseInt(modal.style.left) || 0;
                const newLeft = Math.max(0, currentLeft - (20 - inputLeft));
                modal.style.left = newLeft + 'px';
            }
            // 如果输入框在视口右侧边缘，需要调整弹窗位置
            else if (inputRight > viewportWidth - 20) {
                // 尝试将弹窗向左移动
                const currentLeft = parseInt(modal.style.left) || 0;
                const newLeft = currentLeft - (inputRight - viewportWidth + 20);
                modal.style.left = newLeft + 'px';
            }
            
            // 确保弹窗不会超出视口边界
            const modalLeft = parseInt(modal.style.left) || 0;
            const modalWidth = modalRect.width;
            
            if (modalLeft < 0) {
                modal.style.left = '0px';
            } else if (modalLeft + modalWidth > viewportWidth) {
                modal.style.left = (viewportWidth - modalWidth) + 'px';
            }
        }
    }
}

// 显示自定义日期选择器
function showCustomDatePicker(inputElement, type) {
    console.log('显示自定义日期选择器:', type);
    console.log('输入元素:', inputElement);
    console.log('当前窗口宽度:', window.innerWidth);
    
    // 记录当前滚动位置
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 禁用页面滚动
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollTop}px`;
    document.body.style.left = `-${scrollLeft}px`;
    document.body.style.width = '100%';
    
    // 创建自定义日期选择器容器
    const pickerContainer = document.createElement('div');
    pickerContainer.id = 'customDatePicker';
    pickerContainer.className = 'custom-date-picker';
    
    // 获取当前输入框的值
    const currentValue = inputElement.value;
    let currentDate = new Date();
    if (currentValue) {
        try {
            currentDate = new Date(currentValue);
            if (isNaN(currentDate.getTime())) {
                currentDate = new Date();
            }
        } catch (e) {
            currentDate = new Date();
        }
    }
    
    // 创建日期选择器HTML
    pickerContainer.innerHTML = `
        <div class="picker-overlay"></div>
        <div class="picker-content">
            <div class="picker-header">
                <h3>选择${type === 'date' ? '日期' : '日期时间'}</h3>
                <button class="picker-close">&times;</button>
            </div>
            <div class="picker-body">
                <div class="date-inputs">
                    <div class="input-group">
                        <label>年份 (YYYY):</label>
                        <input type="number" id="pickerYear" value="${currentDate.getFullYear()}" min="2020" max="2030" placeholder="2024">
                    </div>
                    <div class="input-group">
                        <label>月份 (MM):</label>
                        <input type="number" id="pickerMonth" value="${currentDate.getMonth() + 1}" min="1" max="12" placeholder="01">
                    </div>
                    <div class="input-group">
                        <label>日期 (DD):</label>
                        <input type="number" id="pickerDay" value="${currentDate.getDate()}" min="1" max="31" placeholder="01">
                    </div>
                    ${type === 'datetime-local' ? `
                        <div class="input-group">
                            <label>小时 (HH):</label>
                            <input type="number" id="pickerHour" value="${currentDate.getHours()}" min="0" max="23" placeholder="00">
                        </div>
                        <div class="input-group">
                            <label>分钟 (MM):</label>
                            <input type="number" id="pickerMinute" value="${currentDate.getMinutes()}" min="0" max="59" placeholder="00">
                        </div>
                    ` : ''}
                </div>
                <div class="picker-preview">
                    <p>预览: <span id="datePreview">${formatDateForPreview(currentDate, type)}</span></p>
                </div>
            </div>
            <div class="picker-footer">
                <button class="picker-btn picker-cancel">取消</button>
                <button class="picker-btn picker-confirm">确认</button>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(pickerContainer);
    
    // 绑定事件
    const overlay = pickerContainer.querySelector('.picker-overlay');
    const closeBtn = pickerContainer.querySelector('.picker-close');
    const cancelBtn = pickerContainer.querySelector('.picker-cancel');
    const confirmBtn = pickerContainer.querySelector('.picker-confirm');
    
    // 关闭事件
    const closePicker = () => {
        pickerContainer.remove();
        
        // 恢复页面滚动
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.width = '';
        
        // 恢复滚动位置
        window.scrollTo(scrollLeft, scrollTop);
    };
    
    overlay.addEventListener('click', closePicker);
    closeBtn.addEventListener('click', closePicker);
    cancelBtn.addEventListener('click', closePicker);
    
    // 更新预览函数
    const updatePreview = () => {
        const year = parseInt(document.getElementById('pickerYear').value) || currentDate.getFullYear();
        const month = parseInt(document.getElementById('pickerMonth').value) || 1;
        const day = parseInt(document.getElementById('pickerDay').value) || 1;
        
        let previewDate = new Date(year, month - 1, day);
        
        if (type === 'datetime-local') {
            const hour = parseInt(document.getElementById('pickerHour').value) || 0;
            const minute = parseInt(document.getElementById('pickerMinute').value) || 0;
            previewDate = new Date(year, month - 1, day, hour, minute);
        }
        
        const previewElement = document.getElementById('datePreview');
        if (previewElement) {
            previewElement.textContent = formatDateForPreview(previewDate, type);
        }
    };
    
    // 确认事件
    confirmBtn.addEventListener('click', () => {
        const year = parseInt(document.getElementById('pickerYear').value);
        const month = parseInt(document.getElementById('pickerMonth').value);
        const day = parseInt(document.getElementById('pickerDay').value);
        
        // 验证日期
        if (!isValidDate(year, month, day)) {
            alert('请输入有效的日期');
        return;
    }
    
        // 使用一致的格式化函数
        const date = new Date(year, month - 1, day);
        let dateString = formatDateConsistent(date, 'date');
        
        if (type === 'datetime-local') {
            const hour = parseInt(document.getElementById('pickerHour').value) || 0;
            const minute = parseInt(document.getElementById('pickerMinute').value) || 0;
            const dateTime = new Date(year, month - 1, day, hour, minute);
            dateString = formatDateConsistent(dateTime, 'datetime-local');
        }
        
        inputElement.value = dateString;
        
        // 触发change事件
        const event = new Event('change', { bubbles: true });
        inputElement.dispatchEvent(event);
        
        closePicker();
    });
    
    // 输入验证和预览更新
    const inputs = pickerContainer.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const value = parseInt(this.value);
            const min = parseInt(this.min);
            const max = parseInt(this.max);
            
            if (value < min) this.value = min;
            if (value > max) this.value = max;
            
            // 更新预览
            updatePreview();
        });
        
        // 初始预览
        updatePreview();
    });
    
    // 防止弹窗内容滚动时影响背景
    const pickerContent = pickerContainer.querySelector('.picker-content');
    pickerContent.addEventListener('touchmove', function(e) {
        e.stopPropagation();
    }, { passive: false });
    
    // 防止键盘事件影响背景
    pickerContainer.addEventListener('keydown', function(e) {
        e.stopPropagation();
    });
    
    // iOS Safari特殊处理
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        // 防止iOS Safari的弹性滚动
        document.addEventListener('touchmove', function(e) {
            e.preventDefault();
        }, { passive: false });
        
        // 在关闭时移除iOS特殊处理
        const originalClosePicker = closePicker;
        closePicker = () => {
            document.removeEventListener('touchmove', function(e) {
                e.preventDefault();
            }, { passive: false });
            originalClosePicker();
        };
    }
}

// 验证日期是否有效
function isValidDate(year, month, day) {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
}

// 格式化日期用于预览
function formatDateForPreview(date, type) {
    // 确保使用统一的中文格式，不受浏览器本地化设置影响
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // 使用统一的中文格式
    let preview = `${year}年${month}月${day}日`;
    
    if (type === 'datetime-local') {
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        preview += ` ${hour}时${minute}分`;
    }
    
    return preview;
}

// 确保日期格式在所有设备上都一致
function formatDateConsistent(date, type) {
    // 强制使用中文格式，不受系统语言设置影响
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    if (type === 'date') {
        return `${year}-${month}-${day}`;
    } else if (type === 'datetime-local') {
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
    }
    
    return date.toISOString();
}

// 调整图表滚动支持
function adjustChartScrollSupport() {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    // 移除现有的滚动类
    chartContainer.classList.remove('has-horizontal-scroll', 'has-vertical-scroll');
    
    // 检测是否有横向滚动
    if (chartContainer.scrollWidth > chartContainer.clientWidth) {
        chartContainer.classList.add('has-horizontal-scroll');
    }
    
    // 检测是否有纵向滚动
    if (chartContainer.scrollHeight > chartContainer.clientHeight) {
        chartContainer.classList.add('has-vertical-scroll');
    }
    
    // 3秒后自动隐藏滚动提示
    setTimeout(() => {
        chartContainer.classList.remove('has-horizontal-scroll', 'has-vertical-scroll');
    }, 3000);
}

// 监听图表容器滚动事件
function initChartScrollListener() {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    // 监听滚动事件
    chartContainer.addEventListener('scroll', function() {
        // 滚动时暂时显示提示
        this.classList.add('has-horizontal-scroll', 'has-vertical-scroll');
        
        // 清除之前的定时器
        clearTimeout(this.scrollTimeout);
        
        // 停止滚动后3秒隐藏提示
        this.scrollTimeout = setTimeout(() => {
            this.classList.remove('has-horizontal-scroll', 'has-vertical-scroll');
        }, 3000);
    });
    
    // 监听触摸事件（移动端）
    let touchStartX = 0;
    let touchStartY = 0;
    
    chartContainer.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    chartContainer.addEventListener('touchmove', function(e) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = Math.abs(touchX - touchStartX);
        const deltaY = Math.abs(touchY - touchStartY);
        
        // 如果移动距离足够大，显示滚动提示
        if (deltaX > 10 || deltaY > 10) {
            this.classList.add('has-horizontal-scroll', 'has-vertical-scroll');
            
            clearTimeout(this.scrollTimeout);
            this.scrollTimeout = setTimeout(() => {
                this.classList.remove('has-horizontal-scroll', 'has-vertical-scroll');
            }, 2000);
        }
    });
}

// 初始化日历
function initCalendar() {
    updateCalendar();
    initCalendarEvents();
}

// 初始化日历事件
function initCalendarEvents() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });
    
    document.getElementById('toggleTableView').addEventListener('click', toggleTableView);
    
    // 监听窗口大小改变，重新设置默认视图
    window.addEventListener('resize', () => {
        // 使用防抖，避免频繁触发
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            setDefaultView();
        }, 250);
    });
}

// 更新日历显示
function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 更新标题
    document.getElementById('currentMonthYear').textContent = `${year}年${month + 1}月`;
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 获取当月第一天是星期几（0是星期日）
    const firstDayWeek = firstDay.getDay();
    
    // 获取当月天数
    const daysInMonth = lastDay.getDate();
    
    // 获取上个月的天数
    const prevMonthLastDay = new Date(year, month, 0);
    const daysInPrevMonth = prevMonthLastDay.getDate();
    
    // 生成日历HTML
    let calendarHTML = '';
    
    // 添加上个月的日期
    for (let i = firstDayWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const date = new Date(year, month - 1, day);
        const dateStr = formatDateForCalendar(date);
        const hasData = calendarData.has(dateStr);
        
        calendarHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${day}</div>`;
    }
    
    // 添加当月的日期
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateForCalendar(date);
        const hasData = calendarData.has(dateStr);
        const isToday = isSameDate(date, new Date());
        
        let className = 'calendar-day';
        if (isToday) className += ' today';
        if (hasData) className += ' has-data';
        
        calendarHTML += `<div class="calendar-day ${className}" data-date="${dateStr}">${day}</div>`;
    }
    
    // 添加下个月的日期（填充到6行）
    const totalDays = firstDayWeek + daysInMonth;
    const remainingDays = 42 - totalDays; // 6行 * 7列 = 42
    
    for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        const dateStr = formatDateForCalendar(date);
        
        calendarHTML += `<div class="calendar-day other-month" data-date="${dateStr}">${day}</div>`;
    }
    
    document.getElementById('calendarGrid').innerHTML = calendarHTML;
    
    // 添加日期点击事件
    addCalendarDayEvents();
}

// 添加日历日期点击事件
function addCalendarDayEvents() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    
    calendarDays.forEach(day => {
        day.addEventListener('click', function() {
            const dateStr = this.dataset.date;
            if (calendarData.has(dateStr)) {
                showDateDataModal(dateStr);
            }
        });
        
        // 添加双击事件用于编辑
        day.addEventListener('dblclick', function() {
            const dateStr = this.dataset.date;
            if (calendarData.has(dateStr)) {
                showDateDataModal(dateStr);
            }
        });
    });
}

// 显示指定日期的数据弹窗
function showDateDataModal(dateStr) {
    const dateData = calendarData.get(dateStr) || [];
    if (dateData.length === 0) return;
    
    const modal = document.getElementById('dateDataModal');
    const modalBody = modal.querySelector('.modal-body');
    
    // 清空现有内容
    modalBody.innerHTML = '';
    
    // 创建标题
    const title = document.createElement('h4');
    title.textContent = `${dateStr} 的学习记录`;
    title.style.marginBottom = '1em';
    title.style.textAlign = 'center';
    modalBody.appendChild(title);
    
    // 创建数据列表容器
    const dataList = document.createElement('div');
    dataList.className = 'date-data-list';
    
    dateData.forEach((item, index) => {
        const dataItem = document.createElement('div');
        dataItem.className = 'date-data-item';
        
        // 计算完成时间（分钟）
        const startTime = new Date(item['项目开始时间']);
        const endTime = new Date(item['项目结束时间']);
        const completionTimeMs = endTime - startTime;
        const completionTimeMinutes = Math.round(completionTimeMs / (1000 * 60));
        
        // 获取时间等级和表情
        const timeLevel = getProjectTimeLevel(item['学习项目名称'], completionTimeMinutes);
        
        dataItem.innerHTML = `
            <div class="date-data-main">
                <div class="date-data-title">${item['学习项目名称']}</div>
                <div class="date-data-info">
                    <span class="date-data-time ${timeLevel.level}">
                        ${formatTimeDisplay(item['项目完成时间'])}
                        <span class="date-data-emoji">${timeLevel.emoji}</span>
                    </span>
                    <span class="date-data-duration">(${completionTimeMinutes}分钟)</span>
                </div>
            </div>
            <div class="date-data-actions">
                <button class="date-edit-btn" data-index="${index}" data-date="${dateStr}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="date-delete-btn" data-index="${index}" data-date="${dateStr}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // 添加事件监听器
        const editBtn = dataItem.querySelector('.date-edit-btn');
        const deleteBtn = dataItem.querySelector('.date-delete-btn');
        
        editBtn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const dateStr = this.dataset.date;
            editDateData(index, dateStr);
        });
        
        deleteBtn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const dateStr = this.dataset.date;
            deleteDateData(index, dateStr);
        });
        
        dataList.appendChild(dataItem);
    });
    
    modalBody.appendChild(dataList);
    
    // 显示弹窗
    modal.style.display = 'block';
    
    // 修复背景滚动
    document.body.style.overflow = 'hidden';
    
    // 添加事件监听器防止背景滚动
    const modalContent = modal.querySelector('.modal-content');
    modalContent.addEventListener('touchmove', function(e) {
        e.stopPropagation();
    }, { passive: false });
    
    modalContent.addEventListener('scroll', function(e) {
        e.stopPropagation();
    });
    
    // 关闭弹窗事件
    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };
    
    modal.querySelector('.close').onclick = closeModal;
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeModal();
        }
    };
}

// 切换表格视图
function toggleTableView() {
    const calendarContainer = document.querySelector('.calendar-container');
    const calendarControls = document.querySelector('.calendar-controls');
    const tableView = document.getElementById('tableView');
    const toggleBtn = document.getElementById('toggleTableView');
    
    if (tableView.style.display === 'none') {
        // 切换到表格视图
        calendarContainer.style.display = 'none';
        calendarControls.style.display = 'none';
        tableView.style.display = 'block';
        toggleBtn.innerHTML = `
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
            </svg>
            切换到日历视图
        `;
    } else {
        // 切换到日历视图
        calendarContainer.style.display = 'block';
        calendarControls.style.display = 'flex';
        tableView.style.display = 'none';
        toggleBtn.innerHTML = `
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
            </svg>
            切换到表格视图
        `;
    }
}

// 更新日历数据
function updateCalendarData() {
    calendarData.clear();
    
    confirmedData.forEach(item => {
        const dateStr = item['日期'];
        if (dateStr) {
            if (!calendarData.has(dateStr)) {
                calendarData.set(dateStr, []);
            }
            calendarData.get(dateStr).push(item);
        }
    });
    
    updateCalendar();
}

// 格式化日期为日历格式 (YYYY-MM-DD)
function formatDateForCalendar(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化日期为显示格式
function formatDateForDisplay(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

// 检查两个日期是否相同
function isSameDate(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 检测是否为移动设备
function isMobileDevice() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 设置默认视图
function setDefaultView() {
    const calendarContainer = document.querySelector('.calendar-container');
    const calendarControls = document.querySelector('.calendar-controls');
    const tableView = document.getElementById('tableView');
    const toggleBtn = document.getElementById('toggleTableView');
    
    if (isMobileDevice()) {
        // 移动端默认显示日历视图
        calendarContainer.style.display = 'block';
        calendarControls.style.display = 'flex';
        tableView.style.display = 'none';
        toggleBtn.innerHTML = `
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z"/>
            </svg>
            切换到表格视图
        `;
    } else {
        // PC端默认显示表格视图
        calendarContainer.style.display = 'none';
        calendarControls.style.display = 'none';
        tableView.style.display = 'block';
        toggleBtn.innerHTML = `
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
            </svg>
            切换到日历视图
        `;
    }
}

// 项目配置管理功能
function openProjectConfig() {
    console.log('openProjectConfig 函数被调用');
    
    try {
        loadProjectConfigs();
        console.log('项目配置加载完成，配置数量:', projectConfigs.length);
        
        const modal = document.getElementById('projectConfigModal');
        if (!modal) {
            console.error('找不到 projectConfigModal 元素');
            alert('项目配置弹窗元素未找到');
            return;
        }
        
        console.log('找到弹窗元素，准备显示');
        modal.style.display = 'block';
        
        // 锁定背景滚动
        document.body.style.overflow = 'hidden';
        
        renderProjectConfigList();
        console.log('项目配置列表渲染完成');
    } catch (error) {
        console.error('openProjectConfig 函数出错:', error);
        alert('打开项目配置时出错: ' + error.message);
    }
}

function closeProjectConfig() {
    document.getElementById('projectConfigModal').style.display = 'none';
    // 恢复背景滚动
    document.body.style.overflow = '';
}

function addProjectConfig() {
    console.log('addProjectConfig 函数被调用');
    
    // 清空表单
    document.getElementById('projectName').value = '';
    document.getElementById('excellentTime').value = '';
    document.getElementById('goodTime').value = '';
    document.getElementById('poorTime').value = '';
    
    // 设置表情输入框的默认值
    document.getElementById('excellentEmoji').value = '😊';
    document.getElementById('goodEmoji').value = '💪';
    document.getElementById('poorEmoji').value = '😤';
    
    closeProjectConfig();
    
    const addModal = document.getElementById('addProjectModal');
    if (addModal) {
        addModal.style.display = 'block';
        // 保持背景滚动锁定
        document.body.style.overflow = 'hidden';
    }
}

function closeAddProjectModal() {
    document.getElementById('addProjectModal').style.display = 'none';
    // 恢复背景滚动
    document.body.style.overflow = '';
}

// 保存项目配置
function saveProjectConfig() {
    const projectName = document.getElementById('projectName').value.trim();
    const excellentTime = parseInt(document.getElementById('excellentTime').value);
    const goodTime = parseInt(document.getElementById('goodTime').value);
    const poorTime = parseInt(document.getElementById('poorTime').value);
    
    // 使用固定的表情值
    const excellentEmoji = '😊';
    const goodEmoji = '💪';
    const poorEmoji = '😤';
    
    // 验证输入
    if (!projectName) {
        alert('请输入项目名称');
        return;
    }
    
    if (!excellentTime || !goodTime || !poorTime) {
        alert('请输入所有时间值');
        return;
    }
    
    if (excellentTime >= goodTime || goodTime >= poorTime) {
        alert('时间值必须满足：优秀时间 < 良好时间 < 需改进时间');
        return;
    }
    
    // 检查项目名称是否已存在
    const existingIndex = projectConfigs.findIndex(config => config.name === projectName);
    if (existingIndex !== -1) {
        alert('项目名称已存在，请使用其他名称');
        return;
    }
    
    // 创建新的项目配置
    const newConfig = {
        name: projectName,
        excellentTime: excellentTime,
        goodTime: goodTime,
        poorTime: poorTime,
        excellentEmoji: excellentEmoji,
        goodEmoji: goodEmoji,
        poorEmoji: poorEmoji
    };
    
    // 添加到配置列表
    projectConfigs.push(newConfig);
    
    // 保存到本地存储
    saveProjectConfigs();
    
    // 更新项目配置列表显示
    renderProjectConfigList();
    
    // 更新所有项目选择器
    updateAllProjectSelectors();
    
    // 关闭弹窗
    closeAddProjectModal();
    
    // 清空表单
    document.getElementById('projectName').value = '';
    document.getElementById('excellentTime').value = '';
    document.getElementById('goodTime').value = '';
    document.getElementById('poorTime').value = '';
    // 设置表情输入框的默认值
    document.getElementById('excellentEmoji').value = '😊';
    document.getElementById('goodEmoji').value = '💪';
    document.getElementById('poorEmoji').value = '😤';
    alert('项目配置已保存');
}

function editProjectConfig(index) {
    console.log('editProjectConfig 函数被调用，索引:', index);
    
    editingProjectIndex = index;
    const config = projectConfigs[index];
    
    document.getElementById('editProjectName').value = config.name;
    document.getElementById('editExcellentTime').value = config.excellentTime;
    document.getElementById('editGoodTime').value = config.goodTime;
    document.getElementById('editPoorTime').value = config.poorTime;
    document.getElementById('editExcellentEmoji').value = config.excellentEmoji;
    document.getElementById('editGoodEmoji').value = config.goodEmoji;
    document.getElementById('editPoorEmoji').value = config.poorEmoji;
    
    // 设置表情选择器的值
    const editExcellentEmojiSelect = document.getElementById('editExcellentEmojiSelect');
    const editGoodEmojiSelect = document.getElementById('editGoodEmojiSelect');
    const editPoorEmojiSelect = document.getElementById('editPoorEmojiSelect');
    
    if (editExcellentEmojiSelect) {
        // 查找匹配的选项
        const excellentOption = Array.from(editExcellentEmojiSelect.options).find(option => option.value === config.excellentEmoji);
        if (excellentOption) {
            editExcellentEmojiSelect.value = config.excellentEmoji;
        } else {
            editExcellentEmojiSelect.value = ''; // 如果没有匹配的选项，清空选择器
        }
    }
    
    if (editGoodEmojiSelect) {
        const goodOption = Array.from(editGoodEmojiSelect.options).find(option => option.value === config.goodEmoji);
        if (goodOption) {
            editGoodEmojiSelect.value = config.goodEmoji;
        } else {
            editGoodEmojiSelect.value = '';
        }
    }
    
    if (editPoorEmojiSelect) {
        const poorOption = Array.from(editPoorEmojiSelect.options).find(option => option.value === config.poorEmoji);
        if (poorOption) {
            editPoorEmojiSelect.value = config.poorEmoji;
        } else {
            editPoorEmojiSelect.value = '';
        }
    }
    
    closeProjectConfig();
    
    const editModal = document.getElementById('editProjectModal');
    if (editModal) {
        editModal.style.display = 'block';
        // 保持背景滚动锁定
        document.body.style.overflow = 'hidden';
    }
}

function closeEditProjectModal() {
    document.getElementById('editProjectModal').style.display = 'none';
    editingProjectIndex = -1;
    // 恢复背景滚动
    document.body.style.overflow = '';
}

// 更新项目配置
function updateProjectConfig() {
    const projectName = document.getElementById('editProjectName').value.trim();
    const excellentTime = parseInt(document.getElementById('editExcellentTime').value);
    const goodTime = parseInt(document.getElementById('editGoodTime').value);
    const poorTime = parseInt(document.getElementById('editPoorTime').value);
    
    // 使用固定的表情值
    const excellentEmoji = '😊';
    const goodEmoji = '💪';
    const poorEmoji = '😤';
    
    // 验证输入
    if (!projectName) {
        alert('请输入项目名称');
        return;
    }
    
    if (!excellentTime || !goodTime || !poorTime) {
        alert('请输入所有时间值');
        return;
    }
    
    if (excellentTime >= goodTime || goodTime >= poorTime) {
        alert('时间值必须满足：优秀时间 < 良好时间 < 需改进时间');
        return;
    }
    
    // 检查项目名称是否已存在（排除当前编辑的项目）
    const existingIndex = projectConfigs.findIndex(config => config.name === projectName && config !== projectConfigs[editingProjectIndex]);
    if (existingIndex !== -1) {
        alert('项目名称已存在，请使用其他名称');
        return;
    }
    
    // 更新项目配置
    projectConfigs[editingProjectIndex] = {
        name: projectName,
        excellentTime: excellentTime,
        goodTime: goodTime,
        poorTime: poorTime,
        excellentEmoji: excellentEmoji,
        goodEmoji: goodEmoji,
        poorEmoji: poorEmoji
    };
    
    // 保存到本地存储
    saveProjectConfigs();
    
    // 更新项目配置列表显示
    renderProjectConfigList();
    
    // 更新所有项目选择器
    updateAllProjectSelectors();
    
    // 关闭弹窗
    closeEditProjectModal();
    
    // 重置编辑索引
    editingProjectIndex = -1;
    
    alert('项目配置已更新');
}

function deleteProjectConfig(index) {
    if (confirm('确定要删除这个项目配置吗？')) {
        projectConfigs.splice(index, 1);
        saveProjectConfigs();
        renderProjectConfigList();
        
        // 更新所有项目选择器
        updateAllProjectSelectors();
    }
}

function renderProjectConfigList() {
    const container = document.querySelector('.project-config-list');
    container.innerHTML = '';
    
    if (projectConfigs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2em;">暂无项目配置，点击"添加项目"开始配置</p>';
        return;
    }
    
    projectConfigs.forEach((config, index) => {
        const item = document.createElement('div');
        item.className = 'project-config-item';
        
        item.innerHTML = `
            <div class="project-config-header">
                <div class="project-config-name">${config.name}</div>
                <div class="project-config-actions">
                    <button class="config-edit-btn" data-index="${index}">编辑</button>
                    <button class="config-delete-btn" data-index="${index}">删除</button>
                </div>
            </div>
            <div class="project-config-details">
                <div class="config-detail-item">
                    <div class="config-detail-label">优秀时间</div>
                    <div class="config-detail-value">
                        ≤ ${config.excellentTime}分钟
                        <span class="config-detail-emoji">${config.excellentEmoji}</span>
                    </div>
                </div>
                <div class="config-detail-item">
                    <div class="config-detail-label">良好时间</div>
                    <div class="config-detail-value">
                        ${config.excellentTime + 1}-${config.goodTime}分钟
                        <span class="config-detail-emoji">${config.goodEmoji}</span>
                    </div>
                </div>
                <div class="config-detail-item">
                    <div class="config-detail-label">需改进时间</div>
                    <div class="config-detail-value">
                        ${config.goodTime + 1}-${config.poorTime}分钟
                        <span class="config-detail-emoji">${config.poorEmoji}</span>
                    </div>
                </div>
                <div class="config-detail-item">
                    <div class="config-detail-label">超时时间</div>
                    <div class="config-detail-value">
                        > ${config.poorTime}分钟
                        <span class="config-detail-emoji">😤</span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
    
    // 添加事件委托监听器
    container.addEventListener('click', function(e) {
        if (e.target.classList.contains('config-edit-btn')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            console.log('编辑项目配置，索引:', index);
            editProjectConfig(index);
        } else if (e.target.classList.contains('config-delete-btn')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            console.log('删除项目配置，索引:', index);
            deleteProjectConfig(index);
        }
    });
}

function loadProjectConfigs() {
    const saved = localStorage.getItem('projectConfigs');
    if (saved) {
        projectConfigs = JSON.parse(saved);
    } else {
        // 默认配置
        projectConfigs = [
            {
                name: '数学',
                excellentTime: 30,
                goodTime: 60,
                poorTime: 120,
                excellentEmoji: '😊',
                goodEmoji: '💪',
                poorEmoji: '😤'
            },
            {
                name: '英语',
                excellentTime: 25,
                goodTime: 50,
                poorTime: 100,
                excellentEmoji: '😊',
                goodEmoji: '💪',
                poorEmoji: '😤'
            }
        ];
        saveProjectConfigs();
    }
}

function saveProjectConfigs() {
    localStorage.setItem('projectConfigs', JSON.stringify(projectConfigs));
    // 保存后更新所有项目名称选择器
    updateAllProjectSelectors();
}

// 根据项目名称和完成时间获取等级和表情
function getProjectTimeLevel(projectName, completionTimeMinutes) {
    const config = projectConfigs.find(c => c.name === projectName);
    if (!config) {
        return { level: 'unknown', emoji: '❓' };
    }
    
    if (completionTimeMinutes <= config.excellentTime) {
        return { level: 'excellent', emoji: config.excellentEmoji };
    } else if (completionTimeMinutes <= config.goodTime) {
        return { level: 'good', emoji: config.goodEmoji };
    } else if (completionTimeMinutes <= config.poorTime) {
        return { level: 'poor', emoji: config.poorEmoji };
    } else {
        return { level: 'poor', emoji: '😤' };
    }
}

// 编辑日期数据
function editDateData(index, dateStr) {
    const dateData = calendarData.get(dateStr) || [];
    if (dateData[index]) {
        const item = dateData[index];
        
        // 找到在confirmedData中的实际索引
        const actualIndex = confirmedData.findIndex(data => 
            data['日期'] === dateStr && 
            data['学习项目名称'] === item['学习项目名称'] &&
            data['项目开始时间'] === item['项目开始时间']
        );
        
        if (actualIndex !== -1) {
            editConfirmedData(actualIndex);
        }
        
        // 关闭日期数据弹窗
        document.getElementById('dateDataModal').style.display = 'none';
        document.body.style.overflow = '';
    }
}

// 删除日期数据
function deleteDateData(index, dateStr) {
    if (confirm('确定要删除这条记录吗？')) {
        const dateData = calendarData.get(dateStr) || [];
        const item = dateData[index];
        
        // 找到在confirmedData中的实际索引
        const actualIndex = confirmedData.findIndex(data => 
            data['日期'] === dateStr && 
            data['学习项目名称'] === item['学习项目名称'] &&
            data['项目开始时间'] === item['项目开始时间']
        );
        
        if (actualIndex !== -1) {
            deleteConfirmedData(actualIndex);
        }
        
        // 关闭日期数据弹窗
        document.getElementById('dateDataModal').style.display = 'none';
        document.body.style.overflow = '';
    }
}

// 更新所有项目名称选择器
function updateAllProjectSelectors() {
    console.log('更新所有项目名称选择器');
    console.log('当前项目配置:', projectConfigs);
    
    // 更新数据输入表格中的选择器
    const projectSelects = document.querySelectorAll('#dataTable select[name="学习项目名称"]');
    projectSelects.forEach(select => {
        const currentValue = select.value;
        
        // 清空现有选项（保留默认选项）
        select.innerHTML = '<option value="">请选择学习项目</option>';
        
        // 从项目配置中添加选项
        if (projectConfigs && projectConfigs.length > 0) {
            projectConfigs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.name;
                option.textContent = config.name;
                select.appendChild(option);
            });
        }
        
        // 恢复之前选中的值
        if (currentValue) {
            select.value = currentValue;
        }
    });
    
    // 更新移动端卡片中的选择器
    const mobileProjectSelects = document.querySelectorAll('.mobile-data-input[data-field="学习项目名称"]');
    mobileProjectSelects.forEach(select => {
        const currentValue = select.value;
        
        // 清空现有选项（保留默认选项）
        select.innerHTML = '<option value="">请选择学习项目</option>';
        
        // 从项目配置中添加选项
        if (projectConfigs && projectConfigs.length > 0) {
            projectConfigs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.name;
                option.textContent = config.name;
                select.appendChild(option);
            });
        }
        
        // 恢复之前选中的值
        if (currentValue) {
            select.value = currentValue;
        }
    });
    
    // 更新编辑弹窗中的选择器
    const editProjectSelect = document.getElementById('editProjectName');
    if (editProjectSelect) {
        const currentValue = editProjectSelect.value;
        
        // 清空现有选项（保留默认选项）
        editProjectSelect.innerHTML = '<option value="">请选择学习项目</option>';
        
        // 从项目配置中添加选项
        if (projectConfigs && projectConfigs.length > 0) {
            projectConfigs.forEach(config => {
                const option = document.createElement('option');
                option.value = config.name;
                option.textContent = config.name;
                editProjectSelect.appendChild(option);
            });
        }
        
        // 恢复之前选中的值
        if (currentValue) {
            editProjectSelect.value = currentValue;
        }
    }
    
    // 更新图表项目选择器
    updateProjectSelect();
    
    // 更新查询项目选择器
    updateQueryProjectSelect();
}

// 创建自定义表情选择器
function createCustomEmojiSelector(containerId, inputId, options, placeholder) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    
    if (!container || !input) return;
    
    // 检查是否已经存在自定义选择器
    const existingCustomSelect = container.querySelector('.custom-emoji-select');
    if (existingCustomSelect) {
        existingCustomSelect.remove();
    }
    
    // 创建自定义选择器容器
    const customSelect = document.createElement('div');
    customSelect.className = 'custom-emoji-select';
    customSelect.innerHTML = `
        <div class="custom-select-header">
            <span class="selected-value">${placeholder}</span>
            <svg class="select-arrow" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
            </svg>
        </div>
        <div class="custom-select-dropdown" style="display: none;">
            <div class="custom-select-options-grid">
                ${options.map(option => `
                    <div class="custom-select-option" data-value="${option.value}">
                        ${option.text}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 替换原有的select元素
    const originalSelect = container.querySelector('select');
    if (originalSelect) {
        originalSelect.style.display = 'none';
        container.insertBefore(customSelect, originalSelect);
    }
    
    // 添加事件监听器
    const header = customSelect.querySelector('.custom-select-header');
    const dropdown = customSelect.querySelector('.custom-select-dropdown');
    const selectedValue = customSelect.querySelector('.selected-value');
    const optionsList = customSelect.querySelectorAll('.custom-select-option');
    
    // 优化下拉框定位函数
    function optimizeDropdownPosition() {
        if (window.innerWidth <= 768) {
            // 移动端特殊定位处理
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // 检测是否为iPhone设备
            const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
            const isIPhone12Pro = viewportWidth === 390 && viewportHeight === 844;
            
            // 针对iPhone 12 Pro等设备的特殊处理
            let dropdownWidth, dropdownHeight;
            
            if (isIPhone12Pro || (viewportWidth <= 390 && isIPhone)) {
                // iPhone 12 Pro 等设备
                dropdownWidth = Math.min(280, viewportWidth - 40);
                dropdownHeight = Math.min(320, viewportHeight - 80);
            } else if (viewportWidth <= 390) {
                // 其他390px宽度设备
                dropdownWidth = Math.min(300, viewportWidth - 40);
                dropdownHeight = Math.min(350, viewportHeight - 80);
            } else if (viewportWidth <= 480) {
                // 其他中等屏幕设备
                dropdownWidth = Math.min(320, viewportWidth - 30);
                dropdownHeight = Math.min(400, viewportHeight - 60);
            } else {
                // 较大屏幕设备
                dropdownWidth = Math.min(350, viewportWidth - 60);
                dropdownHeight = Math.min(450, viewportHeight - 120);
            }
            
            // 计算最佳位置，确保不超出屏幕边界
            let left = Math.max(20, (viewportWidth - dropdownWidth) / 2);
            let top = Math.max(20, (viewportHeight - dropdownHeight) / 2);
            
            // 确保不超出屏幕边界
            if (left + dropdownWidth > viewportWidth - 20) {
                left = viewportWidth - dropdownWidth - 20;
            }
            if (top + dropdownHeight > viewportHeight - 20) {
                top = viewportHeight - dropdownHeight - 20;
            }
            
            // 应用优化后的位置和尺寸
            dropdown.style.left = `${left}px`;
            dropdown.style.top = `${top}px`;
            dropdown.style.transform = 'none';
            dropdown.style.width = `${dropdownWidth}px`;
            dropdown.style.maxHeight = `${dropdownHeight}px`;
            dropdown.style.right = 'auto';
            
            // 针对iPhone 12 Pro的特殊处理
            if (isIPhone12Pro || (viewportWidth <= 390 && isIPhone)) {
                dropdown.style.borderRadius = '8px';
                dropdown.style.padding = '0';
                dropdown.style.margin = '0';
                dropdown.style.webkitTransform = 'translateY(-50%)';
                dropdown.style.transform = 'translateY(-50%)';
                
                // iPhone Safari 特殊处理
                if (isIPhone) {
                    dropdown.style.webkitOverflowScrolling = 'touch';
                    dropdown.style.webkitBoxSizing = 'border-box';
                    dropdown.style.boxSizing = 'border-box';
                }
            }
            
            // 调试信息（可选）
            console.log(`设备信息: ${viewportWidth}x${viewportHeight}, iPhone: ${isIPhone}, iPhone12Pro: ${isIPhone12Pro}`);
            console.log(`下拉框尺寸: ${dropdownWidth}x${dropdownHeight}, 位置: ${left},${top}`);
        }
    }
    
    // 切换下拉框显示
    header.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isOpen = dropdown.style.display !== 'none';
        
        // 关闭所有其他下拉框
        document.querySelectorAll('.custom-select-dropdown').forEach(dd => {
            dd.style.display = 'none';
        });
        document.querySelectorAll('.custom-emoji-select').forEach(cs => {
            cs.classList.remove('open');
        });
        
        if (!isOpen) {
            dropdown.style.display = 'block';
            customSelect.classList.add('open');
            
            // 移动端特殊处理
            if (window.innerWidth <= 768) {
                // 延迟优化位置，确保DOM已更新
                setTimeout(() => {
                    optimizeDropdownPosition();
                }, 10);
                
                // 滚动到视图中
                setTimeout(() => {
                    customSelect.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 100);
            }
        } else {
            dropdown.style.display = 'none';
            customSelect.classList.remove('open');
        }
    });
    
    // 选择选项
    optionsList.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const value = this.getAttribute('data-value');
            const text = this.textContent;
            
            selectedValue.textContent = text;
            input.value = value;
            
            dropdown.style.display = 'none';
            customSelect.classList.remove('open');
            
            // 触发change事件
            const event = new Event('change', { bubbles: true });
            input.dispatchEvent(event);
        });
    });
    
    // 点击外部关闭下拉框
    document.addEventListener('click', function(e) {
        if (!customSelect.contains(e.target)) {
            dropdown.style.display = 'none';
            customSelect.classList.remove('open');
        }
    });
    
    // 窗口大小改变时重新定位
    window.addEventListener('resize', function() {
        if (dropdown.style.display !== 'none' && window.innerWidth <= 768) {
            optimizeDropdownPosition();
        }
    });
    
    // 设置初始值
    if (input.value) {
        const option = Array.from(optionsList).find(opt => opt.getAttribute('data-value') === input.value);
        if (option) {
            selectedValue.textContent = option.textContent;
        }
    }
    
    return customSelect;
}

// 初始化自定义表情选择器
function initCustomEmojiSelectors() {
    // 检查是否为移动端
    if (window.innerWidth <= 768) {
        // 优秀表情选项
        const excellentOptions = [
            { value: '😊', text: '😊 微笑' },
            { value: '😄', text: '😄 开心' },
            { value: '😃', text: '😃 大笑' },
            { value: '😁', text: '😁 咧嘴笑' },
            { value: '😆', text: '😆 眯眼笑' },
            { value: '😉', text: '😉 眨眼' },
            { value: '😋', text: '😋 吐舌' },
            { value: '😎', text: '😎 酷' },
            { value: '🤩', text: '🤩 星星眼' },
            { value: '🥳', text: '🥳 庆祝' },
            { value: '🤗', text: '🤗 拥抱' },
            { value: '👍', text: '👍 赞' },
            { value: '👏', text: '👏 鼓掌' },
            { value: '🎉', text: '🎉 庆祝' },
            { value: '⭐', text: '⭐ 星星' },
            { value: '💯', text: '💯 满分' },
            { value: '🔥', text: '🔥 火' },
            { value: '✨', text: '✨ 闪光' }
        ];
        
        // 良好表情选项
        const goodOptions = [
            { value: '💪', text: '💪 肌肉' },
            { value: '👍', text: '👍 赞' },
            { value: '👊', text: '👊 拳头' },
            { value: '🤝', text: '🤝 握手' },
            { value: '🙌', text: '🙌 举手' },
            { value: '👏', text: '👏 鼓掌' },
            { value: '😊', text: '😊 微笑' },
            { value: '😄', text: '😄 开心' },
            { value: '😃', text: '😃 大笑' },
            { value: '😁', text: '😁 咧嘴笑' },
            { value: '😆', text: '😆 眯眼笑' },
            { value: '😉', text: '😉 眨眼' },
            { value: '😋', text: '😋 吐舌' },
            { value: '😎', text: '😎 酷' },
            { value: '🤩', text: '🤩 星星眼' },
            { value: '🥳', text: '🥳 庆祝' },
            { value: '🤗', text: '🤗 拥抱' },
            { value: '🎉', text: '🎉 庆祝' },
            { value: '⭐', text: '⭐ 星星' },
            { value: '💯', text: '💯 满分' },
            { value: '🔥', text: '🔥 火' },
            { value: '✨', text: '✨ 闪光' }
        ];
        
        // 需改进表情选项
        const poorOptions = [
            { value: '😤', text: '😤 生气' },
            { value: '😞', text: '😞 失望' },
            { value: '😔', text: '😔 沮丧' },
            { value: '😟', text: '😟 担心' },
            { value: '😕', text: '😕 困惑' },
            { value: '😣', text: '😣 痛苦' },
            { value: '😖', text: '😖 困惑' },
            { value: '😫', text: '😫 疲惫' },
            { value: '😩', text: '😩 疲惫' },
            { value: '😢', text: '😢 哭泣' },
            { value: '😭', text: '😭 大哭' },
            { value: '😡', text: '😡 愤怒' },
            { value: '😠', text: '😠 生气' },
            { value: '🤬', text: '🤬 咒骂' },
            { value: '😈', text: '😈 恶魔' },
            { value: '👿', text: '👿 恶魔' },
            { value: '💀', text: '💀 骷髅' },
            { value: '☠️', text: '☠️ 骷髅' },
            { value: '💩', text: '💩 便便' },
            { value: '🤢', text: '🤢 恶心' },
            { value: '🤮', text: '🤮 呕吐' },
            { value: '😵', text: '😵 头晕' },
            { value: '🤯', text: '🤯 爆炸头' }
        ];
        
        // 创建自定义选择器
        setTimeout(() => {
            // 添加项目弹窗 - 优秀表情
            const excellentContainer = document.querySelector('#addProjectModal .form-group:nth-child(5) .emoji-input-group');
            if (excellentContainer) {
                createCustomEmojiSelector('addProjectModal', 'excellentEmoji', excellentOptions, '选择优秀表情');
            }
            
            // 添加项目弹窗 - 良好表情
            const goodContainer = document.querySelector('#addProjectModal .form-group:nth-child(6) .emoji-input-group');
            if (goodContainer) {
                createCustomEmojiSelector('addProjectModal', 'goodEmoji', goodOptions, '选择良好表情');
            }
            
            // 添加项目弹窗 - 需改进表情
            const poorContainer = document.querySelector('#addProjectModal .form-group:nth-child(7) .emoji-input-group');
            if (poorContainer) {
                createCustomEmojiSelector('addProjectModal', 'poorEmoji', poorOptions, '选择需改进表情');
            }
            
            // 编辑项目弹窗 - 优秀表情
            const editExcellentContainer = document.querySelector('#editProjectModal .form-group:nth-child(5) .emoji-input-group');
            if (editExcellentContainer) {
                createCustomEmojiSelector('editProjectModal', 'editExcellentEmoji', excellentOptions, '选择优秀表情');
            }
            
            // 编辑项目弹窗 - 良好表情
            const editGoodContainer = document.querySelector('#editProjectModal .form-group:nth-child(6) .emoji-input-group');
            if (editGoodContainer) {
                createCustomEmojiSelector('editProjectModal', 'editGoodEmoji', goodOptions, '选择良好表情');
            }
            
            // 编辑项目弹窗 - 需改进表情
            const editPoorContainer = document.querySelector('#editProjectModal .form-group:nth-child(7) .emoji-input-group');
            if (editPoorContainer) {
                createCustomEmojiSelector('editProjectModal', 'editPoorEmoji', poorOptions, '选择需改进表情');
            }
        }, 100);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    loadProjectConfigs();
});

// 显示添加项目弹窗
function showAddProjectModal() {
    document.getElementById('addProjectModal').style.display = 'block';
    document.getElementById('addProjectForm').reset();
}

// 显示编辑项目弹窗
function showEditProjectModal(projectName) {
    const project = projectConfigs.find(p => p.name === projectName);
    if (project) {
        document.getElementById('editProjectName').value = project.name;
        document.getElementById('editExcellentTime').value = project.excellentTime;
        document.getElementById('editGoodTime').value = project.goodTime;
        document.getElementById('editPoorTime').value = project.poorTime;
        document.getElementById('editProjectModal').style.display = 'block';
    }
}

// 暗黑/明亮模式切换
(function() {
  const btn = document.getElementById('toggleThemeBtn');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  function setTheme(dark) {
    if (dark) {
      document.body.classList.add('dark-mode');
      btn.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      btn.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    }
  }
  // 初始化
  let theme = localStorage.getItem('theme');
  if (!theme) theme = prefersDark ? 'dark' : 'light';
  setTheme(theme === 'dark');
  btn.addEventListener('click', function() {
    setTheme(!document.body.classList.contains('dark-mode'));
  });
})();

// 初始化分页和查询功能
function initPaginationAndQuery() {
    // 初始化分页和查询变量
    if (typeof filteredData === 'undefined') {
        filteredData = [...confirmedData];
    }
    if (typeof queryFilters === 'undefined') {
        queryFilters = {
            startDate: '',
            endDate: '',
            project: ''
        };
    }
    
    // 绑定查询按钮事件
    document.getElementById('queryBtn').addEventListener('click', performQuery);
    document.getElementById('resetQueryBtn').addEventListener('click', resetQuery);
    
    // 绑定分页按钮事件
    document.getElementById('firstPageBtn').addEventListener('click', () => goToPage(1));
    document.getElementById('prevPageBtn').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPageBtn').addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPageBtn').addEventListener('click', () => goToPage(getTotalPages()));
    
    // 绑定每页显示数量变化事件
    document.getElementById('pageSizeSelect').addEventListener('change', function() {
        pageSize = parseInt(this.value);
        currentPage = 1;
        updatePagination();
        renderCurrentPage();
    });
    
    // 初始化查询项目选择器
    updateQueryProjectSelect();
    
    // 初始化过滤数据
    filterData();
    
    // 初始化分页
    updatePagination();
}

// 更新查询项目选择器
function updateQueryProjectSelect() {
    const queryProjectSelect = document.getElementById('queryProject');
    if (!queryProjectSelect) return;
    
    // 清空现有选项（保留"全部项目"）
    queryProjectSelect.innerHTML = '<option value="">全部项目</option>';
    
    // 添加项目选项
    if (projectConfigs && projectConfigs.length > 0) {
        projectConfigs.forEach(config => {
            const option = document.createElement('option');
            option.value = config.name;
            option.textContent = config.name;
            queryProjectSelect.appendChild(option);
        });
    }
}

// 执行查询
function performQuery() {
    const startDate = document.getElementById('queryStartDate').value;
    const endDate = document.getElementById('queryEndDate').value;
    const project = document.getElementById('queryProject').value;
    
    // 更新查询过滤器
    queryFilters = {
        startDate: startDate,
        endDate: endDate,
        project: project
    };
    
    // 过滤数据
    filterData();
    
    // 重置到第一页
    currentPage = 1;
    
    // 更新显示
    updatePagination();
    renderCurrentPage();
    updateQuerySummary();
}

// 重置查询
function resetQuery() {
    // 清空查询条件
    document.getElementById('queryStartDate').value = '';
    document.getElementById('queryEndDate').value = '';
    document.getElementById('queryProject').value = '';
    
    // 重置查询过滤器
    queryFilters = {
        startDate: '',
        endDate: '',
        project: ''
    };
    
    // 重新过滤数据
    filterData();
    
    // 重置到第一页
    currentPage = 1;
    
    // 更新显示
    updatePagination();
    renderCurrentPage();
    updateQuerySummary();
}

// 过滤数据
function filterData() {
    console.log('filterData被调用');
    console.log('confirmedData长度:', confirmedData.length);
    console.log('queryFilters:', queryFilters);
    
    filteredData = confirmedData.filter(item => {
        // 日期过滤
        if (queryFilters.startDate && item['日期'] < queryFilters.startDate) {
            return false;
        }
        if (queryFilters.endDate && item['日期'] > queryFilters.endDate) {
            return false;
        }
        
        // 项目过滤
        if (queryFilters.project && item['学习项目名称'] !== queryFilters.project) {
            return false;
        }
        
        return true;
    });
    
    console.log('过滤后的filteredData长度:', filteredData.length);
}

// 更新查询结果摘要
function updateQuerySummary() {
    const queryResultCount = document.getElementById('queryResultCount');
    if (queryResultCount) {
        queryResultCount.textContent = `共 ${filteredData.length} 条记录`;
    }
}

// 获取总页数
function getTotalPages() {
    return Math.ceil(filteredData.length / pageSize);
}

// 更新分页控制
function updatePagination() {
    const totalPages = getTotalPages();
    const totalItems = filteredData.length;
    
    // 更新分页信息
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationCount = document.getElementById('paginationCount');
    
    if (paginationInfo) {
        paginationInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
    }
    
    if (paginationCount) {
        const startIndex = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
        const endIndex = Math.min(currentPage * pageSize, totalItems);
        paginationCount.textContent = `显示 ${startIndex}-${endIndex} 条，共 ${totalItems} 条`;
    }
    
    // 更新按钮状态
    const firstPageBtn = document.getElementById('firstPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const lastPageBtn = document.getElementById('lastPageBtn');
    
    if (firstPageBtn) firstPageBtn.disabled = currentPage <= 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    if (lastPageBtn) lastPageBtn.disabled = currentPage >= totalPages;
    
    // 生成页码按钮
    generatePageNumbers(totalPages);
}

// 生成页码按钮
function generatePageNumbers(totalPages) {
    const pageNumbersContainer = document.getElementById('pageNumbers');
    if (!pageNumbersContainer) return;
    
    pageNumbersContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 调整起始页
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 添加第一页和省略号
    if (startPage > 1) {
        addPageNumberButton(1);
        if (startPage > 2) {
            addEllipsis();
        }
    }
    
    // 添加页码按钮
    for (let i = startPage; i <= endPage; i++) {
        addPageNumberButton(i);
    }
    
    // 添加最后一页和省略号
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        addPageNumberButton(totalPages);
    }
}

// 添加页码按钮
function addPageNumberButton(pageNum) {
    const pageNumbersContainer = document.getElementById('pageNumbers');
    if (!pageNumbersContainer) return;
    
    const button = document.createElement('button');
    button.className = 'page-number-btn';
    button.textContent = pageNum;
    
    if (pageNum === currentPage) {
        button.classList.add('active');
    }
    
    button.addEventListener('click', () => goToPage(pageNum));
    pageNumbersContainer.appendChild(button);
}

// 添加省略号
function addEllipsis() {
    const pageNumbersContainer = document.getElementById('pageNumbers');
    if (!pageNumbersContainer) return;
    
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-ellipsis';
    ellipsis.textContent = '...';
    ellipsis.style.cssText = 'padding: 8px 4px; color: var(--text-secondary); font-weight: 500;';
    pageNumbersContainer.appendChild(ellipsis);
}

// 跳转到指定页
function goToPage(pageNum) {
    const totalPages = getTotalPages();
    if (pageNum < 1 || pageNum > totalPages) return;
    
    currentPage = pageNum;
    updatePagination();
    renderCurrentPage();
}

// 渲染当前页数据
function renderCurrentPage() {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // 更新表格
    updateConfirmedDataTableWithData(pageData);
    
    // 更新移动端卡片
    updateMobileConfirmedDataCardsWithData(pageData);
}

// 使用指定数据更新表格
function updateConfirmedDataTableWithData(data) {
    const tbody = document.querySelector('#confirmedDataTable tbody');
    if (!tbody) return;
    
    console.log('updateConfirmedDataTableWithData被调用，数据长度:', data.length);
    console.log('当前页:', currentPage, '页面大小:', pageSize);
    
    tbody.innerHTML = '';
    
    data.forEach((item, index) => {
        // 计算在filteredData中的实际索引
        const actualIndex = (currentPage - 1) * pageSize + index;
        console.log(`第${index}行，实际索引: ${actualIndex}`);
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="confirmed-data-cell">${item['日期'] || '-'}</td>
            <td class="confirmed-data-cell">${item['学习项目名称'] || '-'}</td>
            <td class="confirmed-data-cell">${formatTimeDisplay(item['项目开始时间']) || '-'}</td>
            <td class="confirmed-data-cell">${formatTimeDisplay(item['项目结束时间']) || '-'}</td>
            <td class="confirmed-data-cell">${item['项目完成时间'] || '-'}</td>
            <td class="action-buttons">
                <button class="edit-btn" onclick="console.log('编辑按钮被点击，索引:', ${actualIndex}); editConfirmedData(${actualIndex});">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.5-.5V9h-.5a.5.5 0 0 1-.5-.5V8h-.5a.5.5 0 0 1-.5-.5V7h-.5a.5.5 0 0 1-.5-.5V6H1a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H1v1h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H1v1h1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H1a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-13z"/>
                    </svg>
                    编辑
                </button>
                <button class="confirmed-delete-btn" onclick="console.log('删除按钮被点击，索引:', ${actualIndex}); deleteConfirmedData(${actualIndex});">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                    删除
                </button>
            </td>
        `;
        
        // 为按钮添加事件监听器作为备用方案
        const editBtn = row.querySelector('.edit-btn');
        const deleteBtn = row.querySelector('.confirmed-delete-btn');
        
        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                console.log('编辑按钮通过addEventListener被点击，索引:', actualIndex);
                e.preventDefault();
                editConfirmedData(actualIndex);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                console.log('删除按钮通过addEventListener被点击，索引:', actualIndex);
                e.preventDefault();
                deleteConfirmedData(actualIndex);
            });
        }
    });
}

// 使用指定数据更新移动端卡片
function updateMobileConfirmedDataCardsWithData(data) {
    const mobileContainer = document.getElementById('mobileConfirmedDataCards');
    if (!mobileContainer) return;
    
    mobileContainer.innerHTML = '';
    
    data.forEach((item, index) => {
        // 计算在filteredData中的实际索引
        const actualIndex = (currentPage - 1) * pageSize + index;
        const card = createMobileDataCard(item, actualIndex, true);
        mobileContainer.appendChild(card);
    });
}

// 重写原有的updateConfirmedDataTable函数以支持分页
function updateConfirmedDataTable() {
    // 重新过滤数据
    filterData();
    
    // 确保当前页有效
    const totalPages = getTotalPages();
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    
    // 更新显示
    updatePagination();
    renderCurrentPage();
    updateQuerySummary();
}

// 在页面加载完成后初始化分页和查询功能
document.addEventListener('DOMContentLoaded', function() {
    // 初始化分页和查询功能
    initPaginationAndQuery();
    
    // 在数据加载完成后更新显示
    setTimeout(() => {
        updateConfirmedDataTable();
    }, 100);
});
