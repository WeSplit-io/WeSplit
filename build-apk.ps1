# WeSplit APK Build Script
# This script builds the APK locally and creates a downloadable version

Write-Host "🚀 Starting WeSplit APK Build..." -ForegroundColor Green

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
cd android
./gradlew clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Clean failed!" -ForegroundColor Red
    exit 1
}

# Build the APK
Write-Host "🔨 Building APK..." -ForegroundColor Yellow
./gradlew assembleRelease
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Go back to project root
cd ..

# Copy APK to root with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$apkName = "WeSplit-Development-$timestamp.apk"
Copy-Item "android\app\build\outputs\apk\release\app-release.apk" $apkName

Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host "📱 APK created: $apkName" -ForegroundColor Cyan
Write-Host "📏 File size: $((Get-Item $apkName).Length / 1MB) MB" -ForegroundColor Cyan

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Transfer $apkName to your Android device" -ForegroundColor White
Write-Host "2. Enable 'Unknown Sources' in Android settings" -ForegroundColor White
Write-Host "3. Install the APK on your device" -ForegroundColor White
Write-Host "4. Test the app functionality" -ForegroundColor White 