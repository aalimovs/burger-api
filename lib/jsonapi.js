'use strict';

const Url = require('url');
const Hoek = require('hoek');
const Joi = require('joi');
const JSONAPISerializer = require('jsonapi-serializer').Serializer;

const internals = {};

internals.jsonapiLink = [
	Joi.string().uri().required(),
	Joi.object({
		href: Joi.string().uri().required(),
		meta: Joi.object().required(),
	}),
];

internals.jsonapiResource = Joi.object({
	id: Joi.any().required(),
	type: Joi.string().required(),
	attributes: Joi.object(),
	relationships: Joi.object(),
	links: Joi.object(),
	meta: Joi.object(),
}).required();

internals.jsonapiResourceIdentifier = Joi.object({
	id: Joi.any().required(),
	type: Joi.string().required(),
	meta: Joi.object(),
}).required();

internals.jsonapiData = [
	internals.jsonapiResource,
	internals.jsonapiResourceIdentifier,
	Joi.array(0),
	Joi.array().items(internals.jsonapiResource),
	Joi.array().items(internals.jsonapiResourceIdentifier),
];

internals.jsonapiRelationship = Joi.object({
	links: Joi.object(),
	data: internals.jsonapiData,
	meta: Joi.object(),
});

internals.jsonapiError = Joi.object({
	id: Joi.any(),
	links: Joi.object({ about: internals.jsonapiLink }),
	status: Joi.string(),
	code: Joi.string(),
	title: Joi.string(),
	detail: Joi.string(),
	source: Joi.object({
		pointer: Joi.string(),
		parameter: Joi.string(),
	}),
	meta: Joi.object(),
});

internals.jsonapiDocument = Joi.object({
	data: internals.jsonapiData,
	errors: [internals.jsonapiError],
	meta: Joi.object(),
	jsonapi: Joi.object({
		version: Joi.string(),
		meta: Joi.object(),
	}),
	links: Joi.object(),
	included: Joi.array().items(internals.jsonapiResource),
}).required().xor('data', 'errors');

exports.register = function (server, options, next) {
	internals.options = options || {};
	internals.options.baseUrl = options.baseUrl || server.info.uri;
	internals.options.meta = options.meta || {};

	server.decorate('reply', 'jsonapi', internals.replyJsonapi);
	server.ext('onPreResponse', internals.transformErrors);

	return next();
};

internals.replyJsonapi = function (response, options) {
	options = options || {};

	// Merge plugin meta options and reply meta options
	const meta = Hoek.merge(Hoek.merge({ id: this.request.id }, internals.options.meta), options.meta);

	// Handle empty calls
	if (!response || (Array.isArray(response) && !response.length)) {
		return this
			.response({
				data: [],
				meta: meta,
			})
			.type('application/vnd.api+json');
	}

	// Handle pagination
	if (options.pagination) {
		Hoek.merge(meta, {
			'total-count': options.pagination.count,
			'current-page': (options.pagination.limit + options.pagination.offset) / options.pagination.limit,
			'total-pages': Math.ceil(options.pagination.count / options.pagination.limit),
		});
	}

	// Handle sequelize models
	const sequelizeModel = response[0] || response; // findAll or findOne
	if (sequelizeModel && sequelizeModel.dataValues && sequelizeModel.$modelOptions && sequelizeModel.$modelOptions.sequelize) {
		response = new JSONAPISerializer(sequelizeModel.$modelOptions.name.singular, {
			attributes: sequelizeModel.jsonApiAttributes(),
		}).serialize(response);
	}

	// Handle manual attributes and type
	if (options.type && options.attributes) {
		response = new JSONAPISerializer(options.type, {
			attributes: options.attributes,
		}).serialize(response);
	}

	// Validate response
	return Joi.validate(response, internals.jsonapiDocument, (err) => {
		// Log validation errors, might want to be stricter in production
		if (err) {
			this.request.log(['error', 'jsonapi'], err);
		}

		// Add 'self' reference to links if not already defined
		response.links = Hoek.merge(response.links || {}, { self: this.request.url.href });

		// Create absolute URL using 'baseUrl' when no hostname is found
		Object.keys(response.links).forEach(function (key) {
			response.links[key] = (!Url.parse(response.links[key]).hostname) ?
				Url.resolve(internals.options.baseUrl, response.links[key]) :
				response.links[key];
		});

		// Add meta
		Hoek.merge(response, { meta: meta });

		return this
			.response(response)
			.type('application/vnd.api+json');
	});
};

internals.transformErrors = function (request, reply) {
	const response = request.response;

	if (response.isBoom) {
		const error = {
			title: response.output.payload.error,
			status: response.output.statusCode.toString(),
			detail: response.output.payload.message,
		};
		response.output.payload = {
			errors: [error],
			meta: Hoek.merge({ id: request.id }, internals.options.meta),
		};
		response.output.headers['content-type'] = 'application/vnd.api+json';
	}

	return reply.continue();
};

exports.register.attributes = {
	name: 'jsonapi',
};
