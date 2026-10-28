$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$page = Join-Path $root "app\page.tsx"

if (!(Test-Path $page)) {
    Write-Host "ERROR: app\page.tsx not found. Extract this ZIP into the Ventic Pro repository root." -ForegroundColor Red
    exit 1
}

$content = Get-Content -Raw -Encoding UTF8 $page

$oldDynamic = 'export const dynamic = "force-dynamic";'
$newConfig = @'
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};
'@

if ($content.Contains($oldDynamic)) {
    $content = $content.Replace($oldDynamic, $newConfig.Trim())
} elseif ($content.Contains('export const revalidate = 300;') -and $content.Contains('canonical: "/"')) {
    Write-Host "V20F config already applied." -ForegroundColor Yellow
} else {
    Write-Host "ERROR: Expected homepage dynamic config was not found. No changes were made." -ForegroundColor Red
    exit 1
}

$metadataImport = 'import type { Metadata } from "next";'
if (!$content.Contains($metadataImport)) {
    $anchor = 'import Link from "next/link";'
    if (!$content.Contains($anchor)) {
        Write-Host "ERROR: Next Link import anchor not found. No changes were written." -ForegroundColor Red
        exit 1
    }
    $content = $content.Replace($anchor, $anchor + "`r`n" + $metadataImport)
}

Set-Content -Path $page -Value $content -Encoding UTF8

Write-Host ""
Write-Host "V20F applied successfully." -ForegroundColor Green
Write-Host "- Homepage canonical: https://ventic-pro.com/" -ForegroundColor Green
Write-Host "- Homepage ISR cache: 5 minutes" -ForegroundColor Green
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20F - optimize homepage SEO and caching"
