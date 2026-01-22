#!/usr/bin/env node

/**
 * Security Auto-Fix Script - BATCH 2
 * Standardizes JSON responses to use proper utility functions
 * 
 * Usage: node SECURITY_AUTO_FIX.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDryRun = process.argv.includes('--dry-run');

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
console.log(`${colors.magenta}║          SECURITY AUTO-FIX SCRIPT - BATCH 2                  ║${colors.reset}`);
console.log(`${colors.magenta}║          Core Routes Response Standardization                ║${colors.reset}`);
console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

if (isDryRun) {
  console.log(`${colors.yellow}🔍 DRY RUN MODE - No files will be modified${colors.reset}\n`);
}

/**
 * BATCH 2 FIX DEFINITIONS
 * Focus: Standardize manual res.json({ to successResponse()
 */
const fixes = [
  {
    file: 'routes/help.js',
    description: 'Standardize help route responses',
    fixes: [
      {
        search: /return res\.json\(\{/g,
        replace: () => `return successResponse(res, {`,
        description: 'Convert to successResponse()'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  },
  {
    file: 'routes/moon-phase.js',
    description: 'Standardize moon phase responses',
    fixes: [
      {
        search: /res\.json\(\{/g,
        replace: () => `successResponse(res, {`,
        description: 'Convert to successResponse()'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  },
  {
    file: 'routes/response-status.js',
    description: 'Standardize response status checks',
    fixes: [
      {
        search: /return res\.json\(\{/g,
        replace: () => `return successResponse(res, {`,
        description: 'Convert to successResponse()'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  },
  {
    file: 'routes/violationReports.js',
    description: 'Standardize violation report responses',
    fixes: [
      {
        search: /res\.json\(\{/g,
        replace: () => `successResponse(res, {`,
        description: 'Convert to successResponse()'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  },
  {
    file: 'routes/security.js',
    description: 'Standardize security route responses',
    fixes: [
      {
        search: /res\.json\(\{/g,
        replace: () => `successResponse(res, {`,
        description: 'Convert to successResponse()'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  },
  {
    file: 'routes/migration.js',
    description: 'Standardize migration responses',
    fixes: [
      {
        search: /res\.json\(\{/g,
        replace: () => `successResponse(res, {`,
        description: 'Convert to successResponse()'
      },
      {
        search: /return res\.json\(\{/g,
        replace: () => `return successResponse(res, {`,
        description: 'Convert return statements'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  },
  {
    file: 'routes/horoscope.js',
    description: 'Standardize horoscope responses',
    fixes: [
      {
        search: /res\.json\(\{/g,
        replace: () => `successResponse(res, {`,
        description: 'Convert to successResponse()'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  },
  {
    file: 'routes/cleanup.js',
    description: 'Standardize cleanup responses',
    fixes: [
      {
        search: /res\.json\(\{/g,
        replace: () => `successResponse(res, {`,
        description: 'Convert to successResponse()'
      }
    ],
    requiredImport: "import { successResponse } from '../utils/responses.js';",
    checkImport: /successResponse/
  }
];

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
function hasImport(content, importCheck) {
  return importCheck.test(content);
}

/**
 * Add import to file if missing
 */
function addImport(content, importStatement, importCheck) {
  if (hasImport(content, importCheck)) {
    return content;
  }

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
 * Apply fixes to a file
 */
function processFile(fixDef) {
  const { file, description, fixes: fileFixes, requiredImport, checkImport } = fixDef;
  
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.cyan}📄 Processing: ${file}${colors.reset}`);
  console.log(`${colors.cyan}   ${description}${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  stats.filesProcessed++;
  
  let content = readFile(file);
  if (!content) {
    return;
  }
  
  let modified = false;
  let fileChanges = 0;
  
  // Add required import if needed
  if (requiredImport && checkImport) {
    const originalContent = content;
    content = addImport(content, requiredImport, checkImport);
    if (content !== originalContent) {
      console.log(`${colors.green}  ✓ Added import: ${requiredImport}${colors.reset}`);
      modified = true;
      fileChanges++;
    }
  }
  
  // Apply each fix
  for (const fix of fileFixes) {
    const matches = content.match(fix.search);
    if (matches) {
      const count = matches.length;
      content = content.replace(fix.search, fix.replace);
      console.log(`${colors.green}  ✓ ${fix.description} (${count} occurrence${count > 1 ? 's' : ''})${colors.reset}`);
      modified = true;
      fileChanges += count;
      
      stats.changes.push({
        file,
        description: fix.description,
        count
      });
    } else {
      console.log(`${colors.yellow}  ⊙ ${fix.description} - no matches found${colors.reset}`);
    }
  }
  
  if (modified) {
    // Check syntax before writing
    const syntaxErrors = checkSyntax(file, content);
    if (syntaxErrors.length > 0) {
      console.log(`${colors.red}  ✗ Syntax errors detected:${colors.reset}`);
      syntaxErrors.forEach(err => {
        console.log(`${colors.red}    - ${err}${colors.reset}`);
        stats.syntaxErrors.push({ file, error: err });
      });
      return;
    }
    
    // Write file
    if (writeFile(file, content)) {
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
  console.log(`${colors.cyan}Processing Batch 2 files...${colors.reset}\n`);
  
  // Process each file
  for (const fixDef of fixes) {
    processFile(fixDef);
  }
  
  // Print summary
  console.log(`\n${colors.magenta}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║                  BATCH 2 SUMMARY REPORT                      ║${colors.reset}`);
  console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
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
    console.log(`${colors.green}✓ Batch 2 complete!${colors.reset}`);
    console.log(`${colors.cyan}  Progress: Batch 2 of 6 complete${colors.reset}`);
    console.log(`${colors.cyan}  Next: Update script for Batch 3${colors.reset}\n`);
  }
}

// Run the script
main();
