var mongoose = require('mongoose');

var ClientSchema = new mongoose.Schema({
  email: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
  fullname : String
}, {timestamps: true});


ClientSchema.methods.toProfileJSONFor = function(client){
  return {
    email : this.email,
    fullname: this.fullname
  };
};

mongoose.model('Client', ClientSchema);
