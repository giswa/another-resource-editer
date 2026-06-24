import fs from 'fs';
import path from 'path';
import { parseStringPromise, Builder } from 'xml2js';
import { Json2XML } from '../azure/data.js';

const resxPath = path.join(process.cwd(), 'data', 'Sample.resx');

// Azure DevOps Configuration
const ADO_CONFIG = {
  organization: 'my_organisation',
  project: 'test',
  repository: 'localization',
  branch: 'master',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8080/api'
};

export const loadResources = async () => {
  try {
    const data = fs.readFileSync(resxPath, 'utf8');
    const parsed = await parseStringPromise(data);
    
    const dataElements = parsed.root.data || [];
    return dataElements
      .filter(d => !d.$.type) // Filter out binary data
      .map((d) => ({
        name: d.$.name,
        value: d.value ? d.value[0] : '',
        comment: d.comment ? d.comment[0] : '',
        enabled: true
      }));
  } catch (error) {
    console.error('Error loading resources:', error);
    return [];
  }
};

export const saveResources = async (resources) => {
  try {
    const data = fs.readFileSync(resxPath, 'utf8');
    const parsed = await parseStringPromise(data);
    
    // Update data elements
    for (const resource of resources) {

      if (resource.enabled) {
        console.log(`Resource ${resource.name} is enabled. Saving changes...`);
      } else {
        console.log(`Resource ${resource.name} is disabled. Skipping save.`);
        continue ; // Skip saving this resource
      }
      // Call Json2XML to save changes
      let translation = { "fr": { datasource: "Sample", path: "Sample.resx", key: resource.name , 
                                  lang: "fr", value: resource.value, info: { comment: resource.comment } } };
      await Json2XML(translation);
     
    }
    
    /*

    fr:
      lang: "fr"
      path: "Sample.resx"
      datasource: "Sample"
      key: "HeaderString2"
      value: "Model"
      info: 
        comment: "comment"
        date: "date"
        editor: "user"
        validation: true

    */

    
  } catch (error) {
    console.error('Error saving resources:', error);
  }
};
