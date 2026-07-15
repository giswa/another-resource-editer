import { XMLParser } from 'fast-xml-parser';
import { getObjectId, fetchFile, saveFiles, rootURL } from 'git-storage-api/azure';
import { fetchFile as getLocalFile, saveFiles as setLocalFile, setRootDir } from 'git-storage-api/localsytem';

const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true
});

export const loadResources = async (filePath = 'Sample.resx') => {

  let data = '';
  try {
      data = await getLocalFile(filePath);
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
        .map((node) => ({
          name: node?.['@_name'] ?? '' ,
          value: node?.value ,
          comment: node?.comment ,
          enabled: true
        }));

  } catch (error) {
      console.error(error);
      throw new Error('error while parsing');
  }

};

export const saveResources = async (resources, filePath = 'Sample.resx') => {
  try {

    const result = {};
    result[filePath] = resources ;

    await sendTranslations(result, "commit message")

    

  } catch (error) {
    console.error('Error saving resources:', error);
  }
};


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
            // console.log(`Processing key: ${trans.name} with value: ${trans.value}`) ;
            // Change the value node and the comment
            xml = updateOrInsertResxEntry(xml, trans.name, trans.value , trans.comment );
        }
        // store the updated xml back to translations object
        // overwriting the original array with the updated XML content
        translations[path] = xml ;
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