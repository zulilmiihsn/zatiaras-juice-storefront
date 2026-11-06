param([ValidateSet('Inspect', 'Start', 'Stop')][string]$Action = 'Inspect')
$ErrorActionPreference = 'Stop'
$projectRoot = 'D:\projects\zatiarasjuice'
$projectPort = 5199
$projectListener = Get-NetTCPConnection -LocalPort $projectPort -State Listen -ErrorAction SilentlyContinue
$projectProcesses = @(Get-CimInstance Win32_Process)

if ($Action -eq 'Inspect') {
    & netstat.exe -ano | Select-String -SimpleMatch ':5199'
    $projectListener | Select-Object LocalPort, OwningProcess
    $projectProcesses | Where-Object {
        $_.CommandLine -like "*$projectRoot*" -and $_.Name -in @('node.exe', 'workerd.exe', 'bun.exe')
    } | Select-Object ProcessId, ParentProcessId, Name, @{Name='Command';Expression={$_.CommandLine.Substring(0, [Math]::Min(180, $_.CommandLine.Length))}}
    exit
}

if ($Action -eq 'Stop') {
    if (-not $projectListener) { Write-Output 'Preview port is already stopped.'; exit }
    $projectOwner = $projectProcesses | Where-Object ProcessId -eq $projectListener.OwningProcess
    if ($projectOwner.CommandLine -notlike "*$projectRoot*" -or $projectOwner.CommandLine -notmatch 'vite') {
        throw 'Refusing to stop an unverified port owner.'
    }
    $projectChildren = $projectProcesses | Where-Object {
        $_.ParentProcessId -eq $projectOwner.ProcessId -and $_.CommandLine -like "*$projectRoot*"
    }
    $projectChildren | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Stop-Process -Id $projectOwner.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Output 'Project preview stopped.'
    exit
}

if ($projectListener) { Write-Output 'Preview is already listening.'; exit }
$projectRunner = (Get-Command rtk.exe).Source
$projectStarted = Start-Process -FilePath $projectRunner -ArgumentList @('pnpm', 'dev', '--host', '127.0.0.1', '--port', '5199', '--strictPort') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput "$projectRoot\scratch\liquid2-preview-final.out.log" -RedirectStandardError "$projectRoot\scratch\liquid2-preview-final.err.log" -PassThru
Write-Output "Started preview launcher PID $($projectStarted.Id)."
