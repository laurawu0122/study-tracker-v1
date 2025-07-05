exports.up = async function(knex) {
  // 检查字段是否存在再添加
  const hasIsActive = await knex.schema.hasColumn('users', 'is_active');
  if (!hasIsActive) {
    await knex.schema.alterTable('users', function(table) {
      table.boolean('is_active').notNullable().defaultTo(true).comment('账户是否激活');
    });
  }
  const hasAvatar = await knex.schema.hasColumn('users', 'avatar');
  if (!hasAvatar) {
    await knex.schema.alterTable('users', function(table) {
      table.string('avatar', 255).nullable().comment('用户头像');
    });
  }
};

exports.down = async function(knex) {
  const hasIsActive = await knex.schema.hasColumn('users', 'is_active');
  if (hasIsActive) {
    await knex.schema.alterTable('users', function(table) {
      table.dropColumn('is_active');
    });
  }
  const hasAvatar = await knex.schema.hasColumn('users', 'avatar');
  if (hasAvatar) {
    await knex.schema.alterTable('users', function(table) {
      table.dropColumn('avatar');
    });
  }
}; 