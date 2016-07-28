'use strict';

module.exports = function (sequelize, DataTypes) {
	return sequelize.define('Place', {
		name: DataTypes.STRING,
		location: DataTypes.STRING,
	});
};
