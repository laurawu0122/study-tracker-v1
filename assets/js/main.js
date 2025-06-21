// 全局变量
let currentData = [];
let chartInstance = null;
let dateRange = { min: null, max: null };
let currentFilter = {
  project: '',
  startDate: null,
  endDate: null
};
let isLoggedIn = false; // 用户登录状态
let currentUser = null; // 当前用户信息
let currentChartType = 'trend'; // 当前图表类型

// 分页相关全局变量
let currentPage = 1;
let pageSize = 10;
let filteredData = [];
let totalPages = 1;
let totalRecords = 0;

// 查询相关全局变量
let queryFilter = {
  startDate: '',
  endDate: '',
  project: ''
};

// 检查Chart.js是否可用
function checkChartJS() {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js 库未加载');
    showError('Chart.js 库加载失败，图表功能不可用');
    return false;
  }
  console.log('Chart.js 版本:', Chart.version);
  return true;
}

// DOM加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，开始初始化');
  
  // 检查Chart.js
  if (!checkChartJS()) {
    return;
  }
  
  // 检查登录状态
  checkLoginStatus();
  
  // 设置默认日期为最近三个月
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);
  
  document.getElementById('endDate').valueAsDate = endDate;
  document.getElementById('startDate').valueAsDate = startDate;
  
  // 初始化当前筛选条件
  currentFilter.startDate = startDate;
  currentFilter.endDate = endDate;
  
  // 初始化事件监听
  initEventListeners();
  
  console.log('初始化完成');
});

// 检查登录状态
function checkLoginStatus() {
  const savedUser = localStorage.getItem('currentUser');
  const token = localStorage.getItem('token');
  
  if (savedUser && token) {
    try {
      currentUser = JSON.parse(savedUser);
      isLoggedIn = true;
      updateLoginButton(currentUser.username);
      enableFeatures();
      
      // 检查是否是首次管理员登录
      if (currentUser.isFirstAdmin && !currentUser.passwordChanged) {
        showPasswordChangeModal();
      }
    } catch (error) {
      console.error('解析用户信息失败:', error);
      clearLoginData();
    }
  } else {
    isLoggedIn = false;
    disableFeatures();
  }
}

// 清除登录数据
function clearLoginData() {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('token');
  isLoggedIn = false;
  currentUser = null;
  disableFeatures();
}

// 禁用功能
function disableFeatures() {
  const fileInput = document.getElementById('excelFile');
  const applyFilterBtn = document.getElementById('applyFilter');
  const exportChartBtn = document.getElementById('exportChart');
  const exportDataBtn = document.getElementById('exportData');
  const openEditorBtn = document.getElementById('openEditor');
  
  // 添加禁用样式
  [fileInput, applyFilterBtn, exportChartBtn, exportDataBtn, openEditorBtn].forEach(element => {
    if (element) {
      element.classList.add('feature-disabled');
    }
  });
  
  // 添加点击事件监听器
  [fileInput, applyFilterBtn, exportChartBtn, exportDataBtn, openEditorBtn].forEach(element => {
    if (element) {
      element.addEventListener('click', showLoginPrompt);
    }
  });
}

// 启用功能
function enableFeatures() {
  const fileInput = document.getElementById('excelFile');
  const applyFilterBtn = document.getElementById('applyFilter');
  const exportChartBtn = document.getElementById('exportChart');
  const exportDataBtn = document.getElementById('exportData');
  const openEditorBtn = document.getElementById('openEditor');
  
  // 移除禁用样式
  [fileInput, applyFilterBtn, exportChartBtn, exportDataBtn, openEditorBtn].forEach(element => {
    if (element) {
      element.classList.remove('feature-disabled');
    }
  });
  
  // 移除点击事件监听器
  [fileInput, applyFilterBtn, exportChartBtn, exportDataBtn, openEditorBtn].forEach(element => {
    if (element) {
      element.removeEventListener('click', showLoginPrompt);
    }
  });
}

// 显示登录提示
function showLoginPrompt(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const loginOverlay = document.getElementById('loginOverlay');
  if (loginOverlay) {
    loginOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

// 打开登录弹窗
function openLoginModal() {
  const loginOverlay = document.getElementById('loginOverlay');
  const authModal = document.getElementById('authModal');
  
  if (loginOverlay) {
    loginOverlay.classList.remove('show');
  }
  
  if (authModal) {
    authModal.classList.add('show');
  }
  
  document.body.style.overflow = 'hidden';
}

// 初始化所有事件监听
function initEventListeners() {
  // 文件上传
  document.getElementById('excelFile').addEventListener('change', function(e) {
    if (!isLoggedIn) {
      showLoginPrompt(e);
      return;
    }
    
    const file = e.target.files[0];
    const fileError = document.getElementById('fileError');
    
    if (!file) return;
    
    // 文件大小限制 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      if (!fileError) {
        alert('页面缺少 fileError 元素，请联系管理员修复！');
        return;
      }
      showError('文件大小不能超过10MB');
      return;
    }
    
    // 检查文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      showError('请选择有效的Excel文件 (.xlsx 或 .xls)');
      return;
    }
    
    showLoading(true);
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          showError('Excel文件格式不正确，请确保包含标题行和数据行');
          showLoading(false);
          return;
        }
        
        processRawData(jsonData);
        showLoading(false);
      } catch (error) {
        console.error('处理Excel文件时出错:', error);
        showError('处理Excel文件时出错，请检查文件格式');
        showLoading(false);
      }
    };
    
    reader.onerror = function() {
      showError('读取文件时出错');
      showLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  });
  
  // 日期筛选
  document.getElementById('startDate').addEventListener('change', applyFilters);
  document.getElementById('endDate').addEventListener('change', applyFilters);
  
  // 项目筛选
  document.getElementById('projectSelect').addEventListener('change', applyFilters);
  
  // 快捷日期按钮
  document.querySelectorAll('.quick-date-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const days = parseInt(this.dataset.days);
      setQuickDateRange(days);
    });
  });
  
  // 图表类型选择
  document.getElementById('chartTypeSelect').addEventListener('change', function() {
    updateChartTitle();
    if (currentData.length > 0) {
      applyFilters();
    }
  });
  
  // 导出按钮
  document.getElementById('exportChart').addEventListener('click', exportChart);
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('downloadTemplate').addEventListener('click', downloadTemplate);
  
  // 窗口大小变化监听器 - 重新调整图表
  let resizeTimeout;
  window.addEventListener('resize', function() {
    // 防抖处理，避免频繁重新调整
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      if (chartInstance && currentData && currentData.length > 0) {
        // 重新创建图表以适应新的容器尺寸
        updateChart(currentData);
      }
    }, 300);
  });
  
  // 屏幕方向变化监听器（移动端）
  window.addEventListener('orientationchange', function() {
    // 延迟处理，等待屏幕旋转完成
    setTimeout(function() {
      if (chartInstance && currentData && currentData.length > 0) {
        updateChart(currentData);
      }
    }, 500);
  });
  
  // 初始化认证弹窗
  initAuthModal();
  
  // 初始化验证码输入
  initVerificationCodeInput();
  
  // 初始化图表滚动监听器
  initChartScrollListener();
  
  // 查询和重置按钮
  document.getElementById('queryBtn').addEventListener('click', applyQueryFilter);
  document.getElementById('resetQueryBtn').addEventListener('click', resetQueryFilter);
  
  // 分页按钮
  document.getElementById('firstPageBtn').addEventListener('click', () => goToPage(1));
  document.getElementById('prevPageBtn').addEventListener('click', () => goToPage(currentPage - 1));
  document.getElementById('nextPageBtn').addEventListener('click', () => goToPage(currentPage + 1));
  document.getElementById('lastPageBtn').addEventListener('click', () => goToPage(totalPages));
  
  // 每页显示数量变化
  document.getElementById('pageSizeSelect').addEventListener('change', function() {
    pageSize = parseInt(this.value);
    currentPage = 1;
    updatePagination();
    displayCurrentPageData();
  });
}

