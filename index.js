// to compile using babel cli, add --presets=@babel/preset-react

import React, { useState } from 'react';
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
  const [resources, setResources] = useState(loadResources());
  const [mode, setMode] = useState('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [editField, setEditField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editName, setEditName] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [focusedField, setFocusedField] = useState('name');

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
    saveResources(updated);
    setMode('list');
    setEditField(null);
  };

  // Global key handling: Q to quit, Esc to go back
  useInput((input, key) => {
    if (input === 'q' || input === 'Q') {
      process.exit(0);
    }

    if (mode === 'list' && input === ' ') {
      const updated = [...resources];
      updated[highlightedIndex] = {
        ...updated[highlightedIndex],
        enabled: updated[highlightedIndex].enabled === false ? true : false
      };
      setResources(updated);
      saveResources(updated);
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
    saveResources(updated);
    setEditField(null);
  };

  // List Mode
  if (mode === 'list') {
    const listItems = resources.map((resource, index) => ({
      label: `${resource.enabled === false ? '[ ]' : '[x]'} ${resource.name}: ${resource.value}`,
      value: index,
      enabled: resource.enabled !== false
    }));

    return (
      <Box flexDirection="column">
        <Text bold>Resources</Text>
        <SelectInput
          items={listItems}
          itemComponent={ListItem}
          onSelect={handleResourceSelect}
          onHighlight={handleHighlight}
        />
        <Text dimColor>(Press Space to toggle enabled, Q to quit, Enter to edit both)</Text>
      </Box>
    );
  }

  // Edit popup
  if (mode === 'editBoth') {
    const resource = resources[selectedIndex];
    const handleSubmitBoth = () => {
      const updated = [...resources];
      updated[selectedIndex] = {
        ...updated[selectedIndex],
        name: editName,
        value: editValue,
        comment: editComment
      };
      setResources(updated);
      saveResources(updated);
      setMode('list');
      setEditField(null);
    };

    return (
        <Box borderStyle="round" flexDirection="column" height={14} paddingX={1}>
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
              <Box marginTop={1}>
                <Text dimColor>(Tab to switch, Space to toggle, Enter to submit, Esc to cancel)</Text>
              </Box>
        </Box>
    );
  }
};

export default App;

render(<App />);
