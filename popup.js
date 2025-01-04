function highlightSearchTerm(text, searchTerm) {
  const regex = new RegExp(searchTerm, 'gi');
  return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}

// Function to handle search results
function handleSearchResults(matches, term) {
  if (!Array.isArray(matches)) {
    console.error('handleSearchResults received invalid matches:', matches);
    const resultsEl = document.getElementById('results');
    resultsEl.innerHTML = `
      <div class="error-message">
        <span class="material-icons">error_outline</span>
        <span>Invalid search results received.</span>
      </div>
    `;
    return;
  }

  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = `
    <div class="success-message" id="successBanner">
      <div class="success-content">
        <span class="material-icons">check_circle</span>
        <span>Found ${matches.length} match${matches.length !== 1 ? 'es' : ''}</span>
      </div>
      <button class="related-concepts-btn" id="fetchRelatedBtn">
        <span class="material-icons">psychology</span>
        View Related Concepts
      </button>
    </div>
    <div id="relatedConceptsContainer" class="hidden"></div>
    <div class="matches-list">
      ${matches.map(match => `
        <div class="match-item">
          <div class="match-page">Page ${match.pageNum}</div>
          <div class="match-text">${highlightSearchTerm(match.text, term)}</div>
        </div>
      `).join('')}
    </div>
  `;

  // Add click handler for the "View Related Concepts" button
  document.getElementById('fetchRelatedBtn').addEventListener('click', function() {
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons spinning">refresh</span> Loading...';
    
    chrome.runtime.sendMessage({
      action: 'getRelatedConcepts',
      term: term
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showRelatedConceptsError(chrome.runtime.lastError.message);
        return;
      }
      
      const conceptsContainer = document.getElementById('relatedConceptsContainer');
      
      if (response.status === 'Success' && response.concepts && response.concepts.length > 0) {
        // Parse the markdown-style response into proper HTML
        const formattedConcepts = response.concepts.map(concept => {
          // Check if the concept contains markdown-style bold syntax
          const match = concept.match(/\*\*(.*?)\*\*: (.*)/);
          if (match) {
            const term = match[1];
            const definition = match[2];
            return `
              <li class="concept-item">
                <span class="concept-term" role="button" data-search-term="${term}">${term}</span>
                <span class="concept-definition">${definition}</span>
              </li>`;
          }
          // If no markdown syntax, just return the concept as is
          return `<li class="concept-item">${concept}</li>`;
        });

        conceptsContainer.innerHTML = `
          <div class="related-concepts">
            <h2>Related Concepts</h2>
            <ul class="concepts-list">
              ${formattedConcepts.join('')}
            </ul>
          </div>
        `;
      } else if (response.status === 'Error') {
        showRelatedConceptsError(response.message);
      }
      
      conceptsContainer.classList.remove('hidden');
      btn.remove(); // Remove the button after concepts are loaded

      // Add click handlers for concept terms
      conceptsContainer.querySelectorAll('.concept-term').forEach(term => {
        term.addEventListener('click', () => {
          const searchTerm = term.dataset.searchTerm;
          document.getElementById('searchTerm').value = searchTerm;
          document.getElementById('relatedConceptsContainer').classList.add('hidden');
          performSearch();
        });
      });
    });
  });

  // Add click handlers for history items and remove buttons
  document.querySelectorAll('.history-item').forEach(item => {
    // Click handler for the history content
    item.querySelector('.history-content').addEventListener('click', () => {
      document.getElementById('searchTerm').value = item.dataset.term;
      performSearch();
      hideHistoryDropdown();
    });

    // Click handler for the remove button
    item.querySelector('.remove-history').addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the click from bubbling up
      const term = item.dataset.term;
      chrome.storage.local.get(['searchHistory'], (result) => {
        let history = result.searchHistory || [];
        history = history.filter(item => item !== term);
        chrome.storage.local.set({ searchHistory: history }, () => {
          loadSearchHistory();
        });
      });
    });
  });

  // Add click handlers for concept terms
  document.querySelectorAll('.concept-term').forEach(term => {
    term.addEventListener('click', () => {
      const searchTerm = term.dataset.searchTerm;
      document.getElementById('searchTerm').value = searchTerm;
      performSearch();
    });
  });
}

