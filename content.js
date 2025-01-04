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
      // Try loading PDF.js dynamically
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('libs/pdf.js');
      script.onload = () => {
        pdfjsLib = window['pdfjs-dist/build/pdf'];
        if (pdfjsLib) {
          console.log('PDF.js loaded dynamically');
          pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.js');
        }
      };
      document.head.appendChild(script);
    } else {
      console.log('PDF.js initialized successfully');
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.js');
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Received message in content.js:', request);
      if (request.action === 'searchPDF') {
        const pdfUrl = request.pdfUrl;
        const searchTerm = request.term;
        console.log('Starting PDF search for:', searchTerm);
        // Load the PDF document
        pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc => {
          console.log('PDF loaded');
          // Get the total number of pages
          const numPages = pdfDoc.numPages;
          let matches = [];
          
          // Function to search a single page
          const searchPage = async (pageNum) => {
            console.log(`Searching page ${pageNum}...`);
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');
            
            // Find all instances of the search term
            const searchTermLower = searchTerm.toLowerCase();
            const textLower = text.toLowerCase();
            let lastIndex = 0;
            let index;
            
            while ((index = textLower.indexOf(searchTermLower, lastIndex)) !== -1) {
              console.log(`Found match on page ${pageNum}`);
              matches.push({
                pageNum,
                text: text.substring(
                  Math.max(0, index - 40),
                  Math.min(text.length, index + searchTerm.length + 40)
                )
              });
              lastIndex = index + searchTermLower.length;
            }
          };
          
          // Search all pages
          const searchPromises = [];
          let pagesSearched = 0;
          for (let i = 1; i <= numPages; i++) {
            searchPromises.push(
              searchPage(i).then(() => {
                pagesSearched++;
                // Send progress updates
                chrome.runtime.sendMessage({
                  action: 'searchProgress',
                  progress: (pagesSearched / numPages) * 100
                });
              })
            );
          }
          
          Promise.all(searchPromises).then(() => {
            console.log('Search completed, matches found:', matches.length);
            if (matches.length > 0) {
              // Highlight matches in the PDF
              highlightMatches(pdfDoc, matches, searchTerm);
              console.log('Matches found:', matches);
              console.log('Sending matches back to popup.js:', matches);
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
            return true; // Keep the message port open
          });
          return true; // Keep the message port open
        }).catch(error => {
          console.error('Error loading PDF:', error);
          sendResponse({status: 'Error loading PDF: ' + error.message});
          return true; // Keep the message port open
        });
        return true; // Required for async sendResponse
      }
      return true; // Always return true for async operations
    });
  } catch (error) {
    console.error('Error initializing PDF.js:', error);
  }
} else {
  console.log('Not a PDF page, content script will remain dormant');
}

// Function to highlight matches in the PDF
async function highlightMatches(pdfDoc, matches, searchTerm) {
  // Clear previous highlights
  const existingHighlights = document.querySelectorAll('.pdf-highlight-layer');
  existingHighlights.forEach(el => el.remove());
  
  for (const match of matches) {
    const page = await pdfDoc.getPage(match.pageNum);
    // Use a fixed scale since we don't have access to the PDF viewer's scale
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    // Create a container for highlights if it doesn't exist
    let container = document.querySelector(`.page[data-page-number="${match.pageNum}"]`);
    if (!container) {
      container = document.createElement('div');
      container.className = 'pdf-highlight-container';
      container.style.position = 'relative';
      document.body.appendChild(container);
    }
    
    // Get precise text positions
    const textItems = textContent.items;
    const searchTermLower = searchTerm.toLowerCase();
    
    textItems.forEach(item => {
      if (item.str.toLowerCase().includes(searchTermLower)) {
        const highlight = document.createElement('div');
        highlight.className = 'pdf-highlight';
        highlight.style.position = 'absolute';
        highlight.style.left = `${item.transform[4]}px`;
        highlight.style.top = `${item.transform[5]}px`;
        highlight.style.width = `${item.width}px`;
        highlight.style.height = `${item.height}px`;
        highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
        highlight.style.pointerEvents = 'none';
        container.appendChild(highlight);
      }
    });
  }
}
