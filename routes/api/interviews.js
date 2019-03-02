var router = require('express').Router();
var mongoose = require('mongoose');
var Interview = mongoose.model('Interview');
var Question = mongoose.model('Question');
var User = mongoose.model('User');
var Client = mongoose.model('Client');
var Applier = mongoose.model('Applier');
var auth = require('../auth');
var fs = require('fs');
var util = require('util');
var textToSpeech = require('@google-cloud/text-to-speech');
const speech = require('@google-cloud/speech').v1p1beta1;
var mm = require('music-metadata');
var bufferToWav = require('audiobuffer-to-wav')
var xhr = require('xhr');
// var audioContext = require('audio-context')();

var isDevelopment = process.env.NODE_ENV === 'development';
var URL = 'https://viewtent.com/'
if (isDevelopment) {
  URL = 'http://localhost:3000/'
}

// Preload interview objects on routes with ':interview'
router.param('interview', function(req, res, next, slug) {
  Interview.findOne({ slug: slug})
    .populate('author')
    .then(function (interview) {
      if (!interview) { return res.sendStatus(404); }

      req.interview = interview;

      return next();
    }).catch(next);
});

router.param('question', function(req, res, next, id) {
  Question.findById(id).then(function(question){
    if(!question) { return res.sendStatus(404); }

    req.question = question;

    return next();
  }).catch(next);
});

router.post('/upload' , async function(req, res, next) {
  if (Object.keys(req.files).length == 0) {
    res.status(400).send('No files were uploaded.');
    return;
  }

  var timestamp = new Date().getTime().toString();
  var title = 'video/'+timestamp +'.mp4';

  // fs.writeFile("public/"+title, req.body.data, function(err) {
  //     if(err) {
  //         return console.log(err);
  //     }
  //     res.send(title);
  // }); 
  
  fs.writeFileSync("public/"+title, Buffer.from(new Uint8Array(req.files.data.data))); 
  res.send({
    'title' : URL + title,
  });
  // });
});

router.get('/', auth.optional, function(req, res, next) {
  var query = {};
  var limit = 20;
  var offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  if( typeof req.query.tag !== 'undefined' ){
    query.tagList = {"$in" : [req.query.tag]};
  }

  Promise.all([
    req.query.author ? User.findOne({username: req.query.author}) : null,
    req.query.favorited ? User.findOne({username: req.query.favorited}) : null
  ]).then(function(results){
    var author = results[0];
    var favoriter = results[1];

    if(author){
      query.author = author._id;
    }

    if(favoriter){
      query._id = {$in: favoriter.favorites};
    } else if(req.query.favorited){
      query._id = {$in: []};
    }

    return Promise.all([
      Interview.find(query)
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({createdAt: 'desc'})
        .populate('author')
        .exec(),
      Interview.count(query).exec(),
      req.payload ? User.findById(req.payload.id) : null,
    ]).then(function(results){
      var interviews = results[0];
      var interviewsCount = results[1];
      var user = results[2];

      return res.json({
        interviews: interviews.map(function(interview){
          return interview.toJSONFor(user);
        }),
        interviewsCount: interviewsCount
      });
    });
  }).catch(next);
});

router.get('/feed', auth.required, function(req, res, next) {
  var limit = 20;
  var offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    Promise.all([
      Interview.find({ author: {$in: user.following}})
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('author')
        .exec(),
      Interview.count({ author: {$in: user.following}})
    ]).then(function(results){
      var interviews = results[0];
      var interviewsCount = results[1];

      return res.json({
        interviews: interviews.map(function(interview){
          return interview.toJSONFor(user);
        }),
        interviewsCount: interviewsCount
      });
    }).catch(next);
  });
});

router.post('/', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    var interview = new Interview(req.body.interview);

    interview.author = user;

    return interview.save().then(function(){
      console.log('~~~~~~~~~~~~~~~~~~~~', interview);
      return res.json({interview: interview.toJSONFor(user)});
    });
  }).catch(next);
});

// return a interview
router.get('/:interview', auth.optional, function(req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.interview.populate('author').execPopulate()
  ]).then(function(results){
    var user = results[0];
    return res.json({interview: req.interview.toJSONFor(user)});
  }).catch(next);
});

// update interview
router.put('/:interview', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if(req.interview.author._id.toString() === req.payload.id.toString()){
      if(typeof req.body.interview.title !== 'undefined'){
        req.interview.title = req.body.interview.title;
      }

      if(typeof req.body.interview.description !== 'undefined'){
        req.interview.description = req.body.interview.description;
      }

      if(typeof req.body.interview.body !== 'undefined'){
        req.interview.body = req.body.interview.body;
      }

      if(typeof req.body.interview.tagList !== 'undefined'){
        req.interview.tagList = req.body.interview.tagList
      }

      req.interview.save().then(function(interview){
        return res.json({interview: interview.toJSONFor(user)});
      }).catch(next);
    } else {
      return res.sendStatus(403);
    }
  });
});

