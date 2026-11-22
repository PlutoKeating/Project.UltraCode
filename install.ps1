& {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  } catch {}

  $repo = if ($env:ULTRACODE_REPOSITORY) { $env:ULTRACODE_REPOSITORY } else { 'PlutoKeating/Project.UltraCode' }
  $version = if ($env:ULTRACODE_VERSION) { $env:ULTRACODE_VERSION } else { 'latest' }
  $localAppData = if ($env:LOCALAPPDATA) { $env:LOCALAPPDATA } else { Join-Path $HOME 'AppData\Local' }
  $ultracodeHome = if ($env:ULTRACODE_HOME) { $env:ULTRACODE_HOME } else { Join-Path $localAppData 'ultracode' }
  $binDir = if ($env:ULTRACODE_BIN_DIR) { $env:ULTRACODE_BIN_DIR } else { Join-Path $ultracodeHome 'bin' }

  $procInfo = "$($env:PROCESSOR_ARCHITECTURE) $($env:PROCESSOR_ARCHITEW6432) $($env:PROCESSOR_IDENTIFIER)"
  $arch = if ($procInfo -match '(^|\s)ARM') { 'arm64' } else { 'x64' }

  $tempBase = if ($env:TEMP) { $env:TEMP } else { [System.IO.Path]::GetTempPath() }
  $workDir = Join-Path $tempBase ("ultracode-install-" + [Guid]::NewGuid().ToString('N'))
  $logFile = Join-Path $tempBase ("ultracode-install-" + $PID + ".log")
  New-Item -ItemType Directory -Path $workDir -Force | Out-Null

  function Write-StepLog([string]$Text) {
    Add-Content -LiteralPath $logFile -Value $Text -Encoding UTF8
  }

  function Invoke-NativeLogged([string]$FilePath, [string[]]$Arguments = @()) {
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $output = & $FilePath @Arguments 2>&1 | ForEach-Object { "$_" } | Out-String
      $code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
      if ($output) { Write-StepLog $output }
      return @{ Code = $code; Output = $output }
    } finally {
      $ErrorActionPreference = $prevEap
    }
  }

  function Download-File([string]$Uri, [string]$OutFile) {
    $sysCurl = if ($env:SystemRoot) { Join-Path $env:SystemRoot 'System32\curl.exe' } else { $null }
    if (-not ($sysCurl -and (Test-Path -LiteralPath $sysCurl))) {
      $cmd = Get-Command curl.exe -ErrorAction SilentlyContinue | Select-Object -First 1
      $sysCurl = if ($cmd) { $cmd.Source } else { $null }
    }
    if ($sysCurl) {
      $res = Invoke-NativeLogged $sysCurl @('-fsSL', '--retry', '3', '--retry-delay', '2', '-o', $OutFile, $Uri)
      if ($res.Code -eq 0 -and (Test-Path -LiteralPath $OutFile)) {
        return
      }
    }
    Invoke-WebRequest -Uri $Uri -OutFile $OutFile -UseBasicParsing -TimeoutSec 600
  }

  function Invoke-Step([string]$Label, [scriptblock]$Action) {
    $interactive = (-not [Console]::IsOutputRedirected) -and (-not $env:NO_COLOR)
    if ($interactive) {
      $dot = [char]0x280B
      [Console]::Error.Write("`r$dot $Label")
    } else {
      [Console]::Error.WriteLine($Label)
    }
    try {
      & $Action
      if ($interactive) {
        $blank = ' ' * ($Label.Length + 4)
        [Console]::Error.Write("`r$blank`r")
      }
    } catch {
      if ($interactive) {
        $blank = ' ' * ($Label.Length + 4)
        [Console]::Error.Write("`r$blank`r")
      }
      [Console]::Error.WriteLine("UltraCode: $Label failed. Log: $logFile")
      Write-StepLog $_.Exception.ToString()
      throw
    }
  }

  function Add-UserPath([string]$TargetDir) {
    $currentSession = ($env:PATH -split ';') | Where-Object { $_ -ne '' }
    if ($currentSession -notcontains $TargetDir) {
      $env:PATH = "$TargetDir;$env:PATH"
    }
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not $userPath) { $userPath = '' }
    $parts = ($userPath -split ';') | Where-Object { $_ -ne '' }
    if ($parts -notcontains $TargetDir) {
      [Environment]::SetEnvironmentVariable('Path', (($parts + $TargetDir) -join ';'), 'User')
    }
  }

  function Find-OpenCode {
    if ($env:ULTRACODE_OPENCODE_BIN -and (Test-Path -LiteralPath $env:ULTRACODE_OPENCODE_BIN)) {
      return $env:ULTRACODE_OPENCODE_BIN
    }
    $cmd = Get-Command opencode.exe, opencode.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd -and $cmd.Source) {
      return $cmd.Source
    }
    $candidates = @(
      (Join-Path $localAppData 'opencode\bin\opencode.exe'),
      (Join-Path $HOME '.opencode\bin\opencode.exe'),
      (Join-Path $localAppData 'Programs\OpenCode\bin\opencode.exe')
    )
    foreach ($candidate in $candidates) {
      if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
  }

  function Test-OpenCodeVersion([string]$Binary) {
    $res = Invoke-NativeLogged $Binary @('--version')
    if ($res.Code -ne 0) { return $false }
    if ($res.Output -match 'v?(\d+)\.(\d+)\.(\d+)') {
      $maj = [int]$Matches[1]
      $min = [int]$Matches[2]
      $pat = [int]$Matches[3]
      if ($maj -eq 2 -and ($min -gt 3 -or ($min -eq 3 -and $pat -ge 2))) {
        return $true
      }
    }
    return $false
  }

  $prevExplicitOpenCode = $env:ULTRACODE_OPENCODE_BIN
  try {
    $opencodeBin = Find-OpenCode
    if ($opencodeBin) {
      Invoke-Step 'Updating OpenCode' {
        try {
          $null = Invoke-NativeLogged $opencodeBin @('upgrade')
        } catch {
          Write-StepLog $_.Exception.Message
        }
        $resolved = Find-OpenCode
        if (-not $resolved) { $resolved = $opencodeBin }
        if (-not (Test-OpenCodeVersion $resolved)) {
          throw "OpenCode 2.3.2 or newer is required."
        }
      }
    } else {
      Invoke-Step 'Installing OpenCode' {
        $ocUrl = if ($env:ULTRACODE_OPENCODE_DOWNLOAD_URL) {
          $env:ULTRACODE_OPENCODE_DOWNLOAD_URL
        } else {
          "https://opencode.ai/update/api/latest/cli/opencode/opencode-windows-$arch.zip"
        }
        $zipPath = Join-Path $workDir "opencode-windows-$arch.zip"
        $extractDir = Join-Path $workDir 'opencode-extract'
        New-Item -ItemType Directory -Path $extractDir -Force | Out-Null
        Download-File $ocUrl $zipPath
        $tarCmd = Get-Command tar.exe -ErrorAction SilentlyContinue
        $extracted = $false
        if ($tarCmd) {
          $tarRes = Invoke-NativeLogged $tarCmd.Source @('-xf', $zipPath, '-C', $extractDir)
          if ($tarRes.Code -eq 0) { $extracted = $true }
        }
        if (-not $extracted) {
          Expand-Archive -LiteralPath $zipPath -DestinationPath $extractDir -Force
        }
        $exeItem = Get-ChildItem -Path $extractDir -Filter 'opencode.exe' -Recurse | Select-Object -First 1
        if (-not $exeItem) { throw 'opencode.exe not found in archive.' }
        $ocBinDir = Join-Path $localAppData 'opencode\bin'
        New-Item -ItemType Directory -Path $ocBinDir -Force | Out-Null
        $ocDest = Join-Path $ocBinDir 'opencode.exe'
        $ocOld = $null
        if (Test-Path -LiteralPath $ocDest) {
          $ocOld = "$ocDest.old-$PID"
          Remove-Item -LiteralPath $ocOld -Force -ErrorAction SilentlyContinue
          Move-Item -LiteralPath $ocDest -Destination $ocOld -Force
        }
        try {
          Copy-Item -LiteralPath $exeItem.FullName -Destination $ocDest -Force
        } catch {
          if ($ocOld -and (Test-Path -LiteralPath $ocOld) -and -not (Test-Path -LiteralPath $ocDest)) {
            Move-Item -LiteralPath $ocOld -Destination $ocDest -Force -ErrorAction SilentlyContinue
          }
          throw
        }
        if ($ocOld) { Remove-Item -LiteralPath $ocOld -Force -ErrorAction SilentlyContinue }
        Add-UserPath $ocBinDir
        if (-not (Test-OpenCodeVersion $ocDest)) {
          throw 'Installed OpenCode version check failed.'
        }
      }
    }

    $opencodeBin = Find-OpenCode
    $env:ULTRACODE_OPENCODE_BIN = $opencodeBin
    Add-UserPath (Split-Path -Parent $opencodeBin)

    $targetExe = Join-Path $binDir 'ultracode.exe'
    Invoke-Step 'Installing UltraCode' {
      $asset = "ultracode-windows-$arch.exe"
      $base = if ($env:ULTRACODE_RELEASE_BASE_URL) {
        $env:ULTRACODE_RELEASE_BASE_URL.TrimEnd('/')
      } elseif ($version -eq 'latest') {
        "https://github.com/$repo/releases/latest/download"
      } else {
        "https://github.com/$repo/releases/download/$version"
      }

      $tmpExe = Join-Path $workDir $asset
      $tmpSha = Join-Path $workDir "$asset.sha256"
      Download-File "$base/$asset" $tmpExe
      Download-File "$base/$asset.sha256" $tmpSha

      $expected = ((Get-Content -LiteralPath $tmpSha -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
      $actual = (Get-FileHash -LiteralPath $tmpExe -Algorithm SHA256).Hash.ToLowerInvariant()
      if (-not $expected -or ($actual -ne $expected)) {
        throw "Checksum verification failed: expected $expected, got $actual"
      }

      New-Item -ItemType Directory -Path $binDir -Force | Out-Null
      $oldExe = $null
      if (Test-Path -LiteralPath $targetExe) {
        $backupDir = Join-Path $ultracodeHome 'backups'
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        Copy-Item -LiteralPath $targetExe -Destination (Join-Path $backupDir "preinstall-$stamp-ultracode.exe") -Force
        $oldExe = "$targetExe.old-$PID"
        Remove-Item -LiteralPath $oldExe -Force -ErrorAction SilentlyContinue
        Move-Item -LiteralPath $targetExe -Destination $oldExe -Force
      }
      try {
        Copy-Item -LiteralPath $tmpExe -Destination $targetExe -Force
      } catch {
        if ($oldExe -and (Test-Path -LiteralPath $oldExe) -and -not (Test-Path -LiteralPath $targetExe)) {
          Move-Item -LiteralPath $oldExe -Destination $targetExe -Force -ErrorAction SilentlyContinue
        }
        throw
      }
      if ($oldExe) { Remove-Item -LiteralPath $oldExe -Force -ErrorAction SilentlyContinue }
      Add-UserPath $binDir
    }

    Invoke-Step 'Setting up' {
      $applyRes = Invoke-NativeLogged $targetExe @('apply')
      if ($applyRes.Code -ne 0) { throw "ultracode apply exited with $($applyRes.Code)" }
      $docRes = Invoke-NativeLogged $targetExe @('doctor')
      if ($docRes.Code -ne 0) { throw "ultracode doctor exited with $($docRes.Code)" }
    }

    Remove-Item -LiteralPath $logFile -Force -ErrorAction SilentlyContinue
    $verRes = Invoke-NativeLogged $targetExe @('version')
    $installedVersion = $verRes.Output.Trim().TrimStart('v')
    $checkMark = [char]0x2713
    Write-Output ""
    Write-Output "UltraCode $installedVersion"
    Write-Output ""
    Write-Output "$checkMark Ready"
    Write-Output ""
    Write-Output "  ultracode"
    Write-Output "  ultracode desktop"
    Write-Output "  ultracode pair"
  } finally {
    if ($null -eq $prevExplicitOpenCode) {
      Remove-Item Env:ULTRACODE_OPENCODE_BIN -ErrorAction SilentlyContinue
    } else {
      $env:ULTRACODE_OPENCODE_BIN = $prevExplicitOpenCode
    }
    Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
