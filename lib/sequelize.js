'use strict';

const Joi = require('joi');
const Hoek = require('hoek');
const Sequelize = require('sequelize');
const Glob = require('glob');

const internals = {
	defaults: {
		pool: {
			max: 5,
			min: 0,
			idle: 10000,
		},
		logging: false,
	},
};

internals.schema = Joi.object({
	database: Joi.string().required(),
	username: Joi.string().required(),
	password: Joi.string().required(),
	host: Joi.string().required(),
	port: Joi.number().required(),
	dialect: Joi.string(),
	pool: Joi.object(),
	logging: Joi.any(),
}).required().label('options');

exports.register = function (server, options, next) {
	const settings = Hoek.applyToDefaults(internals.defaults, options);
	Joi.assert(settings, internals.schema, 'Invalid options');

	server.ext('onPreHandler', internals.pagination);

	const db = {};
	const sequelize = new Sequelize(settings.database, settings.username, settings.password, {
		host: settings.host,
		port: settings.port,
		dialect: settings.dialect,
		pool: settings.pool,
		logging: settings.logging,
		dialectOptions: {
			multipleStatements: true,
		},
		define: {
			paranoid: true,
			instanceMethods: {
				jsonApiAttributes: function () {
					return this.$options.attributes.filter(function (i) {
						return i !== 'id';
					});
				},
			},
		},
	});

	const models = Glob.sync('models/*.js');
	models.forEach(function (file) {
		const model = sequelize.import('../' + file);
		db[model.name] = model;
	});

	Object.keys(db).forEach((modelName) => {
		if ('associate' in db[modelName]) {
			db[modelName].associate(db);
		}
	});

	sequelize.authenticate().then(() => {
		sequelize.sync().then(() => {
			db.sequelize = sequelize;
			server.expose('db', db);
			return next();
		})
	});
};

internals.pagination = function (request, reply) {
	const page = request.query.page || 1; // page number
	const size = request.query.size || 20; // page size

	const skip = page * size - size; // page === 1 ? skip = 0

	request.app.pagination = {
		limit: size,
		offset: skip,
	};

	return reply.continue();
};

exports.register.attributes = {
	name: 'sequelize',
};
