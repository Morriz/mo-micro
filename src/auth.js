const {send} = require('micro-core')
const jwtSession = require('./lib/jwt-session')

module.exports = async function(req, res) {
  console.log('got url: ', req.url)
  await jwtSession(req, res)
  const data = req.body
  console.log('got data: ', data)
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
    console.log('created token: ', token)
  } else {
    console.log('logging out user: ', req.jwtSession.user)
    req.jwtSession.destroy()
    token = null
  }
  send(res, 200, token)
}