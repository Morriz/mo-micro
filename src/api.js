import createLogger from './lib/log'
import micro, {send} from 'micro-core'
import request from 'request-promise'
import cookie from 'cookie'
import expressify from './lib/expressify'
const log = createLogger('api')

const timers = {}

async function handleAuth (req, res, token, send) {
  const qry = req.query
  if (req.url === '/login') {
    send(res, 200, '<html>showing login screen, <a href="/login?username=x&password=x">LOGIN WITH CREDS</a></html>')
    return
  }
  log.debug('calling auth service, awaiting token')
  if (req.url !== '/logout' || !token) {
    token = await request({uri: `http://localhost:3001/?accessToken=${token}`, body: qry, json: true})
  }
  if (!token) {
    log.debug('no token found, probably logged out, unsetting cookie and sending to logout screen')
    res.setHeader('Set-Cookie', cookie.serialize('accessToken', '', {
      httpOnly: true,
      expires: new Date()
    }))
    send(res, 200, '<html>logged out, <a href="/login">LOGIN</a></html>')
    return
  }
  log.debug('got token: ', token)
  res.setHeader('Set-Cookie', cookie.serialize('accessToken', token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7 // 1 week
  }))
  return token
}

function wrapTimer (name) {
  return val => {
    timers[name] = Date.now() - timers._start
    return val
  }
}

module.exports = async function(req, res) {
  if (req.url === '/favicon.ico') return
  const startTime = Date.now()
  await expressify(req, res)
  let token = req.query.accessToken || req.headers['x-access-token']
  // allow cookie based:
  const cookieToken = cookie.parse(req.headers.cookie || '').token
  if (!(req.query.accessToken || req.headers['x-access-token']) && cookieToken) {
    // jwtSession does not scan cookies, so overwrite onto header:
    req.headers['x-access-token'] = cookieToken
  }
  const qry = req.query
  const aggregateRes = {}
  const aggregateReq = {hello: {}, world: {}}
  try {
    log.debug('got previous token: ', token)
    log.debug('got url: ', req.url)
    log.debug('got qry: ', qry)
    // if we are the home page, pass, else it must be auth stuff
    if (req.url !== '/' && (!token || (qry.username && qry.password) || req.url === '/logout')) {
      // handle auth actions
      const authTime = Date.now()
      token = await handleAuth(req, res, token, send)
      log.debug('got new token: ', token)
      aggregateRes.authTime = Date.now() - authTime
      if (!token) return
    }
    // get services aggregate
    timers._start = Date.now()
    const _res = await Promise
      .all([
        request({
          uri: 'http://localhost:3010',
          headers: {'x-access-token': token},
          body: aggregateReq.hello,
          json: true
        }).then(wrapTimer('hello')),
        request({
          uri: 'http://localhost:3011',
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
      res.writeHead(301, {Location: '/login'})
      send(res, 301)
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
