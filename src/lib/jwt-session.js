import createLogger from './log'
const log = createLogger('jwt-session')
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

module.exports = async function(req, res) {
  await expressify(req)
  return new Promise((resolve, reject) => init(req, res, (sess) => {
    if (req.jwtSession.id) {
      log.debug('got session: ', req.jwtSession)
    } else {
      log.warn('no session!')
    }
    resolve()
  }))
}
