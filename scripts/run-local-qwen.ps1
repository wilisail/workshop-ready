param(
    [string]$Note = 'Tables and chairs arrived. Extension cables are missing. Rina will confirm room access by 4 pm. Putri needs to print 20 handouts.',
    [ValidateRange(768,4096)][int]$MaxProcessMiB = 1024,
    [ValidateRange(256,4096)][int]$ReserveMiB = 512,
    [ValidateRange(15,300)][int]$TimeoutSeconds = 120
)
$ErrorActionPreference = 'Stop'
function Assert-StartCapacity {
    $Snapshot = & (Join-Path $PSScriptRoot 'get-device-capacity.ps1') -AsJson -ProcessBudgetMiB $MaxProcessMiB -ReserveMiB $ReserveMiB | ConvertFrom-Json
    Write-Host ('Available RAM: {0:N0} MiB ({1}% of usable RAM)' -f $Snapshot.memory.availableMiB, $Snapshot.memory.availablePercent)
    if (-not $Snapshot.qwenGuard.meetsMemoryStartCheck) {
        throw ('Local start blocked: {0} MiB available; this guard asks for {1} MiB including reserve. Keep the note and use the web app''s Cloud mode after Firebase is connected. No note was uploaded.' -f $Snapshot.memory.availableMiB, $Snapshot.qwenGuard.minimumAvailableMiB)
    }
}
Assert-StartCapacity
$WorkFolder = Join-Path (Split-Path $PSScriptRoot -Parent) '.local-qwen'
New-Item -ItemType Directory -Force -Path $WorkFolder | Out-Null
$Archive = Join-Path $WorkFolder 'llama-b12498-bin-win-cpu-x64.zip'
$Model = Join-Path $WorkFolder 'qwen2.5-0.5b-instruct-q4_k_m.gguf'
$BinaryFolder = Join-Path $WorkFolder 'runtime'
function Get-VerifiedFile([string]$Url, [string]$Path, [string]$Sha256) {
    if (-not (Test-Path $Path)) { Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing }
    if ((Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) { throw "Checksum mismatch: $Path. Remove this download and retry." }
}
Get-VerifiedFile 'https://github.com/ggml-org/llama.cpp/releases/download/b12498/llama-b12498-bin-win-cpu-x64.zip' $Archive 'eeb67345805510a1a955430d559336a3c535345d9a19467bf89fa0a6a34d4173'
Get-VerifiedFile 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf' $Model '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db'
if (-not (Test-Path $BinaryFolder)) { Expand-Archive -Path $Archive -DestinationPath $BinaryFolder }
$Executable = Get-ChildItem -Path $BinaryFolder -Recurse -Filter 'llama-completion.exe' | Select-Object -First 1
if (-not $Executable) { throw 'The official runtime did not contain llama-completion.exe.' }
$Prompt = @"
<|im_start|>system
Extract facts from workshop NOTES. Return ONLY JSON with arrays ready, blocked, nextActions. ready contains completed or available items. blocked contains missing items or obstacles. nextActions contains explicit pending tasks, preserving stated owners and deadlines. Never invent facts. Use [] if a category has no facts.
Example NOTES: Coffee delivered. Cups missing. Ali must buy cups.
Example JSON: {"ready":["Coffee delivered"],"blocked":["Cups missing"],"nextActions":["Ali must buy cups"]}<|im_end|>
<|im_start|>user
NOTES: $Note<|im_end|>
<|im_start|>assistant
"@
$RunId = [Guid]::NewGuid().ToString('N')
$PromptFile = Join-Path $WorkFolder ($RunId + '-prompt.txt')
$OutputFile = Join-Path $WorkFolder ($RunId + '-output.txt')
$ErrorFile = Join-Path $WorkFolder ($RunId + '-error.txt')
[System.IO.File]::WriteAllText($PromptFile, $Prompt, (New-Object System.Text.UTF8Encoding($false)))
$Watch = [System.Diagnostics.Stopwatch]::StartNew()
$ModelProcess = $null
$RunLock = $null
$PeakMiB = 0
try {
    # Exclusive lock: at most one model launched by this script in this checkout.
    $RunLock = [System.IO.File]::Open((Join-Path $WorkFolder 'runtime.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    Assert-StartCapacity # Downloads may have taken time; take a fresh reading.
    $Arguments = '-m "{0}" --device none -ngl 0 -t 2 -c 1024 -b 64 -ub 64 -n 160 --temp 0 --seed 1 --no-conversation --no-display-prompt -f "{1}"' -f $Model, $PromptFile
    $Watch.Restart()
    $ModelProcess = Start-Process -FilePath $Executable.FullName -ArgumentList $Arguments -NoNewWindow -PassThru -RedirectStandardOutput $OutputFile -RedirectStandardError $ErrorFile
    while (-not $ModelProcess.HasExited) {
        $ModelProcess.Refresh()
        if ($ModelProcess.HasExited) { break }
        $WorkingMiB = $ModelProcess.WorkingSet64 / 1MB
        $PeakMiB = [math]::Max($PeakMiB, $WorkingMiB)
        $AvailableMiB = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024
        if ($WorkingMiB -gt $MaxProcessMiB) { throw ('Local model exceeded the {0} MiB process budget.' -f $MaxProcessMiB) }
        if ($AvailableMiB -lt $ReserveMiB) { throw ('Available system RAM fell below the {0} MiB reserve.' -f $ReserveMiB) }
        if ($Watch.Elapsed.TotalSeconds -gt $TimeoutSeconds) { throw ('Local model exceeded the {0}-second time limit.' -f $TimeoutSeconds) }
        Start-Sleep -Milliseconds 400
    }
    $ModelProcess.WaitForExit()
    if (Test-Path $OutputFile) { Get-Content -Raw $OutputFile }
    if ($ModelProcess.ExitCode -ne 0) {
        if (Test-Path $ErrorFile) { Get-Content -Raw $ErrorFile | Write-Host }
        throw ('Model runtime exited with code {0}' -f $ModelProcess.ExitCode)
    }
} finally {
    if ($ModelProcess -and -not $ModelProcess.HasExited) { Stop-Process -Id $ModelProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($RunLock) { $RunLock.Dispose() }
    $Watch.Stop()
    Remove-Item -Path $PromptFile,$OutputFile,$ErrorFile -ErrorAction SilentlyContinue
    Write-Host ('Elapsed: {0:N2} seconds' -f $Watch.Elapsed.TotalSeconds)
    if ($ModelProcess) { Write-Host ('Observed process peak: {0:N0} MiB (polling can miss short peaks)' -f $PeakMiB) }
    else { Write-Host 'No model process was started.' }
}
