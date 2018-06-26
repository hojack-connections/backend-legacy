'use strict';

var express = require('express');
var controller = require('./event.controller');
var router = express.Router();
var authService = require('../auth.service');

router.post('/', authService.checkAuth, controller.create);
router.put('/:id', authService.checkAuth, controller.update);
router.delete('/:id', authService.checkAuth, controller.delete);
router.get('/:id', authService.checkAuth, controller.getEvent);
router.get('/:id/attendees', authService.checkAuth, controller.getAttendeesByEvent);
router.get('/', authService.checkAuth, controller.getEvents);
router.post('/:id/submit', authService.checkAuth, controller.submitEventById);

module.exports = router;