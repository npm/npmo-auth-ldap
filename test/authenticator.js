var client = require('redis').createClient()
var nock = require('nock')
var Authenticator = require('../lib/authenticator')
var tap = require('tap')

var sessionLookupPrefix = '_ldap_user_'

tap.test('it returns a 500 error if credentials object is invalid', function (t) {
  var authenticator = new Authenticator({
    ldapApi: 'http://example.com'
  })

  authenticator.authenticate(null, function (err) {
    authenticator.end()
    t.equal(err.statusCode, 500)
    t.end()
  })
})

tap.test('it generates a token and returns a session on successful login', function (t) {
  var authenticator = new Authenticator({
    ldapApi: 'http://example.com'
  })

  var login = nock('http://example.com')
    .post('/login', {username: 'foo', password: 'bar'})
    .reply(200, {})

  authenticator.authenticate({
    body: {
      name: 'foo',
      password: 'bar',
      email: 'ben@example.com'
    }
  }, function (err, s) {
    authenticator.end()
    t.assert(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(s.token))
    t.equal(s.user.name, 'foo')
    t.equal(s.user.email, 'ben@example.com')
    t.equal(err, null)

    client.hgetall(sessionLookupPrefix + s.token, function (err, user) {
      t.equal(user.name, 'foo')
      t.equal(user.email, 'ben@example.com')
      t.end()
    })
  })
})

tap.test('it returins a 401 if login fails', function (t) {
  var authenticator = new Authenticator({
    ldapApi: 'http://example.com'
  })

  var login = nock('http://example.com')
    .post('/login', {username: 'foo', password: 'bar'})
    .reply(401, {})

  authenticator.authenticate({
    body: {
      name: 'foo',
      password: 'bar',
      email: 'ben@example.com'
    }
  }, function (err, s) {
    authenticator.end()
    t.equal(err.statusCode, 401)
    t.end()
  })
})

tap.test('after', function (t) {
  client.end()
  t.end()
})
