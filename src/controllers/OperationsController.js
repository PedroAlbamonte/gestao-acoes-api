const connection = require('../database/connection');

module.exports = {
  async index(request, response) {
    console.log(request.user);
    const { page = 1 } = request.query;

    const [count] = await connection('operacao').count();

    const operacao = await connection('operacao')
      // .limit(5)
      .offset((page - 1) * 5)
      .select([
        'operacao.*'
      ])
      .orderBy('data');

    response.header('X-Total-Count', count['count(*)']);

    return response.json(operacao);
  },

  async create(request, response) {
    const { tipo, papel, data, preco, quantidade, subtotal, corretagem, ir, total } = request.body;

    const [id] = await connection('operacao').insert({
      tipo,
      papel,
      data,
      preco,
      quantidade,
      subtotal,
      corretagem,
      ir,
      total
    });

    return response.json({ id });
  },

  async delete(request, response) {
    const { id } = request.params;

    await connection('operacao').where('id', id).delete();

    return response.status(204).send();
  }
};