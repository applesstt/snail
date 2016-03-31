
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var tree = require('mongoose-tree');
var utils = require('../../lib/utils');

var Schema = mongoose.Schema;

var TuiSchema = new Schema({
  name: {type: String, default: '', trim: true},
  des: {type: String, default: '', trim: true},
  qrcode_ticket: {type: String, default: '', trim: true},
  scene_str: {type: String, default: '', trim: true},
  lastCount: {type: Number, default: 0}, //上次结算数量

  //临时参数
  day1: {type: Number, default: 0},
  day7: {type: Number, default: 0},
  day30: {type: Number, default: 0},
  day30Del: {type: Number, default: 0},
  dayAll: {type: Number, default: 0},
  dayAllDel: {type: Number, default: 0},
  cancelPer: {type: Number, default: 0},
  cancel30Per: {type: Number, default: 0},
  activePer: {type: Number, default: 0},
  users: {type: Array},
  leftCount: {type: Number, default: 0},

  children: {type: Array},
  createdAt: {type: Date, default: null}
});

TuiSchema.statics = {

  findByName: function(name, cb) {
    this.findOne({
      name: name
    }).exec(cb);
  },

  load: function (id, cb) {
    this.findOne({ _id : id })
      .exec(cb);
  },

  list: function (options, cb) {
    var criteria = options.criteria || {};
    var sort = options.sort || {'createdAt': -1};
    this.find(criteria)
      .sort(sort)
      .limit(options.perPage)
      .skip(options.perPage * options.page)
      .exec(cb);
  },

  listAll: function(options, cb) {
    var criteria = options.criteria || {};
    var sort = options.sort || {'createdAt': -1};
    this.find(criteria)
      .sort(sort)
      .exec(cb);
  }
}

TuiSchema.plugin(tree);

mongoose.model('Tui', TuiSchema);
