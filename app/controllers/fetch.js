
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var utils = require('../../lib/utils');
var async = require('async');
var http = require("http");
var request = require('request');
var phantomCheerio = require('phantom-cheerio')({});
var FetchCamp = mongoose.model('FetchCamp');
var request = require('request');
var fsTools = require('fs-tools');
var fs = require('fs');

var _write = function(url, pro, id, index, cb) {
  console.log('url: ' + url);
  if(url == '') {
    return cb(true);
  }
  while(url.indexOf('./') === 0) {
    url = url.replace('./', '');
  }
  url = dp + url;

  var timeGap = pro === 'imgs' ? 300 : 500;
  var type = url.substring(url.lastIndexOf('.'));
  if(type.indexOf('png') > -1 || type.indexOf('jpg') > -1 ||
    type.indexOf('gif') > -1 || type.indexOf('JPG') || type.indexOf('jpeg')) {
    var folder = '/upload/camp/' + pro + '/' + id + '/';
    fsTools.mkdirSync('./public' + folder);
    var fileUri = folder + index + type;
    setTimeout(function() {
      request(url).pipe(fs.createWriteStream('./public' + fileUri));
      console.log('write: ' + url + ' to: ' + fileUri);
      cb(null, fileUri);
    }, timeGap);
  } else {
    cb(true);
  }
}

var _rewriteImage = function() {

  var _camps = [];
  var _curIndex = 371;
  var _len = 0;

  var __writeCamp = function() {
    if(_curIndex < _len) {
      var camp = _camps[_curIndex];
      var campIndex = _curIndex;
      async.parallel([
        function(cb) {
          if(camp.temp_imgs && camp.temp_imgs.length) {
            async.each(camp.temp_imgs, function(img, imgCb) {
              var index = camp.temp_imgs.indexOf(img);
              _write(img, 'imgs', camp._id, index, function(err, uri) {
                if(!err) {
                  camp.imgs.push(uri);
                }
                imgCb();
              });
            }, function() {
              cb(null);
            })
          } else {
            cb(null);
          }
        },
        function(cb) {
          if(camp.temp_views && camp.temp_views.length) {
            async.each(camp.temp_views, function(view, viewCb) {
              var index = camp.temp_views.indexOf(view);
              _write(view, 'views', camp._id, index, function(err, uri) {
                if(!err) {
                  camp.views.push(uri);
                }
                viewCb();
              });
            }, function() {
              cb(null);
            })
          } else {
            cb(null);
          }
        }
      ], function(err) {
        camp.save(function(err) {
          console.log('resave camp ' + campIndex + ': ' + camp.name);
          _curIndex++;
          setTimeout(function() {
            __writeCamp();
          }, 20000)
        })
      })
    }
  }

  FetchCamp.listAll({}, function(err,camps) {
    _len = camps.length;
    _camps = camps;
    //console.log(camps[63])
    __writeCamp();

    console.log('resave all success!');

  })
}

exports.getFetchCamps = function(req, res) {
  var city = req.param('city');
  var search = req.param('search');
  var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
  var perPage = req.param('perPage') > 0 ? req.param('perPage') : 100;

  var criteria = {};
  if(city && city !== '') {
    criteria.city = city;
  }
  if(search && search !== '') {
    var reg = new RegExp(search, 'i');
    criteria.name = {
      $regex: reg
    }
  }

  var options = {
    page: page,
    perPage: perPage,
    criteria: criteria
  };

  FetchCamp.list(options, function(err,camps) {
    FetchCamp.count(options.criteria, function(err, count) {
      res.send({
        camps: camps,
        count: count,
        page: page + 1,
        perPage: perPage,
        pages: Math.ceil(count / perPage)
      })
    })
  });
}

var _saveToDb = function(param) {
  FetchCamp.findByLink(param.link, function(err, fetchCamp) {
    if(!fetchCamp) {
      fetchCamp = new FetchCamp(param);
      fetchCamp.save(function(err) {
        console.log(err || 'Save ' + param.name);
      })
    }
  })
}

var _loadShop = function(shop_link, isEnd) {
  shop_link = dp + shop_link;
  isLoadingShop = true;
  FetchCamp.findByLink(shop_link, function(err, fetchCamp) {
    if(!fetchCamp) {
      phantomCheerio.open(shop_link, function($) {
        var param = {
          link: shop_link,
          tabs: [],
          des: [],
          temp_imgs: [],
          temp_views: []
        };
        var name = $('.ydjd_detail_title h3').contents()[0];
        name = $(name).text().trim();

        param.name = name;

        $('.ydjd_detail_cont>div').each(function() {
          var _s = $(this).text().trim();
          if(_s !== '') {
            var subs = _s.split(/[:：]/);
            if(subs.length == 2) {
              param.tabs.push({
                name: subs[0],
                content: subs[1]
              })
            } else {
              param.des.push(_s);
            }
          }
        });

        $('.rslides img').each(function() {
          var src = $(this).attr('src');
          param.temp_imgs.push(src);
        })

        $('.zb_leftcont01 img').each(function() {
          var src = $(this).attr('src');
          param.temp_views.push(src);
        })

        console.log(index_page + '-' + shop_no + ': ' + param.name);

        shop_no++;
        isLoadingShop = false;
        if(isEnd) {
          isLoadingPage = false;
          index_page++;
        }

        console.log(param);
        _saveToDb(param);
      })
    } else {
      console.log('you have added this restaurant!');
      shop_no++;
      isLoadingShop = false;
      if(isEnd) {
        isLoadingPage = false;
        index_page++;
      }
    }
  });
}

