
var AWS = require('aws-sdk');
var async = require('async');
var Attendee = require('./attendee.model.js');
var config = require('../../config');

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

    async.waterfall([
        function (cb) {
            if (!req.body.signature) {
                cb(null, '');
            } else {
                var buf = new Buffer(req.body.signature.replace(/^data:image\/\w+;base64,/, ''), 'base64');
                var imageKey = 's-' + (new Date).getTime();
                s3.putObject({
                    Key: imageKey,
                    Body: buf,
                    ContentType: 'image/png',
                    ContentEncoding: 'base64',
                }, function (err) {
                    if (err) {
                        cb({
                            code: 500,
                            messsage: err,
                        });
                    } else {
                        cb(null, imageKey)
                    }
                });
            }
        }, function (imageKey, cb) {
            var newAttendee = new Attendee({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                email: req.body.email,
                phone: req.body.phone,
                event: req.body.event,
                user: req.user._id,
                signature: imageKey,
            });
            
            newAttendee.save(function(err, data) {
                if (err) {
                    if (err.name === 'ValidationError') {
                        cb({
                            code: 400,
                            message: config.MISSING_PARAMETER,
                        });
                    } else {
                        cb({
                            code: 500,
                            message: config.DB_ERROR,
                        });
                    }
                } else {
                    cb(null, data);
                }
            });
        }
    ], function (err, data) {
        if (err) {
            res.status(err.code).send(err.message);
        } else {
            Attendee.find({ _id: data._id }).populate('event').exec(function(err, attendees) {
                if (err) {
                    res.status(500).send(config.DB_ERROR);
                } else if (attendees.length === 0) {
                    res.status(404).send(config.NOT_FOUND);
                } else {
                    var params = {
                        Bucket: config.BUCKET,
                        Key: attendees[0].signature,
                    };
                    
                    res.json({
                        _id: attendees[0]._id,
                        signature: attendees[0].signature ? s3.getSignedUrl('getObject', params) : '',
                        firstname: attendees[0].firstname,
                        lastname: attendees[0].lastname,
                        email: attendees[0].email,
                        phone: attendees[0].phone,
                        event: attendees[0].event,
                        isFilled: !!(attendees[0].signature &&
                                attendees[0].firstname &&
                                attendees[0].lastname &&
                                attendees[0].email &&
                                attendees[0].phone &&
                                attendees[0].event)
                    });
                }
            });
        }
    });
    
}

exports.getAttendees = function(req, res) {

    var attendees = [];
    Attendee.find({user: req.user._id}).populate('event').exec(function(err, results) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else {
            async.eachSeries(results, function (attendee, cb) {
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
                cb();
            }, function (err) {
                res.json(attendees);
            });
        }
    });
}

exports.getAttendee = function(req, res) {

    Attendee.find({ _id: req.params.id }).populate('event').exec(function(err, attendees) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else if (attendees.length === 0) {
            res.status(404).send(config.NOT_FOUND);
        } else {
            var params = {
                Bucket: config.BUCKET,
                Key: attendees[0].signature,
            };
            
            res.json({
                _id: attendees[0]._id,
                signature: attendees[0].signature ? s3.getSignedUrl('getObject', params) : '',
                firstname: attendees[0].firstname,
                lastname: attendees[0].lastname,
                email: attendees[0].email,
                phone: attendees[0].phone,
                event: attendees[0].event,
                isFilled: !!(attendees[0].signature &&
                        attendees[0].firstname &&
                        attendees[0].lastname &&
                        attendees[0].email &&
                        attendees[0].phone &&
                        attendees[0].event)
            });
        }
    });
}

exports.update = function(req, res) {

    Attendee.find({ _id: req.params.id }, function(err, attendees) {
        if (err) {
            res.status(500).send(config.DB_ERROR);
        } else if (attendees.length === 0) {
            res.status(404).send(config.NOT_FOUND);
        } else {
            attendees[0] = Object.assign(attendees[0], req.body);
            delete attendees[0].token;

            attendees[0].save(function (err, result) {
                if (err) {
                    if (err.name === 'ValidationError') {
                        return res.status(400).send(config.MISSING_PARAMETER);
                    } else {
                        return res.status(500).send(config.DB_ERROR);
                    }
                }
                var params = {
                    Bucket: config.BUCKET,
                    Key: attendees[0].signature,
                };
                
                res.json({
                    _id: attendees[0]._id,
                    signature: attendees[0].signature ? s3.getSignedUrl('getObject', params) : '',
                    firstname: attendees[0].firstname,
                    lastname: attendees[0].lastname,
                    email: attendees[0].email,
                    phone: attendees[0].phone,
                    event: attendees[0].event,
                    isFilled: !!(attendees[0].signature &&
                            attendees[0].firstname &&
                            attendees[0].lastname &&
                            attendees[0].email &&
                            attendees[0].phone &&
                            attendees[0].event)
                });
            });
        }
    });
}

exports.delete = function(req, res) {

    async.waterfall([
        function (cb) {
            Attendee.find({ _id: req.params.id }, function(err, attendees) {
                if (err) {
                    cb({
                        code: 500,
                        message: config.DB_ERROR
                    });
                } else if (attendees.length === 0) {
                    cb({
                        code: 404,
                        message: config.NOT_FOUND
                    });
                } else {
                    cb(null, attendees[0]);
                }
            });
        }, function (attendee, cb) {
            attendee.remove(function (err, result) {
                if (err) {
                    cb({
                        code: 500,
                        message: config.DB_ERROR
                    });
                } else
                    cb(null, attendee.signature);
            });
        }, function (signature, cb) {
            if (!signature) {
                cb();
            } else {
                var params = {
                    Bucket: config.BUCKET, 
                    Delete: {
                        Objects: [{
                            Key: signature
                        }],
                    }
                };
                
                s3.deleteObjects(params, function(err, data) {
                    if (err) {
                        cb({
                            code: 500,
                            message: err,
                        });
                    }
                    else
                        cb();
                });
            }
        }
    ], function (err) {
        if (err) {
            res.status(err.code).send(err.message);
        } else {
            res.json('REMOVED');
        }
    });
}
