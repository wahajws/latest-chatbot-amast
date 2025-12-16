const https = require('https');
require('dotenv').config();

const config = {
  apiKey: process.env.ALIBABA_LLM_API_KEY,
  apiBaseUrl: process.env.ALIBABA_LLM_API_BASE_URL,
  model: process.env.ALIBABA_LLM_API_MODEL || 'qwen-plus',
};

// Default timeout: 3 minutes (180 seconds) for LLM API calls
const DEFAULT_TIMEOUT = 180000; // 3 minutes in milliseconds

// Call Qwen API
async function callQwenAPI(messages, temperature = 0.7, timeout = DEFAULT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${config.apiBaseUrl}/chat/completions`);
    const startTime = Date.now();
    
    console.log(`📡 Starting LLM API request (timeout: ${timeout/1000}s)...`);
    
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
      timeout: timeout, // Set timeout on the request
    };
    
    let timeoutId;
    let isResolved = false;
    
    const req = https.request(options, (res) => {
      const connectionTime = Date.now() - startTime;
      console.log(`✅ LLM API connection established (${connectionTime}ms)`);
      
      let data = '';
      
      // Clear timeout once we start receiving data
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set a new timeout for reading the response
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          req.destroy();
          const elapsed = Date.now() - startTime;
          console.error(`❌ LLM API response timeout after ${elapsed}ms (${timeout/1000}s limit)`);
          reject(new Error(`LLM API response timeout after ${timeout}ms. The API is taking too long to respond.`));
        }
      }, timeout);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (isResolved) return;
        isResolved = true;
        if (timeoutId) clearTimeout(timeoutId);
        
        const totalTime = Date.now() - startTime;
        console.log(`📥 LLM API response received (${totalTime}ms, ${(data.length/1024).toFixed(1)}KB)`);
        
        try {
          const response = JSON.parse(data);
          if (response.error) {
            console.error(`❌ LLM API error: ${response.error.message}`);
            reject(new Error(response.error.message || 'API Error'));
          } else if (response.choices && response.choices[0]) {
            console.log(`✅ LLM API request completed successfully (${totalTime}ms)`);
            resolve(response.choices[0].message.content);
          } else {
            console.error(`❌ LLM API unexpected response format`);
            reject(new Error('Unexpected API response format'));
          }
        } catch (error) {
          console.error(`❌ LLM API parse error: ${error.message}`);
          reject(new Error(`Parse error: ${error.message}`));
        }
      });
    });
    
    // Set timeout for connection and request sending
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        req.destroy();
        const elapsed = Date.now() - startTime;
        console.error(`❌ LLM API request timeout after ${elapsed}ms (${timeout/1000}s limit)`);
        reject(new Error(`LLM API request timeout after ${timeout}ms. The API is not responding.`));
      }
    }, timeout);
    
    req.on('error', (error) => {
      if (isResolved) return;
      isResolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      console.error(`❌ LLM API request error after ${elapsed}ms:`, error.message);
      reject(error);
    });
    
    req.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        req.destroy();
        const elapsed = Date.now() - startTime;
        console.error(`❌ LLM API connection timeout after ${elapsed}ms (${timeout/1000}s limit)`);
        reject(new Error(`LLM API connection timeout after ${timeout}ms`));
      }
    });
    
    req.write(requestData);
    req.end();
  });
}

module.exports = {
  callQwenAPI,
  config,
};







