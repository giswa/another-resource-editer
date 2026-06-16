const url =  require('url');
const fs = require('fs');
const path = require('path');

module.exports = function (request, response) {

    // console.log("Resx Mock: running in", __dirname);
    // send response from file GET.json
    // var filePath = path.join(dataFolder, request.query.path);
    console.log("Tree ID: ", request.params.objectid);
    let r = {
  "objectId": "a2390489728b0a2aa44c2a6f36cf1df431b90160",
  "url": "htto://localhost:3000/trees/a2390489728b0a2aa44c2a6f36cf1df431b90160",
  "treeEntries": [
    {
      "objectId": "d3ab27db8e8d469e5f8a3814f64de060fc977776",
      "relativePath": "Sample.resx",
      "mode": "100644",
      "gitObjectType": "blob",
      "url": "http://localhost:3000/blobs/d3ab27db8e8d469e5f8a3814f64de060fc977776",
      "size": 1849
    },
    {
      "objectId": "8f686a3b016054e0057652edc22c3fd126f9f2da",
      "relativePath": "Sample.de.resx",
      "mode": "100644",
      "gitObjectType": "blob",
      "url": "http://localhost:3000/blobs/8f686a3b016054e0057652edc22c3fd126f9f2da",
      "size": 6861
    },
    {
      "objectId": "ee0f938c4998e7c443a90df420446c546beff18a",
      "relativePath": "Sample.it.resx",
      "mode": "100644",
      "gitObjectType": "blob",
      "url": "http://localhost:3000/blobs/ee0f938c4998e7c443a90df420446c546beff18a",
      "size": 6873
    }
  ],
  "size": 1753,
  "_links": {
    "self": {
      "href": "http://localhost:3000/trees/a2390489728b0a2aa44c2a6f36cf1df431b90160"
    },
    "repository": {
      "href": "http://localhost:3000"
    },
    "treeEntries": [
      {
        "href": "http://localhost:3000/blobs/d3ab27db8e8d469e5f8a3814f64de060fc977776"
      },
      {
        "href": "http://localhost:3000/blobs/8f686a3b016054e0057652edc22c3fd126f9f2da"
      },
      {
        "href": "http://localhost:3000/blobs/ee0f938c4998e7c443a90df420446c546beff18a"
      }
    ]
  }
}




    response.json(r)
 
  }
