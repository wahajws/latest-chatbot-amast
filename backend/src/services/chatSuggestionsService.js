const { getSchema } = require('./schemaService');
const { getActiveDatabase, getDatabaseById } = require('./databaseManager');
const { callQwenAPI } = require('../config/qwen');
const logger = require('./loggerService');

/**
 * Generate AI-powered suggested questions based on database schema
 */
async function generateChatSuggestions(databaseId = null) {
  try {
    const activeDb = databaseId 
      ? await getDatabaseById(databaseId)
      : await getActiveDatabase();
    
    if (!activeDb) {
      return [];
    }

    const schema = getSchema(activeDb.id);
    if (!schema || !schema.tables) {
      return getDefaultSuggestions();
    }

    const dbType = activeDb.database_type?.toLowerCase() || 'postgresql';
    const databaseInstructions = activeDb.instructions || '';

    // Create schema summary for LLM
    const schemaSummary = createSchemaSummaryForSuggestions(schema);

    // Build prompt for LLM
    const prompt = `You are an AI assistant helping users query a ${dbType} database. Based on the database schema below, generate 5-6 relevant, natural language questions that users might ask.

**Database Schema:**
${schemaSummary}

${databaseInstructions ? `\n**Database-specific context:**\n${databaseInstructions}\n` : ''}

**Requirements:**
1. Generate 5-6 diverse, practical questions
2. Questions should be natural and conversational (e.g., "What was the revenue last month?" not "SELECT SUM(revenue) FROM...")
3. Questions should be relevant to the actual tables and columns in the schema
4. Include questions about:
   - Aggregations (totals, counts, averages)
   - Trends over time
   - Top/bottom rankings
   - Comparisons
   - Filters and conditions
5. Use actual table and column names from the schema
6. Make questions specific and actionable

**Output Format:**
Return a JSON array of question strings, like:
["Question 1", "Question 2", "Question 3", "Question 4", "Question 5"]

Generate the questions now.`;

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that generates relevant database query suggestions based on schema information. Always return valid JSON arrays.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    logger.info('Generating AI chat suggestions', { databaseId: activeDb.id, dbType });

    const response = await callQwenAPI(messages, 0.7);
    
    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          // Filter and clean suggestions
          return suggestions
            .filter(q => q && typeof q === 'string' && q.trim().length > 0)
            .slice(0, 6)
            .map(q => q.trim());
        }
      } catch (error) {
        logger.error('Error parsing suggestions JSON:', error);
      }
    }

    // Fallback to default suggestions
    return getDefaultSuggestions();
  } catch (error) {
    logger.error('Error generating chat suggestions:', error);
    return getDefaultSuggestions();
  }
}

/**
 * Create a lightweight schema summary for suggestions
 */
function createSchemaSummaryForSuggestions(schema) {
  const tables = schema.tables.filter(t => t.has_data && t.row_count > 0);
  
  const summary = tables.slice(0, 20).map(table => {
    const columns = table.columns
      .filter(col => {
        const name = col.name.toLowerCase();
        return name.includes('date') || 
               name.includes('time') || 
               name.includes('amount') || 
               name.includes('total') || 
               name.includes('revenue') || 
               name.includes('sales') || 
               name.includes('price') || 
               name.includes('quantity') || 
               name.includes('count') ||
               col.category === 'numeric' ||
               col.category === 'date';
      })
      .slice(0, 10)
      .map(col => ({
        name: col.name,
        type: col.type,
        category: col.category
      }));

    return {
      name: table.name,
      row_count: table.row_count,
      key_columns: columns
    };
  });

  return JSON.stringify(summary, null, 2);
}

/**
 * Default fallback suggestions
 */
function getDefaultSuggestions() {
  return [
    'What was the revenue last month?',
    'Show me top 10 outlets by sales',
    'Compare sales this year and last year',
    'What are the best selling products?',
    'Show me recent transactions',
    'What is the total inventory value?'
  ];
}

module.exports = {
  generateChatSuggestions,
};

