const https = require('https');
require('dotenv').config();

const config = {
  apiKey: process.env.ALIBABA_LLM_API_KEY,
  apiBaseUrl: process.env.ALIBABA_LLM_API_BASE_URL,
  model: process.env.ALIBABA_LLM_API_MODEL || 'qwen-plus',
};

// Call Qwen API
async function callQwenAPI(messages, temperature = 0.7) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.apiBaseUrl}/chat/completions`);
    
    const requestData = JSON.stringify({
      model: config.model,
      messages: messages,
      temperature: temperature,
    });
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Length': Buffer.byteLength(requestData),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message || 'API Error'));
          } else if (response.choices && response.choices[0]) {
            resolve(response.choices[0].message.content);
          } else {
            reject(new Error('Unexpected API response format'));
          }
        } catch (error) {
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(requestData);
    req.end();
  });
}

module.exports = {
  callQwenAPI,
  config,
};

