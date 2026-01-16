# Batch WORKER_2: Files 19-36 of 36
$Files = @(
    "worker/modules/handlers/lunar-nodes-handler.js",
    "worker/modules/handlers/moon-phase-handler.js",
    "worker/modules/handlers/void-of-course-handler.js",
    "worker/modules/messages.js",
    "worker/modules/translator.js",
    "worker/modules/utils/accountStatusCheck.js",
    "worker/modules/utils/astrologySetup.js",
    "worker/modules/utils/specialRequestDetector.js",
    "worker/modules/utils/timezoneHelper.js",
    "worker/modules/utils/timezoneUtils.js",
    "worker/modules/utils/violationHandler.js",
    "worker/modules/violation/violationEnforcementCore.js",
    "worker/modules/violation/violationRedemption.js",
    "worker/modules/violation/violationStatus.js",
    "worker/processor.js",
    "worker/shared/firebase-admin.js"
)

& .\BULK_CONSOLE_FIX_V10_CORRECTED.ps1 -Files $Files -BatchName "WORKER_BATCH_2"
