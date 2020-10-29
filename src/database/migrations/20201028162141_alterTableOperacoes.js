
exports.up = function(knex) {
    return knex.schema
    .table('operacao', function (table) {
        table.date('data_vencimento');
    })
};

exports.down = function(knex) {
    return knex.schema
    .table('operacao')
    .dropColumn('data_vencimento');
};
