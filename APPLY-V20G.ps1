$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$layout = Join-Path $root "app\layout.tsx"
$og = Join-Path $root "app\opengraph-image.tsx"
$tw = Join-Path $root "app\twitter-image.tsx"
$preview = Join-Path $root "public\social-preview.png"

if (!(Test-Path $layout)) {
  Write-Host "ERROR: app\layout.tsx not found. Extract ZIP into the Ventic Pro repo root." -ForegroundColor Red
  exit 1
}
if (!(Test-Path $preview)) {
  Write-Host "ERROR: public\social-preview.png not found." -ForegroundColor Red
  exit 1
}

$content = Get-Content -Raw -Encoding UTF8 $layout

$oldOg = @'
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "/",
    siteName: "Ventic Pro",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "اطلب خدمة التهوية والتركيب أونلاين وتابع طلبك حتى الإتمام والضمان.",
  },
'@

$newOg = @'
  openGraph: {
    type: "website",
    locale: "ar_EG",
    url: "/",
    siteName: "Ventic Pro",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "اطلب خدمة التهوية والتركيب أونلاين وتابع طلبك حتى الإتمام والضمان.",
    images: [
      {
        url: "/social-preview.png",
        width: 1200,
        height: 630,
        alt: "Ventic Pro - حلول التهوية والتركيب",
      },
    ],
  },
'@

$oldTw = @'
  twitter: {
    card: "summary_large_image",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "تهوية وتركيب للحمامات والمطابخ والهود مع متابعة وتوثيق كامل.",
  },
'@

$newTw = @'
  twitter: {
    card: "summary_large_image",
    title: "Ventic Pro | حلول التهوية والتركيب",
    description:
      "تهوية وتركيب للحمامات والمطابخ والهود مع متابعة وتوثيق كامل.",
    images: ["/social-preview.png"],
  },
'@

if ($content.Contains($oldOg)) {
  $content = $content.Replace($oldOg, $newOg)
} elseif (!$content.Contains('url: "/social-preview.png"')) {
  Write-Host "ERROR: Expected openGraph block not found. No changes written." -ForegroundColor Red
  exit 1
}

if ($content.Contains($oldTw)) {
  $content = $content.Replace($oldTw, $newTw)
} elseif (!$content.Contains('images: ["/social-preview.png"]')) {
  Write-Host "ERROR: Expected twitter block not found. No changes written." -ForegroundColor Red
  exit 1
}

Set-Content -Path $layout -Value $content -Encoding UTF8

# Remove dynamic image routes that are failing in production.
if (Test-Path $og) { Remove-Item $og -Force }
if (Test-Path $tw) { Remove-Item $tw -Force }

Write-Host ""
Write-Host "V20G applied successfully." -ForegroundColor Green
Write-Host "- Static social preview installed: /public/social-preview.png" -ForegroundColor Green
Write-Host "- Open Graph metadata points to static image" -ForegroundColor Green
Write-Host "- Twitter/X metadata points to static image" -ForegroundColor Green
Write-Host "- Removed failing dynamic OG/Twitter image routes" -ForegroundColor Green
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20G - fix social preview images"
