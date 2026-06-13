# Resource Manager - Ink/React Console App

A Node.js console application built with Ink and React to manage JSON resources. List, check, and edit resource name and value properties from `test.json`.

## Features

- **List Resources**: View all resources with their names and values
- **Edit Resources**: Select a resource and edit its name or value properties
- **Auto-save**: Changes are automatically saved to `test.json`
- **Interactive UI**: Navigate using arrow keys and Enter

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Or with watch mode for development:

```bash
npm run dev
```

## How to Use

1. **Main Menu**: Select an option:
   - `List Resources` - View all resources
   - `Edit Resource` - Modify a resource
   - `Exit` - Close the application

2. **List Resources**: Browse through all resources and press Enter to go back to menu

3. **Edit Resource**:
   - Select a resource from the list
   - Choose to edit the Name or Value
   - Enter the new value and press Enter
   - Changes are saved automatically

## Controls

- **Arrow Keys**: Navigate menu items
- **Enter**: Select/Confirm
- **Q**: Go back (in list view)
- **Ctrl+C**: Exit application

## Project Structure

```
ink/
├── index.js          # Main Ink/React application
├── test.json         # Resource data file
├── package.json      # Dependencies
└── README.md         # This file
```
