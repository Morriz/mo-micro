import createLogger from './lib/log'
const log = createLogger('world')
import micro, {send} from 'micro-core'
import jwtSession from './lib/jwt-session'

// authenticated service
module.exports = async function(req, res) {
  await jwtSession(req, res)
  if (!req.jwtSession.id) send(res, 401, 'no session!')
  else send(res, 200, {response: 'world!', authenticated: true, jwtSession: req.jwtSession})
}

if (require.main === module) {
  const srv = micro(module.exports)
  srv.listen(3011)
  log.debug('"world" listening on port 3011')
}
