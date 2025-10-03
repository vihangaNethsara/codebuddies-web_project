# MongoDB Cleanup Script for PowerShell
# Run this while Meteor is running

Write-Host "=== MongoDB Database Cleanup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Remove records with null userId and studyGroupId"
Write-Host "  2. Drop the problematic unique index"
Write-Host ""

# Get the MongoDB connection URL
Write-Host "Getting MongoDB connection URL..." -ForegroundColor Green
$mongoUrl = meteor mongo --url

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Could not get MongoDB URL. Make sure Meteor is running!" -ForegroundColor Red
    Write-Host "Start Meteor with: meteor run --settings settings-development.json" -ForegroundColor Yellow
    exit 1
}

Write-Host "MongoDB URL: $mongoUrl" -ForegroundColor Gray
Write-Host ""

# Check if mongo command exists
$mongoCmd = Get-Command mongo -ErrorAction SilentlyContinue
if (-not $mongoCmd) {
    Write-Host "Error: 'mongo' command not found!" -ForegroundColor Red
    Write-Host "Please install MongoDB shell or use MongoDB Compass GUI" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Use 'meteor reset' to reset the entire database (WARNING: deletes all data)" -ForegroundColor Yellow
    exit 1
}

# Create temporary MongoDB script
$mongoScript = @"
// Remove null records
var result = db.app_stats.remove({ userId: null, studyGroupId: null });
print('Removed ' + result.nRemoved + ' null records from app_stats');

// Count remaining records
var count = db.app_stats.count();
print('Remaining records in app_stats: ' + count);

// Try to drop the problematic index
try {
    db.app_stats.dropIndex('userId_1_studyGroupId_1');
    print('Successfully dropped problematic index: userId_1_studyGroupId_1');
} catch (e) {
    print('Index userId_1_studyGroupId_1 does not exist (this is OK)');
}

// List current indexes
print('');
print('Current indexes on app_stats:');
db.app_stats.getIndexes().forEach(function(idx) {
    print('  - ' + idx.name + ': ' + JSON.stringify(idx.key));
});
"@

# Save script to temp file
$tempScript = Join-Path $env:TEMP "meteor-cleanup-$(Get-Random).js"
$mongoScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "Running cleanup commands..." -ForegroundColor Green
Write-Host ""

# Execute MongoDB script
mongo $mongoUrl $tempScript

# Clean up temp file
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Cleanup Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Stop Meteor (Ctrl+C in the Meteor terminal)"
Write-Host "  2. Restart: meteor run --settings settings-development.json"
Write-Host "  3. Test premium group page"
Write-Host ""
