import createLogger from './lib/log'
const log = createLogger('hello')
import {json, send} from 'micro-core'

// unauthenticated service
module.exports = async function(req, res) {
  const data = await json(req)
  log.debug('got data: ', data)
  send(res, 200, {response: 'hello', authenticated: false})
}
