const serve = require('micro-core')
const test = require('ava')
const listen = require('test-listen')
const request = require('request-promise')
const api = require('../src/hello')

test('my endpoints', async t => {
  const url = await listen(serve(api))
  const body = await request({uri: url, body: {test: true}, json: true})
  console.log('got body: ', body)
  t.deepEqual(body, '{response: "hello world!"}')
})
