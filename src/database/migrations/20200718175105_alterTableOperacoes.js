
exports.up = function(knex) {
    return knex.schema
    .dropTable('operacao')
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
        table.integer('user_id').notNullable();

        table.foreign('tipo').references('id').inTable('operacao_tipo');
        table.foreign('user_id').references('id').inTable('users');
    })
};

exports.down = function(knex) {
  
};
