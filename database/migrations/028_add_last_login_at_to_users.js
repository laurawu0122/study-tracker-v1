exports.up = async function(knex) {
  // 检查字段是否存在再添加
  const hasLastLoginAt = await knex.schema.hasColumn('users', 'last_login_at');
  if (!hasLastLoginAt) {
    await knex.schema.alterTable('users', function(table) {
      table.timestamp('last_login_at').nullable().comment('最后登录时间');
    });
  }
};

exports.down = async function(knex) {
  const hasLastLoginAt = await knex.schema.hasColumn('users', 'last_login_at');
  if (hasLastLoginAt) {
    await knex.schema.alterTable('users', function(table) {
      table.dropColumn('last_login_at');
    });
  }
}; 