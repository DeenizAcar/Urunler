#!/usr/bin/env bash
# APK derleme: bash scripts/build-apk.sh  -> release/Urunler.apk
set -e
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME_ANDROID:-/c/Program Files/Android/Android Studio/jbr}"
export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
npx cap sync android
(cd android && ./gradlew assembleRelease --no-daemon -q)
mkdir -p release
cp android/app/build/outputs/apk/release/app-release.apk release/Urunler.apk
ls -la release/Urunler.apk
