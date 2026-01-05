/**
 * Fast Translation using MyMemory API
 * 
 * Strategy: Extract text from HTML, translate just the text portions,
 * rebuild HTML with translated text. Minimize API calls by batching.
 */

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

/**
 * Translate text via MyMemory
 */
async function translateChunk(text, targetLangCode) {
  try {
    if (!text || text.trim().length === 0) {
      return text;
    }
    
    const len = text.length;
    if (len > 500) {
      console.warn(`[MYMEMORY] Text ${len} chars exceeds 500 limit, will fail`);
    }
    
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLangCode}`;
    
    const response = await fetch(url, { timeout: 15000 });
    
    if (response.status === 429) {
      console.warn(`[MYMEMORY] 429 Rate limited`);
      return text; // Return original on rate limit
    }
    
    if (!response.ok) {
      console.error(`[MYMEMORY] HTTP ${response.status}`);
      return text;
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    } else {
      console.warn(`[MYMEMORY] Failed: ${data.responseDetails}`);
      return text;
    }
  } catch (err) {
    console.error(`[MYMEMORY] Error:`, err.message);
    return text;
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
 * Batch translate text nodes - combine them to minimize API calls
 */
async function batchTranslateTexts(textNodes, targetLangCode) {
  if (textNodes.length === 0) return [];
  
  console.log(`[TRANSLATOR] Batch translating ${textNodes.length} text nodes`);
  
  // Combine all text with a separator (newline)
  const combined = textNodes.join('\n');
  
  if (combined.length > 500) {
    console.warn(`[TRANSLATOR] Combined text ${combined.length} chars exceeds 500 limit`);
    // Translate each separately
    const results = [];
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes[i];
      console.log(`[TRANSLATOR] Translating node ${i + 1}/${textNodes.length} (${node.length} chars)`);
      const translated = await translateChunk(node, targetLangCode);
      results.push(translated);
      
      // Small delay between requests
      if (i < textNodes.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    return results;
  }
  
  // Under 500 chars, translate as one batch
  console.log(`[TRANSLATOR] Combined ${textNodes.length} nodes into one request (${combined.length} chars)`);
  const translated = await translateChunk(combined, targetLangCode);
  
  // Split back by newline
  return translated.split('\n');
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
      // Plain text
      return await translateChunk(html, targetLangCode);
    }
    
    // HTML: Extract, translate, rebuild
    console.log(`[TRANSLATOR] Extracting text from HTML...`);
    const nodes = extractTextNodes(html);
    console.log(`[TRANSLATOR] Found ${nodes.length} nodes (${nodes.filter(n => !n.isTag).length} text)`);
    
    // Get text nodes only
    const textNodes = nodes.filter(n => !n.isTag).map(n => n.content);
    
    // Batch translate
    const translatedTexts = await batchTranslateTexts(textNodes, targetLangCode);
    
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
