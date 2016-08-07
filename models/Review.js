'use strict';

module.exports = function (sequelize, DataTypes) {
	return sequelize.define('Review', {
		author: DataTypes.STRING,
		item: DataTypes.STRING,
		photo: DataTypes.STRING,
		body: DataTypes.STRING,
		reaction: DataTypes.STRING,
	});
};
