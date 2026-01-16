# Console.error/warn Replacement Strategy

## Summary

**154 files total need conversion** from `console.error`/`console.warn` to proper error logging:
- **API**: 28 files → 1 batch
- **Client**: 90 files → 3 batches (30 each)
- **Worker**: 36 files → 2 batches (18 each)

## Universal errorLogger Architecture

**Location**: `/shared/errorLogger.js`

### How it works:
- **api/**: Logs to encrypted database via `logErrorToDB()`
- **client/**: Sends to server via `navigator.sendBeacon()` (production) or console (dev)
- **worker/**: Logs to stdout as structured JSON (Docker captures for aggregation)

### Single signature across all environments:
```javascript
await logErrorFromCatch(error, 'service', 'context', userIdHash, ipAddress, 'severity')
```

## Path Calculation

The script `BULK_CONSOLE_FIX_V6_UNIVERSAL.ps1` automatically calculates relative paths:

| File Location | Import Path | Example |
|---------------|-------------|---------|
| `api/shared/file.js` | `../../../shared/errorLogger.js` | 3 levels up |
| `api/routes/file.js` | `../shared/errorLogger.js` | 1 level up |
| `api/routes/auth/file.js` | `../../shared/errorLogger.js` | 2 levels up |
| `client/src/file.js` | `../../shared/errorLogger.js` | 2 levels up |
| `client/src/components/file.js` | `../../../shared/errorLogger.js` | 3 levels up |
| `worker/modules/file.js` | `../../shared/errorLogger.js` | 2 levels up |

## Batch Execution Order

### Phase 1: API Files (28 files)
```powershell
.\BATCH_API_1.ps1
```
- All 28 files in single batch
- After: `git add -A && git commit -m 'Fix console.error in api/ - all 28 files'`

### Phase 2: Client Files (90 files)
```powershell
.\BATCH_CLIENT_1.ps1  # Files 1-30
.\BATCH_CLIENT_2.ps1  # Files 31-60
.\BATCH_CLIENT_3.ps1  # Files 61-90
```
- After EACH: `git add -A && git commit -m 'Fix console in client batch X'`

### Phase 3: Worker Files (36 files)
```powershell
.\BATCH_WORKER_1.ps1  # Files 1-18
.\BATCH_WORKER_2.ps1  # Files 19-36
```
- After EACH: `git add -A && git commit -m 'Fix console in worker batch X'`

## What the Script Does

For each file:
1. ✅ Detects all `console.error()` and `console.warn()` calls
2. ✅ Extracts context from error messages
3. ✅ Replaces with `logErrorFromCatch()` or `logWarning()`
4. ✅ Calculates correct relative import path
5. ✅ Adds import statement automatically
6. ✅ Validates syntax with `node -c`
7. ✅ Reports summary

## Important Notes

### For API files:
- console.error → `await logErrorFromCatch(error, 'service', 'context')`
- Works with database encryption
- Stack traces logged to `error_logs` table

### For Client files:
- console.error → `await logErrorFromCatch(error, 'service', 'context')`
- In development: logs to browser console
- In production: sends via sendBeacon (non-blocking)

### For Worker files:
- console.error → `await logErrorFromCatch(error, 'service', 'context')`
- Logs to stdout as structured JSON
- Docker captures and sends to log aggregation service

## Rollback Strategy

If issues occur in a batch:
1. `git reset --hard HEAD~1` (undo last commit)
2. Fix the specific file manually if needed
3. Re-run batch

## Questions the Script Answers

✅ **Path calculation**: Correct for all depths and locations
✅ **Import placement**: Always after last existing import
✅ **Service naming**: Extracted from directory structure
✅ **Context extraction**: From error messages when available
✅ **Syntax validation**: Checks after each batch
✅ **Backwards compatibility**: Works with existing code

## Next Steps

1. Run `.\BATCH_API_1.ps1`
2. If all syntax passes → commit
3. Run `.\BATCH_CLIENT_1.ps1` → commit
4. Continue through all batches
5. Verify with: `grep -r "console\.(error|warn)" api/ client/ worker/ | grep -v node_modules | grep -v "logErrorFromCatch"`

## Verification

After all batches are complete:
```powershell
# Should return 0 results (no unconverted console.error/warn)
Get-ChildItem -Path "api", "client", "worker" -Include "*.js", "*.jsx", "*.ts", "*.tsx" -Recurse | 
  Where-Object { $_.FullName -notmatch "node_modules" } | 
  Select-String -Pattern "console\.(error|warn)\s*\(" | 
  Where-Object { $_ -notmatch "logErrorFromCatch|logWarning" }
```
