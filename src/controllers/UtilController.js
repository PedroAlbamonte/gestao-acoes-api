const util = require('../modules/util');
const connection = require('../database/connection');

module.exports = {
  async dataVencimento(request, response){
    const papel = request.query.papel;
    const data = request.query.data;
    const expDate = await util.getExpirationDate(papel, new Date(Number(data.substring(0,4)), Number(data.substring(5,7))-1, Number(data.substring(8))));
    if (expDate !== undefined){ 
      response.json({ status: "OK", date: expDate.toISOString()});
    } else {
      response.json({ status: "NOK", message: "Arquivo não encontrado para a data"});
    }
  },

  async setAllExpirationDate(request, response){
    console.info(`Iniciando a atualização das datas de vencimento`);
    const operacoes = await connection('operacao')

    for (var i=0; i<operacoes.length; i++){
      if (operacoes[i].papel.length > 6 && operacoes[i].data_vencimento == null){
        var dataOperacao;

        if (typeof(operacoes[i].data) === 'object'){
          dataOperacao = operacoes[i].data;
        } else {
          dataOperacao = new Date(Number(operacoes[i].data.substring(0,4)), Number(operacoes[i].data.substring(5,7))-1, Number(operacoes[i].data.substring(8)));
        }
        const expDate = await util.getExpirationDate(operacoes[i].papel, dataOperacao);
        if (expDate !== undefined){
          // Atualiza a data de vencimento
          await connection('operacao')
          .where('id',operacoes[i].id)
          .update({
            data_vencimento: expDate.toISOString()
          })
          .catch(function(err){
            console.error(err);
            return;         
          }); 
        }
        console.info(`Data de vencimento da operação ${operacoes[i].id} alterada para ${expDate.toISOString()}`);
      }
    }

    console.info(`Atualização finalizada`);
    response.json({status: "OK"});
  },

  async listFiles(request, response){
    files = util.listFiles();

    return response.json({status: "OK", path: files.path, files: files.files});
  }
}


