const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const csv_parse = require('csv-parse/lib/sync');
const connection = require('../database/connection');

const url = 'https://arquivos.b3.com.br/Web/Consolidated?lang=pt';
const downloadFolder = path.join(path.resolve(), "src/files");

//Cria o diretorio de download
if (!fs.existsSync(downloadFolder)){
    fs.mkdirSync(downloadFolder);
}

const formataData = (data) => {
    let dataFormatada = data.toISOString().substring(0, 10)
    return dataFormatada;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function stockFromFile(file, stock) {
    //Deleta os dados da tabela
    var fileContent = fs.readFileSync( file );
    let stocks = csv_parse(fileContent, { columns: true, delimiter: ';', skip_empty_lines: true })

    for (var i=0; i<stocks.length; i++){
        if (stock == stocks[i].TckrSymb) {
            return stocks[i];
        }
    }
}

async function downloadFile(dataOperacao) {
    try {
        console.info(`Buscando arquivo B3 com data ${dataOperacao.toISOString()}`);
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.goto(url, {
            waitUntil: 'networkidle2',
          });
        await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: downloadFolder});
        // await page.waitForTimeout(5000);

        //Pega o primeiro cartão
        const divsCard = (await page.$$('div.card'));
        //Pega a data
        if (divsCard === undefined || divsCard.length == 0) {
            console.error("divsCard vazio - Falha ao acessar a página da B3 '" + divsCard.length + "'");
            return undefined;
        }

        for (var j=0; j<divsCard.length; j++){
            const strData = await (await (await divsCard[j].$$('a > div > div > div'))[0].getProperty('textContent')).jsonValue();
            const dia = Number(strData.substring(0,2)),
                  mes = Number(strData.substring(3,5))-1,
                  ano = Number(strData.substring(6));
            const data = new Date (ano, mes, dia);

            if (data.getTime() == dataOperacao.getTime()) { 
                //Expandir o cartão com o link
                const linkDiv = await divsCard[j].$$('a')

                //Realiza o download
                const divs = await divsCard[j].$$('div#collapse');
                for (var i=0; i<divs.length; i++){
                    const ps = await divs[i].$$('div > div > div > div > div.content > p');
                    const label = await (await ps[0].getProperty('textContent')).jsonValue();
                    if (label == 'Cadastro de Instrumentos (Listado)' || 
                        label == 'Negócios Consolidados do Pregão (Listado)'){
                        const links = await ps[1].$$('a')
                        const boxModel = await links[0].boxModel();

                        if (boxModel == null) {
                            linkDiv[0].click({ clickCount: 1, delay: 100 });
                            console.log("Open Card Click");
                            await page.waitForTimeout(1000);
                        }

                        await links[0].click({ clickCount: 1, delay: 100 });
                        console.info(`Baixando o arquivo com data ${strData}`);
                        //Aguarda os downloads finalizarem
                        await page.waitForTimeout(6000);
                    }
                }
            } 
        }

        await browser.close();
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

function indexInArray(array, string){
    for (var i=0; i<array.length; i++){
        if (array[i].indexOf(string) > -1){
            return i
        }
    }
    return -1
}

async function calculateExpirationDate(opcao, dataOperacao){
    //Carrega configurações das opções
    // Consulta a tabela de opções
    const confOpcoes = await connection('conf_opcoes')
    .select([
        'conf_opcoes.*'
    ]);

    var opcoes = new Object();
    for (var i=0; i<confOpcoes.length; i++) {
        opcoes[confOpcoes[i].id] = confOpcoes[i].mes_ref;
    };

    const mesExercicio = opcoes[opcao[4]];
    var anoExercicio = 0;
    if ((dataOperacao.getMonth()+1) <= mesExercicio) {
        anoExercicio = dataOperacao.getFullYear();
    } else {
        anoExercicio = dataOperacao.getFullYear() +1;
    }
    const diaExercicio = getThirdMondayDay(anoExercicio, mesExercicio);

    return new Date (anoExercicio, mesExercicio-1, diaExercicio);
}

module.exports.getThirdMondayDay = getThirdMondayDay;
function getThirdMondayDay(year, month) {
    var d = new Date(year, month-1)

    d.setDate(1);

    // Get the first Monday in the month
    while (d.getDay() !== 1) {
        d.setDate(d.getDate() + 1);
    }

    return d.getDate() + 14;
}

module.exports.getExpirationDate = getExpirationDate;
async function getExpirationDate(opcao, dataOperacao) {
    const fileDateFormat = `${dataOperacao.getFullYear()}${dataOperacao.getMonth()+1}${dataOperacao.getDate()}`
    let files = fs.readdirSync(downloadFolder);
    let indexArray = indexInArray(files, fileDateFormat);
    if (indexArray < 0){
        await downloadFile(dataOperacao)
        console.log("File downloaded");
        files = fs.readdirSync(downloadFolder);
        indexArray = indexInArray(files, fileDateFormat);
    }

    if (indexArray < 0){
        console.log("Sem arquivos");
        const dataCalculada = calculateExpirationDate(opcao, dataOperacao)
        console.log(dataCalculada);
        return dataCalculada;
    } else {
        const filename = files[indexArray];
        const stockData = await stockFromFile(path.join(downloadFolder, filename), opcao);

        // //Deleta os arquivos da pasta
        // files.forEach(file => {
        //     fs.unlinkSync(path.join(downloadFolder, file));
        // });
        if (stockData !== undefined){
            console.log(`Com dado no arquivo - ${stockData.XprtnDt}`);
            return new Date(Number(stockData.XprtnDt.substring(0,4)), Number(stockData.XprtnDt.substring(5,7))-1, Number(stockData.XprtnDt.substring(8)));
        } else {
            console.log("Sem dados da ação no arquivo");
            const dataCalculada = calculateExpirationDate(opcao, dataOperacao)
            console.log(dataCalculada);
            return dataCalculada;
        }
    }
}

module.exports.listFiles = listFiles;
function listFiles(){
    return fs.readdirSync(downloadFolder);
}

module.exports.getStockInfo = stockInfo;
async function stockInfo(papel, data){
    // Arquivo com as informações do papel
    const fileDateFormat = `InstrumentsConsolidatedFile_${formataData(data).split('-').join("")}`
    let stock = {};
    stock.papel = papel;
    let files = fs.readdirSync(downloadFolder);
    let indexArray = indexInArray(files, fileDateFormat);
    if (indexArray < 0){
        await downloadFile(data)
        console.log("File downloaded");
        files = fs.readdirSync(downloadFolder);
        indexArray = indexInArray(files, fileDateFormat);
    }

    if (indexArray < 0){
        console.log("Sem arquivos");
        stock.categoryName = "";
        stock.vencimento = "";
        stock.cotacao = 0
    } else {
        let filename = files[indexArray];
        let stockData = await stockFromFile(path.join(downloadFolder, filename), papel);

        if (stockData !== undefined){
            console.log(`Com dado no arquivo - ${stockData.XprtnDt}`);
            if (stockData.XprtnDt == "") {
                stock.vencimento  = ""
            } else {    
                stock.vencimento = new Date(Number(stockData.XprtnDt.substring(0,4)), Number(stockData.XprtnDt.substring(5,7))-1, Number(stockData.XprtnDt.substring(8)));
            }
            stock.categoryName = stockData.SctyCtgyNm;
        } else {
            console.log("Sem dados da ação no arquivo");
            let dataCalculada = "";
            if (papel.length > 6) {
                dataCalculada = calculateExpirationDate(papel, data);
            }
            stock.categoryName = "";
            stock.vencimento = dataCalculada;
        }

        // Arquivo com as cotações
        const fileDateFormat = `TradeInformationConsolidatedFile_${formataData(data).split('-').join("")}`
        files = fs.readdirSync(downloadFolder);
        indexArray = indexInArray(files, fileDateFormat);
        if (indexArray < 0){
            await downloadFile(data)
            console.log("File downloaded");
            files = fs.readdirSync(downloadFolder);
            indexArray = indexInArray(files, fileDateFormat);
        }

        if (indexArray < 0){
            console.log("Sem arquivos cotação");
            stock.cotacao = 0
        } else {
            filename = files[indexArray];
            stockData = await stockFromFile(path.join(downloadFolder, filename), papel);

            if (stockData !== undefined){
                stock.cotacao = parseFloat(stockData.LastPric.replace(',', '.'));
            } else {
                console.log("Sem dados da ação no arquivo de cotação");
                stock.cotacao = 0;
            }
        }
    }

    return stock;
}