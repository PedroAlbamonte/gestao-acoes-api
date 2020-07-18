const connection = require('../database/connection');
const bovespa = require('bovespa')();

const salvarCotacao = async (papel, data, valor, codbdi) => {
    await connection('cotacoes')
    .insert({
        papel: papel,
        data: data.toISOString(),
        cotacao: valor,
        codbdi: codbdi
    })
    .catch(function (e) {
        console.log(`${papel} - ${data}`);
        console.log(e);
        return undefined ;
    })
}

const formataData = (data) => {
    let dataFormatada = data.toISOString().substring(0, 10)
    return dataFormatada;
}

const obtemNovaCotacao = async (papel, data) => {
    let dataFormatada = formataData(data);
    let cotacao = 0;
    let codbdi = '';

    let consulta = await bovespa(papel, dataFormatada)
    .catch(function (e) {
        if (e.response != undefined && e.response.status != 404) {
            console.log(`${papel} - ${data}`);
            console.log(e);
        }
        return undefined ;
    })

    if ( consulta !== undefined ) {
        cotacao = Number(consulta.preult)
        codbdi = consulta.codbdi
        await salvarCotacao(papel, data, cotacao, codbdi)
    }
    
    return {cotacao, codbdi}
}

module.exports = {
    async getCotacao(papel, data) {
        let dataObj = new Date(data);
        let resultado = await connection('cotacoes')
            .where({
                papel: papel,
                data: dataObj.toISOString()
            })
            .select('cotacao', 'codbdi')
            .catch(function(error) {
                    return undefined;
                }
            );

        if (resultado === undefined) {
            return {cotacao: 0.0 , codbdi: ''};
        } else if (resultado.length == 0) {
            let {cotacao, codbdi} = await obtemNovaCotacao(papel, dataObj)
            return {cotacao, codbdi};
        } else {
            let [{cotacao, codbdi}] = resultado
            return {cotacao, codbdi};
        }
    }
}