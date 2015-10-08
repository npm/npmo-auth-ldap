var _ = require('lodash')
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
    return cb(null, {
      token: uuid.v4(),
      user: {
        name: credentials.body.name,
        email: credentials.body.email
      }
    })
  })
}

AuthenticatorLDAP.prototype.unauthenticate = function (token, cb) {
  this.session.delete(token, cb)
}

function validateCredentials (credentials) {
  if (!credentials) return false
  if (!credentials.body) return false
  if (!credentials.body.name || !credentials.body.password) return false
  return true
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
