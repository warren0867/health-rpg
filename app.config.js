import appJson from './app.json';

export default ({ config }) => {
  return {
    ...appJson.expo,
    extra: {
      anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
    },
  };
};
