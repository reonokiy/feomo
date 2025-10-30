import i18n, { FallbackLng, FallbackLngObjList } from "i18next";
import { orderBy } from "lodash-es";
import { initReactI18next } from "react-i18next";
// Import all locale files statically for Metro bundler compatibility
import ar from "./locales/ar.json";
import cs from "./locales/cs.json";
import de from "./locales/de.json";
import enGB from "./locales/en-GB.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fa from "./locales/fa.json";
import fr from "./locales/fr.json";
import hi from "./locales/hi.json";
import hr from "./locales/hr.json";
import hu from "./locales/hu.json";
import id from "./locales/id.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import kaGE from "./locales/ka-GE.json";
import ko from "./locales/ko.json";
import mr from "./locales/mr.json";
import nb from "./locales/nb.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import ptBR from "./locales/pt-BR.json";
import ptPT from "./locales/pt-PT.json";
import ru from "./locales/ru.json";
import sl from "./locales/sl.json";
import sv from "./locales/sv.json";
import th from "./locales/th.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";
import vi from "./locales/vi.json";
import zhHans from "./locales/zh-Hans.json";
import zhHant from "./locales/zh-Hant.json";
import { findNearestMatchedLanguage } from "./utils/i18n";

export const locales = orderBy([
  "ar",
  "cs",
  "de",
  "en",
  "en-GB",
  "es",
  "fa",
  "fr",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "ka-GE",
  "ko",
  "mr",
  "nb",
  "nl",
  "pl",
  "pt-PT",
  "pt-BR",
  "ru",
  "sl",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh-Hans",
  "zh-Hant",
]);

const fallbacks = {
  "zh-HK": ["zh-Hant", "en"],
  "zh-TW": ["zh-Hant", "en"],
  zh: ["zh-Hans", "en"],
} as FallbackLngObjList;

// Map locale keys to imported translation objects
const localeMap: Record<string, Record<string, unknown>> = {
  ar,
  cs,
  de,
  en,
  "en-GB": enGB,
  es,
  fa,
  fr,
  hi,
  hr,
  hu,
  id,
  it,
  ja,
  "ka-GE": kaGE,
  ko,
  mr,
  nb,
  nl,
  pl,
  "pt-PT": ptPT,
  "pt-BR": ptBR,
  ru,
  sl,
  sv,
  th,
  tr,
  uk,
  vi,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
};

const resources = locales.reduce<Record<string, { translation: Record<string, unknown> }>>((acc, locale) => {
  acc[locale] = { translation: localeMap[locale] || {} };
  return acc;
}, {});

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: {
    ...fallbacks,
    ...{ default: ["en"] },
  } as FallbackLng,
});

export default i18n;
export type TLocale = (typeof locales)[number];
