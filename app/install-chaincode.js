'use strict';
var path = require('path');
var fs = require('fs');
var util = require('util');
var config = require('../config.json');
var utils = require('./utils.js');
var logger = utils.getLogger('Cievus-Invoice-App:[install-chaincode.js]');
var tx_id = null;

// Install a chaincode
var installChaincode = async function (peers, chaincodeName, chaincodePath, chaincodeVersion, chaincodeType, username, org_name) {
	logger.debug('\n\n============ Install chaincode on organizations ============\n');
	utils.setupChaincodeDeploy();
	let error_message = null;
	try {
		// first setup the client for this org
		var client = await utils.getClientForOrg(org_name, username);
		logger.debug('Successfully got the fabric client for the organization "%s"', org_name);

		tx_id = client.newTransactionID(true); //get an admin transactionID
		var request = {
			targets: peers,
			chaincodePath: chaincodePath,
			chaincodeId: chaincodeName,
			chaincodeVersion: chaincodeVersion,
			chaincodeType: chaincodeType
		};
		let results = await client.installChaincode(request);
		var proposalResponses = results[0];
		var proposal = results[1];

		var all_good = true;
		for (var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response &&
				proposalResponses[i].response.status === 200) {
				one_good = true;
				logger.info('install proposal was good');
			} else {
				logger.error('install proposal was bad %j', proposalResponses.toJSON());
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			logger.info('Successfully sent install Proposal and received ProposalResponse');
		} else {
			error_message = 'Failed to send install Proposal or receive valid response. Response null or status is not 200'
			logger.error(error_message);
		}
	} catch (error) {
		logger.error('Failed to install due to error: ' + error.stack ? error.stack : error);
		error_message = error.toString();
	}

	if (!error_message) {
		let message = util.format('Successfully install chaincode');
		logger.info(message);
		// build a response to send back to the REST caller
		let response = {
			success: true,
			message: message
		};
		return response;
	} else {
		let message = util.format('Failed to install due to:%s', error_message);
		logger.error(message);
		throw new Error(message);
	}
};
exports.installChaincode = installChaincode;