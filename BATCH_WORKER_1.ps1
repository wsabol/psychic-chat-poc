# Batch WORKER_1: Files 1-18 of 36
$Files = @(
    "worker/fix-astrology-data.js",
    "worker/modules/astrology.js",
    "worker/modules/astrology-shell.js",
    "worker/modules/handlers/astrology-handler.js",
    "worker/modules/handlers/chat-handler.js",
    "worker/modules/handlers/cosmic-weather-handler.js",
    "worker/modules/handlers/horoscope-handler.async.js",
    "worker/modules/handlers/horoscope-handler.js",
    "worker/modules/handlers/horoscope-handler_v2.js"
)

& .\BULK_CONSOLE_FIX_V10_CORRECTED.ps1 -Files $Files -BatchName "WORKER_BATCH_1"
