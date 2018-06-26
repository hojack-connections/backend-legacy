
var User = require('./user.model.js');
var bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
var config = require('../../config');

exports.signup = function(req, res) {

    if (!req.body.email || !req.body.password) {
        return res.status(400).send(config.MISSING_PARAMETER);;
    }

    checkEmailDuplication(req, function(result) {
        if (result.status === 'error') {
            return res.status(500).send(config.DB_ERROR);
        } else if(result.status === 'duplicated'){
            return res.status(500).send(config.EMAIL_DUPLICATION);
        }

        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(req.body.password, salt, function(err, hash) {
                var newUser = new User({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    passwordHash: hash,
                    email: req.body.email,
                });
                newUser.save(function(err, data) {
                    if (err) {
                        if (err.name === 'ValidationError') {
                            res.status(400).send(config.MISSING_PARAMETER);
                        } else {
                            res.status(500).send(config.DB_ERROR);
                        }
                    } else {
                        res.json(data);
                    }
                })
            });
        });
    });
}

exports.login = function(req, res) {
    if(!req.body.email || !req.body.password) {
        return res.status(400).send(config.MISSING_PARAMETER);
    }

    User.find({email: req.body.email}, function(err, users) {
        if (err){
            return res.status(500).send(config.DB_ERROR);
        }
        if (users.length == 0){
            return res.status(401).send(config.AUTHENTICATION_FAILED);
        }

        bcrypt.compare(req.body.password, users[0].passwordHash, function(err, isPasswordMatch) {
            if(isPasswordMatch == false) {
                return res.status(401).send(config.AUTHENTICATION_FAILED);
            }

            var token = jwt.sign({
                firstname: users[0].firstname,
                lastname: users[0].lastname,
                email: users[0].email,
                _id: users[0]._id
            }, config.JWT_SECRET);
            res.json({
                token,
            });
        });
        
    });
}

function checkEmailDuplication(req, callback) {
    User.find({ email: { $regex: new RegExp("^" + req.body.email, "i") } }, function(err, users) {
        if (err) {
            callback({ status: 'error' });
        } else if (users && users.length > 0) {
            callback({ status: 'duplicated' });
        } else {
            callback({ status: 'ok' });
        }
    });
}