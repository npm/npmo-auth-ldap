var client = require('redis').createClient()
var nock = require('nock')
var Session = require('../lib/session')
var tap = require('tap')

var sessionTimeoutKey = '_ldap_session_abc123'
var sessionLookupKey = '_ldap_user_abc123'
var user = {name: 'bcoe', email: 'ben@example.com'}

function deleteTokens (t) {
  client.del(sessionTimeoutKey, sessionLookupKey, function () {
    t.end()
  })
}

tap.test('before', deleteTokens)

tap.test('it should return session if cache has timed out and user lookup returns true', function (t) {
  var session = new Session({
    ldapApi: 'http://example.com'
  })

  var lookupUser = nock(session.ldapApi)
    .get('/user/' + user.name + '/exists')
    .reply(200, true)

  client.hmset(sessionLookupKey, user, function (err) {
    t.equal(err, null)

    session.get('abc123', function (err, u) {
      session.end()
      lookupUser.done()
      t.equal(err, null)
      t.equal(u.name, user.name)
      t.equal(u.email, user.email)
      t.end()
    })
  })
})

tap.test('it should return session immediately if there is a cache entry for the user', function (t) {
  var session = new Session({
    ldapApi: 'http://example.com'
  })

  session.get('abc123', function (err, u) {
    session.end()
    t.equal(err, null)
    t.equal(u.name, user.name)
    t.equal(u.email, user.email)
    t.end()
  })
})

tap.test('before', deleteTokens)

tap.test('it should not return session if cache has timed out and user lookup returns false', function (t) {
  var session = new Session({
    ldapApi: 'http://example.com'
  })

  var lookupUser = nock(session.ldapApi)
    .get('/user/' + user.name + '/exists')
    .reply(200, false)

  client.hmset(sessionLookupKey, user, function (err) {
    t.equal(err, null)

    session.get('abc123', function (err, u) {
      session.end()
      lookupUser.done()
      t.equal(err.statusCode, 404)
      t.end()
    })
  })
})

tap.test('it should not return session if cache has timed out and user lookup fails', function (t) {
  var session = new Session({
    ldapApi: 'http://example.com'
  })

  var lookupUser = nock(session.ldapApi)
    .get('/user/' + user.name + '/exists')
    .reply(500)

  client.hmset(sessionLookupKey, user, function (err) {
    t.equal(err, null)

    session.get('abc123', function (err, u) {
      session.end()
      lookupUser.done()
      t.equal(err.statusCode, 500)
      t.end()
    })
  })
})

tap.test('before', deleteTokens)

tap.test('it should not return session if a key is not set for the user', function (t) {
  var session = new Session({
    ldapApi: 'http://example.com'
  })

  session.get('abc123', function (err, u) {
    session.end()
    t.equal(err.statusCode, 404)
    t.end()
  })
})

tap.test('after', function (t) {
  client.end()
  t.end()
})
