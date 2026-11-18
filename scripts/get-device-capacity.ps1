param(
    [switch]$AsJson,
    [int]$ProcessBudgetMiB = 1024,
    [int]$ReserveMiB = 512
)
$ErrorActionPreference = 'Stop'
$OperatingSystem = Get-CimInstance Win32_OperatingSystem
$Processors = @(Get-CimInstance Win32_Processor)
$InstalledBytes = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum
$UsableMiB = [math]::Round($OperatingSystem.TotalVisibleMemorySize / 1024)
$AvailableMiB = [math]::Round($OperatingSystem.FreePhysicalMemory / 1024)
$UsedMiB = $UsableMiB - $AvailableMiB
$CpuLoad = ($Processors | Measure-Object -Property LoadPercentage -Average).Average
$CurrentVolume = [System.IO.Path]::GetPathRoot((Split-Path $PSScriptRoot -Parent)).TrimEnd('\')
$Disk = Get-CimInstance Win32_LogicalDisk | Where-Object DeviceID -eq $CurrentVolume | Select-Object -First 1
$Report = [ordered]@{
    schemaVersion = 1
    capturedAt = [DateTime]::UtcNow.ToString('o')
    context = 'Native Windows host'
    memory = [ordered]@{
        installedMiB = [math]::Round($InstalledBytes / 1MB)
        usableMiB = $UsableMiB
        usedMiB = $UsedMiB
        availableMiB = $AvailableMiB
        usedPercent = [math]::Round(100 * $UsedMiB / $UsableMiB, 1)
        availablePercent = [math]::Round(100 * $AvailableMiB / $UsableMiB, 1)
    }
    cpu = [ordered]@{
        model = ($Processors.Name -join '; ')
        physicalCores = ($Processors | Measure-Object NumberOfCores -Sum).Sum
        logicalProcessors = ($Processors | Measure-Object NumberOfLogicalProcessors -Sum).Sum
        utilizationPercent = $CpuLoad
    }
    storage = $(if ($Disk) { [ordered]@{
        volume = $CurrentVolume
        totalGiB = [math]::Round($Disk.Size / 1GB, 2)
        availableGiB = [math]::Round($Disk.FreeSpace / 1GB, 2)
        availablePercent = [math]::Round(100 * $Disk.FreeSpace / $Disk.Size, 1)
        scope = 'Volume containing this repository; Chrome may use another volume'
    } } else { $null })
    qwenGuard = [ordered]@{
        processBudgetMiB = $ProcessBudgetMiB
        reserveMiB = $ReserveMiB
        minimumAvailableMiB = $ProcessBudgetMiB + $ReserveMiB
        meetsMemoryStartCheck = $AvailableMiB -ge ($ProcessBudgetMiB + $ReserveMiB)
    }
    privacy = 'Read only. No report is uploaded. No username, hostname, serial number or process list is collected.'
}
if ($AsJson) { $Report | ConvertTo-Json -Depth 5 }
else {
    Write-Host 'WorkshopReady - capacity snapshot (native Windows)'
    Write-Host ('RAM installed: {0:N0} MiB; usable: {1:N0} MiB' -f $Report.memory.installedMiB, $UsableMiB)
    Write-Host ('RAM used: {0:N0} MiB ({1}%); available: {2:N0} MiB ({3}%)' -f $UsedMiB, $Report.memory.usedPercent, $AvailableMiB, $Report.memory.availablePercent)
    Write-Host ('CPU: {0} physical cores; {1} logical processors; reported load: {2}%' -f $Report.cpu.physicalCores, $Report.cpu.logicalProcessors, $CpuLoad)
    if ($Disk) { Write-Host ('Disk {0}: {1:N2} GiB free of {2:N2} GiB ({3}%)' -f $CurrentVolume, $Report.storage.availableGiB, $Report.storage.totalGiB, $Report.storage.availablePercent) }
    Write-Host ('Qwen memory start check: {0}; requires {1} MiB available' -f $Report.qwenGuard.meetsMemoryStartCheck, $Report.qwenGuard.minimumAvailableMiB)
    Write-Host 'This is a changing snapshot, not a guarantee. It does not establish Chrome model eligibility.'
}
