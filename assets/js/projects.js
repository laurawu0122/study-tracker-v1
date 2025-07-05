            if (response.ok) {
                const data = await response.json();
                this.showEditSuccess('项目更新成功！');
                
                // 立即关闭模态框并重新加载项目列表
                this.hideEditModal();
                this.loadProjects(this.currentPage);
                
                // 触发全局事件，通知其他模块刷新项目列表
                const projectUpdateEvent = new CustomEvent('projectListUpdated', {
                    detail: { action: 'updated', projectName: projectData.name }
                });
                window.dispatchEvent(projectUpdateEvent);
                console.log('已触发项目列表更新事件');
            } else {
                const errorData = await response.json();
                this.showEditError(errorData.error || '更新项目失败');
            } 