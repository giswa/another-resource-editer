import fs from 'fs';
import path from 'path';
import { Json2XML } from '../azure/data.js';

const testJsonPath = path.join(process.cwd(), 'test.json');

export const loadResources = () => {
  const data = fs.readFileSync(testJsonPath, 'utf8');
  return JSON.parse(data).resources;
};

export const saveResources = (resources) => {
  const data = { resources };
  fs.writeFileSync(testJsonPath, JSON.stringify(data, null, 2));
  Json2XML(resources);
};
