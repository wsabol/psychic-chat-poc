/**
 * Production Readiness Audit Script
 * 
 * Scans route files for non-production-ready response patterns:
 * - Manual res.json() instead of response utilities
 * - Missing errorCode fields in error responses
 * - Exposed database internals (rowCount, rows_deleted)
 * - Missing audit logging for sensitive operations
 * - Manual res.status().json() for common status codes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Issues found will be categorized
const issues = {
  missingImports: [],
  manualResponses: [],
  missingErrorCodes: [],
  exposedDbInternals: [],
  missingSensitiveLogging: [],
  inconsistentPatterns: []
};

// Response utility patterns that should be used
const RESPONSE_UTILITIES = [
  'successResponse',
  'createdResponse',
  'authError',
  'forbiddenError',
  'validationError',
  'serverError',
  'notFoundError',
  'conflictError',
  'unprocessableError'
];

/**
 * Check if file imports response utilities
 */
function checkImports(content, filePath) {
  const hasResponseImport = content.includes("from '../utils/responses.js'") || 
                           content.includes("from '../../utils/responses.js'");
  
  if (!hasResponseImport && content.includes('res.json(') && content.includes('res.status(')) {
    issues.missingImports.push({
      file: filePath,
      message: 'Missing response utility imports'
    });
  }
  
  return hasResponseImport;
}

/**
 * Find manual response patterns that should use utilities
 */
function findManualResponses(content, filePath) {
  const lines = content.split('\n');
  const patterns = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for manual error responses (401, 403, 400, 404, 500, etc.)
    const statusMatch = line.match(/res\.status\((40[0134]|500|503|429|413|451)\)\.json\(/);
    if (statusMatch) {
      // Check if errorCode is present in nearby lines (acceptable if it has errorCode)
      const contextLines = lines.slice(index, Math.min(index + 8, lines.length)).join(' ');
      const hasErrorCode = contextLines.includes('errorCode');
      
      // Only flag if missing errorCode (if errorCode present, manual pattern is acceptable)
      if (!hasErrorCode) {
        patterns.push({
          file: filePath,
          line: lineNum,
          code: line.trim(),
          status: statusMatch[1],
          suggestion: getUtilitySuggestion(statusMatch[1])
        });
      }
    }
    
    // Check for res.json({ success: true }) without explicit status
    if (line.includes('res.json({') && line.includes('success: true') && !line.includes('.status(')) {
      patterns.push({
        file: filePath,
        line: lineNum,
        code: line.trim(),
        status: 'implicit-200',
        suggestion: 'Use successResponse() or createdResponse() for explicit status'
      });
    }
  });
  
  if (patterns.length > 0) {
    issues.manualResponses.push(...patterns);
  }
}

/**
 * Suggest appropriate utility function based on status code
 */
function getUtilitySuggestion(statusCode) {
  const suggestions = {
    '400': 'validationError()',
    '401': 'authError()',
    '403': 'forbiddenError()',
    '404': 'notFoundError()',
    '500': 'serverError()',
    '503': 'serverError() with custom message',
    '429': 'rateLimitError()',
    '413': 'payloadTooLargeError()',
    '451': 'complianceError()'
  };
  return suggestions[statusCode] || 'Use appropriate response utility';
}

/**
 * Check for missing errorCode fields in error responses
 */
function checkErrorCodes(content, filePath) {
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // Look for error responses without errorCode
    if ((line.includes('res.status(4') || line.includes('res.status(5')) && 
        line.includes('.json(')) {
      
      // Check if errorCode is present in the same or next few lines
      const contextLines = lines.slice(index, Math.min(index + 5, lines.length)).join(' ');
      if (!contextLines.includes('errorCode')) {
        issues.missingErrorCodes.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          message: 'Error response missing errorCode field'
        });
      }
    }
  });
}

/**
 * Check for exposed database internals
 */
function checkDatabaseExposure(content, filePath) {
  const exposurePatterns = ['rowCount', 'rows_deleted', 'result.rows.length'];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    exposurePatterns.forEach(pattern => {
      if (line.includes(pattern) && line.includes('res.json(')) {
        issues.exposedDbInternals.push({
          file: filePath,
          line: index + 1,
          code: line.trim(),
          pattern: pattern,
          message: `Exposes database internal: ${pattern}`
        });
      }
    });
  });
}

/**
 * Check for missing audit logging on sensitive operations
 */
