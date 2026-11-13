import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Change appId before the first App Store Connect upload if you own a domain.
  appId: 'io.github.hauchiehlinops.omniseam3d',
  appName: 'OmniSeam 3D',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#090D16',
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#090D16',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#090D16',
      overlaysWebView: true,
    },
  },
};

export default config;
