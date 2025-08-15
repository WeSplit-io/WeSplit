#!/bin/bash

echo "🧹 Starting comprehensive iOS cleanup for Expo SDK 53..."

# Stop any running processes
echo "🛑 Stopping any running processes..."
pkill -f "expo" || true
pkill -f "metro" || true
pkill -f "react-native" || true

# Clean CocoaPods cache and artifacts
echo "📦 Cleaning CocoaPods..."
cd ios
rm -rf Pods Podfile.lock build DerivedData
pod cache clean --all

# Clean Xcode derived data
echo "🧹 Cleaning Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean Metro and Expo caches
echo "🚇 Cleaning Metro and Expo caches..."
cd ..
npx expo start --clear
rm -rf node_modules/.cache
rm -rf .expo

# Clean npm cache
echo "📦 Cleaning npm cache..."
npm cache clean --force

# Reinstall node_modules
echo "📦 Reinstalling node_modules..."
rm -rf node_modules package-lock.json
npm install

# Clean and reinstall pods
echo "📦 Reinstalling CocoaPods with clean state..."
cd ios
pod install --repo-update

echo "✅ iOS cleanup completed!"
echo "🚀 Ready to build with: npx expo run:ios" 