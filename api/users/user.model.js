var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  firstname: {
    type: String,
    required: true
  },
  lastname: {
    type: String,
    required: true
  },
  passwordHash: {
    type: String,
    required: true
  }
}, {collection: 'users' });

module.exports = mongoose.model('Users', userSchema);