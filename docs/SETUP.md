# Setup Guide

## Project Overview
This is a chatbot application that uses Alibaba Qwen LLM to intelligently query a PostgreSQL database containing 300+ tables. The application understands the database schema and the AMAST Sales Manual to answer questions.

## Documentation
- **PROJECT_PROMPT.md**: Comprehensive design document with all specifications
- **AI_PROMPT.md**: Concise prompt for AI-assisted development
- **UI_SPECIFICATION.md**: Detailed ChatGPT clone UI specifications (pixel-perfect match required)
- **QWEN_ARCHITECTURE.md**: Detailed explanation of how Qwen understands the database and answers questions
- **SCHEMA_OPTIMIZATION.md**: Critical optimization strategy - how to efficiently send schema to Qwen (NOT all 300+ tables with every query)

## Key Features
- React.js frontend with modern dashboard
- Node.js/Express.js backend
- PostgreSQL database integration
- Alibaba Qwen LLM integration
- Chat history and user management
- SQL query generation and execution
- Result refinement using LLM

## Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database server (already running)
- Alibaba Qwen API access
- Access to "AMAST Sales Manual - DMS.pdf"

## Next Steps
1. Review PROJECT_PROMPT.md for complete specifications
2. Use AI_PROMPT.md as a prompt for development
3. Set up environment variables
4. Initialize project structure
5. Follow development phases outlined in PROJECT_PROMPT.md

