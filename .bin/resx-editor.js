#!/usr/bin/env node

import React, { useState, useEffect } from 'react';
import { render, useInput, Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { XMLParser } from 'fast-xml-parser';
import { getObjectId, fetchFile as fetchFile$1, saveFiles } from 'git-storage-api/azure';
import { fetchFile } from 'git-storage-api/localsytem';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true
});
const loadResources = async (filePath = 'Sample.resx') => {
  let data = '';
  try {
    data = await fetchFile(filePath);
  } catch (error) {
    console.error(error);
    return [];
  }
  try {
    const parsed = xmlParser.parse(data);
    const dataElements = Array.isArray(parsed?.root?.data) ? parsed.root.data : parsed?.root?.data ? [parsed.root.data] : [];
    return dataElements.filter(node => !node?.['@_type'] && !node?.['@_name']?.startsWith('>>')).map(node => ({
      name: node?.['@_name'] ?? '',
      value: node?.value,
      comment: node?.comment,
      enabled: true
    }));
  } catch (error) {
    console.error(error);
    throw new Error('error while parsing');
  }
};
const saveResources = async (resources, filePath = 'Sample.resx') => {
  try {
    const result = {};
    result[filePath] = resources;
    await sendTranslations(result, "commit message");
  } catch (error) {
    console.error('Error saving resources:', error);
  }
};
async function sendTranslations(translations, commitMessage) {
  // get last commit ID
  const oldObjectId = await getObjectId();
  for (const path in translations) {
    // console.log(`Processing translations for file: ${path}`);
    // first reload all original source file 
    let xml = await fetchFile$1(path);

    // loop through all translations for this file
    for (const trans of translations[path]) {
      // console.log(`Processing key: ${trans.name} with value: ${trans.value}`) ;
      // Change the value node and the comment
      xml = updateOrInsertResxEntry(xml, trans.name, trans.value, trans.comment);
    }
    // store the updated xml back to translations object
    // overwriting the original array with the updated XML content
    translations[path] = xml;
  }
  await saveFiles(translations, oldObjectId, commitMessage);
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

const parseCliArgs = (argv = process.argv.slice(2)) => {
  const options = {
    file: 'Sample.resx',
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--file' || argument === '-f') {
      const value = argv[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Missing value for --file/-f');
      }
      options.file = value;
      index += 1;
      continue;
    }
    if (argument.startsWith('--file=')) {
      options.file = argument.slice('--file='.length);
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
};

const cliArgs = (() => {
  try {
    return parseCliArgs();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
})();
if (cliArgs.help) {
  console.log('Usage: resx-editor [--file <path> | -f <path>] [--help | -h]');
  process.exit(0);
}
const ListItem = ({
  label,
  isSelected,
  enabled = true
}) => {
  return /*#__PURE__*/React.createElement(Text, {
    color: enabled === false ? 'gray' : isSelected ? 'blue' : undefined
  }, label);
};
const App = ({
  activeFile
}) => {
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
    loadResources(activeFile).then(data => {
      setResources(data);
      setLoading(false);
    });
  }, [activeFile]);
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
    saveResources(resources, activeFile).then(() => {
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
    }, "Resources (", activeFile, ")"), hasChanges && /*#__PURE__*/React.createElement(Text, {
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
render(/*#__PURE__*/React.createElement(App, {
  activeFile: cliArgs.file
}));

export { App as default };
