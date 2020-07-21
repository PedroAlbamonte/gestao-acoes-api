const connection = require('../database/connection');
const cotacoes = require('../modules/cotacoes');

const aliquotaNormal = 0.15;
const aliquotaDaytrade = 0.20;
const aliquotaFii = 0.20;

module.exports = {
    async index(request, response) {
        let operacoes = await connection('operacao')
            .where({
                'user_id': request.user.id
            })
            .select([
                'operacao.*'
            ])
            .orderBy(['data', 'papel', 'tipo']);

        const confOpcoes = await connection('conf_opcoes')
            .select([
                'conf_opcoes.*'
            ]);

        var opcoes = new Object();
        confOpcoes.forEach(op => {
                opcoes[op.id] = op.mes_ref;
            });

        const promises = operacoes.map(async (op, idx) =>  {
            let {codbdi} = await cotacoes.getCotacao(op.papel.toString(), "2020-05-13")
            op.fii = codbdi == '12' ? true : false;
            if (typeof(op.data) === 'object'){
                op.data = `${op.data.getFullYear()}-${op.data.getMonth().toString().length < 2 ? '0' + (op.data.getMonth()+1) : (op.data.getMonth()+1)}-${op.data.getDate().toString().length < 2 ? '0' + op.data.getDate() : op.data.getDate()}`;
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
                    mesExercicio = opcoes[op.papel[4]];
                    anoExercicio = (opcoes[op.papel[4]] == 1 && ((new Date(op.data)).getMonth() + 1) != 1) ? ((new Date(op.data)).getFullYear() + 1) : (new Date(op.data)).getFullYear();
                    // console.log(op.data + "|" + anoExercicio + "|" + (new Date(op.data)).getFullYear()  + "|" + ((new Date(op.data)).getMonth()+1))
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
                    darfs[id]['normal']['irPago'] = 0;
                    darfs[id]['normal']['irSaldo'] = 0;
                    darfs[id]['normal']['valor'] = 0;
                    darfs[id]['normal']['operacoes'] = new Array();
                    darfs[id]['daytrade'] = new Object();
                    darfs[id]['daytrade']['lucro'] = 0;
                    darfs[id]['daytrade']['saldo'] = 0;
                    darfs[id]['daytrade']['irPago'] = 0;
                    darfs[id]['daytrade']['irSaldo'] = 0;
                    darfs[id]['daytrade']['valor'] = 0;
                    darfs[id]['daytrade']['operacoes'] = new Array();
                    darfs[id]['fii'] = new Object();
                    darfs[id]['fii']['lucro'] = 0;
                    darfs[id]['fii']['saldo'] = 0;
                    darfs[id]['fii']['irPago'] = 0;
                    darfs[id]['fii']['irSaldo'] = 0;
                    darfs[id]['fii']['valor'] = 0;
                    darfs[id]['fii']['operacoes'] = new Array();
                    darfs[id]['valorDevido'] = 0;
                }

                if (operacoesPorPapelData[op.data] === undefined){
                    // console.log(op.data);
                    // console.log(typeof(op.data));
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
            })

            acumulado = new Object();
            const addAcumulado = ((papel, tipo, irPago, quantidade, precoMedio) => {
                if ( acumulado[papel] === undefined){
                    acumulado[papel] = new Object();
                }
                if ( acumulado[papel][tipo] === undefined){
                    acumulado[papel][tipo] = new Object();
                    acumulado[papel][tipo]['irPago'] = 0
                    acumulado[papel][tipo]['precoMedio'] = 0
                    acumulado[papel][tipo]['quantidade'] = 0
                }

                acumulado[papel][tipo]['irPago'] = Number(acumulado[papel][tipo]['irPago']) + Number(irPago);
                acumulado[papel][tipo]['precoMedio'] = ((Number(acumulado[papel][tipo]['precoMedio']) * Number(acumulado[papel][tipo]['quantidade'])) + (Number(precoMedio) * Number(quantidade))) / (Number(quantidade) + Number(acumulado[papel][tipo]['quantidade']))
                acumulado[papel][tipo]['quantidade'] = Number(quantidade) + Number(acumulado[papel][tipo]['quantidade'])
            })

            const subAcumulado = ((papel, tipo, irPago, quantidade, precoMedio) => {
                acumulado[papel][tipo]['irPago'] = Number(acumulado[papel][tipo]['irPago']) - Number(irPago);
                if (acumulado[papel][tipo]['irPago'] < 0) acumulado[papel][tipo]['irPago'] = 0;
                // acumulado[papel][tipo]['precoMedio'] = ((Number(acumulado[papel][tipo]['precoMedio']) * Number(acumulado[papel][tipo]['quantidade'])) - (Number(precoMedio) * Number(quantidade))) / (Number(acumulado[papel][tipo]['quantidade'])-Number(quantidade))
                acumulado[papel][tipo]['quantidade'] = Number(acumulado[papel][tipo]['quantidade']) - Number(quantidade);
                if (acumulado[papel][tipo]['quantidade'] == 0) {
                    acumulado[papel][tipo]['irPago'] = 0;
                    acumulado[papel][tipo]['precoMedio'] = 0;
                }
            })

            //Trata operação normal e FII
            const trataOperacao = ((id, tipoDarf, papel, tipo, irPago, quantidade, precoMedio, data) => {
                let antiTipo = (tipo == '1') ? '2' : '1' ;
                var idDarf = ''
                if (papel.length > 6) {
                    idDarf = data.substring(0, 7);
                } else {
                    idDarf = id;
                }

                if (acumulado[papel] === undefined || acumulado[papel][antiTipo] === undefined || acumulado[papel][antiTipo]['quantidade'] == 0) {
                    addAcumulado(papel, tipo, irPago, quantidade, precoMedio);
                } else {
                    if (acumulado[papel][antiTipo]['quantidade'] >= quantidade) {
                        // Quantidade no acúmulo maior ou igual do que na operação
                        let lucro;
                        if (tipo == '1') {
                            lucro = (Number(quantidade) * Number(acumulado[papel][antiTipo]['precoMedio'])) - (Number(precoMedio) * Number(quantidade));
                        } else { 
                            lucro = (Number(precoMedio) * Number(quantidade)) - (Number(quantidade) * Number(acumulado[papel][antiTipo]['precoMedio']));
                        }
                        try {
                            irPago = Number(acumulado[papel]['2']['irPago']) + Number(irPago);
                        } catch (ex) {
                            // console.log(ex);
                        }
                        
                        // console.log(`${id}, ${idDarf}, ${tipoDarf}, ${papel}, ${tipo}, ${irPago}, ${quantidade}, ${precoMedio}, ${data}`);
                        darfs[idDarf][tipoDarf]['lucro'] = Number(darfs[idDarf][tipoDarf]['lucro']) + Number(lucro);
                        darfs[idDarf][tipoDarf]['irPago'] = Number(darfs[idDarf][tipoDarf]['irPago']) + Number(irPago);
                        darfs[idDarf][tipoDarf]['operacoes'].push({papel, tipo, irPago, quantidade, precoMedio, lucro});
                        subAcumulado(papel, antiTipo, irPago, quantidade, precoMedio);
                    } else {
                        //Menor quantidade no acúmulo do que na operação
                        let lucro;
                        if (tipo == '1') {
                            lucro = (Number(precoMedio) * Number(Number(acumulado[papel][antiTipo]['quantidade']))) - (Number(Number(acumulado[papel][antiTipo]['quantidade'])) * Number(acumulado[papel][antiTipo]['precoMedio']));
                        } else { 
                            lucro = (Number(quantidade) * Number(acumulado[papel][antiTipo]['precoMedio'])) - (Number(precoMedio) * Number(quantidade));
                        }
                        irPago = Number(acumulado[papel]['2']['irPago']) + Number(irPago);
                        darfs[idDarf][tipoDarf]['lucro'] = Number(darfs[idDarf][tipoDarf]['lucro']) + Number(lucro);
                        darfs[idDarf][tipoDarf]['irPago'] = Number(darfs[idDarf][tipoDarf]['irPago']) + Number(irPago);
                        darfs[idDarf][tipoDarf]['operacoes'].push({papel, tipo, irPago, quantidade, precoMedio, lucro});
                        subAcumulado(papel, antiTipo, 0, Number(acumulado[papel][antiTipo]['quantidade']), Number(precoMedio));
                        addAcumulado(papel, tipo, 0, Number(Number(quantidade) - Number(acumulado[papel][antiTipo]['quantidade'])), Number(precoMedio));
                    }
                }
            });

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
                                darfs[idDaytrade]['daytrade']['lucro'] = Number(darfs[idDaytrade]['daytrade']['lucro']) + lucro;
                                darfs[idDaytrade]['daytrade']['irPago'] = Number(darfs[idDaytrade]['daytrade']['irPago']) + Number(operacoesPorPapelData[data][papel]['2']['irPago']);
                                darfs[idDaytrade]['daytrade']['operacoes'].push({papel, 
                                    'tipo': '2', 
                                    'irPago': Number(operacoesPorPapelData[data][papel]['2']['irPago']), 
                                    'quantidade': Number(operacoesPorPapelData[data][papel]['2']['quantidade']), 
                                    'precoMedio': Number(operacoesPorPapelData[data][papel]['2']['precoMedio']),
                                    lucro
                                });
                            } else {
                                if (operacoesPorPapelData[data][papel]['1']['quantidade'] > operacoesPorPapelData[data][papel]['2']['quantidade']){
                                    //Mais compra do que venda
                                    let lucro =  ( (Number(operacoesPorPapelData[data][papel]['2']['quantidade']) * Number(operacoesPorPapelData[data][papel]['2']['precoMedio'])) - (Number(operacoesPorPapelData[data][papel]['2']['quantidade']) * Number(operacoesPorPapelData[data][papel]['1']['precoMedio'])));
                                    darfs[idDaytrade]['daytrade']['lucro'] = Number(darfs[idDaytrade]['daytrade']['lucro']) + lucro;
                                    darfs[idDaytrade]['daytrade']['irPago'] = Number(darfs[idDaytrade]['daytrade']['irPago']) + Number(operacoesPorPapelData[data][papel]['2']['irPago']);
                                    darfs[idDaytrade]['daytrade']['operacoes'].push({papel, 
                                        'tipo': '2', 
                                        'irPago': Number(operacoesPorPapelData[data][papel]['2']['irPago']), 
                                        'quantidade': Number(operacoesPorPapelData[data][papel]['2']['quantidade']), 
                                        'precoMedio': Number(operacoesPorPapelData[data][papel]['2']['precoMedio']),
                                        lucro
                                    });
                                    if (papel.length > 6) {
                                        trataOperacao(
                                            id, 
                                            'normal', 
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
                                    darfs[idDaytrade]['daytrade']['lucro'] = Number(darfs[idDaytrade]['daytrade']['lucro']) + lucro;
                                    darfs[idDaytrade]['daytrade']['irPago'] = Number(darfs[idDaytrade]['daytrade']['irPago']) + Number(operacoesPorPapelData[data][papel]['2']['irPago']);
                                    darfs[idDaytrade]['daytrade']['operacoes'].push({papel, 
                                        'tipo': '1', 
                                        'irPago': Number(operacoesPorPapelData[data][papel]['2']['irPago']), 
                                        'quantidade': Number(operacoesPorPapelData[data][papel]['1']['quantidade']), 
                                        'precoMedio': Number(operacoesPorPapelData[data][papel]['2']['precoMedio']),
                                        lucro
                                    });
                                    if (papel.length > 6) {
                                        trataOperacao(
                                            id, 
                                            'normal', 
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
                                    trataOperacao(id, 'normal', papel + id, '1', operacoesPorPapelData[data][papel]['1']['irPago'], operacoesPorPapelData[data][papel]['1']['quantidade'], operacoesPorPapelData[data][papel]['1']['precoMedio'], data);
                                } else {
                                    trataOperacao(id, 'normal', papel, '1', operacoesPorPapelData[data][papel]['1']['irPago'], operacoesPorPapelData[data][papel]['1']['quantidade'], operacoesPorPapelData[data][papel]['1']['precoMedio'], data);
                                }
                            }

                            if (operacoesPorPapelData[data][papel]['2'] !== undefined){
                                //Venda
                                //Para opções concatena o ano ao Papel para não confundir com opções de anos diferentes
                                if (papel.length > 6) {
                                    trataOperacao(id, 'normal', papel + id, '2', operacoesPorPapelData[data][papel]['2']['irPago'], operacoesPorPapelData[data][papel]['2']['quantidade'], operacoesPorPapelData[data][papel]['2']['precoMedio'], data);
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

                    if (acumulado[papel]['1'] != undefined && acumulado[papel]['1']['quantidade'] > 0) {
                        let lucro = (Number(acumulado[papel]['1']['quantidade']) * Number(acumulado[papel]['1']['precoMedio']));
                        darfs[id]['normal']['lucro'] = Number(darfs[id]['normal']['lucro']) - lucro;
                        darfs[id]['normal']['operacoes'].push({
                            papel, 
                            'tipo': '1', 
                            'irPago': 0, 
                            'quantidade': acumulado[papel]['1']['quantidade'], 
                            'precoMedio': acumulado[papel]['1']['precoMedio'],
                            lucro
                            });
                    }

                    if (acumulado[papel]['2'] != undefined && acumulado[papel]['2']['quantidade'] > 0) {
                        let lucro = (Number(acumulado[papel]['2']['quantidade']) * Number(acumulado[papel]['2']['precoMedio']));
                        darfs[id]['normal']['lucro'] = Number(darfs[id]['normal']['lucro']) + lucro;
                        darfs[id]['normal']['irPago'] = Number(darfs[id]['normal']['irPago']) + Number(acumulado[papel]['2']['irPago']);
                        darfs[id]['normal']['operacoes'].push({
                            papel, 
                            'tipo': '2', 
                            'irPago': acumulado[papel]['2']['irPago'], 
                            'quantidade': acumulado[papel]['2']['quantidade'], 
                            'precoMedio': acumulado[papel]['2']['precoMedio'],
                            lucro
                            });
                    }
                }
                // acumulado[papel][tipo]['irPago'] = 0
                // acumulado[papel][tipo]['precoMedio'] = 0
                // acumulado[papel][tipo]['quantidade'] = 0
            }

            var count = 0;
            var darfsArr = new Array();
            var keyAnt = ''

            for (var key in darfs) {
                const trataCalculo = ((tipoDarf) => {
                    if (keyAnt == '' || darfs[keyAnt][tipoDarf]['saldo'] >= 0){
                        darfs[key][tipoDarf]['saldo'] = Number(darfs[key][tipoDarf]['lucro']);
                        darfs[key][tipoDarf]['irSaldo'] = Number(darfs[key][tipoDarf]['irPago']);
                    } else {
                        darfs[key][tipoDarf]['saldo'] = Number(darfs[keyAnt][tipoDarf]['saldo']) + Number(darfs[key][tipoDarf]['lucro'])
                        darfs[key][tipoDarf]['irSaldo'] = Number(darfs[keyAnt][tipoDarf]['irSaldo']) + Number(darfs[key][tipoDarf]['irPago'])
                    }
                    // if (keyAnt != '' && darfs[keyAnt][tipoDarf]['valor'] < 0){
                    //     darfs[key][tipoDarf]['irSaldo'] = Number(darfs[key][tipoDarf]['irSaldo']) - Number(darfs[keyAnt][tipoDarf]['valor']);
                    // }
                    if (Number(darfs[key][tipoDarf]['saldo']) > 0) {
                        let aliquota = (tipoDarf == 'normal') ? aliquotaNormal : ((tipoDarf == 'daytrade') ? aliquotaDaytrade : aliquotaFii);
                        darfs[key][tipoDarf]['valor'] = Number(darfs[key][tipoDarf]['saldo'])*aliquota - Number(darfs[key][tipoDarf]['irSaldo'])
                    }
                })

                trataCalculo('normal');
                trataCalculo('daytrade');
                trataCalculo('fii');

                darfs[key]['valorDevido'] = Number(darfs[key]['normal']['valor']) + Number(darfs[key]['daytrade']['valor']) + Number(darfs[key]['fii']['valor'])
                darfsArr.push(darfs[key])
                count++;
                keyAnt = key;
            }

            response.header('X-Total-Count', count);

            return response.json(darfsArr);
        });
    },
}