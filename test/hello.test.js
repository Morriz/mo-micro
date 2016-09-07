import serve from 'micro-core'
import test from 'ava'
import listen from 'test-listen'
import request from 'request-promise'
import api from '../src/hello'

test('my endpoints', async t => {
  const server = serve(api)
  const url = await listen(server)
  const body = await request({uri: url, body: {test: true}, json: true})
  t.deepEqual(body, {response: 'hello', authenticated: false})
})
