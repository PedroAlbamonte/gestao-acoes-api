const connection = require('../database/connection');
const cotacoes = require('../modules/cotacoes');
const util = require('../modules/util');

const aliquotaNormal = 0.15;
const aliquotaDaytrade = 0.20;
const aliquotaFii = 0.20;
const isencaoMovimentacaoNormal = 20000;

module.exports = {
    async index(request, response) {
        // Consulta todas as operações do usuário ordenadas por data, papel e tipo [1- Compra | 2 - Venda]
        let operacoes = await connection('operacao')
            .where({
                'user_id': request.user.id
            })
            .select([
                'operacao.*'
            ])
            .orderBy(['data', 'papel', 'tipo']);

        // Consulta se o papel é de uma FII ou não
        const promises = operacoes.map(async (op, idx) =>  {
            let {codbdi} = await cotacoes.getCotacao(op.papel.toString(), "2020-05-13")
            op.fii = codbdi == '12' ? true : false;
            // Transforma a data em string
            if (typeof(op.data) === 'object'){
                op.data = `${op.data.getFullYear()}-${(op.data.getMonth()+1).toString().length < 2 ? '0' + (op.data.getMonth()+1) : (op.data.getMonth()+1)}-${op.data.getDate().toString().length < 2 ? '0' + op.data.getDate() : op.data.getDate()}`;
            }
            if (typeof(op.data_vencimento) !== 'object'){
                op.data_vencimento = new Date(op.data_vencimento);
            }
        })

        var darfs = new Object();
        
        Promise.all(promises).then(() => {
            var operacoesPorPapelData = new Object();

            //Carrega as operações
            operacoes.forEach((op) => {
                var id; //ano(4)-mes(2)
                var anoExercicio;
                var mesExercicio;

                if (op.papel.length > 6) {
                    mesExercicio = op.data_vencimento.getMonth()+1;
                    anoExercicio = op.data_vencimento.getFullYear();
                }
                else {
                    mesExercicio = (new Date(op.data)).getMonth() + 1;
                    anoExercicio = (new Date(op.data)).getFullYear();
                }
                id = `${anoExercicio}-${mesExercicio.toString().length < 2 ? '0' + mesExercicio : mesExercicio}`;

                if (darfs[id] === undefined) {
                    darfs[id] = new Object;
                    darfs[id]['mesRef'] = id;
                    var dataPagamento = new Date((new Date(id+"-01T00:00:00")).setMonth(mesExercicio));
                    var mesPagamento = dataPagamento.getMonth() + 1;
                    var anoPagamento = dataPagamento.getFullYear();
                    darfs[id]['mesPagamento'] = `${anoPagamento}-${mesPagamento.toString().length < 2 ? '0' + mesPagamento : mesPagamento}`;
                    darfs[id]['normal'] = new Object();
                    darfs[id]['normal']['lucro'] = 0;
                    darfs[id]['normal']['saldo'] = 0;
                    darfs[id]['normal']['valor'] = 0;
                    darfs[id]['normal']['valorMovimentado'] = 0;
                    darfs[id]['normal']['operacoes'] = new Array();
                    darfs[id]['opcoes'] = new Object();
                    darfs[id]['opcoes']['lucro'] = 0;
                    darfs[id]['opcoes']['valorMovimentado'] = 0;
                    darfs[id]['opcoes']['operacoes'] = new Array();
                    darfs[id]['daytrade'] = new Object();
                    darfs[id]['daytrade']['lucro'] = 0;
                    darfs[id]['daytrade']['saldo'] = 0;
                    darfs[id]['daytrade']['valor'] = 0;
                    darfs[id]['daytrade']['valorMovimentado'] = 0;
                    darfs[id]['daytrade']['operacoes'] = new Array();
                    darfs[id]['fii'] = new Object();
                    darfs[id]['fii']['lucro'] = 0;
                    darfs[id]['fii']['saldo'] = 0;
                    darfs[id]['fii']['valor'] = 0;
                    darfs[id]['fii']['valorMovimentado'] = 0;
                    darfs[id]['fii']['operacoes'] = new Array();
                    darfs[id]['ir'] = new Object();
                    darfs[id]['ir']['pago'] = 0;
                    darfs[id]['ir']['saldo'] = 0;
                    darfs[id]['ir']['operacoes'] = new Array();
                    darfs[id]['valorDevido'] = 0;
                }

                if (operacoesPorPapelData[op.data] === undefined){
                    operacoesPorPapelData[op.data] = new Object();
                }

                if (operacoesPorPapelData[op.data][op.papel] === undefined){
                    operacoesPorPapelData[op.data][op.papel] = new Object();
                }

                if (operacoesPorPapelData[op.data][op.papel][op.tipo] === undefined) {
                    operacoesPorPapelData[op.data][op.papel][op.tipo] = new Object();
                    operacoesPorPapelData[op.data][op.papel][op.tipo]['irPago'] = 0
                    operacoesPorPapelData[op.data][op.papel][op.tipo]['precoMedio'] = 0
                    operacoesPorPapelData[op.data][op.papel][op.tipo]['quantidade'] = 0
                }

                operacoesPorPapelData[op.data][op.papel][op.tipo]['irPago'] = Number(operacoesPorPapelData[op.data][op.papel][op.tipo]['irPago']) + Number(op.ir);
                operacoesPorPapelData[op.data][op.papel][op.tipo]['precoMedio'] = ((Number(operacoesPorPapelData[op.data][op.papel][op.tipo]['precoMedio']) * Number(operacoesPorPapelData[op.data][op.papel][op.tipo]['quantidade']) ) + Number(op.total)) / (Number(op.quantidade) + Number(operacoesPorPapelData[op.data][op.papel][op.tipo]['quantidade']));
                operacoesPorPapelData[op.data][op.papel][op.tipo]['quantidade'] = Number(op.quantidade) + Number(operacoesPorPapelData[op.data][op.papel][op.tipo]['quantidade']);
                operacoesPorPapelData[op.data][op.papel]['fii'] = op.fii;
                operacoesPorPapelData[op.data][op.papel]['id'] = id;
                operacoesPorPapelData[op.data][op.papel]['data_vencimento'] = op.data_vencimento;
            })

            acumulado = new Object();
            const addAcumulado = ((papel, tipo, quantidade, precoMedio) => {
                if ( acumulado[papel] === undefined){
                    acumulado[papel] = new Object();
                }
                if ( acumulado[papel][tipo] === undefined){
                    acumulado[papel][tipo] = new Object();
                    acumulado[papel][tipo]['precoMedio'] = 0
                    acumulado[papel][tipo]['quantidade'] = 0
                }

                acumulado[papel][tipo]['precoMedio'] = ((Number(acumulado[papel][tipo]['precoMedio']) * Number(acumulado[papel][tipo]['quantidade'])) + (Number(precoMedio) * Number(quantidade))) / (Number(quantidade) + Number(acumulado[papel][tipo]['quantidade']))
                acumulado[papel][tipo]['quantidade'] = Number(quantidade) + Number(acumulado[papel][tipo]['quantidade'])
            })

            const subAcumulado = ((papel, tipo, quantidade) => {
                acumulado[papel][tipo]['quantidade'] = Number(acumulado[papel][tipo]['quantidade']) - Number(quantidade);
                if (acumulado[papel][tipo]['quantidade'] == 0) {
                    acumulado[papel][tipo]['precoMedio'] = 0;
                }
            })

            //Lógica para tratar operação normal, opção e FII
            const trataOperacao = ((id, tipoDarf, papel, tipo, irPago, quantidade, precoMedio, data) => {
                let antiTipo = (tipo == '1') ? '2' : '1' ;
                var idDarf = '';
                
                var idIr = data.substring(0, 7);
                darfs[idIr]['ir']['pago'] = Number(darfs[idIr]['ir']['pago']) + Number(irPago);
                if (Number(irPago) != 0) {
                    darfs[idIr]['ir']['operacoes'].push({ papel, data, ir: Number(irPago) });
                }

                if (papel.length > 6) {
                    idDarf = data.substring(0, 7);
                } else {
                    idDarf = id;
                }

                if (acumulado[papel] === undefined || acumulado[papel][antiTipo] === undefined || acumulado[papel][antiTipo]['quantidade'] == 0) {
                    addAcumulado(papel, tipo, quantidade, precoMedio);
                } else {
                    if (acumulado[papel][antiTipo]['quantidade'] >= quantidade) {
                        // Quantidade no acúmulo maior ou igual do que na operação
                        let lucro;
                        let valorMovimentado = Number(precoMedio) * Number(quantidade);
                        if (tipo == '1') {
                            lucro = (Number(quantidade) * Number(acumulado[papel][antiTipo]['precoMedio'])) - (Number(precoMedio) * Number(quantidade));
                            darfs[idDarf][tipoDarf]['operacoes'].push({data, papel, tipo, quantidade, valorCompra: Number(precoMedio), valorVenda: Number(acumulado[papel][antiTipo]['precoMedio']), lucro});
                        } else { 
                            lucro = (Number(precoMedio) * Number(quantidade)) - (Number(quantidade) * Number(acumulado[papel][antiTipo]['precoMedio']));
                            darfs[idDarf][tipoDarf]['operacoes'].push({data, papel, tipo, quantidade, valorCompra: Number(acumulado[papel][antiTipo]['precoMedio']), valorVenda: Number(precoMedio), lucro});
                        }
                        
                        darfs[idDarf][tipoDarf]['lucro'] = Number(darfs[idDarf][tipoDarf]['lucro']) + Number(lucro);
                        darfs[idDarf][tipoDarf]['valorMovimentado'] = Number(darfs[idDarf][tipoDarf]['valorMovimentado']) + Number(valorMovimentado);
                        
                        subAcumulado(papel, antiTipo, quantidade);
                    } else {
                        //Menor quantidade no acúmulo do que na operação
                        let lucro;
                        let valorMovimentado = Number(precoMedio) * Number(quantidade);
                        if (tipo == '1') {
                            lucro = (Number(acumulado[papel][antiTipo]['quantidade']) * Number(acumulado[papel][antiTipo]['precoMedio'])) - (Number(precoMedio) * Number(acumulado[papel][antiTipo]['quantidade']));
                            darfs[idDarf][tipoDarf]['operacoes'].push({data, papel, tipo, quantidade: Number(acumulado[papel][antiTipo]['quantidade']), valorCompra: Number(precoMedio), valorVenda: Number(acumulado[papel][antiTipo]['precoMedio']), lucro});
                        } else { 
                            lucro = (Number(precoMedio) * Number(acumulado[papel][antiTipo]['quantidade'])) - (Number(acumulado[papel][antiTipo]['quantidade']) * Number(acumulado[papel][antiTipo]['precoMedio']));
                            darfs[idDarf][tipoDarf]['operacoes'].push({data, papel, tipo, quantidade: Number(acumulado[papel][antiTipo]['quantidade']), valorCompra: Number(acumulado[papel][antiTipo]['precoMedio']), valorVenda: Number(precoMedio), lucro});
                        }
                        darfs[idDarf][tipoDarf]['lucro'] = Number(darfs[idDarf][tipoDarf]['lucro']) + Number(lucro);
                        darfs[idDarf][tipoDarf]['valorMovimentado'] = Number(darfs[idDarf][tipoDarf]['valorMovimentado']) + Number(valorMovimentado);

                        subAcumulado(papel, antiTipo, Number(acumulado[papel][antiTipo]['quantidade']));
                        addAcumulado(papel, tipo, Number(Number(quantidade) - Number(acumulado[papel][antiTipo]['quantidade'])), Number(precoMedio));
                    }
                }
            });

            // Trata as operações
            for (var data in operacoesPorPapelData) {
                for (var papel in operacoesPorPapelData[data]) {
                    let id = operacoesPorPapelData[data][papel]['id'];
                    //Utilizado quando for opções para considerar a data  da transação e não do vencimento
                    let mesDaytrade = (new Date(data+"T00:00:00")).getMonth() + 1;
                    let idDaytrade = `${(new Date(data+"T00:00:00")).getFullYear()}-${mesDaytrade.toString().length < 2 ? '0' + mesDaytrade : mesDaytrade}`;
                    if (operacoesPorPapelData[data][papel]['fii']){
                        //FII
                        if (operacoesPorPapelData[data][papel]['1'] !== undefined){
                            //compra
                            trataOperacao(id, 'fii', papel, '1', operacoesPorPapelData[data][papel]['1']['irPago'], operacoesPorPapelData[data][papel]['1']['quantidade'], operacoesPorPapelData[data][papel]['1']['precoMedio'], data);
                        }

                        if (operacoesPorPapelData[data][papel]['2'] !== undefined){
                            //Venda
                            trataOperacao(id, 'fii', papel, '2', operacoesPorPapelData[data][papel]['2']['irPago'], operacoesPorPapelData[data][papel]['2']['quantidade'], operacoesPorPapelData[data][papel]['2']['precoMedio'], data);
                        } 
                    } else {
                        if (operacoesPorPapelData[data][papel]['1'] !== undefined && operacoesPorPapelData[data][papel]['2'] !== undefined) {
                            //Daytrade
                            if (operacoesPorPapelData[data][papel]['1']['quantidade'] == operacoesPorPapelData[data][papel]['2']['quantidade']){
                                // Quantidades iguais 
                                let lucro = ( (Number(operacoesPorPapelData[data][papel]['2']['quantidade']) * Number(operacoesPorPapelData[data][papel]['2']['precoMedio'])) - (Number(operacoesPorPapelData[data][papel]['1']['quantidade']) * Number(operacoesPorPapelData[data][papel]['1']['precoMedio'])));
                                darfs[idDaytrade]['daytrade']['operacoes'].push({
                                    data, 
                                    papel, 
                                    tipo: 0, 
                                    quantidade: Number(operacoesPorPapelData[data][papel]['2']['quantidade']), 
                                    valorCompra: Number(operacoesPorPapelData[data][papel]['1']['precoMedio']), 
                                    valorVenda: Number(operacoesPorPapelData[data][papel]['2']['precoMedio']), 
                                    lucro});

                                darfs[idDaytrade]['daytrade']['lucro'] = Number(darfs[idDaytrade]['daytrade']['lucro']) + lucro;
                                darfs[idDaytrade]['ir']['pago'] = Number(darfs[idDaytrade]['ir']['pago']) + Number(operacoesPorPapelData[data][papel]['2']['irPago']);
                                if (Number(darfs[idDaytrade]['ir']['pago']) != 0) {
                                    darfs[idDaytrade]['ir']['operacoes'].push({ papel, data, ir: Number(operacoesPorPapelData[data][papel]['2']['irPago']) });
                                }
                            } else {
                                if (operacoesPorPapelData[data][papel]['1']['quantidade'] > operacoesPorPapelData[data][papel]['2']['quantidade']){
                                    //Mais compra do que venda
                                    let lucro =  ( (Number(operacoesPorPapelData[data][papel]['2']['quantidade']) * Number(operacoesPorPapelData[data][papel]['2']['precoMedio'])) - (Number(operacoesPorPapelData[data][papel]['2']['quantidade']) * Number(operacoesPorPapelData[data][papel]['1']['precoMedio'])));
                                    darfs[idDaytrade]['daytrade']['operacoes'].push({
                                        data, 
                                        papel, 
                                        tipo: 0, 
                                        quantidade: Number(operacoesPorPapelData[data][papel]['2']['quantidade']), 
                                        valorCompra: Number(operacoesPorPapelData[data][papel]['1']['precoMedio']), 
                                        valorVenda: Number(operacoesPorPapelData[data][papel]['2']['precoMedio']), 
                                        lucro});
                                    darfs[idDaytrade]['daytrade']['lucro'] = Number(darfs[idDaytrade]['daytrade']['lucro']) + lucro;
                                    darfs[idDaytrade]['ir']['pago'] = Number(darfs[idDaytrade]['ir']['pago']) + Number(operacoesPorPapelData[data][papel]['2']['irPago']);

                                    if (Number(darfs[idDaytrade]['ir']['pago']) != 0) {
                                        darfs[idDaytrade]['ir']['operacoes'].push({ papel, data, ir: Number(operacoesPorPapelData[data][papel]['2']['irPago']) });
                                    }

                                    if (papel.length > 6) {
                                        trataOperacao(
                                            id, 
                                            'opcoes', 
                                            papel+id, 
                                            '1', 
                                            0, 
                                            Number(operacoesPorPapelData[data][papel]['1']['quantidade']) - Number(operacoesPorPapelData[data][papel]['2']['quantidade']), 
                                            Number(operacoesPorPapelData[data][papel]['1']['precoMedio']), 
                                            data);
                                    } else {
                                        trataOperacao(
                                            id, 
                                            'normal', 
                                            papel, 
                                            '1', 
                                            0, 
                                            Number(operacoesPorPapelData[data][papel]['1']['quantidade']) - Number(operacoesPorPapelData[data][papel]['2']['quantidade']), 
                                            Number(operacoesPorPapelData[data][papel]['1']['precoMedio']), 
                                            data);
                                    }
                                } else {
                                    //Mais venda do que compra
                                    let lucro = ( (Number(operacoesPorPapelData[data][papel]['1']['quantidade']) * Number(operacoesPorPapelData[data][papel]['2']['precoMedio'])) - (Number(operacoesPorPapelData[data][papel]['1']['quantidade']) * Number(operacoesPorPapelData[data][papel]['1']['precoMedio'])));
                                    darfs[idDaytrade]['daytrade']['operacoes'].push({
                                        data, 
                                        papel, 
                                        tipo: 0, 
                                        quantidade: Number(operacoesPorPapelData[data][papel]['1']['quantidade']), 
                                        valorCompra: Number(operacoesPorPapelData[data][papel]['1']['precoMedio']), 
                                        valorVenda: Number(operacoesPorPapelData[data][papel]['2']['precoMedio']), 
                                        lucro});

                                    darfs[idDaytrade]['daytrade']['lucro'] = Number(darfs[idDaytrade]['daytrade']['lucro']) + lucro;
                                    darfs[idDaytrade]['ir']['pago'] = Number(darfs[idDaytrade]['ir']['pago']) + Number(operacoesPorPapelData[data][papel]['2']['irPago']);
                                    if (Number(darfs[idDaytrade]['ir']['pago']) != 0) {
                                        darfs[idDaytrade]['ir']['operacoes'].push({ papel, data, ir: Number(operacoesPorPapelData[data][papel]['2']['irPago']) });
                                    }

                                    if (papel.length > 6) {
                                        trataOperacao(
                                            id, 
                                            'opcoes', 
                                            papel+id, 
                                            '2', 
                                            0, 
                                            Number(operacoesPorPapelData[data][papel]['2']['quantidade']) - Number(operacoesPorPapelData[data][papel]['1']['quantidade']), 
                                            Number(operacoesPorPapelData[data][papel]['2']['precoMedio']), 
                                            data);
                                    } else {
                                        trataOperacao(
                                            id, 
                                            'normal', 
                                            papel, 
                                            '2', 
                                            0, 
                                            Number(operacoesPorPapelData[data][papel]['2']['quantidade']) - Number(operacoesPorPapelData[data][papel]['1']['quantidade']), 
                                            Number(operacoesPorPapelData[data][papel]['2']['precoMedio']), 
                                            data);
                                    }
                                }
                            }
                        } else {
                            //Normal
                            if (operacoesPorPapelData[data][papel]['1'] !== undefined){
                                //compra
                                //Para opções concatena o ano ao Papel para não confundir com opções de anos diferentes
                                if (papel.length > 6) {
                                    trataOperacao(id, 'opcoes', papel + id, '1', operacoesPorPapelData[data][papel]['1']['irPago'], operacoesPorPapelData[data][papel]['1']['quantidade'], operacoesPorPapelData[data][papel]['1']['precoMedio'], data);
                                } else {
                                    trataOperacao(id, 'normal', papel, '1', operacoesPorPapelData[data][papel]['1']['irPago'], operacoesPorPapelData[data][papel]['1']['quantidade'], operacoesPorPapelData[data][papel]['1']['precoMedio'], data);
                                }
                            }

                            if (operacoesPorPapelData[data][papel]['2'] !== undefined){
                                //Venda
                                //Para opções concatena o ano ao Papel para não confundir com opções de anos diferentes
                                if (papel.length > 6) {
                                    trataOperacao(id, 'opcoes', papel + id, '2', operacoesPorPapelData[data][papel]['2']['irPago'], operacoesPorPapelData[data][papel]['2']['quantidade'], operacoesPorPapelData[data][papel]['2']['precoMedio'], data);
                                } else {
                                    trataOperacao(id, 'normal', papel, '2', operacoesPorPapelData[data][papel]['2']['irPago'], operacoesPorPapelData[data][papel]['2']['quantidade'], operacoesPorPapelData[data][papel]['2']['precoMedio'], data);
                                }
                            } 
                        }
                    }
                }
            }

            //Trada as opções vencidas
            for (papel in acumulado){
                if (papel.length > 6) {
                    let id = papel.substring(papel.length-7);
                    let dia = util.getThirdMondayDay(Number(id.substring(0, 4)), Number(id.substring(5)));
                    var data = `${id.substring(0, 4)}-${id.substring(5)}-${dia}`;
                    
                    if (acumulado[papel]['1'] != undefined && acumulado[papel]['1']['quantidade'] > 0) {
                        let lucro = (Number(acumulado[papel]['1']['quantidade']) * Number(acumulado[papel]['1']['precoMedio']));
                        darfs[id]['opcoes']['lucro'] = Number(darfs[id]['opcoes']['lucro']) - lucro;
                        darfs[id]['opcoes']['operacoes'].push({
                            data: data, 
                            papel, 
                            tipo: 1, 
                            quantidade: Number(acumulado[papel]['1']['quantidade']),
                            valorCompra: Number(acumulado[papel]['1']['precoMedio']),
                            valorVenda: 0, 
                            lucro: -lucro});
                    }

                    if (acumulado[papel]['2'] != undefined && acumulado[papel]['2']['quantidade'] > 0) {
                        let lucro = (Number(acumulado[papel]['2']['quantidade']) * Number(acumulado[papel]['2']['precoMedio']));
                        darfs[id]['opcoes']['lucro'] = Number(darfs[id]['opcoes']['lucro']) + lucro;
                        darfs[id]['opcoes']['operacoes'].push({
                            data: data, 
                            papel, 
                            tipo: 2, 
                            quantidade: Number(acumulado[papel]['2']['quantidade']),
                            valorCompra: 0,
                            valorVenda: Number(acumulado[papel]['2']['precoMedio']), 
                            lucro});
                    }
                }
            }

            var count = 0;
            var darfsArr = new Array();

            // Transforma o map em array para ordenação
            var darfsArrTemp = Object.keys(darfs).map(function(key) {
                return [key, darfs[key]];
            });
            
            // Ordenação do Array por data
            darfsArrTemp.sort(function(first, second) {
                if (first[0] > second[0]){
                    return 1;
                }
                if (second[0] > first[0]){
                    return -1;
                }
                return 0;
            });

            // Calcula valores totais do mês
            for (let i = 0; i < darfsArrTemp.length; i++) {
                const trataCalculo = ((tipoDarf) => {
                    if (i == 0 || darfsArrTemp[i-1][1][tipoDarf]['saldo'] >= 0){
                        darfsArrTemp[i][1][tipoDarf]['saldo'] = Number(darfsArrTemp[i][1][tipoDarf]['lucro']);
                    } else {
                        darfsArrTemp[i][1][tipoDarf]['saldo'] = Number(darfsArrTemp[i-1][1][tipoDarf]['saldo']) + Number(darfsArrTemp[i][1][tipoDarf]['lucro'])
                    }

                    if (Number(darfsArrTemp[i][1][tipoDarf]['saldo']) > 0) {
                        let aliquota = (tipoDarf == 'normal') ? aliquotaNormal : ((tipoDarf == 'daytrade') ? aliquotaDaytrade : aliquotaFii);
                        // if (tipoDarf == 'normal' && darfsArrTemp[i][1][tipoDarf]['valorMovimentado'] <= isencaoMovimentacaoNormal) {
                        //     aliquota = 0;
                        // }
                        darfsArrTemp[i][1][tipoDarf]['valor'] = Number(darfsArrTemp[i][1][tipoDarf]['saldo']) * aliquota;
                    }
                })

                darfsArrTemp[i][1]['normal']['lucro'] = Number(darfsArrTemp[i][1]['normal']['lucro']) + Number(darfsArrTemp[i][1]['opcoes']['lucro']);
                trataCalculo('normal');
                trataCalculo('daytrade');
                trataCalculo('fii');

                if (i == 0 || darfsArrTemp[i-1][1]['valorDevido'] > 0) {
                    darfsArrTemp[i][1]['ir']['saldo'] = Number(darfsArrTemp[i][1]['ir']['pago'])
                } else {
                    darfsArrTemp[i][1]['ir']['saldo'] = Number(darfsArrTemp[i-1][1]['ir']['saldo']) + Number(darfsArrTemp[i][1]['ir']['pago'])
                }
                darfsArrTemp[i][1]['valorDevido'] = Number(darfsArrTemp[i][1]['normal']['valor']) + 
                                                    Number(darfsArrTemp[i][1]['daytrade']['valor']) + 
                                                    Number(darfsArrTemp[i][1]['fii']['valor'])
                darfsArrTemp[i][1]['valorDevido'] = (Number(darfsArrTemp[i][1]['valorDevido']) > 0) ? Number(darfsArrTemp[i][1]['valorDevido']) - Number(darfsArrTemp[i][1]['ir']['saldo']) : 0;
                                                    
                darfsArr.push(darfsArrTemp[i][1])
                count++;
            }

            response.header('X-Total-Count', count);

            return response.json(darfsArr);
        });
    },
}