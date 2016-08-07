'use strict';

module.exports = function (sequelize, DataTypes) {
	return sequelize.define('Item', {
		name: DataTypes.STRING,
		image: DataTypes.STRING,
		place: DataTypes.STRING,
	});
};
