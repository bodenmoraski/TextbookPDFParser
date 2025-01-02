console.log('Content script loaded');

// Ensure we're in a PDF context
const isPDF = window.location.href.toLowerCase().endsWith('.pdf');
console.log('Is PDF page:', isPDF);
if (isPDF) {
  console.log('Initializing PDF.js...');
  // PDF.js is loaded as a global variable from the library
  let pdfjsLib;
  
  // Initialize PDF.js
  try {
    pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) {
      console.error('PDF.js library not found in window object');
    } else {
      console.log('PDF.js initialized successfully');
      
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.js');
      
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Message received:', request);
        if (request.action === 'searchPDF') {
          const pdfUrl = request.pdfUrl;
          const searchTerm = request.term;
          // Load the PDF document
          pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc => {
            console.log('PDF loaded');
            // Get the total number of pages
            const numPages = pdfDoc.numPages;
            let matches = [];
            
            // Function to search a single page
            const searchPage = async (pageNum) => {
              const page = await pdfDoc.getPage(pageNum);
              const textContent = await page.getTextContent();
              const text = textContent.items.map(item => item.str).join(' ');
              
              // Find all instances of the search term
              const searchTermLower = searchTerm.toLowerCase();
              const textLower = text.toLowerCase();
              let lastIndex = 0;
              let index;
              
              while ((index = textLower.indexOf(searchTermLower, lastIndex)) !== -1) {
                matches.push({
                  pageNum,
                  text: text.substring(
                    Math.max(0, index - 40),
                    Math.min(text.length, index + searchTerm.length + 40)
                  )
                });
                lastIndex = index + searchTermLower.length;
                
                // If the next occurrence is too close, skip creating a new match
                let nextIndex = textLower.indexOf(searchTermLower, lastIndex);
                if (nextIndex !== -1 && nextIndex - lastIndex < 80) {
                  lastIndex = nextIndex;
                }
              }
            };
            
            // Search all pages
            const searchPromises = [];
            for (let i = 1; i <= numPages; i++) {
              searchPromises.push(searchPage(i));
            }
            
            Promise.all(searchPromises).then(() => {
              if (matches.length > 0) {
                sendResponse({
                  status: 'Search completed',
                  matches: matches,
                  totalPages: numPages
                });
              } else {
                sendResponse({
                  status: 'No matches found',
                  matches: [],
                  totalPages: numPages
                });
              }
            });
          }).catch(error => {
            console.error('Error loading PDF:', error);
            sendResponse({status: 'Error loading PDF: ' + error.message});
          });
          return true; // Required for async sendResponse
        }
        return true; // Always return true for async operations
      });
    }
  } catch (error) {
    console.error('Error initializing PDF.js:', error);
  }
} else {
  console.log('Not a PDF page, content script will remain dormant');
}
