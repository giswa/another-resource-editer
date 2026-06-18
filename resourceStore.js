import fs from 'fs';
import path from 'path';
import { parseStringPromise, Builder } from 'xml2js';

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
    resources.forEach((resource) => {
      const dataElement = parsed.root.data.find(d => d.$.name === resource.name);
      if (dataElement) {
        dataElement.value = [resource.value];
        dataElement.comment = [resource.comment];
      }
    });
    
    const builder = new Builder();
    const xml = builder.buildObject(parsed);
    
    // Push changes to Azure DevOps via REST API
    await pushToAzureDevOps(xml);
    
  } catch (error) {
    console.error('Error saving resources:', error);
  }
};

const pushToAzureDevOps = async (xmlContent) => {
  try {
    const commit = {
      refUpdates: [
        {
          name: `refs/heads/${ADO_CONFIG.branch}`,
          oldObjectId: '0000000000000000000000000000000000000000' // Will be resolved by server
        }
      ],
      commits: [
        {
          comment: 'Update Sample.resx via ink-resources-editor',
          changes: [
            {
              changeType: 2, // Edit
              item: {
                path: '/data/Sample.resx'
              },
              newContent: {
                content: xmlContent,
                contentType: 1 // RawText
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(
      `${ADO_CONFIG.apiUrl}/pushes`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commit)
      }
    );

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Successfully pushed to Azure DevOps:', result);
    return result;
  } catch (error) {
    console.error('Error pushing to Azure DevOps:', error);
    throw error;
  }
};
