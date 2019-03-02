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
  return {
    slug: this.slug,
    video: this.video,
    createdAt: this.createdAt,
    author: this.author.toProfileJSONFor(client),
    interview : this.interview
  };
};

mongoose.model('Applier', ApplierSchema);
