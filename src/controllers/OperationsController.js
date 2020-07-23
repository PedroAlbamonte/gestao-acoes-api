const connection = require('../database/connection');

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

    const [id] = await connection('operacao').insert({
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
    // console.log(retorno);
    return response.json({ id });
  },

  async delete(request, response) {
    const { id } = request.params;

    await connection('operacao').where('id', id).delete();

    return response.status(204).send();
  }
};