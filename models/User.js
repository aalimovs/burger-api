'use strict';

module.exports = function (sequelize, DataTypes) {
	return sequelize.define('User', {
		username: DataTypes.STRING,
		password: DataTypes.STRING,
		fullname: DataTypes.STRING,
		email: DataTypes.STRING,
	});
};