// 处理原始数据
function processRawData(jsonData) {
  console.log('处理原始数据:', jsonData);
  
  // 检查数据格式
  if (!Array.isArray(jsonData) || jsonData.length < 2) {
    console.error('数据格式不正确:', jsonData);
    showError('Excel文件格式不正确，请确保包含标题行和数据行');
    return;
  }
  
  // 获取标题行
  const headers = jsonData[0];
  console.log('标题行:', headers);
  
  // 将数组格式转换为对象格式
  currentData = jsonData.slice(1).map(row => {
    const item = {};
    headers.forEach((header, index) => {
      if (header && row[index] !== undefined) {
        item[header] = row[index];
      }
    });
    return item;
  });
  
  console.log('转换后的数据:', currentData);
  
  // 数据预处理
  currentData = currentData.map(item => {
    // 确保日期格式正确
    if (item['日期']) {
      const date = new Date(item['日期']);
      if (!isNaN(date.getTime())) {
        item['日期'] = date.toISOString().split('T')[0];
      }
    }
    
    // 处理时间格式（开始时间和结束时间）
    ['项目开始时间', '项目结束时间'].forEach(timeField => {
      if (item[timeField]) {
        let timeValue = item[timeField];
        
        // 如果是数字（Excel时间格式），转换为时间字符串
        if (typeof timeValue === 'number') {
          // Excel时间格式：0.79375 表示 19:03 (19小时3分钟)
          const totalSeconds = Math.round(timeValue * 24 * 60 * 60); // 转换为秒
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          
          item[timeField] = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else if (typeof timeValue === 'string') {
          // 检查是否是纯时间格式（如 "19:03"）
          if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeValue)) {
            // 如果是 HH:MM:SS 格式，去掉秒数部分
            if (timeValue.includes(':') && timeValue.split(':').length === 3) {
              const [hours, minutes] = timeValue.split(':');
              item[timeField] = `${hours}:${minutes}`;
            } else {
              // 纯时间格式，保持原样
              item[timeField] = timeValue;
            }
          } else {
            // 尝试解析为日期时间格式
            const time = new Date(timeValue);
            if (!isNaN(time.getTime())) {
              // 格式化为 HH:MM 格式
              const hours = time.getHours().toString().padStart(2, '0');
              const minutes = time.getMinutes().toString().padStart(2, '0');
              item[timeField] = `${hours}:${minutes}`;
            } else {
              // 如果无法解析，保持原值
              item[timeField] = timeValue;
            }
          }
        } else if (timeValue instanceof Date) {
          // 如果是Date对象
          const hours = timeValue.getHours().toString().padStart(2, '0');
          const minutes = timeValue.getMinutes().toString().padStart(2, '0');
          item[timeField] = `${hours}:${minutes}`;
        } else {
          // 其他格式，保持原值
          item[timeField] = timeValue;
        }
      }
    });
    
    // 处理项目完成时间（作为分钟数值）
    if (item['项目完成时间'] !== undefined && item['项目完成时间'] !== null) {
      let completionTime = item['项目完成时间'];
      
      // 如果是字符串，尝试提取数字
      if (typeof completionTime === 'string') {
        // 移除所有非数字字符，只保留数字和小数点
        completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
      } else if (typeof completionTime === 'number') {
        // 如果已经是数字，直接使用
        completionTime = completionTime;
      } else {
        // 其他情况设为0
        completionTime = 0;
      }
      
      item['项目完成时间'] = completionTime;
    }
    
    return item;
  });
  
  console.log('预处理后的数据:', currentData);
  
  // 提取日期范围
  dateRange = extractDateRange(currentData);
  
  // 根据实际数据调整日期筛选范围
  if (dateRange.min && dateRange.max) {
    // 设置筛选范围为数据的实际日期范围
    currentFilter.startDate = dateRange.min;
    currentFilter.endDate = dateRange.max;
    
    // 更新日期输入框
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput) startDateInput.valueAsDate = dateRange.min;
    if (endDateInput) endDateInput.valueAsDate = dateRange.max;
  }
  
  // 更新项目选择器
  updateProjectSelect(currentData);
  
  // 初始化查询项目选择器
  updateQueryProjectSelect(currentData);
  
  // 重置分页
  currentPage = 1;
  filteredData = currentData;
  totalRecords = currentData.length;
  totalPages = Math.ceil(totalRecords / pageSize);
  
  // 应用初始筛选
  applyFilters();
}

