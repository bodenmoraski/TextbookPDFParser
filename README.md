# AI-Powered PDF Search Extension

A Chrome extension that enables intelligent searching within PDF documents, helping students and researchers quickly locate and contextualize information within their PDF textbooks and documents.

## Current Features

- PDF Detection: Automatically detects when users are viewing PDF files
- Full-Text Search: Search for specific terms within PDF documents
- Context Display: Shows search results with surrounding text for better context
- Multiple Instance Detection: Finds and displays all occurrences of search terms
- User-Friendly Interface:
  - Material Design styling
  - Loading indicators
  - Clear error messages
  - Keyboard support (Enter to search)


## Technical Implementation

### Core Components

- **PDF.js Integration**: Uses Mozilla's PDF.js library for PDF parsing and text extraction
- **Content Script**: Handles PDF detection and text searching within documents
- **Popup Interface**: Provides a clean, intuitive search interface
- **Background Service**: Manages extension state and communication between components

### Key Features Implementation

- **PDF Detection**: Checks file extensions and MIME types to identify PDF documents
- **Search Algorithm**: 
  - Processes PDFs page by page
  - Finds all instances of search terms
  - Groups nearby occurrences to avoid redundant displays
  - Provides contextual snippets around each match
- **User Interface**:
  - Real-time search feedback
  - Error handling with user-friendly messages
  - Loading states for better UX
  - Responsive Material Design styling

## Permissions

The extension requires the following permissions:
- `activeTab`: To interact with the current tab
- `scripting`: To inject content scripts
- `storage`: For saving extension data
- `tabs`: To access tab information

## Development Status

Currently implemented:
- [x] Basic PDF detection
- [x] Text search functionality
- [x] Results display with context
- [x] Material Design UI
- [x] Keyboard shortcuts

Planned features:
- [ ] Advanced AI-powered concept linking
- [ ] Search result highlighting in the PDF
- [ ] Search history
- [ ] Related terms suggestions
- [ ] PDF file upload