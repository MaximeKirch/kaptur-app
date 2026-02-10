const { withNativeWind } = require("nativewind/metro");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// "global.css" est le fichier où tu mets tes directives Tailwind (voir étape suivante)
module.exports = withNativeWind(config, { input: "./global.css" });