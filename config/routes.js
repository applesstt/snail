
/*!
 * Module dependencies.
 */

// Note: We can require users, articles and other cotrollers because we have
// set the NODE_PATH to be ./app/controllers (package.json # scripts # start)

var home = require('home');
var users = require('users');
var admin = require('admin');
var robotLog = require('robot_log');
var robot = require('robot');
var fetch = require('fetch');
var wxNew = require('wx_new');
var auth = require('./middlewares/authorization');
var utils = require('../lib/utils');

/**
 * Route middlewares
 */

var userAuth = [auth.requiresLogin, auth.user.hasAuthorization];

/**
 * Expose routes
 */

module.exports = function (app, passport, wx_api) {

  app.all('*', function(req, res, next){
    req.wx_api = wx_api;
    next();
  });

  // user routes
  app.get('/login', users.login);
  app.get('/signup', users.signup);
  app.get('/logout', users.logout);

  app.get('/avatar/:email', users.avatar);

  app.post('/users', users.create);
  app.post('/users/session',
    passport.authenticate('local', {
      failureRedirect: '/login',
      failureFlash: 'Invalid email or password.'
    }), users.session);
  app.get('/users/:userEmail', users.show);

  app.route('/users/:userEmail/edit').
    get(users.edit).
    put(userAuth, users.update);
  app.get('/toResetPassword', auth.requiresLogin, users.toResetPassword);
  app.put('/toResetPassword', auth.requiresLogin, users.resetPassword);

  app.get('/auth/github',
    passport.authenticate('github', {
      failureRedirect: '/login'
    }), users.signin);
  app.get('/auth/github/callback',
    passport.authenticate('github', {
      failureRedirect: '/login'
    }), users.authCallback);

  app.param('userEmail', users.load);

  // upload image
  app.route('/images').
    post(auth.requiresLogin, utils.uploadImage).
    put(auth.requiresLogin, utils.uploadImage);

  // crop user image
  app.route('/cropUserImage').
    post(auth.requiresLogin, utils.cropUserImage).
    put(auth.requiresLogin, utils.cropUserImage);

  // admin routes
  app.all('/super*', auth.requiresLogin, auth.user.hasAdminAuthorization);
  app.post('/super*', auth.user.hasAdminAuthorization);
  app.put('/super*', auth.user.hasAdminAuthorization);
  app.get('/super', admin.superIndex);

  app.param('adminId', admin.loadUser);
  app.get('/super/admin', admin.getAdmins);
  app.get('/super/admin/:adminId', admin.getAdmin);
  app.post('/super/admin', admin.createAdmin);
  app.post('/super/admin/:adminId', admin.updateAdmin);
  app.put('/super/admin/:adminId', admin.updateAdmin);

  app.get('/super/user', admin.getUsers);
  app.put('/super/user/:userId', admin.updateUser);

  app.get('/super/getLocationFromBaidu', admin.getLocationFromBaidu);

  app.get('/super/setMenu', admin.setMenu);
  app.post('/super/uploadPic', admin.uploadPic);

  app.get('/super/wxNew/reload', wxNew.reload);
  app.get('/super/wxNew', wxNew.getWxNews);

  app.param('robotLogId', robotLog.loadRobotLog);
  app.get('/super/robotLog', robotLog.getRobotLogs);
  app.post('/super/robotLog/:robotLogId', robotLog.updateRobotLog);

  app.param('userId', admin.loadUser);

  // home route
  app.get('/', home.index);
  app.get('/camps', home.camps);
  app.get('/index3', home.index3);


  //app.all('/fetch*', auth.requiresLogin, auth.user.hasSuperAdminAuthorization);
  app.get('/fetch/test', fetch.test);
  app.get('/fetch/getGeo', fetch.getGeo);

  //robot routes
  //app.all('/robot*', auth.requiresLogin, auth.user.hasSuperAdminAuthorization);
  app.get('/robot', robot.index);
  app.post('/robot/segment', robot.segment);

  /**
   * Error handling
   */

  app.use(function (err, req, res, next) {
    // treat as 404
    if (err.message
      // ~(-1) = 0; // ~(-1) === -(-1) - 1
      // - by applesstt
      && (~err.message.indexOf('not found')
      || (~err.message.indexOf('Cast to ObjectId failed')))) {
      return next();
    }
    console.error(err.stack);
    // error page
    res.status(500).render('500', { error: err.stack });
  });

  // assume 404 since no middleware responded
  app.use(function (req, res, next) {
    if(req.originalUrl.indexOf('/wechat') === 0) {
      next();
    } else {
      res.status(404).render('404', {
        url: req.originalUrl,
        error: 'Not found'
      });
    }
  });
}