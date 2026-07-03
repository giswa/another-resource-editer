
import { parseStringPromise } from 'xml2js';
import { Json2XML, fetchResxFile } from './azure/data.js';

export const loadResources = async () => {
  try {
    const data = await fetchResxFile('Sample.resx');
    // console.log('Fetched data:', data); // Log the fetched data for debugging
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
    
    // create an Array of translations to be saved
    const translations = [];
    for (const resource of resources) {

      if (!resource.enabled) {
        continue ; // Skip saving this resource if not enabled
      }
      
      let translation = { "fr": { datasource: "Sample", path: "Sample.resx", key: resource.name , 
                                  lang: "fr", value: resource.value, info: { comment: resource.comment } } };

      translations.push(translation);
    }
    
    // Call Json2XML to save changes
    await Json2XML(translations, "commit message");

    
  } catch (error) {
    console.error('Error saving resources:', error);
  }
};
