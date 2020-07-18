
exports.up = function(knex) {
    return knex.schema
        .createTable('conf_opcoes', function (table) {
            table.string('id').primary();
            table.integer('mes_ref').notNullable();
        })
        .createTable('operacao_tipo', function (table) {
            table.integer('id').primary();
            table.string('descricao').notNullable();
        })
        .createTable('operacao', function (table) {
            table.increments('id');
            table.integer('tipo').notNullable();
            table.string('papel').notNullable();
            table.date('data').notNullable();
            table.decimal('preco').notNullable();
            table.integer('quantidade').notNullable();
            table.decimal('subtotal').notNullable();
            table.decimal('corretagem').notNullable();
            table.decimal('ir').notNullable();
            table.decimal('total').notNullable();

            table.foreign('tipo').references('id').inTable('operacao_tipo');
        })
};

exports.down = function(knex) {
    return knex.schema
    .dropTable("conf_opcoes")
    .dropTable("operacao")
    .dropTable("operacao_tipo")
};
