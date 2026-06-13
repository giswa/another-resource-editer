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
      } else if (mode === 'edit') {
        if (editField) {
          // If currently editing a field, go back to field selection
          setEditField(null);
        } else {
          // If in edit resource selection, go back to list
          setMode('list');
        }
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
        <Text bold>📝 Resources</Text>
        <Text></Text>
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
  // Edit Mode - Editing Field
  if (mode === 'edit' && editField && (editField === 'name' || editField === 'value')) {
    const resource = resources[selectedIndex];

    return (
      <Box flexDirection="column">
        <Text bold>✏️  Edit {editField}</Text>
        <Text></Text>
        <Text>Resource: {resource.name}</Text>
        <Text>Current {editField}: {resource[editField]}</Text>
        <Text></Text>
        <Box>
          <Text>New {editField}: </Text>
          <TextInput
            value={editValue}
            onChange={setEditValue}
            onSubmit={handleEditSubmit}
          />
        </Box>
      </Box>
    );
  }

  // Edit Mode - Select Field
  if (mode === 'edit') {
    const resource = resources[selectedIndex];
    const fieldItems = [
      { label: 'Edit Name', value: 'name' },
      { label: 'Edit Value', value: 'value' },
      { label: 'Edit Both', value: 'both' },
      { label: 'Back to List', value: 'list' }
    ];

    return (
      <Box flexDirection="column">
        <Text bold>✏️  Edit Resource</Text>
        <Text></Text>
        <Text>Selected: {resource.name} = {resource.value}</Text>
        <Text dimColor>(Press Esc to go back to list, Q to quit)</Text>
        <Text></Text>
        <SelectInput
          items={fieldItems}
          onSelect={(item) => {
            if (item.value === 'list') {
              setMode('list');
            } else if (item.value === 'both') {
              setEditField(null);
              setEditName(resource.name);
              setEditValue(resource.value);
              setFocusedField('name');
              setMode('editBoth');
            } else {
              setEditField(item.value);
              setEditValue(resource[item.value]);
            }
          }}
        />
      </Box>
    );
  }

  // Edit Both popup
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

    const boxWidth = 60;
    const innerWidth = boxWidth - 2;
    const top = '┌' + '─'.repeat(innerWidth) + '┐';
    const bottom = '└' + '─'.repeat(innerWidth) + '┘';

    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" height={14}>
        <Box flexDirection="column" alignItems="center">
          <Text>{top}</Text>
          <Box>
            <Text>│</Text>
            <Box flexDirection="column" paddingX={1} width={innerWidth}>
              <Box>
                <Text bold>🖊️  Edit Name, Value & Comment</Text>
              </Box>
              <Box marginTop={1}>
                <Text>Name: </Text>
                <TextInput
                  value={editName}
                  onChange={setEditName}
                  onSubmit={() => setFocusedField('value')}
                  focus={focusedField === 'name'}
                />
              </Box>
              <Box marginTop={1}>
                <Text>Value: </Text>
                <TextInput
                  value={editValue}
                  onChange={setEditValue}
                  onSubmit={() => setFocusedField('comment')}
                  focus={focusedField === 'value'}
                />
              </Box>
              <Box marginTop={1}>
                <Text>Comment: </Text>
                <TextInput
                  value={editComment}
                  onChange={setEditComment}
                  onSubmit={() => setFocusedField('enabled')}
                  focus={focusedField === 'comment'}
                />
              </Box>
              <Box marginTop={1}>
                <Text>
                  {focusedField === 'enabled' ? '▶ ' : '  '}
                  [
                  {editEnabled ? 'x' : ' '}
                  ] Enabled
                </Text>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>(Tab to switch, Space to toggle, Enter to submit, Esc to cancel)</Text>
              </Box>
            </Box>
            <Text>│</Text>
          </Box>
          <Text>{bottom}</Text>
        </Box>
      </Box>
    );
  }
};

export default App;

render(<App />);