// 提取日期范围
function extractDateRange(data) {
  const dates = data
    .map(item => {
      const dateStr = item["日期"];
      if (dateStr) {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    })
    .filter(date => date !== null)
    .sort((a, b) => a - b);
  
  return {
    min: dates.length > 0 ? dates[0] : null,
    max: dates.length > 0 ? dates[dates.length - 1] : null
  };
}

// 更新项目选择器
function updateProjectSelect(data) {
  const projectSelect = document.getElementById('projectSelect');
  const projects = [...new Set(data.map(item => item["学习项目名称"]).filter(Boolean))];
  
  // 清空现有选项（保留"全部项目"）
  projectSelect.innerHTML = '<option value="">全部项目</option>';
  
  // 添加项目选项
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project;
    option.textContent = project;
    projectSelect.appendChild(option);
  });
  
  // 重新绑定事件监听
  projectSelect.removeEventListener('change', projectSelectChangeHandler);
  projectSelect.addEventListener('change', projectSelectChangeHandler);
}

// 项目选择变化处理
function projectSelectChangeHandler() {
  currentFilter.project = this.value;
  applyFilters();
}

// 应用筛选条件
function applyFilters() {
  if (currentData.length === 0) return;
  
  console.log('应用筛选条件:', currentFilter);
  
  // 应用图表筛选条件
  let filtered = currentData.filter(item => {
    const dateStr = item['日期'];
    const project = item['学习项目名称'];
    
    // 日期筛选
    if (dateStr) {
      const itemDate = new Date(dateStr);
      if (!isNaN(itemDate.getTime())) {
        if (currentFilter.startDate && itemDate < currentFilter.startDate) return false;
        if (currentFilter.endDate && itemDate > currentFilter.endDate) return false;
      }
    }
    
    // 项目筛选
    if (currentFilter.project && project !== currentFilter.project) return false;
    
    return true;
  });
  
  // 应用查询筛选条件（针对表格数据）
  filtered = filtered.filter(item => {
    const dateStr = item['日期'];
    const project = item['学习项目名称'];
    
    // 查询日期筛选
    if (dateStr) {
      const itemDate = new Date(dateStr);
      if (!isNaN(itemDate.getTime())) {
        if (queryFilter.startDate) {
          const queryStartDate = new Date(queryFilter.startDate);
          if (itemDate < queryStartDate) return false;
        }
        
        if (queryFilter.endDate) {
          const queryEndDate = new Date(queryFilter.endDate);
          if (itemDate > queryEndDate) return false;
        }
      }
    }
    
    // 查询项目筛选
    if (queryFilter.project && project !== queryFilter.project) return false;
    
    return true;
  });
  
  console.log('筛选后的数据:', filtered);
  
  // 更新分页相关变量
  filteredData = filtered;
  totalRecords = filtered.length;
  totalPages = Math.ceil(totalRecords / pageSize);
  
  // 确保当前页在有效范围内
  if (currentPage > totalPages) {
    currentPage = totalPages > 0 ? totalPages : 1;
  }
  
  // 更新图表
  updateChart(filtered);
  
  // 更新统计数据
  updateStats(filtered);
  
  // 更新分页信息
  updatePagination();
  
  // 显示当前页数据
  displayCurrentPageData();
}

