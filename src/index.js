const {send} = require('micro-core')
const request = require('request-promise')
const cookie = require('cookie')
const expressify = require('./lib/expressify')

module.exports = async function(req, res) {
  await expressify(req, res)
  let token = req.headers['x-access-token'] || req.query.accessToken
  const aggregateReq = {hello: {}, world: {}}
  const qry = req.query
  try {
    console.log('got url: ', req.url)
    console.log('got qry: ', qry)
    if (!token || qry.username || qry.password || req.url === '/login' || req.url === '/logout') {
      if (req.url !== '/logout' && !(qry.username && qry.password)) {
        return send(res, 200, 'showing login screen')
      }
      // do auth first
      console.log('authenticating')
      token = await request({uri: 'http://localhost:3001', body: qry, json: true})
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
    }
    const _res = await Promise
      .all([
        request({uri: 'http://localhost:3011', body: aggregateReq.hello, json: true}),
        request({uri: 'http://localhost:3012', headers: {'x-access-token': token}, body: aggregateReq.world, json: true}),
      ])
    console.log('got results: ', _res)
    const aggregateRes = {hello: _res[0], world: _res[1]}
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
