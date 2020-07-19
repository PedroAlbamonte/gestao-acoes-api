
exports.up = function(knex) {
    return knex.schema
    .createTable('users', function (table) {
        table.increments('id');
        table.string('provider').notNullable();
        table.string('provider_user_id').notNullable();
        table.string('name').notNullable();
        table.string('email').notNullable();
        table.string('role').notNullable();
    })
};

exports.down = function(knex) {
    return knex.schema
    .dropTable("users")
};
