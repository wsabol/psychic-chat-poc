#!/usr/bin/env node

/**
 * Security Auto-Fix Script - ALL BATCHES
 * Standardizes JSON responses to use proper utility functions
 * Reads batch configuration from BATCH_FIX_CONFIG.json
 * 
 * Usage: node SECURITY_AUTO_FIX.js --batch <number> [--dry-run]
 * Example: node SECURITY_AUTO_FIX.js --batch 3
 * Example: node SECURITY_AUTO_FIX.js --batch 3 --dry-run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchIndex = args.indexOf('--batch');
const batchNumber = batchIndex !== -1 ? parseInt(args[batchIndex + 1]) : null;

if (!batchNumber) {
  console.error('❌ Error: Batch number required!');
  console.error('Usage: node SECURITY_AUTO_FIX.js --batch <number> [--dry-run]');
  console.error('Example: node SECURITY_AUTO_FIX.js --batch 3');
  process.exit(1);
}

// Load batch configuration
let batchConfig;
try {
  const configPath = path.join(__dirname, 'BATCH_FIX_CONFIG.json');
  batchConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`❌ Error loading BATCH_FIX_CONFIG.json: ${error.message}`);
  process.exit(1);
}

// Find the requested batch
const batch = batchConfig.batches.find(b => b.batch === batchNumber);
if (!batch) {
  console.error(`❌ Error: Batch ${batchNumber} not found in configuration!`);
  console.error(`Available batches: ${batchConfig.batches.map(b => b.batch).join(', ')}`);
  process.exit(1);
}

// Statistics
const stats = {
  filesProcessed: 0,
  filesChanged: 0,
  totalChanges: 0,
  syntaxErrors: [],
  changes: []
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`\n${colors.magenta}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.magenta}║          SECURITY AUTO-FIX SCRIPT                            ║${colors.reset}`);
console.log(`${colors.magenta}║          JSON Response Standardization                        ║${colors.reset}`);
console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

console.log(`${colors.cyan}Batch ${batch.batch}: ${batch.name}${colors.reset}`);
console.log(`${colors.cyan}Files to process: ${batch.filesCount}${colors.reset}\n`);

if (isDryRun) {
  console.log(`${colors.yellow}🔍 DRY RUN MODE - No files will be modified${colors.reset}\n`);
}

/**
 * Get appropriate import path based on file location
 */
function getImportPath(filePath) {
  if (filePath.startsWith('routes/billing/') || 
      filePath.startsWith('routes/admin/') || 
      filePath.startsWith('routes/auth-endpoints/') ||
      filePath.startsWith('routes/user-data/')) {
    return "'../../utils/responses.js'";
  } else if (filePath.startsWith('middleware/')) {
    return "'../utils/responses.js'";
  } else if (filePath.startsWith('routes/')) {
    return "'../utils/responses.js'";
  } else if (filePath === 'index.js') {
    return "'./utils/responses.js'";
  }
  return "'../utils/responses.js'"; // default
}

/**
 * Read file content
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  } catch (error) {
    console.error(`${colors.red}✗ Error reading ${filePath}: ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * Write file content
 */
function writeFile(filePath, content) {
  if (isDryRun) {
    return true;
  }
  try {
    fs.writeFileSync(path.join(__dirname, filePath), content, 'utf8');
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error writing ${filePath}: ${error.message}${colors.reset}`);
    return false;
  }
}

/**
 * Check if import exists in file
 */
function hasImport(content, importName) {
  const importRegex = new RegExp(`import\\s+{[^}]*\\b${importName}\\b[^}]*}\\s+from\\s+['"].*responses\\.js['"]`, 'g');
  return importRegex.test(content);
}

/**
 * Add successResponse to existing import or create new import
 */