// 获取日期范围文本
function getDateRange(data) {
  if (data.length === 0) return '-';
  
  const dates = data
    .map(item => {
      const dateStr = item["日期"];
      if (dateStr) {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    })
    .filter(date => date !== null)
    .sort((a, b) => a - b);
  
  if (dates.length === 0) return '-';
  
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  
  return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
}

// 显示数据表格
function displayDataTable(data) {
  const output = document.getElementById('output');
  
  if (data.length === 0) {
    output.innerHTML = '<div class="no-data">没有找到符合条件的数据</div>';
    return;
  }
  
  let tableHTML = `
    <table>
      <thead>
        <tr>
          <th>日期</th>
          <th>学习项目名称</th>
          <th>项目开始时间</th>
          <th>项目结束时间</th>
          <th>项目完成时间（分钟）</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  data.forEach(item => {
    // 处理日期格式
    let dateStr = item["日期"];
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        dateStr = date.toLocaleDateString();
      }
    }
    
    // 处理时间格式 - 直接使用预处理后的时间字符串
    let startTimeStr = item["项目开始时间"] || '-';
    let endTimeStr = item["项目结束时间"] || '-';
    
    // 处理完成时间
    let completionTime = item["项目完成时间"];
    if (typeof completionTime === 'string') {
      completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
    } else if (typeof completionTime === 'number') {
      completionTime = completionTime;
    } else {
      completionTime = 0;
    }
    
    tableHTML += `
      <tr>
        <td>${dateStr || '-'}</td>
        <td>${item["学习项目名称"] || '-'}</td>
        <td>${startTimeStr}</td>
        <td>${endTimeStr}</td>
        <td>${completionTime} 分钟</td>
      </tr>
    `;
  });
  
  tableHTML += '</tbody></table>';
  output.innerHTML = tableHTML;
}

// 更新图表标题
function updateChartTitle() {
  const chartTitle = document.getElementById('chartTitle');
  if (!chartTitle) return;
  
  const titles = {
    'trend': '学习时间趋势 (折线图)',
    'radar': '项目分布 (雷达图)',
    'bar': '项目时间对比 (柱状图)',
    'pie': '项目时间占比 (饼图)',
    'daily': '每日学习时长 (柱状图)'
  };
  
  chartTitle.textContent = titles[currentChartType] || titles['trend'];
}

// 更新图表
function updateChart(data) {
  const ctx = document.getElementById('chart');
  if (!ctx) {
    console.error('找不到图表canvas元素');
    return;
  }
  
  // 销毁现有图表
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  
  // 获取当前图表类型
  const chartTypeSelect = document.getElementById('chartTypeSelect');
  currentChartType = chartTypeSelect ? chartTypeSelect.value : 'trend';
  
  // 设置图表容器的data属性，用于CSS样式
  const chartContainer = ctx.closest('.chart-container');
  if (chartContainer) {
    chartContainer.setAttribute('data-chart-type', currentChartType);
  }
  
  // 根据图表类型创建相应的图表
  switch (currentChartType) {
    case 'trend':
      createTrendChart(ctx, data);
      break;
    case 'radar':
      createRadarChart(ctx, data);
      break;
    case 'bar':
      createBarChart(ctx, data);
      break;
    case 'pie':
      createPieChart(ctx, data);
      break;
    case 'daily':
      createDailyChart(ctx, data);
      break;
    default:
      createTrendChart(ctx, data);
  }
  
  // 更新滚动提示
  setTimeout(() => {
    updateChartScrollHint();
  }, 100);
}

// 创建趋势图（折线图）
function createTrendChart(ctx, data) {
  // 按日期分组数据
  const dateMap = {};
  data.forEach(item => {
    let dateStr = item["日期"];
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        dateStr = date.toISOString().split('T')[0]; // 使用YYYY-MM-DD格式
      }
    }
    
    if (dateStr) {
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = 0;
      }
      
      // 处理完成时间
      let completionTime = item["项目完成时间"];
      if (typeof completionTime === 'string') {
        completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
      } else if (typeof completionTime === 'number') {
        completionTime = completionTime;
      } else {
        completionTime = 0;
      }
      
      dateMap[dateStr] += completionTime;
    }
  });
  
  // 排序日期
  const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a) - new Date(b));
  
  const chartData = {
    labels: sortedDates,
    datasets: [{
      label: '学习时间（分钟）',
      data: sortedDates.map(date => dateMap[date]),
      backgroundColor: 'rgba(0, 122, 255, 0.2)',
      borderColor: 'rgba(0, 122, 255, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(0, 122, 255, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.4
    }]
  };
  
  const config = {
    type: 'line',
    data: chartData,
    options: getCommonChartOptions('学习时间趋势')
  };
  
  createChartInstance(ctx, config);
}

// 创建雷达图
function createRadarChart(ctx, data) {
  // 按项目分组数据
  const projectMap = {};
  data.forEach(item => {
    const project = item["学习项目名称"] || '未知项目';
    
    if (!projectMap[project]) {
      projectMap[project] = 0;
    }
    
    // 处理完成时间
    let completionTime = item["项目完成时间"];
    if (typeof completionTime === 'string') {
      completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
    } else if (typeof completionTime === 'number') {
      completionTime = completionTime;
    } else {
      completionTime = 0;
    }
    
    projectMap[project] += completionTime;
  });
  
  const projects = Object.keys(projectMap);
  const times = projects.map(project => projectMap[project]);
  
  const chartData = {
    labels: projects,
    datasets: [{
      label: '学习时间（分钟）',
      data: times,
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(255, 99, 132, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };
  
  // 检测是否为移动端
  const isMobile = window.innerWidth <= 768;
  
  const config = {
    type: 'radar',
    data: chartData,
    options: {
      // 雷达图自适应配置
      layout: {
        padding: isMobile ? {
          top: 20,
          bottom: 30,
          left: 20,
          right: 20
        } : {
          top: 30,
          bottom: 40,
          left: 30,
          right: 30
        }
      },
      responsive: true,
      maintainAspectRatio: true, // 启用宽高比自适应
      aspectRatio: isMobile ? 1.2 : 2.0, // 移动端1.2:1显示更大，PC端2.0:1显示更小
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              size: isMobile ? 12 : 14,
              family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
            },
            color: '#1d1d1f'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(0, 122, 255, 0.5)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `学习时间: ${context.parsed.y || context.parsed} 分钟`;
            }
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            stepSize: Math.max(...times) / 5,
            font: {
              size: isMobile ? 10 : 12,
              family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
            },
            color: '#86868b'
          },
          pointLabels: {
            font: {
              size: isMobile ? 10 : 12,
              family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
            },
            color: '#1d1d1f',
            padding: isMobile ? 8 : 12
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
            circular: true
          },
          angleLines: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      },
      elements: {
        point: {
          hoverRadius: isMobile ? 6 : 8
        }
      }
    }
  };
  
  createChartInstance(ctx, config);
}

// 创建柱状图
function createBarChart(ctx, data) {
  // 按项目分组数据
  const projectMap = {};
  data.forEach(item => {
    const project = item["学习项目名称"] || '未知项目';
    
    if (!projectMap[project]) {
      projectMap[project] = 0;
    }
    
    // 处理完成时间
    let completionTime = item["项目完成时间"];
    if (typeof completionTime === 'string') {
      completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
    } else if (typeof completionTime === 'number') {
      completionTime = completionTime;
    } else {
      completionTime = 0;
    }
    
    projectMap[project] += completionTime;
  });
  
  const projects = Object.keys(projectMap);
  const times = projects.map(project => projectMap[project]);
  
  const colors = generateColors(projects.length);
  
  const chartData = {
    labels: projects,
    datasets: [{
      label: '学习时间（分钟）',
      data: times,
      backgroundColor: colors.map(color => color.replace('1)', '0.8)')),
      borderColor: colors,
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false
    }]
  };
  
  const config = {
    type: 'bar',
    data: chartData,
    options: getCommonChartOptions('项目时间对比')
  };
  
  createChartInstance(ctx, config);
}

// 创建饼图
function createPieChart(ctx, data) {
  // 按项目分组数据
  const projectMap = {};
  data.forEach(item => {
    const project = item["学习项目名称"] || '未知项目';
    
    if (!projectMap[project]) {
      projectMap[project] = 0;
    }
    
    // 处理完成时间
    let completionTime = item["项目完成时间"];
    if (typeof completionTime === 'string') {
      completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
    } else if (typeof completionTime === 'number') {
      completionTime = completionTime;
    } else {
      completionTime = 0;
    }
    
    projectMap[project] += completionTime;
  });
  
  const projects = Object.keys(projectMap);
  const times = projects.map(project => projectMap[project]);
  
  const colors = generateColors(projects.length);
  
  const chartData = {
    labels: projects,
    datasets: [{
      data: times,
      backgroundColor: colors,
      borderColor: '#fff',
      borderWidth: 2,
      hoverOffset: 4
    }]
  };
  
  const config = {
    type: 'pie',
    data: chartData,
    options: {
      ...getCommonChartOptions('项目时间占比'),
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 20,
            usePointStyle: true
          }
        }
      }
    }
  };
  
  createChartInstance(ctx, config);
}

// 创建每日学习时长图
function createDailyChart(ctx, data) {
  // 按日期分组数据
  const dateMap = {};
  data.forEach(item => {
    let dateStr = item["日期"];
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        dateStr = date.toISOString().split('T')[0]; // 使用YYYY-MM-DD格式
      }
    }
    
    if (dateStr) {
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = 0;
      }
      
      // 处理完成时间
      let completionTime = item["项目完成时间"];
      if (typeof completionTime === 'string') {
        completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
      } else if (typeof completionTime === 'number') {
        completionTime = completionTime;
      } else {
        completionTime = 0;
      }
      
      dateMap[dateStr] += completionTime;
    }
  });
  
  // 排序日期
  const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a) - new Date(b));
  
  const chartData = {
    labels: sortedDates,
    datasets: [{
      label: '每日学习时长（分钟）',
      data: sortedDates.map(date => dateMap[date]),
      backgroundColor: 'rgba(255, 99, 132, 0.8)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 2,
      borderRadius: 4,
      borderSkipped: false
    }]
  };
  
  const config = {
    type: 'bar',
    data: chartData,
    options: getCommonChartOptions('每日学习时长')
  };
  
  createChartInstance(ctx, config);
}

// 获取通用图表配置
function getCommonChartOptions(title) {
  // 检测是否为移动端
  const isMobile = window.innerWidth <= 768;
  
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            size: isMobile ? 12 : 14,
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
          },
          color: '#1d1d1f',
          padding: isMobile ? 8 : 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(0, 122, 255, 0.5)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: isMobile ? 12 : 14
        },
        bodyFont: {
          size: isMobile ? 11 : 13
        },
        callbacks: {
          label: function(context) {
            return `学习时间: ${context.parsed.y || context.parsed} 分钟`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: title === '项目分布' ? '项目' : '日期',
          font: {
            size: isMobile ? 12 : 14,
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
          },
          color: '#1d1d1f'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
          },
          color: '#86868b',
          maxRotation: isMobile ? 45 : 30, // 增加旋转角度，避免标签重叠
          minRotation: isMobile ? 0 : 0,
          padding: isMobile ? 8 : 12, // 增加标签间距
          autoSkip: true,
          autoSkipPadding: isMobile ? 10 : 15 // 自动跳过标签的间距
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: '学习时间（分钟）',
          font: {
            size: isMobile ? 12 : 14,
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
          },
          color: '#1d1d1f'
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
            family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
          },
          color: '#86868b'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      point: {
        hoverRadius: isMobile ? 6 : 8
      }
    },
    // 确保图表能够正确响应容器尺寸变化
    layout: {
      padding: {
        top: isMobile ? 15 : 25,
        right: isMobile ? 15 : 25,
        bottom: isMobile ? 40 : 60, // 增加底部边距，确保X轴标签显示完整
        left: isMobile ? 15 : 25
      }
    }
  };
}

// 创建图表实例
function createChartInstance(ctx, config) {
  try {
    chartInstance = new Chart(ctx, config);
    console.log("图表创建成功，类型:", config.type);
  } catch (error) {
    console.error("创建图表失败:", error);
  }
}

// 生成颜色数组
function generateColors(count) {
  const colors = [
    '#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE',
    '#5856D6', '#FF2D92', '#5AC8FA', '#FFCC02', '#FF6B35'
  ];
  
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
}

// 设置快捷日期范围
function setQuickDateRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  
  if (days > 0) {
    startDate.setDate(startDate.getDate() - days);
  } else {
    // 全部日期
    startDate.setFullYear(2000);
  }
  
  document.getElementById('startDate').valueAsDate = startDate;
  document.getElementById('endDate').valueAsDate = endDate;
  
  currentFilter.startDate = startDate;
  currentFilter.endDate = endDate;
  
  updateQuickDateButtons();
  applyFilters();
}

// 更新快捷日期按钮状态
function updateQuickDateButtons() {
  const buttons = document.querySelectorAll('.quick-date-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // 根据当前筛选条件设置活动状态
  const startDate = currentFilter.startDate;
  const endDate = currentFilter.endDate;
  
  if (startDate && endDate) {
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) {
      document.querySelector('[data-days="7"]').classList.add('active');
    } else if (daysDiff <= 30) {
      document.querySelector('[data-days="30"]').classList.add('active');
    } else if (daysDiff <= 90) {
      document.querySelector('[data-days="90"]').classList.add('active');
    } else {
      document.querySelector('[data-days="0"]').classList.add('active');
    }
  }
}

// 显示/隐藏加载状态
function showLoading(show) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = show ? 'flex' : 'none';
  }
}

// 显示错误信息
function showError(message) {
  const fileError = document.getElementById('fileError');
  if (!fileError) {
    alert('页面缺少 fileError 元素，请联系管理员修复！');
    return;
  }
  fileError.textContent = message;
  fileError.style.display = 'block';
  console.error('错误:', message);
}

// 导出图表
function exportChart() {
  console.log('导出图表被调用');
  console.log('chartInstance:', chartInstance);
  console.log('isLoggedIn:', isLoggedIn);
  console.log('currentData:', currentData);
  
  if (!isLoggedIn) {
    alert('请先登录');
    return;
  }
  
  if (!chartInstance) {
    alert('请先上传数据文件');
    return;
  }
  
  try {
    const link = document.createElement('a');
    link.download = '学习时间趋势图.png';
    link.href = chartInstance.toBase64Image();
    link.click();
    console.log('图表导出成功');
  } catch (error) {
    console.error('导出图表失败:', error);
    alert('导出图表失败，请稍后重试');
  }
}

// 导出数据
function exportData() {
  if (!currentData || currentData.length === 0) {
    alert('没有数据可导出');
    return;
  }
  
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(currentData);
  XLSX.utils.book_append_sheet(wb, ws, "学习记录");
  
  // 导出文件
  XLSX.writeFile(wb, `学习记录_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 下载模板
function downloadTemplate() {
  try {
    const link = document.createElement('a');
    link.href = '/excel_templates/学习项目记录示例.xlsx';
    link.download = '学习项目记录示例.xlsx';
    link.click();
    console.log('模板下载成功');
  } catch (error) {
    console.error('下载模板失败:', error);
    alert('下载模板失败，请稍后重试');
  }
}

// 初始化登录弹窗
function initAuthModal() {
  const authModal = document.getElementById('authModal');
  const closeBtn = document.getElementById('closeAuthModal');
  const loginTabBtn = document.querySelector('[data-tab="login"]');
  const registerTabBtn = document.querySelector('[data-tab="register"]');
  const loginTabBtns = document.querySelectorAll('.login-tab');
  const loginForms = document.querySelectorAll('.login-form');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  // 关闭弹窗
  function closeModal() {
    authModal.classList.remove('show');
    document.body.style.overflow = '';
    clearMessage();
  }

  function clearMessage() {
    document.querySelectorAll('.login-error, .login-success').forEach(el => {
      el.style.display = 'none';
      el.textContent = '';
    });
  }

  // 显示消息函数 - 全局函数
  function showMessage(message, type) {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
      console.error('找不到注册表单');
      return;
    }
    
    const errorDiv = registerForm.querySelector('.login-error');
    const successDiv = registerForm.querySelector('.login-success');
    
    console.log('显示消息:', message, '类型:', type);
    console.log('错误div:', errorDiv);
    console.log('成功div:', successDiv);
    
    if (type === 'error') {
      if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        console.log('显示错误消息:', message);
      } else {
        console.error('找不到错误消息容器');
      }
      if (successDiv) {
        successDiv.style.display = 'none';
      }
    } else if (type === 'success') {
      if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        console.log('显示成功消息:', message);
      } else {
        console.error('找不到成功消息容器');
      }
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
    }
  }

  function setLoading(form, loading) {
    const submitBtn = form.querySelector('.login-btn');
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? '处理中...' : (form.id === 'loginForm' ? '登录' : '注册');
    }
  }

  // 标签切换
  loginTabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const targetTab = this.getAttribute('data-tab');
      
      // 更新标签状态
      loginTabBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // 更新表单显示
      loginForms.forEach(form => form.classList.remove('active'));
      document.getElementById(targetTab + 'Form').classList.add('active');
      
      clearMessage();
    });
  });

  // 登录表单提交
  async function handleLogin() {
    const formData = new FormData(loginForm);
    const username = formData.get('username');
    const password = formData.get('password');

    if (!username || !password) {
      showMessage('请填写所有必填字段', 'error');
      return;
    }

    setLoading(loginForm, true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        isLoggedIn = true;
        currentUser = data.user;
        updateLoginButton(data.user.username);
        enableFeatures();
        showMessage('登录成功！', 'success');
        setTimeout(closeModal, 1500);
        
        // 检查是否是首次管理员登录
        if (data.user.isFirstAdmin && !data.user.passwordChanged) {
          setTimeout(() => {
            showPasswordChangeModal();
          }, 1600);
        }
      } else {
        showMessage(data.error || data.message || '登录失败', 'error');
      }
    } catch (error) {
      console.error('登录错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
    } finally {
      setLoading(loginForm, false);
    }
  }

  // 注册表单提交
  async function handleRegister() {
    const formData = new FormData(registerForm);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const verificationCode = formData.get('verificationCode');

    if (!username || !email || !password || !confirmPassword) {
      showMessage('请填写所有必填字段', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('两次输入的密码不一致', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('密码至少需要6个字符', 'error');
      return;
    }

    if (!verificationCode) {
      showMessage('请输入邮箱验证码', 'error');
      return;
    }

    setLoading(registerForm, true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, verificationCode })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('注册成功！请登录', 'success');
        // 切换到登录标签
        loginTabBtns.forEach(b => b.classList.remove('active'));
        loginTabBtns[0].classList.add('active');
        loginForms.forEach(form => form.classList.remove('active'));
        loginForm.classList.add('active');
        registerForm.reset();
        // 清空验证码输入框
        if (window.clearVerificationCode) {
          window.clearVerificationCode();
        }
      } else {
        showMessage(data.error || data.message || '注册失败', 'error');
        // 如果是验证码错误，显示错误状态
        if (data.error && data.error.includes('验证码')) {
          if (window.showVerificationCodeError) {
            window.showVerificationCodeError();
          }
        }
      }
    } catch (error) {
      console.error('注册错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
    } finally {
      setLoading(registerForm, false);
    }
  }

  // 发送验证码函数 - 全局函数
  async function sendVerificationCode() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;
    
    const email = registerForm.querySelector('input[name="email"]').value;
    
    if (!email) {
      showMessage('请先输入邮箱地址', 'error');
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage('请输入有效的邮箱地址', 'error');
      return;
    }

    const sendCodeBtn = registerForm.querySelector('.send-code-btn');
    const originalText = sendCodeBtn.querySelector('span').textContent;
    
    // 禁用按钮并显示倒计时
    sendCodeBtn.disabled = true;
    let countdown = 60;
    
    const countdownInterval = setInterval(() => {
      sendCodeBtn.querySelector('span').textContent = `${countdown}秒后重试`;
      countdown--;
      
      if (countdown < 0) {
        clearInterval(countdownInterval);
        sendCodeBtn.disabled = false;
        sendCodeBtn.querySelector('span').textContent = originalText;
      }
    }, 1000);

    try {
      console.log('正在发送验证码请求...');
      const response = await fetch('http://localhost:3001/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      console.log('响应状态:', response.status);
      const data = await response.json();
      console.log('响应数据:', data);

      if (response.ok) {
        showMessage('验证码已发送到您的邮箱', 'success');
      } else {
        console.log('请求失败，错误信息:', data.error);
        showMessage(data.error || '发送验证码失败', 'error');
        // 重置按钮状态
        clearInterval(countdownInterval);
        sendCodeBtn.disabled = false;
        sendCodeBtn.querySelector('span').textContent = originalText;
      }
    } catch (error) {
      console.error('发送验证码错误:', error);
      showMessage('网络错误，请稍后重试', 'error');
      // 重置按钮状态
      clearInterval(countdownInterval);
      sendCodeBtn.disabled = false;
      sendCodeBtn.querySelector('span').textContent = originalText;
    }
  }

  // 事件监听器
  const loginBtn = document.getElementById('loginBtn');
  
  // 打开登录弹窗
  loginBtn.addEventListener('click', function() {
    authModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  });

  // 关闭登录弹窗
  closeBtn.addEventListener('click', closeModal);

  // 点击弹窗外部关闭
  authModal.addEventListener('click', function(e) {
    if (e.target === authModal) {
      closeModal();
    }
  });

  // ESC键关闭弹窗
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && authModal.classList.contains('show')) {
      closeModal();
    }
  });

  // 表单提交事件
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    handleLogin();
  });

  registerForm.addEventListener('submit', function(e) {
    e.preventDefault();
    handleRegister();
  });
  
  // 绑定发送验证码按钮事件
  const sendCodeBtn = registerForm.querySelector('.send-code-btn');
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', sendVerificationCode);
  }
  
  // 初始化验证码输入框
  initVerificationCodeInput();
}

