'use strict';

var express = require('express');
var controller = require('./attendee.controller');
var router = express.Router();
var authService = require('../auth.service');

router.post('/', authService.checkAuth, controller.create);
router.put('/:id', authService.checkAuth, controller.update);
router.delete('/:id', authService.checkAuth, controller.delete);
router.get('/:id', authService.checkAuth, controller.getAttendee);
router.get('/', authService.checkAuth, controller.getAttendees);

module.exports = router;