// 管理端积分兑换系统
class AdminPointsExchange {
  constructor() {
    this.products = [];
    this.categories = [];
    this.pointsRules = [];
    this.currentProduct = null;
    this.currentCategory = null;
    this.currentRule = null;
    this.isEditing = false;
    this.isEditingCategory = false;
    this.isEditingRule = false;
    
    this.init();
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderProducts();
    this.updateStats();
  }

  async loadData() {
    try {
      // 加载商品分类
      const categoriesResponse = await fetch('/api/points-exchange/admin/categories');
      const categoriesData = await categoriesResponse.json();
      this.categories = categoriesData.data || [];

      // 加载商品列表
      const productsResponse = await fetch('/api/points-exchange/admin/products');
      const productsData = await productsResponse.json();
      this.products = productsData.data || [];

      // 加载积分规则
      const rulesResponse = await fetch('/api/points-exchange/admin/points-rules');
      const rulesData = await rulesResponse.json();
      this.pointsRules = rulesData.data || [];

      this.populateCategoryFilters();
      this.populateProductCategorySelect();
    } catch (error) {
      console.error('加载数据失败:', error);
      this.showNotification('加载数据失败', 'error');
    }
  }

  bindEvents() {
    // 搜索和筛选
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      // 使用防抖，避免频繁请求
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.filterProducts();
      }, 300);
    });

    document.getElementById('categoryFilter')?.addEventListener('change', () => {
      this.filterProducts();
    });

    document.getElementById('statusFilter')?.addEventListener('change', () => {
      this.filterProducts();
    });

    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.refreshData();
    });

    // 操作按钮
    document.getElementById('addProductBtn')?.addEventListener('click', () => {
      this.openProductModal();
    });

    document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
      this.openCategoryModal();
    });

    document.getElementById('manageRulesBtn')?.addEventListener('click', () => {
      this.openRulesModal();
    });

    // 图片上传
    document.getElementById('productImage')?.addEventListener('change', (e) => {
      this.handleImageUpload(e);
    });

    // 统一的点击事件处理
    document.addEventListener('click', (e) => {
      // 处理 data-action 属性
      const button = e.target.closest('[data-action]');
      if (button) {
        const action = button.getAttribute('data-action');
        console.log('data-action 被点击:', action);

        switch (action) {
          case 'show-category-form':
            e.preventDefault();
            e.stopPropagation();
            this.showCategoryForm();
            break;
          case 'show-rule-form':
            e.preventDefault();
            e.stopPropagation();
            this.showRuleForm();
            break;
          case 'save-category':
            e.preventDefault();
            e.stopPropagation();
            this.saveCategory();
            break;
          case 'save-rule':
            e.preventDefault();
            e.stopPropagation();
            this.saveRule();
            break;
          case 'close-category-modal':
            e.preventDefault();
            e.stopPropagation();
            this.closeCategoryModal();
            break;
          case 'close-rules-modal':
            e.preventDefault();
            e.stopPropagation();
            this.closeRulesModal();
            break;
          case 'edit-category':
            e.preventDefault();
            e.stopPropagation();
            const categoryId = parseInt(button.getAttribute('data-category-id'));
            if (categoryId) {
              this.editCategory(categoryId);
            }
            break;
          case 'delete-category':
            e.preventDefault();
            e.stopPropagation();
            const deleteCategoryId = parseInt(button.getAttribute('data-category-id'));
            if (deleteCategoryId) {
              this.deleteCategory(deleteCategoryId);
            }
            break;
          case 'edit-rule':
            e.preventDefault();
            e.stopPropagation();
            const ruleId = parseInt(button.getAttribute('data-rule-id'));
            if (ruleId) {
              this.editRule(ruleId);
            }
            break;
          case 'delete-rule':
            e.preventDefault();
            e.stopPropagation();
            const deleteRuleId = parseInt(button.getAttribute('data-rule-id'));
            if (deleteRuleId) {
              this.deleteRule(deleteRuleId);
            }
            break;
          case 'edit':
            e.preventDefault();
            e.stopPropagation();
            const productId = parseInt(button.getAttribute('data-product-id'));
            if (productId) {
              this.editProduct(productId);
            }
            break;
          case 'toggle':
            e.preventDefault();
            e.stopPropagation();
            const toggleProductId = parseInt(button.getAttribute('data-product-id'));
            if (toggleProductId) {
              this.toggleProductStatus(toggleProductId);
            }
            break;
          case 'delete':
            e.preventDefault();
            e.stopPropagation();
            const deleteProductId = parseInt(button.getAttribute('data-product-id'));
            if (deleteProductId) {
              this.deleteProduct(deleteProductId);
            }
            break;
        }
        return;
      }

      // 处理弹窗关闭按钮
      const closeBtn = e.target.closest('#closeModalBtn');
      const cancelBtn = e.target.closest('#cancelBtn');
      if (closeBtn || cancelBtn) {
        e.preventDefault();
        e.stopPropagation();
        console.log('关闭按钮被点击:', e.target.id || e.target.className);
        this.closeProductModal();
        return;
      }

      // 处理点击弹窗外部关闭
      const productModal = document.getElementById('productModal');
      if (productModal && e.target === productModal) {
        this.closeProductModal();
        return;
      }

      const categoryModal = document.getElementById('categoryModal');
      if (categoryModal && e.target === categoryModal) {
        this.closeCategoryModal();
        return;
      }

      const rulesModal = document.getElementById('rulesModal');
      if (rulesModal && e.target === rulesModal) {
        this.closeRulesModal();
        return;
      }
    });

    // 阻止弹窗内部滚动传播到背景
    document.addEventListener('wheel', (e) => {
      const modal = document.getElementById('productModal');
      if (modal && !modal.classList.contains('hidden')) {
        const modalContent = modal.querySelector('.bg-white, .dark\\:bg-gray-900');
        if (modalContent && !modalContent.contains(e.target)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, { passive: false });

    // 阻止弹窗背景的滚动事件
    document.addEventListener('touchmove', (e) => {
      const modal = document.getElementById('productModal');
      if (modal && !modal.classList.contains('hidden')) {
        const modalContent = modal.querySelector('.bg-white, .dark\\:bg-gray-900');
        if (modalContent && !modalContent.contains(e.target)) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    // 积分规则触发类型变化事件
    document.addEventListener('change', (e) => {
      if (e.target.id === 'ruleTriggerType') {
        this.showConditionForm(e.target.value);
      }
    });

    // 阻止分类和规则弹窗内部滚动传播到背景
    document.addEventListener('wheel', (e) => {
      const categoryModal = document.getElementById('categoryModal');
      const rulesModal = document.getElementById('rulesModal');
      
      if (categoryModal && !categoryModal.classList.contains('hidden')) {
        const modalContent = categoryModal.querySelector('.bg-white, .dark\\:bg-gray-900');
        if (modalContent && !modalContent.contains(e.target)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      
      if (rulesModal && !rulesModal.classList.contains('hidden')) {
        const modalContent = rulesModal.querySelector('.bg-white, .dark\\:bg-gray-900');
        if (modalContent && !modalContent.contains(e.target)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }, { passive: false });

    // 阻止分类和规则弹窗背景的滚动事件
    document.addEventListener('touchmove', (e) => {
      const categoryModal = document.getElementById('categoryModal');
      const rulesModal = document.getElementById('rulesModal');
      
      if (categoryModal && !categoryModal.classList.contains('hidden')) {
        const modalContent = categoryModal.querySelector('.bg-white, .dark\\:bg-gray-900');
        if (modalContent && !modalContent.contains(e.target)) {
          e.preventDefault();
        }
      }
      
      if (rulesModal && !rulesModal.classList.contains('hidden')) {
        const modalContent = rulesModal.querySelector('.bg-white, .dark\\:bg-gray-900');
        if (modalContent && !modalContent.contains(e.target)) {
          e.preventDefault();
        }
      }
    }, { passive: false });

    // 分类弹窗关闭按钮事件
    document.addEventListener('click', (e) => {
      const closeCategoryBtn = e.target.closest('#closeCategoryModalBtn');
      const cancelCategoryBtn = e.target.closest('#cancelCategoryBtn');
      
      if (closeCategoryBtn || cancelCategoryBtn) {
        e.preventDefault();
        e.stopPropagation();
        console.log('分类弹窗关闭按钮被点击');
        this.closeCategoryModal();
      }
    });

    // 规则弹窗关闭按钮事件
    document.addEventListener('click', (e) => {
      const closeRulesBtn = e.target.closest('#closeRulesModalBtn');
      const cancelRulesBtn = e.target.closest('#cancelRuleBtn');
      
      if (closeRulesBtn || cancelRulesBtn) {
        e.preventDefault();
        e.stopPropagation();
        console.log('规则弹窗关闭按钮被点击');
        this.closeRulesModal();
      }
    });

    // 商品名称唯一性校验
    const productNameInput = document.getElementById('productName');
    if (productNameInput) {
      productNameInput.addEventListener('blur', async function() {
        const name = this.value.trim();
        if (!name) return;
        const res = await fetch(`/points-exchange/admin/products/check-name?name=${encodeURIComponent(name)}`, {
          credentials: 'include'
        });
        const data = await res.json();
        const feedback = document.getElementById('nameFeedback');
        if (feedback) {
          if (data.exists) {
            feedback.textContent = '商品名称已存在，请更换';
            feedback.style.color = 'red';
          } else {
            feedback.textContent = '商品名称可用';
            feedback.style.color = 'green';
          }
        }
      });
    }
  }

  populateCategoryFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    categoryFilter.innerHTML = '<option value="">全部分类</option>';
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categoryFilter.appendChild(option);
    });
  }

  populateProductCategorySelect() {
    const categorySelect = document.getElementById('productCategory');
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">选择分类</option>';
    this.categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.id;
      option.textContent = category.name;
      categorySelect.appendChild(option);
    });
  }

  async filterProducts() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    // 构建查询参数
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (categoryFilter) params.append('category_id', categoryFilter);
    if (statusFilter) params.append('status', statusFilter);

    try {
      const response = await fetch(`/api/points-exchange/admin/products?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        // 应用状态过滤（前端过滤，因为后端API没有status参数）
        let filteredProducts = data.data;
        if (statusFilter) {
          filteredProducts = filteredProducts.filter(product => {
            if (statusFilter === 'active') return product.is_active;
            if (statusFilter === 'inactive') return !product.is_active;
            return true;
          });
        }
        
        this.renderProducts(filteredProducts);
      } else {
        console.error('获取商品列表失败:', data.error);
      }
    } catch (error) {
      console.error('筛选商品失败:', error);
      // 回退到本地过滤
      this.localFilterProducts();
    }
  }

  // 本地过滤作为回退方案
  localFilterProducts() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';

    const filteredProducts = this.products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                           product.description?.toLowerCase().includes(searchTerm);
      const matchesCategory = !categoryFilter || product.category_id == categoryFilter;
      const matchesStatus = !statusFilter || 
                           (statusFilter === 'active' && product.is_active) ||
                           (statusFilter === 'inactive' && !product.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });

    this.renderProducts(filteredProducts);
  }

  renderProducts(products = this.products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
            暂无商品数据
          </td>
        </tr>
      `;
      return;
    }

    // 只渲染一次每个商品
    products.forEach(product => {
      const category = this.categories.find(c => c.id === product.category_id);
      const row = document.createElement('tr');
      row.className = 'hover:bg-gray-50 dark:hover:bg-gray-700';
      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="w-10 h-10 flex-shrink-0">
              <img class="w-10 h-10 rounded-lg object-cover" 
                   src="${product.image_url || '/assets/ico/knowledge-star.svg'}" 
                   alt="${product.name}"
                   onerror="this.src='/assets/ico/knowledge-star.svg'">
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900 dark:text-white">${product.name}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${product.description || '暂无描述'}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ${category?.name || '未分类'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          <span class="font-medium">${product.points_required}</span> 积分
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
          ${product.stock_quantity === -1 ? '无限' : product.stock_quantity}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            product.is_active 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }">
            ${product.is_active ? '启用' : '禁用'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex space-x-2">
            <button data-action="edit" data-product-id="${product.id}" 
                    class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
              <i class="fas fa-edit"></i>
            </button>
            <button data-action="toggle" data-product-id="${product.id}" 
                    class="${product.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} dark:text-red-400 dark:hover:text-red-300">
              <i class="fas fa-${product.is_active ? 'ban' : 'check'}"></i>
            </button>
            <button data-action="delete" data-product-id="${product.id}" 
                    class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  async updateStats() {
    try {
      const response = await fetch('/api/points-exchange/admin/exchange-stats');
      const result = await response.json();
      
      if (result.success) {
        const stats = result.data;
        const totalProducts = this.products.length;
        
        const totalProductsEl = document.getElementById('totalProducts');
        const totalExchangesEl = document.getElementById('totalExchanges');
        const pendingExchangesEl = document.getElementById('pendingExchanges');
        const totalPointsEl = document.getElementById('totalPoints');
        
        if (totalProductsEl) totalProductsEl.textContent = totalProducts;
        if (totalExchangesEl) totalExchangesEl.textContent = stats.totalExchanges;
        if (pendingExchangesEl) pendingExchangesEl.textContent = stats.pendingExchanges;
        if (totalPointsEl) totalPointsEl.textContent = stats.totalPoints;
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
      // 使用默认值
      const totalProducts = this.products.length;
      const totalProductsEl = document.getElementById('totalProducts');
      const totalExchangesEl = document.getElementById('totalExchanges');
      const pendingExchangesEl = document.getElementById('pendingExchanges');
      const totalPointsEl = document.getElementById('totalPoints');
      
      if (totalProductsEl) totalProductsEl.textContent = totalProducts;
      if (totalExchangesEl) totalExchangesEl.textContent = '0';
      if (pendingExchangesEl) pendingExchangesEl.textContent = '0';
      if (totalPointsEl) totalPointsEl.textContent = '0';
    }
  }

  openProductModal(product = null) {
    this.currentProduct = product;
    this.isEditing = !!product;
    
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (product) {
      modalTitle.textContent = '编辑商品';
      this.fillProductForm(product);
    } else {
      modalTitle.textContent = '添加商品';
      form.reset();
      this.clearImagePreview();
    }
    
    // 禁用背景滚动
    document.body.style.overflow = 'hidden';
    
    modal.classList.remove('hidden');
    setTimeout(() => {
      if (modalContent) {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }
    }, 10);
  }

  closeProductModal() {
    const modal = document.getElementById('productModal');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }
    
    setTimeout(() => {
      modal.classList.add('hidden');
      // 恢复背景滚动
      document.body.style.overflow = '';
    }, 300);
    
    this.currentProduct = null;
    this.isEditing = false;
  }

  fillProductForm(product) {
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category_id;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPoints').value = product.points_required;
    document.getElementById('productStock').value = product.stock_quantity;
    document.getElementById('productLimit').value = product.exchange_limit_per_user;
    document.getElementById('productSort').value = product.sort_order;
    document.getElementById('productApproval').checked = product.requires_approval;
    document.getElementById('productActive').checked = product.is_active;
    document.getElementById('productImageUrl').value = product.image_url || '';
    
    this.updateImagePreview(product.image_url);
  }

  clearImagePreview() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '<i class="fas fa-image text-gray-400"></i>';
    document.getElementById('productImageUrl').value = '';
    
    // 隐藏图片上传状态提示
    const statusContainer = document.getElementById('imageUploadStatus');
    if (statusContainer) {
      statusContainer.classList.add('hidden');
    }
  }

  updateImagePreview(imageUrl) {
    const preview = document.getElementById('imagePreview');
    if (imageUrl) {
      preview.innerHTML = `<img src="${imageUrl}" class="w-full h-full object-cover rounded-lg" alt="预览">`;
    } else {
      this.clearImagePreview();
    }
  }

  async handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // 前端验证文件类型
    if (!file.type.startsWith('image/')) {
      this.showImageUploadStatus('请选择图片文件（JPG、PNG、GIF等格式）', 'error');
      return;
    }

    // 前端验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      this.showImageUploadStatus(`图片文件过大（${fileSizeMB}MB），请选择小于5MB的图片文件`, 'error');
      return;
    }

    // 显示上传中状态
    this.showImageUploadStatus('正在上传图片，请稍候...', 'info');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/points-exchange/admin/products/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        document.getElementById('productImageUrl').value = result.data.image_url;
        this.updateImagePreview(result.data.image_url);
        this.showImageUploadStatus('✅ 图片上传成功！', 'success');
      } else {
        // 处理具体的错误信息
        let errorMessage = result.error || '图片上传失败';
        
        // 根据错误类型提供更友好的提示
        if (errorMessage.includes('文件过大')) {
          errorMessage = '❌ 图片文件过大，请选择小于5MB的图片文件';
        } else if (errorMessage.includes('图片文件')) {
          errorMessage = '❌ 请选择有效的图片文件（JPG、PNG、GIF等格式）';
        } else if (errorMessage.includes('未上传文件')) {
          errorMessage = '❌ 请选择要上传的图片文件';
        }
        
        this.showImageUploadStatus(errorMessage, 'error');
      }
    } catch (error) {
      console.error('图片上传失败:', error);
      
      // 根据错误类型提供不同的提示
      let errorMessage = '图片上传失败';
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = '❌ 网络连接失败，请检查网络后重试';
      } else if (error.message.includes('timeout')) {
        errorMessage = '❌ 上传超时，请重试';
      } else {
        errorMessage = '❌ 图片上传失败，请重试';
      }
      
      this.showImageUploadStatus(errorMessage, 'error');
    }
  }

  async saveProduct() {
    const form = document.getElementById('productForm');
    const formData = new FormData(form);
    
    const productData = {
      name: formData.get('name'),
      description: formData.get('description'),
      category_id: formData.get('category_id'),
      image_url: formData.get('image_url'),
      points_required: formData.get('points_required'),
      stock_quantity: formData.get('stock_quantity'),
      exchange_limit_per_user: formData.get('exchange_limit_per_user'),
      requires_approval: formData.get('requires_approval') === 'on',
      sort_order: formData.get('sort_order'),
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const url = this.isEditing 
        ? `/api/points-exchange/admin/products/${this.currentProduct.id}`
        : '/api/points-exchange/admin/products';
      
      const method = this.isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification(result.message || '保存成功', 'success');
        this.closeProductModal();
        await this.refreshData();
      } else {
        this.showProductModalStatus(result.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存商品失败:', error);
      this.showProductModalStatus('保存失败，请检查网络连接', 'error');
    }
  }

  async editProduct(productId) {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      this.openProductModal(product);
    }
  }

  async toggleProductStatus(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const newStatus = !product.is_active;
    const action = newStatus ? '启用' : '禁用';

    const confirmed = await this.showConfirmDialog(
      `${action}商品`,
      `确定要${action}商品"${product.name}"吗？`,
      action,
      '取消'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/points-exchange/admin/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...product,
          is_active: newStatus
        })
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification(`商品${action}成功`, 'success');
        await this.refreshData();
      } else {
        this.showNotification(result.error || `${action}失败`, 'error');
      }
    } catch (error) {
      console.error(`${action}商品失败:`, error);
      this.showNotification(`${action}失败`, 'error');
    }
  }

  async deleteProduct(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const confirmed = await this.showConfirmDialog(
      '删除商品',
      `确定要删除商品"${product.name}"吗？此操作不可恢复！`,
      '删除',
      '取消'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/points-exchange/admin/products/${productId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('商品删除成功', 'success');
        await this.refreshData();
      } else {
        this.showNotification(result.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除商品失败:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  // 分类管理方法
  openCategoryModal() {
    this.currentCategory = null;
    this.isEditingCategory = false;
    
    const modal = document.getElementById('categoryModal');
    const modalTitle = document.getElementById('categoryModalTitle');
    const categoryList = document.getElementById('categoryList');
    const categoryForm = document.getElementById('categoryForm');
    const saveBtn = document.getElementById('saveCategoryBtn');
    
    modalTitle.textContent = '分类管理';
    categoryForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
    
    this.renderCategoryList();
    
    // 禁用背景滚动
    document.body.style.overflow = 'hidden';
    
    modal.classList.remove('hidden');
    setTimeout(() => {
      const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
      if (modalContent) {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }
    }, 10);
  }

  closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }
    
    setTimeout(() => {
      modal.classList.add('hidden');
      // 恢复背景滚动
      document.body.style.overflow = '';
    }, 300);
    
    this.currentCategory = null;
    this.isEditingCategory = false;
  }

  renderCategoryList() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;

    if (this.categories.length === 0) {
      categoryList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          暂无分类数据
        </div>
      `;
      return;
    }

    categoryList.innerHTML = this.categories.map(category => `
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 flex items-center justify-center text-lg">
            ${category.icon || '📁'}
          </div>
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white">${category.name}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400">${category.description || '暂无描述'}</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="px-2 py-1 text-xs rounded-full ${category.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
            ${category.is_active ? '启用' : '禁用'}
          </span>
          <button data-action="edit-category" data-category-id="${category.id}" 
                  class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">
            编辑
          </button>
          <button data-action="delete-category" data-category-id="${category.id}" 
                  class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md">
            删除
          </button>
        </div>
      </div>
    `).join('');
  }

  showCategoryForm(category = null) {
    this.currentCategory = category;
    this.isEditingCategory = !!category;
    
    const categoryForm = document.getElementById('categoryForm');
    const categoryFormTitle = document.getElementById('categoryFormTitle');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const form = document.getElementById('categoryFormElement');
    
    if (category) {
      categoryFormTitle.textContent = '编辑分类';
      this.fillCategoryForm(category);
    } else {
      categoryFormTitle.textContent = '添加分类';
      form.reset();
    }
    
    categoryForm.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
  }

  fillCategoryForm(category) {
    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryIcon').value = category.icon || '';
    document.getElementById('categorySort').value = category.sort_order || 0;
    document.getElementById('categoryActive').checked = category.is_active !== false;
  }

  async saveCategory() {
    const form = document.getElementById('categoryFormElement');
    const formData = new FormData(form);
    
    const categoryData = {
      name: formData.get('name'),
      description: formData.get('description'),
      icon: formData.get('icon'),
      sort_order: formData.get('sort_order'),
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const url = this.isEditingCategory 
        ? `/api/points-exchange/admin/categories/${this.currentCategory.id}`
        : '/api/points-exchange/admin/categories';
      
      const method = this.isEditingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryData)
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification(result.message || '保存成功', 'success');
        await this.refreshData();
        this.hideCategoryForm();
      } else {
        this.showNotification(result.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存分类失败:', error);
      this.showNotification('保存失败', 'error');
    }
  }

  hideCategoryForm() {
    const categoryForm = document.getElementById('categoryForm');
    const saveBtn = document.getElementById('saveCategoryBtn');
    categoryForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
  }

  async editCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      this.showCategoryForm(category);
    }
  }

  async deleteCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return;

    const confirmed = await this.showConfirmDialog(
      '删除分类',
      `确定要删除分类"${category.name}"吗？此操作不可恢复！`,
      '删除',
      '取消'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/points-exchange/admin/categories/${categoryId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('分类删除成功', 'success');
        await this.refreshData();
      } else {
        this.showNotification(result.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除分类失败:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  // 积分规则管理方法
  openRulesModal() {
    this.currentRule = null;
    this.isEditingRule = false;
    
    const modal = document.getElementById('rulesModal');
    const modalTitle = document.getElementById('rulesModalTitle');
    const rulesList = document.getElementById('rulesList');
    const ruleForm = document.getElementById('ruleForm');
    const saveBtn = document.getElementById('saveRuleBtn');
    
    modalTitle.textContent = '积分规则管理';
    ruleForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
    
    this.renderRulesList();
    
    // 禁用背景滚动
    document.body.style.overflow = 'hidden';
    
    modal.classList.remove('hidden');
    setTimeout(() => {
      const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
      if (modalContent) {
        modalContent.classList.remove('scale-95', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
      }
    }, 10);
  }

  closeRulesModal() {
    const modal = document.getElementById('rulesModal');
    const modalContent = modal?.querySelector('.bg-white, .dark\\:bg-gray-900');
    
    if (modalContent) {
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
    }
    
    setTimeout(() => {
      modal.classList.add('hidden');
      // 恢复背景滚动
      document.body.style.overflow = '';
    }, 300);
    
    this.currentRule = null;
    this.isEditingRule = false;
  }

  renderRulesList() {
    const rulesList = document.getElementById('rulesList');
    if (!rulesList) return;

    if (this.pointsRules.length === 0) {
      rulesList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          暂无积分规则数据
        </div>
      `;
      return;
    }

    rulesList.innerHTML = this.pointsRules.map(rule => {
      const triggerTypeText = {
        'study_duration': '学习时长',
        'project_completion': '项目完成',
        'consecutive_days': '连续学习',
        'efficiency_score': '学习效率'
      }[rule.trigger_type] || rule.trigger_type;

      return `
        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 flex items-center justify-center text-lg">
              ⭐
            </div>
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">${rule.name}</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">${rule.description || '暂无描述'}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">触发类型: ${triggerTypeText} | 积分: ${rule.points}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 text-xs rounded-full ${rule.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
              ${rule.is_active ? '启用' : '禁用'}
            </span>
            <button data-action="edit-rule" data-rule-id="${rule.id}" 
                    class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md">
              编辑
            </button>
            <button data-action="delete-rule" data-rule-id="${rule.id}" 
                    class="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md">
              删除
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  showRuleForm(rule = null) {
    this.currentRule = rule;
    this.isEditingRule = !!rule;
    
    const ruleForm = document.getElementById('ruleForm');
    const ruleFormTitle = document.getElementById('ruleFormTitle');
    const saveBtn = document.getElementById('saveRuleBtn');
    const form = document.getElementById('ruleFormElement');
    
    if (rule) {
      ruleFormTitle.textContent = '编辑积分规则';
      this.fillRuleForm(rule);
    } else {
      ruleFormTitle.textContent = '添加积分规则';
      form.reset();
      this.hideAllConditionForms();
    }
    
    ruleForm.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
  }

  fillRuleForm(rule) {
    document.getElementById('ruleId').value = rule.id;
    document.getElementById('ruleName').value = rule.name;
    document.getElementById('ruleDescription').value = rule.description || '';
    document.getElementById('ruleTriggerType').value = rule.trigger_type;
    document.getElementById('rulePoints').value = rule.points;
    document.getElementById('ruleSort').value = rule.sort_order || 0;
    document.getElementById('ruleActive').checked = rule.is_active !== false;
    
    // 显示对应的条件表单
    this.showConditionForm(rule.trigger_type);
    
    // 填充条件数据
    if (rule.conditions) {
      const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
      this.fillConditionForm(rule.trigger_type, conditions);
    }
  }

  showConditionForm(triggerType) {
    this.hideAllConditionForms();
    
    switch (triggerType) {
      case 'study_duration':
        document.getElementById('studyDurationConditions').classList.remove('hidden');
        break;
      case 'project_completion':
        document.getElementById('projectCompletionConditions').classList.remove('hidden');
        break;
      case 'consecutive_days':
        document.getElementById('consecutiveDaysConditions').classList.remove('hidden');
        break;
      case 'efficiency_score':
        document.getElementById('efficiencyConditions').classList.remove('hidden');
        break;
    }
  }

  hideAllConditionForms() {
    const conditionForms = [
      'studyDurationConditions',
      'projectCompletionConditions', 
      'consecutiveDaysConditions',
      'efficiencyConditions'
    ];
    
    conditionForms.forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
  }

  fillConditionForm(triggerType, conditions) {
    switch (triggerType) {
      case 'study_duration':
        document.getElementById('durationMinutes').value = conditions.duration_minutes || 60;
        document.getElementById('pointsPerHour').value = conditions.points_per_hour || 10;
        break;
      case 'project_completion':
        document.getElementById('pointsPerProject').value = conditions.points_per_project || 50;
        break;
      case 'consecutive_days':
        document.getElementById('daysRequired').value = conditions.days_required || 7;
        document.getElementById('pointsPerStreak').value = conditions.points_per_streak || 30;
        break;
      case 'efficiency_score':
        document.getElementById('minEfficiency').value = conditions.min_efficiency || 80;
        document.getElementById('pointsPerSession').value = conditions.points_per_session || 20;
        break;
    }
  }

  async saveRule() {
    const form = document.getElementById('ruleFormElement');
    const formData = new FormData(form);
    
    const triggerType = formData.get('trigger_type');
    const conditions = this.buildConditions(triggerType, formData);
    
    const ruleData = {
      name: formData.get('name'),
      description: formData.get('description'),
      trigger_type: triggerType,
      conditions: conditions,
      points: parseInt(formData.get('points')),
      sort_order: parseInt(formData.get('sort_order')) || 0,
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const url = this.isEditingRule 
        ? `/api/points-exchange/admin/points-rules/${this.currentRule.id}`
        : '/api/points-exchange/admin/points-rules';
      
      const method = this.isEditingRule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ruleData)
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification(result.message || '保存成功', 'success');
        await this.refreshData();
        this.renderRulesList();
        this.hideRuleForm();
      } else {
        this.showNotification(result.error || '保存失败', 'error');
      }
    } catch (error) {
      console.error('保存积分规则失败:', error);
      this.showNotification('保存失败', 'error');
    }
  }

  buildConditions(triggerType, formData) {
    switch (triggerType) {
      case 'study_duration':
        return {
          duration_minutes: parseInt(formData.get('duration_minutes')) || 60,
          points_per_hour: parseInt(formData.get('points_per_hour')) || 10
        };
      case 'project_completion':
        return {
          points_per_project: parseInt(formData.get('points_per_project')) || 50
        };
      case 'consecutive_days':
        return {
          days_required: parseInt(formData.get('days_required')) || 7,
          points_per_streak: parseInt(formData.get('points_per_streak')) || 30
        };
      case 'efficiency_score':
        return {
          min_efficiency: parseInt(formData.get('min_efficiency')) || 80,
          points_per_session: parseInt(formData.get('points_per_session')) || 20
        };
      default:
        return {};
    }
  }

  hideRuleForm() {
    const ruleForm = document.getElementById('ruleForm');
    const saveBtn = document.getElementById('saveRuleBtn');
    ruleForm.classList.add('hidden');
    saveBtn.classList.add('hidden');
  }

  async editRule(ruleId) {
    const rule = this.pointsRules.find(r => r.id === ruleId);
    if (rule) {
      this.showRuleForm(rule);
    }
  }

  async deleteRule(ruleId) {
    const rule = this.pointsRules.find(r => r.id === ruleId);
    if (!rule) return;

    const confirmed = await this.showConfirmDialog(
      '删除积分规则',
      `确定要删除积分规则"${rule.name}"吗？此操作不可恢复！`,
      '删除',
      '取消'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/points-exchange/admin/points-rules/${ruleId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        this.showNotification('积分规则删除成功', 'success');
        await this.refreshData();
        this.renderRulesList();
      } else {
        this.showNotification(result.error || '删除失败', 'error');
      }
    } catch (error) {
      console.error('删除积分规则失败:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  async refreshData() {
    await this.loadData();
    this.renderProducts();
    this.renderCategoryList();
    this.updateStats();
    this.showNotification('数据已刷新', 'success');
  }

  showImageUploadStatus(message, type = 'info') {
    const statusContainer = document.getElementById('imageUploadStatus');
    const messageElement = document.getElementById('imageUploadMessage');
    const iconElement = document.getElementById('imageUploadIcon');
    const textElement = document.getElementById('imageUploadText');
    
    if (!statusContainer || !messageElement || !iconElement || !textElement) {
      // 如果找不到元素，回退到原来的通知方式
      this.showNotification(message, type);
      return;
    }
    
    // 设置样式和内容
    const colors = {
      success: 'bg-green-100 border border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400',
      error: 'bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400',
      warning: 'bg-yellow-100 border border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400',
      info: 'bg-blue-100 border border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
    };
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    messageElement.className = `px-3 py-2 rounded-md text-sm font-medium flex items-center ${colors[type] || colors.info}`;
    iconElement.className = `${icons[type] || icons.info} mr-2`;
    textElement.textContent = message;
    
    // 显示状态区域
    statusContainer.classList.remove('hidden');
    
    // 自动隐藏成功和错误消息
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        statusContainer.classList.add('hidden');
      }, 5000);
    }
  }

  showProductModalStatus(message, type = 'info') {
    const statusContainer = document.getElementById('productModalStatus');
    const messageElement = document.getElementById('productModalMessage');
    const iconElement = document.getElementById('productModalIcon');
    const textElement = document.getElementById('productModalText');
    
    if (!statusContainer || !messageElement || !iconElement || !textElement) {
      // 如果找不到元素，回退到原来的通知方式
      this.showNotification(message, type);
      return;
    }
    
    // 设置样式和内容
    const colors = {
      success: 'bg-green-100 border border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400',
      error: 'bg-red-100 border border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400',
      warning: 'bg-yellow-100 border border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400',
      info: 'bg-blue-100 border border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
    };
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    messageElement.className = `px-3 py-2 rounded-md text-sm font-medium flex items-center ${colors[type] || colors.info}`;
    iconElement.className = `${icons[type] || icons.info} mr-2`;
    textElement.textContent = message;
    
    // 显示状态区域
    statusContainer.classList.remove('hidden');
    
    // 自动隐藏成功和错误消息
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        statusContainer.classList.add('hidden');
      }, 5000);
    }
  }

  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl transition-all duration-300 transform translate-x-full max-w-sm`;
    
    const colors = {
      success: 'bg-green-500 text-white border-l-4 border-green-600',
      error: 'bg-red-500 text-white border-l-4 border-red-600',
      warning: 'bg-yellow-500 text-white border-l-4 border-yellow-600',
      info: 'bg-blue-500 text-white border-l-4 border-blue-600'
    };
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
      <div class="flex items-start">
        <i class="${icons[type] || icons.info} mr-3 mt-0.5 text-lg"></i>
        <div class="flex-1">
          <div class="font-medium">${message}</div>
        </div>
        <button class="ml-3 text-white hover:text-gray-200 transition-colors" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏（成功和错误消息显示更长时间）
    const duration = type === 'success' || type === 'error' ? 5000 : 3000;
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, duration);
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
}

// 全局函数
function closeProductModal() {
  if (window.adminPointsExchange) {
    adminPointsExchange.closeProductModal();
  }
}

function saveProduct() {
  if (window.adminPointsExchange) {
    adminPointsExchange.saveProduct();
  }
}

// 分类管理全局函数
function closeCategoryModal() {
  if (window.adminPointsExchange) {
    adminPointsExchange.closeCategoryModal();
  }
}

function saveCategory() {
  if (window.adminPointsExchange) {
    adminPointsExchange.saveCategory();
  }
}

function showCategoryForm() {
  if (window.adminPointsExchange) {
    adminPointsExchange.showCategoryForm();
  }
}

// 积分规则管理全局函数
function closeRulesModal() {
  if (window.adminPointsExchange) {
    adminPointsExchange.closeRulesModal();
  }
}

function saveRule() {
  if (window.adminPointsExchange) {
    adminPointsExchange.saveRule();
  }
}

function showRuleForm() {
  if (window.adminPointsExchange) {
    adminPointsExchange.showRuleForm();
  }
}

// 实例管理
let adminPointsExchange = null;

// 获取或创建实例
function getAdminPointsExchangeInstance() {
  if (!adminPointsExchange) {
    adminPointsExchange = new AdminPointsExchange();
    window.adminPointsExchange = adminPointsExchange;
  }
  return adminPointsExchange;
}

// 初始化函数
function initAdminPointsExchange() {
  console.log('初始化积分兑换管理...');
  const instance = getAdminPointsExchangeInstance();
  instance.init();
  return instance;
}

// DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
  // 检查是否在积分兑换管理页面
  if (document.querySelector('[data-page="admin-points-exchange"]') || 
      window.location.pathname.includes('admin-points-exchange')) {
    initAdminPointsExchange();
  }
});

// 为SPA环境提供的手动初始化函数
window.initAdminPointsExchange = initAdminPointsExchange; 