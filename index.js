// to compile using babel cli, add --presets=@babel/preset-react

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { loadResources, saveResources } from './resourceStore.js';

const ListItem = ({ label, isSelected, enabled = true }) => {
  return (
    <Text color={enabled === false ? 'gray' : isSelected ? 'blue' : undefined}>
      {label}
    </Text>
  );
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
    saveResources(resources)
      .then(() => {
        process.exit(0);
      })
      .catch(err => {
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
      if ((key.tab || input === '\t')) {
        setFocusedField((f) => {
          if (f === 'name') return 'value';
          if (f === 'value') return 'comment';
          if (f === 'comment') return 'enabled';
          return 'name';
        });
      }
      if (focusedField === 'enabled' && input === ' ') {
        setEditEnabled((value) => !value);
      }
      if (focusedField === 'enabled' && key.return) {
        handleSubmitBoth();
      }
    }
  });

  const handleResourceSelect = (item) => {
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

  const handleHighlight = (item) => {
    setHighlightedIndex(item.value);
  };

  const handleFieldSelect = (item) => {
    if (item.value === 'menu') {
      setMode('menu');
    } else if (item.value === 'select') {
      setEditField(null);
    } else {
      setEditField(item.value);
      setEditValue(resources[selectedIndex][item.value]);
    }
  };

  const handleEditSubmit = () => {
    const updated = [...resources];
    updated[selectedIndex] = {
      ...updated[selectedIndex],
      [editField]: editValue
    };
    setResources(updated);
    setHasChanges(true);
    setEditField(null);
  };

  // Confirm exit
  if (mode === 'confirmExit') {
    return (
      <Box borderStyle="round" flexDirection="column" paddingX={1} paddingY={1}>
        <Text bold>Save changes and exit?</Text>
        <Text>Resources will be pushed to Azure DevOps on confirm.</Text>
        <Text>{hasChanges ? 'You have unsaved changes.' : 'No changes to save.'}</Text>
        <Text>Press Y to save and exit, N to cancel.</Text>
        {saving && <Text color="yellow">⊙ Saving changes...</Text>}
      </Box>
    );
  }

  // List Mode
  if (mode === 'list') {
    if (loading) {
      return (
        <Box flexDirection="column">
          <Text bold>Loading resources...</Text>
        </Box>
      );
    }

    const listItems = resources.map((resource, index) => ({
      label: `${resource.enabled === false ? '[ ]' : '[x]'} ${resource.name}: ${resource.value}`,
      value: index,
      enabled: resource.enabled !== false
    }));

    return (
      <Box flexDirection="column">
        <Text bold>Resources (Sample.resx)</Text>
        {hasChanges && <Text color="yellow">Unsaved changes will be pushed on exit.</Text>}
        {saving && <Text color="yellow">⊙ Pushing to Azure DevOps...</Text>}
        <SelectInput
          items={listItems}
          itemComponent={ListItem}
          onSelect={handleResourceSelect}
          onHighlight={handleHighlight}
        />
        <Text dimColor>(Press Space to toggle enabled, Q to exit, Enter to edit both)</Text>
      </Box>
    );
  }

  // Edit popup
  if (mode === 'editBoth') {
    const resource = resources[selectedIndex];

    return (
        <Box borderStyle="round" flexDirection="column" height={saving ? 15 : 14} paddingX={1}>
              <Box>
                <Text bold>Edit Key: {editName}</Text>
              </Box>
              <Box marginTop={1}>
                <Text>Name:     </Text>
                <TextInput
                  value={editName}
                  onChange={setEditName}
                  onSubmit={() => setFocusedField('value')}
                  focus={focusedField === 'name'}
                />
              </Box>
              <Box>
                <Text>Value:    </Text>
                <TextInput
                  value={editValue}
                  onChange={setEditValue}
                  onSubmit={() => setFocusedField('comment')}
                  focus={focusedField === 'value'}
                />
              </Box>
              <Box>
                <Text>Comment:  </Text>
                <TextInput
                  value={editComment}
                  onChange={setEditComment}
                  onSubmit={() => setFocusedField('enabled')}
                  focus={focusedField === 'comment'}
                />
              </Box>
              <Box>
                <Text>Enabled:  </Text>
                <Text>
                  {focusedField === 'enabled' ? '▶ ' : '  '}
                  [
                  {editEnabled ? 'x' : ' '}
                  ]
                </Text>
              </Box>
              {saving && <Box marginTop={1}><Text color="yellow">⊙ Pushing to Azure DevOps...</Text></Box>}
              <Box marginTop={1}>
                <Text dimColor>(Tab to switch, Space to toggle, Enter to submit, Esc to cancel)</Text>
              </Box>
        </Box>
    );
  }
};

export default App;

render(<App />);
