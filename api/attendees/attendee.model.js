var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var attendeeSchema = new Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    signature: {
        type: String,
        required: false
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Events',
        required: false,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: false,
    }

}, {collection: 'attendees' });

module.exports = mongoose.model('Attendees', attendeeSchema);