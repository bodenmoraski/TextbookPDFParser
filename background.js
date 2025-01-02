// Function to load environment variables
async function loadEnvVariables() {
  try {
    const response = await fetch(chrome.runtime.getURL('.env'));
    const text = await response.text();
    const vars = {};
    
    text.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        vars[key.trim()] = value.trim();
      }
    });
    
    return vars;
  } catch (error) {
    console.error('Error loading .env file:', error);
    return {};
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI-Powered Searchable Textbook Extension Installed');
});

// Listener for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'searchTerm') {
    // Handle the search term logic here
    sendResponse({status: 'Search term received', term: request.term});
  }
  
  if (request.action === 'getRelatedConcepts') {
    const searchTerm = request.term;
    loadEnvVariables().then(env => {
      fetch('https://api.openai.com/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-davinci-003',
          prompt: `List related concepts or topics for the term "${searchTerm}".`,
          max_tokens: 100,
          n: 1,
          stop: null,
          temperature: 0.7,
        })
      })
      .then(response => response.json())
      .then(data => {
        const relatedConcepts = data.choices[0].text.trim().split('\n').filter(line => line);
        sendResponse({status: 'Related concepts fetched', concepts: relatedConcepts});
      })
      .catch(error => {
        console.error('Error fetching related concepts:', error);
        sendResponse({status: 'Error fetching related concepts'});
      });
      return true; // Keep the message channel open for sendResponse
    });
  }
});
