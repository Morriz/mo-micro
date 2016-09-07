import createLogger from './lib/log'
const log = createLogger('hello')
import micro, {json, send} from 'micro-core'

// unauthenticated service
module.exports = async function(req, res) {
  const data = await json(req)
  log.debug('got data: ', data)
  send(res, 200, {response: 'hello', authenticated: false})
}

if (require.main === module) {
  const srv = micro(module.exports)
  srv.listen(3010)
  log.debug('"hello" listening on port 3010')
}
