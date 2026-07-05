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
    const value = node?.value;
    const info = splitCommentToInfo(lang, node?.comment);

    return {
        path,
        datasource,
        key,
        lang,
        value,
        info
    };
}


function splitCommentToInfo(lang, encodedComment){
    let editor = '';
    let validation = false;
    let date = '' ;
    let comment = '' ;

    if (encodedComment){
         // console.log(encoded)

         // default language contains main comment
         if ( lang == 'fr' ) {
            // Ensure a split separator
            encodedComment = encodedComment + "|" ;
            comment = encodedComment.split('|')[0].split(',')[0] ;
            date = encodedComment.split('|')[0].split(',')[1] ;
            let valid_info = encodedComment.split("|")[1] ;
            if ( valid_info) {
                validation = true ;
                let editorArray = encodedComment.split(':');
                if (editorArray[1]) {
                    editor = editorArray[1].trim();
                }
            }

         } else {
            if (encodedComment) {
                validation = true ;
                let editorArray = encodedComment.split(':');
                if (editorArray[1]) {
                    editor = editorArray[1].trim();
                }
            }
         }

    }

    return { validation: validation, date: date, editor: editor, comment: comment }

}

function mergeInfoToComment(lang ,info){

    let editor = "" 
    let date = ""
    let valid = ""
    let comment = ""

    if ( info.validation )  
        valid = "OK" ;
    
    if ( info.comment )  
        comment = info.comment ;

    if ( info.editor )  
        editor = `:${info.editor}` ;
    
    if ( info.date )  
        date = `,${info.date}` ;

    if ( lang == 'fr' ) {
            return `${comment}${date}|${valid}${editor}` ;
    }   else {
            return `${valid}${editor}` ;
    }

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

    // console.log(result);

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
            xml = updateOrInsertResxEntry(xml, trans.key, trans.value , mergeInfoToComment(trans.lang, trans.info) );
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
