
exports.up = function(knex) {
    return knex.schema
    .createTable('cotacoes', function (table) {
        table.string('papel').notNullable();
        table.date('data').notNullable();
        table.float('cotacao').notNullable();
        table.string('codbdi').notNullable();
        table.primary(['papel', 'data'], 'PK_COTACOES');
    })
};

exports.down = function(knex) {
    return knex.schema
    .dropTable("cotacoes")
};
