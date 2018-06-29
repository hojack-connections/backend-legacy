
var AWS = require('aws-sdk');
var async = require('async');
var Event = require('./event.model.js');
var Attendee = require('../attendees/attendee.model.js');
var config = require('../../config');
var mandrill = require('mandrill-api/mandrill');
var mandrillClient = new mandrill.Mandrill(config.MANDRILL_API_KEY);

AWS.config = {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    region: config.AWS_REGION,
};

var s3 = new AWS.S3({
    params: {
        Bucket: config.BUCKET
    },
    signatureVersion: 'v4',
});


exports.create = function(req, res) {

    if (!req.body.name) {
        return res.status(400).send(config.MISSING_PARAMETER);
    }

    var newEvent = new Event({
        name: req.body.name,
        date: req.body.date,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zipcode: req.body.zipcode,
        courseNo: req.body.courseNo,
        courseName: req.body.courseName,
        numberOfCourseCredits: req.body.numberOfCourseCredits,
        presenterName: req.body.presenterName,
        trainingProvider: req.body.trainingProvider,
        isSubmitted: false,
        user: req.user._id,
    });
    
    newEvent.save(function(err, data) {
        if (err) {
            if (err.name === 'ValidationError') {
                res.status(400).send(config.MISSING_PARAMETER);
            } else {
                res.status(500).send(config.DB_ERROR);
            }
        } else {
            res.json({
                _id: data._id,
                name: data.name,
                date: data.date,
                address: data.address,
                city: data.city,
                state: data.state,
                zipcode: data.zipcode,
                courseNo: data.courseNo,
                courseName: data.courseName,
                numberOfCourseCredits: data.numberOfCourseCredits,
                presenterName: data.presenterName,
                trainingProvider: data.trainingProvider,
                isSubmitted: !!data.isSubmitted,
                attendees: [],
            });
        }
    });
}

exports.getEvents = function(req, res) {

    var events = [];
    Event.find({ user: req.user._id }, function(err, results) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else {
            results.forEach(function(evt) {
                events.push({
                    _id: evt._id,
                    name: evt.name,
                    date: evt.date,
                    address: evt.address,
                    city: evt.city,
                    state: evt.state,
                    zipcode: evt.zipcode,
                    courseNo: evt.courseNo,
                    courseName: evt.courseName,
                    numberOfCourseCredits: evt.numberOfCourseCredits,
                    presenterName: evt.presenterName,
                    trainingProvider: evt.trainingProvider,
                    isSubmitted: !!evt.isSubmitted,
                });
            });
            res.json(events);
        }
    });
}

exports.getEvent = function(req, res) {

    Event.find({ _id: req.params.id, user: req.user._id }, function(err, events) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else if (events.length === 0) {
            res.status(404).send(config.NOT_FOUND);
        } else {
            Attendee.find({ event: events[0]._id }, function (err, atts) {
                if (err) {
                    return res.status(500).send(config.DB_ERROR);
                }
                res.json({
                    _id: events[0]._id,
                    name: events[0].name,
                    date: events[0].date,
                    address: events[0].address,
                    city: events[0].city,
                    state: events[0].state,
                    zipcode: events[0].zipcode,
                    courseNo: events[0].courseNo,
                    courseName: events[0].courseName,
                    numberOfCourseCredits: events[0].numberOfCourseCredits,
                    presenterName: events[0].presenterName,
                    trainingProvider: events[0].trainingProvider,
                    isSubmitted: !!events[0].isSubmitted,
                    attendees: atts
                });
            });
        }
    });
}

exports.update = function(req, res) {

    Event.find({ _id: req.params.id, user: req.user._id }, function(err, events) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else if (events.length === 0) {
            res.status(404).send(config.NOT_FOUND);
        } else {
            events[0] = Object.assign(events[0], req.body);
            delete events[0].token;

            events[0].save(function (err, result) {
                if (err) {
                    if (err.name === 'ValidationError') {
                        res.status(400).send(config.MISSING_PARAMETER);
                    } else {
                        res.status(500).send(config.DB_ERROR);
                    }
                }
                res.json('UPDATED');
            });
        }
    });
}

exports.delete = function(req, res) {

    Event.find({ _id: req.params.id, user: req.user._id }, function(err, events) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else if (events.length === 0) {
            res.status(404).send(config.NOT_FOUND);
        } else {
            async.waterfall([
                function (cb) {
                    events[0].remove(function (err, result) {
                        if (err) {
                            cb(config.DB_ERROR);
                        } else {
                            cb();
                        }
                    });
                },
                function (cb) {
                    Attendee.find({ event: events[0]._id}, function(err, attendees) {
                        if (err) {
                            cb(err);
                        } else {
                            var signs = [];
                            attendees.forEach(function (attd) {
                                if (attd.signature) signs.push({
                                    Key: attd.signature
                                });
                            });
                            cb(null, signs);
                        }
                    });
                },
                function (signs, cb) {
                    if (signs.length === 0) {
                        cb();
                    } else {
                        var params = {
                            Bucket: config.BUCKET, 
                            Delete: {
                                Objects: signs,
                            }
                        };
                        
                        s3.deleteObjects(params, function(err, data) {
                            if (err) {
                                cb(err);
                            }
                            else {
                                cb();
                            }
                        });
                    }
                },
                function (cb) {
                    Attendee.deleteMany({ event: events[0]._id}, function(err) {
                        if (err) {
                            cb(err);
                        } else {
                            cb();
                        }
                    });
                },
            ], function (err) {
                if (err) {
                    return res.status(500).send(err);
                }
                res.json('REMOVED');
            });
        }
    });
}

