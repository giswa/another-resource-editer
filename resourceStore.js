import fs from 'fs';
import path from 'path';
import { Json2XML } from '../azure/data.js';

const testJsonPath = path.join(process.cwd(), 'test.json');

export const loadResources = () => {
  const data = fs.readFileSync(testJsonPath, 'utf8');
  return JSON.parse(data).resources;
};

export const saveResources = (resources) => {
  // const data = { resources };
  // fs.writeFileSync(testJsonPath, JSON.stringify(data, null, 2));
  for (const resource of resources) {
    if (resource.enabled) {
      console.log(`Resource ${resource.id} is enabled. Saving changes...`);
    } else {
      console.log(`Resource ${resource.id} is disabled. Skipping save.`);
      continue ; // Skip saving this resource
    }
    // Call Json2XML to save changes
    let translation = { "fr": { datasource: "Sample", path: "Sample.resx", key: resource.name , 
                                lang: "fr", value: resource.value, info: { comment: resource.comment } } };
    Json2XML(translation);
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



};
