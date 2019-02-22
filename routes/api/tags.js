var router = require('express').Router();
var mongoose = require('mongoose');
var Interview = mongoose.model('Interview');

// return a list of tags
router.get('/', function(req, res, next) {
  Interview.find().distinct('tagList').then(function(tags){
    return res.json({tags: tags});
  }).catch(next);
});

module.exports = router;
