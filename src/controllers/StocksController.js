const connection = require('../database/connection');
const cotacoes = require('../modules/cotacoes');
const ehDiaUtil = require('@lfreneda/eh-dia-util')


module.exports = {
    async teste(request, response) {
        const { papel, data: dataStr } = request.body;
        var data = new Date(dataStr);
        const {cotacao} = await cotacoes.getCotacao(papel, data.toISOString());
        return response.json(cotacao);
    },

    async index(request, response) {
        const operacoes = await connection('operacao')
          .where({
            'id': request.user.id
          })
          .select([
            'operacao.*'
          ])
          .orderBy('papel');

        const confOpcoes = await connection('conf_opcoes')
          .select([
            'conf_opcoes.*'
          ]);

        const formataData = (data) => {
            var dia = data.getDate();
            var mes = data.getMonth()+1;
            var ano = data.getFullYear();

            dataFormatada = `${ano}-${mes.toString().length < 2 ? '0'+mes.toString() : mes.toString}-${dia.toString().length < 2 ? '0'+dia.toString() : dia.toString()}` ;
            return dataFormatada;
        }
        
        var opcoes = new Object();
        confOpcoes.forEach(op => {
            opcoes[op.id] = op.mes_ref;
        })

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

        ontem.setDate(1);
        ontem.setMonth(0);
        var dataAno = formataData(ontem);

        while (!ehDiaUtil(dataAno, 'SP')){
            ontem.setDate(ontem.getDate() + 1);
            dataAno = formataData(ontem);
        }

        const promises = operacoes.map(async (op, idx) =>  {
            var id;
            var anoExercicio;

            if (op.papel.length > 6){
                anoExercicio = (opcoes[op.papel[4]] == 1 && ((new Date(op.data)).getMonth()+1) != 1) ? ((new Date(op.data)).getFullYear() + 1) : (new Date(op.data)).getFullYear()
                // console.log(op.data + "|" + anoExercicio + "|" + (new Date(op.data)).getFullYear()  + "|" + ((new Date(op.data)).getMonth()+1))
                id = op.papel + anoExercicio;
            }else{
                id = op.papel;
            }

            if (stocks[id] === undefined){
                stocks[id] = new Object
                stocks[id]['quantidade'] = 0
                stocks[id]['preco'] = 0
                stocks[id]['total'] = 0
                stocks[id]['totalAno'] = 0
                stocks[id]['precoAno'] = 0
                stocks[id]['nome'] = op.papel

                if (op.papel.length > 6){
                    stocks[id].opcao = true;
                    stocks[id].mesExercicio = opcoes[op.papel[4]];
                    stocks[id].anoExercicio = anoExercicio;
                }else{
                    stocks[id].opcao = false;
                }
            }
            // tipo
            // preco
            // subtotal
            // corretagem
            // ir
            // total
            
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

            //Carrega a última cotação
            let {cotacao} = await cotacoes.getCotacao(id.toString(), dataCotacao)
            if (cotacao == 0){
                ({cotacao} = await cotacoes.getCotacao(id.toString(), dataCotacaoMenos1));
                stocks[id]['cotacao'] = cotacao;
            } else {
                stocks[id]['cotacao'] = cotacao;
            }

            //Carrega a primeira cotação do ano
            ({cotacao} = await cotacoes.getCotacao(id.toString(), dataAno))
            stocks[id]['precoAno'] = cotacao ;
        })

        await Promise.all(promises);
        
        var count = 0;
        var stocksArr = new Array();

        for (var key in stocks) {
            if (stocks[key].quantidade != 0){
                if (stocks[key].opcao){
                    var anoAtual = (new Date()).getFullYear();
                    var mesAtual = ((new Date()).getMonth()) + 1
                    if (stocks[key].anoExercicio > anoAtual || (stocks[key].anoExercicio == anoAtual && stocks[key].mesExercicio >= mesAtual)){
                        stocksArr.push(stocks[key])
                        count++;
                    }
                }else{
                    stocksArr.push(stocks[key])
                    count++;
                }
            }
        }

        response.header('X-Total-Count', count);
    
        return response.json(stocksArr);
    },
}