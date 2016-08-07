'use strict';

const Boom = require('boom');
const Request = require('request');
const Promise = require('bluebird');
const Moment = require('moment');
const _ = require('lodash');

const internals = {
	handlers: {},
};

exports.register = function (server, options, next) {
	server.route([{
		method: 'GET',
		path: '/dev/populate',
		config: internals.handlers.devPopulate,
	}]);

	return next();
};

internals.handlers.devPopulate = {
	tags: ['api'],
	description: 'Populate DB with dev data',
	notes: 'Populates database with dev data',
	plugins: {
		'hapi-swagger': {
			responses: {
				200: { description: 'Success' },
			},
		},
	},
	handler: function (request, reply) {
		const data = {};

		wipeDatabase()
			.then(populateUsers)
			.then(populatePlaces)
			.then(populateItems)
			.then(populateReviews)
			.then(() => {
				reply('Done');
			})
			.catch((error) => {
				if (error.isBoom) {
					return reply(error);
				}
				return reply(Boom.badImplementation(error));
			});

		function wipeDatabase() {
			return new Promise((resolve, reject) => {
				request.server.plugins.sequelize.db.sequelize.sync({ force: true })
					.then(() => resolve())
					.catch((error) => reject(error))
			});
		}

		function populateUsers() {
			return new Promise((resolve, reject) => {
				Request.get('http://uinames.com/api/?amount=200', (error, response, body) => {
					if (error) {
						reject(error);
					}

					data.users = JSON.parse(body).map((o) => {
						return {
							name: o.name,
							email: o.surname + '@gmail.com',
							picture: 'http://loremflickr.com/300/300/person,portrait',
						}
					});

					request.server.plugins.sequelize.db.User.bulkCreate(data.users)
						.then(() => resolve())
						.catch((error) => reject(error));
				})
			});
		}

		function populatePlaces() {
			return new Promise((resolve, reject) => {
				// 20 random restaurant names from https://www.randomlists.com/restaurants
				const placesNames = ['Perkins Restaurant and Bakery', 'Smokey Bones', 'Famous Dave\'s', 'Señor Frog\'s', 'Ruby Tuesday', 'Boston Pizza', 'Chili\'s', 'Ground Round', 'P. F. Chang\'s China Bistro', 'Outback Steakhouse', 'Applebee\'s', 'Benihana', 'Hard Rock Cafe', 'Café Rouge', 'Hoss\'s Steak and Sea House', 'Hooters', 'Bob Evans Restaurants', 'Red Robin', 'Texas Roadhouse', 'Waffle House'];

				data.places = placesNames.map((o) => {
					return {
						name: o,
						locationShort: 'Sydney',
						picture: 'http://loremflickr.com/300/300/restaurant,building',
					};
				});

				request.server.plugins.sequelize.db.Place.bulkCreate(data.places)
					.then(() => resolve())
					.catch((error) => reject(error));
			});
		}

		function populateItems() {
			return new Promise((resolve, reject) => {
				// 100 random words from https://www.randomlists.com/random-words
				const itemsNames = ['Brick', 'Dusty', 'Mindless', 'Quirky', 'Glue', 'Fanatical', 'Erratic', 'Flower', 'Clean', 'Depend', 'Soothe', 'Memorise', 'Death', 'Use', 'Imagine', 'Pumped', 'Reward', 'Amount', 'Cave', 'Gamy', 'Reflective', 'Dependent', 'Tin', 'Page', 'Suspect', 'Crown', 'Attack', 'Nation', 'Aquatic', 'Maniacal', 'Apparel', 'Lick', 'Writing', 'Giants', 'Spurious', 'Physical', 'Concerned', 'True', 'Table', 'Rhythm', 'Quack', 'Unaccountable', 'Kiss', 'Halting', 'Plant', 'Trip', 'Present', 'Chicken', 'Disagreeable', 'Whimsical', 'Tall', 'Simple', 'Mean', 'Misty', 'Likeable', 'Grandmother', 'Utopian', 'Marble', 'Pencil', 'Earthy', 'Abrupt', 'License', 'Desert', 'Introduce', 'Talk', 'Instinctive', 'Jar', 'Arrogant', 'Hollow', 'Garrulous', 'Plan', 'Trains', 'Seal', 'Unable', 'History', 'Slim', 'Blood', 'Cultured', 'Throne', 'Retire', 'Rod', 'Cake', 'Sidewalk', 'Announce', 'Thinkable', 'Square', 'Roll', 'Unbiased', 'Mix', 'Apologise', 'Notice', 'Request', 'Frighten', 'Lock', 'Aboriginal', 'Belligerent', 'Spring', 'Skinny', 'Wide-eyed', 'Accessible'];

				const numberOfPlaces = data.places.length;

				data.items = itemsNames.map((o) => {
					const randomPlace = _.random(1, numberOfPlaces);

					return {
						name: o + ' Burger',
						image: 'http://loremflickr.com/300/300/burger,food',
						place: randomPlace,
					};
				});

				request.server.plugins.sequelize.db.Item.bulkCreate(data.items)
					.then(() => resolve())
					.catch((error) => reject(error));
			});
		}

		function populateReviews() {
			return new Promise((resolve, reject) => {
				const numberOfReviewsPerUser = 3;
				const numberOfDaysToSpreadReviewsAcross = 10;

				const numberOfUsers = data.users.length;
				const numberOfBurgers = data.items.length;
				const numberOfReviews = numberOfReviewsPerUser * numberOfUsers;

				data.reviews = [];

				for (var i = 0; i < numberOfReviews; i++) {
					const randomUser = _.random(1, numberOfUsers);
					const randomItem = _.random(1, numberOfBurgers);
					const randomDay = _.random(0, numberOfDaysToSpreadReviewsAcross);

					data.reviews.push({
						author: randomUser,
						item: randomItem,
						photo: 'http://loremflickr.com/300/300/burger,food',
						body: 'Lorem Ipsum',
						reaction: '',
						createdAt: Moment().subtract(randomDay, 'day'),
					});
				}

				request.server.plugins.sequelize.db.Review.bulkCreate(data.reviews)
					.then(() => resolve())
					.catch((error) => reject(error));
			});
		}
	}
};

exports.register.attributes = {
	name: 'routes-dev',
};
