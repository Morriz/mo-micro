import createLogger from './lib/log'
const log = createLogger('auth')
import micro, {send} from 'micro-core'
import jwtSession from './lib/jwt-session'

module.exports = async function(req, res) {
  await jwtSession(req, res)
  const data = req.body
  log.debug('got data: ', data)
  let token
  if (data.username && data.password) {
    log.debug('logging in user: ', data)
    req.jwtSession.user = data
    // this will be attached to the JWT
    var claims = {
      iss: 'your app name',
      aud: 'yourapp.com',
    }
    token = await new Promise((resolve, reject) => {
      req.jwtSession.create(claims, (err, token) => {
        err && reject(err)
        resolve(token)
      })
    })
    log.debug('created token: ', token)
  } else if (req.jwtSession.id) {
    log.debug('logging out user: ', req.jwtSession.user)
    req.jwtSession.destroy()
    token = null
  } else {
    log.debug('no session found, unsetting token: ', token)
    token = null
  }
  send(res, 200, token)
}

if (require.main === module) {
  const srv = micro(module.exports)
  srv.listen(3001)
  log.debug('"auth" listening on port 3001')
}

