// 学习记录管理
class SessionsManager {
    constructor() {
        this.records = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.limit = 10;
        this.totalRecords = 0;
        this.currentDate = new Date();
        this.calendarData = {};
        this.selectedDate = null;
        this.isMobile = window.innerWidth < 768;
        this.chart = null;
        this.analyticsData = {};
        
        this.init();
    }

    init() {
        console.log('=== SessionsManager 初始化开始 ===');
        
        // 绑定事件监听器
        this.bindEvents();
        
        // 初始化日历
        this.initCalendar();
        this.loadRecords();
        this.loadCalendarData();
        this.loadProjects(); // 加载项目列表

        // 新增：自动加载统计和图表
        this.loadAnalytics();
        this.setupChart();
        
        // 监听项目列表更新事件
        window.addEventListener('projectListUpdated', (event) => {
            console.log('收到项目列表更新事件:', event.detail);
            this.loadProjects(); // 自动刷新项目选择器
        });

        console.log('=== 事件绑定完成 ===');
    }

    bindEvents() {
        console.log('=== 开始绑定事件 ===');
        
        // 移动端事件绑定
        const mobileStartTime = document.getElementById('inputStartTime');
        const mobileEndTime = document.getElementById('inputEndTime');
        const mobileAddBtn = document.getElementById('addRecordBtn');
        
        if (mobileStartTime && !mobileStartTime.hasAttribute('data-events-bound')) {
            mobileStartTime.addEventListener('change', () => this.calculateDuration('input'));
            mobileStartTime.addEventListener('input', () => this.calculateDuration('input'));
            mobileStartTime.setAttribute('data-events-bound', 'true');
            console.log('移动端开始时间事件已绑定');
        }
        
        if (mobileEndTime && !mobileEndTime.hasAttribute('data-events-bound')) {
            mobileEndTime.addEventListener('change', () => this.calculateDuration('input'));
            mobileEndTime.addEventListener('input', () => this.calculateDuration('input'));
            mobileEndTime.setAttribute('data-events-bound', 'true');
            console.log('移动端结束时间事件已绑定');
        }
        
        if (mobileAddBtn && !mobileAddBtn.hasAttribute('data-events-bound')) {
            mobileAddBtn.addEventListener('click', () => this.addRecord('mobile'));
            mobileAddBtn.setAttribute('data-events-bound', 'true');
            console.log('移动端添加按钮事件已绑定');
        }
        
        // 桌面端事件绑定
        const desktopElements = {
            startTime: document.getElementById('inputStartTimeDesktop'),
            endTime: document.getElementById('inputEndTimeDesktop'),
            addBtn: document.getElementById('addRecordBtnDesktop'),
            projectSelect: document.getElementById('inputProjectDesktop')
        };
        
        console.log('桌面端元素检查:', desktopElements);
        
        // 如果桌面端元素不存在，延迟重试
        if (!desktopElements.startTime || !desktopElements.endTime || !desktopElements.addBtn) {
            console.log('桌面端元素未找到，将在500ms后重试...');
            setTimeout(() => {
                this.bindDesktopEvents();
            }, 500);
        } else {
            this.bindDesktopEvents();
        }
        
        // 移动端项目选择事件
        const mobileProjectSelect = document.getElementById('inputProject');
        if (mobileProjectSelect && !mobileProjectSelect.hasAttribute('data-events-bound')) {
            mobileProjectSelect.addEventListener('change', (e) => this.handleProjectChange(e, 'input'));
            mobileProjectSelect.setAttribute('data-events-bound', 'true');
        }
        
        // 图表选择器事件绑定
        this.bindChartEvents();
        
        // 编辑弹窗事件绑定
        this.bindEditModalEvents();
        
        console.log('=== 事件绑定完成 ===');
    }

    bindEditModalEvents() {
        console.log('=== 绑定编辑弹窗事件 ===');
        
        // 关闭按钮事件
        const closeBtn = document.getElementById('closeEditModalBtn');
        if (closeBtn && !closeBtn.hasAttribute('data-events-bound')) {
            closeBtn.addEventListener('click', () => {
                console.log('关闭按钮点击');
                this.closeEditModal();
            });
            closeBtn.setAttribute('data-events-bound', 'true');
            console.log('关闭按钮事件已绑定');
        }
        
        // 保存按钮事件
        const saveBtn = document.getElementById('saveEditBtn');
        if (saveBtn && !saveBtn.hasAttribute('data-events-bound')) {
            saveBtn.addEventListener('click', () => {
                console.log('保存按钮点击');
                this.saveEdit();
            });
            saveBtn.setAttribute('data-events-bound', 'true');
            console.log('保存按钮事件已绑定');
        }
        
        // 取消按钮事件
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn && !cancelBtn.hasAttribute('data-events-bound')) {
            cancelBtn.addEventListener('click', () => {
                console.log('取消按钮点击');
                this.closeEditModal();
            });
            cancelBtn.setAttribute('data-events-bound', 'true');
            console.log('取消按钮事件已绑定');
        }
        
        // 编辑弹窗项目选择事件
        const editProject = document.getElementById('editProject');
        if (editProject && !editProject.hasAttribute('data-events-bound')) {
            editProject.addEventListener('change', (e) => {
                console.log('编辑弹窗项目选择改变');
                this.handleProjectChange(e, 'edit');
            });
            editProject.setAttribute('data-events-bound', 'true');
        }
        
        // 编辑弹窗时间计算事件
        const editStartTime = document.getElementById('editStartTime');
        const editEndTime = document.getElementById('editEndTime');
        
        if (editStartTime && !editStartTime.hasAttribute('data-events-bound')) {
            editStartTime.addEventListener('change', () => {
                console.log('编辑弹窗开始时间改变');
                this.calculateDuration('edit');
            });
            editStartTime.setAttribute('data-events-bound', 'true');
        }
        
        if (editEndTime && !editEndTime.hasAttribute('data-events-bound')) {
            editEndTime.addEventListener('change', () => {
                console.log('编辑弹窗结束时间改变');
                this.calculateDuration('edit');
            });
            editEndTime.setAttribute('data-events-bound', 'true');
        }
        
        // 阻止表单提交事件
        const editForm = document.getElementById('editForm');
        if (editForm && !editForm.hasAttribute('data-events-bound')) {
            editForm.addEventListener('submit', (e) => {
                console.log('表单提交事件被阻止');
                e.preventDefault();
                e.stopPropagation();
                return false;
            });
            editForm.setAttribute('data-events-bound', 'true');
            console.log('表单提交事件已阻止');
        }
        
