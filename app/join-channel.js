var util = require('util');
var path = require('path');
var fs = require('fs');

var utils = require('./utils.js');
var logger = utils.getLogger('Cievus-Invoice-App:[Join-Channel.js]');


// Join an organization to a channel
var joinChannel = async function (channel_name, peers, username, org_name) {
	logger.debug('\n\n============ Join Channel start ============\n')
	var error_message = null;
	var all_eventhubs = [];
	try {
		// first setup the client for this org
		var client = await utils.getClientForOrg(org_name, username);
		logger.debug('Successfully got the fabric client for the organization "%s"', org_name);
		var channel = client.getChannel(channel_name);
		if (!channel) {
			let message = util.format('Channel %s was not defined in the connection profile', channel_name);
			logger.error(message);
			throw new Error(message);
		}

		let request = {
			txId: client.newTransactionID(true) //get an admin based transactionID
		};
		let genesis_block = await channel.getGenesisBlock(request);

		var promises = [];
		var block_registration_numbers = [];
		let event_hubs = client.getEventHubsForOrg(org_name);
		event_hubs.forEach((eh) => {
			let configBlockPromise = new Promise((resolve, reject) => {
				let event_timeout = setTimeout(() => {
					let message = 'REQUEST_TIMEOUT:' + eh._ep._endpoint.addr;
					logger.error(message);
					eh.disconnect();
					reject(new Error(message));
				}, 240000);
				let block_registration_number = eh.registerBlockEvent((block) => {
					clearTimeout(event_timeout);
					// a peer may have more than one channel so
					// we must check that this block came from the channel we
					// asked the peer to join
					if (block.data.data.length === 1) {
						// Config block must only contain one transaction
						var channel_header = block.data.data[0].payload.header.channel_header;
						if (channel_header.channel_id === channel_name) {
							let message = util.format('EventHub % has reported a block update for channel %s', eh._ep._endpoint.addr, channel_name);
							logger.info(message)
							resolve(message);
						} else {
							let message = util.format('Unknown channel block event received from %s', eh._ep._endpoint.addr);
							logger.error(message);
							reject(new Error(message));
						}
					}
				}, (err) => {
					clearTimeout(event_timeout);
					let message = 'Problem setting up the event hub :' + err.toString();
					logger.error(message);
					reject(new Error(message));
				});
				// save the registration handle so able to deregister
				block_registration_numbers.push(block_registration_number);
				all_eventhubs.push(eh); //save for later so that we can shut it down
			});
			promises.push(configBlockPromise);
			eh.connect(); //this opens the event stream that must be shutdown at some point with a disconnect()
		});

		let join_request = {
			targets: peers, //using the peer names which only is allowed when a connection profile is loaded
			txId: client.newTransactionID(true), //get an admin based transactionID
			block: genesis_block
		};
		let join_promise = channel.joinChannel(join_request);
		promises.push(join_promise);
		let results = await Promise.all(promises);
		logger.debug(util.format('Join Channel RESPONSE : %j', results));

		// lets check the results of sending to the peers which is
		// last in the results array
		let peers_results = results.pop();
		// then each peer results
		for (let i in peers_results) {
			let peer_result = peers_results[i];
			if (peer_result.response && peer_result.response.status == 200) {
				logger.info('Successfully joined peer to the channel %s', channel_name);
			} else {
				let message = util.format('Failed to joined peer to the channel %s', channel_name);
				error_message = message;
				logger.error(message);
			}
		}
		// now see what each of the event hubs reported
		for (let i in results) {
			let event_hub_result = results[i];
			let event_hub = event_hubs[i];
			let block_registration_number = block_registration_numbers[i];
			logger.debug('Event results for event hub :%s', event_hub._ep._endpoint.addr);
			if (typeof event_hub_result === 'string') {
				logger.debug(event_hub_result);
			} else {
				if (!error_message) error_message = event_hub_result.toString();
				logger.debug(event_hub_result.toString());
			}
			event_hub.unregisterBlockEvent(block_registration_number);
		}
	} catch (error) {
		logger.error('Failed to join channel due to error: ' + error.stack ? error.stack : error);
		error_message = error.toString();
	}

	// need to shutdown open event streams
	all_eventhubs.forEach((eh) => {
		eh.disconnect();
	});

	if (!error_message) {
		let message = util.format(
			'Successfully joined peers in organization %s to the channel:%s',
			org_name, channel_name);
		logger.info(message);
		// build a response to send back to the REST caller
		let response = {
			success: true,
			message: message
		};
		return response;
	} else {
		let message = util.format('Failed to join all peers to channel. cause:%s', error_message);
		logger.error(message);
		throw new Error(message);
	}
};
exports.joinChannel = joinChannel;