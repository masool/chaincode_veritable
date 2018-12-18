'use strict';
var express = require('express');
var fs = require('fs');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
var cors = require('cors');

require('./config.js');
var hfc = require('fabric-client');

var utils = require('./app/utils.js');
var createChannel = require('./app/create-channel.js');
var join = require('./app/join-channel.js');
var install = require('./app/install-chaincode.js');
var instantiate = require('./app/instantiate-chaincode.js');
var upgrade= require('./app/upgrade-chaincode.js');
var invoke = require('./app/invoke-transaction.js');
var query = require('./app/query.js');
var host = process.env.HOST || hfc.getConfigSetting('host');
var port = process.env.PORT || hfc.getConfigSetting('port');


var log4js = require('log4js');
var logger = log4js.getLogger('Cievus-Invoice-App:[app.js]');
log4js.configure({
	appenders: {
		allLogs: {
			type: 'file',
			filename: 'logs/all_log.log'
		},
		specialLogs: {
			type: 'file',
			filename: 'logs/special_log.log'
		},
		console: {
			type: 'console'
		}
	},
	categories: {
		write: {
			appenders: ['specialLogs'],
			level: 'info'
		},
		default: {
			appenders: ['console', 'allLogs'],
			level: 'trace'
		}
	}
});

const baseurl = "/api/v1";

//********************** SET CONFIGURATONS *******************************

app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
	extended: false
}));
// set secret variable
app.set('secret', 'C!3VU$tokenSecret');
app.use(expressJWT({
	secret: 'C!3VU$tokenSecret'
}).unless({
	path: [baseurl+'/enroll_users',baseurl+'/newAffiliation']
}));
app.use(bearerToken());
app.use(function (err, req, res, next) {
	console.log("err>>>.." + err);
	if (err.name === 'UnauthorizedError') {
		res.status(401).send({
			"success": "false",
			"message": "Invalid Token"
		});
	}
});
app.use(function (req, res, next) {
	logger.debug(' New request for %s', req.originalUrl);
	if (req.originalUrl.indexOf(baseurl+'/enroll_users') >= 0) {
		return next();
	}
	if (req.originalUrl.indexOf(baseurl+'/newAffiliation') >= 0) {
		return next();
	}
	var token = req.token;
	jwt.verify(token, app.get('secret'), function (err, decoded) {
		if (err) {
			res.send({
				success: false,
				message: 'Failed to authenticate token. Make sure to include the ' +
					'token returned from /api/v1/enroll_users call in the authorization header ' +
					' as a Bearer token'
			});
			return;
		} else {
			// add the decoded user name and org name to the request object
			// for the downstream code to use
			req.username = decoded.username;
			req.orgname = decoded.orgName;
			logger.debug(util.format('Decoded from JWT token: username - %s, orgname - %s', decoded.username, decoded.orgName));
			return next();
		}
	});
});


//************************ START SERVER *******************************

