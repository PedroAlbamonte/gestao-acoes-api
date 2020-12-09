
exports.up = function(knex) {
    return knex.schema
    .table('operacao', function (table) {
        table.string('category_name');
    })
};

exports.down = function(knex) {
    return knex.schema
    .table('operacao')
    .dropColumn('category_name');
};