// delete interview
router.delete('/:interview', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    if(req.interview.author._id.toString() === req.payload.id.toString()){
      return req.interview.remove().then(function(){
        return res.sendStatus(204);
      });
    } else {
      return res.sendStatus(403);
    }
  }).catch(next);
});

// Favorite an interview
router.post('/:interview/favorite', auth.required, function(req, res, next) {
  var interviewId = req.interview._id;

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    return user.favorite(interviewId).then(function(){
      return req.interview.updateFavoriteCount().then(function(interview){
        return res.json({interview: interview.toJSONFor(user)});
      });
    });
  }).catch(next);
});

// Unfavorite an interview
router.delete('/:interview/favorite', auth.required, function(req, res, next) {
  var interviewId = req.interview._id;

  User.findById(req.payload.id).then(function (user){
    if (!user) { return res.sendStatus(401); }

    return user.unfavorite(interviewId).then(function(){
      return req.interview.updateFavoriteCount().then(function(interview){
        return res.json({interview: interview.toJSONFor(user)});
      });
    });
  }).catch(next);
});

// return an interview's questions
router.get('/:interview/questions', auth.optional, function(req, res, next){
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){
    return req.interview.populate({
      path: 'questions',
      populate: {
        path: 'author'
      },
      options: {
        sort: {
          createdAt: 'asc'
        }
      }
    }).execPopulate().then(function(interview) {
      return res.json({questions: req.interview.questions.map(function(question){
        return question.toJSONFor(user);
      })});
    });
  }).catch(next);
});

// create a new question
router.post('/:interview/questions', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(async function(user){
    if(!user){ return res.sendStatus(401); }
    var client = new textToSpeech.TextToSpeechClient();
    var timestamp = new Date().getTime().toString();
    var title = 'audio/questions/'+user.username.replace(/[^A-Z0-9]+/ig, "-") + timestamp +'.mp3';
    var text = '<speak>' + req.body.question.body + '</speak>'
    var request = {
      input: {ssml: text},
      voice: {languageCode: 'en-US', ssmlGender: 'NEUTRAL'},
      audioConfig: {audioEncoding: 'MP3'},
    };
    var [response] = await client.synthesizeSpeech(request)
    var writeFile = util.promisify(fs.writeFile);
    await writeFile('public/'+title, response.audioContent, 'binary');
    console.log('Audio content written to file:', title, URL);
    var audio_url = URL+title
    req.body.question.audio = audio_url

    var question = new Question(req.body.question);
    question.interview = req.interview;
    question.author = user;

    return question.save().then(function(){
      req.interview.questions = req.interview.questions.concat([question]);
      return req.interview.save().then(function(interview) {
        res.json({question: question.toJSONFor(user)});
      });
    });
  }).catch(next);
});

router.delete('/:interview/questions/:question', auth.required, function(req, res, next) {
  if(req.question.author.toString() === req.payload.id.toString()){
    req.interview.questions.remove(req.question._id);
    req.interview.save()
      .then(Question.find({_id: req.question._id}).remove().exec())
      .then(function(){
        res.sendStatus(204);
      });
  } else {
    res.sendStatus(403);
  }
});


router.post('/:interview/appliers', auth.optional, function(req, res, next) {
  Client.findOne({ email : req.body.applier.email }).then(async function(resClient){
    var client = resClient;
    if(!resClient){ 
      var newClient = new Client({
        email : req.body.applier.email,
        fullname : req.body.applier.fullname
      });
      client = await newClient.save().then(function(res){
        return res;
      });
    }else {
      client.fullname = req.body.applier.fullname;
      await client.save();
    }
    Applier.findOne({ author : client, interview : req.interview}).then(function(resApplier){
      var applier = null;
      if (resApplier) {
        applier = resApplier;
        applier.video = req.body.applier.video;
      }
      else {
        applier = new Applier({video : req.body.applier.video}); 
      }
      applier.interview = req.interview;
      applier.author = client;
      return applier.save().then(function(){
        req.interview.appliers = req.interview.appliers.concat([applier]);
        return req.interview.save().then(function(interview) {
          res.json({applier: applier.toJSONFor(client, req.interview.author)});
        });
      });
    });
  }).catch(next);
});

router.get('/:interview/appliers', auth.optional, function(req, res, next){
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){
    return req.interview.populate({
      path: 'appliers',
      populate: {
        path: 'author'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    }).execPopulate().then(function(interview) {
      return res.json({appliers: req.interview.appliers.map(function(applier){
        return applier.toJSONFor(user);
      })});
    });
  }).catch(next);
});

module.exports = router;