var server = http.createServer(app).listen(port, function () {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  http://%s:%s  ******************', host, port);
server.timeout = 240000;

function getErrorMessage(field) {
	var response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}



//******************* REST ENDPOINTS START HERE *****************************

// Register and enroll user
app.post(baseurl+'/enroll_users', async function (req, res) {
	try {
		var username = req.body.username;
		var orgName = req.body.orgName;
		if (!username) {
			res.json(getErrorMessage('\'username\''));
			return;
		}
		if (!orgName) {
			res.json(getErrorMessage('\'orgName\''));
			return;
		}
		var token = jwt.sign({
			exp: Math.floor(Date.now() / 1000) + parseInt(hfc.getConfigSetting('jwt_expiretime')),
			username: username,
			orgName: orgName
		}, app.get('secret'));
		let response = await utils.enrollInitUser(username, orgName, true);
		if (response && typeof response !== 'string') {
			logger.debug('Successfully registered the username %s for organization %s', username, orgName);
			response.token = token;
			res.json(response);
		} else {
			logger.debug('Failed to register the username %s for organization %s with::%s', username, orgName, response);
			res.json({
				success: false,
				message: response
			});
		}
	} catch (e) {
		res.json({
			success: false,
			message: e.toString()
		});
	}

});

// Create Channel
app.post(baseurl+'/create_channels', async function (req, res) {
	logger.info('<<<<<<<<<<<<<<<<< C R E A T E  C H A N N E L >>>>>>>>>>>>>>>>>');
	logger.debug('End point : /api/v1/create_channels');
	var channelName = req.body.channelName;
	var channelConfigPath = req.body.channelConfigPath;
	logger.debug('Channel name : ' + channelName);
	logger.debug('channelConfigPath : ' + channelConfigPath); //../artifacts/channel/mychannel.tx
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!channelConfigPath) {
		res.json(getErrorMessage('\'channelConfigPath\''));
		return;
	}

	let message = await createChannel.createChannel(channelName, channelConfigPath, req.username, req.orgname);
	res.send(message);
});
// Join Channel
app.post(baseurl+'/join_channels/:channelName/peers', async function (req, res) {
	logger.info('<<<<<<<<<<<<<<<<< J O I N  C H A N N E L >>>>>>>>>>>>>>>>>');
	var channelName = req.params.channelName;
	var peers = req.body.peers;
	logger.debug('channelName : ' + channelName);
	logger.debug('peers : ' + peers);
	logger.debug('username :' + req.username);
	logger.debug('orgname:' + req.orgname);

	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}

	let message = await join.joinChannel(channelName, peers, req.username, req.orgname);
	res.send(message);
});
// Install chaincode on target peers
app.post(baseurl+'/install_chaincodes', async function (req, res) {
	logger.debug('==================== INSTALL CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodePath = req.body.chaincodePath;
	var chaincodeVersion = req.body.chaincodeVersion;
	var chaincodeType = req.body.chaincodeType;
	logger.debug('peers : ' + peers); // target peers list
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodePath  : ' + chaincodePath);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	if (!peers || peers.length == 0) {
		res.json(getErrorMessage('\'peers\''));
		return;
	}
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodePath) {
		res.json(getErrorMessage('\'chaincodePath\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	let message = await install.installChaincode(peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, req.username, req.orgname)
	res.send(message);
});
// Instantiate chaincode on target peers
app.post(baseurl+'/instantiate_chaincode/:channelName/chaincodes', async function (req, res) {
	logger.debug('==================== INSTANTIATE CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodeVersion = req.body.chaincodeVersion;
	var channelName = req.params.channelName;
	var chaincodeType = req.body.chaincodeType;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await instantiate.instantiateChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
	res.send(message);
});

// Upgrade chaincode on target peers
app.post(baseurl+'/upgrade_chaincode/:channelName/chaincodes', async function (req, res) {
	logger.debug('==================== UPGRADE CHAINCODE ==================');
	var peers = req.body.peers;
	var chaincodeName = req.body.chaincodeName;
	var chaincodeVersion = req.body.chaincodeVersion;
	var channelName = req.params.channelName;
	var chaincodeType = req.body.chaincodeType;
	var fcn = req.body.fcn;
	var args = req.body.args;
	logger.debug('peers  : ' + peers);
	logger.debug('channelName  : ' + channelName);
	logger.debug('chaincodeName : ' + chaincodeName);
	logger.debug('chaincodeVersion  : ' + chaincodeVersion);
	logger.debug('chaincodeType  : ' + chaincodeType);
	logger.debug('fcn  : ' + fcn);
	logger.debug('args  : ' + args);
	if (!chaincodeName) {
		res.json(getErrorMessage('\'chaincodeName\''));
		return;
	}
	if (!chaincodeVersion) {
		res.json(getErrorMessage('\'chaincodeVersion\''));
		return;
	}
	if (!channelName) {
		res.json(getErrorMessage('\'channelName\''));
		return;
	}
	if (!chaincodeType) {
		res.json(getErrorMessage('\'chaincodeType\''));
		return;
	}
	if (!args) {
		res.json(getErrorMessage('\'args\''));
		return;
	}

	let message = await upgrade.upgradeChaincode(peers, channelName, chaincodeName, chaincodeVersion, chaincodeType, fcn, args, req.username, req.orgname);
	res.send(message);
});
// ************************************************************************************
// *****************************SmartContract Endpoints********************************
// ************************************************************************************

// Invoke Transaction:- Create new Invoice
app.post(baseurl+'/create_invoice', async function (req, res) {
	logger.debug('====================Create Invoice ==================');
	var peers = "peer1.buyer.cievus.com";
	var chaincodeName = "invoice";
	var channelName = "cievuschannel";
	var fcn = "createInvoice";
	var args = req.body.args;
	var username = req.username;
	var orgname = req.orgname;
	console.log(args);
	try {
		let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgname);
		res.send(message);
	} catch (err) {
		logger.info(err);
		var response = err.toString();
		res.send(response);
	}

});

// Invoke Transaction:- Upadte Invoice
app.post(baseurl+'/update_invoice', async function (req, res) {
	logger.debug('====================Update Invoice ==================');
	var peers = "peer1.buyer.cievus.com";
	var chaincodeName = "invoice";
	var channelName = "cievuschannel";
	var fcn = "updateInvoice";
	var args = req.body.args;
	var username = req.username;
	var orgname = req.orgname;
	try {
		let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgname);
		logger.debug(message);
		res.send(message);
	} catch (err) {
		logger.info(err);
		var response = err.toString();
		res.send(response);
	}
});

// Query:- Get Invoice by Invoice Number
app.get(baseurl+'/get_invoice', async function (req, res) {
	logger.debug('====================Get Invoice ==================');
	var args = [];
	var peer = "peer1.buyer.cievus.com";
	var chaincodeName = "invoice";
	var channelName = "cievuschannel";
	var fcn = "readAInvoice";
	args.push(req.query.invoiceNumber);
	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	logger.debug(message);
	res.send(message);
});

// Query:- Get all invoices 
app.get(baseurl+'/get_All_invoice', async function (req, res) {
	logger.debug('====================Get All Invoice ==================');
	var peer = "peer1.buyer.cievus.com";
	var chaincodeName = "invoice";
	var channelName = "cievuschannel";
	var fcn = "getAllInvoice";
	var args = [];
	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	logger.debug(message);
	res.send(message);
});

// Invoke Transaction:- Delete Invoice by Invoice Number
app.delete(baseurl+'/delete_invoice/:invoiceNumber', async function (req, res) {
	logger.debug('====================Delete Invoice ==================');
	var args = [];
	var peers = "peer1.buyer.cievus.com";
	var chaincodeName = "invoice";
	var channelName = "cievuschannel";
	var fcn = "deleteInvoice";
	args.push(req.params.invoiceNumber);
	var username = req.username;
	var orgname = req.orgname;
	try {
		let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, fcn, args, username, orgname);
		logger.debug(message);
		res.send(message);
	} catch (err) {
		logger.info(err);
		var response = err.toString();
		res.send(response);
	}
});

