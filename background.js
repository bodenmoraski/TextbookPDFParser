// Function to load environment variables
async function loadEnvVariables() {
  try {
    const response = await fetch(chrome.runtime.getURL('.env'));
    const text = await response.text();
    const vars = {};
    
    text.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        vars[key.trim()] = value.trim().replace(/^['"]|['"]$/g, '');
      }
    });
    
    console.log('Loaded API key:', vars.OPENAI_API_KEY ? 'Present' : 'Missing');
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
      console.log('API Key status:', env.OPENAI_API_KEY ? 'Present' : 'Missing');
      if (!env.OPENAI_API_KEY) {
        sendResponse({status: 'Error', message: 'API key not found', concepts: []});
        return;
      }
      
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-2024-07-18',
          messages: [{
            role: 'system',
            content: 'You are a helpful assistant that provides related concepts and topics.'
          }, {
            role: 'user',
            content: `List 3-5 closely related concepts or topics for "${searchTerm}" in a simple bullet point format. Keep each point brief and directly related.`
          }],
          temperature: 0.3,
          max_tokens: 150,
          presence_penalty: 0,
          frequency_penalty: 0
        })
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(errorData => {
            console.error('API Error Details:', errorData);
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('API Response:', data);
        if (data.choices && data.choices[0] && data.choices[0].message) {
          const relatedConcepts = data.choices[0].message.content
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
            .filter(line => line.length > 0);
          sendResponse({status: 'Success', concepts: relatedConcepts});
        } else {
          console.error('Invalid API response:', data);
          sendResponse({status: 'Error', message: 'Invalid API response', concepts: []});
        }
      })
      .catch(error => {
        console.error('Error fetching related concepts:', error);
        const errorMessage = error.message.includes('API request failed') 
          ? error.message 
          : 'Failed to fetch related concepts. Please try again.';
        sendResponse({status: 'Error', message: errorMessage, concepts: []});
      });
    });
    return true;
  }
});