// 初始化验证码输入框
function initVerificationCodeInput() {
  const codeDigits = document.querySelectorAll('.code-digit');
  const hiddenInput = document.getElementById('verificationCode');
  
  if (!codeDigits.length) return;
  
  // 为每个输入框添加事件监听
  codeDigits.forEach((digit, index) => {
    // 输入事件
    digit.addEventListener('input', function(e) {
      const value = e.target.value;
      
      // 只允许数字
      if (!/^\d*$/.test(value)) {
        e.target.value = '';
        return;
      }
      
      // 限制只能输入一个数字
      if (value.length > 1) {
        e.target.value = value.slice(0, 1);
      }
      
      // 更新样式
      if (value.length === 1) {
        digit.classList.add('filled');
        digit.classList.remove('error');
        
        // 自动跳转到下一个输入框
        if (index < codeDigits.length - 1) {
          codeDigits[index + 1].focus();
        }
      } else {
        digit.classList.remove('filled');
      }
      
      // 更新隐藏的输入框
      updateHiddenInput();
    });
    
    // 删除键事件
    digit.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && e.target.value === '') {
        // 如果当前框为空，跳转到上一个框
        if (index > 0) {
          codeDigits[index - 1].focus();
          codeDigits[index - 1].value = '';
          codeDigits[index - 1].classList.remove('filled');
        }
      }
    });
    
    // 粘贴事件
    digit.addEventListener('paste', function(e) {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text');
      const numbers = pastedData.replace(/\D/g, '').slice(0, 6);
      
      if (numbers.length === 6) {
        // 填充所有输入框
        codeDigits.forEach((input, i) => {
          input.value = numbers[i] || '';
          if (numbers[i]) {
            input.classList.add('filled');
            input.classList.remove('error');
          } else {
            input.classList.remove('filled');
          }
        });
        updateHiddenInput();
      }
    });
  });
  
  // 更新隐藏的输入框值
  function updateHiddenInput() {
    const code = Array.from(codeDigits).map(input => input.value).join('');
    hiddenInput.value = code;
  }
  
  // 清空验证码输入框
  window.clearVerificationCode = function() {
    codeDigits.forEach(digit => {
      digit.value = '';
      digit.classList.remove('filled', 'error');
    });
    updateHiddenInput();
  };
  
  // 显示验证码错误
  window.showVerificationCodeError = function() {
    codeDigits.forEach(digit => {
      digit.classList.add('error');
      digit.classList.remove('filled');
    });
  };
}

