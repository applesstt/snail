
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var crypto = require('crypto');

var Schema = mongoose.Schema;
var oAuthTypes = [
  'github',
  'wx'
];

/**
 * User Schema
 */

var UserSchema = new Schema({
  wx_name: { type: String, default: '' },
  wx_app_id: { type: String, default: '' },
  wx_img: { type: String, default: '' },
  wx_remark: { type: String, default: '' },

  user_temp_city: { type: String, default: '' }, // find good restaurant for user at temp city

  default_restaurant: { type: Schema.ObjectId, ref: 'Restaurant'},
  name: { type: String, default: '' },
  sex: {type: Number, default: '0'}, // 1 - man; 2 - woman
  email: { type: String, default: '' },
  provider: { type: String, default: '' },
  country: {type: String, default: ''},
  province: {type: String, default: ''},
  city: { type: String, default: '' },
  tel: { type: String, default: '' },
  location: { type: String, default: '' },
  isSuperAdmin: { type: Boolean, default: false }, //超级管理员
  isAdmin: { type: Boolean, default: false }, //普通管理员
  roleValue: { type: Number, default: 0 }, //普通管理员 权限(二进制)
  roleAry: { type: Array, default: [] }, //临时变量 存储构造后的权限列表
  isDel: { type: Boolean, default: false }, //是否逻辑删除
  isDelWx: { type: Boolean, default: false }, //是否取消微信关注
  group: { type: Number, default: '1' }, //用户分组：1-普通，2-资深，3-达人
  first_password: { type: String, default: '' }, //初始化密码 未加密
  hashed_password: { type: String, default: '' },
  salt: { type: String, default: '' },
  authToken: { type: String, default: '' },
  github: {},
  checked_voice_no: {type: Number, default: 0},
  createdAt: {type: Date, default: Date.now}
});

/**
 * Virtuals
 */

UserSchema
  .virtual('password')
  .set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.encryptPassword(password);
  })
  .get(function() { return this._password });

/**
 * Validations
 */

var validatePresenceOf = function (value) {
  return value && value.length;
};

// the below 5 validations only apply if you are signing up traditionally

/*UserSchema.path('name').validate(function (name) {
  if (this.skipValidation()) return true;
  return name.length;
}, 'Name cannot be blank');

UserSchema.path('email').validate(function (email) {
  if (this.skipValidation()) return true;
  return email.length;
}, 'Email cannot be blank');

UserSchema.path('email').validate(function (email, fn) {
  var User = mongoose.model('User');
  if (this.skipValidation()) fn(true);

  // Check only when it is a new user or when email field is modified
  if (this.isNew || this.isModified('email')) {
    User.find({ email: email }).exec(function (err, users) {
      fn(!err && users.length === 0);
    });
  } else fn(true);
}, 'Email already exists');*/


UserSchema.path('hashed_password').validate(function (hashed_password) {
  if (this.skipValidation()) return true;
  return hashed_password.length;
}, 'Password cannot be blank');


/**
 * Pre-save hook
 */

UserSchema.pre('save', function(next) {
  if (!this.isNew) return next();

  if (!validatePresenceOf(this.password) && !this.skipValidation()) {
    next(new Error('Invalid password'));
  } else {
    next();
  }
})

/**
 * Methods
 */

UserSchema.methods = {

  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */

  authenticate: function (plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },

  /**
   * Make salt
   *
   * @return {String}
   * @api public
   */

  makeSalt: function () {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @return {String}
   * @api public
   */

  encryptPassword: function (password) {
    if (!password) return '';
    try {
      return crypto
        .createHmac('sha1', this.salt)
        .update(password)
        .digest('hex');
    } catch (err) {
      return '';
    }
  },

  /**
   * Validation is not required if using OAuth
   */

  skipValidation: function() {
    return ~oAuthTypes.indexOf(this.provider);
  }
};

/**
 * Statics
 */

UserSchema.statics = {

  /**
   * Load
   *
   * @param {Object} options
   * @param {Function} cb
   * @api private
   */

  load: function (options, cb) {
    this.findOne(options.criteria)
      .populate('default_restaurant')
      .select(options.select)
      .exec(cb);
  },

  /**
   * List users
   *
   * @param options
   * @param cb
   */

  list: function (options, cb) {
    var criteria = options.criteria || {};
    var sort = options.sort || {createdAt: -1};
    this.find(criteria)
      .populate('default_restaurant')
      .sort(sort)
      .limit(options.perPage)
      .skip(options.perPage * options.page)
      .exec(cb);
  }
}

mongoose.model('User', UserSchema);
