import {send} from 'micro-core'
import request from 'request-promise'
import cookie from 'cookie'
import expressify from './lib/expressify'

const timers = {}

async function handleAuth (req, res, token, send) {
  const qry = req.query
  if (!token && req.url !== '/logout' && !(qry.username && qry.password)) {
    send(res, 200, 'showing login screen')
    return
  }
  console.log('authenticating')
  if (!token) {
    // do auth first
    token = await request({uri: 'http://localhost:3001', body: qry, json: true})
  }
  if (!token) {
    res.setHeader('Set-Cookie', cookie.serialize('accessToken', '', {
      httpOnly: true,
      maxAge: 1
    }))
    send(res, 200, 'logged out')
    return
  }
  console.log('got token: ', token)
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
  const startTime = Date.now()
  await expressify(req, res)
  console.log('expressify took: ', Date.now() - startTime)
  let token = req.headers['x-access-token'] || req.query.accessToken
  const qry = req.query
  const aggregateRes = {}
  const aggregateReq = {hello: {}, world: {}}
  try {
    console.log('got url: ', req.url)
    console.log('got qry: ', qry)
    // check auth
    if (!token || qry.username || qry.password || req.url === '/login' || req.url === '/logout') {
      const authTime = Date.now()
      token = await handleAuth(req, res, token, send)
      aggregateRes.authTime = Date.now() - authTime
      if (!token) return
    }
    // get services aggregate
    timers._start = Date.now()
    const _res = await Promise
      .all([
        request({
          uri: 'http://localhost:3011',
          headers: {'x-access-token': token},
          body: aggregateReq.hello,
          json: true
        }).then(wrapTimer('hello')),
        request({
          uri: 'http://localhost:3012',
          headers: {'x-access-token': token},
          body: aggregateReq.world,
          json: true
        }).then(wrapTimer('world')),
      ])
    console.log('got results: ', _res)
    aggregateRes.hello = {res: _res[0], time: timers.hello}
    aggregateRes.world = {res: _res[1], time: timers.world}
    aggregateRes.totalTime = Date.now() - startTime
    send(res, 200, aggregateRes)
  } catch (e) {
    console.log('got error: ', e.message)
    if (e.statusCode === 401) {
      res.writeHead(301, {Location: '/login'})
      send(res, 301)
    } else {
      throw e
    }
  }
}