// 更新登录按钮状态
function updateLoginButton(username) {
  const loginBtn = document.getElementById('loginBtn');
  loginBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
    </svg>
    ${username}
  `;
  loginBtn.title = '点击退出登录';
  
  // 添加退出登录功能
  loginBtn.onclick = function() {
    if (confirm('确定要退出登录吗？')) {
      // 清除登录状态
      clearLoginData();
      
      // 恢复登录按钮
      loginBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
        </svg>
        登录
      `;
      loginBtn.title = '';
      
      // 清空数据
      currentData = [];
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      
      // 重置页面状态
      document.getElementById('output').innerHTML = '<div class="no-data">请先登录并上传数据</div>';
      document.getElementById('statsContainer').innerHTML = `
        <div class="stat-card">
          <div class="stat-title">总项目数</div>
          <div class="stat-value" id="totalProjects">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">总学习时间</div>
          <div class="stat-value" id="totalTime">0<span class="stat-unit">分钟</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-title">平均每日</div>
          <div class="stat-value" id="avgDailyTime">0<span class="stat-unit">分钟</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-title">分析日期范围</div>
          <div class="stat-value" id="dateRange">-</div>
        </div>
      `;
      
      // 恢复原来的点击事件
      initAuthModal();
    }
  };
}

// 显示密码修改模态框
function showPasswordChangeModal() {
  const modal = document.createElement('div');
  modal.className = 'password-change-modal';
  modal.innerHTML = `
    <div class="password-change-content">
      <h3>⚠️ 安全提醒</h3>
      <p>检测到您正在使用默认管理员密码，为了系统安全，请立即修改密码。</p>
      <form id="passwordChangeForm">
        <div class="form-group">
          <label for="currentPassword">当前密码</label>
          <input type="password" id="currentPassword" required>
        </div>
        <div class="form-group">
          <label for="newPassword">新密码</label>
          <input type="password" id="newPassword" required>
          <small>至少6个字符，包含大小写字母和数字</small>
        </div>
        <div class="form-group">
          <label for="confirmNewPassword">确认新密码</label>
          <input type="password" id="confirmNewPassword" required>
        </div>
        <button type="submit" class="btn-primary">修改密码</button>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .password-change-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .password-change-content {
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
    }
    .password-change-content h3 {
      color: #e74c3c;
      margin-bottom: 15px;
    }
    .password-change-content p {
      margin-bottom: 20px;
      color: #666;
    }
    .btn-primary {
      background: #e74c3c;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      width: 100%;
      font-size: 16px;
    }
    .btn-primary:hover {
      background: #c0392b;
    }
  `;
  document.head.appendChild(style);
  
  // 处理表单提交
  document.getElementById('passwordChangeForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
      alert('两次输入的新密码不一致');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('新密码至少需要6个字符');
      return;
    }
    
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      alert('新密码必须包含大小写字母和数字');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('密码修改成功！');
        document.body.removeChild(modal);
        document.head.removeChild(style);
        
        // 更新用户信息
        currentUser.passwordChanged = true;
        currentUser.isFirstAdmin = false;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      } else {
        alert(data.error || '密码修改失败');
      }
    } catch (error) {
      console.error('修改密码错误:', error);
      alert('网络错误，请稍后重试');
    }
  });
}

