'use strict';

const Boom = require('boom');
const Moment = require('moment');
const _ = require('lodash');

const internals = {
	handlers: {},
};

exports.register = function (server, options, next) {
	server.route([{
		method: 'GET',
		path: '/posts',
		config: internals.handlers.getPosts,
	}]);

	return next();
};

internals.handlers.getPosts = {
	tags: ['api'],
	description: 'Get a list of posts',
	notes: 'Returns a list of posts',
	plugins: {
		'hapi-swagger': {
			responses: {
				200: { description: 'Success' },
			},
		},
	},
	handler: function (request, reply) {
		request.server.plugins.sequelize.db.Review.findAndCountAll()
			.then((reviews) => {
				if (!reviews) {
					return reply(Boom.notFound());
				}

				const posts = _.chain(reviews.rows)
					.sortBy(function (o) {
						return o.dataValues.createdAt * -1; // sort by createdAt, DESC (latest date on top)
					})
					.groupBy(function (o) {
						return Moment(o.dataValues.createdAt).format('YYYY-MM-DD'); // group by date
					})
					.mapValues(function (o) {
						return _.chain(o)
							.groupBy(function (o) {
								return o.dataValues.item; // group by item id inside each date
							})
					});

				reply(posts);
			})
			.catch((error) => reply(Boom.badImplementation(error)));
	},
};

exports.register.attributes = {
	name: 'routes-posts',
};
