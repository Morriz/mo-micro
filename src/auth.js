import createLogger from './lib/log'
const log = createLogger('auth')
import {send} from 'micro-core'
import jwtSession from './lib/jwt-session'

module.exports = async function(req, res) {
  log.debug('got url: ', req.url)
  await jwtSession(req, res)
  const data = req.body
  log.debug('got data: ', data)
  let token
  if (data.username && data.password) {
    req.jwtSession.user = data
    // this will be attached to the JWT
    var claims = {
      iss: 'my application name',
      aud: 'myapplication.com',
    }
    token = await new Promise((resolve, reject) => {
      req.jwtSession.create(claims, (err, token) => {
        err && reject(err)
        resolve(token)
      })
    })
    log.debug('created token: ', token)
  } else {
    log.debug('logging out user: ', req.jwtSession.user)
    req.jwtSession.destroy()
    token = null
  }
  send(res, 200, token)
}
