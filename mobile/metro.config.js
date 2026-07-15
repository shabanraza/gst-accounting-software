const { getDefaultConfig } = require('expo/metro-config')
const { withNativewind } = require('nativewind/metro')
const path = require('node:path')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

config.watchFolders = [path.resolve(__dirname, '..')]

module.exports = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
})
