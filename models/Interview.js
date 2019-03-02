var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug');
var User = mongoose.model('User');
var crypto = require('crypto');

var InterviewSchema = new mongoose.Schema({
  slug: {type: String, lowercase: true, unique: true},
  image: String,
  title: String,
  require : String,
  allow : String,
  maxPeopleNum : Number,
  password : String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appliers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Applier' }],
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  invitations : [{ type: String }],
  tagList: [{ type: String }]
}, {timestamps: true});

InterviewSchema.plugin(uniqueValidator, {message: 'is already taken'});

InterviewSchema.pre('validate', function(next){
  if(!this.slug)  {
    this.slugify();
  }

  next();
});

InterviewSchema.methods.slugify = function() {
  this.slug = crypto.randomBytes(16).toString('hex') + (Math.random() * Math.pow(36, 6) | 0).toString(36);
};


InterviewSchema.methods.toJSONFor = function(user){

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
    title: this.title,
    image: this.image,
    require : this.require,
    allow : this.allow,
    maxPeopleNum : this.maxPeopleNum,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    author: this.author.toProfileJSONFor(user),
    appliers: this.appliers,
    questions: this.questions,
    tagList: this.tagList,
    offset : offset,
    invitations : this.invitations
  };
};

mongoose.model('Interview', InterviewSchema);
