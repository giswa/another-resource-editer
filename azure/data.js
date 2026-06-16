const rootURL = process.env.REACT_APP_API_URL ;

export async function Xml2Json(datasource, url, lang, key, valid , comment){
    
    console.log( "loading" , url);
    
    //console.timeLog();
    let data = '';
    try {
        //fetch file
        await fetch(`${rootURL}/items?path=${url}`)
            .then(res => {
                if (res.ok) {
                    return res.text()   
                }
                throw new Error('Bad reponse')
            })
            .then((d) => {
                data = d;
            })
            .catch(err => { throw err });
        }
        catch (error) {
        console.error(error);
        return [] ;
    }

        const parser = new DOMParser();
        const doc = parser.parseFromString(data, "application/xml");

        const errorNode = doc.querySelector("parsererror");
        if (errorNode) {
            throw new Error("error while parsing");
        } 
        else {
            
            const arr =  [] ;
            doc.querySelectorAll("data").forEach(
                (node) => {  
                    // filter non text rows and thoses begining with ">>"
                    if (  node.getAttribute('type') == null && !  node.getAttribute('name').startsWith(">>") ) {
                        arr.push( matchTrad(node, datasource, lang, url) );
                    }
                });
            return arr ;

        } 
}

/*
*  Get nodes from .resx files and transfer them in a readable object
*/
function matchTrad(node, datasource, lang,url) {
    let translations = [];
   
    //key is the name attribute
    let key = node.getAttribute('name');
    let value = node.getElementsByTagName("value")[0]?.textContent.toString()
    let encodedMedata = node.getElementsByTagName("comment")[0]?.textContent.toString()
    let info = splitCommentToInfo(encodedMedata) ;
    // console.log(datasource,lang, key, comment, validation)

    return {
        path: url,
        datasource: datasource,
        key : key,
        lang : lang,
        value : value ,
        info: info 
    };
}


function splitCommentToInfo(encoded){

    let editor = '';
    let validation = false;
    let date = '' ;
    let comment = '' ;

    if (encoded){
        //If comment and validation
        if (encoded.indexOf("|") >= 0 ) {
            let commentArray = encoded.split('|');

            //Check if there's a validation
            if (commentArray[1]) {
                validation = true;
                let editorName = commentArray[1].split(':');
                    
                if (editorName[1]) {
                    editor = editorName[1].trim();
                }
            }

            comment = commentArray[0];

            if (comment.indexOf(",") > 0 ){
                const c = comment.split(",") ;
                comment = c[0] ;
                date = c[1] ;
            }

        } else { //Else only validation
            validation = true;
            let editorArray = encoded.split(':');
            
            if (editorArray[1]) {
                editor = editorArray[1].trim();
            }

        }
    }

    return { validation: validation, date: date, editor: editor, comment: comment }

}

function mergeInfoToComment(info){


    let editor = "" 
    let date = ""
    let valid = ""
    let comment = ""

    if ( info.validation )  
        valid = "|OK" ;
    
    if ( info.comment )  
        comment = info.comment ;

    if ( info.editor )  
        editor = `:${info.editor}` ;
    
    if ( info.date )  
        date = `,${info.date}` ;

    return `${comment}${date}${valid}${editor}` ;

}



function getObjectId(response, branchPath = "refs/heads/master") {
  const branch = response.value.find(ref => ref.name === branchPath);
  
  return branch ? branch.objectId : null;
}


