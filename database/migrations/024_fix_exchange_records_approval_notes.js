/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 检查是否存在admin_notes字段，如果存在则重命名为approval_notes
  const hasAdminNotes = await knex.schema.hasColumn('exchange_records', 'admin_notes');
  const hasApprovalNotes = await knex.schema.hasColumn('exchange_records', 'approval_notes');
  
  if (hasAdminNotes && !hasApprovalNotes) {
    await knex.schema.alterTable('exchange_records', (table) => {
      table.renameColumn('admin_notes', 'approval_notes');
    });
  } else if (!hasApprovalNotes) {
    // 如果两个字段都不存在，则添加approval_notes字段
    await knex.schema.alterTable('exchange_records', (table) => {
      table.text('approval_notes').comment('审核备注');
    });
  }
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasApprovalNotes = await knex.schema.hasColumn('exchange_records', 'approval_notes');
  
  if (hasApprovalNotes) {
    await knex.schema.alterTable('exchange_records', (table) => {
      table.renameColumn('approval_notes', 'admin_notes');
    });
  }
}; 