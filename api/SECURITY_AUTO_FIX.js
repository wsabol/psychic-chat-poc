#!/usr/bin/env node

/**
 * Security Auto-Fix Script
 * Automatically fixes critical security issues found in JSON response audit
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
  cyan: '\x1b[36m'
};

console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║          SECURITY AUTO-FIX SCRIPT                            ║${colors.reset}`);
console.log(`${colors.cyan}║          Fixing Critical JSON Response Issues                ║${colors.reset}`);
console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);

if (isDryRun) {
  console.log(`${colors.yellow}🔍 DRY RUN MODE - No files will be modified${colors.reset}\n`);
}

/**
 * Fix definitions - each fix has a pattern to find and replacement logic
 */
const fixes = [
  {
    file: 'routes/admin/error-logs.js',
    description: 'Remove error.message exposure from admin error responses',
    fixes: [
      {
        search: /res\.status\(500\)\.json\(\{\s*success:\s*false,\s*error:\s*'([^']+)',\s*details:\s*error\.message\s*\}\)/g,
        replace: (match, errorMsg) => `serverError(res, '${errorMsg}')`,
        description: 'Replace 500 error with serverError() utility'
      }
    ],
    requiredImport: "import { serverError } from '../../utils/responses.js';",
    checkImport: /serverError/
  },
  {
    file: 'routes/auth-endpoints/account.js',
    description: 'Remove Firebase UID exposure from registration responses',
    fixes: [
      {
        search: /return createdResponse\(res,\s*\{\s*success:\s*true,\s*uid:\s*userRecord\.uid,\s*email:\s*userRecord\.email,\s*message:\s*'User registered successfully\. Please sign in\.'\s*\}\)/g,
        replace: () => `return createdResponse(res, {\n      success: true,\n      message: 'User registered successfully. Please sign in.'\n    })`,
        description: 'Remove uid and email from registration response'
      },
      {
        search: /return successResponse\(res,\s*\{\s*success:\s*true,\s*userId\s*\}\)/g,
        replace: () => `return successResponse(res, { success: true })`,
        description: 'Remove userId from response'
      },
      {
        search: /return createdResponse\(res,\s*\{\s*success:\s*true,\s*uid:\s*newUserId,\s*email:\s*userRecord\.email,\s*message:\s*'Account created and onboarding data migrated successfully',\s*migration:\s*migrationResult\s*\}\)/g,
        replace: () => `return createdResponse(res, {\n        success: true,\n        message: 'Account created and onboarding data migrated successfully'\n      })`,
        description: 'Remove uid, email, and migration details from response'
      },
      {
        search: /return createdResponse\(res,\s*\{\s*success:\s*true,\s*uid:\s*newUserId,\s*email:\s*userRecord\.email,\s*message:\s*'Account created but data migration encountered issues',\s*warning:\s*migrationErr\.message\s*\}\)/g,
        replace: () => `return createdResponse(res, {\n        success: true,\n        message: 'Account created successfully'\n      })`,
        description: 'Remove uid, email, and error details from response'
      }
    ]
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
  console.log(`${colors.cyan}Starting security fixes...${colors.reset}\n`);
  
  // Process each file
  for (const fixDef of fixes) {
    processFile(fixDef);
  }
  
  // Print summary
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                      SUMMARY REPORT                          ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
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
    console.log(`${colors.green}✓ All fixes applied successfully!${colors.reset}`);
    console.log(`${colors.cyan}  Next steps:${colors.reset}`);
    console.log(`  1. Test the API server: ${colors.yellow}npm start${colors.reset}`);
    console.log(`  2. Run audit script: ${colors.yellow}node PRODUCTION_AUDIT_SCRIPT.js${colors.reset}`);
    console.log(`  3. Commit changes: ${colors.yellow}git add . && git commit -m "Security fixes"${colors.reset}\n`);
  }
}

// Run the script
main();