function addSuccessResponseImport(content, importPath) {
  // Check if successResponse is already imported
  if (hasImport(content, 'successResponse')) {
    return content;
  }

  // Check if there's an existing import from responses.js
  const existingImportRegex = new RegExp(`import\\s+{([^}]*)}\\s+from\\s+${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
  const match = existingImportRegex.exec(content);
  
  if (match) {
    // Add successResponse to existing import
    const existingImports = match[1].trim();
    const newImports = existingImports + ', successResponse';
    const newImportStatement = `import { ${newImports} } from ${importPath}`;
    content = content.replace(match[0], newImportStatement);
    return content;
  }

  // No existing import, add new one
  const importStatement = `import { successResponse } from ${importPath};`;
  
  // Find the last import statement
  const importRegex = /^import .+ from .+;$/gm;
  const imports = content.match(importRegex);
  
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    const lastImportIndex = content.indexOf(lastImport);
    const insertPosition = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
  }
  
  return content;
}

/**
 * Apply response standardization fixes
 */
function applyResponseFixes(content) {
  let changeCount = 0;
  
  // Pattern 1: return res.json({ => return successResponse(res, {
  const returnPattern = /return\s+res\.json\s*\(\s*\{/g;
  const returnMatches = (content.match(returnPattern) || []).length;
  if (returnMatches > 0) {
    content = content.replace(returnPattern, 'return successResponse(res, {');
    changeCount += returnMatches;
  }
  
  // Pattern 2: res.json({ => successResponse(res, { (but not return statements)
  // Use negative lookbehind to avoid matching return statements
  const plainPattern = /(?<!return\s)(?<!return\s\s)(?<!return\s\s\s)(?<!return\s\s\s\s)res\.json\s*\(\s*\{/g;
  const plainMatches = (content.match(plainPattern) || []).length;
  if (plainMatches > 0) {
    content = content.replace(plainPattern, 'successResponse(res, {');
    changeCount += plainMatches;
  }
  
  return { content, changeCount };
}

/**
 * Basic syntax check
 */
function checkSyntax(filePath, content) {
  const errors = [];
  
  // Check for balanced braces
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  // Check for balanced parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }
  
  // Check for balanced brackets
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push(`Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`);
  }
  
  return errors;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}📄 Processing: ${filePath}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  stats.filesProcessed++;
  
  let content = readFile(filePath);
  if (!content) {
    return;
  }
  
  let modified = false;
  let fileChanges = 0;
  
  // Check if file needs import
  const importPath = getImportPath(filePath);
  const originalContent = content;
  content = addSuccessResponseImport(content, importPath);
  
  if (content !== originalContent) {
    console.log(`${colors.green}  ✓ Added/updated successResponse import${colors.reset}`);
    modified = true;
    fileChanges++;
  }
  
  // Apply response standardization fixes
  const { content: fixedContent, changeCount } = applyResponseFixes(content);
  
  if (changeCount > 0) {
    content = fixedContent;
    console.log(`${colors.green}  ✓ Converted ${changeCount} response call${changeCount > 1 ? 's' : ''} to successResponse()${colors.reset}`);
    modified = true;
    fileChanges += changeCount;
    
    stats.changes.push({
      file: filePath,
      description: 'Response standardization',
      count: changeCount
    });
  } else {
    console.log(`${colors.yellow}  ⊙ No res.json() calls found to convert${colors.reset}`);
  }
  
  if (modified) {
    // Check syntax before writing
    const syntaxErrors = checkSyntax(filePath, content);
    if (syntaxErrors.length > 0) {
      console.log(`${colors.red}  ✗ Syntax errors detected:${colors.reset}`);
      syntaxErrors.forEach(err => {
        console.log(`${colors.red}    - ${err}${colors.reset}`);
        stats.syntaxErrors.push({ file: filePath, error: err });
      });
      return;
    }
    
    // Write file
    if (writeFile(filePath, content)) {
      stats.filesChanged++;
      stats.totalChanges += fileChanges;
      console.log(`${colors.green}  ✓ File updated successfully (${fileChanges} change${fileChanges > 1 ? 's' : ''})${colors.reset}`);
    } else {
      console.log(`${colors.red}  ✗ Failed to write file${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}  ⊙ No changes needed${colors.reset}`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`${colors.cyan}Processing Batch ${batch.batch} files...${colors.reset}\n`);
  
  // Process each file in the batch
  for (const filePath of batch.files) {
    processFile(filePath);
  }
  
  // Print summary
  console.log(`\n${colors.magenta}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║            BATCH ${batch.batch} SUMMARY REPORT                            ║${colors.reset}`);
  console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  console.log(`${colors.blue}Batch Name:${colors.reset}      ${batch.name}`);
  console.log(`${colors.blue}Files Processed:${colors.reset} ${stats.filesProcessed}`);
  console.log(`${colors.green}Files Changed:${colors.reset}   ${stats.filesChanged}`);
  console.log(`${colors.green}Total Changes:${colors.reset}   ${stats.totalChanges}`);
  console.log(`${colors.red}Syntax Errors:${colors.reset}   ${stats.syntaxErrors.length}\n`);
  
  if (stats.changes.length > 0) {
    console.log(`${colors.cyan}Detailed Changes:${colors.reset}`);
    stats.changes.forEach(change => {
      console.log(`  ${colors.green}✓${colors.reset} ${change.file}`);
      console.log(`    ${change.description} (${change.count}x)`);
    });
    console.log('');
  }
  
  if (stats.syntaxErrors.length > 0) {
    console.log(`${colors.red}Syntax Errors Found:${colors.reset}`);
    stats.syntaxErrors.forEach(error => {
      console.log(`  ${colors.red}✗${colors.reset} ${error.file}: ${error.error}`);
    });
    console.log('');
  }
  
  if (isDryRun) {
    console.log(`${colors.yellow}⚠ DRY RUN - No files were actually modified${colors.reset}`);
    console.log(`${colors.yellow}  Run without --dry-run to apply changes${colors.reset}\n`);
  } else if (stats.filesChanged > 0 && stats.syntaxErrors.length === 0) {
    console.log(`${colors.green}✓ Batch ${batch.batch} complete!${colors.reset}`);
    
    const totalBatches = batchConfig.batches.length;
    const completedBatches = batchConfig.batches.filter(b => b.status === 'COMPLETED').length + 1;
    
    console.log(`${colors.cyan}  Progress: Batch ${batch.batch} of ${totalBatches} complete${colors.reset}`);
    
    if (batch.batch < totalBatches) {
      console.log(`${colors.cyan}  Next: Run syntax check, test app, then process Batch ${batch.batch + 1}${colors.reset}\n`);
    } else {
      console.log(`${colors.green}  🎉 All batches complete!${colors.reset}\n`);
    }
  }
}

// Run the script
main();
