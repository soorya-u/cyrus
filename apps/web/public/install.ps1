# Installs cyrusd, the Cyrus worker.
#
#   irm https://cyrus.soorya.dev/install.ps1 | iex
#   $env:CYRUS_VERSION = "0.1.0"; irm https://cyrus.soorya.dev/install.ps1 | iex
#
# Resolves the latest release when it runs; CYRUS_VERSION pins one instead.
# The binary lands in ~\.cyrus\bin, which `cyrusd upgrade` keeps current.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Install-Cyrusd {
	$repo = "soorya-u/cyrus"
	$installDir = Join-Path $HOME ".cyrus\bin"

	# Windows on Arm runs the x64 build under emulation.
	$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
	if ($arch -ne "X64" -and $arch -ne "Arm64") {
		throw "unsupported CPU architecture: $arch"
	}
	$asset = "cyrusd-windows-x64.exe"

	$version = $env:CYRUS_VERSION
	if ($version) {
		$version = $version.TrimStart("v")
	} else {
		$release = Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest"
		$version = ([string]$release.tag_name).TrimStart("v")
		if (-not $version) { throw "could not determine the latest release of $repo" }
	}

	$base = "https://github.com/$repo/releases/download/v$version"
	$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("cyrusd-" + [System.Guid]::NewGuid().ToString("N"))
	New-Item -ItemType Directory -Path $tmp | Out-Null

	try {
		Write-Host "Installing cyrusd $version (windows-x64)"
		Invoke-WebRequest "$base/$asset" -OutFile (Join-Path $tmp $asset)
		Invoke-WebRequest "$base/SHA256SUMS" -OutFile (Join-Path $tmp "SHA256SUMS")

		$expected = $null
		foreach ($line in Get-Content (Join-Path $tmp "SHA256SUMS")) {
			if ($line -match '^([0-9a-fA-F]{64}) [ *](.+)$' -and $Matches[2] -eq $asset) {
				$expected = $Matches[1].ToLower()
			}
		}
		if (-not $expected) { throw "SHA256SUMS has no entry for $asset" }

		$actual = (Get-FileHash (Join-Path $tmp $asset) -Algorithm SHA256).Hash.ToLower()
		if ($actual -ne $expected) { throw "checksum mismatch for $asset; refusing to install" }

		$reported = (& (Join-Path $tmp $asset) --version | Out-String).Trim()
		if ($LASTEXITCODE -ne 0) { throw "the downloaded binary does not run on this machine" }
		if ($reported -ne $version) { throw "the downloaded binary reports version $reported, not $version" }

		New-Item -ItemType Directory -Path $installDir -Force | Out-Null
		$target = Join-Path $installDir "cyrusd.exe"
		# A running exe cannot be overwritten, but it can be renamed aside.
		if (Test-Path $target) {
			$aside = "$target.old"
			Remove-Item $aside -Force -ErrorAction SilentlyContinue
			Move-Item $target $aside -Force
		}
		Copy-Item (Join-Path $tmp $asset) $target -Force
	} finally {
		Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
	}

	Write-Host "Installed cyrusd $version to $installDir\cyrusd.exe"

	$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
	if (($userPath -split ";") -notcontains $installDir) {
		[Environment]::SetEnvironmentVariable("Path", "$installDir;$userPath", "User")
		$env:Path = "$installDir;$env:Path"
		Write-Host "Added $installDir to your PATH. Open a new terminal to pick it up."
	}

	Write-Host ""
	Write-Host "Next: cyrusd login; cyrusd start --bg"
}

# defined as a function and called last so a truncated download never runs half a script
Install-Cyrusd
