// Dashboard Excel 应用类
class DashboardExcelApp {
    constructor() {
        this.excelData = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filters = {
            date: '',
            project: '',
            timeRange: ''
        };
        this.currentChart = null; // 添加图表实例变量
        
        // 直接初始化，Chart.js已经在HTML中加载
        console.log('初始化 DashboardExcelApp...');
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        // 确保Chart.js已加载后再初始化图表
        this.ensureChartJSLoaded().then(() => {
            this.initCharts();
        }).catch(() => {
            console.warn('Chart.js 加载失败，图表功能不可用');
        });
    }
    
    ensureChartJSLoaded() {
        return new Promise((resolve, reject) => {
            if (typeof Chart !== 'undefined') {
                console.log('Chart.js 已加载');
                resolve();
                return;
            }
            
            // 如果Chart.js未加载，尝试等待
            let attempts = 0;
            const maxAttempts = 30; // 最多等待3秒
            
            const checkChartJS = () => {
                attempts++;
                
                if (typeof Chart !== 'undefined') {
                    console.log('Chart.js 加载成功');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('Chart.js 加载超时');
                    reject(new Error('Chart.js 加载超时'));
                } else {
                    // 继续等待
                    setTimeout(checkChartJS, 100);
                }
            };
            
            checkChartJS();
        });
    }
    
