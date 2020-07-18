
exports.up = function(knex) {
    return knex('conf_opcoes')
    .insert([{
        id: 'A',
        mes_ref: 1
    },{
        id: 'B',
        mes_ref: 2
    },{
        id: 'C',
        mes_ref: 3
    },{
        id: 'D',
        mes_ref: 4
    },{
        id: 'E',
        mes_ref: 5
    },{
        id: 'F',
        mes_ref: 6
    },{
        id: 'G',
        mes_ref: 7
    },{
        id: 'H',
        mes_ref: 8
    },{
        id: 'I',
        mes_ref: 9
    },{
        id: 'J',
        mes_ref: 10
    },{
        id: 'K',
        mes_ref: 11
    },{
        id: 'L',
        mes_ref: 12
    },{
        id: 'M',
        mes_ref: 1
    },{
        id: 'N',
        mes_ref: 2
    },{
        id: 'O',
        mes_ref: 3
    },{
        id: 'P',
        mes_ref: 4
    },{
        id: 'Q',
        mes_ref: 5
    },{
        id: 'R',
        mes_ref: 6
    },{
        id: 'S',
        mes_ref: 7
    },{
        id: 'T',
        mes_ref: 8
    },{
        id: 'U',
        mes_ref: 9
    },{
        id: 'V',
        mes_ref: 10
    },{
        id: 'W',
        mes_ref: 11
    },{
        id: 'X',
        mes_ref: 12
    }])
};

exports.down = function(knex) {
    return knex('conf_opcoes').truncate();
};
