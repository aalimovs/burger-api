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
	}, {
		method: 'POST',
		path: '/places',
		config: internals.handlers.createPlace,
	}, {
		method: 'DELETE',
		path: '/places/{id}',
		config: internals.handlers.deletePlace,
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
			order: '"createdAt" DESC',
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
	description: 'Get a place by id',
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

internals.handlers.createPlace = {
	tags: ['api'],
	description: 'Add a new place',
	notes: 'Adds a new place with the attributes passed in the body',
	plugins: {
		'hapi-swagger': {
			responses: {
				204: { description: 'Success' },
				400: { description: 'Bad Request' },
			},
		},
	},
	validate: {
		payload: {
			data: Joi.object().keys({
				type: Joi.string(),
				attributes: Joi.object().keys({
					name: Joi.string().required().example('Best Burgers').description('name of the place'),
					location: Joi.string().required().example('56.960725,24.172814').description('location of the place'),
				}),
			}),
		},
	},
	handler: function (request, reply) {
		const options = {
			name: request.payload.name,
			location: request.payload.location,
		};

		request.server.plugins.sequelize.db.Place.create(options)
			.then((place) => {
				if (!place) {
					return reply(reply(Boom.badImplementation('failed to create a new place')));
				}
				return reply().code(204);
			})
			.catch((error) => reply(Boom.badImplementation(error)));
	},
};

internals.handlers.deletePlace = {
	tags: ['api'],
	description: 'Deletes a place',
	notes: 'Deletes a place by the id passed in the path',
	plugins: {
		'hapi-swagger': {
			responses: {
				204: { description: 'Success' },
				404: { description: 'Not Found' },
				400: { description: 'Bad Request' },
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
				place.destroy().then(() => reply().code(204));
			})
			.catch((error) => reply(Boom.badImplementation(error)));
	},
};

exports.register.attributes = {
	name: 'routes-places',
};
