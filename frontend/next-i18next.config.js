/**
 * @type {import('next-i18next').UserConfig}
 */
module.exports = {
  // debug: process.env.NODE_ENV === 'development',
  i18n: {
    defaultLocale: "en",
    locales: ["zh", "en"],
    localeDetection: false,
  },
  /** To avoid issues when deploying to some paas (vercel...) */
  localePath:
    typeof window === "undefined"
      ? require("path").resolve("./public/locales")
      : "/locales",
  reloadOnPrerender: process.env.NODE_ENV === "development",
};
