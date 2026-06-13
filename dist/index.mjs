import React, { useState } from 'react';
import { render, Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { loadResources, saveResources } from './resourceStore.js';
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
  const handleFieldSelect = item => {
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
    return /*#__PURE__*/React.createElement(Box, {
      flexDirection: "column"
    }, /*#__PURE__*/React.createElement(Text, {
      bold: true
    }, "\uD83D\uDCDD Resources"), /*#__PURE__*/React.createElement(Text, null), /*#__PURE__*/React.createElement(SelectInput, {
      items: listItems,
      itemComponent: ListItem,
      onSelect: handleResourceSelect,
      onHighlight: handleHighlight
    }), /*#__PURE__*/React.createElement(Text, {
      dimColor: true
    }, "(Press Space to toggle enabled, Q to quit, Enter to edit both)"));
  }
  // Edit Mode - Editing Field
  if (mode === 'edit' && editField && (editField === 'name' || editField === 'value')) {
    const resource = resources[selectedIndex];
    return /*#__PURE__*/React.createElement(Box, {
      flexDirection: "column"
    }, /*#__PURE__*/React.createElement(Text, {
      bold: true
    }, "\u270F\uFE0F  Edit ", editField), /*#__PURE__*/React.createElement(Text, null), /*#__PURE__*/React.createElement(Text, null, "Resource: ", resource.name), /*#__PURE__*/React.createElement(Text, null, "Current ", editField, ": ", resource[editField]), /*#__PURE__*/React.createElement(Text, null), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, null, "New ", editField, ": "), /*#__PURE__*/React.createElement(TextInput, {
      value: editValue,
      onChange: setEditValue,
      onSubmit: handleEditSubmit
    })));
  }

  // Edit Mode - Select Field
  if (mode === 'edit') {
    const resource = resources[selectedIndex];
    const fieldItems = [{
      label: 'Edit Name',
      value: 'name'
    }, {
      label: 'Edit Value',
      value: 'value'
    }, {
      label: 'Edit Both',
      value: 'both'
    }, {
      label: 'Back to List',
      value: 'list'
    }];
    return /*#__PURE__*/React.createElement(Box, {
      flexDirection: "column"
    }, /*#__PURE__*/React.createElement(Text, {
      bold: true
    }, "\u270F\uFE0F  Edit Resource"), /*#__PURE__*/React.createElement(Text, null), /*#__PURE__*/React.createElement(Text, null, "Selected: ", resource.name, " = ", resource.value), /*#__PURE__*/React.createElement(Text, {
      dimColor: true
    }, "(Press Esc to go back to list, Q to quit)"), /*#__PURE__*/React.createElement(Text, null), /*#__PURE__*/React.createElement(SelectInput, {
      items: fieldItems,
      onSelect: item => {
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
      }
    }));
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
    return /*#__PURE__*/React.createElement(Box, {
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: 14
    }, /*#__PURE__*/React.createElement(Box, {
      flexDirection: "column",
      alignItems: "center"
    }, /*#__PURE__*/React.createElement(Text, null, top), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, null, "\u2502"), /*#__PURE__*/React.createElement(Box, {
      flexDirection: "column",
      paddingX: 1,
      width: innerWidth
    }, /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement(Text, {
      bold: true
    }, "\uD83D\uDD8A\uFE0F  Edit Name, Value & Comment")), /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, null, "Name: "), /*#__PURE__*/React.createElement(TextInput, {
      value: editName,
      onChange: setEditName,
      onSubmit: () => setFocusedField('value'),
      focus: focusedField === 'name'
    })), /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, null, "Value: "), /*#__PURE__*/React.createElement(TextInput, {
      value: editValue,
      onChange: setEditValue,
      onSubmit: () => setFocusedField('comment'),
      focus: focusedField === 'value'
    })), /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, null, "Comment: "), /*#__PURE__*/React.createElement(TextInput, {
      value: editComment,
      onChange: setEditComment,
      onSubmit: () => setFocusedField('enabled'),
      focus: focusedField === 'comment'
    })), /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, null, focusedField === 'enabled' ? '▶ ' : '  ', "[", editEnabled ? 'x' : ' ', "] Enabled")), /*#__PURE__*/React.createElement(Box, {
      marginTop: 1
    }, /*#__PURE__*/React.createElement(Text, {
      dimColor: true
    }, "(Tab to switch, Space to toggle, Enter to submit, Esc to cancel)"))), /*#__PURE__*/React.createElement(Text, null, "\u2502")), /*#__PURE__*/React.createElement(Text, null, bottom)));
  }
};
export default App;
render(/*#__PURE__*/React.createElement(App, null));
