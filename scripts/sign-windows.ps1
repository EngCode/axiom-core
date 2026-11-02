# Sign a Windows executable with a PFX certificate.
#
# Tauri calls this with the artifact path as the first argument when
# `bundle.windows.signCommand` is configured (see src-tauri/tauri.windows.conf.json).
#
# Environment:
#   AXIOM_WINDOWS_CERTIFICATE          base64 PFX, or a path to a .pfx file
#   AXIOM_WINDOWS_CERTIFICATE_PASSWORD PFX password (optional)
#   AXIOM_WINDOWS_TIMESTAMP_URL        RFC 3161 timestamp server
#   AXIOM_SIGNTOOL                     explicit signtool.exe path (optional)
#   AXIOM_WINDOWS_SIGN_COMMAND         delegate to another signer, e.g. Azure Trusted Signing
#
# With no certificate configured the script prints a warning and exits 0, so a
# developer can produce unsigned local builds. CI sets the certificate secrets.

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Path
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$Message) {
  Write-Host "[sign-windows] $Message"
}

if (-not (Test-Path -LiteralPath $Path)) {
  throw "sign-windows: file not found: $Path"
}

#===> Delegate To A Hosted Signing Service <===//
if ($env:AXIOM_WINDOWS_SIGN_COMMAND) {
  Write-Step "delegating to AXIOM_WINDOWS_SIGN_COMMAND"
  $command = $env:AXIOM_WINDOWS_SIGN_COMMAND
  $arguments = @('-File', $Path)
  & $command @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "sign-windows: delegated signer exited with $LASTEXITCODE"
  }
  exit 0
}

$certificate = $env:AXIOM_WINDOWS_CERTIFICATE
if (-not $certificate) {
  Write-Step 'no AXIOM_WINDOWS_CERTIFICATE set; leaving the bundle unsigned'
  exit 0
}

#===> Locate The Certificate <===//
$certificateFile = $null
$removeCertificateFile = $false
if (Test-Path -LiteralPath $certificate) {
  $certificateFile = (Resolve-Path -LiteralPath $certificate).Path
} else {
  $temporary = Join-Path ([IO.Path]::GetTempPath()) ("axiom-sign-$([guid]::NewGuid().ToString('N')).pfx")
  [IO.File]::WriteAllBytes($temporary, [Convert]::FromBase64String($certificate))
  $certificateFile = $temporary
  $removeCertificateFile = $true
}

#===> Locate SignTool <===//
function Find-SignTool {
  if ($env:AXIOM_SIGNTOOL -and (Test-Path -LiteralPath $env:AXIOM_SIGNTOOL)) {
    return (Resolve-Path -LiteralPath $env:AXIOM_SIGNTOOL).Path
  }
  $onPath = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($onPath) { return $onPath.Source }

  $roots = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin",
    "$env:ProgramFiles\Windows Kits\10\bin"
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  foreach ($root in $roots) {
    $candidate = Get-ChildItem -LiteralPath $root -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($candidate) { return $candidate.FullName }
  }
  return $null
}

$signTool = Find-SignTool
if (-not $signTool) {
  throw 'sign-windows: signtool.exe was not found. Install the Windows SDK or set AXIOM_SIGNTOOL.'
}

$timestamp = if ($env:AXIOM_WINDOWS_TIMESTAMP_URL) {
  $env:AXIOM_WINDOWS_TIMESTAMP_URL
} else {
  'http://timestamp.digicert.com'
}

try {
  Write-Step "signing $(Split-Path -Leaf $Path)"
  $signArguments = @(
    'sign', '/fd', 'SHA256', '/td', 'SHA256', '/tr', $timestamp,
    '/f', $certificateFile
  )
  if ($env:AXIOM_WINDOWS_CERTIFICATE_PASSWORD) {
    $signArguments += @('/p', $env:AXIOM_WINDOWS_CERTIFICATE_PASSWORD)
  }
  $signArguments += $Path

  & $signTool @signArguments
  if ($LASTEXITCODE -ne 0) {
    throw "sign-windows: signtool sign exited with $LASTEXITCODE"
  }

  & $signTool verify /pa /v $Path | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "sign-windows: signtool verify exited with $LASTEXITCODE"
  }
  Write-Step 'signature verified'
} finally {
  if ($removeCertificateFile -and (Test-Path -LiteralPath $certificateFile)) {
    Remove-Item -LiteralPath $certificateFile -Force -ErrorAction SilentlyContinue
  }
}
