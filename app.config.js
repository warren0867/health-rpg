module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  },
});
