'use strict';

require('dotenv').config();

const Hapi = require('hapi');

// Create a server with a host and port
const server = new Hapi.Server({});

server.connection({
	port: process.env.WEB_PORT,
	routes: {
		cors: true,
	},
});

const options = {
	sequelize: {
		host: process.env.SEQUELIZE_HOST,
		username: process.env.SEQUELIZE_USER,
		password: process.env.SEQUELIZE_PASSWORD,
		port: process.env.SEQUELIZE_PORT,
		database: process.env.SEQUELIZE_DATABASE,
		dialect: process.env.SEQUELIZE_DIALECT,
	},
	hapiSwagger: {
		info: {
			title: 'Burger API Documentation',
			version: require('./package').version,
		},
	},
};

// Load plugins and start server
server.register([
	{ register: require('./lib/sequelize'), options: options.sequelize },

	{ register: require('hapi-swagger'), options: options.hapiSwagger },
	{ register: require('inert') },
	{ register: require('vision') },
], (error) => {
	if (error) {
		throw error;
	}

	// Start the server
	server.start((error) => {
		if (error) {
			throw error;
		}
		console.log('info', { msg: 'Server running at: ' + server.info.uri });
	});

	server.on('request', function (request, event, tags) {
		console.log('request', event);
	});

	server.on('request-error', function (request, error) {
		console.log('request-error', { msg: error.message, req_id: request.id, stack: error.stack, error: error });
	});

	server.on('response', function (request) {
		console.log('response', { msg: 'response sent for request: ' + request.id });
	});
});