        // ESC键关闭弹窗 - 全局事件，只绑定一次
        if (!document.body.hasAttribute('data-esc-events-bound')) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('editModal');
                if (modal && !modal.classList.contains('hidden')) {
                    console.log('ESC键关闭弹窗');
                    this.closeEditModal();
                }
            }
        });
            document.body.setAttribute('data-esc-events-bound', 'true');
        }
        
        // 点击背景关闭弹窗 - 已禁用，防止误操作
        const modal = document.getElementById('editModal');
        if (modal && !modal.hasAttribute('data-events-bound')) {
            // modal.addEventListener('click', (e) => {
            //     if (e.target === modal) {
            //         console.log('点击背景关闭弹窗');
            //         this.closeEditModal();
            //     }
            // });
            modal.setAttribute('data-events-bound', 'true');
        }
        
        console.log('=== 编辑弹窗事件绑定完成 ===');
    }

    handleProjectChange(event, prefix) {
        const projectSelect = event.target;
        
        // 编辑弹窗不需要处理自定义输入框
        if (prefix === 'edit') {
            console.log(`编辑弹窗项目选择: ${projectSelect.value}`);
            return;
        }
        
        const customInput = document.getElementById(`${prefix}ProjectCustom`);
        
        if (!customInput) {
            console.warn(`Custom input for prefix '${prefix}' not found`);
            return;
        }
        
        if (projectSelect.value === '其他') {
            customInput.classList.remove('hidden');
            customInput.required = true;
            console.log(`Showing custom input for ${prefix}`);
        } else {
            customInput.classList.add('hidden');
            customInput.required = false;
            customInput.value = '';
            console.log(`Hiding custom input for ${prefix}`);
        }
    }

    calculateDuration(prefix) {
        console.log(`=== 计算时长开始 ===`);
        console.log(`前缀: ${prefix}`);
        console.log(`调用时间: ${new Date().toLocaleString()}`);
        
        let startTimeInput, endTimeInput, durationInput;
        
        if (prefix === 'inputDesktop') {
            // 桌面端使用 Desktop 后缀的ID
            startTimeInput = document.getElementById('inputStartTimeDesktop');
            endTimeInput = document.getElementById('inputEndTimeDesktop');
            durationInput = document.getElementById('inputDurationDesktop');
            console.log('使用桌面端元素ID');
        } else if (prefix === 'input') {
            // 移动端使用标准ID
            startTimeInput = document.getElementById('inputStartTime');
            endTimeInput = document.getElementById('inputEndTime');
            durationInput = document.getElementById('inputDuration');
            console.log('使用移动端元素ID');
        } else if (prefix === 'edit') {
            // 编辑弹窗
            startTimeInput = document.getElementById('editStartTime');
            endTimeInput = document.getElementById('editEndTime');
            durationInput = document.getElementById('editDuration');
            console.log('使用编辑弹窗元素ID');
        } else {
            console.error(`未知的前缀: ${prefix}`);
            return;
        }

        console.log(`开始时间元素:`, startTimeInput);
        console.log(`结束时间元素:`, endTimeInput);
        console.log(`时长元素:`, durationInput);

        if (!startTimeInput || !endTimeInput || !durationInput) {
            console.error(`缺少必需元素: ${prefix === 'inputDesktop' ? 'Desktop后缀' : prefix === 'input' ? '标准ID' : '编辑弹窗'}`);
            return;
        }

        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        console.log(`开始时间值: ${startTime}`);
        console.log(`结束时间值: ${endTime}`);

        if (!startTime || !endTime) {
            durationInput.value = '';
            console.log('开始时间或结束时间为空，跳过计算');
            return;
        }

        try {
            if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
                durationInput.value = '';
                console.warn('时间格式不正确');
                return;
            }
            const [startHour, startMinute] = startTime.split(':').map(Number);
            const [endHour, endMinute] = endTime.split(':').map(Number);
            if (
                isNaN(startHour) || isNaN(startMinute) ||
                isNaN(endHour) || isNaN(endMinute)
            ) {
                durationInput.value = '';
                console.warn('时间解析失败');
                return;
            }
            let diffMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
            console.log(`计算出的分钟差: ${diffMinutes}`);
            if (diffMinutes > 0) {
                durationInput.value = diffMinutes;
                console.log(`设置时长值: ${diffMinutes}`);
            } else {
                durationInput.value = '';
                console.log('结束时间必须晚于开始时间');
            }
        } catch (error) {
            console.error('计算时长时出错:', error);
            durationInput.value = '';
        }
        
        console.log(`=== 计算时长结束 ===`);
    }

    async addRecord(type = 'mobile') {
        console.log(`Adding record for type: ${type}`);
        
        let date, projectSelect, projectCustom, startTime, endTime, duration;

        if (type === 'mobile') {
            date = document.getElementById('inputDate')?.value;
            projectSelect = document.getElementById('inputProject');
            projectCustom = document.getElementById('inputProjectCustom');
            startTime = document.getElementById('inputStartTime')?.value;
            endTime = document.getElementById('inputEndTime')?.value;
            duration = document.getElementById('inputDuration')?.value;
        } else {
            date = document.getElementById('inputDateDesktop')?.value;
            projectSelect = document.getElementById('inputProjectDesktop');
            projectCustom = document.getElementById('inputProjectCustomDesktop');
            startTime = document.getElementById('inputStartTimeDesktop')?.value;
            endTime = document.getElementById('inputEndTimeDesktop')?.value;
            duration = document.getElementById('inputDurationDesktop')?.value;
        }

        console.log('Form data:', { date, startTime, endTime, duration });

        // 确定项目名称
        let projectName = projectSelect?.value || '';
        if (projectName === '其他') {
            projectName = projectCustom?.value?.trim() || '';
        }

        if (!date || !projectName || !startTime || !endTime || !duration) {
            alert('请填写所有必填字段');
            console.warn('Missing required fields');
            return;
        }

        // 只允许数字
        const durationMinutes = parseInt(duration);
        if (isNaN(durationMinutes) || durationMinutes <= 0) {
            alert('学习时长无效，请重新填写');
            return;
        }

        try {
            const response = await fetch('/api/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studyDate: date,
                    projectName,
                    startTime,
                    endTime,
                    duration: durationMinutes
                })
            });

            if (response.ok) {
                console.log('记录添加成功，开始刷新数据...');
                
                // 清空表单
                this.clearForm(type);
                
                // 立即刷新记录列表
                await this.loadRecords();
                
                // 刷新日历数据
                await this.loadCalendarData();
                
                // 加载分析数据
                await this.loadAnalytics();
                
                // 加载图表数据
                await this.loadChartData();
                
                console.log('数据刷新完成');
                alert('学习记录添加成功！');
            } else {
                const error = await response.json();
                alert(`添加失败: ${error.message}`);
            }
        } catch (error) {
            console.error('Add record error:', error);
            alert('添加记录失败，请重试');
        }
    }

    clearForm(type = 'mobile') {
        // 设置今天日期，避免时区偏移
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        if (type === 'mobile') {
            document.getElementById('inputDate').value = todayStr;
            document.getElementById('inputProject').value = '';
            document.getElementById('inputProjectCustom').value = '';
            document.getElementById('inputProjectCustom').classList.add('hidden');
            document.getElementById('inputStartTime').value = '';
            document.getElementById('inputEndTime').value = '';
            document.getElementById('inputDuration').value = '';
        } else {
            document.getElementById('inputDateDesktop').value = todayStr;
            document.getElementById('inputProjectDesktop').value = '';
            document.getElementById('inputProjectCustomDesktop').value = '';
            document.getElementById('inputProjectCustomDesktop').classList.add('hidden');
            document.getElementById('inputStartTimeDesktop').value = '';
            document.getElementById('inputEndTimeDesktop').value = '';
            document.getElementById('inputDurationDesktop').value = '';
        }
        
        console.log(`Form cleared for type: ${type}`);
    }

    async loadRecords() {
        try {
            console.log('开始加载学习记录...');
            
            const response = await fetch(`/api/sessions?page=${this.currentPage}&limit=${this.limit}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            console.log('加载到的数据:', data);
            
            this.records = data.sessions || [];
            this.totalRecords = data.total || 0;
            this.totalPages = data.totalPages || 0;
            
            console.log(`成功加载 ${this.records.length} 条记录，总计 ${this.totalRecords} 条`);
            
            // 渲染记录
            this.renderRecordsTable();
            this.renderMobileCards();
            this.renderDesktopTable();
            
            // 加载日历数据
            await this.loadCalendarData();
            
        } catch (error) {
            console.error('加载学习记录失败:', error);
            
            // 显示错误信息
            const errorMessage = document.createElement('div');
            errorMessage.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
            errorMessage.innerHTML = `
                <strong>加载失败!</strong> 
                <span>无法加载学习记录，请检查网络连接或刷新页面重试。</span>
                <button onclick="location.reload()" class="ml-2 text-red-600 hover:text-red-800 underline">刷新页面</button>
            `;
            
            // 插入到页面顶部
            const container = document.querySelector('#sessionsContainer') || document.body;
            container.insertBefore(errorMessage, container.firstChild);
            
            // 5秒后自动重试
            setTimeout(() => {
                console.log('5秒后自动重试加载数据...');
                this.loadRecords();
            }, 5000);
        }
    }

    renderRecordsTable() {
        const container = document.getElementById('recordsTableContainer');
        console.log('renderRecordsTable called');
        console.log('Records count:', this.records.length);
        console.log('Is mobile:', this.isMobile);
        console.log('Container:', container);
        
        // 检查容器是否存在
        if (!container) {
            console.error('recordsTableContainer 元素未找到，无法渲染表格');
            return;
        }
        
        if (this.records.length === 0) {
            console.log('No records, showing empty state');
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span class="text-2xl">📝</span>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无学习记录</h3>
                    <p class="text-gray-500 dark:text-gray-400">开始添加你的第一条学习记录吧！</p>
                </div>
            `;
            return;
        }

        if (this.isMobile) {
            console.log('Rendering mobile cards');
            container.innerHTML = this.renderMobileCards();
        } else {
            console.log('Rendering desktop table');
            const tableHTML = this.renderDesktopTable();
            console.log('Table HTML length:', tableHTML.length);
            console.log('Table HTML preview:', tableHTML.substring(0, 200) + '...');
            container.innerHTML = tableHTML;
        }

        this.renderPagination();
    }

    renderMobileCards() {
        const formatDate = (dateStr) => {
            if (!dateStr) return '未知日期';
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toISOString().split('T')[0];
        };
        const cards = this.records.map(record => `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-600">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <div class="flex items-center mb-2">
                            <span class="text-sm font-medium text-gray-900 dark:text-white">${record.project_name || '未知项目'}</span>
                            <span class="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                                ${record.duration || 0}分钟
                            </span>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            ${formatDate(record.study_date)} · ${record.start_time_new || '--:--'} - ${record.end_time_new || '--:--'}
                        </div>
                    </div>
                    <div class="flex-shrink-0 flex flex-col items-end space-y-2">
                        <button onclick="sessionsManager.editRecord(${record.id})" class="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 p-1 rounded transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="sessionsManager.deleteRecord(${record.id})" class="text-red-600 hover:text-red-800 dark:hover:text-red-400 p-1 rounded transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ${record.notes ? record.notes : ''}
                </div>
            </div>
        `).join('');
        return cards;
    }

    renderDesktopTable() {
        console.log('renderDesktopTable called');
        console.log('Records to render:', this.records);
        
        const formatDate = (dateStr) => {
            if (!dateStr) return '未知日期';
            // 兼容 YYYY-MM-DD、YYYY-MM-DDTHH:mm:ss.sssZ 等
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return d.toISOString().split('T')[0];
        };
        
        const rows = this.records.map(record => `
            <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td class="py-4 px-6 text-sm text-gray-900 dark:text-white text-center">${formatDate(record.study_date)}</td>
                <td class="py-4 px-6 text-sm text-gray-900 dark:text-white text-center">${record.project_name || '未知项目'}</td>
                <td class="py-4 px-6 text-sm text-gray-900 dark:text-white text-center">${record.start_time_new || '--:--'}</td>
                <td class="py-4 px-6 text-sm text-gray-900 dark:text-white text-center">${record.end_time_new || '--:--'}</td>
                <td class="py-4 px-6 text-sm text-gray-900 dark:text-white text-center font-medium">${record.duration || 0}分钟</td>
                <td class="py-4 px-6 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <button onclick="sessionsManager.editRecord(${record.id})" 
                                class="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 p-1 rounded transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="sessionsManager.deleteRecord(${record.id})" 
                                class="text-red-600 hover:text-red-800 dark:hover:text-red-400 p-1 rounded transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        console.log('Generated rows HTML length:', rows.length);
        console.log('Rows HTML preview:', rows.substring(0, 200) + '...');

        const tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr class="border-b border-gray-200 dark:border-gray-700">
                            <th class="text-center py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">日期</th>
                            <th class="text-center py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">项目</th>
                            <th class="text-center py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">开始时间</th>
                            <th class="text-center py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">结束时间</th>
                            <th class="text-center py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">时长</th>
                            <th class="text-center py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800">
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

        console.log('Final table HTML length:', tableHTML.length);
        console.log('Table HTML contains thead:', tableHTML.includes('<thead>'));
        console.log('Table HTML contains th:', tableHTML.includes('<th'));
        
        return tableHTML;
    }

    renderPagination() {
        console.log('=== 渲染分页 ===');
        console.log('总记录数:', this.totalRecords);
        console.log('页面大小:', this.limit);
        console.log('当前页码:', this.currentPage);
        
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        console.log('计算出的总页数:', totalPages);
        
        if (totalPages <= 1) {
            console.log('只有一页或没有记录，不显示分页');
            return;
        }

        const container = document.getElementById('recordsTableContainer');
        if (!container) {
            console.error('recordsTableContainer 元素未找到，无法渲染分页');
            return;
        }
        
        const pagination = document.createElement('div');
        pagination.className = 'mt-6 flex items-center justify-between';
        pagination.innerHTML = `
            <div class="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <span>共 ${this.totalRecords} 条记录，第 ${this.currentPage} / ${totalPages} 页</span>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="sessionsManager.changePage(${this.currentPage - 1})" 
                        ${this.currentPage <= 1 ? 'disabled' : ''}
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600">
                    上一页
                </button>
                <button onclick="sessionsManager.changePage(${this.currentPage + 1})" 
                        ${this.currentPage >= totalPages ? 'disabled' : ''}
                        class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600">
                    下一页
                </button>
            </div>
        `;
        container.appendChild(pagination);
        console.log('分页渲染完成');
    }

    changePage(page) {
        const totalPages = Math.ceil(this.totalRecords / this.limit);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.loadRecords();
    }

    async editRecord(id) {
        console.log('编辑记录，ID:', id);
        
        try {
            // 通过 API 获取记录详情，而不是从 this.records 中查找
            const response = await fetch(`/api/sessions/${id}`);
            const data = await response.json();
            
            if (!response.ok) {
                alert(`获取记录失败: ${data.message}`);
                return;
            }
            
            const record = data.session;
            
            document.getElementById('editRecordId').value = record.id;
            document.getElementById('editDate').value = record.study_date || '';
            
            // 修复时间格式：确保时间字段格式为 HH:MM
            let startTime = record.start_time_new || record.start_time || '';
            let endTime = record.end_time_new || record.end_time || '';
            
            // 如果时间包含秒数，去掉秒数部分
            if (startTime && startTime.includes(':')) {
                startTime = startTime.split(':').slice(0, 2).join(':');
            }
            if (endTime && endTime.includes(':')) {
                endTime = endTime.split(':').slice(0, 2).join(':');
            }
            
            document.getElementById('editStartTime').value = startTime;
            document.getElementById('editEndTime').value = endTime;
            document.getElementById('editDuration').value = `${record.duration || 0}分钟`;

            const projectSelect = document.getElementById('editProject');
            
            // 设置项目选择器的值
            projectSelect.value = record.project_name || '';

            document.getElementById('editModal').classList.remove('hidden');
            
            // 关闭日历详情弹窗
            this.hideCalendarDetailModal();
            
        } catch (error) {
            console.error('获取记录详情失败:', error);
            alert('获取记录详情失败，请重试');
        }
    }

    async saveEdit() {
        const id = document.getElementById('editRecordId').value;
        const date = document.getElementById('editDate').value;
        const projectSelect = document.getElementById('editProject');
        const startTime = document.getElementById('editStartTime').value;
        const endTime = document.getElementById('editEndTime').value;
        const duration = document.getElementById('editDuration').value;

        let projectName = projectSelect.value;

        if (!date || !projectName || !startTime || !endTime || !duration) {
            alert('请填写所有必填字段');
            return;
        }

        // 修复时长解析逻辑
        let durationMinutes;
        if (duration.includes('分钟')) {
            durationMinutes = parseInt(duration.replace('分钟', ''));
        } else {
            durationMinutes = parseInt(duration);
        }

        if (isNaN(durationMinutes) || durationMinutes <= 0) {
            alert('学习时长无效，请重新填写');
            return;
        }

        // 验证时间格式
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            alert('时间格式不正确，请使用 HH:MM 格式');
            return;
        }

        // 验证日期格式
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            alert('日期格式不正确，请使用 YYYY-MM-DD 格式');
            return;
        }

        const requestData = {
            studyDate: date,
            projectName: projectName,
            startTime: startTime,
            endTime: endTime,
            duration: durationMinutes
        };

        console.log('发送编辑数据:', requestData);

        try {
            const response = await fetch(`/api/sessions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            const responseData = await response.json();
            console.log('编辑响应:', responseData);

            if (response.ok) {
                this.closeEditModal();
                this.loadRecords();
                // 刷新日历数据
                this.loadCalendarData();
                // 加载分析数据
                await this.loadAnalytics();
                // 加载图表数据
                await this.loadChartData();
                alert('记录更新成功！');
            } else {
                // 修复错误信息显示
                let errorMessage = '更新失败';
                if (responseData.error) {
                    errorMessage = responseData.error;
                }
                if (responseData.details && responseData.details.length > 0) {
                    errorMessage += ': ' + responseData.details.map(d => d.msg).join(', ');
                }
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Update record error:', error);
            alert('更新记录失败，请重试');
        }
    }

    closeEditModal() {
        document.getElementById('editModal').classList.add('hidden');
        document.getElementById('editForm').reset();
    }

    async deleteRecord(id) {
        const confirmed = await this.showConfirmDialog(
            '删除学习记录',
            '确定要删除这条学习记录吗？此操作不可恢复。',
            '删除',
            '取消'
        );
        
        if (!confirmed) return;

        try {
            const response = await fetch(`/api/sessions/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // 刷新记录列表
                this.loadRecords();
                // 刷新日历数据
                this.loadCalendarData();
                // 关闭日历详情弹窗
                this.hideCalendarDetailModal();
                // 加载分析数据
                await this.loadAnalytics();
                // 加载图表数据
                await this.loadChartData();
                this.showToast('记录删除成功！', 'success');
            } else {
                const errorData = await response.json();
                // 修复错误信息显示
                const errorMessage = errorData.error || errorData.message || '删除失败';
                this.showToast(`删除失败: ${errorMessage}`, 'error');
            }
        } catch (error) {
            console.error('Delete record error:', error);
            this.showToast('删除记录失败，请重试', 'error');
        }
    }

    // 初始化日历
    initCalendar() {
        console.log('初始化日历...');
        
        // 绑定日历导航事件
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', () => this.changeMonth(-1));
        }
        
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', () => this.changeMonth(1));
        }
        
        // 立即渲染日历，然后加载数据
        this.renderCalendar();
        this.loadCalendarData();
    }

    // 切换月份
    changeMonth(delta) {
        this.currentDate.setMonth(this.currentDate.getMonth() + delta);
        this.loadCalendarData();
    }

    // 加载日历数据
    async loadCalendarData() {
        try {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth() + 1;
            
            console.log(`加载 ${year}年${month}月 的日历数据...`);
            
            const response = await fetch(`/api/sessions/calendar?year=${year}&month=${month}`);
            
            if (!response.ok) {
                throw new Error(`日历数据加载失败: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (response.ok) {
                this.calendarData = data.calendarData || {};
                console.log('日历数据加载成功:', this.calendarData);
                
                // 只在数据更新后重新渲染，避免重复调用
                this.renderCalendar();
            } else {
                console.error('日历数据加载失败:', data.error);
            }
        } catch (error) {
            console.error('加载日历数据失败:', error);
            // 即使加载失败也要渲染日历
            this.renderCalendar();
            
            // 显示错误提示
            const errorMessage = document.createElement('div');
            errorMessage.className = 'bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-sm';
            errorMessage.innerHTML = `
                <strong>日历加载失败!</strong> 
                <span>无法加载日历数据，但您可以继续使用其他功能。</span>
            `;
            
            // 插入到页面顶部
            const container = document.querySelector('#sessionsContainer') || document.body;
            container.insertBefore(errorMessage, container.firstChild);
        }
    }

    // 渲染日历
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 更新月份标题
        const monthTitle = document.getElementById('currentMonth');
        if (monthTitle) {
            monthTitle.textContent = `${year}年${month + 1}月`;
        }
        
        // 获取月份第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;
        
        let html = '';
        
        // 生成6周的日期
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + week * 7 + day);
                const isCurrentMonth = currentDate.getMonth() === month;
                const isToday = this.isToday(currentDate);
                const dateString = this.formatDate(currentDate);
                const hasRecords = this.calendarData[dateString] && this.calendarData[dateString].length > 0;
                
                let dayClass = 'p-2 text-center text-sm cursor-pointer transition-colors rounded-lg calendar-day';
                
                if (!isCurrentMonth) {
                    dayClass += ' text-gray-400 dark:text-gray-600';
                } else if (isToday) {
                    dayClass += ' bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold';
                } else if (hasRecords) {
                    dayClass += ' bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800';
                } else {
                    dayClass += ' text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
                }
                
                html += `
                    <div class="${dayClass}" data-date="${dateString}">
                            ${currentDate.getDate()}
                        ${hasRecords ? `<div class="text-xs mt-1">${this.calendarData[dateString].length}条</div>` : ''}
                    </div>
                `;
            }
        }
        
        calendarGrid.innerHTML = html;
        
        // 绑定日历点击事件
        this.bindCalendarClickEvents();
    }

    // 绑定日历点击事件
    bindCalendarClickEvents() {
        console.log('开始绑定日历点击事件...');
        
        // 使用事件委托，在日历容器上绑定事件
        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) {
            console.error('日历网格容器未找到');
            return;
        }
        
        // 移除之前的事件监听器
        calendarGrid.removeEventListener('click', this.handleCalendarClick);
        
        // 绑定新的事件监听器
        this.handleCalendarClick = (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (!dayElement) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const clickedDate = dayElement.dataset.date;
            console.log('点击日期:', clickedDate);
            
            if (clickedDate) {
                // 确保每次点击都发起新的请求
                this.showDateDetail(clickedDate);
            } else {
                console.error('点击的元素没有data-date属性');
            }
        };
        
        calendarGrid.addEventListener('click', this.handleCalendarClick);
        
        console.log('日历点击事件绑定完成');
    }

    // 显示日期详情
    async showDateDetail(date) {
        console.log('显示日期详情:', date);
        
        try {
            // 添加时间戳防止浏览器缓存
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/sessions/date/${date}?_t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('API响应状态:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API返回数据:', data);
                this.renderDateDetailModal(date, data.sessions);
            } else {
                console.error('获取日期详情失败:', response.status, response.statusText);
                const errorData = await response.json().catch(() => ({}));
                console.error('错误详情:', errorData);
            }
        } catch (error) {
            console.error('获取日期详情失败:', error);
        }
    }

    // 渲染日期详情弹窗
    renderDateDetailModal(date, sessions) {
        console.log('渲染日期详情弹窗:', date, sessions);
        
        // 使用现有的弹窗容器，不重新创建
        const modal = document.getElementById('calendarDetailModal');
        if (!modal) {
            console.error('日历详情弹窗容器未找到');
            return;
        }
        
        const dateObj = new Date(date);
        const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        
        // 更新标题
        const titleElement = document.getElementById('calendarDetailTitle');
        if (titleElement) {
            titleElement.textContent = `${formattedDate} 学习记录详情`;
        }
        
        // 获取所有容器元素
        const mobileContainer = document.getElementById('calendarDetailMobile');
        const cardsContainer = document.getElementById('calendarDetailCards');
        const desktopContainer = document.getElementById('calendarDetailDesktop');
        const tableBody = document.getElementById('calendarDetailTableBody');
        const emptyContainer = document.getElementById('calendarDetailEmpty');
        
        console.log('容器元素检查:', {
            mobileContainer: !!mobileContainer,
            cardsContainer: !!cardsContainer,
            desktopContainer: !!desktopContainer,
            tableBody: !!tableBody,
            emptyContainer: !!emptyContainer
        });
        
        if (sessions.length === 0) {
            // 显示空状态
            console.log('显示空状态');
            
            // 清空之前的内容
            if (cardsContainer) cardsContainer.innerHTML = '';
            if (tableBody) tableBody.innerHTML = '';
            
            // 隐藏内容容器，显示空状态
            if (mobileContainer) mobileContainer.classList.add('hidden');
            if (desktopContainer) desktopContainer.classList.add('hidden');
            if (emptyContainer) emptyContainer.classList.remove('hidden');
        } else {
            // 显示内容
            console.log('显示内容，记录数:', sessions.length);
            
            // 计算总时长
            const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const hours = Math.floor(totalDuration / 60);
            const minutes = totalDuration % 60;
            
            // 隐藏空状态，显示内容容器
            if (mobileContainer) mobileContainer.classList.remove('hidden');
            if (desktopContainer) desktopContainer.classList.remove('hidden');
            if (emptyContainer) emptyContainer.classList.add('hidden');
        
            // 渲染移动端卡片
            if (cardsContainer) {
                cardsContainer.innerHTML = `
                    <!-- 总时长统计 -->
                    <div class="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">总学习时长</span>
                            <span class="text-lg font-bold text-blue-600 dark:text-blue-400">${hours}小时${minutes}分钟</span>
                    </div>
                        </div>
                    
                    <!-- 学习记录卡片 -->
                    <div class="space-y-4">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white mb-3">学习记录 (${sessions.length}条)</h4>
                        ${sessions.map(session => `
                            <div class="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div class="flex items-center justify-between mb-2">
                                    <h5 class="font-medium text-gray-900 dark:text-white">${session.project_name}</h5>
                                    <span class="text-sm text-blue-600 dark:text-blue-400 font-medium">${session.duration}分钟</span>
                        </div>
                                <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>${this.formatTime(session.start_time_new)} - ${this.formatTime(session.end_time_new)}</span>
                    </div>
                    </div>
                        `).join('')}
                </div>
                `;
            }
        
            // 渲染桌面端表格
            if (tableBody) {
                tableBody.innerHTML = sessions.map(session => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">${session.project_name}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">${this.formatTime(session.start_time_new)}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">${this.formatTime(session.end_time_new)}</td>
                        <td class="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">${session.duration}分钟</td>
                </tr>
            `).join('');
            }
        }
        
        // 清理之前的事件监听器
        this.cleanupCalendarModalEvents();
        
        // 显示弹窗
        modal.classList.remove('hidden');
        
        // 绑定关闭事件
        this.bindCalendarModalEvents();
        
        console.log('日期详情弹窗渲染完成');
    }

    // 清理日历弹窗事件监听器
    cleanupCalendarModalEvents() {
        const modal = document.getElementById('calendarDetailModal');
        if (!modal) return;
        
        // 移除之前的事件监听器
        modal.onclick = null;
        
        // 移除ESC键监听器
        document.removeEventListener('keydown', this.handleEscapeKey);
        
        // 清理关闭按钮事件
        const closeBtns = [
            document.getElementById('closeCalendarDetailBtn'),
            document.getElementById('closeCalendarDetailBtn2')
        ];
        
        closeBtns.forEach(btn => {
            if (btn) {
                btn.onclick = null;
            }
        });
    }

    // 绑定日历弹窗事件监听器
    bindCalendarModalEvents() {
        const modal = document.getElementById('calendarDetailModal');
        if (!modal) return;
        
        // 绑定关闭按钮事件
        const closeBtns = [
            document.getElementById('closeCalendarDetailBtn'),
            document.getElementById('closeCalendarDetailBtn2')
        ];
        
        closeBtns.forEach(btn => {
            if (btn) {
                btn.onclick = () => this.hideCalendarDetailModal();
            }
        });
        
        // ESC键关闭 - 使用命名函数以便后续移除
        this.handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                this.hideCalendarDetailModal();
            }
        };
        document.addEventListener('keydown', this.handleEscapeKey);
    }
        
    hideCalendarDetailModal() {
        const modal = document.getElementById('calendarDetailModal');
        if (modal) {
            modal.classList.add('hidden');
            // 清理事件监听器
            this.cleanupCalendarModalEvents();
        }
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    formatDate(date) {
        // 避免使用toISOString()导致的时区偏移
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 格式化时间显示，去掉秒
    formatTime(timeString) {
        if (!timeString) return '--:--';
        // 如果包含秒，去掉秒的部分
        if (timeString.includes(':')) {
            const parts = timeString.split(':');
            return `${parts[0]}:${parts[1]}`;
        }
        return timeString;
    }

    bindCalendarDetailEvents() {
        // 占位：后续可实现日历详情弹窗事件绑定
    }

    // 绑定桌面端事件的独立方法
    bindDesktopEvents() {
        const desktopElements = {
            startTime: document.getElementById('inputStartTimeDesktop'),
            endTime: document.getElementById('inputEndTimeDesktop'),
            addBtn: document.getElementById('addRecordBtnDesktop'),
            projectSelect: document.getElementById('inputProjectDesktop')
        };
        
        console.log('桌面端元素重试检查:', desktopElements);
        
        // 检查是否已经绑定过事件，避免重复绑定
        if (desktopElements.startTime && !desktopElements.startTime.hasAttribute('data-events-bound')) {
            desktopElements.startTime.addEventListener('change', () => this.calculateDuration('inputDesktop'));
            desktopElements.startTime.addEventListener('input', () => this.calculateDuration('inputDesktop'));
            desktopElements.startTime.setAttribute('data-events-bound', 'true');
            console.log('桌面端开始时间事件已绑定');
        }
        
        if (desktopElements.endTime && !desktopElements.endTime.hasAttribute('data-events-bound')) {
            desktopElements.endTime.addEventListener('change', () => this.calculateDuration('inputDesktop'));
            desktopElements.endTime.addEventListener('input', () => this.calculateDuration('inputDesktop'));
            desktopElements.endTime.setAttribute('data-events-bound', 'true');
            console.log('桌面端结束时间事件已绑定');
        }
        
        if (desktopElements.addBtn && !desktopElements.addBtn.hasAttribute('data-events-bound')) {
            desktopElements.addBtn.addEventListener('click', () => this.addRecord('desktop'));
            desktopElements.addBtn.setAttribute('data-events-bound', 'true');
            console.log('桌面端添加按钮事件已绑定');
        }
        
        if (desktopElements.projectSelect && !desktopElements.projectSelect.hasAttribute('data-events-bound')) {
            desktopElements.projectSelect.addEventListener('change', (e) => this.handleProjectChange(e, 'inputDesktop'));
            desktopElements.projectSelect.setAttribute('data-events-bound', 'true');
            console.log('桌面端项目选择事件已绑定');
        }
    }

    bindChartEvents() {
        console.log('=== 绑定图表事件 ===');
        
        // 图表类型选择器
        const chartTypeSelector = document.getElementById('chartTypeSelector');
        if (chartTypeSelector && !chartTypeSelector.hasAttribute('data-events-bound')) {
            chartTypeSelector.addEventListener('change', () => {
                console.log('图表类型切换:', chartTypeSelector.value);
                this.loadChartData();
            });
            chartTypeSelector.setAttribute('data-events-bound', 'true');
            console.log('图表类型选择器事件已绑定');
        }
        
        // 时间范围选择器
        const timeRangeSelector = document.getElementById('timeRangeSelector');
        if (timeRangeSelector && !timeRangeSelector.hasAttribute('data-events-bound')) {
            timeRangeSelector.addEventListener('change', () => {
                console.log('时间范围切换:', timeRangeSelector.value);
                this.toggleCustomDateRange();
                this.loadChartData();
            });
            timeRangeSelector.setAttribute('data-events-bound', 'true');
            console.log('时间范围选择器事件已绑定');
        }
        
        // 自定义日期范围输入框
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        if (startDateInput && !startDateInput.hasAttribute('data-events-bound')) {
            startDateInput.addEventListener('change', () => this.loadChartData());
            startDateInput.setAttribute('data-events-bound', 'true');
        }
        if (endDateInput && !endDateInput.hasAttribute('data-events-bound')) {
            endDateInput.addEventListener('change', () => this.loadChartData());
            endDateInput.setAttribute('data-events-bound', 'true');
        }
        
        // 项目筛选选择器
        const projectFilterSelector = document.getElementById('projectFilterSelector');
        if (projectFilterSelector && !projectFilterSelector.hasAttribute('data-events-bound')) {
            projectFilterSelector.addEventListener('change', () => {
                console.log('项目筛选切换:', projectFilterSelector.value);
                this.loadChartData();
            });
            projectFilterSelector.setAttribute('data-events-bound', 'true');
            console.log('项目筛选选择器事件已绑定');
        }
        
        // 时长范围选择器
        const durationFilterSelector = document.getElementById('durationFilterSelector');
        if (durationFilterSelector && !durationFilterSelector.hasAttribute('data-events-bound')) {
            durationFilterSelector.addEventListener('change', () => {
                console.log('时长范围切换:', durationFilterSelector.value);
                this.loadChartData();
            });
            durationFilterSelector.setAttribute('data-events-bound', 'true');
            console.log('时长范围选择器事件已绑定');
        }
        
        // 应用筛选按钮
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        if (applyFiltersBtn && !applyFiltersBtn.hasAttribute('data-events-bound')) {
            applyFiltersBtn.addEventListener('click', () => {
                console.log('应用筛选');
                this.loadChartData();
            });
            applyFiltersBtn.setAttribute('data-events-bound', 'true');
            console.log('应用筛选按钮事件已绑定');
        }
        
        // 重置筛选按钮
        const resetFiltersBtn = document.getElementById('resetFiltersBtn');
        if (resetFiltersBtn && !resetFiltersBtn.hasAttribute('data-events-bound')) {
            resetFiltersBtn.addEventListener('click', () => {
                console.log('重置筛选');
                this.resetFilters();
            });
            resetFiltersBtn.setAttribute('data-events-bound', 'true');
            console.log('重置筛选按钮事件已绑定');
        }
        
        console.log('=== 图表事件绑定完成 ===');
    }
    
    // 切换自定义日期范围显示
    toggleCustomDateRange() {
        const timeRangeSelector = document.getElementById('timeRangeSelector');
        const customDateRange = document.getElementById('customDateRange');
        
        if (timeRangeSelector.value === 'custom') {
            customDateRange.classList.remove('hidden');
            // 设置默认日期范围（最近30天）
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            
            document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        } else {
            customDateRange.classList.add('hidden');
        }
    }
    
    // 重置所有筛选条件
    resetFilters() {
        // 重置时间范围
        document.getElementById('timeRangeSelector').value = '30';
        this.toggleCustomDateRange();
        
        // 重置项目筛选
        document.getElementById('projectFilterSelector').value = '';
        
        // 重置时长范围
        document.getElementById('durationFilterSelector').value = '';
        
        // 重新加载图表数据
        this.loadChartData();
    }
    
    // 更新项目筛选选择器
    updateProjectSelectors(projects) {
        const selectors = [
            'inputProject',           // 移动端添加记录
            'inputProjectDesktop',    // 桌面端添加记录
            'editProject',             // 编辑弹窗
            'projectChartSelector',    // 图表项目选择器
            'projectFilterSelector'    // 项目筛选选择器
        ];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select) {
                // 保存当前选中的值
                const currentValue = select.value;
                
                // 清空现有选项（保留第一个选项）
                if (selectorId === 'projectFilterSelector') {
                    select.innerHTML = '<option value="">所有项目</option>';
                } else {
                    select.innerHTML = '<option value="">选择学习项目</option>';
                }
                
                // 添加项目选项
                projects.forEach(project => {
                    const option = document.createElement('option');
                    // 检查project是字符串还是对象
                    const projectName = typeof project === 'string' ? project : project.name;
                    const projectId = typeof project === 'string' ? project : project.id;
                    
                    // 使用项目名称作为value，而不是项目ID
                    option.value = projectName;
                    option.textContent = projectName;
                    // 将项目ID存储在data属性中，以备将来需要
                    if (projectId) {
                        option.setAttribute('data-project-id', projectId);
                    }
                    select.appendChild(option);
                });
                
                // 恢复之前选中的值
                if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                    select.value = currentValue;
                }
            }
        });
    }

    // 加载分析数据
    async loadAnalytics() {
        try {
            const response = await fetch('/api/sessions/analytics');
            if (response.ok) {
                this.analyticsData = await response.json();
                this.updateStats();
            }
        } catch (error) {
            console.error('加载分析数据失败:', error);
        }
    }
    
    // 更新统计卡片
    updateStats() {
        const stats = this.analyticsData.stats || {};
        
        const elements = {
            totalSessions: document.getElementById('totalSessionsCount'),
            totalMinutes: document.getElementById('totalMinutesCount'),
            totalDays: document.getElementById('totalDaysCount'),
            avgMinutes: document.getElementById('avgMinutesCount')
        };
        
        // 检查元素是否存在，避免null错误
        if (elements.totalSessions) {
            elements.totalSessions.textContent = stats.totalSessions || 0;
        }
        if (elements.totalMinutes) {
            elements.totalMinutes.textContent = (stats.totalMinutes || 0) + '分钟';
        }
        if (elements.totalDays) {
            elements.totalDays.textContent = (stats.totalDays || 0) + '天';
        }
        if (elements.avgMinutes) {
            elements.avgMinutes.textContent = (stats.avgMinutes || 0) + '分钟';
        }
    }
    
    // 设置图表
    setupChart() {
        const ctx = document.getElementById('sessionsChart');
        if (!ctx) {
            console.warn('图表容器未找到');
            return;
        }

        // 确保Chart.js已加载
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js未加载，跳过图表初始化');
            return;
        }

        // 销毁现有图表
        if (this.chart) {
            try {
                this.chart.destroy();
            } catch (error) {
                console.warn('销毁现有图表时出错:', error);
            }
            this.chart = null;
        }

        // 检查是否已有其他图表实例使用同一个canvas
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            try {
                existingChart.destroy();
            } catch (error) {
                console.warn('销毁现有图表实例时出错:', error);
            }
        }

        // 创建新图表
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151'
                        },
                        grid: {
                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                        }
                    },
                    y: {
                        ticks: {
                            color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#374151'
                        },
                        grid: {
                            color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb'
                        }
                    }
                }
            }
        });

        // 加载初始图表数据
        this.loadChartData();
    }

    // 动态加载Chart.js
    async loadChartJS() {
        return new Promise((resolve, reject) => {
            if (typeof Chart !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = '/assets/lib/chart.umd.min.js';
            script.onload = () => {
                console.log('Chart.js 加载成功');
                resolve();
            };
            script.onerror = () => {
                console.error('Chart.js 加载失败');
                reject(new Error('Chart.js 加载失败'));
            };
            document.head.appendChild(script);
        });
    }
    
    // 加载图表数据
    async loadChartData() {
        try {
            const chartType = document.getElementById('chartTypeSelector').value;
            const timeRange = document.getElementById('timeRangeSelector').value;
            const projectName = document.getElementById('projectFilterSelector').value;
            const durationRange = document.getElementById('durationFilterSelector').value;
            
            const params = new URLSearchParams({
                type: chartType,
                timeRange: timeRange
            });
            
            // 添加自定义日期范围参数
            if (timeRange === 'custom') {
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
            }
            
            // 添加项目筛选参数
            if (projectName) {
                params.append('projectName', projectName);
            }
            
            // 添加时长范围筛选参数
            if (durationRange) {
                params.append('durationRange', durationRange);
            }
            
            const response = await fetch(`/api/sessions/chart-data?${params}`);
            if (response.ok) {
                const chartData = await response.json();
                this.updateChart(chartData, chartType);
            }
        } catch (error) {
            console.error('加载图表数据失败:', error);
        }
    }
    
    // 更新图表
    updateChart(chartData, type) {
        const ctx = document.getElementById('sessionsChart');
        if (!ctx) {
            console.warn('图表容器未找到');
            return;
        }

        // 确保Chart.js已加载
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js未加载，跳过图表更新');
            return;
        }

        // 销毁现有图表
        if (this.chart) {
            try {
                this.chart.destroy();
            } catch (error) {
                console.warn('销毁现有图表时出错:', error);
            }
            this.chart = null;
        }

        // 检查是否已有其他图表实例使用同一个canvas
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            try {
                existingChart.destroy();
            } catch (error) {
                console.warn('销毁现有图表实例时出错:', error);
            }
        }
        
        const config = {
            type: type,
            data: chartData,
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
                            text: '分钟'
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
        };
        
        this.chart = new Chart(ctx, config);
    }

    async loadProjects() {
        try {
            console.log('开始加载项目列表...');
            
            const response = await fetch('/api/sessions/projects/list');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const projects = data.projects || [];
            
            console.log('获取到项目列表:', projects);
            
            // 更新所有项目选择器
            this.updateProjectSelectors(projects);
            
        } catch (error) {
            console.error('加载项目列表失败:', error);
            // 如果加载失败，使用默认项目列表
            const defaultProjects = [
                { id: 1, name: 'JavaScript基础' },
                { id: 2, name: 'React框架' },
                { id: 3, name: 'Node.js后端' },
                { id: 4, name: '数据库设计' },
                { id: 5, name: 'Git版本控制' },
                { id: 6, name: '算法与数据结构' },
                { id: 7, name: '系统设计' },
                { id: 8, name: '其他' }
            ];
            this.updateProjectSelectors(defaultProjects);
        }
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

    // 显示Toast消息
    showToast(message, type = 'info') {
        // 创建toast容器
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(toastContainer);
        }

        // 创建toast元素
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.className = `${colors[type] || colors.info} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.innerHTML = `
            <div class="flex items-center">
                <span class="flex-1">${message}</span>
                <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // 显示动画
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// 保证全局可用
window.SessionsManager = SessionsManager;

// 全局变量
let sessionsManager = null;

// 等待DOM完全加载后再初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化SessionsManager...');
    initializeSessionsManager();
});

// 如果DOM已经加载完成，直接初始化
if (document.readyState === 'loading') {
    // DOM还在加载中，等待DOMContentLoaded事件
} else {
    // DOM已经加载完成，直接初始化
    console.log('DOM已加载完成，直接初始化SessionsManager...');
    initializeSessionsManager();
}

// 初始化函数
function initializeSessionsManager() {
    console.log('开始创建SessionsManager实例...');
    
    // 如果已经存在实例，先清理
    if (sessionsManager) {
        console.log('清理现有的SessionsManager实例...');
        // 清理图表
        if (sessionsManager.chart) {
            try {
                sessionsManager.chart.destroy();
            } catch (error) {
                console.warn('清理图表时出错:', error);
            }
        }
        // 清理事件监听器
        if (sessionsManager.handleEscapeKey) {
            document.removeEventListener('keydown', sessionsManager.handleEscapeKey);
        }
        sessionsManager = null;
    }
    
    // 检查是否在正确的页面上
    const sessionsContainer = document.getElementById('sessionsContainer');
    if (!sessionsContainer) {
        console.log('不在学习记录页面，跳过SessionsManager初始化');
        return;
    }
    
    // 创建新实例
    sessionsManager = new SessionsManager();
    window.sessionsManager = sessionsManager;
    
    // 监听DOM变化，当页面内容动态加载时重新绑定事件
    observeDOMChanges();
}

// 监听DOM变化
function observeDOMChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // 检查是否有新的内容被添加
                const hasNewContent = Array.from(mutation.addedNodes).some(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 检查是否包含我们关心的元素
                        return node.querySelector && (
                            node.querySelector('#inputStartTimeDesktop') ||
                            node.querySelector('#inputEndTimeDesktop') ||
                            node.querySelector('#addRecordBtnDesktop')
                        );
                    }
                    return false;
                });
                
                if (hasNewContent) {
                    console.log('检测到新的页面内容，重新绑定事件...');
                    setTimeout(() => {
                        if (sessionsManager) {
                            sessionsManager.bindEvents();
                        }
                    }, 100);
                }
            }
        });
    });
    
    // 开始监听
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('DOM变化监听器已启动');
}
