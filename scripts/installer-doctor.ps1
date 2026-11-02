# Diagnose the NSIS "Error writing temporary file. Make sure your temp
# folder is valid." installer failure.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/installer-doctor.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/installer-doctor.ps1 -Fix
#   powershell -ExecutionPolicy Bypass -File scripts/installer-doctor.ps1 -InstallerPath .\Axiom.Core_0.2.0_x64-setup.exe
#
# -Fix rewrites the per-user TEMP/TMP variables to %LOCALAPPDATA%\Temp when the
# current folder cannot be written, and unblocks the installer file.
# The script never requires administrator rights for the per-user repair.

param(
  [switch]$Fix,
  [string]$InstallerPath
)

$ErrorActionPreference = 'Stop'
$problems = New-Object System.Collections.Generic.List[string]

function Write-Section([string]$Title) {
  Write-Host ''
  Write-Host "== $Title ==" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
  Write-Host "  OK   $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
  Write-Host "  WARN $Message" -ForegroundColor Yellow
}

function Write-Bad([string]$Message) {
  Write-Host "  FAIL $Message" -ForegroundColor Red
  $problems.Add($Message) | Out-Null
}

function Expand-PathValue([string]$Value) {
  if (-not $Value) { return $null }
  return [Environment]::ExpandEnvironmentVariables($Value).Trim().Trim('"')
}

function Test-TempFolder([string]$Value) {
  $folder = Expand-PathValue $Value
  if (-not $folder) {
    Write-Bad 'TEMP/TMP is empty'
    return $false
  }
  if (-not [IO.Path]::IsPathRooted($folder)) {
    Write-Bad "TEMP/TMP is not an absolute path: $folder"
    return $false
  }
  if (-not (Test-Path -LiteralPath $folder -PathType Container)) {
    Write-Bad "TEMP/TMP folder does not exist: $folder"
    return $false
  }
  try {
    $probeDirectory = Join-Path $folder ("axiom-probe-$([guid]::NewGuid().ToString('N'))")
    New-Item -ItemType Directory -Path $probeDirectory -ErrorAction Stop | Out-Null
    $probeFile = Join-Path $probeDirectory 'probe.txt'
    Set-Content -LiteralPath $probeFile -Value 'axiom' -Encoding ASCII -ErrorAction Stop
    $content = Get-Content -LiteralPath $probeFile -Raw -ErrorAction Stop
    Remove-Item -LiteralPath $probeDirectory -Recurse -Force -ErrorAction Stop
    if ($content.Trim() -ne 'axiom') {
      Write-Bad "TEMP/TMP read-back failed: $folder"
      return $false
    }
    Write-Ok "writable: $folder"
    return $true
  } catch {
    Write-Bad "cannot write to TEMP/TMP ($folder): $($_.Exception.Message)"
    return $false
  }
}

Write-Host 'Axiom Core installer doctor' -ForegroundColor White
Write-Host 'NSIS extracts its runtime to TEMP before it can install anything.'

Write-Section 'Temporary folders'
$userEnvironment = Get-ItemProperty -Path 'HKCU:\Environment' -ErrorAction SilentlyContinue
$machineEnvironment = Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment' -ErrorAction SilentlyContinue

$userTemp = $userEnvironment.TEMP
$userTmp = $userEnvironment.TMP
Write-Host "  process TEMP : $env:TEMP"
Write-Host "  process TMP  : $env:TMP"
Write-Host "  user TEMP    : $userTemp"
Write-Host "  user TMP     : $userTmp"
Write-Host "  machine TEMP : $($machineEnvironment.TEMP)"
Write-Host "  machine TMP  : $($machineEnvironment.TMP)"

$processOk = Test-TempFolder $env:TEMP
$userOk = Test-TempFolder $userTemp

if ($Fix -and -not ($processOk -and $userOk)) {
  $fallback = Join-Path $env:LOCALAPPDATA 'Temp'
  Write-Section 'Repair'
  try {
    New-Item -ItemType Directory -Path $fallback -Force -ErrorAction Stop | Out-Null
    Set-ItemProperty -Path 'HKCU:\Environment' -Name TEMP -Value $fallback
    Set-ItemProperty -Path 'HKCU:\Environment' -Name TMP -Value $fallback
    $env:TEMP = $fallback
    $env:TMP = $fallback
    Write-Ok "user TEMP/TMP now point at $fallback"
    Write-Warn 'Sign out and back in (or restart) so new processes and installers inherit it.'
  } catch {
    Write-Bad "could not repair the per-user TEMP variables: $($_.Exception.Message)"
  }
}

