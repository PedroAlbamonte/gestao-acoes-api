const connection = require('../database/connection');
const util = require('./util');

const salvarCotacao = async (papel, data, valor, categoryName) => {
    await connection('cotacoes')
    .insert({
        papel: papel,
        data: data.toISOString(),
        cotacao: valor,
        category_name: categoryName
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
    let cotacao = 0;
    let categoryName = '';

    let consulta = await util.getStockInfo(papel, data);

    if ( consulta !== undefined ) {
        cotacao = consulta.cotacao
        categoryName = consulta.categoryName
        await salvarCotacao(papel, data, cotacao, categoryName)
    }
    
    return {cotacao, categoryName}
}

module.exports = {
    async getCotacao(papel, data) {
        let dataObj = new Date(data + 'T03:00:00.000Z');
        let resultado = await connection('cotacoes')
            .where({
                papel: papel,
                data: dataObj.toISOString()
            })
            .select('cotacao', 'category_name')
            .catch(function(error) {
                    return undefined;
                }
            );

        if (resultado === undefined) {
            return {cotacao: 0.0 , categoryName: ''};
        } else if (resultado.length == 0) {
            let {cotacao, categoryName} = await obtemNovaCotacao(papel, dataObj)
            return {cotacao, categoryName};
        } else {
            let [{cotacao, categoryName}] = resultado
            return {cotacao, categoryName};
        }
    }
}