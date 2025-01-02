function highlightSearchTerm(text, searchTerm) {
  const regex = new RegExp(searchTerm, 'gi');
  return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}

// Function to perform the search
function performSearch() {
  const term = document.getElementById('searchTerm').value.trim();
  if (term) {
    const loadingEl = document.getElementById('loading');
    const resultsEl = document.getElementById('results');
    const historyEl = document.getElementById('searchHistory');
    
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
                      // Save search to history
                      saveSearchHistory(term);
                      
                      // Fetch related concepts
                      chrome.runtime.sendMessage({
                        action: 'getRelatedConcepts',
                        term: term
                      }, (conceptResponse) => {
                        let conceptsHTML = '';
                        if (conceptResponse && conceptResponse.concepts.length > 0) {
                          conceptsHTML = `
                            <div class="related-concepts">
                              <h2>Related Concepts:</h2>
                              <ul>
                                ${conceptResponse.concepts.map(concept => `<li>${concept}</li>`).join('')}
                              </ul>
                            </div>
                          `;
                        }
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
                          ${conceptsHTML}
                        `;
                      });
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
              // Save search to history
              saveSearchHistory(term);
              
              // Fetch related concepts
              chrome.runtime.sendMessage({
                action: 'getRelatedConcepts',
                term: term
              }, (conceptResponse) => {
                let conceptsHTML = '';
                if (conceptResponse && conceptResponse.concepts.length > 0) {
                  conceptsHTML = `
                    <div class="related-concepts">
                      <h2>Related Concepts:</h2>
                      <ul>
                        ${conceptResponse.concepts.map(concept => `<li>${concept}</li>`).join('')}
                      </ul>
                    </div>
                  `;
                }
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
                  ${conceptsHTML}
                `;
              });
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

// Function to save search terms to history
function saveSearchHistory(term) {
  chrome.storage.local.get(['searchHistory'], (result) => {
    let history = result.searchHistory || [];
    // Remove if term already exists to avoid duplicates
    history = history.filter(item => item !== term);
    // Add to the beginning
    history.unshift(term);
    // Keep only the latest 10 searches
    history = history.slice(0, 10);
    chrome.storage.local.set({ searchHistory: history }, () => {
      loadSearchHistory();
    });
  });
}

// Function to load search history into the dropdown
function loadSearchHistory() {
  const historyEl = document.getElementById('searchHistory');
  chrome.storage.local.get(['searchHistory'], (result) => {
    const history = result.searchHistory || [];
    historyEl.innerHTML = `<option value="" disabled selected>Select a previous search</option>`;
    history.forEach(term => {
      const option = document.createElement('option');
      option.value = term;
      option.textContent = term;
      historyEl.appendChild(option);
    });
  });
}

// Function to perform the search from history
function performSearchFromHistory(event) {
  const term = event.target.value;
  if (term) {
    document.getElementById('searchTerm').value = term;
    performSearch();
  }
}

// Initialize search history on popup load
document.addEventListener('DOMContentLoaded', loadSearchHistory);

// Add event listener for selecting a search from history
document.getElementById('searchHistory').addEventListener('change', performSearchFromHistory);

// Add event listener for the Enter key
document.getElementById('searchTerm').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    performSearch();
  }
});

// Add click event listener for the search button
document.getElementById('searchButton').addEventListener('click', performSearch);
