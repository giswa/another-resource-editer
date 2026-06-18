const url =  require('url');
const fs = require('fs');
const path = require('path');

module.exports = async function (request, response) {

    const callback = ( err => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('File written successfully');
    })

    const sleep = ms => new Promise( resolve => setTimeout(resolve, ms));

    // write full payload to post.json file

    var dataFolder = path.join(__dirname,'..', '..', '..','data')
    

    for ( let commit of request.body.commits )
    {
        if ( !commit.comment )
        {
            console.error("commit comment is missing")
            response.statusCode = 500
            response.end();
            return;
        }

        for ( let change of commit.changes){
            let  filePath = path.join(dataFolder, change.item.path );
            console.log("Writting:", filePath);
            fs.writeFile( filePath , change.newContent.content, callback) ;
        }
    }

    await sleep(1500);

    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
        pushId: Math.floor(Math.random() * 100000),
        commits: request.body.commits,
        refUpdates: request.body.refUpdates,
        repository: 'localization',
        pushedBy: 'ink-resources-editor',
        createdDate: new Date().toISOString()
    }));
    return;
}