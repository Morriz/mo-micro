import {json, send} from 'micro-core'

// unauthenticated service
module.exports = async function(req, res) {
  const data = await json(req)
  console.log('got data: ', data)
  send(res, 200, {response: 'hello', authenticated: false})
}