// save change into XML
export async function Json2XML(translation){
   
    // get git last commit ID
    const ref = await fetch(`${rootURL}/refs`)
    let refdata = '';
    if (ref.ok) {
        refdata = await ref.text()
    }
    else {
        throw new Error('Bad reponse')
    }

    let oldObjectId = getObjectId(JSON.parse(refdata), "refs/heads/master");

    try {
        // first reload all original source file 
        let changes = [] ;
        let commitMessage = "" ;
        // transform in array
        let t = [] ;
        Object.keys(translation).forEach((lang, idx, arr) => {
            if ( translation[lang].hasOwnProperty('lang') ) { // not a tranlation object 
                t.push(translation[lang]) ;
                // hack 
                if (lang == 'fr') commitMessage = translation[lang].info.comment ;
            }
        })

        for( let trans of t ){   
            //console.timeLog();
            //fetch file
            await fetch(`${rootURL}/items?path=${trans.path}`)
            .then(res => {
                if (res.ok) {
                    // console.log(res)
                    return res.text()   
                }

            throw new Error('Bad reponse')
            })
            .then((xml) => {

                // Change the value node and the comment
                const updatedXML = updateOrInsertResxEntry(xml, translation.key, trans.value , mergeInfoToComment(trans.info) );
                
                if ( updatedXML != xml  )
                    changes.push(  {
                        "changeType": "edit",
                        "item": {
                            "path": trans.path
                        },
                        "newContent": {
                            "content": updatedXML , 
                            "contentType": "rawtext"
                        }
                    }) ;
                
            })
            .catch(err => { throw err });      
        }
        
        // if any changes
        if (changes.length > 0 ) {
            let body = {
                "refUpdates": [
                    {
                        "name": "refs/heads/master",
                        "oldObjectId": oldObjectId
                    }
                ],
                "commits": [
                    {
                        "comment": commitMessage,
                        "changes": changes
                    }
                ]
            }
            
            // send xml throught api 
            // console.log("sending change")

            const requestOptions = {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body)
            };

            // resx mock is having a 100ko limit in the body
            const res = await fetch(`${rootURL}/pushes?api-version=6.0`, requestOptions)
            if (res.ok) {
                return { ok: true, error: null } ;
            } else {
                throw new Error(`received status: ${res.status}`);
            }
        }
    } catch (error) {

        return { ok: false , error: error.message } ;
    }

}



function updateOrInsertResxEntry(xml, key, newValue, newComment) {

    // fail safe for null/undefined values
    if (!newValue) newValue = "" ;
    if (!newComment) newComment = "" ;   

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const dataRegex = new RegExp(
    `<data[^>]*name="${escapedKey}"[^>]*>[\\s\\S]*?<\\/data>`,
    "i"
  );

  //console.log(xml.match(dataRegex));

  if (dataRegex.test(xml)) {
    // console.log("found <data> node");
    return xml.replace(dataRegex, (dataBlock) => {
      let updated = dataBlock;
       // console.log(dataBlock)
      // VALUE (force replace no matter what form)
      const valueRegex = /<value\b[^>]*\/>|<value\b[^>]*>[\s\S]*?<\/value>/i;

      if (valueRegex.test(updated)) {
        updated = updated.replace(
          valueRegex,
          `<value>${escapeXml(newValue)}</value>`
        );
      } else {
        // fallback: insert value if missing
        updated = updated.replace(
          /(<data[^>]*>)/i,
          `$1\n  <value>${escapeXml(newValue)}</value>`
        );
      }
      // console.log(updated)
      // COMMENT
      if (newComment !== undefined) {
        const commentRegex = /<comment\b[^>]*>[\s\S]*?<\/comment>/i;

        if (commentRegex.test(updated)) {
          //console.log("found comment, replacing" )
          updated = updated.replace(
            commentRegex,
            `<comment>${escapeXml(newComment)}</comment>`
          );
        } else {
          //  console.log("inserting comment" )
          updated = updated.replace(
            /(<\/value>)/i,
            `$1\n  <comment>${escapeXml(newComment)}</comment>`
          );
        }
      }
      // console.log( updated );
      return updated;
    });
  }

  
  // if <data> node was not found
  // insert new last node (before </root> tag)
  const newEntry = `<data name="${key}" xml:space="preserve">
    <value>${escapeXml(newValue)}</value>${
      newComment !== undefined
        ? `\n    <comment>${escapeXml(newComment)}</comment>`
        : ""
    }
  </data>`;

  return xml.replace(/<\/root>/i, `${newEntry}\n</root>`);

}



function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
