# JsonViewer Component

A React component for displaying JSON data with collapsible nested fields and syntax highlighting.

## Features

- **Collapsible nested objects and arrays**: Click on any object or array to expand/collapse its contents
- **Syntax highlighting**: Different colors for keys, strings, numbers, booleans, and null values
- **Theme support**: Automatically adapts to light and dark themes
- **Recursive rendering**: Handles deeply nested structures
- **Smart defaults**: First level expanded by default, deeper levels collapsed
- **Hover effects**: Visual feedback when hovering over expandable items

## Usage

```tsx
import { JsonViewer } from '@shared/components/JsonViewer';

const MyComponent = () => {
  const data = {
    name: 'John Doe',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'New York',
    },
    hobbies: ['reading', 'coding', 'gaming'],
  };

  return <JsonViewer data={data} defaultExpanded={true} />;
};
```

## Props

- `data` (any): The data to display (can be any JSON-serializable value)
- `name` (string, optional): The name/key for this value (used internally for recursion)
- `defaultExpanded` (boolean, optional): Whether to expand this level by default (default: true)
- `level` (number, optional): Current nesting level (used internally for indentation)

## Styling

The component uses CSS custom properties for colors that automatically adapt to the current theme:

### Light Theme Colors

- `--json-key`: Purple (#6f42c1)
- `--json-string`: Green (#22863a)
- `--json-number`: Blue (#005cc5)
- `--json-boolean`: Red (#d73a49)
- `--json-null`: Gray (#808080)

### Dark Theme Colors

- `--json-key`: Light Purple (#c792ea)
- `--json-string`: Light Green (#c3e88d)
- `--json-number`: Orange (#f78c6c)
- `--json-boolean`: Light Red (#ff5370)
- `--json-null`: Dark Gray (#697098)

## Implementation Details

- Uses React hooks (`useState`) for managing expand/collapse state
- Recursively renders nested structures
- Indentation increases by 20px per nesting level
- Empty objects/arrays show as `{}` or `[]` and are not expandable
- Non-empty objects/arrays show a count preview when collapsed (e.g., `{3 keys}`, `[5 items]`)
- Smooth transitions for expand/collapse animations
