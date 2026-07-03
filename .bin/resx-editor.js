#!/usr/bin/env node

import React, { useState, useEffect } from 'react';
import { render, useInput, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import fs from 'fs';
import path from 'path';
import { parseStringPromise } from 'xml2js';

const rootURL = 'http://localhost:8081/api';
function mergeInfoToComment(info) {
  let editor = "";
  let date = "";
  let valid = "";
  let comment = "";
  if (info.validation) valid = "|OK";
  if (info.comment) comment = info.comment;
  if (info.editor) editor = `:${info.editor}`;
  if (info.date) date = `,${info.date}`;
  return `${comment}${date}${valid}${editor}`;
}
function getObjectId(response, branchPath = "refs/heads/master") {
  const branch = response.value.find(ref => ref.name === branchPath);
  // console.log("branch ID: ", branch?.objectId);
  return branch ? branch.objectId : null;
}

// save change into XML
async function Json2XML(translations, commitMessage) {
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

    // // Create a copy of the entry without the path property
    // const normalizedEntry = { ...entry };

    // // Remove the path from the object because we are grouping by path now
    // delete normalizedEntry.path;

    // Add the normalized object to the right group
    result[filePath].push(entry);
  }

  //console.log(result);

  await sendTranslations(result, commitMessage);
}
async function sendTranslations(translations, commitMessage) {
  // get git last commit ID
  const ref = await fetch(`${rootURL}/refs`);
  let refdata = '';
  if (ref.ok) {
    refdata = await ref.text();
  } else {
    throw new Error('Bad reponse');
  }
  let oldObjectId = getObjectId(JSON.parse(refdata), "refs/heads/master");
  try {
    let changes = [];
    for (const path in translations) {
      // console.log(`Processing translations for file: ${path}`);
      // first reload all original source file 
      //fetch file
      const res = await fetch(`${rootURL}/items?path=${path}`);
      let xml = await res.text();

      // loop through all translations for this file
      for (const trans of translations[path]) {
        // console.log(`Processing key: ${trans.key} with value: ${trans.value}`) ;
        // Change the value node and the comment
        xml = updateOrInsertResxEntry(xml, trans.key, trans.value, mergeInfoToComment(trans.info));
      }
      changes.push({
        "changeType": "edit",
        "item": {
          "path": path
        },
        "newContent": {
          "content": xml,
          "contentType": "rawtext"
        }
      });
    }

    // if any changes
    if (changes.length > 0) {
      let body = {
        "refUpdates": [{
          "name": "refs/heads/master",
          "oldObjectId": oldObjectId
        }],
        "commits": [{
          "comment": commitMessage,
          "changes": changes
        }]
      };

      // send xml throught api 
      // console.log("sending change")

      const requestOptions = {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      };

      // resx mock is having a 100ko limit in the body
      const res = await fetch(`${rootURL}/pushes?api-version=6.0`, requestOptions);
      if (res.ok) {
        return {
          ok: true,
          error: null
        };
      } else {
        throw new Error(`received status: ${res.status}`);
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}
function updateOrInsertResxEntry(xml, key, newValue, newComment) {
  // fail safe for null/undefined values
  if (!newValue) newValue = "";
  if (!newComment) newComment = "";
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dataRegex = new RegExp(`<data[^>]*name="${escapedKey}"[^>]*>[\\s\\S]*?<\\/data>`, "i");

  //console.log(xml.match(dataRegex));

  if (dataRegex.test(xml)) {
    // console.log("found <data> node");
    return xml.replace(dataRegex, dataBlock => {
      let updated = dataBlock;
      // console.log(dataBlock)
      // VALUE (force replace no matter what form)
      const valueRegex = /<value\b[^>]*\/>|<value\b[^>]*>[\s\S]*?<\/value>/i;
      if (valueRegex.test(updated)) {
        updated = updated.replace(valueRegex, `<value>${escapeXml(newValue)}</value>`);
      } else {
        // fallback: insert value if missing
        updated = updated.replace(/(<data[^>]*>)/i, `$1\n  <value>${escapeXml(newValue)}</value>`);
      }
      // console.log(updated)
      // COMMENT
      if (newComment !== undefined) {
        const commentRegex = /<comment\b[^>]*>[\s\S]*?<\/comment>/i;
        if (commentRegex.test(updated)) {
          //console.log("found comment, replacing" )
          updated = updated.replace(commentRegex, `<comment>${escapeXml(newComment)}</comment>`);
        } else {
          //  console.log("inserting comment" )
          updated = updated.replace(/(<\/value>)/i, `$1\n  <comment>${escapeXml(newComment)}</comment>`);
        }
      }
      // console.log( updated );
      return updated;
    });
  }

  // if <data> node was not found
  // insert new last node (before </root> tag)
  const newEntry = `<data name="${key}" xml:space="preserve">
    <value>${escapeXml(newValue)}</value>${newComment !== undefined ? `\n    <comment>${escapeXml(newComment)}</comment>` : ""}
  </data>`;
  return xml.replace(/<\/root>/i, `${newEntry}\n</root>`);
}
function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

const resxPath = path.join(process.cwd(), 'data', 'Sample.resx');

// Azure DevOps Configuration
({
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8080/api'
});
const loadResources = async () => {
  try {
    const data = fs.readFileSync(resxPath, 'utf8');
    const parsed = await parseStringPromise(data);
    const dataElements = parsed.root.data || [];
    return dataElements.filter(d => !d.$.type) // Filter out binary data
    .map(d => ({
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
const saveResources = async resources => {
  try {
    // create an Array of translations to be saved
    const translations = [];
    for (const resource of resources) {
      if (!resource.enabled) {
        continue; // Skip saving this resource if not enabled
      }
      let translation = {
        "fr": {
          datasource: "Sample",
          path: "Sample.resx",
          key: resource.name,
          lang: "fr",
          value: resource.value,
          info: {
            comment: resource.comment
          }
        }
      };
      translations.push(translation);
    }

    // Call Json2XML to save changes
    await Json2XML(translations, "commit message");
  } catch (error) {
    console.error('Error saving resources:', error);
  }
};

// to compile using babel cli, add --presets=@babel/preset-react

const ListItem = ({
  label,
  isSelected,
  enabled = true
}) => {
  return /*#__PURE__*/React.createElement(Text, {
    color: enabled === false ? 'gray' : isSelected ? 'blue' : undefined
  }, label);
};
const App = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [mode, setMode] = useState('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editName, setEditName] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [focusedField, setFocusedField] = useState('name');
  useEffect(() => {
    loadResources().then(data => {
      setResources(data);
      setLoading(false);
    });
  }, []);
  const handleSubmitBoth = () => {
    const updated = [...resources];
    updated[selectedIndex] = {
      ...updated[selectedIndex],
      name: editName,
      value: editValue,
      comment: editComment,
      enabled: editEnabled
    };
    setResources(updated);
    setHasChanges(true);
    setMode('list');
    setEditField(null);
  };
  const confirmSaveAndExit = () => {
    if (!hasChanges) {
      process.exit(0);
      return;
    }
    setSaving(true);
    saveResources(resources).then(() => {
      process.exit(0);
    }).catch(err => {
      console.error('Save error:', err);
      setSaving(false);
      setMode('list');
    });
  };
  const cancelExit = () => {
    setMode('list');
  };

  // Global key handling: Q to quit, Esc to go back
  useInput((input, key) => {
    if (mode === 'confirmExit') {
      if (input === 'y' || input === 'Y') {
        confirmSaveAndExit();
      }
      if (input === 'n' || input === 'N') {
        cancelExit();
      }
      return;
    }
    if (mode === 'list' && (input === 'q' || input === 'Q')) {
      setMode('confirmExit');
      return;
    }
    if (mode === 'list' && input === ' ') {
      const updated = [...resources];
      updated[highlightedIndex] = {
        ...updated[highlightedIndex],
        enabled: updated[highlightedIndex].enabled === false ? true : false
      };
      setResources(updated);
      setHasChanges(true);
      return;
    }
    if (key.escape) {
      if (mode === 'editBoth') {
        // Cancel popup back to list immediately
        setMode('list');
        setFocusedField('name');
      }
    }
    if (mode === 'editBoth') {
      if (key.tab || input === '\t') {
        setFocusedField(f => {
          if (f === 'name') return 'value';
          if (f === 'value') return 'comment';
          if (f === 'comment') return 'enabled';
          return 'name';
        });
      }
      if (focusedField === 'enabled' && input === ' ') {
        setEditEnabled(value => !value);
      }
      if (focusedField === 'enabled' && key.return) {
        handleSubmitBoth();
      }
    }
  });
  const handleResourceSelect = item => {
    const resource = resources[item.value];
    setSelectedIndex(item.value);
    setHighlightedIndex(item.value);
    setEditField(null);
    setEditName(resource.name);
    setEditValue(resource.value);
    setEditComment(resource.comment || '');
    setEditEnabled(resource.enabled !== false);
    setFocusedField('name');
    setMode('editBoth');
  };
  const handleHighlight = item => {
    setHighlightedIndex(item.value);
  };

  // Confirm exit
  if (mode === 'confirmExit') {
    return /*#__PURE__*/React.createElement(Box, {
      borderStyle: "round",
      flexDirection: "column",
      paddingX: 1,
      paddingY: 1
    }, /*#__PURE__*/React.createElement(Text, {
      bold: true
    }, "Save changes and exit?"), /*#__PURE__*/React.createElement(Text, null, "Resources will be pushed to Azure DevOps on confirm."), /*#__PURE__*/React.createElement(Text, null, hasChanges ? 'You have unsaved changes.' : 'No changes to save.'), /*#__PURE__*/React.createElement(Text, null, "Press Y to save and exit, N to cancel."), saving && /*#__PURE__*/React.createElement(Text, {
      color: "yellow"
    }, "\u2299 Saving changes..."));
  }

  // List Mode
  if (mode === 'list') {
    if (loading) {
      return /*#__PURE__*/React.createElement(Box, {
        flexDirection: "column"
      }, /*#__PURE__*/React.createElement(Text, {
        bold: true
      }, "Loading resources..."));
    }
    const listItems = resources.map((resource, index) => ({
      label: `${resource.enabled === false ? '[ ]' : '[x]'} ${resource.name}: ${resource.value}`,
      value: index,
      enabled: resource.enabled !== false
    }));
    return /*#__PURE__*/React.createElement(Box, {
      flexDirection: "column"
    }, /*#__PURE__*/React.createElement(Text, {
      bold: true
    }, "Resources (Sample.resx)"), hasChanges && /*#__PURE__*/React.createElement(Text, {
      color: "yellow"
    }, "Unsaved changes will be pushed on exit."), saving && /*#__PURE__*/React.createElement(Text, {
      color: "yellow"
    }, "\u2299 Pushing to Azure DevOps..."), /*#__PURE__*/React.createElement(SelectInput, {
      items: listItems,
      itemComponent: ListItem,
      onSelect: handleResourceSelect,
      onHighlight: handleHighlight
    }), /*#__PURE__*/React.createElement(Text, {
      dimColor: true
    }, "(Press Space to toggle enabled, Q to exit, Enter to edit both)"));
  }

  // Edit popup
  if (mode === 'editBoth') {
    resources[selectedIndex];
    return /*#__PURE__*/React.createElement(Box, {
      borderStyle: "round",
      flexDirection: "column",
      height: saving ? 15 : 14,
      paddingX: 1
    }, /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, {
      bold: true
    }, "Edit Key: ", editName)), /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, null, "Name:     "), /*#__PURE__*/React.createElement(TextInput, {
      value: editName,
      onChange: setEditName,
      onSubmit: () => setFocusedField('value'),
      focus: focusedField === 'name'
    })), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, null, "Value:    "), /*#__PURE__*/React.createElement(TextInput, {
      value: editValue,
      onChange: setEditValue,
      onSubmit: () => setFocusedField('comment'),
      focus: focusedField === 'value'
    })), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, null, "Comment:  "), /*#__PURE__*/React.createElement(TextInput, {
      value: editComment,
      onChange: setEditComment,
      onSubmit: () => setFocusedField('enabled'),
      focus: focusedField === 'comment'
    })), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, null, "Enabled:  "), /*#__PURE__*/React.createElement(Text, null, focusedField === 'enabled' ? '▶ ' : '  ', "[", editEnabled ? 'x' : ' ', "]")), saving && /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, {
      color: "yellow"
    }, "\u2299 Pushing to Azure DevOps...")), /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, {
      dimColor: true
    }, "(Tab to switch, Space to toggle, Enter to submit, Esc to cancel)")));
  }
};
render(/*#__PURE__*/React.createElement(App, null));

export { App as default };
