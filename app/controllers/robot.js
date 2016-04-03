
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');

var Restaurant = mongoose.model('Restaurant');
var Event = mongoose.model('Event');
var User = mongoose.model('User');
var Robot = mongoose.model('Robot');
var ai = require('../../lib/ai');
var seg = require('../../lib/seg');

var msg = require('../rules/msg');
var async = require('async');

var Base;

exports.index = function(req, res) {
  res.render('robot/index');
}

//网页端机器人
exports.segment = function(req, res) {
  var question = req.body.question || '';
  var t = Date.now();
  var mockInfo = {
    uid: 'oQWZBs3-64Yrb3NCplva8j8vePic',
    isClient: true
  };
  /*_getOrignalResult(question, function(aimlResult, words) {
    _formatAnswer(aimlResult, words, mockInfo, function(answer, isWxImg, isRobotImg) {
      res.send({
        answer: answer,
        isWxImg: isWxImg,
        isRobotImg: isRobotImg,
        question: question,
        words: words,
        spent: Date.now() - t});
    })
  })*/
}

//微信端机器人
exports.askWxRobot = function(info, base, question, cb) {
  Base = base;
  /*_getOrignalResult(question, function(aimlResult, words) {
    _formatAnswer(aimlResult, words, info, function(answer, isWxImg, isRobotImg) {
      cb(answer, isWxImg, isRobotImg);
    })
  })*/
}