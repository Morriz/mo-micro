import createLogger from './lib/log'
import micro, {send} from 'micro-core'
import request from 'request-promise'
import cookie from 'cookie'
import expressify from './lib/expressify'
const log = createLogger('api')
const env = process.env
const timers = {}

async function handleAuth (req, res, send) {
  let previousToken = req.query.accessToken || req.headers['x-access-token']
  // allow cookie based:
  const cookieToken = cookie.parse(req.headers.cookie || '').accessToken
  if (!(req.query.accessToken || req.headers['x-access-token']) && cookieToken) {
    // jwtSession does not scan cookies, so overwrite onto header:
    req.headers['x-access-token'] = cookieToken
    previousToken = cookieToken
  }
  const qry = req.query
  log.debug('got previous token: ', previousToken)
  if (req.url === '/login') {
    send(res, 200, '<html>showing login screen, <a href="/login?username=x&password=x">LOGIN WITH CREDS</a></html>')
    return
  }
  let token = previousToken
  if (req.url.indexOf('/login') > -1 || req.url.indexOf('/logout') > -1) {
    log.debug('calling auth service')
    token = await request({
      uri: `http://${env.AUTH_HOST || 'localhost'}:3001/?accessToken=${previousToken}`,
      body: qry,
      json: true
    })
    if (!token) {
      log.debug('no token found, probably logged out, unsetting cookie and sending to logout screen')
      res.setHeader('Set-Cookie', cookie.serialize('accessToken', '', {
        httpOnly: true,
        expires: new Date()
      }))
      send(res, 200, '<html>logged out, <a href="/login">LOGIN</a></html>')
      return
    }
    log.debug('auth sent new token: ', token)
  }
  if (token) {
    res.setHeader('Set-Cookie', cookie.serialize('accessToken', token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7 // 1 week
    }))
  }
  if (token !== previousToken) {
    log.debug('token changed, probably just logged in again, forwarding to /')
    res.writeHead(301, {Location: '/'})
    send(res, 301)
    return
  }
  return token
}

function wrapTimer (name) {
  return val => {
    timers[name] = Date.now() - timers._start
    return val
  }
}

module.exports = async function(req, res) {
  if (req.url === '/favicon.ico') return send(res, 404)
  const startTime = Date.now()
  await expressify(req, res)
  const qry = req.query
  const aggregateRes = {}
  const aggregateReq = {hello: {}, world: {}}
  log.debug('got url: ', req.url)
  log.debug('got qry: ', qry)
  // handle auth actions
  const authTime = Date.now()
  let token
  token = await handleAuth(req, res, send)
  if (req.url !== '/' && !token) return
  log.debug('got auth token: ', token)
  aggregateRes.authTime = Date.now() - authTime
  // lets exit when we have no token by this stage
  // get services aggregate
  timers._start = Date.now()
  try {
    const _res = await Promise
      .all([
        request({
          uri: `http://${env.HELLO_HOST || 'localhost'}:3010`,
          headers: {'x-access-token': token},
          body: aggregateReq.hello,
          json: true
        }).then(wrapTimer('hello')),
        request({
          uri: `http://${env.WORLD_HOST || 'localhost'}:3011`,
          headers: {'x-access-token': token},
          body: aggregateReq.world,
          json: true
        }).then(wrapTimer('world')),
      ])
    aggregateRes.hello = {res: _res[0], time: timers.hello}
    aggregateRes.world = {res: _res[1], time: timers.world}
    aggregateRes.totalTime = Date.now() - startTime
    log.debug('sending aggregate results: ', aggregateRes)
    send(res, 200, aggregateRes)
  } catch (e) {
    log.debug('got error: ', e.message)
    if (e.statusCode === 401) {
      send(res, 401, '<html>unauthorized, <a href="/login">LOGIN</a></html>')
    } else {
      throw e
    }
  }
}

if (require.main === module) {
  const srv = micro(module.exports)
  srv.listen(3000)
  log.debug('"api" listening on port 3000')
}
