param([string]$Note = 'Tables and chairs arrived. Extension cables are missing. Rina will confirm room access by 4 pm. Putri needs to print 20 handouts.')
$ErrorActionPreference = 'Stop'
$AvailableMiB = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024
Write-Host ('Available RAM: {0:N0} MiB' -f $AvailableMiB)
if ($AvailableMiB -lt 1024) { throw 'Free at least 1024 MiB of RAM for this small-model exercise, then retry. Save work and close unused applications.' }
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
$PromptFile = Join-Path $WorkFolder 'prompt.txt'
[System.IO.File]::WriteAllText($PromptFile, $Prompt, (New-Object System.Text.UTF8Encoding($false)))
$Watch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    & $Executable.FullName -m $Model --device none -ngl 0 -t 2 -c 1024 -b 64 -ub 64 -n 160 --temp 0 --seed 1 --no-conversation --no-display-prompt -f $PromptFile
    if ($LASTEXITCODE -ne 0) { throw "Model runtime exited with code $LASTEXITCODE" }
} finally {
    $Watch.Stop()
    Remove-Item -Path $PromptFile -ErrorAction SilentlyContinue
    Write-Host ('Elapsed: {0:N2} seconds' -f $Watch.Elapsed.TotalSeconds)
}
