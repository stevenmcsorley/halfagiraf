// app/i18n.ts

import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import i18next from "i18next"; // renamed from i18n to i18next
import { initReactI18next } from "react-i18next";

// eslint-disable-next-line import/no-named-as-default-member
i18next
  .use(HttpBackend) // Loads translation files from your public folder
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes the i18next instance to react-i18next
  .init({
    fallbackLng: "en",
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    react: {
      useSuspense: false,
    },
  });

export default i18next;