function showRelatedConceptsError(message) {
  const container = document.getElementById('relatedConceptsContainer');
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="error-message">
      <span class="material-icons">error_outline</span>
      <span>${message}</span>
    </div>
  `;
}

// Function to perform the search
function performSearch() {
  const term = document.getElementById('searchTerm').value.trim();
  console.log('Performing search for term:', term);
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
        console.log('Received response from content.js:', response);
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
                console.log('Received response after injection:', response);
                if (chrome.runtime.lastError) {
                  console.error('Runtime error:', chrome.runtime.lastError);
                  loadingEl.classList.add('hidden');
                  resultsEl.innerHTML = `
                    <div class="error-message">
                      <span class="material-icons">error_outline</span>
                      <span>${chrome.runtime.lastError.message}</span>
                    </div>
                  `;
                  return;
                }
                loadingEl.classList.add('hidden');
                if (response && response.status) {
                  if (response.matches) {
                    if (response.matches.length > 0) {
                      // Save search to history
                      saveSearchHistory(term);
                      // Display results immediately without fetching related concepts
                      handleSearchResults(response.matches, term);
                    } else {
                      resultsEl.innerHTML = `
                        <div class="info-message">
                          <span class="material-icons">info</span>
                          <span>No matches found in ${response.totalPages} page${response.totalPages !==1 ? 's' : ''}</span>
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
              // Display results immediately without fetching related concepts
              handleSearchResults(response.matches, term);
            } else {
              resultsEl.innerHTML = `
                <div class="info-message">
                  <span class="material-icons">info</span>
                  <span>No matches found in ${response.totalPages} page${response.totalPages !==1 ? 's' : ''}</span>
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
  const historyList = document.getElementById('historyList');
  chrome.storage.local.get(['searchHistory'], (result) => {
    const history = result.searchHistory || [];
    historyList.innerHTML = history.map(term => `
      <div class="history-item" data-term="${term}">
        <div class="history-content" data-term="${term}">
          <span class="material-icons">history</span>
          <span>${term}</span>
        </div>
        <button class="remove-history" data-term="${term}">
          <span class="material-icons">close</span>
        </button>
      </div>
    `).join('');
    
    // Add click handlers to history items
    document.querySelectorAll('.history-content').forEach(item => {
      item.addEventListener('click', (e) => {
        document.getElementById('searchTerm').value = item.dataset.term;
        performSearch();
        hideHistoryDropdown();
      });
    });
    
    // Add click handlers for remove buttons
    document.querySelectorAll('.remove-history').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the parent's click event
        const termToRemove = button.dataset.term;
        chrome.storage.local.get(['searchHistory'], (result) => {
          let history = result.searchHistory || [];
          history = history.filter(term => term !== termToRemove);
          chrome.storage.local.set({ searchHistory: history }, () => {
            loadSearchHistory(); // Refresh the history list
          });
        });
      });
    });
  });
}

// Show/hide history dropdown
function showHistoryDropdown() {
  document.getElementById('searchHistoryDropdown').classList.remove('hidden');
}

function hideHistoryDropdown() {
  document.getElementById('searchHistoryDropdown').classList.add('hidden');
}

// Add event listeners for showing/hiding history
document.getElementById('searchTerm').addEventListener('focus', showHistoryDropdown);

// Hide dropdown when clicking outside
document.addEventListener('click', (event) => {
  const searchBox = document.querySelector('.search-box');
  if (!searchBox.contains(event.target)) {
    hideHistoryDropdown();
  }
});

// Initialize search history on popup load
document.addEventListener('DOMContentLoaded', loadSearchHistory);

// Add event listener for the Enter key
document.getElementById('searchTerm').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    performSearch();
  }
});

// Add click event listener for the search button
document.getElementById('searchButton').addEventListener('click', performSearch);

function exportResults() {
  const results = document.querySelectorAll('.match-item');
  let csv = 'Page,Context\n';
  
  results.forEach(result => {
    const page = result.querySelector('.match-page').textContent.replace('Page ', '');
    const text = result.querySelector('.match-text').textContent;
    csv += `${page},"${text.replace(/"/g, '""')}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'search-results.csv';
  a.click();
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + E to export
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
    e.preventDefault();
    exportResults();
  }
  // Ctrl/Cmd + F to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    document.getElementById('searchTerm').focus();
  }
});

// Toggle search options
document.getElementById('filterButton').addEventListener('click', () => {
  document.getElementById('searchOptions').classList.toggle('hidden');
});

// Toggle page range inputs
document.getElementById('pageRange').addEventListener('change', (e) => {
  document.getElementById('pageRangeInputs').classList.toggle('hidden', !e.target.checked);
});

// Add this function to handle history removal
function removeFromHistory(term) {
  chrome.storage.local.get(['searchHistory'], (result) => {
    let history = result.searchHistory || [];
    history = history.filter(item => item !== term);
    chrome.storage.local.set({ searchHistory: history }, () => {
      loadSearchHistory();
    });
  });
}