Write-Section 'Disk space'
try {
  $systemDrive = (Get-Item -LiteralPath $env:SystemDrive).PSDrive
  $freeGb = [math]::Round($systemDrive.Free / 1GB, 1)
  if ($freeGb -lt 2) {
    Write-Bad "only $freeGb GB free on $env:SystemDrive; NSIS needs room to extract"
  } else {
    Write-Ok "$freeGb GB free on $env:SystemDrive"
  }
} catch {
  Write-Warn "could not read free space: $($_.Exception.Message)"
}

Write-Section 'Security software'
try {
  $preferences = Get-MpPreference -ErrorAction Stop
  if ($preferences.EnableControlledFolderAccess -eq 1) {
    Write-Warn 'Controlled Folder Access is on. Allow Axiom Core or its installer, or temporarily turn it off.'
  } else {
    Write-Ok 'Controlled Folder Access is off'
  }
} catch {
  Write-Warn 'Microsoft Defender preferences are unavailable (third-party antivirus?)'
}
Write-Host '  If a third-party antivirus blocks installers, allow the file and retry.'

Write-Section 'Child processes'
# NSIS itself is a child process of Explorer. A launcher, IDE or agent sandbox
# can let this PowerShell write to TEMP while denying the same write to the
# downloaded setup, so probe from a child process as well.
$childProbe = Join-Path ([IO.Path]::GetTempPath()) ("axiom-child-$([guid]::NewGuid().ToString('N')).txt")
try {
  $null = cmd.exe /c "echo axiom> `"$childProbe`" 2>&1"
  if (Test-Path -LiteralPath $childProbe) {
    Write-Ok 'a child process can write to TEMP'
  } else {
    Write-Bad 'a child process could not write to TEMP (launcher/sandbox or antivirus restriction)'
  }
} catch {
  Write-Bad "child-process TEMP probe failed: $($_.Exception.Message)"
} finally {
  Remove-Item -LiteralPath $childProbe -Force -ErrorAction SilentlyContinue
}

if ($InstallerPath) {
  Write-Section 'Installer file'
  if (-not (Test-Path -LiteralPath $InstallerPath)) {
    Write-Bad "installer not found: $InstallerPath"
  } else {
    $file = Get-Item -LiteralPath $InstallerPath
    Write-Host "  path : $($file.FullName)"
    Write-Host "  size : $([math]::Round($file.Length / 1MB, 1)) MB"
    if ($file.Length -lt 1MB) {
      Write-Bad 'the file is smaller than 1 MB; the download is probably incomplete'
    } else {
      Write-Ok 'file size looks plausible'
    }
    $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
    if ($signature.Status -eq 'Valid') {
      Write-Ok "signed by $($signature.SignerCertificate.Subject)"
    } elseif ($signature.Status -eq 'NotSigned') {
      Write-Warn 'the installer is not code-signed; SmartScreen may block it'
    } else {
      Write-Warn "signature status: $($signature.Status)"
    }
    if ($Fix) {
      try {
        Unblock-File -LiteralPath $file.FullName -ErrorAction Stop
        Write-Ok 'removed the Mark-of-the-Web'
      } catch {
        Write-Warn "could not unblock the file: $($_.Exception.Message)"
      }
    }
  }
}

Write-Section 'Workarounds'
Write-Host '  1. Install the .msi instead of the NSIS setup. The MSI does not unpack a stub to TEMP.'
Write-Host '  2. Move the installer out of a synced/OneDrive folder, then run it from File Explorer.'
Write-Host '  3. Re-download the installer; a truncated download causes the same message.'
Write-Host '  4. Run: powershell -ExecutionPolicy Bypass -File scripts/installer-doctor.ps1 -Fix'
Write-Host '  5. Reboot, then install before opening other apps that lock TEMP.'

Write-Section 'Result'
if ($problems.Count -eq 0) {
  Write-Host 'No temp-folder problem detected. The installer should be able to start.' -ForegroundColor Green
  exit 0
}

Write-Host "Found $($problems.Count) problem(s):" -ForegroundColor Red
$problems | ForEach-Object { Write-Host "  - $_" }
Write-Host 'Re-run with -Fix to repair the per-user temp folder, then sign out and retry.' -ForegroundColor Yellow
exit 1
