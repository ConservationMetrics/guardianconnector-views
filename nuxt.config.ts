import { NuxtConfig } from "@nuxt/types";

const authStrategy: string =
  process.env.NUXT_ENV_AUTH_STRATEGY?.replace(/['"]+/g, "") || "none";
const auth0Domain: string =
  process.env.NUXT_ENV_AUTH0_DOMAIN?.replace(/['"]+/g, "") || "";
const auth0ClientId: string =
  process.env.NUXT_ENV_AUTH0_CLIENT_ID?.replace(/['"]+/g, "") || "";
const auth0Audience: string =
  process.env.NUXT_ENV_AUTH0_AUDIENCE?.replace(/['"]+/g, "") || "";

const config: NuxtConfig = {
  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: "GuardianConnector Views",
    script: [{ src: "/lightbox/lightbox-plus-jquery.js", body: true }],
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { hid: "description", name: "description", content: "" },
      { name: "format-detection", content: "telephone=no" },
    ],
    link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: ["mapbox-gl/dist/mapbox-gl.css", "static/lightbox/lightbox.min.css"],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/typescript
    "@nuxt/typescript-build",
    "nuxt-windicss",
    ["@nuxtjs/dotenv", { path: "./" }],
    "@nuxtjs/auth-next",
  ],

  serverMiddleware: [{ path: "/api", handler: "~/api/index.ts" }],

  router: {
    middleware: ["authMiddleware"],
  },

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: ["@nuxtjs/axios", "@nuxtjs/i18n"],

  auth: {
    strategies: {
      none: {
        scheme: "local",
        tokenRequired: false,
        tokenType: false,
      },
      auth0: {
        scheme: "~src/runtimeConfigurableScheme.ts",
      },
      password: {
        scheme: "local",
        token: {
          property: "token",
          required: true,
          type: "Bearer",
          maxAge: 1800,
        },
        endpoints: {
          login: { url: "/api/login", method: "post", propertyName: "token" },
          logout: false,
          user: false,
        },
      },
    },
  },

  axios:
    process.env.NODE_ENV === "development"
      ? {}
      : {
          baseURL: "http://127.0.0.1:8080",
          browserBaseURL: "/",
        },

  publicRuntimeConfig: {
    auth: {
      strategies: {
        auth0: {
          domain: auth0Domain,
          clientId: auth0ClientId,
          endpoints: {
            authorization: `https://${auth0Domain}/authorize`,
          },
          ...(auth0Audience !== "" ? { auth0Audience } : {}),
        },
      },
    },
    apiKey: process.env.VUE_APP_API_KEY,
    authStrategy,
  },

  i18n: {
    locales: [
      { code: "en", name: "English", iso: "en-US", file: "en.json" },
      { code: "es", name: "Español", iso: "es-ES", file: "es.json" },
      { code: "pt", name: "Português", iso: "pt-PT", file: "pt.json" },
      { code: "nl", name: "Nederlands", iso: "nl-NL", file: "nl.json" },
    ],
    defaultLocale: "en",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      alwaysRedirect: true,
      fallbackLocale: "en",
      redirectOn: "all",
    },
    lazy: true,
    langDir: "lang/",
    strategy: "no_prefix",
    vueI18n: {
      fallbackLocale: "en",
      silentTranslationWarn: true,
      silentFallbackWarn: true,
    },
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    transpile: [
      (context) => (context.isLegacy ? "axios" : undefined),
      "defu",
      "chart.js",
      "vue-chartjs",
    ],
  },

  server: {},
};

export default config;
