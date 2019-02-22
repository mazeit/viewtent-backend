var mongoose = require('mongoose');

var QuestionSchema = new mongoose.Schema({
  body: String,
  audio : String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' }
}, {timestamps: true});

// Requires population of author
QuestionSchema.methods.toJSONFor = function(user){
  return {
    id: this._id,
    body: this.body,
    audio: this.audio,
    createdAt: this.createdAt,
    author: this.author.toProfileJSONFor(user)
  };
};

mongoose.model('Question', QuestionSchema);
