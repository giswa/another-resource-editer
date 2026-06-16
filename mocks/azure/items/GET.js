const url =  require('url');
const fs = require('fs');
const path = require('path');

// https://expressjs.com/en/api.html
    // console.dir(request.originalUrl) 
    // console.dir(request.baseUrl) 
    // console.dir(request.path)

module.exports = function (request, response) {

 const dataFolder = path.join(__dirname,'..', '..', '..','data')

  if (request.query.path) {

    // console.log("Resx Mock: running in", __dirname);
    // send response from file GET.json
    var filePath = path.join(dataFolder, request.query.path);
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

  } else if(request.query.scopepath)
  {

    console.log("scopepath: ", request.query.scopepath);
    let r = {
          "count": 1,
          "value": [
            {
              "objectId": "a2390489728b0a2aa44c2a6f36cf1df431b90160",
              "gitObjectType": "tree",
              "commitId": "6975540f166d6f4fa2e5ce915b8b77ef6bbfc1e3",
              "path": "/",
              "isFolder": true,
              "contentMetadata": {
                "fileName": ""
              },
              "url": request.originalUrl + "&versionType=Branch&versionOptions=None"
            }
          ]
        }
        
    // add Azure user data header
    response.header({ 'X-VSS-UserData': 'f987f359-e637-4cca-99b9-3b140b7d1234:Doe'});
    response.json(r) ;


  }



}