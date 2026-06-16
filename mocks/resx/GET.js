const url =  require('url');
const fs = require('fs');
const path = require('path');

module.exports = function (request, response) {

  console.log("Resx Mock: running in", __dirname);
  // send response from file GET.json
  var filePath = path.join(__dirname,'..', '..', 'data', request.query.f);
  console.log("Resx Mock: loading file: ", filePath);
  // If file does not exist then respond with 404 header
  try {
    fs.accessSync(filePath);
  }
  catch (err) {
    response.statusCode = 404;
    response.end();
    return;
  }

  const stat = fs.statSync(filePath);
  response.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': stat.size
  });

  const readStream = fs.createReadStream(filePath);
  // We replaced all the event handlers with a simple call to readStream.pipe()
  readStream.pipe(response);

}