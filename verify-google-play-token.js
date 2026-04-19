/**
 * verify-google-play-token.js
 *
 * Verifies the Google Play purchase token stored for a user against the
 * Google Play Developer API using the service account key file.
 *
 * Tries the newer purchases.subscriptionsv2 API first (Play Billing v5+),
 * then falls back to purchases.subscriptions (legacy).
 *
 * Usage:
 *   node verify-google-play-token.js <purchaseToken> [productId]
 *
 * The service account JSON is read from:
 *   C:\Users\stars\Downloads\psychic-chat-poc-f8f36e456c04.json
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SERVICE_ACCOUNT_PATH = join(homedir(), 'Downloads', 'psychic-chat-poc-f8f36e456c04.json');
const PACKAGE_NAME         = 'com.starshippsychicsmobile';

const purchaseToken = process.argv[2];
const productId     = process.argv[3] || 'starship_psychics_annual';

if (!purchaseToken) {
  console.error('');
  console.error('Usage: node verify-google-play-token.js <purchaseToken> [productId]');
  console.error('');
  console.error('productId defaults to: starship_psychics_annual');
  console.error('Other option:          starship_psychics_monthly');
  process.exit(1);
}

async function main() {
  console.log('');
  console.log('=== Google Play Purchase Token Verifier ===');
  console.log(`Package:      ${PACKAGE_NAME}`);
  console.log(`Product ID:   ${productId}`);
  console.log(`Token (first 40 chars): ${purchaseToken.slice(0, 40)}...`);
  console.log('');

  // Load service account credentials
  let credentials;
  try {
    credentials = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
    console.log(`Service account: ${credentials.client_email}`);
    console.log(`GCP project:     ${credentials.project_id}`);
  } catch (err) {
    console.error(`ERROR: Could not read service account file at:\n  ${SERVICE_ACCOUNT_PATH}`);
    console.error(err.message);
    process.exit(1);
  }

  // Authenticate with Google
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  const androidPublisher = google.androidpublisher({ version: 'v3', auth });

  // ── Try subscriptionsv2 first (Play Billing Library v5+), fall back to v1 ──
  // purchases.subscriptions.get (v1) returns 401 "insufficient permissions" for
  // subscriptions created with the newer billing library.  Try v2 first; if
  // that fails too, report the error clearly.
  let sub = null;
  let apiVersion = null;

  console.log('Trying purchases.subscriptionsv2 (newer billing)...');
  try {
    const res = await androidPublisher.purchases.subscriptionsv2.get({
      packageName: PACKAGE_NAME,
      token:       purchaseToken,
    });
    sub        = res.data;
    apiVersion = 'v2';
    console.log('[OK] purchases.subscriptionsv2 responded\n');
  } catch (v2Err) {
    const v2Status = v2Err?.response?.status ?? v2Err?.code;
    console.log(`     subscriptionsv2 failed (${v2Status}) — trying legacy purchases.subscriptions...`);

    try {
      const res = await androidPublisher.purchases.subscriptions.get({
        packageName:    PACKAGE_NAME,
        subscriptionId: productId,
        token:          purchaseToken,
      });
      sub        = res.data;
      apiVersion = 'v1';
      console.log('[OK] purchases.subscriptions responded\n');
    } catch (v1Err) {
      const v1Status = v1Err?.response?.status ?? v1Err?.code;

      console.log('');
      if (v1Status === 404 || v2Err?.response?.status === 404) {
        console.log('⛔  VERDICT: Token NOT FOUND in Google Play.');
        console.log('');
        console.log('   This purchase token does not exist in Google Play. This means:');
        console.log('   • No real Google Play purchase was ever made for this token, OR');
        console.log('   • The token was fabricated / invalid.');
        console.log('');
        console.log('   ACTION REQUIRED: Revoke this subscription in the DB.');
        console.log('   Run this SQL (replace <user_id> with the actual user_id):');
        console.log('');
        console.log("   UPDATE user_personal_info");
        console.log("   SET subscription_status        = 'inactive',");
        console.log("       billing_platform           = NULL,");
        console.log("       google_play_purchase_token = NULL,");
        console.log("       google_play_product_id     = NULL,");
        console.log("       google_play_order_id       = NULL,");
        console.log("       current_period_end         = NULL,");
        console.log("       last_status_check_at       = NOW(),");
        console.log("       updated_at                 = NOW()");
        console.log("   WHERE user_id = '<user_id>';");
      } else if (v1Status === 401 || v2Err?.response?.status === 401) {
        console.log('⚠️   Both API versions returned 401 Unauthorized.');
        console.log('');
        console.log('   The service account does not have permission to read subscriptions');
        console.log('   for this developer account. This is a Play Console authorization');
        console.log('   issue — the "API access" link between GCP project psychic-chat-poc');
        console.log('   and this developer account has not been completed.');
        console.log('');
        console.log('   Next steps:');
        console.log('   1. Sign into Play Console as starshiptechnology1@gmail.com');
        console.log('   2. Go to Order management → find the purchase manually');
        console.log('   3. OR contact Google Play developer support to enable API access:');
        console.log('      https://support.google.com/googleplay/android-developer/contact/publishing');
        console.log('');
        console.log(`   v2 error: ${v2Err.message}`);
        console.log(`   v1 error: ${v1Err.message}`);
      } else {
        console.log(`ERROR — v2 (${v2Status}): ${v2Err.message}`);
        console.log(`ERROR — v1 (${v1Status}): ${v1Err.message}`);
        if (v1Err?.response?.data) {
          console.log('v1 response:', JSON.stringify(v1Err.response.data, null, 2));
        }
      }
      console.log('');
      process.exit(1);
    }
  }

  // ── Print results ─────────────────────────────────────────────────────────

  if (apiVersion === 'v2') {
    const lineItem      = sub.lineItems?.[0];
    const expiryRfc3339 = lineItem?.expiryTime ?? sub.expiryTime;
    const expiryMs      = expiryRfc3339 ? new Date(expiryRfc3339).getTime() : null;
    const startMs       = sub.startTime ? new Date(sub.startTime).getTime() : null;
    const nowMs         = Date.now();
    const isExpired     = expiryMs ? expiryMs < nowMs : false;
    const subState      = sub.subscriptionState ?? 'UNKNOWN';
    const isActive      = subState === 'SUBSCRIPTION_STATE_ACTIVE' ||
                          subState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';

    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  GOOGLE PLAY SUBSCRIPTION DATA (subscriptionsv2 API)    │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`  Subscription state: ${subState}`);
    console.log(`  Start time:         ${startMs ? new Date(startMs).toISOString() : '(unknown)'}`);
    console.log(`  Expiry time:        ${expiryMs ? new Date(expiryMs).toISOString() : '(unknown)'}`);
    console.log(`  Now:                ${new Date(nowMs).toISOString()}`);
    console.log(`  Is expired:         ${isExpired ? '⛔  YES' : '✅  NO'}`);
    console.log(`  Is active:          ${isActive  ? '✅  YES' : '⛔  NO'}`);
    if (sub.latestOrderId) console.log(`  Latest order ID:    ${sub.latestOrderId}`);
    console.log('');

    if (isActive && !isExpired) {
      console.log('✅  VERDICT: Token is VALID — subscription is active in Google Play.');
      console.log('');
      console.log('   Run this SQL to fix the missing current_period_end (replace <user_id>):');
      console.log('');
      if (expiryMs && startMs) {
        console.log(`   UPDATE user_personal_info`);
        console.log(`   SET current_period_end   = ${Math.floor(expiryMs / 1000)},`);
        console.log(`       current_period_start = ${Math.floor(startMs  / 1000)},`);
        console.log(`       subscription_status  = 'active',`);
        console.log(`       last_status_check_at = NOW(),`);
        console.log(`       updated_at           = NOW()`);
        console.log(`   WHERE user_id = '<user_id>';`);
        console.log('');
        console.log(`   (expires: ${new Date(expiryMs).toISOString()})`);
      } else {
        console.log(`   UPDATE user_personal_info`);
        console.log(`   SET subscription_status  = 'active',`);
        console.log(`       last_status_check_at = NOW(),`);
        console.log(`       updated_at           = NOW()`);
        console.log(`   WHERE user_id = '<user_id>';`);
      }
    } else {
      console.log(`⛔  VERDICT: Subscription is NOT active. State: ${subState}`);
      console.log('');
      console.log('   Run this SQL to mark it expired (replace <user_id>):');
      console.log('');
      console.log(`   UPDATE user_personal_info`);
      console.log(`   SET subscription_status  = 'expired',`);
      if (expiryMs) {
        console.log(`       current_period_end   = ${Math.floor(expiryMs / 1000)},`);
      }
      console.log(`       last_status_check_at = NOW(),`);
      console.log(`       updated_at           = NOW()`);
      console.log(`   WHERE user_id = '<user_id>';`);
    }

  } else {
    // v1 response
    const startMs   = parseInt(sub.startTimeMillis,  10);
    const expiryMs  = parseInt(sub.expiryTimeMillis, 10);
    const nowMs     = Date.now();
    const isExpired = expiryMs < nowMs;
    const paymentOk = sub.paymentState !== 0;

    const paymentLabels = {
      0: '0 — Pending (not yet received)',
      1: '1 — Received ✓',
      2: '2 — Free trial',
      3: '3 — Deferred',
    };

    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│  GOOGLE PLAY SUBSCRIPTION DATA (subscriptions v1 API)   │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`  Start time:     ${new Date(startMs).toISOString()}`);
    console.log(`  Expiry time:    ${new Date(expiryMs).toISOString()}`);
    console.log(`  Now:            ${new Date(nowMs).toISOString()}`);
    console.log(`  Is expired:     ${isExpired ? '⛔  YES' : '✅  NO'}`);
    console.log(`  Payment state:  ${paymentLabels[sub.paymentState] ?? sub.paymentState}`);
    console.log(`  Auto-renewing:  ${sub.autoRenewing}`);
    console.log(`  Order ID:       ${sub.orderId ?? '(none)'}`);
    console.log(`  Country:        ${sub.countryCode ?? '(none)'}`);
    console.log('');

    if (!isExpired && paymentOk) {
      console.log('✅  VERDICT: Token is VALID — subscription is active in Google Play.');
      console.log('');
      console.log('   Run this SQL to fix the missing current_period_end (replace <user_id>):');
      console.log('');
      console.log(`   UPDATE user_personal_info`);
      console.log(`   SET current_period_end   = ${Math.floor(expiryMs / 1000)},`);
      console.log(`       current_period_start = ${Math.floor(startMs  / 1000)},`);
      console.log(`       subscription_status  = 'active',`);
      console.log(`       last_status_check_at = NOW(),`);
      console.log(`       updated_at           = NOW()`);
      console.log(`   WHERE user_id = '<user_id>';`);
      console.log('');
      console.log(`   (expires: ${new Date(expiryMs).toISOString()})`);
    } else if (isExpired) {
      console.log('⛔  VERDICT: Token is EXPIRED.');
      console.log('');
      console.log(`   UPDATE user_personal_info`);
      console.log(`   SET subscription_status  = 'expired',`);
      console.log(`       current_period_end   = ${Math.floor(expiryMs / 1000)},`);
      console.log(`       last_status_check_at = NOW(),`);
      console.log(`       updated_at           = NOW()`);
      console.log(`   WHERE user_id = '<user_id>';`);
    } else {
      console.log('⚠️   VERDICT: Payment pending — subscription exists but payment not confirmed yet.');
    }
  }

  console.log('');
}

main();
