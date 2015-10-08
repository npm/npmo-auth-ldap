var _ = require('lodash')
var Session = require('./session')

function AuthorizerLDAP (opts) {
  _.extend(this, {
    session: new Session(opts)
  }, opts)
}

AuthorizerLDAP.prototype.authorize = AuthorizerLDAP.prototype.whoami = function (credentials, cb) {
  if (!validateCredentials(credentials)) return cb(error404())
  var token = credentials.headers.authorization.replace('Bearer ', '')
  this.session.get(token, cb)
}

function validateCredentials (credentials) {
  if (!credentials) return false
  if (!credentials.headers) return false
  if (!credentials.headers.authorization || !credentials.headers.authorization.match(/Bearer /)) return false
  return true;
}

function error404 () {
  var error = Error('not found')
  error.statusCode = 404
  return error
}

AuthorizerLDAP.prototype.end = function () {
  this.session.end()
}

module.exports = AuthorizerLDAP
