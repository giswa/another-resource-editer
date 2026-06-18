import fs from 'fs';
import path from 'path';
import { parseStringPromise, Builder } from 'xml2js';

const resxPath = path.join(process.cwd(), 'data', 'Sample.resx');

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
    resources.forEach((resource) => {
      const dataElement = parsed.root.data.find(d => d.$.name === resource.name);
      if (dataElement) {
        dataElement.value = [resource.value];
        dataElement.comment = [resource.comment];
      }
    });
    
    const builder = new Builder();
    const xml = builder.buildObject(parsed);
    fs.writeFileSync(resxPath, xml, 'utf8');
  } catch (error) {
    console.error('Error saving resources:', error);
  }
};
