
exports.up = function(knex) {
    return knex.schema
    .table('cotacoes', function (table) {
        table.renameColumn("codbdi", "category_name");
    });
};

exports.down = function(knex) {
    return knex.schema
    .table('cotacoes').renameColumn("category_name", "codbdi");
};
