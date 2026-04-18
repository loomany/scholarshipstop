$ErrorActionPreference = 'Stop'

function Run-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  Write-Host ""
  Write-Host "==> $Name"
  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Name"
  }
}

Run-Step "Enqueue university compare pages" "npm run seo:enqueue-university-compare"
Run-Step "Enqueue state compare pages" "npm run seo:enqueue-state-compare"
Run-Step "Refresh university compare sources" "npm run seo:refresh-university-compare-sources"
Run-Step "Generate SEO pages batch" "npm run seo:worker-generate -- --limit=175"
Run-Step "Flush Google indexing queue" "npm run cron:google-indexing-flush"
Run-Step "Run SEO page inspection" "npm run cron:seo-page-inspection"

Write-Host ""
Write-Host "SEO batch completed successfully."
