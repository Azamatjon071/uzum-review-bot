import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Minimal translation resources
const resources = {
  en: {
    translation: {
      "welcome": "Welcome to UzumBot Admin",
      "dashboard": "Dashboard",
      "submissions": "Submissions",
      "users": "Users",
      "prizes": "Prizes",
      "settings": "Settings",
      "logout": "Logout"
    }
  },
  ru: {
    translation: {
      "welcome": "Добро пожаловать в админку UzumBot",
      "dashboard": "Дашборд",
      "submissions": "Заявки",
      "users": "Пользователи",
      "prizes": "Призы",
      "settings": "Настройки",
      "logout": "Выйти"
    }
  },
  uz: {
    translation: {
      "welcome": "UzumBot admin paneliga xush kelibsiz",
      "dashboard": "Boshqaruv paneli",
      "submissions": "Arizalar",
      "users": "Foydalanuvchilar",
      "prizes": "Sovg'alar",
      "settings": "Sozlamalar",
      "logout": "Chiqish"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "ru", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
