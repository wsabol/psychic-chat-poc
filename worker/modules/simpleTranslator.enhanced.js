/**
 * Fast Translation using MyMemory API with Smart Chunking + OpenAI Fallback
 * 
 * Strategy:
 * 1. Extract text nodes from HTML (preserve structure)
 * 2. For each text node, intelligently chunk into sentences (≤450 chars each)
 * 3. Translate each chunk via MyMemory API
 * 4. Track failures - fallback to OpenAI on 3+ consecutive failures
 * 5. Reassemble chunks and rebuild HTML
 * 
 * Benefits over previous approach:
 * - MyMemory respects 500-char limit with 450-char buffer
 * - Smart sentence chunking prevents mid-sentence breaks
 * - Parallel tracking of chunk success/failure
 * - Automatic fallback to OpenAI if MyMemory fails
 */

import { smartChunkBySentence } from './utils/sentenceChunker.js';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANGUAGE_MAP = {
  'en-US': 'en',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'de-DE': 'de',
  'it-IT': 'it',
  'pt-BR': 'pt-BR',
  'ja-JP': 'ja',
  'zh-CN': 'zh-cn'
};

const LANGUAGE_NAMES = {
  'es-ES': 'Spanish',
  'en-GB': 'British English',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Brazilian Portuguese',
  'ja-JP': 'Japanese',
  'zh-CN': 'Simplified Chinese'
};

/**
 * Translate chunk via MyMemory with retry logic
 * 
 * @param {string} text - Text to translate (≤450 chars)
 * @param {string} targetLangCode - Language code (e.g., 'es')
 * @param {number} attempt - Retry attempt number
 * @returns {Promise<string>} Translated text or null on failure
 */
async function translateChunkViaMyMemory(text, targetLangCode, attempt = 1) {
  const maxAttempts = 3;
  const delayMs = 500;
  
  try {
    if (!text || text.trim().length === 0) {
      return text;
    }
    
    const len = text.length;
    if (len > 500) {
      console.warn(`[MYMEMORY] WARNING: Text ${len} chars may exceed 500 limit`);
    }
    
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLangCode}`;
    
    const response = await fetch(url, { timeout: 15000 });
    
    // Handle rate limiting with retry
    if (response.status === 429) {
      if (attempt < maxAttempts) {
        console.warn(`[MYMEMORY] 429 Rate limited (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs * attempt}ms`);
        await new Promise(r => setTimeout(r, delayMs * attempt));
        return translateChunkViaMyMemory(text, targetLangCode, attempt + 1);
      } else {
        console.error(`[MYMEMORY] 429 Rate limited - max retries exceeded`);
        return null; // Signal fallback needed
      }
    }
    
    if (!response.ok) {
      console.error(`[MYMEMORY] HTTP ${response.status}`);
      return null; // Signal fallback needed
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    } else {
      console.warn(`[MYMEMORY] API error: ${data.responseDetails}`);
      return null; // Signal fallback needed
    }
  } catch (err) {
    console.error(`[MYMEMORY] Error:`, err.message);
    return null; // Signal fallback needed
  }
}

/**
 * Translate via OpenAI (fallback from MyMemory)
 */
async function translateViaOpenAI(text, targetLanguage) {
  try {
    const targetLangName = LANGUAGE_NAMES[targetLanguage] || 'English';
    
    console.log(`[OPENAI-FALLBACK] Translating to ${targetLangName} via OpenAI`);
    
    const translationCompletion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional mystical translator. Translate the following oracle/tarot/astrology reading into ${targetLangName}. 
                    IMPORTANT: 
                    - Maintain all HTML tags exactly as they are
                    - Only translate text content inside tags, never the tags themselves
                    - Preserve all mystical terminology accurately
                    - Keep the same tone and spiritual essence
                    - Do NOT translate tarot card names or astrological signs
                    - Preserve crystal names and minerals in their common ${targetLangName} equivalents
                    Output: Valid HTML only, same structure as input`
        },
        {
          role: "user",
          content: `Translate this reading into ${targetLangName}:\n\n${text}`
        }
      ]
    });
    
    return translationCompletion.choices[0]?.message?.content || text;
  } catch (err) {
    console.error(`[OPENAI-FALLBACK] Error:`, err.message);
    return text; // Return original on error
  }
}

/**
 * Extract text nodes from HTML, preserving structure
 * Returns array of {isTag: boolean, content: string}
 */
function extractTextNodes(html) {
  const nodes = [];
  let pos = 0;
  
  // Regex to find tags
  const tagRegex = /<[^>]+>/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    // Text before tag
    if (match.index > pos) {
      const text = html.substring(pos, match.index).trim();
      if (text) {
        nodes.push({ isTag: false, content: text });
      }
    }
    // Tag itself
    nodes.push({ isTag: true, content: match[0] });
    pos = match.index + match[0].length;
  }
  
  // Remaining text
  if (pos < html.length) {
    const text = html.substring(pos).trim();
    if (text) {
      nodes.push({ isTag: false, content: text });
    }
  }
  
  return nodes.length > 0 ? nodes : [{ isTag: false, content: html }];
}

/**
 * Rebuild HTML from nodes with translated text
 */
function rebuildHTML(nodes, translatedTexts) {
  let result = '';
  let textIdx = 0;
  
  for (const node of nodes) {
    if (node.isTag) {
      result += node.content;
    } else {
      // Use translated version if available
      result += translatedTexts[textIdx] || node.content;
      textIdx++;
    }
  }
  
  return result;
}

/**
 * Translate text nodes using smart chunking + MyMemory with OpenAI fallback
 * 
 * @param {Array} textNodes - Array of text node strings
 * @param {string} targetLangCode - MyMemory language code (e.g., 'es')
 * @param {string} targetLanguage - Full language code (e.g., 'es-ES')
 * @returns {Promise<Array>} Array of translated text nodes
 */
