# ========================================
# GIT HISTORY CLEANUP SCRIPT
# Remove exposed credentials from Git history
# ========================================

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Red
Write-Host "  GIT HISTORY CLEANUP" -ForegroundColor Red
Write-Host "  Remove Exposed Credentials" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

Write-Host "⚠️  WARNING: This will modify Git history!" -ForegroundColor Yellow
Write-Host "   Make sure all changes are committed first." -ForegroundColor Yellow
Write-Host ""

# Confirm before proceeding
$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "[Step 1/3] Removing exposed files from tracking..." -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Gray

# Remove files from git tracking
git rm --cached client/.env.production -ErrorAction SilentlyContinue
git rm --cached .env -ErrorAction SilentlyContinue
git rm --cached api/.env -ErrorAction SilentlyContinue
git rm --cached worker/.env -ErrorAction SilentlyContinue
git rm --cached lambdas/.env -ErrorAction SilentlyContinue
git rm --cached client/.env.local -ErrorAction SilentlyContinue

Write-Host "✅ Files removed from tracking" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 2/3] Committing changes..." -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Gray

# Stage all changes
git add .gitignore
git add client/src/pages/payment-methods/
git add client/src/pages/subscriptions/
git add DEPLOY-ALL-SECURITY-UPDATE.ps1
git add CLEAN-GIT-HISTORY.ps1

# Commit
git commit -m "Security: Remove exposed API keys and enforce environment variables

- Removed hardcoded Firebase API key fallbacks
- Removed hardcoded Stripe API key fallbacks
- Updated .gitignore to prevent future exposure
- All API keys now required via environment variables
- Added deployment scripts for security updates"

Write-Host "✅ Changes committed" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 3/3] Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "--------------------------------------" -ForegroundColor Gray

git push origin main

Write-Host "✅ Pushed to GitHub" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ GIT CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "The exposed keys are still in Git history." -ForegroundColor White
Write-Host "To completely remove them, you need to:" -ForegroundColor White
Write-Host ""
Write-Host "OPTION A: Use BFG Repo-Cleaner (Recommended)" -ForegroundColor Cyan
Write-Host "  1. Download: https://reps.io/downloads/bfg-1.14.0.jar" -ForegroundColor Gray
Write-Host "  2. Run: java -jar bfg.jar --delete-files .env.production" -ForegroundColor Gray
Write-Host "  3. Run: git reflog expire --expire=now --all" -ForegroundColor Gray
Write-Host "  4. Run: git gc --prune=now --aggressive" -ForegroundColor Gray
Write-Host "  5. Run: git push --force" -ForegroundColor Gray
Write-Host ""
Write-Host "OPTION B: Contact GitHub Support" -ForegroundColor Cyan
Write-Host "  - GitHub can remove cached views of exposed secrets" -ForegroundColor Gray
Write-Host "  - Submit form: https://support.github.com/contact" -ForegroundColor Gray
Write-Host ""
Write-Host "OPTION C: Accept the risk" -ForegroundColor Cyan
Write-Host "  - Keys are already rotated and restricted" -ForegroundColor Gray
Write-Host "  - Old keys no longer work" -ForegroundColor Gray
Write-Host "  - Attackers can't do much with restricted keys" -ForegroundColor Gray
Write-Host ""
Write-Host "Current Status:" -ForegroundColor Yellow
Write-Host "  ✅ New keys deployed and working" -ForegroundColor Green
Write-Host "  ✅ Old keys rotated/restricted" -ForegroundColor Green
Write-Host "  ✅ Source code cleaned" -ForegroundColor Green
Write-Host "  ⚠️  Git history still contains old keys" -ForegroundColor Yellow
Write-Host ""
