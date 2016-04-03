
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var Article = mongoose.model('Article');
var Restaurant = mongoose.model('Restaurant');
var User = mongoose.model('User');
var Media = mongoose.model('Media');
var Event = mongoose.model('Event');
var Gift = mongoose.model('Gift');
var Dish = mongoose.model('Dish');
var Role = require('../../lib/role');
var utils = require('../../lib/utils');
var RoleConfig = require('../../public/js/role_config');
var extend = require('util')._extend;
var fs = require('fs');
var fsTools = require('fs-tools');
var async = require('async');
var request = require('request');
var crypto = require('crypto');

var bw = require ("buffered-writer");

exports.superIndex = function(req, res) {
  var roleAry = [];
  var role = new Role(req.user.roleValue);
  RoleConfig.forEach(function(roleItem) {
    roleAry[roleItem.index] = req.user.isSuperAdmin || role.check(roleItem.index);
  })
  res.render('super/index', {
    roleAry: roleAry,
    isSuperAdmin: req.user.isSuperAdmin
  });
}

var _fetchUsers = function(req, res, options) {
  var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
  var perPage = req.param('perPage') > 0 ? req.param('perPage') : 20;

  options.page = page;
  options.perPage = perPage;

  User.list(options, function(err, users) {
    User.count(options.criteria, function(err, count) {
      res.send({
        users: users,
        count: count,
        page: page + 1,
        perPage: perPage,
        pages: Math.ceil(count / perPage)
      })
    })
  })
}

exports.getData = function(req, res) {
  var getUserCount = function(callback) {
    User.count({provider: 'wx'}, function(err, count) {
      callback(null, count);
    })
  };
  var getVoiceCount = function(callback) {
    Media.count({checked_status: {
      $in: [0, 1]
    }}, function(err, count) {
      callback(null, count)
    })
  }
  var getPlayCount = function(callback) {
    Event.count({is_media_play: true}, function(err, count) {
      callback(null, count);
    })
  }
  var getRestaurantCount = function(callback) {
    Restaurant.count(function(err, count) {
      callback(null, count);
    })
  }
  async.parallel([getUserCount, getVoiceCount, getPlayCount, getRestaurantCount], function(err, results) {
    res.send({
      userCount: results[0],
      voiceCount: results[1],
      playCount: results[2],
      restaurantCount: results[3]
    })

  })
}

exports.getUsers = function(req, res) {
  var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
  var perPage = req.param('perPage') > 0 ? req.param('perPage') : 20;
  //筛选用户级别
  var selTabIndex = parseInt(req.param('selTabIndex'));
  //筛选餐厅所属会员
  var restaurantId = req.param('restaurantId');
  //筛选用户来源是否为餐厅
  var joinType = req.param('joinType');

  var options = {
    page: page,
    perPage: perPage,
    criteria: {
      provider: 'wx'
    }
  }
  if(joinType === '1' || joinType === '2') {
    options.criteria.default_restaurant = (joinType === '1' ? {$ne: null} : null);
  }
  if(selTabIndex >= 1 && selTabIndex <= 3) {
    options.criteria.group = selTabIndex;
  }

  var _loadUsers = function() {
    User.list(options, function(err, users) {
      User.count(options.criteria, function(err, count) {
        async.each(users, function(user, callback) {
          Media.count({
            app_id: user.wx_app_id,
            checked_status: 1
          }, function(err, count) {
            user.checked_voice_no = count;
            callback();
          });
        }, function(err) {
          if(err) {
            console.log(err);
          }
          res.send({
            users: users,
            count: count,
            page: page + 1,
            perPage: perPage,
            pages: Math.ceil(count / perPage)
          })
        })
      })
    })
  }

  if(restaurantId) {
    Event.find({
      event: {
        $in: ['subscribe', 'SCAN']
      },
      restaurant: ObjectId(restaurantId)
    }).exec(function(err, events) {
      var appIds = [];
      for(var i = 0; i < events.length; i++) {
        if(events[i].app_id) appIds.push(events[i].app_id);
      }
      options.criteria.wx_app_id = { $in: appIds };
      _loadUsers();
    })
  } else {
    _loadUsers();
  }
}

/**
 * Load temp user for next
 */
exports.loadUser = function(req, res, next, userId) {
  var options = {
    criteria: { _id : userId }
  };
  User.load(options, function (err, user) {
    if (err) return next(err);
    if (!user) return next(new Error('Failed to load User ' + userName));
    req.tempUser = user;
    next();
  });
}

exports.updateUser = function(req, res) {
  var user = req.tempUser;
  var wrapData = user.wrapData;
  delete user.wrapData;
  delete user._csrf;
  user = extend(user, req.body);
  user.save(function(err) {
    if(err) {
      return res.send({
        message: 'Update user error!'
      });
    }
    user.wrapData = wrapData;
    res.send({
      user: user
    });
  })
}

exports.getAdmins = function(req, res) {
  var selTabIndex = parseInt(req.param('selTabIndex'));
  var options = {
    criteria: {
      provider: 'local',
      isDel: false
      /*'$where': function() {
        return this.isAdmin || this.isSuperAdmin;
      }*/
    }
  };
  if(selTabIndex == 0) {
    options.criteria.isAdmin = true;
  } else if(selTabIndex == 1) {
    options.criteria.isSuperAdmin = true;
  }
  _fetchUsers(req, res, options);
}