async function translateTextNodesSmartChunking(textNodes, targetLangCode, targetLanguage) {
  if (textNodes.length === 0) return [];
  
  const translatedNodes = [];
  let consecutiveFailures = 0;
  const failureThreshold = 3;
  let useOpenAIFallback = false;
  
  for (let nodeIdx = 0; nodeIdx < textNodes.length; nodeIdx++) {
    const nodeText = textNodes[nodeIdx];
    
    console.log(`[TRANSLATOR] Processing text node ${nodeIdx + 1}/${textNodes.length} (${nodeText.length} chars)`);
    
    // Smart chunk this node into sentence-bounded pieces
    const chunks = smartChunkBySentence(nodeText, 450);
    console.log(`[TRANSLATOR]   → Chunked into ${chunks.length} pieces for translation`);
    
    const nodeTranslations = [];
    
    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const chunk = chunks[chunkIdx];
      
      console.log(`[TRANSLATOR]   Chunk ${chunkIdx + 1}/${chunks.length}: ${chunk.charCount} chars, ${chunk.sentenceCount} sentences`);
      
      let translatedChunk;
      
      // Try MyMemory first (unless we've hit failure threshold)
      if (!useOpenAIFallback && consecutiveFailures < failureThreshold) {
        translatedChunk = await translateChunkViaMyMemory(chunk.text, targetLangCode);
        
        if (translatedChunk === null) {
          consecutiveFailures++;
          console.log(`[TRANSLATOR]   ⚠ MyMemory failed (${consecutiveFailures}/${failureThreshold})`);
          
          // Check if we should fallback to OpenAI
          if (consecutiveFailures >= failureThreshold) {
            console.log(`[TRANSLATOR] ✗ MyMemory failure threshold reached - switching to OpenAI for remaining content`);
            useOpenAIFallback = true;
            translatedChunk = chunk.text; // Use original for now, will re-translate with full text
          } else {
            translatedChunk = chunk.text; // Use original as fallback
          }
        } else {
          consecutiveFailures = 0; // Reset on success
          console.log(`[TRANSLATOR]   ✓ MyMemory success`);
        }
      } else if (useOpenAIFallback) {
        // Use original text, will be translated as whole node
        translatedChunk = chunk.text;
      } else {
        translatedChunk = chunk.text;
      }
      
      nodeTranslations.push(translatedChunk);
      
      // Small delay between requests to avoid rate limiting
      if (chunkIdx < chunks.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // Reassemble chunks back into full node text
    let reassembledNode = nodeTranslations.join(' ').trim();
    
    // If we switched to OpenAI fallback, translate the full node via OpenAI
    if (useOpenAIFallback) {
      console.log(`[TRANSLATOR] Translating node ${nodeIdx + 1} via OpenAI fallback...`);
      reassembledNode = await translateViaOpenAI(nodeText, targetLanguage);
      useOpenAIFallback = false; // Reset for next node
      consecutiveFailures = 0;
    }
    
    translatedNodes.push(reassembledNode);
  }
  
  return translatedNodes;
}

/**
 * Main translation function
 */
export async function translateText(html, targetLanguage) {
  try {
    if (targetLanguage === 'en-US' || !targetLanguage || !html) {
      return html;
    }

    const targetLangCode = LANGUAGE_MAP[targetLanguage];
    if (!targetLangCode) {
      console.warn(`[TRANSLATOR] Unsupported: ${targetLanguage}`);
      return html;
    }

    const isHTML = /<[^>]+>/.test(html);
    console.log(`[TRANSLATOR] Start: ${targetLanguage}, ${html.length} chars, HTML=${isHTML}`);
    
    if (!isHTML) {
      // Plain text - chunk and translate
      const chunks = smartChunkBySentence(html, 450);
      const translatedChunks = [];
      
      for (const chunk of chunks) {
        const translated = await translateChunkViaMyMemory(chunk.text, targetLangCode);
        translatedChunks.push(translated || chunk.text);
        await new Promise(r => setTimeout(r, 500)); // Delay between requests
      }
      
      return translatedChunks.join(' ').trim();
    }
    
    // HTML: Extract, translate with smart chunking, rebuild
    console.log(`[TRANSLATOR] Extracting text from HTML...`);
    const nodes = extractTextNodes(html);
    console.log(`[TRANSLATOR] Found ${nodes.length} nodes (${nodes.filter(n => !n.isTag).length} text)`);
    
    // Get text nodes only
    const textNodes = nodes.filter(n => !n.isTag).map(n => n.content);
    
    // Translate with smart chunking
    const translatedTexts = await translateTextNodesSmartChunking(textNodes, targetLangCode, targetLanguage);
    
    // Rebuild
    const result = rebuildHTML(nodes, translatedTexts);
    console.log(`[TRANSLATOR] ✓ Done`);
    return result;
    
  } catch (err) {
    console.error(`[TRANSLATOR] Error:`, err.message);
    return html;
  }
}

/**
 * Translate content object
 */
export async function translateContentObject(contentObj, targetLanguage) {
  try {
    if (targetLanguage === 'en-US' || !targetLanguage || !contentObj) {
      return contentObj;
    }

    if (typeof contentObj === 'string') {
      return await translateText(contentObj, targetLanguage);
    }

    if (contentObj?.text) {
      const translated = await translateText(contentObj.text, targetLanguage);
      return {
        ...contentObj,
        text: translated
      };
    }

    return contentObj;
  } catch (err) {
    console.error(`[TRANSLATOR] Error:`, err.message);
    return contentObj;
  }
}
