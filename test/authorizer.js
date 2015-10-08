var Authorizer = require('../lib/authorizer')
var nock = require('nock')
var Session = require('../lib/session')
var tap = require('tap')

var user = {name: 'bcoe', email: 'ben@example.com'}
var session = new Session()

tap.test('it returns a 404 error if invalid credentials are provided', function (t) {
  var authorizer = new Authorizer({
    ldapApi: 'http://example.com'
  })

  authorizer.authorize(null, function (err) {
    authorizer.end()
    t.equal(err.statusCode, 404)
    t.end()
  })
})

tap.test('before', function (t) {
  session.delete('abc123', function () {
    t.end()
  })
})

tap.test('it responds with session object if lookup is successful', function (t) {
  var authorizer = new Authorizer({
    ldapApi: 'http://example.com'
  })

  session.populate('abc123', user, function (err) {
    t.equal(err, null)
    authorizer.authorize({
      headers: {
        authorization: 'Bearer abc123'
      }
    }, function (err, s) {
      t.equal(err, null)
      authorizer.end()
      t.end()
    })
  })
})

tap.test('it responds with 401 if session exists but LDAP lookup fails', function (t) {
  var authorizer = new Authorizer({
    ldapApi: 'http://example.com'
  })

  var lookupUser = nock(authorizer.ldapApi)
    .get('/user/' + user.name + '/exists')
    .reply(200, false)

  session.client.del('_ldap_session_abc123', function (err) {
    t.equal(err, null)
    authorizer.authorize({
      headers: {
        authorization: 'Bearer abc123'
      }
    }, function (err, s) {
      t.equal(err.statusCode, 404)
      lookupUser.done()
      authorizer.end()
      t.end()
    })
  })
})

tap.test('after', function (t) {
  session.end()
  t.end()
})
