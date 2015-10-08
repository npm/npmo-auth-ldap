var _ = require('lodash')
var redis = require('redis')
var request = require('request')
var Session = require('./session')
var uuid = require('uuid')

function AuthenticatorLDAP (opts) {
  _.extend(this, {
    ldapApi: process.env.REPLICATED_INTEGRATIONAPI + '/identity/v1',
    session: new Session(opts)
  }, opts)
}

AuthenticatorLDAP.prototype.authenticate = function (credentials, cb) {
  var _this = this
  if (!validateCredentials(credentials)) return cb(error500())

  request({
    uri: this.ldapApi + '/login',
    method: 'POST',
    json: true,
    strictSSL: false,
    body: {
      username: credentials.body.name,
      password: credentials.body.password
    }
  }, function (err, res) {
    if (err) return cb(error500())
    if (res && res.statusCode !== 200) return cb(error401())
    return _this._populateSession(credentials, cb)
  })
}

AuthenticatorLDAP.prototype._populateSession = function (credentials, cb) {
  var token = uuid.v4()
  return this.session.populate(token, {
    name: credentials.body.name,
    email: credentials.body.email
  }, function (err) {
    if (err) return cb(error500())
    return cb(null, {
      token: token,
      user: {
        name: credentials.body.name,
        email: credentials.body.email
      }
    })
  })
}

function validateCredentials (credentials) {
  if (!credentials) return false;
  if (!credentials.body) return false;
  if (!credentials.body.name || !credentials.body.password) return false;
  return true;
}

AuthenticatorLDAP.prototype.end = function () {
  this.session.end()
}

function error500 () {
  var error = Error('unknown error')
  error.statusCode = 500
  return error
}

function error401 () {
  var error = Error('unauthorized')
  error.statusCode = 401
  return error
}

module.exports = AuthenticatorLDAP
