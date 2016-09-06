import createLogger from './lib/log'
const log = createLogger('world')
import {send} from 'micro-core'
import jwtSession from './lib/jwt-session'

// authenticated service
module.exports = async function(req, res) {
  await jwtSession(req, res)
  log.debug('got session: ', req.jwtSession)
  if (!req.jwtSession.id) {
    const err = new Error('no session!')
    err.statusCode = 401
    throw err
  }
  send(res, 200, {response: 'world!', authenticated: true, jwtSession: req.jwtSession})
}
