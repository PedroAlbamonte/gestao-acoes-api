
exports.up = function(knex) {
    return knex('operacao_tipo')
        .insert([{
            id: 1,
            descricao: 'Compra'
        },{
            id: 2,
            descricao: 'Venda'
        }])
};

exports.down = function(knex) {
    return knex('operacao_tipo').truncate();
};