// 分页和查询功能函数

// 应用查询筛选
function applyQueryFilter() {
  // 获取查询条件
  queryFilter.startDate = document.getElementById('queryStartDate').value;
  queryFilter.endDate = document.getElementById('queryEndDate').value;
  queryFilter.project = document.getElementById('queryProject').value;
  
  // 重置到第一页
  currentPage = 1;
  
  // 应用筛选并更新显示
  applyFilters();
}

// 重置查询筛选
function resetQueryFilter() {
  // 清空查询条件
  document.getElementById('queryStartDate').value = '';
  document.getElementById('queryEndDate').value = '';
  document.getElementById('queryProject').value = '';
  
  queryFilter = {
    startDate: '',
    endDate: '',
    project: ''
  };
  
  // 重置到第一页
  currentPage = 1;
  
  // 应用筛选并更新显示
  applyFilters();
}

// 跳转到指定页面
function goToPage(page) {
  if (page < 1 || page > totalPages) {
    return;
  }
  
  currentPage = page;
  displayCurrentPageData();
  updatePagination();
}

// 更新分页信息
function updatePagination() {
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRecords);
  
  // 更新分页信息显示
  document.getElementById('paginationInfo').textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
  document.getElementById('paginationCount').textContent = `显示 ${startIndex}-${endIndex} 条，共 ${totalRecords} 条`;
  
  // 更新查询结果计数
  document.getElementById('queryResultCount').textContent = `共 ${totalRecords} 条记录`;
  
  // 更新按钮状态
  document.getElementById('firstPageBtn').disabled = currentPage === 1;
  document.getElementById('prevPageBtn').disabled = currentPage === 1;
  document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
  document.getElementById('lastPageBtn').disabled = currentPage === totalPages;
  
  // 生成页码按钮
  generatePageNumbers();
}

