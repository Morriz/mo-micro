const url = require('url')

module.exports = async function(req, res) {
  req.query = url.parse(req.url || '', true).query
  req.get = param => req.headers[param]
  // convert stream
  return new Promise((resolve, reject) => {
    req.data = ''
    req.on('data', chunk => req.data += chunk)
    req.on('end', () => {
      // parse json if necessary
      if (req.data && (req.data.indexOf('{') === 0 || req.data.indexOf('[') === 0)) {
        req.body = JSON.parse(req.data)
      }
      resolve()
    })
    req.on('error', reject)
  })
}
