import { XMLParser } from 'fast-xml-parser';
import { fetchFile, getObjectId, saveFiles } from 'git-storage-api';

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true
});

export async function Xml2Json(datasource, path, lang){
    let data = '';
    try {
        data = await fetchFile(path);
    } catch (error) {
        console.error(error);
        return [];
    }

    try {
        const parsed = xmlParser.parse(data);
        const dataElements = Array.isArray(parsed?.root?.data)
            ? parsed.root.data
            : parsed?.root?.data
                ? [parsed.root.data]
                : [];

        return dataElements
            .filter((node) => !node?.['@_type'] && !node?.['@_name']?.startsWith('>>'))
            .map((node) => matchTrad(node, datasource, lang, path));
    } catch (error) {
        console.error(error);
        throw new Error('error while parsing');
    }
}


function matchTrad(node, datasource, lang, path) {
    const key = node?.['@_name'] ?? '';
    const value = normalizeValue(node?.value);
    const encodedMetadata = normalizeValue(node?.comment);
    const info = splitCommentToInfo(encodedMetadata);

    return {
        path,
        datasource,
        key,
        lang,
        value,
        info
    };
}

function normalizeValue(value) {
    if (Array.isArray(value)) {
        return value[0] ?? '';
    }

    return value ?? '';
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




// save change into XML
export async function Json2XML(translations, commitMessage) {

    const input = translations;
    const result = {};

    for (let i = 0; i < input.length; i++) {
        const item = input[i];

        // Each item is an object with one key, such as "fr" or "de"
        const languageKey = Object.keys(item)[0];

        // Get the object stored under that language key
        const entry = item[languageKey];

        // Use the file path as the group name
        const filePath = entry.path;

        // If this path has not been seen yet, create an array for it
        if (!result[filePath]) {
            result[filePath] = [];
        }

        // Add the normalized object to the right group
        result[filePath].push(entry);
        result[filePath]["content"] = ""; // Initialize content for each file path
    }

    //console.log(result);

    await sendTranslations(result, commitMessage)

}

async function sendTranslations(translations, commitMessage) {

    // get last commit ID
    const oldObjectId = await getObjectId();
        
    let changes = [] ;
    
    for (const path in translations) {
        // console.log(`Processing translations for file: ${path}`);
        // first reload all original source file 
        let xml = await fetchFile( path ) ;

        // loop through all translations for this file
        for( const trans of translations[path] ){   
            // console.log(`Processing key: ${trans.key} with value: ${trans.value}`) ;
            // Change the value node and the comment
            xml = updateOrInsertResxEntry(xml, trans.key, trans.value , mergeInfoToComment(trans.info) );
        }
        translations[path].content = xml ;
    }

    await saveFiles( translations, oldObjectId, commitMessage )
   
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
