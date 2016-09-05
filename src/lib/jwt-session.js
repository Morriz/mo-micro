const JWTRedisSession = require('jwt-redis-session')
const redis = require('redis')
const redisClient = redis.createClient()
const secret = 'bladida'
const init = JWTRedisSession({
  client: redisClient,
  secret: secret,
  keyspace: 'sess:',
  maxAge: 86400,
  algorithm: 'HS256',
  requestKey: 'jwtSession',
  requestArg: 'accessToken',
})
const expressify = require('./expressify')
const cookie = require('cookie')

module.exports = async function(req, res) {
  await expressify(req)
  // allow cookie based:
  const token = cookie.parse(req.headers.cookie || '').token
  if (token && !req.headers['x-access-token']) req.headers['x-access-token'] = token
  return new Promise((resolve, reject) => init(req, res, resolve))
}
