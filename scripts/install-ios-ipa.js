const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('colors');

class IOSIPAInstaller {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.downloadsDir = path.join(require('os').homedir(), 'Downloads');
  }

  log(message, color = 'white') {
    console.log(message[color]);
  }

  async checkBuildStatus() {
    this.log('\n🔍 Checking iOS Build Status...', 'bright');
    
    try {
      const output = execSync('eas build:list --limit 1 --json', { encoding: 'utf8' });
      const builds = JSON.parse(output);
      
      if (builds.length === 0) {
        this.log('❌ No builds found', 'red');
        return null;
      }

      const latestBuild = builds[0];
      this.log(`📱 Latest Build:`, 'yellow');
      this.log(`   ID: ${latestBuild.id}`, 'white');
      this.log(`   Status: ${latestBuild.status}`, latestBuild.status === 'finished' ? 'green' : 'yellow');
      this.log(`   Platform: ${latestBuild.platform}`, 'white');
      this.log(`   Build Number: ${latestBuild.buildNumber}`, 'white');

      return latestBuild;
    } catch (error) {
      this.log(`❌ Error checking build status: ${error.message}`, 'red');
      return null;
    }
  }

  async listSimulators() {
    this.log('\n📱 Available iOS Simulators:', 'bright');
    
    try {
      const output = execSync('xcrun simctl list devices --json', { encoding: 'utf8' });
      const data = JSON.parse(output);
      
      const bootedDevices = [];
      const availableDevices = [];
      
      Object.keys(data.devices).forEach(runtime => {
        if (runtime.includes('iOS')) {
          data.devices[runtime].forEach(device => {
            if (device.state === 'Booted') {
              bootedDevices.push({ ...device, runtime });
            } else if (device.state === 'Shutdown') {
              availableDevices.push({ ...device, runtime });
            }
          });
        }
      });

      if (bootedDevices.length > 0) {
        this.log('\n✅ Booted Simulators:', 'green');
        bootedDevices.forEach(device => {
          this.log(`   📱 ${device.name} (${device.runtime}) - ${device.udid}`, 'white');
        });
      }

      if (availableDevices.length > 0) {
        this.log('\n📱 Available Simulators:', 'yellow');
        availableDevices.slice(0, 5).forEach(device => {
          this.log(`   📱 ${device.name} (${device.runtime}) - ${device.udid}`, 'white');
        });
      }

      return { bootedDevices, availableDevices };
    } catch (error) {
      this.log(`❌ Error listing simulators: ${error.message}`, 'red');
      return null;
    }
  }

  async bootSimulator(deviceId) {
    this.log(`\n🚀 Booting iOS Simulator: ${deviceId}...`, 'bright');
    
    try {
      execSync(`xcrun simctl boot ${deviceId}`, { stdio: 'inherit' });
      this.log('✅ Simulator booted successfully!', 'green');
      
      // Open Simulator app
      execSync('open -a Simulator', { stdio: 'inherit' });
      this.log('✅ Simulator app opened!', 'green');
      
      return true;
    } catch (error) {
      this.log(`❌ Error booting simulator: ${error.message}`, 'red');
      return false;
    }
  }

  async downloadIPA(buildId) {
    this.log(`\n📥 Downloading IPA for build ${buildId}...`, 'bright');
    
    try {
      // Create downloads directory if it doesn't exist
      if (!fs.existsSync(this.downloadsDir)) {
        fs.mkdirSync(this.downloadsDir, { recursive: true });
      }

      // Get build details first
      const buildDetails = execSync(`eas build:view ${buildId}`, { encoding: 'utf8' });
      
      // Extract download URL from build details
      const urlMatch = buildDetails.match(/Application Archive URL\s+(https:\/\/[^\s]+)/);
      if (!urlMatch) {
        this.log('❌ Could not find download URL in build details', 'red');
        return false;
      }

      const downloadUrl = urlMatch[1];
      const ipaPath = path.join(this.downloadsDir, `WeSplit-${buildId}.ipa`);

      this.log(`📥 Downloading from: ${downloadUrl}`, 'blue');
      
      // Download the IPA
      execSync(`curl -L -o "${ipaPath}" "${downloadUrl}"`, { stdio: 'inherit' });

      this.log('✅ IPA downloaded successfully!', 'green');
      this.log(`📁 Saved to: ${ipaPath}`, 'blue');
      
      return ipaPath;
    } catch (error) {
      this.log(`❌ Error downloading IPA: ${error.message}`, 'red');
      return false;
    }
  }

  async installIPA(ipaPath, deviceId) {
    this.log(`\n📱 Installing IPA on simulator: ${deviceId}...`, 'bright');
    
    try {
      // Install the IPA on the simulator
      execSync(`xcrun simctl install ${deviceId} "${ipaPath}"`, { stdio: 'inherit' });
      
      this.log('✅ IPA installed successfully!', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Error installing IPA: ${error.message}`, 'red');
      return false;
    }
  }

  async launchApp(deviceId) {
    this.log('\n🚀 Launching WeSplit app...', 'bright');
    
    try {
      execSync(`xcrun simctl launch ${deviceId} com.wesplit.app`, { stdio: 'inherit' });
      this.log('✅ App launched successfully!', 'green');
      return true;
    } catch (error) {
      this.log(`❌ Error launching app: ${error.message}`, 'red');
      return false;
    }
  }

  async startLogMonitoring(deviceId) {
    this.log('\n📊 Starting iOS log monitoring...', 'bright');
    this.log('💡 This will monitor the app logs in real-time', 'blue');
    this.log('⏹️  Press Ctrl+C to stop monitoring\n', 'yellow');

    const logcat = spawn('xcrun', [
      'simctl',
      'spawn',
      deviceId,
      'log',
      'stream',
      '--predicate', 'processImagePath CONTAINS "WeSplit"'
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    logcat.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    logcat.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    process.on('SIGINT', () => {
      this.log('\n⏹️  Stopping log monitoring...', 'yellow');
      logcat.kill();
      process.exit(0);
    });
  }

  async run() {
    this.log('🍎 WeSplit iOS IPA Installer', 'bright');
    this.log('This will help you download and install the latest iOS build\n', 'cyan');

    // Check build status
    const build = await this.checkBuildStatus();
    if (!build) {
      return;
    }

    if (build.platform !== 'ios') {
      this.log('❌ Latest build is not for iOS platform', 'red');
      return;
    }

    if (build.status !== 'finished') {
      this.log(`⏳ Build is still ${build.status}. Please wait for it to complete.`, 'yellow');
      this.log('💡 Run this script again once the build is finished.', 'blue');
      return;
    }

    // List simulators
    const simulators = await this.listSimulators();
    if (!simulators) {
      return;
    }

    // Use booted simulator or boot the first available one
    let targetDevice;
    if (simulators.bootedDevices.length > 0) {
      targetDevice = simulators.bootedDevices[0];
      this.log(`\n✅ Using booted simulator: ${targetDevice.name}`, 'green');
    } else if (simulators.availableDevices.length > 0) {
      targetDevice = simulators.availableDevices[0];
      this.log(`\n🚀 Booting simulator: ${targetDevice.name}`, 'yellow');
      const bootSuccess = await this.bootSimulator(targetDevice.udid);
      if (!bootSuccess) {
        return;
      }
    } else {
      this.log('❌ No iOS simulators available', 'red');
      return;
    }

    // Download IPA
    const ipaPath = await this.downloadIPA(build.id);
    if (!ipaPath) {
      return;
    }

    // Install IPA
    const installSuccess = await this.installIPA(ipaPath, targetDevice.udid);
    if (!installSuccess) {
      return;
    }

    // Launch app
    await this.launchApp(targetDevice.udid);

    // Start log monitoring
    this.log('\n🎉 iOS App Installation Complete!', 'green');
    this.log('📱 The app is now running on your iOS simulator', 'green');
    this.log('🔍 Starting log monitoring to help debug any issues...', 'blue');
    
    await this.startLogMonitoring(targetDevice.udid);
  }
}

if (require.main === module) {
  new IOSIPAInstaller().run();
}

module.exports = IOSIPAInstaller;
