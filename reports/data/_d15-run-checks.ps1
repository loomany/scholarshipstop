# D15 production technical checks — audit helper (not committed as product code)
$base = 'https://scholarshiptop.com'
$paths = @(
  @{ path='/resources/medical-scholarships-guide'; type='resource'; ctx='MedicalScholarshipPlanning|medical school|premed' },
  @{ path='/essays/career-goals'; type='essay'; ctx='career goals|CareerGoals' },
  @{ path='/essays/financial-need'; type='essay'; ctx='financial need|FinancialNeed' },
  @{ path='/resources/how-to-find-scholarships'; type='resource'; ctx='how to find|scholarship' },
  @{ path='/resources/best-scholarship-websites'; type='resource'; ctx='scholarship websites|Best scholarship' },
  @{ path='/resources/best-scholarships-texas-international-students'; type='resource'; ctx='Texas|international' },
  @{ path='/scholarships/texas'; type='scholarship_state'; ctx='Texas|affordability|StateSocial' },
  @{ path='/scholarships/california'; type='scholarship_state'; ctx='California|affordability' },
  @{ path='/scholarships/new-york'; type='scholarship_state'; ctx='New York|affordability' },
  @{ path='/scholarships/florida'; type='scholarship_state'; ctx='Florida|affordability' },
  @{ path='/scholarships/illinois'; type='scholarship_state'; ctx='Illinois|affordability' },
  @{ path='/scholarships/texas/tarleton-state-university'; type='scholarship_university'; ctx='Tarleton|University' },
  @{ path='/scholarships/california/california-state-university-northridge'; type='scholarship_university'; ctx='Northridge|CSUN|California State' },
  @{ path='/compare/states'; type='compare_hub'; ctx='Compare states|state comparison' },
  @{ path='/compare/universities'; type='compare_hub'; ctx='Compare universities|university comparison' },
  @{ path='/compare/states/california-vs-texas'; type='compare_detail'; ctx='California|Texas|affordability' },
  @{ path='/compare/universities/university-of-massachusetts-amherst-vs-university-of-south-florida'; type='compare_detail'; ctx='Massachusetts|Florida|Compare' },
  @{ path='/providers/loyola-university-chicago'; type='provider'; ctx='Loyola|Chicago|provider' },
  @{ path='/providers/alamo-colleges-foundation'; type='provider'; ctx='Alamo|Foundation|provider' }
)

function Get-MetaContent($html, $name) {
  if ($html -match "(?is)<meta\s+name=[`"']$name[`"']\s+content=[`"']([^`"']*)[`"']") { return $Matches[1].Trim() }
  if ($html -match "(?is)<meta\s+content=[`"']([^`"']*)[`"']\s+name=[`"']$name[`"']") { return $Matches[1].Trim() }
  return ''
}

function Get-Canonical($html) {
  if ($html -match '(?is)<link\s+rel=[`"']canonical[`"']\s+href=[`"']([^`"']*)[`"']') { return $Matches[1].Trim() }
  if ($html -match '(?is)<link\s+href=[`"']([^`"']*)[`"']\s+rel=[`"']canonical[`"']') { return $Matches[1].Trim() }
  return ''
}

function Get-Title($html) {
  if ($html -match '(?is)<title[^>]*>([^<]+)</title>') { return ($Matches[1] -replace '\s+',' ').Trim() }
  return ''
}

$rows = @()
foreach ($item in $paths) {
  $url = "$base$($item.path)"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $status = 0
  $html = ''
  $err = ''
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 90 -MaximumRedirection 5
    $status = [int]$resp.StatusCode
    $html = $resp.Content
  } catch {
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode.value__ }
    $err = $_.Exception.Message
  }
  $sw.Stop()
  $canonical = if ($html) { Get-Canonical $html } else { '' }
  $robots = if ($html) { Get-MetaContent $html 'robots' } else { '' }
  $title = if ($html) { Get-Title $html } else { '' }
  $desc = if ($html) { Get-MetaContent $html 'description' } else { '' }
  $jsonld = if ($html) { ([regex]::Matches($html, 'application/ld\+json')).Count } else { 0 }
  $badTokens = @()
  foreach ($tok in @('undefined','null','NaN','[object Object]')) {
    if ($html -and $html -match [regex]::Escape($tok)) { $badTokens += $tok }
  }
  $ctxOk = $false
  if ($html -and $item.ctx) {
    foreach ($part in ($item.ctx -split '\|')) {
      if ($html -match $part) { $ctxOk = $true; break }
    }
  }
  $sizeKb = if ($html) { [math]::Round($html.Length / 1024, 1) } else { 0 }
  $rows += [pscustomobject]@{
    url = $url
    path = $item.path
    page_type = $item.type
    http_status = $status
    response_ms = $sw.ElapsedMilliseconds
    html_size_kb = $sizeKb
    canonical = $canonical
    robots_meta = $robots
    title = ($title -replace '"','""')
    meta_description_present = if ($desc.Length -gt 10) { 'yes' } else { 'no' }
    jsonld_count = $jsonld
    context_visible = if ($ctxOk) { 'yes' } else { 'no' }
    bad_tokens = ($badTokens -join ';')
    error = ($err -replace '"','""')
  }
  Write-Host "$($item.path) -> $status ${sizeKb}KB ${jsonld}jsonld robots=$robots"
}

$outCsv = Join-Path $PSScriptRoot 'd15-production-technical-checks.csv'
$rows | Export-Csv -Path $outCsv -NoTypeInformation -Encoding UTF8
Write-Host "Wrote $outCsv ($($rows.Count) rows)"
