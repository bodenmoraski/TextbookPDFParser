# AI-Powered PDF Search Extension

A Chrome extension that enables intelligent searching within PDF documents, helping students and researchers quickly locate and contextualize information within their PDF textbooks and documents.

## Current Features

- PDF Detection: Automatically detects when users are viewing PDF files
- Full-Text Search: Search for specific terms within PDF documents
- Context Display: Shows search results with surrounding text for better context
- Multiple Instance Detection: Finds and displays all occurrences of search terms
- Search History: Google-style dropdown of previous searches
- Progress Tracking: Shows search progress across PDF pages
- Export Functionality: Export search results to CSV
- Keyboard Shortcuts:
  - `Ctrl/Cmd + F`: Focus search box
  - `Ctrl/Cmd + E`: Export results
- Advanced Search Options:
  - Case sensitive search
  - Whole word matching
  - Page range limiting
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
- **Search History**:
  - Stores recent searches using Chrome's storage API
  - Displays in a Google-style dropdown
  - Automatically updates with new searches
- **Progress Tracking**:
  - Real-time updates during search
  - Page-by-page progress indication
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
- [x] Search history
- [x] Progress tracking
- [x] Export functionality
- [x] Advanced search options

Planned features:
- [ ] Improved PDF highlighting:
  - Precise text position highlighting
  - Multiple highlight colors
  - Highlight persistence across searches
- [ ] Enhanced AI Integration:
  - Concept linking and mapping
  - Smart search suggestions
  - Related content recommendations
- [ ] Advanced Navigation:
  - Jump to page functionality
  - Thumbnail preview of results
  - Quick navigation between matches
- [ ] Annotation Features:
  - Save and manage highlights
  - Add notes to highlights
  - Export annotations
- [ ] Collaboration Tools:
  - Share search results
  - Share annotated PDFs
  - Team workspaces
- [ ] Performance Optimizations:
  - Caching for faster searches
  - Background processing for large PDFs
  - Reduced memory usage

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Usage Tips

- Use keyboard shortcuts for faster navigation
- Export results to CSV for further analysis
- Utilize advanced search options for precise results
- Click on search history items to quickly repeat searches