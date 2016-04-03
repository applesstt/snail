
/**
 * Module dependencies.
 */
var crypto = require('crypto');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var FetchCamp = mongoose.model('FetchCamp');
var map = require('../../lib/map');

exports.index = function(req, res) {
  FetchCamp.listAll({}, function(err,camps) {
    var showCamps = [];
    showCamps.push(camps.splice(0, 3));
    showCamps.push(camps.splice(3, 3));

    res.render('home/index', {
      title: 'Home',
      isHome: true,
      showCamps: showCamps
    });
  })
}

exports.camps = function(req, res) {
  FetchCamp.listAll({}, function(err,camps) {
    var showCamps = [];
    var len = Math.ceil(camps.length / 3);
    for(var i = 0; i < len; i++) {
      showCamps.push(camps.splice(0, 3));
    }
    res.render('home/camps', {
      title: 'Camp list',
      showCamps: showCamps
    });
  })
}


exports.index3 = function(req, res) {
  res.render('home/index3', {
    title: 'Home',
    isHome: true
  })
}

var _getCityName = function(cityKey) {
  var citys = map.citys;
  for(var i = 0; i < citys.length; i++) {
    if(citys[i].key == cityKey) {
      return citys[i].name;
    }
  }
  return '';
}