// Query:- Get all invoice by Org ID
app.get(baseurl+'/get_invoice_By_OrgID/:OrgID', async function (req, res) {
	logger.debug('====================Get Invoice ==================');
	var args = [];
	var peer = "peer1.buyer.cievus.com";
	var chaincodeName = "invoice";
	var channelName = "cievuschannel";
	var fcn = "getInvoiceByOrgID";
	args.push(req.params.OrgID);
	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	logger.debug(message);
	res.send(message);
});

// Query:- Get history of invoice by invoice number
app.get(baseurl+'/get_Invoice_History/:invoiceNumber', async function (req, res) {
	logger.debug('====================Get Invoice History ==================');
	var args = [];
	var peer = "peer1.buyer.cievus.com";
	var chaincodeName = "invoice";
	var channelName = "cievuschannel";
	var fcn = "getInvoiceHistory";
	args.push(req.params.invoiceNumber);
	let message = await query.queryChaincode(peer, channelName, chaincodeName, args, fcn, req.username, req.orgname);
	logger.debug(message);
	res.send(message);
});


app.post(baseurl+'/newAffiliation', async function (req, res) {
	logger.debug('***/newAffiliation***');
	var orgName =req.body.orgName;
	var affliation = req.body.affliation;
	try {
		let message = await utils.createNewAffiliation(orgName, affliation);
		logger.debug(message);
		res.send(message);
	} catch (e) {
		var response = e.toString();
		logger.info(response);
		res.send(response);
	}
});



