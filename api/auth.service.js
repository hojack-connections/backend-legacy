
var jwt = require('jsonwebtoken');
var config = require('../config');

exports.checkAuth = function(req, res, next) {
	var token = req.body.token || req.query.token;

	if (token) {
		jwt.verify(token, config.JWT_SECRET, function(err, decoded) {
			if (err) {
				res.status(401).send(config.AUTHENTICATION_FAILED);
			} else {
				req.user = decoded;
				next();
			}
		});
	} else {
		res.status(401).send(config.AUTHENTICATION_FAILED);
	}
}
