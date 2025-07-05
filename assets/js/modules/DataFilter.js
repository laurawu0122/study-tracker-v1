/**
 * 数据筛选模块
 * 负责处理所有数据筛选相关的逻辑
 */
class DataFilter {
    constructor() {
        this.filters = {
            date: '',
            timeRange: '',
            project: '',
            startDate: null,
            endDate: null
        };
    }

    /**
     * 设置筛选条件
     * @param {Object} filters - 筛选条件
     */
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
    }

    /**
     * 处理时间范围变化
     * @param {string} timeRange - 时间范围
     */
    handleTimeRangeChange(timeRange) {
        console.log('DataFilter: handleTimeRangeChange 被调用，timeRange:', timeRange);
        
        let baseDate;
        if (timeRange === 'month') {
            if (this.filters.date) {
                const dateParts = this.filters.date.split('-');
                baseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            } else {
                baseDate = new Date();
            }
        } else if (this.filters.date) {
            const dateParts = this.filters.date.split('-');
            baseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        } else {
            baseDate = new Date();
        }
        
        let startDate, endDate;
        
        switch (timeRange) {
            case 'today':
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
                break;
            case 'week':
                const dayOfWeek = baseDate.getDay();
                const diff = baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), diff);
                endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 7);
                break;
            case 'month':
                startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
                endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
                break;
            default:
                startDate = null;
                endDate = null;
        }
        
        this.filters.startDate = startDate ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}` : null;
        this.filters.endDate = endDate ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}` : null;
        this.filters.timeRange = timeRange;
        
        console.log('DataFilter: 计算的时间范围:', { startDate: this.filters.startDate, endDate: this.filters.endDate });
    }

    /**
     * 应用筛选条件到数据
     * @param {Array} data - 原始数据
     * @returns {Array} - 筛选后的数据
     */
    applyFilters(data) {
        console.log('DataFilter: applyFilters 被调用');
        console.log('DataFilter: 当前筛选条件:', this.filters);
        console.log('DataFilter: 数据长度:', data.length);
        
        if (data.length === 0) {
            return [];
        }
        
        return data.filter(row => {
            // 标准化日期格式
            let rowDate = row.date;
            if (rowDate.includes('.')) {
                rowDate = rowDate.replace(/\./g, '-');
            }
            
            // 时间范围筛选（优先级最高）
            if (this.filters.startDate && this.filters.endDate) {
                const rowDateNum = parseInt(rowDate.replace(/\//g, ''));
                const startDateNum = parseInt(this.filters.startDate.replace(/-/g, ''));
                const endDateNum = parseInt(this.filters.endDate.replace(/-/g, ''));
                
                if (rowDateNum < startDateNum || rowDateNum >= endDateNum) {
                    return false;
                }
            }
            
            // 精确日期筛选（只有在没有时间范围时才使用）
            if (this.filters.date && !this.filters.startDate) {
                const rowDateNum = parseInt(rowDate.replace(/\//g, ''));
                const filterDateNum = parseInt(this.filters.date.replace(/-/g, ''));
                
                if (rowDateNum !== filterDateNum) {
                    return false;
                }
            }
            
            // 项目筛选
            if (this.filters.project && this.filters.project !== '') {
                if (!row.projectName.includes(this.filters.project)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * 获取当前筛选条件
     * @returns {Object} - 筛选条件
     */
    getFilters() {
        return { ...this.filters };
    }

    /**
     * 重置筛选条件
     */
    resetFilters() {
        this.filters = {
            date: '',
            timeRange: '',
            project: '',
            startDate: null,
            endDate: null
        };
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataFilter;
} else {
    window.DataFilter = DataFilter;
} 