// 生成页码按钮
function generatePageNumbers() {
  const pageNumbersContainer = document.getElementById('pageNumbers');
  pageNumbersContainer.innerHTML = '';
  
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // 调整起始页
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = 'page-number-btn';
    pageBtn.textContent = i;
    
    if (i === currentPage) {
      pageBtn.classList.add('active');
    }
    
    pageBtn.addEventListener('click', function() {
      goToPage(i);
    });
    
    pageNumbersContainer.appendChild(pageBtn);
  }
}

// 显示当前页数据
function displayCurrentPageData() {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = filteredData.slice(startIndex, endIndex);
  
  displayDataTable(currentPageData);
}

// 更新查询项目选择器
function updateQueryProjectSelect(data) {
  const queryProjectSelect = document.getElementById('queryProject');
  if (!queryProjectSelect) return;
  
  // 清空现有选项
  queryProjectSelect.innerHTML = '<option value="">全部项目</option>';
  
  // 获取唯一项目名称
  const projects = [...new Set(data.map(item => item['学习项目名称']).filter(Boolean))];
  
  // 添加项目选项
  projects.forEach(project => {
    const option = document.createElement('option');
    option.value = project;
    option.textContent = project;
    queryProjectSelect.appendChild(option);
  });
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

// 检测图表容器滚动状态并添加提示
function updateChartScrollHint() {
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

// 更新统计数据
function updateStats(data) {
  // 计算总项目数
  const totalProjects = data.length;
  
  // 计算总学习时间
  const totalTime = data.reduce((sum, item) => {
    let completionTime = item["项目完成时间"];
    if (typeof completionTime === 'string') {
      completionTime = parseFloat(completionTime.replace(/[^0-9.]/g, '')) || 0;
    } else if (typeof completionTime === 'number') {
      completionTime = completionTime;
    } else {
      completionTime = 0;
    }
    return sum + completionTime;
  }, 0);
  
  // 计算平均每日时间
  const uniqueDates = [...new Set(data.map(item => item["日期"]).filter(date => date))];
  const avgDailyTime = uniqueDates.length > 0 ? Math.round(totalTime / uniqueDates.length) : 0;
  
  // 获取日期范围
  const dateRange = getDateRange(data);
  
  // 更新DOM元素
  const totalProjectsEl = document.getElementById('totalProjects');
  const totalTimeEl = document.getElementById('totalTime');
  const avgDailyTimeEl = document.getElementById('avgDailyTime');
  const dateRangeEl = document.getElementById('dateRange');
  
  if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
  if (totalTimeEl) totalTimeEl.innerHTML = `${totalTime}<span class="stat-unit">分钟</span>`;
  if (avgDailyTimeEl) avgDailyTimeEl.innerHTML = `${avgDailyTime}<span class="stat-unit">分钟</span>`;
  if (dateRangeEl) dateRangeEl.textContent = dateRange;
}

 