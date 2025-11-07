# Coding Conventions

This document defines the coding standards for the Radio Memo project.

## Naming Conventions

### Variables
- Use `snake_case` for all variable names
- Examples:
  ```javascript
  const total_count = 10;
  const frequency_unit = 'MHz';
  let current_page = 1;
  ```

### Functions
- Use `camelCase` for all function names
- This applies to function declarations and function expressions
- **Note**: Variables that hold function values should still use `camelCase` (not `snake_case`)
- Examples:
  ```javascript
  function loadLogs() { }
  function formatTimestamp() { }

  // Even when assigning to a variable, use camelCase
  const handleFormSubmit = function() { };
  const exportLogs = async function() { };
  ```

## Code Comments

### Function Comments
- All functions should have a simple comment describing their purpose
- Use a JSDoc-style format for clarity
- Include brief parameter and return descriptions when helpful
- Example:
  ```javascript
  /**
   * Loads logs from the database and displays them with pagination
   */
  async function loadLogs() {
    // implementation
  }

  /**
   * Formats a timestamp for display in local timezone
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted date string
   */
  function formatTimestamp(timestamp) {
    // implementation
  }
  ```

### Inline Comments
- Add simple comments where code intent is not immediately obvious
- Explain "why" rather than "what" when possible
- Keep comments concise and relevant
- Example:
  ```javascript
  // Calculate total pages, ensuring at least 1 page exists
  total_pages = Math.max(1, Math.ceil(total_count / ITEMS_PER_PAGE));

  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    // implementation
  });
  ```

## General Guidelines

1. Keep code readable and self-documenting where possible
2. Use meaningful variable and function names
3. Prefer clarity over brevity
4. Add comments for complex logic or business rules
5. Update comments when code changes