exports.getAdmin = function(req, res) {
  var admin = req.tempUser;
  var __getRoleAry = function(roleValue) {
    var r = [], role = new Role(roleValue);
    RoleConfig.forEach(function(roleItem) {
      roleItem.checked = role.check(roleItem.index);
      r.push(roleItem);
    });

    return r;
  };
  admin.roleAry = __getRoleAry(admin.roleValue);
  res.send(admin);
}

exports.createAdmin = function(req, res) {
  var password = ((new Date()).getTime() % 1000000) + '';
  var params = {
    provider: 'local',
    password: password,
    first_password: password
  }
  var admin = new User(extend(params, req.body));
  console.log(admin);
  var role = new Role();
  admin.roleAry.forEach(function(roleItem) {
    if(roleItem.checked)
      admin.roleValue = role.add(roleItem.index);
  })
  console.log(admin.roleValue);
  admin.save(function(err) {
    if(err) {
      console.log(err);
    }
    res.send({
      success: !err && true
    })
  })
}

var _encrypt = function(password, salt) {
  return crypto
    .createHmac('sha1', salt)
    .update(password + '')
    .digest('hex');
};

exports.updateAdmin = function(req, res) {
  var admin =req.tempUser;
  admin = extend(admin, req.body);
  var role = new Role();
  admin.roleAry.forEach(function(roleItem) {
    if(roleItem.checked)
      admin.roleValue = role.add(roleItem.index);
  })
  if(req.body.newPassword) {
    admin.hashed_password = _encrypt(req.body.newPassword, admin.salt);
  }
  admin.save(function(err, retObj) {
    res.send({
      success: !err && true,
      user: retObj
    })
  })
}

exports.uploadPic = function(req, res) {
  var mediaId = req.body.mediaId;

  var wx_api = req.wx_api;
  wx_api.uploadMedia(req.files.file.path, 'image', function(err, result) {
    wx_api.getMedia(result.media_id, function(err, data) {
      if(err) {
        console.log(err);
        return res.send({
          success: false
        })
      }
      //update media
      Media.load(mediaId, function(err, media) {
        media.image_media_id = result.media_id;
        media.updatedAt = new Date();
        media.save(function(err) {
          var base_path = './public/upload/pic/';
          fsTools.mkdirSync(base_path);
          bw.open(base_path + mediaId + '.jpg').write(data).close(function() {
            res.send({
              success: true,
              image_media_id: result.media_id
            })
          });
        })
      })
    });
  })
}

var _setSegmentCity = function() {
  var infoAry = [];
  var tail = '|0x0007|0';
  var citys = ['北京', '上海', '广州', '深圳', '天津', '大连', '青岛', '沈阳', '杭州', '香港'];
  for(var i = 0; i < citys.length; i++) {
    var city = citys[i];
    infoAry.push(city + tail);
  }
  fs.writeFile('./config/dicts/city.txt', infoAry.join('\n'), function(err) {
    console.log(err || "The file was saved!");
  });
}

exports.setMenu = function(req, res) {
  var wx_api = req.wx_api;
  wx_api.createMenu({
    "button":[{
      name: '看看',
      sub_button: [{
        "type":"click",
        "name":"随便看看",
        "key":"MENU_SBKK"
      }, {
        type: 'view',
        name: '本栈原创',
        url: 'http://mp.weixin.qq.com/mp/homepage?__biz=MzAwNzQwNzY4MQ==&hid=1&sn=89480c14bad954a7b2481951af4938bb#wechat_redirect'
      }, {
        type: 'click',
        name: '别人的文章',
        key: 'MENU_BRDWZ'
      }]
    }, {
      type: 'click',
      name: '米其林',
      key: 'MENU_MQL'
      /*sub_button: [{
        type: 'view',
        name: '预定',
        url: 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wxd8cbe99c62f3c75d&redirect_uri=http%3A%2F%2Fryoristack.com%2Fclient%2Forder&response_type=code&scope=snsapi_base&state=#wechat_redirect'
      }, {
        type: 'view',
        name: '说明',
        url: 'http://mp.weixin.qq.com/s?__biz=MzAwNzQwNzY4MQ==&mid=401608804&idx=1&sn=f168e987c093ca8b46f6cc7f768807a1#rd'
      }]*/
    }, {
      type: 'click',
      name: '机器人',
      key: 'MENU_HELP'
    }]
  }, function(err, result) {
    res.send({
      result: result,
      err: err
    })
  })
}

exports.getLocationFromBaidu = function(req, res) {
  var lat = req.param('lat');
  var lng = req.param('lng');
  if(lat !== '' && lng !== '') {
    request('http://api.zdoz.net/bd2wgs.aspx?lat=' + lat + '&lng=' + lng,
      function(error, response, body) {
        if(!error && response.statusCode == 200) {
          var ret = JSON.parse(body);
          if(ret && ret.Lng && ret.Lat) {
            res.send({
              lng: ret.Lng,
              lat: ret.Lat
            })
          }
        } else {
          res.send({})
        }
      }
    )
  } else {
    res.send({})
  }
}

var _wrapper = function (callback) {
  return function (err, data, res) {
    callback = callback || function () {};
    if (err) {
      err.name = 'WeChatAPI' + err.name;
      return callback(err, data, res);
    }
    if (data.errcode) {
      err = new Error(data.errmsg);
      err.name = 'WeChatAPIError';
      err.code = data.errcode;
      return callback(err, data, res);
    }
    callback(null, data, res);
  };
};
var _postJSON = function (data) {
  return {
    dataType: 'json',
    type: 'POST',
    data: data,
    headers: {
      'Content-Type': 'application/json'
    }
  };
};