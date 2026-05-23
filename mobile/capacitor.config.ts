import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.newcloud.app',
  appName: 'NewCloud',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: [
      '*'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false, // We will manually hide it inside capacitor-bridge.js
      backgroundColor: '#04020a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      backgroundColor: '#04020a',
      style: 'DARK'
    }
  }
};

export default config;
