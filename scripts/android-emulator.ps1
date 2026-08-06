# Launch Android emulator (if needed) and start Expo against it.
# AVD name: set MATCHCUT_AVD in the environment or in .env / .env.local (not committed).

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Import-DotEnvFile([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }
    $key = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not [string]::IsNullOrWhiteSpace($key) -and -not (Test-Path "Env:$key")) {
      Set-Item -Path "Env:$key" -Value $value
    }
  }
}

Import-DotEnvFile (Join-Path $Root ".env")
Import-DotEnvFile (Join-Path $Root ".env.local")

function Resolve-AndroidSdk {
  foreach ($candidate in @($env:ANDROID_HOME, $env:ANDROID_SDK_ROOT, (Join-Path $env:LOCALAPPDATA "Android\Sdk"))) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
  }
  throw "Android SDK not found. Set ANDROID_HOME or install the SDK under %LOCALAPPDATA%\Android\Sdk."
}

$Sdk = Resolve-AndroidSdk
$env:ANDROID_HOME = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk

$Adb = Join-Path $Sdk "platform-tools\adb.exe"
$Emulator = Join-Path $Sdk "emulator\emulator.exe"
if (-not (Test-Path $Adb)) { throw "adb not found at $Adb" }
if (-not (Test-Path $Emulator)) { throw "emulator not found at $Emulator" }

$PlatformTools = Join-Path $Sdk "platform-tools"
$EmulatorDir = Join-Path $Sdk "emulator"
$env:Path = "$PlatformTools;$EmulatorDir;$env:Path"

function Get-OnlineAdbDevices {
  & $Adb devices |
    Select-Object -Skip 1 |
    Where-Object { $_ -match "\tdevice$" } |
    ForEach-Object { ($_ -split "\t")[0] }
}

function Get-AvailableAvds {
  & $Emulator -list-avds 2>$null | Where-Object { $_.Trim() -ne "" }
}

$devices = @(Get-OnlineAdbDevices)
if ($devices.Count -eq 0) {
  $avd = $env:MATCHCUT_AVD
  if ([string]::IsNullOrWhiteSpace($avd)) {
    $available = @(Get-AvailableAvds)
    Write-Host "No emulator/device connected and MATCHCUT_AVD is not set."
    Write-Host "Add MATCHCUT_AVD=<avd-name> to .env (gitignored) or your shell environment."
    if ($available.Count -gt 0) {
      Write-Host "Available AVDs:"
      $available | ForEach-Object { Write-Host "  - $_" }
    }
    exit 1
  }

  Write-Host "Starting emulator: $avd"
  Start-Process -FilePath $Emulator -ArgumentList @("-avd", $avd) -WindowStyle Normal

  Write-Host "Waiting for device..."
  & $Adb wait-for-device

  $deadline = (Get-Date).AddMinutes(3)
  do {
    if ((Get-Date) -gt $deadline) {
      throw "Timed out waiting for emulator boot (sys.boot_completed)."
    }
    Start-Sleep -Seconds 2
    $boot = (& $Adb shell getprop sys.boot_completed 2>$null | Out-String).Trim()
  } while ($boot -ne "1")

  Write-Host "Emulator ready."
} else {
  Write-Host "Using connected device(s): $($devices -join ', ')"
}

Write-Host "Starting Expo (Android)..."
npx expo start --android
