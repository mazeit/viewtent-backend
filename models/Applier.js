var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug');

var ApplierSchema = new mongoose.Schema({
  slug: {type: String, lowercase: true, unique: true},
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  video : String,
}, {timestamps: true});

ApplierSchema.plugin(uniqueValidator, {message: 'is already taken'});

ApplierSchema.pre('validate', function(next){
  if(!this.slug)  {
    this.slugify();
  }

  next();
});

ApplierSchema.methods.slugify = function() {
  this.slug = (Math.random() * Math.pow(36, 6) | 0).toString(36);
};

// Requires population of author
ApplierSchema.methods.toJSONFor = function(client){

  var difference_ms = new Date() - new Date(this.createdAt);
  difference_ms = difference_ms/1000;
  var seconds = Math.floor(difference_ms % 60);
  difference_ms = difference_ms/60; 
  var minutes = Math.floor(difference_ms % 60);
  difference_ms = difference_ms/60; 
  var hours = Math.floor(difference_ms % 24);  
  var days = Math.floor(difference_ms/24);
  var offset = '';
  if (days > 0 ) {
    offset =  days + (days>1? ' days' : ' day')
  }
  else if( hours > 0 ){
    offset = hours + (hours>1? ' hours' : ' hour')
  }
  else {
    offset =  minutes + (minutes > 1? ' mins' : ' min')
  }

  return {
    slug: this.slug,
    video: this.video,
    createdAt: this.createdAt,
    author: this.author.toProfileJSONFor(client),
    interview : this.interview,
    offset : offset
  };
};

mongoose.model('Applier', ApplierSchema);
