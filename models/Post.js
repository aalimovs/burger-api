'use strict';

module.exports = function (sequelize, DataTypes) {
	return sequelize.define('Post', {
		item: DataTypes.STRING,
		reviews: DataTypes.STRING,
	});
};