// ************************************************************************************
// *****************************BlockChain Query Endpoints*****************************
// ************************************************************************************

//Query for Channel Information
app.get(baseurl + '/cievuschannel/info', async function (req, res) {
	console.log('================ QUERY CHANNEL INFORMATION ======================');
	var peer = "peer1.buyer.cievus.com";
	var channelName = "cievuschannel";
	let message = await query.getChainInfo(peer, channelName, req.username, req.orgname);
	res.send(message);
});

//  Query Block by BlockNumber
app.get(baseurl + '/cievuschannel/block_info/:blockId', async function (req, res) {
	console.log('==================== GET BLOCK BY NUMBER ==================');
	let blockId = req.params.blockId;
	let peer = "peer1.buyer.cievus.com";
	var channelName = "cievuschannel";
	if (!blockId) {
		res.json(getErrorMessage('\'blockId\''));
		return;
	}
	let message = await query.getBlockByNumber(peer, channelName, blockId, req.username, req.orgname);
	res.send(message);
});

// Query Transaction by Transaction ID
app.get(baseurl + '/cievuschannel/transaction_info/:trxnId', async function (req, res) {
	console.log('================ GET TRANSACTION BY TRANSACTION_ID ======================');
	let peer = "peer1.buyer.cievus.com";
	var channelName = "cievuschannel";
	let trxnId = req.params.trxnId;
	if (!trxnId) {
		res.json(getErrorMessage('\'trxnId\''));
		return;
	}
	let message = await query.getTransactionByID(peer, channelName, trxnId, req.username, req.orgname);
	console.log(message);
	res.send(message);
});

// Query Block by Hash
app.get(baseurl + '/block/by_hash', async function (req, res) {
	console.log('================ GET BLOCK BY HASH ======================');
	let hash = req.query.hash;
	let peer = "peer1.buyer.cievus.com";
	var channelName = "cievuschannel";
	if (!hash) {
		res.json(getErrorMessage('\'hash\''));
		return;
	}
	let message = await query.getBlockByHash(peer, channelName, hash, req.username, req.orgname);
	res.send(message);
});

//Query for Channel instantiated chaincodes
app.get(baseurl + '/cievuschannel/instantiated_chaincodes', async function (req, res) {
	console.log('============= GET INSTANTIATED CHAINCODES ===================');
	let peer = "peer1.buyer.cievus.com";
	var channelName = "cievuschannel";
	let message = await query.getInstalledChaincodes(peer, channelName, 'instantiated', req.username, req.orgname);
	res.send(message);
});

// Query to fetch all Installed chaincodes
app.get(baseurl + '/cievuschannel/installed_chaincodes', async function (req, res) {
	let peer = "peer1.buyer.cievus.com";
	var channelName = "cievuschannel";
	console.log('================ GET INSTALLED CHAINCODES ======================');
	let message = await query.getInstalledChaincodes(peer, channelName, 'installed', req.username, req.orgname)
	res.send(message);
});

// Query to fetch channels
app.get(baseurl + '/get_channels', async function (req, res) {
	console.log('================ GET CHANNELS ======================');
	let peer = "peer1.buyer.cievus.com";
	if (!peer) {
		res.json(getErrorMessage('\'peer\''));
		return;
	}
	let message = await query.getChannels(peer, req.username, req.orgname);
	res.send(message);
});