var _loadPage = function() {
  isLoadingPage = true;

  var __eachLoad = function(shops, $) {
    shops.each(function(i) {
      var href = $(this).attr('href');
      var isEnd = i === (shops.length - 1);
      var _checkAndLoadShop = function() {
        setTimeout(function() {
          if(!isLoadingShop) {
            _loadShop(href, isEnd);
          } else {
            _checkAndLoadShop();
          }
        }, time_gap);
      }
      _checkAndLoadShop();
    })
  }


  phantomCheerio.open(dp + search + index_page, function ($) {
    var shops = $('.ydjd_yd_title a');
    __eachLoad(shops, $);
  })
}

var _load = function() {
  var t = setInterval(function() {
    if(!isLoadingPage) {
      if(index_page <= all_page) {
        _loadPage();
      } else {
        clearInterval(t);
      }
    }
  }, time_gap);
}

var dp = 'http://www.51luying.com/';
var search = 'attr.php?mod=attractions&do=inattr&page='
var isLoadingShop = false;
var isLoadingPage = false;
var shop_no = 1;
var time_gap = 3000;

var index_page = 1;
var all_page = 34;

var _removeDupImg = function() {
  FetchCamp.listAll({}, function(err,camps) {
    for(var i = 0; i < camps.length; i++) {
      var camp = camps[i];
      var tempImgsKey = {};
      var tempImgs = [];
      if (camp.imgs) {
        for (var j = 0; j < camp.imgs.length; j++) {
          if (!tempImgsKey[camp.imgs[j]]) {
            tempImgsKey[camp.imgs[j]] = true;
            tempImgs.push(camp.imgs[j]);
          }
        }
      }
      camp.imgs = tempImgs;

      var tempViewsKey = {};
      var tempViews = [];
      if (camp.views) {
        for (var j = 0; j < camp.views.length; j++) {
          if (!tempViewsKey[camp.views[j]]) {
            tempViewsKey[camp.views[j]] = true;
            tempViews.push(camp.views[j]);
          }
        }
      }
      camp.views = tempViews;
      camp.save(function(err) {
        console.log('resave camp ' + i + ': ' + camp.name);
      })
    }
  })

}

exports.test = function(req, res) {
  //_removeDupImg();

  //_rewriteImage();

  //_load();

  //var map = require('./map');
  //map.getCityByCoords('39.983424', '116.322987', function() {});
  /*var redis = require('./redis');
  redis.getDishRestaurants('寿司', 'hongkong', function(err, restaurants) {
    console.log('get restaurants by dish');
    console.log(restaurants);
  })*/

}

var _getLocationFromBaidu = function(fetch, lat, lng) {
  if(lat && lng && lat !== '' && lng !== '') {
    request('http://api.zdoz.net/bd2wgs.aspx?lat=' + lat + '&lng=' + lng,
      function(error, response, body) {
        if(!error && response.statusCode == 200) {
          var ret = JSON.parse(body);
          if(ret && ret.Lng && ret.Lat) {
            fetch.lng = ret.Lng;
            fetch.lat = ret.Lat;
            fetch.save(function(err) {
              console.log(err || 'update fetch: ' + fetch.name);
            })
          }
        }
      }
    )
  }
}

exports.getGeo = function(req, res) {

  return ;

  var ak = '3abb4a5178989acf6948d5d143fc89e8';
  FetchRestaurant.list({
    criteria: {
      city: 'hongkong'
    }
  }, function(err, fetchs) {
    console.log(fetchs.length);
    fetchs.forEach(function(fetch, index) {
      console.log('index: ' + index);
      if(fetch.lng === '' && fetch.lat === '') {
        var address = fetch.name;
        if(fetch.local_name !== '') {
          address += '(' + fetch.local_name + ')';
        }
        console.log('address: ' + address);
        request('http://api.map.baidu.com/place/v2/search?ak=' + ak +
          '&query=' + encodeURIComponent(address) + '&output=json&region=' +
          encodeURIComponent('香港'),
          function(error, response, body) {
            if(!error && response.statusCode == 200) {
              var ret = JSON.parse(body);
              if(ret && ret.results.length > 0 && typeof ret.results[0].location !== 'undefined') {
                var lat = ret.results[0].location.lat;
                var lng = ret.results[0].location.lng;
                _getLocationFromBaidu(fetch, lat, lng);
              }
            } else {
              return cb('Get city by baidu map api failure!');
            }
          }
        )
      }
    })
  })
}