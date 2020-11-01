const connection = require('../database/connection');
const util = require('../modules/util');

module.exports = {
  async index(request, response) {
    //console.log(request.user);
    const { page = 1 } = request.query;

    const [count] = await connection('operacao').count();

    const operacoes = await connection('operacao')
      // .limit(5)
      .where({
        'user_id': request.user.id
      })
      .offset((page - 1) * 5)
      .select([
        'operacao.*'
      ])
      .orderBy('data');

    response.header('X-Total-Count', count['count(*)']);

    operacoes.forEach( operacao => {
      operacao.preco = Number(operacao.preco);
      operacao.subtotal = Number(operacao.subtotal);
      operacao.corretagem = Number(operacao.corretagem);
      operacao.ir = Number(operacao.ir);
      operacao.total = Number(operacao.total);
    })

    return response.json(operacoes);
  },

  async create(request, response) {
    const { tipo, papel, data, preco, quantidade, subtotal, corretagem, ir, total } = request.body;
    const user_id = request.user.id;
    var id = 0

    if (papel.length > 6){
      //Opções
      const dataVencimento = await util.getExpirationDate(papel, new Date(Number(data.substring(0,4)), Number(data.substring(5,7))-1, Number(data.substring(8))));

      [id] = await connection('operacao').insert({
        tipo,
        papel,
        data,
        preco,
        quantidade,
        subtotal,
        corretagem,
        ir,
        total,
        user_id,
        data_vencimento: dataVencimento.toISOString()
      }, 'id')
      .catch(error => {
        console.log(error);
      });
    } else {
      // Papeis diferentes de opções
      [id]= await connection('operacao').insert({
        tipo,
        papel,
        data,
        preco,
        quantidade,
        subtotal,
        corretagem,
        ir,
        total,
        user_id
      }, 'id')
      .catch(error => {
        console.log(error);
      });
    }
    
    // console.log(retorno);
    return response.json({ id });
  },

  async delete(request, response) {
    const { id } = request.params;

    await connection('operacao').where('id', id).delete();

    return response.status(204).send();
  }
};