const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phoneNumber: String,
  profilePhoto: String,
  password: { type: String, required: true }  // Make sure the password field is present
});

module.exports = mongoose.model('User', userSchema);
