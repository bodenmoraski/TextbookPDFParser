chrome.runtime.onInstalled.addListener(() => {
  console.log('AI-Powered Searchable Textbook Extension Installed');
});

// Listener for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'searchTerm') {
    // Handle the search term logic here
    sendResponse({status: 'Search term received', term: request.term});
  }
});
