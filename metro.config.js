const { withNativeWind } = require("nativewind/metro");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// "global.css" est le fichier où tu mets tes directives Tailwind (voir étape suivante)
module.exports = withNativeWind(config, { input: "./global.css" });