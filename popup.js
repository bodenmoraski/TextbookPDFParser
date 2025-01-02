function highlightSearchTerm(text, searchTerm) {
  const regex = new RegExp(searchTerm, 'gi');
  return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}

// Function to perform the search
function performSearch() {
  const term = document.getElementById('searchTerm').value;
  if (term) {
    const loadingEl = document.getElementById('loading');
    const resultsEl = document.getElementById('results');
    
    loadingEl.classList.remove('hidden');
    resultsEl.textContent = '';

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || !tabs[0]) {
        loadingEl.classList.add('hidden');
        resultsEl.innerHTML = `
          <div class="error-message">
            <span class="material-icons">error_outline</span>
            <span>No active tab found</span>
          </div>
        `;
        return;
      }
      if (!tabs[0].url.endsWith('.pdf')) {
        loadingEl.classList.add('hidden');
        resultsEl.innerHTML = `
          <div class="error-message">
            <span class="material-icons">description</span>
            <span>Please open a PDF file first</span>
          </div>
        `;
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'searchPDF',
        term: term,
        pdfUrl: tabs[0].url
      }, response => {
        if (chrome.runtime.lastError) {
          console.log('Injecting content scripts...');
          loadingEl.classList.add('hidden');
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['libs/pdf.js', 'content.js']
          }).then(() => {
            setTimeout(() => {
              loadingEl.classList.remove('hidden');
              resultsEl.textContent = '';
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'searchPDF',
                term: term,
                pdfUrl: tabs[0].url
              }, response => {
                if (chrome.runtime.lastError) {
                  loadingEl.classList.add('hidden');
                  resultsEl.innerHTML = `
                    <div class="error-message">
                      <span class="material-icons">error_outline</span>
                      <span>${chrome.runtime.lastError.message}</span>
                    </div>
                  `;
                  console.error(chrome.runtime.lastError);
                  return;
                }
                loadingEl.classList.add('hidden');
                if (response && response.status) {
                  if (response.matches) {
                    if (response.matches.length > 0) {
                      resultsEl.innerHTML = `
                        <div class="success-message">
                          <span class="material-icons">check_circle</span>
                          <span>Found ${response.matches.length} matches</span>
                        </div>
                        <div class="matches-list">
                          ${response.matches.map(match => `
                            <div class="match-item">
                              <div class="match-page">Page ${match.pageNum}</div>
                              <div class="match-text">${highlightSearchTerm(match.text, term)}</div>
                            </div>
                          `).join('')}
                        </div>
                      `;
                    } else {
                      resultsEl.innerHTML = `
                        <div class="info-message">
                          <span class="material-icons">info</span>
                          <span>No matches found in ${response.totalPages} pages</span>
                        </div>
                      `;
                    }
                  } else {
                    resultsEl.innerHTML = `
                      <div class="success-message">
                        <span class="material-icons">check_circle</span>
                        <span>${response.status}</span>
                      </div>
                    `;
                  }
                } else {
                  resultsEl.innerHTML = `
                    <div class="error-message">
                      <span class="material-icons">error_outline</span>
                      <span>Invalid response from content script</span>
                    </div>
                  `;
                }
              });
            }, 500);
          }).catch(err => {
            loadingEl.classList.add('hidden');
            resultsEl.innerHTML = `
              <div class="error-message">
                <span class="material-icons">error_outline</span>
                <span>Could not inject content script</span>
              </div>
            `;
            console.error(err);
          });
          return;
        }
        loadingEl.classList.add('hidden');
        if (response && response.status) {
          if (response.matches) {
            if (response.matches.length > 0) {
              resultsEl.innerHTML = `
                <div class="success-message">
                  <span class="material-icons">check_circle</span>
                  <span>Found ${response.matches.length} matches</span>
                </div>
                <div class="matches-list">
                  ${response.matches.map(match => `
                    <div class="match-item">
                      <div class="match-page">Page ${match.pageNum}</div>
                      <div class="match-text">${highlightSearchTerm(match.text, term)}</div>
                    </div>
                  `).join('')}
                </div>
              `;
            } else {
              resultsEl.innerHTML = `
                <div class="info-message">
                  <span class="material-icons">info</span>
                  <span>No matches found in ${response.totalPages} pages</span>
                </div>
              `;
            }
          } else {
            resultsEl.innerHTML = `
              <div class="success-message">
                <span class="material-icons">check_circle</span>
                <span>${response.status}</span>
              </div>
            `;
          }
        } else {
          resultsEl.innerHTML = `
            <div class="error-message">
              <span class="material-icons">error_outline</span>
              <span>Invalid response from content script</span>
            </div>
          `;
        }
      });
    });
  }
}

// Add event listener for the Enter key
document.getElementById('searchTerm').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    performSearch();
  }
});

// Add click event listener for the search button
document.getElementById('searchButton').addEventListener('click', performSearch);
