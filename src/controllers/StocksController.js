const connection = require('../database/connection');
const cotacoes = require('../modules/cotacoes');
const ehDiaUtil = require('@lfreneda/eh-dia-util')


module.exports = {
    async index(request, response) {
        const operacoes = await connection('operacao')
          .where({
            'user_id': request.user.id
          })
          .select([
            'operacao.*'
          ])
          .orderBy('papel');

        const formataData = (data) => {
            var dia = data.getDate();
            var mes = data.getMonth()+1;
            var ano = data.getFullYear();

            dataFormatada = `${ano}-${mes.toString().length < 2 ? '0'+mes.toString() : mes.toString()}-${dia.toString().length < 2 ? '0'+dia.toString() : dia.toString()}` ;
            return dataFormatada;
        }

        var stocks = new Object();

        var ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);

        var dataCotacao;
        dataCotacao = formataData(ontem);
        
        while (!ehDiaUtil(dataCotacao, 'SP')){
            ontem.setDate(ontem.getDate() - 1);
            dataCotacao = formataData(ontem);
        }

        ontem.setDate(ontem.getDate() - 1);
        var dataCotacaoMenos1 = formataData(ontem);

        while (!ehDiaUtil(dataCotacaoMenos1, 'SP')){
            ontem.setDate(ontem.getDate() - 1);
            dataCotacaoMenos1 = formataData(ontem);
        }

        // const promises = operacoes.map(async (op, idx) =>  {
        for (var i=0; i<operacoes.length; i++) {
            let op = operacoes[i];
            var id;

            if (op.papel.length > 6){
                if (typeof(op.data_vencimento) !== 'object'){
                    op.data_vencimento = new Date(op.data_vencimento);
                }
                id = op.papel + op.data_vencimento.getFullYear();
            }else{
                id = op.papel;
            }

            if (stocks[id] === undefined){
                stocks[id] = new Object
                stocks[id]['quantidade'] = 0
                stocks[id]['preco'] = 0
                stocks[id]['total'] = 0
                stocks[id]['nome'] = op.papel

                if (op.papel.length > 6){
                    stocks[id].opcao = true;
                    stocks[id].data_vencimento = op.data_vencimento;
                }else{
                    stocks[id].opcao = false;
                }
            }
            
            if (op.tipo == 1){
                //Compra
                stocks[id]['quantidade'] = Number(stocks[id]['quantidade']) + Number(op.quantidade)
                let subtotal = Number(stocks[id]['total']) + Number(op.total)
                stocks[id]['preco'] = subtotal / Number(stocks[id]['quantidade'])
            }else{
                //Venda
                stocks[id]['quantidade'] = Number(stocks[id]['quantidade']) - Number(op.quantidade)
                let subtotal = Number(stocks[id]['total']) - Number(op.total)
                stocks[id]['preco'] = subtotal / Number(stocks[id]['quantidade'])
            }

            if (stocks[id]['quantidade'] == 0){
                stocks[id]['preco'] = 0
                stocks[id]['total'] = 0
            } else {
                stocks[id]['total'] = stocks[id]['quantidade'] * stocks[id]['preco']
            }
        }

        // await Promise.all(promises);
        
        var count = 0;
        var stocksArr = new Array();

        for (var key in stocks) {
            if (stocks[key].quantidade != 0){
                
                if (stocks[key].opcao){
                    var dataAtual = new Date();
                    if (stocks[key].data_vencimento.getTime() >= dataAtual.getTime()){
                        //Carrega a última cotação
                        let stockInfo = undefined;
                        stockInfo = await cotacoes.getCotacao(key.toString().substr(0, key.length-4), dataCotacao)
                        
                        if (stockInfo == undefined){
                            stocks[key]['cotacao'] = 0;
                        } else {
                            stocks[key]['cotacao'] = stockInfo.cotacao;
                        }
                        stocksArr.push(stocks[key])
                        count++;
                    }
                }else{
                    //Carrega a última cotação
                    let stockInfo = undefined;
                    stockInfo = await cotacoes.getCotacao(key.toString(), dataCotacao)
                    
                    if (stockInfo == undefined){
                        stocks[key]['cotacao'] = 0;
                    } else {
                        stocks[key]['cotacao'] = stockInfo.cotacao;
                    }
                    stocksArr.push(stocks[key])
                    count++;
                }
            }
        }

        response.header('X-Total-Count', count);
    
        return response.json(stocksArr);
    },
}