exports.getAttendeesByEvent = function(req, res) {
    Attendee.find({
        event: req.params.id
    }).populate('event').exec(function (err, result) {
        if (err) {
            return res.status(500).send(config.DB_ERROR);
        }
        var attendees = [];
        result.forEach(function (attendee) {
            var params = {
                Bucket: config.BUCKET,
                Key: attendee.signature,
            };
            var newAttendee = {
                _id: attendee._id,
                signature: attendee.signature ? s3.getSignedUrl('getObject', params) : '',
                firstname: attendee.firstname,
                lastname: attendee.lastname,
                email: attendee.email,
                phone: attendee.phone,
                event: attendee.event,
                isFilled: !!(attendee.signature &&
                        attendee.firstname &&
                        attendee.lastname &&
                        attendee.email &&
                        attendee.phone &&
                        attendee.event)
            };
            attendees.push(newAttendee);
        });
        res.json(attendees);
    });
}

exports.submitEventById = function(req, res) {
    var certReceivers = [];
    var sheetReceivers = [];
    (req.body.certReceivers || []).forEach(function (email) {
        if (email !== 'all') return certReceivers.push({ email: email });
    });
    (req.body.sheetReceivers || []).forEach(function (email) {
        if (email !== 'all') return sheetReceivers.push({ email: email });
    });


    Event.find({ _id: req.params.id }).populate('user').exec(function(err, events) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else if (events.length === 0) {
            res.status(404).send(config.NOT_FOUND);
        } else {
            events[0] = Object.assign(events[0], { isSubmitted: true});
            delete events[0].token;

            async.waterfall([
                function (cb) {
                    events[0].save(function (err, result) {
                        if (err) {
                            cb({
                                code: 500,
                                message: config.DB_ERROR
                            });
                        } else {
                            cb();
                        }
                    });
                }, function (cb) {
                    Attendee.find({ event: req.params.id }, function (err, atts) {
                        if (err) {
                            cb({
                                code: 500,
                                message: config.DB_ERROR
                            });
                        } else {
                            atts.forEach(function (att) {
                                if (req.body.sheetReceivers.indexOf('all') > -1) {
                                    sheetReceivers.push({
                                        email: att.email
                                    });
                                }
                            });
                            var attendees = [];
                            atts.forEach(function (attendee) {
                                var params = {
                                    Bucket: config.BUCKET,
                                    Key: attendee.signature,
                                };
                                var newAttendee = {
                                    _id: attendee._id,
                                    signature: attendee.signature ? s3.getSignedUrl('getObject', params) : '',
                                    firstname: attendee.firstname,
                                    lastname: attendee.lastname,
                                    email: attendee.email,
                                    phone: attendee.phone,
                                    event: attendee.event
                                };
                                attendees.push(newAttendee);
                            });
                            cb(null, attendees);
                        }
                    });
                }, function (atts, cb) {
                    var templateData = {
                        key: config.MANDRILL_API_KEY,
                        template_content: [],
                        message: {
                            auto_text: true,
                            inline_css: true,
                            merge: true,
                            merge_language: 'handlebars',
                            to: sheetReceivers,
                            subject: 'ATTENDANCE SUMMARY',
                            global_merge_vars: [{
                                name: 'courseNo',
                                content: events[0].courseNo
                            }, {
                                name: 'courseName',
                                content: events[0].courseName
                            }, {
                                name: 'address',
                                content: events[0].address
                            }, {
                                name: 'presenterName',
                                content: events[0].presenterName
                            }, {
                                name: 'attendees',
                                content: atts
                            }],
                            from_email: "support@hojackconnections.com"
                        },
                        template_name: 'TEST_SUMMARY_SHEET_EMAIL'
                    }
                    mandrillClient.messages.sendTemplate(templateData, function (result) {
                        console.log(JSON.stringify(result));
                        cb(null, atts);
                    });
                }, function (atts, cb) {
                    var tDate = new Date(events[0].date);
                    async.eachSeries(atts, function (attendee, sub_cb) {
                        var receivers = [];
                        if (req.body.certReceivers.indexOf('all') > -1) {
                            receivers = certReceivers.concat([{
                                email: attendee.email
                            }]);
                        } else {
                            receivers = [].concat(certReceivers.concat);
                        }
                        var templateData = {
                            key: config.MANDRILL_API_KEY,
                            template_content: [],
                            message: {
                                auto_text: true,
                                inline_css: true,
                                merge: true,
                                merge_language: 'mailchimp',
                                to: receivers,
                                global_merge_vars: [{
                                    name: 'FNAME',
                                    content: attendee.firstname
                                }, {
                                    name: 'LNAME',
                                    content: attendee.lastname
                                }, {
                                    name: 'COURSET',
                                    content: events[0].courseName
                                }, {
                                    name: 'Presenter',
                                    content: events[0].presenterName
                                }, {
                                    name: 'ADDRESS',
                                    content: events[0].address
                                }, {
                                    name: 'TRAININGP',
                                    content: events[0].trainingProvider
                                }, {
                                    name: 'TDATE',
                                    content: (tDate.getMonth() + 1) + '/' + tDate.getDate() + '/' + tDate.getFullYear()
                                }, {
                                    name: 'CREDITS',
                                    content: events[0].numberOfCourseCredits
                                }],
                                subject: 'CERTIFICATE OF COURSE COMPLETION',
                                from_email: "support@hojackconnections.com"
                            },
                            template_name: 'Certificate Template'
                        }
                        mandrillClient.messages.sendTemplate(templateData, function (result) {
                            console.log(JSON.stringify(result));
                            sub_cb();
                        });
                    }, function (err) {
                        cb();
                    });
                }
            ], function (err) {
                if (err) {
                    res.status(err.code).send(err.message);
                } else {
                    res.json('Submitted');
                }
            });
        }
    });
}
