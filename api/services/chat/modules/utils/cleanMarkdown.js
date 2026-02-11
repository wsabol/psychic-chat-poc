/**
 * Clean markdown code fences from content
 * Removes ```language and ``` markers that OpenAI sometimes adds
 */
export function cleanMarkdownCodeFences(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    // Remove opening code fence with optional language specifier (e.g., ```html, ```json, ```)
    let cleaned = text.replace(/^```[\w]*\n?/gm, '');
    
    // Remove closing code fence
    cleaned = cleaned.replace(/\n?```$/gm, '');
    
    return cleaned.trim();
}
