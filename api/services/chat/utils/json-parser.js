/**
 * JSON Parsing Utilities
 * Centralized JSON parsing logic with error handling
 */

/**
 * Safely parse JSON content, handling already-parsed objects
 * @param {string|Object} content - Content to parse
 * @returns {Object|string} Parsed content or original if already parsed/not JSON
 */
export function parseJsonContent(content) {
    if (!content) {
        return content;
    }
    
    // If already an object, return as-is
    if (typeof content !== 'string') {
        return content;
    }
    
    // Try to parse JSON
    try {
        return JSON.parse(content);
    } catch (e) {
        // Not valid JSON or already parsed, return as-is
        return content;
    }
}

/**
 * Parse both content_full and content_brief from a message
 * @param {Object} message - Message object with content fields
 * @returns {Object} Message with parsed content fields
 */
export function parseMessageContent(message) {
    if (!message) {
        return message;
    }
    
    return {
        ...message,
        content_full: parseJsonContent(message.content_full),
        content_brief: parseJsonContent(message.content_brief)
    };
}

/**
 * Extract text from parsed content (handles various formats)
 * @param {Object|string} content - Parsed content
 * @returns {string|Object} Extracted text or original content
 */
export function extractText(content) {
    if (!content) {
        return content;
    }
    
    if (typeof content === 'string') {
        return content;
    }
    
    // Try common text field patterns
    return content.text || content.message || content;
}
