$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$layout = Join-Path $root "app\layout.tsx"
$ogRoute = Join-Path $root "app\opengraph-image.tsx"
$twRoute = Join-Path $root "app\twitter-image.tsx"
$preview = Join-Path $root "public\social-preview.png"

if (!(Test-Path $layout)) {
    Write-Host "ERROR: app\layout.tsx not found. Extract this ZIP into the repository root." -ForegroundColor Red
    exit 1
}

if (!(Test-Path $preview)) {
    Write-Host "ERROR: public\social-preview.png not found." -ForegroundColor Red
    exit 1
}

$lines = New-Object 'System.Collections.Generic.List[string]'
Get-Content -Path $layout -Encoding UTF8 | ForEach-Object { [void]$lines.Add($_) }

function Add-BlockImages {
    param(
        [string]$BlockName,
        [string[]]$InsertLines
    )

    $start = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ("^\s*" + [regex]::Escape($BlockName) + ":\s*\{\s*$")) {
            $start = $i
            break
        }
    }

    if ($start -lt 0) {
        throw "Could not find metadata block: $BlockName"
    }

    $end = -1
    for ($i = $start + 1; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\s{2}\},\s*$') {
            $end = $i
            break
        }
    }

    if ($end -lt 0) {
        throw "Could not find end of metadata block: $BlockName"
    }

    $already = $false
    for ($i = $start; $i -le $end; $i++) {
        if ($lines[$i] -like '*social-preview.png*') {
            $already = $true
            break
        }
    }

    if (!$already) {
        for ($j = $InsertLines.Length - 1; $j -ge 0; $j--) {
            $lines.Insert($end, $InsertLines[$j])
        }
        Write-Host "Updated $BlockName metadata." -ForegroundColor Green
    } else {
        Write-Host "$BlockName already points to social-preview.png." -ForegroundColor Yellow
    }
}

Add-BlockImages -BlockName "openGraph" -InsertLines @(
'    images: [',
'      {',
'        url: "/social-preview.png",',
'        width: 1200,',
'        height: 630,',
'        alt: "Ventic Pro - حلول التهوية والتركيب",',
'      },',
'    ],'
)

Add-BlockImages -BlockName "twitter" -InsertLines @(
'    images: ["/social-preview.png"],'
)

Set-Content -Path $layout -Value $lines -Encoding UTF8

if (Test-Path $ogRoute) {
    Remove-Item $ogRoute -Force
    Write-Host "Deleted app\opengraph-image.tsx" -ForegroundColor Green
}

if (Test-Path $twRoute) {
    Remove-Item $twRoute -Force
    Write-Host "Deleted app\twitter-image.tsx" -ForegroundColor Green
}

Write-Host ""
Write-Host "V20G2 applied successfully." -ForegroundColor Green
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20G2 - fix social preview images"
