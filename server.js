
/*!
 * nodejs-express-mongoose-demo
 * Copyright(c) 2013 Madhusudhan Srinivasa <madhums8@gmail.com>
 * MIT Licensed
 */
/**
 * Module dependencies
 */

var fs = require('fs');
var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var config = require('config');

var webot = require('weixin-robot');

var WechatAPI = require('wechat-api');

var wx_api = new WechatAPI('wxd8cbe99c62f3c75d', 'ef485616bc8b555057109dd143d7115d');

var app = express();

var port = process.env.PORT || 3001;

// Connect to mongodb
var connect = function () {
  var options = {
    server: { socketOptions: { keepAlive: 1 } }
    //user: 'ryori_db_user',
    //pass: 'BJxskj1104'
  };
  mongoose.connect(config.db, options);
};
connect();

mongoose.connection.on('error', console.log);
mongoose.connection.on('disconnected', connect);

// Bootstrap models
fs.readdirSync(__dirname + '/app/models').forEach(function (file) {
  if (~file.indexOf('.js')) require(__dirname + '/app/models/' + file);
});

require('./app/rules')(webot, wx_api);

webot.watch(app, { token: 'ryoriweixin', path: '/wechat' });

// Bootstrap passport config
require('./config/passport')(passport, config);

// Bootstrap application settings
require('./config/express')(app, passport);

// Bootstrap routes
require('./config/routes')(app, passport, wx_api);

app.listen(port);
console.log('Express app started on port ' + port);

/**
 * Expose
 */

module.exports = app;
