// Read-only: run explicitly on the machine whose capacity you want to inspect.
// No hardware report or notes are sent to a server.
import os from 'node:os';
import { readFileSync, statfsSync } from 'node:fs';
import path from 'node:path';

const mib = bytes => Math.round(bytes / 1024 ** 2);
const pct = (amount, total) => total > 0 ? Number((amount / total * 100).toFixed(1)) : null;
const cpuSnapshot = () => os.cpus().map(cpu => ({ idle: cpu.times.idle, total: Object.values(cpu.times).reduce((sum, n) => sum + n, 0) }));
const first = cpuSnapshot();
await new Promise(resolve => setTimeout(resolve, 250));
const second = cpuSnapshot();
let idle = 0, total = 0;
for (let i = 0; i < Math.min(first.length, second.length); i++) { idle += second[i].idle - first[i].idle; total += second[i].total - first[i].total; }
const cpuUtilizationPercent = total > 0 ? Number((100 * (1 - idle / total)).toFixed(1)) : null;
let available = os.freemem();
let memoryMethod = 'os.freemem: OS-reported free memory';
if (process.platform === 'linux') {
  try {
    const match = readFileSync('/proc/meminfo', 'utf8').match(/^MemAvailable:\s+(\d+)\s+kB/m);
    if (match) { available = Number(match[1]) * 1024; memoryMethod = 'Linux MemAvailable, including reclaimable memory'; }
  } catch { /* Keep the explicitly labelled OS fallback. */ }
}
let processAvailable = null;
try { processAvailable = typeof process.availableMemory === 'function' ? process.availableMemory() : null; } catch { /* Unknown process budget. */ }
if (processAvailable > 0) available = Math.min(available, processAvailable);
const visibleTotalMemory = os.totalmem();
let constrained = null;
try { constrained = typeof process.constrainedMemory === 'function' ? process.constrainedMemory() : null; } catch { /* Unknown environment limit. */ }
const totalMemory = constrained > 0 ? Math.min(visibleTotalMemory, constrained) : visibleTotalMemory;
available = Math.max(0, Math.min(available, totalMemory));
let storage = null;
try {
  const disk = statfsSync(process.cwd());
  const totalBytes = disk.blocks * disk.bsize;
  const availableBytes = disk.bavail * disk.bsize;
  storage = { scope: 'volume containing the current working directory, not necessarily the Chrome profile', volume: path.parse(process.cwd()).root, totalGiB: Number((totalBytes / 1024 ** 3).toFixed(2)), availableGiB: Number((availableBytes / 1024 ** 3).toFixed(2)), availablePercent: pct(availableBytes, totalBytes) };
} catch { /* Some operating systems do not expose statfs. */ }
const release = os.release();
const context = process.platform === 'win32' ? 'Native Windows' : /microsoft/i.test(release) ? 'WSL Linux VM; these are not Windows host totals' : `${process.platform} process environment; may be a VM or container`;
const report = {
  schemaVersion: 1,
  capturedAt: new Date().toISOString(),
  context,
  memory: { totalVisibleMiB: mib(visibleTotalMemory), effectiveTotalMiB: mib(totalMemory), availableMiB: mib(available), usedMiB: mib(totalMemory - available), availablePercent: pct(available, totalMemory), usedPercent: pct(totalMemory - available, totalMemory), percentageBase: 'effective process-environment total', method: memoryMethod, processAvailableMiB: processAvailable === null ? null : mib(processAvailable) },
  cpu: { model: os.cpus()[0]?.model || 'Unknown', availableLogicalProcessors: os.availableParallelism(), physicalCores: null, utilizationPercent: cpuUtilizationPercent, utilizationScope: 'OS-reported CPU set, which may be broader than a container allocation' },
  storage,
  qwenGuard: { model: 'Qwen2.5-0.5B Q4_K_M', processBudgetMiB: 1024, reserveMiB: 512, minimumAvailableMiB: 1536, meetsMemoryStartCheck: mib(available) >= 1536, meaning: 'A conservative start check, not a memory reservation or Chrome eligibility check' },
  privacy: 'This report stays in the terminal unless its owner chooses to share it. No username, hostname, serial number or process list is collected.',
};
console.log(JSON.stringify(report, null, 2));
