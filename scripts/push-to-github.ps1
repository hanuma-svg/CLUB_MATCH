# Push ClubMatch to GitHub (hanuma-svg / DBMS-Mini-project)
param(
  [string]$RepoName = "DBMS-Mini-project",
  [string]$GitHubUser = "hanuma-svg",
  [string]$Token = ""
)

Write-Host "=========================================================="
Write-Host " PUSHING CLUBMATCH TO GITHUB"
Write-Host " Identity: $GitHubUser (hanumanthayash180@gmail.com)"
Write-Host " Target:   https://github.com/$GitHubUser/$RepoName"
Write-Host "=========================================================="
Write-Host ""

if ($Token) {
  Write-Host "Creating repository '$RepoName' via GitHub API..."
  $headers = @{
    "Authorization" = "Bearer $Token"
    "Accept" = "application/vnd.github.v3+json"
    "User-Agent" = "ClubMatch-Deployer"
  }
  $body = @{
    name = $RepoName
    description = "ClubMatch - Smart College Club & Event Recommendation Platform (DBMS Level 3 Project)"
    private = $false
  } | ConvertTo-Json

  try {
    $res = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    Write-Host "Repository created successfully at: $($res.html_url)"
  } catch {
    Write-Host "Note: Repository might already exist or API returned: $($_.Exception.Message)"
  }

  $remoteUrl = "https://$($GitHubUser):$($Token)@github.com/$($GitHubUser)/$($RepoName).git"
  git remote set-url origin $remoteUrl
} else {
  Write-Host "Step 1: If you haven't created the repository yet on GitHub:"
  Write-Host "  -> Open this direct link in browser:"
  Write-Host "  https://github.com/new?name=$RepoName"
  Write-Host ""
  Write-Host "  (Leave 'Add a README file', '.gitignore', and 'license' UNCHECKED)"
  Write-Host ""
}

Write-Host "Step 2: Pushing commits to GitHub as $GitHubUser..."
git push -u origin main

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "=========================================================="
  Write-Host " SUCCESS! Code pushed to: https://github.com/$GitHubUser/$RepoName"
  Write-Host " Committed by: $GitHubUser <hanumanthayash180@gmail.com>"
  Write-Host "=========================================================="
}
