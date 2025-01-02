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
                // Highlight matches in the PDF
                highlightMatches(pdfDoc, matches, searchTerm);
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

// Function to highlight matches in the PDF
async function highlightMatches(pdfDoc, matches, searchTerm) {
  for (const match of matches) {
    const page = await pdfDoc.getPage(match.pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const container = document.querySelector(`[data-page-number='${match.pageNum}']`);
    if (!container) continue;

    const highlightLayer = document.createElement('div');
    highlightLayer.className = 'highlight-layer';
    highlightLayer.style.position = 'absolute';
    highlightLayer.style.top = '0';
    highlightLayer.style.left = '0';
    highlightLayer.style.width = `${viewport.width}px`;
    highlightLayer.style.height = `${viewport.height}px`;
    highlightLayer.style.pointerEvents = 'none';
    container.appendChild(highlightLayer);

    // Since precise coordinates require text rendering details,
    // we'll perform a simple overlay based on text indices.
    // For precise highlighting, more advanced techniques are needed.

    const regex = new RegExp(searchTerm, 'gi');
    let matchInfo;
    while ((matchInfo = regex.exec(match.text)) !== null) {
      const span = document.createElement('span');
      span.className = 'pdf-highlight';
      span.textContent = matchInfo[0];

      const range = document.createRange();
      range.setStart(container, 0);
      range.setEnd(container, container.childNodes.length);

      const rect = range.getBoundingClientRect();
      const highlight = document.createElement('div');
      highlight.className = 'highlight';
      highlight.style.position = 'absolute';
      highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
      highlight.style.pointerEvents = 'none';
      highlight.style.width = '100px'; // Approximate width
      highlight.style.height = '20px'; // Approximate height
      highlight.style.top = `${rect.top}px`;
      highlight.style.left = `${rect.left + matchInfo.index}px`;

      highlightLayer.appendChild(highlight);
    }
  }
}
