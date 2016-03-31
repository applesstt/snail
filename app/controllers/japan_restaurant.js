
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var utils = require('../../lib/utils');
var extend = require('util')._extend;
var async = require('async');
var http = require("http");
var fsTools = require('fs-tools');
var fs = require('fs');
var request = require('request');
var JapanRestaurant = mongoose.model('JapanRestaurant');
var JapanHotel = mongoose.model('JapanHotel');
var JapanSight = mongoose.model('JapanSight');

exports.loadJapanRestaurant = function(req, res, next, japanRestaurantId) {
  JapanRestaurant.load({
    criteria: {
      _id: japanRestaurantId
    }
  }, function (err, japanRestaurant) {
    if (err) return next(err);
    if (!japanRestaurant) return next(new Error('japanRestaurant not found'));
    req.tempJapanRestaurant = japanRestaurant;
    next();
  });
}

exports.getJapanRestaurant = function(req, res) {
  var japanRestaurant = req.tempJapanRestaurant;
  return res.send(japanRestaurant);
}
exports.getAllJapanRestaurants = function(req, res) {
  JapanRestaurant.listAll({}, function(err, restaurants) {
    res.send({
      japanRestaurants: restaurants
    })
  })

}
exports.getJapanRestaurants = function(req, res) {
  var city = req.param('city');
  var michelin_level = req.param('michelin_level');
  var min_price = req.param('min_price');
  var max_price = req.param('max_price');
  var japan_hotel = req.param('japan_hotel');
  var restaurant_area = req.param('restaurant_area');
  var page = (req.param('page') > 0 ? req.param('page') : 1) - 1;
  var perPage = req.param('perPage') > 0 ? req.param('perPage') : 15;

  min_price = (min_price && min_price !== '') ? parseInt(min_price) : 0;
  max_price = (max_price && max_price !== '') ? parseInt(max_price) : 10000;

  var criteria = {
    $or: [{
      price: {
        $gte: min_price,
        $lte: max_price
      }
    }, {
      lunch: {
        $gte: min_price,
        $lte: max_price
      }
    }]
  };

  if(city && city !== '') {
    criteria.city = city;
  }
  if(michelin_level && michelin_level !== '') {
    criteria.michelin_level = michelin_level;
  }
  if(restaurant_area && restaurant_area !== '') {
    criteria.area = {
      $regex: new RegExp(restaurant_area.trim(), 'i')
    }
  }

  var options = {
    page: page,
    perPage: perPage,
    criteria: criteria
  };

  var _loadJapanRestaurants = function(noFindHotel) {
    var noFindHotel = typeof noFindHotel === 'undefined' ? false : noFindHotel;
    JapanRestaurant.list(options, function(err, restaurants) {
      JapanRestaurant.count(options.criteria, function(err, count) {
        res.send({
          japanRestaurants: restaurants,
          count: count,
          page: page + 1,
          perPage: perPage,
          pages: Math.ceil(count / perPage),
          noFindHotel: noFindHotel
        })
      })
    })
  }

  var _renderHotelOrSight = function(japanHotelOrSight) {
    JapanRestaurant.listAll(options, function(err, restaurants) {
      var count = restaurants.length;
      restaurants.sort(function(a, b) {
        return (Math.abs(a.lng - japanHotelOrSight.lng) + Math.abs(a.lat - japanHotelOrSight.lat)) -
          (Math.abs(b.lng - japanHotelOrSight.lng) + Math.abs(b.lat - japanHotelOrSight.lat));
      })
      restaurants = restaurants.slice(page * perPage, (page + 1) * perPage);
      res.send({
        japanRestaurants: restaurants,
        count: count,
        page: page + 1,
        perPage: perPage,
        pages: Math.ceil(count / perPage),
        hotelName: japanHotelOrSight.name + ', ' + japanHotelOrSight.en_name +
          ' (lng:' + japanHotelOrSight.lng + ',lat:' + japanHotelOrSight.lat + ')'
      })
    })

  }

  if(japan_hotel && japan_hotel !== '') {
    JapanSight.findByNameAndCity(japan_hotel, city, function(err, japanSight) {
      if(japanSight && japanSight.lng) {
        _renderHotelOrSight(japanSight);
      } else {
        JapanHotel.findByNameAndCity(japan_hotel, city, function(err, japanHotel) {
          if(japanHotel && japanHotel.lng) {
            _renderHotelOrSight(japanHotel);
          } else {
            _loadJapanRestaurants(true);
          }
        })
      }
    })
  } else {
    _loadJapanRestaurants();
  }
}

exports.uploadJapanRestaurantPic = function(req, res) {
  var image_path = req.files.file.path;
  var base_path = './public/upload/japanRestaurant/';
  fsTools.mkdirSync(base_path);

  var image_name = (new Date()).getTime() + '.jpg';
  var real_path = base_path + image_name;
  var target_path = '/upload/japanRestaurant/' + image_name;

  try {
    fs.renameSync(image_path, real_path);
    return res.send({
      success: true,
      image: target_path
    })
  } catch(e) {
    console.log(e);
  }

  res.send({
    success: false
  })
}

exports.updateJapanRestaurant = function(req, res) {
  var japanRestaurant = extend(req.tempJapanRestaurant, req.body);
  japanRestaurant.save(function(err, japanRestaurantObj) {
    if(err) {
      console.log(err);
    }
    res.send({
      success: !err && true,
      japanRestaurant: japanRestaurantObj
    })
  })
}
