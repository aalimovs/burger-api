'use strict';

const Boom = require('boom');
const Joi = require('joi');

const internals = {
	handlers: {},
};

exports.register = function (server, options, next) {
	server.route([{
		method: 'GET',
		path: '/places',
		config: internals.handlers.getPlaces,
	}, {
		method: 'GET',
		path: '/places/{id}',
		config: internals.handlers.getPlace,
	}]);

	return next();
};

internals.handlers.getPlaces = {
	tags: ['api'],
	description: 'Get a list of places',
	notes: 'Returns a list of places',
	plugins: {
		'hapi-swagger': {
			responses: {
				200: { description: 'Success' },
				400: { description: 'Bad Request' },
			},
		},
	},
	validate: {
		query: {
			page: Joi.number().integer().min(1).max(999999).description('page number'),
			size: Joi.number().integer().min(1).max(100).description('page size'),
		},
	},
	handler: function (request, reply) {
		const options = {
			order: 'createdAt DESC',
		};

		Object.assign(options, request.app.pagination);

		request.server.plugins.sequelize.db.Place.findAndCountAll(options)
			.then((places) => {
				if (!places) {
					return reply(Boom.notFound());
				}
				return reply.jsonapi(places.rows, {
					pagination: {
						count: places.count,
						limit: request.app.pagination.limit,
						offset: request.app.pagination.offset,
					},
				});
			})
			.catch((error) => reply(Boom.badImplementation(error)));
	},
};

internals.handlers.getPlace = {
	tags: ['api'],
	description: 'Get place by id',
	notes: 'Returns a place by the id passed in the path',
	plugins: {
		'hapi-swagger': {
			responses: {
				200: { description: 'Success' },
				400: { description: 'Bad Request' },
				404: { description: 'Not Found' },
			},
		},
	},
	validate: {
		params: {
			id: Joi.number().integer().min(1).description('place id'),
		},
	},
	handler: function (request, reply) {
		request.server.plugins.sequelize.db.Place.findById(request.params.id)
			.then((place) => {
				if (!place) {
					return reply(Boom.notFound());
				}
				return reply.jsonapi(place);
			})
			.catch((error) => reply(Boom.badImplementation(error)));
	},
};

exports.register.attributes = {
	name: 'routes-places',
};
