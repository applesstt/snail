/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var utils = require('../../lib/utils');

var Schema = mongoose.Schema;

var FetchCampSchema = new Schema({
  //名字
  name: {type: String, default: '', trim: true},

  tabs: [{
    name: {type: String, default: '', trim: true},
    content: {type: String, default: '', trim: true}
  }],

  des: [{type: String, default: '', trim: true}],
  imgs: [{type: String, default: '', trim: true}],
  temp_imgs: [{type: String, default: '', trim: true}],
  views: [{type: String, default: '', trim: true}],
  temp_views: [{type: String, default: '', trim: true}],

  link: {type: String, default: '', trim: true},

  lng: {type: String, default: '', trim: true}, //真实经度
  lat: {type: String, default: '', trim: true}, //真实纬度

  createdAt: {type: Date, default: Date.now}
});


FetchCampSchema.statics = {

  load: function (options, cb) {
    this.findOne(options.criteria)
      .exec(cb);
  },

  findByLink: function(link, cb) {
    this.findOne({
      link: link
    }).exec(cb);
  },

  listByDishName: function(dishName, cb) {
    this.find({
      'dishes.name': {
        $in: [new RegExp(dishName)]
      }
    })
      //.select('name local_name price taste env service dishes address tel open_time')
      /*.sort({
        score: -1
      })*/
      //.limit(10)
      .exec(cb);
  },

  list: function (options, cb) {
    var criteria = options.criteria || {};
    var sort = options.sort || {'createdAt': 1};
    this.find(criteria)
      .sort(sort)
      .limit(options.perPage)
      .skip(options.perPage * options.page)
      .exec(cb);
  },

  listAll: function (options, cb) {
    var criteria = options.criteria || {};
    var sort = options.sort || {'createdAt': 1};
    this.find(criteria)
      .sort(sort)
      .exec(cb);
  }

}

mongoose.model('FetchCamp', FetchCampSchema);
