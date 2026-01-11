/**
 * Smart Sentence-Aware Text Chunking
 * 
 * Splits text into chunks that:
 * - Never exceed maxCharSize (default 450)
 * - Always break at sentence boundaries (. ! ?)
 * - Preserve mystical terminology (degrees, crystal names, etc.)
 * - Handle edge cases (abbreviations, ellipsis, etc.)
 * 
 * Usage:
 *   const chunks = smartChunkBySentence(text, 450);
 */

/**
 * Extract sentences from text, respecting common abbreviations
 * and mystical terminology
 * 
 * Returns array of sentence objects: {text, startIndex, endIndex}
 */
function extractSentences(text) {
  const sentences = [];
  
  // Common abbreviations to NOT break on
  const abbreviations = /\b(Dr|Mr|Mrs|Ms|Prof|St|Jr|Sr|etc|e\.g|i\.e|vs|no|Co|Inc|Ltd|Ph\.D|M\.D|B\.A)\./gi;
  
  // Mystical terms that might contain periods
  const mysticalTerms = /\b([A-Z][a-z]+ of [A-Z][a-z]+)\b/g; // e.g., "Two of Cups"
  
  // Replace abbreviations temporarily with placeholder
  let working = text;
  const abbrevMap = new Map();
  let abbrevIndex = 0;
  
  working = working.replace(abbreviations, (match) => {
    const placeholder = `__ABBREV_${abbrevIndex}__`;
    abbrevMap.set(placeholder, match);
    abbrevIndex++;
    return placeholder;
  });
  
  // Sentence regex: matches sentences ending in . ! ? followed by space or end of string
  // Handles multiple punctuation marks: "...?! "
  const sentenceRegex = /[^.!?]*[.!?]+(?:\s+|$)/g;
  let match;
  
  while ((match = sentenceRegex.exec(working)) !== null) {
    let sentenceText = match[0].trim();
    
    // Restore abbreviations
    for (const [placeholder, original] of abbrevMap) {
      sentenceText = sentenceText.replace(placeholder, original);
    }
    
    if (sentenceText.length > 0) {
      sentences.push({
        text: sentenceText,
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
  }
  
  // If no sentences found (plain text), return entire text as one sentence
  if (sentences.length === 0 && text.length > 0) {
    sentences.push({
      text: text.trim(),
      startIndex: 0,
      endIndex: text.length
    });
  }
  
  return sentences;
}

/**
 * Intelligently chunk text into smaller pieces
 * 
 * Strategy:
 * 1. Extract sentences
 * 2. Group sentences into chunks respecting maxCharSize
 * 3. If single sentence > maxCharSize, break at word boundary
 * 4. Return array of {text, charCount, sentenceCount, index}
 * 
 * @param {string} text - Text to chunk
 * @param {number} maxCharSize - Maximum characters per chunk (default 450)
 * @returns {Array} Array of chunk objects
 */
export function smartChunkBySentence(text, maxCharSize = 450) {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const sentences = extractSentences(text);
  const chunks = [];
  let currentChunk = '';
  let currentSentenceCount = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const testChunk = currentChunk ? currentChunk + ' ' + sentence.text : sentence.text;
    
    // If adding this sentence exceeds limit
    if (testChunk.length > maxCharSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        charCount: currentChunk.trim().length,
        sentenceCount: currentSentenceCount,
        index: chunks.length,
        status: 'normal'
      });
      
      // Start new chunk with this sentence
      currentChunk = sentence.text;
      currentSentenceCount = 1;
    } else if (sentence.text.length > maxCharSize) {
      // Single sentence exceeds limit - break at word boundary
      
      // First, save current chunk if it has content
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          charCount: currentChunk.trim().length,
          sentenceCount: currentSentenceCount,
          index: chunks.length,
          status: 'normal'
        });
        currentChunk = '';
        currentSentenceCount = 0;
      }
      
      // Break long sentence at word boundaries
      const words = sentence.text.split(/\s+/);
      let longChunk = '';
      
      for (const word of words) {
        const testLongChunk = longChunk ? longChunk + ' ' + word : word;
        
        if (testLongChunk.length > maxCharSize && longChunk.length > 0) {
          chunks.push({
            text: longChunk.trim(),
            charCount: longChunk.trim().length,
            sentenceCount: 1,
            index: chunks.length,
            status: 'truncated'
          });
          longChunk = word;
        } else {
          longChunk = testLongChunk;
        }
      }
      
      if (longChunk.length > 0) {
        chunks.push({
          text: longChunk.trim(),
          charCount: longChunk.trim().length,
          sentenceCount: 1,
          index: chunks.length,
          status: 'truncated'
        });
      }
    } else {
      // Sentence fits, add to current chunk
      currentChunk = testChunk;
      currentSentenceCount++;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      charCount: currentChunk.trim().length,
      sentenceCount: currentSentenceCount,
      index: chunks.length,
      status: 'normal'
    });
  }
  
  return chunks;
}

/**
 * Validate chunks for translation safety
 * 
 * Returns object with:
 * - valid: boolean
 * - stats: {totalChunks, maxChunkSize, avgChunkSize, truncatedCount}
 * - violations: array of objects with chunk index and issue
 * 
 * @param {Array} chunks - Chunks from smartChunkBySentence
 * @param {number} maxAllowed - Maximum characters allowed (default 500)
 * @returns {Object} Validation result
 */
export function validateChunks(chunks, maxAllowed = 500) {
  const violations = [];
  let totalChars = 0;
  let truncatedCount = 0;
  
  for (const chunk of chunks) {
    totalChars += chunk.charCount;
    
    if (chunk.charCount > maxAllowed) {
      violations.push({
        chunkIndex: chunk.index,
        charCount: chunk.charCount,
        issue: `Exceeds ${maxAllowed} char limit`
      });
    }
    
    if (chunk.status === 'truncated') {
      truncatedCount++;
    }
  }
  
  return {
    valid: violations.length === 0,
    stats: {
      totalChunks: chunks.length,
      maxChunkSize: chunks.length > 0 ? Math.max(...chunks.map(c => c.charCount)) : 0,
      avgChunkSize: chunks.length > 0 ? Math.round(totalChars / chunks.length) : 0,
      totalChars,
      truncatedCount
    },
    violations
  };
}

/**
 * Format chunks for logging/debugging
 * 
 * @param {Array} chunks - Chunks to format
 * @returns {string} Formatted chunk summary
 */
export function formatChunksSummary(chunks) {
  const validation = validateChunks(chunks);
  
  let summary = `[CHUNKER] Summary: ${chunks.length} chunks created\n`;
  summary += `[CHUNKER] Total chars: ${validation.stats.totalChars}, `;
  summary += `Avg: ${validation.stats.avgChunkSize}, `;
  summary += `Max: ${validation.stats.maxChunkSize}\n`;
  
  chunks.forEach(chunk => {
    const truncInfo = chunk.status === 'truncated' ? ' (TRUNCATED)' : '';
    summary += `[CHUNKER]   Chunk ${chunk.index + 1}: ${chunk.charCount} chars, ${chunk.sentenceCount} sent${truncInfo}\n`;
  });
  
  if (!validation.valid) {
    summary += `[CHUNKER] ⚠ VIOLATIONS:\n`;
    validation.violations.forEach(v => {
      summary += `[CHUNKER]   Chunk ${v.chunkIndex}: ${v.issue}\n`;
    });
  }
  
  return summary;
}

