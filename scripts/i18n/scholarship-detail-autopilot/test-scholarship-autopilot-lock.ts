/**
 * Verify scholarship autopilot advisory lock RPCs (Stage 5E-17).
 */
import {
  isScholarshipAutopilotLocked,
  releaseScholarshipAutopilotLock,
  tryAcquireScholarshipAutopilotLock
} from './scholarship-autopilot-lock';

async function main() {
  const runId = `lock-test-${Date.now()}`;
  const before = await isScholarshipAutopilotLocked();
  console.log('[lock-test] before', before);

  const acquire = await tryAcquireScholarshipAutopilotLock(runId);
  if (!acquire.acquired) {
    console.error('[lock-test] FAIL acquire', acquire);
    process.exit(1);
  }

  const during = await isScholarshipAutopilotLocked();
  if (during.locked !== true) {
    console.error('[lock-test] FAIL not locked after acquire', during);
    process.exit(1);
  }

  const deny = await tryAcquireScholarshipAutopilotLock('second-runner');
  if (deny.acquired) {
    console.error('[lock-test] FAIL second acquire should be denied', deny);
    await releaseScholarshipAutopilotLock(runId);
    process.exit(1);
  }
  console.log('[lock-test] second acquire denied as expected', deny.reason);

  await releaseScholarshipAutopilotLock(runId);
  const after = await isScholarshipAutopilotLocked();
  if (after.locked !== false) {
    console.error('[lock-test] FAIL still locked after release', after);
    process.exit(1);
  }

  console.log('[lock-test] PASS', { before, during, after });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
