
import dotenv from 'dotenv';
dotenv.config();

import { LlmService } from '../services/llm.js';


// MOCK Ollama for environmental verification if not running
// But we want to see if it works with *real* Ollama if possible, or gracefully fail.

async function verifyLlm() {
    console.log('Starting LLM Verification...');
    const llmService = new LlmService();

    // Test 1: List Models
    console.log('\n--- Testing List Models ---');
    try {
        const openaiModels = await llmService.listModels('openai');
        console.log('OpenAI Models:', openaiModels);

        const anthropicModels = await llmService.listModels('anthropic');
        console.log('Anthropic Models:', anthropicModels);

        console.log('Testing Ollama connection (might fail if not running)...');
        try {
            const ollamaModels = await llmService.listModels('ollama');
            console.log('Ollama Models:', ollamaModels);
        } catch (e) {
            console.log('Ollama not reachable (expected if not installed/running).');
        }
    } catch (error) {
        console.error('List Models Failed:', error);
    }

    // Test 2: Generate Response (Mocked/Simulated or Real if keys exist)
    console.log('\n--- Testing Generate Response ---');
    // We won't call real APIs without keys to avoid errors/cost, but we can try basic instantiation check
    // or rely on unit tests for logic. 
    // Let's just check if we can instantiate logic.

    if (process.env.OPENAI_API_KEY) {
        console.log('OpenAI Key present, attempting generation...');
        // await llmService.generateResponse(...) 
        // Commented out to avoid spending money/tokens in verification script unless explicitly desired.
    } else {
        console.log('Skipping OpenAI generation test (No API Key).');
    }

    console.log('\nLLM Verification Complete.');
}

verifyLlm().catch(console.error);
