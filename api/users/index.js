'use strict';

var express = require('express');
var controller = require('./user.controller');
var router = express.Router();

router.post('/', controller.signup);
router.post('/login', controller.login);

module.exports = router;