const url =  require('url');
const fs = require('fs');
const path = require('path');

module.exports = function (request, response) {

  console.log("POST Resx Mock: running in", __dirname);
  // write file change in the actual folder storage 
  // call is =>  body: JSON.stringify({ xml: output })
  if( request.body.xml ){
    console.log("saving to:" , request.query)
    fs.writeFile(
      path.join(__dirname,'..', '..', 'data', request.query.f), 
      request.body.xml,
      err => {
          if (err) {
              console.error(err);
              response.statusCode = 500;
              response.end();
              return;
          } else {
            console.log("Saved")
            response.statusCode = 200;
            response.end();
            return;
          }
      }
    );
  } else {
    console.log("Empty query", request.body)

  }
}