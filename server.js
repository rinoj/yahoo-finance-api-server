const PricingData = require('./PricingData_pb')
const WebSocket = require('ws')
const http = require('http');
const url = require('url');
const axios = require('axios');
const mysql = require('mysql');

const ws = new WebSocket('wss://streamer.finance.yahoo.com/');



var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "webtrader"
});

con.connect(function(err) {
  console.log('DB Connected');
});


// // Start the server at port 8080
// var server = http.createServer(function(req, res){ 

//   // Send HTML headers and message
//   res.writeHead(200,{ 'Content-Type': 'text/html' }); 
//   res.end('<h1>Hello Socket Lover!</h1>');
// });
// server.listen(8080);

ws.on('open', function open() {
  console.log('Web Socket Connected to Yahoo API');
  ws.send('{"subscribe":["BTC-USD","ETH-USD","XRP-USD","USDT-USD","BCH-USD","BA","TSLA","AXSM","UBER","MIRM","GRKZF","SCGPY","BDVSF","WPX","BIPSX","ENPIX","ENPSX","BPTUX","BPTIX","CL=F","GC=F","SI=F","EURUSD=X","GBPUSD=X","JPY=X","EZA","IXC","IYE","FILL","EWT","CGIX1191220P00005000","TORC191220P00002500","RIOT191213C00001000","TPCO191220C00002500","DHR","AMRN","AMD","PCG","VIX191218P00012500","VIX191218P00014000","EEM191220P00039000","EEM200117C00045000","BTCUSD=X","ETHUSD=X","AUDUSD=X","NZDUSD=X","EURJPY=X","GBPJPY=X","EURGBP=X","EURCAD=X","EURSEK=X","EURCHF=X","EURHUF=X","CNY=X","HKD=X","SGD=X","INR=X","MXN=X","PHP=X","IDR=X","THB=X","MYR=X","ZAR=X","RUB=X","ZG=F","ZI=F","PL=F","HG=F","PA=F","HO=F","NG=F","RB=F","BZ=F","B0=F","C=F","O=F","KW=F","RR=F","SM=F","BO=F","S=F","FC=F","LH=F","LC=F","CC=F","KC=F","CT=F","LB=F","OJ=F","SB=F","IFF","CRS","RLLCF","BGNE","^GSPC","^DJI","^IXIC","^RUT","^TNX","^VIX","^CMC200","^FTSE","^N225"]}');
});

ws.on('close', function close() {
  console.log('disconnected');
});

function base64ToBytesArr(str) {
    const abc = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"]; // base64 alphabet
    let result = [];
  
    for(let i=0; i<str.length/4; i++) {
      let chunk = [...str.slice(4*i,4*i+4)]
      let bin = chunk.map(x=> abc.indexOf(x).toString(2).padStart(6,0)).join(''); 
      let bytes = bin.match(/.{1,8}/g).map(x=> +('0b'+x));
      result.push(...bytes.slice(0,3 - (str[4*i+2]=="=") - (str[4*i+3]=="=")));
    }
  return result;
}

var server = http.createServer(function(req, res){ 
  res.writeHead(200,{ 'Content-Type': 'application/json' }); 
  res.end(JSON.stringify(myObj));
})

const wss = new WebSocket.Server({ server });


ws.on('message', function incoming(data, flags) {
    var buf = base64ToBytesArr(data)    
    var message = proto.PricingData.deserializeBinary(buf)
    myObj = {
      "id": message.getId(),
      "exchange": message.getExchange(),
      "quoteType": message.getQuotetype(),
      "price": message.getPrice(),
	  "ask": message.getAsk(),
	  "bid": message.getBidsize(),
      "timestamp": message.getTime(),
      "marketHours": message.getMarkethours(),
      "changePercent": message.getChangepercent(),
      "dayVolume": message.getDayvolume(),
      "change": message.getChange(),
      "priceHint": message.getPricehint()
    }
	
    con.query("SELECT * FROM trades", function (err, result, fields) {
      if (err) throw err;
		for (i = 0; i < result.length; i++) {
			if(result[i].closedprice == null){
				if(result[i].code === myObj.id){
					
					if(myObj.ask){
						console.log(myObj.ask);
					}	
				 	console.log('(tid: '+result[i].id +') '
					+ myObj.id + ' | Open:' 
					+ result[i].openprice.toFixed(5) + ' | Realtime: ' 
					+ myObj.price.toFixed(5) 
					+ '| TP: ' + result[i].takeprofit 
					+' | SL:' + result[i].stoploss
					+' | ASK:' + myObj.ask); 
					
					//0 - sell | 1 - buy
					if(result[i].buysell == 1)
					{
						if(result[i].takeprofit != null && result[i].takeprofit >= myObj.price.toFixed(5)){
							console.log('takeprofit triggered for BUY');
							axios.post('http://localhost:8000/api/closetrade', {
								tradeid: result[i].id,
							});
						}
						if(result[i].stoploss != null && result[i].stoploss <= myObj.price.toFixed(5)){
							console.log('stoploss triggered for BUY');
							axios.post('http://localhost:8000/api/closetrade', {
								tradeid: result[i].id,
							});
						}
						
					}
					else if(result[i].buysell == 0)
					{
						if(result[i].takeprofit != null && result[i].takeprofit <= myObj.price.toFixed(5)){
							console.log('takeprofit triggered for BUY');
							axios.post('http://localhost:8000/api/closetrade', {
								tradeid: result[i].id,
							});
						}
						if(result[i].stoploss != null && result[i].stoploss >= myObj.price.toFixed(5)){
							console.log('stoploss triggered for BUY');
							axios.post('http://localhost:8000/api/closetrade', {
								tradeid: result[i].id,
							});
						}
					}
					
					
					if(result[i].openprice == myObj.price.toFixed(3)){
					  console.log(result[i].code + ' '  + result[i].openprice + ' ' + myObj.id +  ' ' + myObj.price.toFixed(5));
					}
				}
			}
		}
    });
    wss.on('connection', function connection(ws) {
		setInterval(function(){ws.send(JSON.stringify(myObj));}, 1000);
    });
});

server.listen(8080);