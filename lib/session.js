var _ = require('lodash')
var redis = require('redis')
var request = require('request')

function SessionLDAP (opts) {
  _.extend(this, {
    client: redis.createClient(process.env.LOGIN_CACHE_REDIS),
    ldapApi: process.env.REPLICATED_INTEGRATIONAPI + '/identity/v1',
    sessionTimeout: 300,
    sessionTimeoutPrefix: '_ldap_session_',
    sessionLookupPrefix: '_ldap_user_'
  }, opts)
}

SessionLDAP.prototype.get = function (key, cb) {
  var _this = this
  this.client.exists(this.sessionTimeoutPrefix + key, function (err, exists) {
    if (err) return cb(error500())

    _this.client.hgetall(_this.sessionLookupPrefix + key, function (err, user) {
      if (err) return cb(error500())
      if (!user) return cb(error404())

      if (!exists) {
        return _this._lookupUser(key, user, cb)
      } else {
        return cb(null, user)
      }
    })
  })
}

SessionLDAP.prototype.populate = function (key, user, cb) {
  this.client.setex(this.sessionTimeoutPrefix + key, this.sessionTimeout, user.name)
  this.client.hmset(this.sessionLookupPrefix + key, user, cb)
}

SessionLDAP.prototype._lookupUser = function (key, user, cb) {
  var _this = this

  request({
    uri: this.ldapApi + '/user/' + encodeURIComponent(user.name) + '/exists',
    method: 'GET',
    json: true,
    strictSSL: false
  }, function (err, res, body) {
    if (err) return cb(error500())
    if (res && res.statusCode !== 200) return cb(error500())

    if (body) {
      _this.client.setex(_this.sessionTimeoutPrefix + key, _this.sessionTimeout, user.name)
      return cb(null, user)
    } else {
      return cb(error404())
    }
  })
}

SessionLDAP.prototype.end = function () {
  this.client.end()
}

function error500 () {
  var error = Error('unknown error')
  error.statusCode = 500
  return error
}

function error404 () {
  var error = Error('not found')
  error.statusCode = 404
  return error
}

module.exports = SessionLDAP
