// app/components/LanguageSwitcher.tsx

import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex space-x-1">
      <button
        onClick={() => changeLanguage("en")}
        className="btn btn-xs btn-outline"
      >
        English
      </button>
      <button
        onClick={() => changeLanguage("zh")}
        className="btn btn-xs btn-outline"
      >
        中文
      </button>
    </div>
  );
}