function checkAuditLogging(content, filePath) {
  const sensitiveOps = [
    { pattern: 'DELETE FROM', operation: 'DELETE' },
    { pattern: '.delete(', operation: 'DELETE endpoint' },
    { pattern: 'DROP TABLE', operation: 'DROP TABLE' },
    { pattern: 'TRUNCATE', operation: 'TRUNCATE' }
  ];
  
  const lines = content.split('\n');
  const hasAuditImport = content.includes('logAuditEvent') || content.includes('auditLog');
  
  sensitiveOps.forEach(({ pattern, operation }) => {
    lines.forEach((line, index) => {
      if (line.includes(pattern)) {
        // Check if audit logging is present nearby
        const contextLines = lines.slice(Math.max(0, index - 5), Math.min(index + 10, lines.length)).join('\n');
        if (!contextLines.includes('logAuditEvent') && !contextLines.includes('auditLog')) {
          issues.missingSensitiveLogging.push({
            file: filePath,
            line: index + 1,
            code: line.trim(),
            operation: operation,
            message: `${operation} operation without audit logging`
          });
        }
      }
    });
  });
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    checkImports(content, filePath);
    findManualResponses(content, filePath);
    checkErrorCodes(content, filePath);
    checkDatabaseExposure(content, filePath);
    checkAuditLogging(content, filePath);
    
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
  }
}

/**
 * Scan all files in a directory
 */
function scanDirectory(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (file.endsWith('.js') && !file.includes('.orig')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n========================================');
  console.log('📋 PRODUCTION READINESS AUDIT REPORT');
  console.log('========================================\n');
  
  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  
  console.log(`Total Issues Found: ${totalIssues}\n`);
  
  // Missing Imports
  if (issues.missingImports.length > 0) {
    console.log(`\n🔴 Missing Response Utility Imports (${issues.missingImports.length}):`);
    issues.missingImports.forEach(issue => {
      console.log(`  - ${issue.file}`);
      console.log(`    ${issue.message}\n`);
    });
  }
  
  // Manual Responses
  if (issues.manualResponses.length > 0) {
    console.log(`\n🟠 Manual Response Patterns (${issues.manualResponses.length}):`);
    issues.manualResponses.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line}`);
      console.log(`    Code: ${issue.code}`);
      console.log(`    Suggestion: ${issue.suggestion}\n`);
    });
  }
  
  // Missing Error Codes
  if (issues.missingErrorCodes.length > 0) {
    console.log(`\n🟡 Missing ErrorCode Fields (${issues.missingErrorCodes.length}):`);
    issues.missingErrorCodes.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line}`);
      console.log(`    ${issue.message}\n`);
    });
  }
  
  // Exposed DB Internals
  if (issues.exposedDbInternals.length > 0) {
    console.log(`\n🟣 Exposed Database Internals (${issues.exposedDbInternals.length}):`);
    issues.exposedDbInternals.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line}`);
      console.log(`    ${issue.message}`);
      console.log(`    Code: ${issue.code}\n`);
    });
  }
  
  // Missing Audit Logging
  if (issues.missingSensitiveLogging.length > 0) {
    console.log(`\n🔵 Missing Audit Logging (${issues.missingSensitiveLogging.length}):`);
    issues.missingSensitiveLogging.forEach(issue => {
      console.log(`  - ${issue.file}:${issue.line}`);
      console.log(`    ${issue.message}`);
      console.log(`    Code: ${issue.code}\n`);
    });
  }
  
  console.log('\n========================================');
  console.log('✅ Audit Complete');
  console.log('========================================\n');
  
  return issues;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node PRODUCTION_AUDIT_SCRIPT.js <file-or-directory>');
    console.log('Example: node PRODUCTION_AUDIT_SCRIPT.js routes/auth-endpoints/login.js');
    process.exit(1);
  }
  
  const targetPath = path.resolve(__dirname, args[0]);
  
  if (!fs.existsSync(targetPath)) {
    console.error(`Error: Path not found: ${targetPath}`);
    process.exit(1);
  }
  
  const stat = fs.statSync(targetPath);
  
  if (stat.isDirectory()) {
    console.log(`Scanning directory: ${targetPath}\n`);
    const files = scanDirectory(targetPath);
    console.log(`Found ${files.length} JavaScript files\n`);
    files.forEach(file => scanFile(file));
  } else {
    console.log(`Scanning file: ${targetPath}\n`);
    scanFile(targetPath);
  }
  
  generateReport();
  
  // Exit with error code if issues found
  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  process.exit(totalIssues > 0 ? 1 : 0);
}

main();
