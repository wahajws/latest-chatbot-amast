const fs = require('fs');
const path = require('path');

let pdfContent = '';
let pdfParse = null;

// Try to load pdf-parse
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.warn('⚠️  pdf-parse not installed. PDF content will not be loaded.');
}

// Load PDF manual content
async function loadPDFManual() {
  if (!pdfParse) {
    console.warn('⚠️  PDF parsing not available.');
    return false;
  }
  
  try {
    // Try multiple possible paths
    const possiblePaths = [
      process.env.PDF_MANUAL_PATH,
      path.join(__dirname, '../../../AMAST Sales Manual - DMS.pdf'), // From backend/src/services to project root
      path.join(__dirname, '../../AMAST Sales Manual - DMS.pdf'),   // From backend/src/services (fallback)
      path.join(process.cwd(), 'AMAST Sales Manual - DMS.pdf'),      // From current working directory
      path.join(process.cwd(), '../AMAST Sales Manual - DMS.pdf'),  // From backend directory
    ].filter(Boolean);
    
    let pdfPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        pdfPath = testPath;
        break;
      }
    }
    
    if (!pdfPath) {
      console.warn(`⚠️  PDF file not found. Tried paths:`, possiblePaths);
      return false;
    }
    
    console.log('📖 Loading PDF manual...');
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    
    // Extract text and limit to reasonable size (50,000 characters for token management)
    pdfContent = pdfData.text.substring(0, 50000);
    
    // If PDF is very large, create a summary of key sections
    if (pdfData.text.length > 50000) {
      const lines = pdfData.text.split('\n');
      const keySections = [];
      let currentSection = '';
      
      for (const line of lines) {
        // Look for lines that might be headings
        if (line.length < 100 && (line === line.toUpperCase() || /^\d+\./.test(line.trim()))) {
          if (currentSection) {
            keySections.push(currentSection.substring(0, 2000));
          }
          currentSection = line + '\n';
        } else if (currentSection) {
          currentSection += line + '\n';
          if (currentSection.length > 2000) {
            keySections.push(currentSection);
            currentSection = '';
          }
        }
      }
      
      if (keySections.length > 0) {
        pdfContent = keySections.join('\n\n---\n\n').substring(0, 50000);
      }
    }
    
    console.log(`✅ Loaded PDF manual: ${pdfContent.length.toLocaleString()} characters`);
    return true;
  } catch (error) {
    console.error('❌ Error loading PDF:', error.message);
    return false;
  }
}

// Get PDF content
function getPDFContent(maxLength = 15000) {
  return pdfContent.substring(0, maxLength);
}

module.exports = {
  loadPDFManual,
  getPDFContent,
};