    setupEventListeners() {
        // 文件上传
        const uploadBtn = document.getElementById('uploadBtn');
        const excelFile = document.getElementById('excelFile');
        const uploadArea = document.getElementById('uploadArea');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                if (excelFile) excelFile.click();
            });
        }
        
        if (excelFile) {
            excelFile.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        }
        
        // 拖拽上传
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('border-primary-500', 'bg-primary-50');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-primary-500', 'bg-primary-50');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('border-primary-500', 'bg-primary-50');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });
        }
        
        // 筛选器
        const dateFilter = document.getElementById('dateFilter');
        const projectFilter = document.getElementById('projectFilter');
        const timeRangeFilter = document.getElementById('timeRangeFilter');
        const clearFilters = document.getElementById('clearFilters');
        const clearFilterStatus = document.getElementById('clearFilterStatus');
        
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => this.updateFilter('date', e.target.value));
        }
        if (projectFilter) {
            projectFilter.addEventListener('change', (e) => this.updateFilter('project', e.target.value));
        }
        if (timeRangeFilter) {
            timeRangeFilter.addEventListener('change', (e) => this.updateFilter('timeRange', e.target.value));
        }
        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.clearFilters());
        }
        if (clearFilterStatus) {
            clearFilterStatus.addEventListener('click', () => this.clearFilters());
        }
        
        // 图表选择器
        const chartTypeSelector = document.getElementById('chartTypeSelector');
        const projectChartSelector = document.getElementById('projectChartSelector');
        
        if (chartTypeSelector) {
            chartTypeSelector.addEventListener('change', () => {
                // 根据图表类型显示/隐藏项目选择器
                const chartType = chartTypeSelector.value;
                if (projectChartSelector) {
                    if (chartType === 'pie') {
                        projectChartSelector.classList.remove('hidden');
                        // 更新项目选择器选项
                        this.updateProjectChartSelector();
                    } else {
                        projectChartSelector.classList.add('hidden');
                    }
                }
                this.updateChart();
            });
        }
        
        // 分页
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.prevPage());
        }
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        }
    }
    
    handleFileUpload(file) {
        // 调用handleFile方法来处理文件上传
        console.log('上传文件:', file);
        this.handleFile(file);
    }
    
    async handleFile(file) {
        console.log('开始处理文件:', file.name, '大小:', file.size, '类型:', file.type);
        
        try {
            this.showUploadProgress();
            
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('发送请求到 /api/data/dashboard/parse-excel');
            
            const response = await fetch('/api/data/dashboard/parse-excel', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            console.log('收到响应:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('解析结果:', result);
            
            if (result.success) {
                this.excelData = result.data;
                console.log('设置excelData:', this.excelData);
                console.log('excelData 长度:', this.excelData.length);
                console.log('excelData 类型:', typeof this.excelData);
                console.log('excelData 是否为数组:', Array.isArray(this.excelData));
                console.log('第一条数据:', this.excelData[0]);
                
                this.showUploadMessage('文件解析成功！', 'success');
                this.showDataSection();
                
                // 更新筛选器和显示数据
                this.updateFilters();
                this.applyFilters();
                console.log('应用筛选器完成');
                
                // 确保图表正确初始化
                setTimeout(() => {
                    this.initCharts();
                    this.updateCharts();
                }, 100);
                
                console.log('图表更新完成');
            } else {
                throw new Error(result.error || '文件解析失败');
            }
        } catch (error) {
            console.error('文件处理错误:', error);
            this.showUploadMessage(`文件处理失败: ${error.message}`, 'error');
        } finally {
            this.hideUploadProgress();
        }
    }
    
    showUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadResult = document.getElementById('uploadResult');
        
        if (uploadProgress) uploadProgress.classList.remove('hidden');
        if (uploadResult) uploadResult.classList.add('hidden');
    }
    
    hideUploadProgress() {
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) uploadProgress.classList.add('hidden');
    }
    
    updateProgress(percent) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) progressBar.style.width = percent + '%';
        if (progressText) progressText.textContent = percent + '%';
    }
    
    showUploadMessage(message, type) {
        const messageDiv = document.getElementById('uploadMessage');
        const resultDiv = document.getElementById('uploadResult');
        
        if (messageDiv) {
            messageDiv.className = `p-3 rounded-lg ${
                type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
            }`;
            messageDiv.textContent = message;
        }
        
        if (resultDiv) resultDiv.classList.remove('hidden');
    }
    
    showDataSection() {
        const filterSection = document.getElementById('filterSection');
        const dataTableSection = document.getElementById('dataTableSection');
        
        console.log('showDataSection 被调用');
        console.log('filterSection 元素:', filterSection);
        console.log('dataTableSection 元素:', dataTableSection);
        
        if (filterSection) {
            filterSection.classList.remove('hidden');
            console.log('filterSection hidden 类已移除');
        } else {
            console.error('找不到 filterSection 元素');
        }
        
        if (dataTableSection) {
            dataTableSection.classList.remove('hidden');
            console.log('dataTableSection hidden 类已移除');
        } else {
            console.error('找不到 dataTableSection 元素');
        }
        
        // 初始化图表
        this.initCharts();
    }
    
    updateFilters() {
        console.log('updateFilters 被调用');
        console.log('excelData 长度:', this.excelData.length);
        
        // 更新项目名称筛选器
        const projectFilter = document.getElementById('projectFilter');
        if (projectFilter && this.excelData.length > 0) {
            const projects = [...new Set(this.excelData.map(row => row.projectName))];
            console.log('找到的项目:', projects);
            
            projectFilter.innerHTML = '<option value="">全部项目</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project;
                option.textContent = project;
                projectFilter.appendChild(option);
            });
        } else {
            console.log('项目筛选器更新跳过：没有数据或找不到元素');
        }
        
        // 设置默认显示最新日期
        this.setDefaultDate();
    }
    
    setDefaultDate() {
        if (this.excelData.length > 0) {
            // 找到最新的日期
            const dates = this.excelData.map(row => new Date(row.date)).sort((a, b) => b - a);
            const latestDate = dates[0];
            
            // 格式化日期为 YYYY-MM-DD 格式
            const formattedDate = latestDate.toISOString().split('T')[0];
            
            // 设置日期筛选器为最新日期
            const dateFilter = document.getElementById('dateFilter');
            if (dateFilter) {
                dateFilter.value = formattedDate;
                this.filters.date = formattedDate;
            }
            
            // 显示最新日期的数据
            this.applyFilters();
        } else {
            console.log('setDefaultDate: excelData 为空，跳过设置默认日期');
        }
    }
    
    updateFilter(type, value) {
        this.filters[type] = value;
        this.currentPage = 1;
        
        // 时间范围筛选时，基于已选择的日期或当前日期计算
        if (type === 'timeRange' && value) {
            this.handleTimeRangeChange(value);
        }
        
        // 日期筛选时，清除时间范围
        if (type === 'date' && value) {
            this.filters.timeRange = '';
            const timeRangeFilter = document.getElementById('timeRangeFilter');
            if (timeRangeFilter) timeRangeFilter.value = '';
        }
        
        this.applyFilters();
    }
    
    handleTimeRangeChange(timeRange) {
        console.log('handleTimeRangeChange 被调用，timeRange:', timeRange);
        
        let baseDate;
        if (timeRange === 'month') {
            // 对于"本月"，基于用户选择的日期来计算月份
            if (this.filters.date) {
                // 修复时区问题：直接解析日期字符串，避免时区转换
                const dateParts = this.filters.date.split('-');
                baseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            } else {
                baseDate = new Date(); // 如果没有选择日期，则使用当前日期
            }
        } else if (this.filters.date) {
            // 修复时区问题：直接解析日期字符串，避免时区转换
            const dateParts = this.filters.date.split('-');
            baseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        } else {
            baseDate = new Date();
        }
        
        console.log('基准日期:', baseDate);
        
        let startDate, endDate;
        
        switch (timeRange) {
            case 'today':
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
                break;
            case 'week':
                // 最近7天
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 6);
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
                break;
            case 'month':
                // 基于用户选择日期的月份（从1号到月末）
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
                break;
            default:
                return;
        }
        
        // 使用本地日期格式，避免时区问题
        this.filters.startDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        this.filters.endDate = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        console.log('设置日期范围:', {
            startDate: this.filters.startDate,
            endDate: this.filters.endDate
        });
    }
    
    applyFilters() {
        console.log('applyFilters 被调用');
        console.log('当前筛选条件:', this.filters);
        console.log('excelData 长度:', this.excelData.length);
        
        if (this.excelData.length === 0) {
            console.log('excelData 为空，设置 filteredData 为空数组');
            this.filteredData = [];
        } else {
            this.filteredData = this.excelData.filter(row => {
                // 标准化日期格式
                let rowDate = row.date;
                if (rowDate.includes('.')) {
                    rowDate = rowDate.replace(/\./g, '-');
                }
                
                console.log('处理行数据:', {
                    originalDate: row.date,
                    normalizedDate: rowDate,
                    filters: this.filters
                });
                
                // 时间范围筛选（优先级最高）
                if (this.filters.startDate && this.filters.endDate) {
                    // 使用更精确的日期比较方法
                    const rowDateParts = rowDate.split(/[\/\-]/);
                    const rowYear = parseInt(rowDateParts[0]);
                    const rowMonth = parseInt(rowDateParts[1]);
                    const rowDay = parseInt(rowDateParts[2]);
                    
                    const startDateParts = this.filters.startDate.split('-');
                    const startYear = parseInt(startDateParts[0]);
                    const startMonth = parseInt(startDateParts[1]);
                    const startDay = parseInt(startDateParts[2]);
                    
                    const endDateParts = this.filters.endDate.split('-');
                    const endYear = parseInt(endDateParts[0]);
                    const endMonth = parseInt(endDateParts[1]);
                    const endDay = parseInt(endDateParts[2]);
                    
                    // 将日期转换为数字进行比较（YYYYMMDD格式）
                    const rowDateNum = rowYear * 10000 + rowMonth * 100 + rowDay;
                    const startDateNum = startYear * 10000 + startMonth * 100 + startDay;
                    const endDateNum = endYear * 10000 + endMonth * 100 + endDay;
                    
                    console.log('时间范围比较:', {
                        rowDate: rowDate,
                        rowDateNum: rowDateNum,
                        startDate: this.filters.startDate,
                        startDateNum: startDateNum,
                        endDate: this.filters.endDate,
                        endDateNum: endDateNum,
                        inRange: rowDateNum >= startDateNum && rowDateNum < endDateNum
                    });
                    
                    if (rowDateNum < startDateNum || rowDateNum >= endDateNum) return false;
                }
                // 精确日期筛选（仅在没有时间范围时使用）
                else if (this.filters.date) {
                    const filterDate = new Date(this.filters.date).toISOString().split('T')[0];
                    const normalizedRowDate = new Date(rowDate).toISOString().split('T')[0];
                    console.log('日期比较:', {
                        filterDate,
                        normalizedRowDate,
                        match: normalizedRowDate === filterDate
                    });
                    if (normalizedRowDate !== filterDate) return false;
                }
                
                // 项目筛选
                if (this.filters.project && row.projectName !== this.filters.project) {
                    return false;
                }
                
                return true;
            });
            
            // 按日期升序排列
            this.filteredData.sort((a, b) => {
                let dateA = a.date;
                let dateB = b.date;
                
                // 标准化日期格式
                if (dateA.includes('.')) dateA = dateA.replace(/\./g, '-');
                if (dateB.includes('.')) dateB = dateB.replace(/\./g, '-');
                
                // 使用数字比较确保准确性
                const dateAParts = dateA.split(/[\/\-]/);
                const dateBParts = dateB.split(/[\/\-]/);
                
                const dateANum = parseInt(dateAParts[0]) * 10000 + parseInt(dateAParts[1]) * 100 + parseInt(dateAParts[2]);
                const dateBNum = parseInt(dateBParts[0]) * 10000 + parseInt(dateBParts[1]) * 100 + parseInt(dateBParts[2]);
                
                return dateANum - dateBNum;
            });
        }
        
        console.log('筛选后的数据长度:', this.filteredData.length);
        console.log('筛选后的数据前5条:', this.filteredData.slice(0, 5));
        
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
        this.updateCharts();
    }
    
    clearFilters() {
        this.filters = {
            date: '',
            project: '',
            timeRange: ''
        };
        
        // 重置筛选器UI
        const dateFilter = document.getElementById('dateFilter');
        const projectFilter = document.getElementById('projectFilter');
        const timeRangeFilter = document.getElementById('timeRangeFilter');
        
        if (dateFilter) dateFilter.value = '';
        if (projectFilter) projectFilter.value = '';
        if (timeRangeFilter) timeRangeFilter.value = '';
        
        this.applyFilters();
    }
    
    renderTable() {
        const tbody = document.getElementById('dataTableBody');
        console.log('renderTable 被调用');
        console.log('tbody 元素:', tbody);
        console.log('filteredData 长度:', this.filteredData.length);
        console.log('filteredData 内容:', this.filteredData);
        
        if (!tbody) {
            console.error('找不到 dataTableBody 元素');
            return;
        }
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        console.log('pageData 长度:', pageData.length);
        console.log('pageData 内容:', pageData);
        
        tbody.innerHTML = '';
        
        pageData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
            
            const date = new Date(row.date);
            const formattedDate = date.toLocaleDateString('zh-CN');
            
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">${formattedDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">${row.projectName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">${row.startTime}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">${row.endTime}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-center">${row.duration} 分钟</td>
            `;
            
            tbody.appendChild(tr);
        });
        
        console.log('表格渲染完成，tbody 内容长度:', tbody.children.length);
        
        // 更新统计信息
        this.updateStats();
    }
    
    updateStats() {
        console.log('updateStats 被调用');
        console.log('excelData 长度:', this.excelData.length);
        console.log('filteredData 长度:', this.filteredData.length);
        
        const totalRecords = document.getElementById('totalRecords');
        const filteredRecords = document.getElementById('filteredRecords');
        const filteredTotalTime = document.getElementById('filteredTotalTime');
        const filteredProjectCount = document.getElementById('filteredProjectCount');
        const filteredAvgDaily = document.getElementById('filteredAvgDaily');
        const filteredDateRange = document.getElementById('filteredDateRange');
        
        console.log('统计元素:', {
            totalRecords,
            filteredRecords,
            filteredTotalTime,
            filteredProjectCount,
            filteredAvgDaily,
            filteredDateRange
        });
        
        if (totalRecords) totalRecords.textContent = this.excelData.length;
        if (filteredRecords) filteredRecords.textContent = this.filteredData.length;
        
        if (filteredTotalTime) {
            const totalMinutes = this.filteredData.reduce((sum, row) => {
                const duration = parseInt(row.duration) || 0;
                console.log(`行数据 duration: ${row.duration}, 解析后: ${duration}`);
                return sum + duration;
            }, 0);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            filteredTotalTime.textContent = `${hours}小时${minutes}分钟`;
            console.log('总时间更新:', `${hours}小时${minutes}分钟`, '总分钟数:', totalMinutes);
        }
        
        if (filteredProjectCount) {
            const uniqueProjects = new Set(this.filteredData.map(row => row.projectName));
            filteredProjectCount.textContent = uniqueProjects.size;
            console.log('项目数量更新:', uniqueProjects.size);
        }
        
        if (filteredAvgDaily) {
            if (this.filteredData.length > 0) {
                const totalMinutes = this.filteredData.reduce((sum, row) => {
                    const duration = parseInt(row.duration) || 0;
                    return sum + duration;
                }, 0);
                const uniqueDates = new Set(this.filteredData.map(row => row.date));
                const avgDaily = Math.round(totalMinutes / uniqueDates.size);
                filteredAvgDaily.textContent = `${avgDaily}分钟`;
                console.log('平均每日更新:', `${avgDaily}分钟`, '总分钟数:', totalMinutes, '唯一日期数:', uniqueDates.size);
            } else {
                filteredAvgDaily.textContent = '0分钟';
            }
        }
        
        if (filteredDateRange) {
            if (this.filters.date) {
                const date = new Date(this.filters.date);
                filteredDateRange.textContent = date.toLocaleDateString('zh-CN');
            } else if (this.filters.startDate && this.filters.endDate) {
                const startDate = new Date(this.filters.startDate);
                const endDate = new Date(this.filters.endDate);
                filteredDateRange.textContent = `${startDate.toLocaleDateString('zh-CN')} - ${endDate.toLocaleDateString('zh-CN')}`;
            } else {
                filteredDateRange.textContent = '全部时间';
            }
            console.log('日期范围更新:', filteredDateRange.textContent);
            
            // 更新图表
            this.updateCharts();
        }
        
        console.log('updateStats 完成');
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        const currentPageElement = document.getElementById('currentPage');
        const totalPagesElement = document.getElementById('totalPages');
        const startRecordElement = document.getElementById('startRecord');
        const endRecordElement = document.getElementById('endRecord');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        
        console.log('updatePagination 被调用');
        console.log('filteredData 长度:', this.filteredData.length);
        console.log('itemsPerPage:', this.itemsPerPage);
        console.log('totalPages:', totalPages);
        console.log('currentPage:', this.currentPage);
        
        // 更新页码显示
        if (currentPageElement) {
            currentPageElement.textContent = this.currentPage;
        }
        
        if (totalPagesElement) {
            totalPagesElement.textContent = totalPages;
        }
        
        // 更新记录范围显示
        if (startRecordElement && endRecordElement) {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endIndex = Math.min(this.currentPage * this.itemsPerPage, this.filteredData.length);
            startRecordElement.textContent = startIndex;
            endRecordElement.textContent = endIndex;
        }
        
        // 更新按钮状态
        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage <= 1;
            prevPageBtn.classList.toggle('opacity-50', this.currentPage <= 1);
        }
        
        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage >= totalPages;
            nextPageBtn.classList.toggle('opacity-50', this.currentPage >= totalPages);
        }
        
        console.log('分页更新完成');
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
            this.updatePagination();
        }
    }
    
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
            this.updatePagination();
        }
    }
    
    initCharts() {
        console.log('初始化图表...');
        if (typeof Chart !== 'undefined') {
            this.createCharts();
        } else {
            console.warn('Chart.js 未加载，图表功能不可用');
        }
    }
    
    createCharts() {
        // 创建图表的逻辑
        console.log('创建图表...');
        
        // 初始化图表
        this.updateChart();
    }
    
    updateProjectChartSelector() {
        const projectChartSelector = document.getElementById('projectChartSelector');
        if (!projectChartSelector) return;
        
        // 获取所有项目
        const projects = [...new Set(this.filteredData.map(row => row.projectName))];
        
        projectChartSelector.innerHTML = '<option value="">全部项目</option>';
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectChartSelector.appendChild(option);
        });
    }
    
    updateChart() {
        console.log('更新图表...');
        
        if (typeof Chart === 'undefined') {
            console.error('Chart.js 未加载，图表功能不可用');
            // 尝试重新等待 Chart.js 加载
            this.ensureChartJSLoaded().then(() => {
                console.log('Chart.js 重新加载成功，重新更新图表...');
                this.updateChart();
            }).catch(() => {
                console.error('Chart.js 重新加载失败');
                // 显示错误信息给用户
                const ctx = document.getElementById('mainChart');
                if (ctx) {
                    this.showNoDataMessage(ctx);
                }
            });
            return;
        }
        
        const chartType = document.getElementById('chartTypeSelector')?.value || 'line';
        const ctx = document.getElementById('mainChart');
        
        if (!ctx) {
            console.error('找不到图表容器元素');
            return;
        }
        
        // 强制销毁所有现有的图表实例
        if (this.currentChart) {
            try {
                this.currentChart.destroy();
                console.log('已销毁现有图表实例');
            } catch (error) {
                console.warn('销毁图表时出错:', error);
            }
            this.currentChart = null;
        }
        
        // 清理Canvas，确保没有残留的图表
        try {
            // 获取Chart.js注册的所有图表实例
            const chartInstances = Chart.instances || [];
            for (let i = chartInstances.length - 1; i >= 0; i--) {
                const chart = chartInstances[i];
                if (chart && chart.canvas && chart.canvas.id === 'mainChart') {
                    try {
                        chart.destroy();
                        console.log('清理了残留的图表实例');
                    } catch (error) {
                        console.warn('清理残留图表时出错:', error);
                    }
                }
            }
        } catch (error) {
            console.warn('清理图表实例时出错:', error);
        }
        
        // 延迟渲染图表，确保DOM已更新
        setTimeout(() => {
            try {
                if (chartType === 'line') {
                    this.renderLineChart(ctx);
                } else if (chartType === 'pie') {
                    this.renderPieChart(ctx);
                }
            } catch (error) {
                console.error('渲染图表时出错:', error);
                this.showNoDataMessage(ctx);
            }
        }, 100); // 增加延迟时间
    }
    
    renderLineChart(ctx) {
        console.log('开始渲染折线图');
        console.log('数据长度:', this.filteredData.length);
        
        // 确保Canvas是干净的
        if (this.currentChart) {
            try {
                this.currentChart.destroy();
                this.currentChart = null;
            } catch (error) {
                console.warn('销毁现有图表时出错:', error);
            }
        }
        
        if (this.filteredData.length === 0) {
            this.showNoDataMessage(ctx);
            return;
        }
        
        // 按日期分组数据
        const dateGroups = {};
        this.filteredData.forEach(row => {
            // 标准化日期格式
            let date = row.date;
            
            // 处理不同的日期格式
            if (date.includes('.')) {
                // 将 "2023.12.23" 转换为 "2023-12-23"
                date = date.replace(/\./g, '-');
            }
            
            if (!dateGroups[date]) {
                dateGroups[date] = 0;
            }
            dateGroups[date] += parseInt(row.duration) || 0;
        });
        
        // 排序日期
        const sortedDates = Object.keys(dateGroups).sort();
        const durations = sortedDates.map(date => dateGroups[date]);
        
        console.log('图表数据:', {
            dates: sortedDates,
            durations: durations,
            totalDataPoints: sortedDates.length
        });
        
        if (sortedDates.length === 0) {
            this.showNoDataMessage(ctx);
            return;
        }
        
        this.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDates.map(date => {
                    // 格式化日期显示
                    const dateObj = new Date(date);
                    return dateObj.toLocaleDateString('zh-CN');
                }),
                datasets: [{
                    label: '每日学习时间（分钟）',
                    data: durations,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: '学习时间趋势图',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
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
                            text: '学习时间（分钟）'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '日期'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        
        console.log('折线图渲染完成');
    }
    
    renderPieChart(ctx) {
        // 确保Canvas是干净的
        if (this.currentChart) {
            try {
                this.currentChart.destroy();
                this.currentChart = null;
            } catch (error) {
                console.warn('销毁现有图表时出错:', error);
            }
        }
        
        if (this.filteredData.length === 0) {
            this.showNoDataMessage(ctx);
            return;
        }
        
        const projectSelector = document.getElementById('projectChartSelector');
        const selectedProject = projectSelector?.value;
        
        let dataToChart = this.filteredData;
        
        // 如果选择了特定项目，只显示该项目的数据
        if (selectedProject) {
            dataToChart = this.filteredData.filter(row => row.projectName === selectedProject);
        }
        
        // 按项目分组数据
        const projectGroups = {};
        dataToChart.forEach(row => {
            const project = row.projectName;
            if (!projectGroups[project]) {
                projectGroups[project] = 0;
            }
            projectGroups[project] += parseInt(row.duration) || 0;
        });
        
        const projects = Object.keys(projectGroups);
        const durations = Object.values(projectGroups);
        
        console.log('饼图数据:', {
            projects: projects,
            durations: durations,
            totalProjects: projects.length
        });
        
        // 生成颜色
        const colors = this.generateColors(projects.length);
        
        this.currentChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: projects,
                datasets: [{
                    data: durations,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.8', '1')),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: selectedProject ? `${selectedProject} 学习时间分布` : '项目学习时间占比',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
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
        });
        
        console.log('饼图渲染完成');
    }
    
    generateColors(count) {
        const colors = [
            'rgba(59, 130, 246, 0.8)',   // 蓝色
            'rgba(16, 185, 129, 0.8)',   // 绿色
            'rgba(245, 158, 11, 0.8)',   // 黄色
            'rgba(239, 68, 68, 0.8)',    // 红色
            'rgba(139, 92, 246, 0.8)',   // 紫色
            'rgba(236, 72, 153, 0.8)',   // 粉色
            'rgba(14, 165, 233, 0.8)',   // 天蓝色
            'rgba(34, 197, 94, 0.8)',    // 绿色
            'rgba(251, 146, 60, 0.8)',   // 橙色
            'rgba(168, 85, 247, 0.8)'    // 紫色
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }
    
    showNoDataMessage(ctx) {
        // 清理现有的图表实例
        if (this.currentChart) {
            try {
                this.currentChart.destroy();
                this.currentChart = null;
            } catch (error) {
                console.warn('销毁图表时出错:', error);
            }
        }
        
        // 显示无数据消息
        const canvas = ctx;
        const context = canvas.getContext('2d');
        
        // 清除画布
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // 设置样式
        context.fillStyle = '#6B7280';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // 绘制文本
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        context.fillText('暂无数据可显示', centerX, centerY);
    }
    
    updateCharts() {
        console.log('更新图表...');
        this.updateChart();
    }
}

// 初始化函数，供main-content.hbs调用
function initializeDashboard() {
    console.log('初始化仪表板页面...');
    if (typeof DashboardExcelApp === 'function') {
        window.dashboardApp = new DashboardExcelApp();
        console.log('DashboardExcelApp 初始化完成');
    } else {
        console.error('DashboardExcelApp 类未找到');
    }
} 