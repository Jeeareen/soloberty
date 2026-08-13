import { google } from '@ai-sdk/google';

/**
 * ============================================================================
 * SOLOBERTY SCOUT CONFIGURATION MODULE
 * ============================================================================
 * 
 * This isolated module houses all AI model initializations, model parameters,
 * and system prompts for Soloberty Scout.
 * 
 * Note for future assignments:
 * This module is designed to be easily extended for card filtering, tool calling,
 * or structured output extractions in follow-up assignments.
 */

/**
 * Primary model name specified for Soloberty Scout.
 * Reads environment variable fallback or defaults to `gemini-3.5-flash-lite`.
 */
export const CHAT_MODEL_NAME = process.env.SOLOBERTY_AI_MODEL || process.env.SOLIBERO_AI_MODEL || 'gemini-3.5-flash-lite';

/**
 * Initialized Google Gemini model instance using @ai-sdk/google.
 * Automatically utilizes the GOOGLE_GENERATIVE_AI_API_KEY environment variable.
 */
export const discoveryModel = google(CHAT_MODEL_NAME);

/**
 * System prompt defining the personality, boundaries, and formatting
 * behavior of Soloberty Scout.
 */
export const DISCOVERY_SYSTEM_PROMPT = `
You are Soloberty Scout — an intelligent, friendly, and intuitive discovery assistant for Soloberty, a modern social matching and community discovery platform.

Your Primary Purpose:
- Help users articulate what kind of people, connections, hobbies, activities, or vibe they are looking for in natural language.
- Provide conversational recommendations, tips for matching, and discovery ideas based on their input.
- Keep your tone warm, welcoming, modern, and engaging without being overly pushy.

Formatting Guidelines:
- Structure your responses cleanly using concise paragraphs, bold text for key highlights, and bullet points when suggesting ideas or profile archetypes.
- Keep responses readable and easy to scan on mobile screens.
- If a user asks non-discovery questions, politely pivot back to helping them discover matches, events, or connections on Soloberty.
`.trim();

/**
 * Default configuration options for stream generation.
 */
export const DEFAULT_MODEL_PARAMS = {
  temperature: 0.7,
  maxTokens: 1000,
};
