
import { Json2XML, Xml2Json } from './data.js';

export const loadResources = async () => {
  try {
    const resources = await Xml2Json('Sample', 'Sample.resx', 'fr');

    return resources.map((resource) => ({
      name: resource.key,
      value: resource.value ?? '',
      comment: resource.info?.comment ?? '',
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
