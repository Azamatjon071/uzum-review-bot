/**
 * i18n strings for the Telegram Mini App.
 * Supports: uz (Uzbek), ru (Russian), en (English)
 */

type Lang = 'uz' | 'ru' | 'en'

const strings = {
  uz: {
    // Tab labels
    tab_spin: 'Aylantirish',
    tab_wallet: 'Hamyon',
    tab_charity: 'Xayriya',

    // Spin page
    spin_title: 'G\'ildirakni aylantiring!',
    spin_subtitle: 'Sharhingiz uchun sovg\'a yutib oling',
    spin_button: 'Aylantirish',
    spin_no_spins: 'Hali aylantirishingiz yo\'q',
    spin_no_spins_sub: 'Mahsulot sharhi yuboring va sovg\'a yutib oling!',
    spin_loading: 'Yuklanmoqda…',
    spin_available: 'Mavjud aylantirishlar',
    spin_result_title: 'Tabriklaymiz!',
    spin_result_subtitle: 'Siz yutib oldingiz:',
    spin_result_close: 'Yopish',
    spin_result_no_prize: 'Omad kelmadi, keyingi gal!',
    spin_fair_info: 'Provably Fair: HMAC-SHA256 bilan tekshiriladi',
    spin_odds_title: 'Yutuq ehtimolliklari',
    spin_odds_close: 'Yopish',
    prize_type_cashback: 'Keshbek',
    prize_type_discount: 'Chegirma',
    prize_type_gift_card: 'Sovg\'a kartasi',
    prize_type_physical: 'Jismoniy sovg\'a',
    prize_type_spin_again: 'Qayta aylantirish',
    prize_type_charity_points: 'Xayriya ballari',
    prize_type_no_prize: 'Yutish yo\'q',

    // Wallet page
    wallet_title: 'Hamyon',
    wallet_balance: 'Balans',
    wallet_total_won: 'Jami yutilgan',
    wallet_history: 'Tarix',
    wallet_empty: 'Hali yutuqlar yo\'q',
    wallet_reward_expires: 'Muddati:',
    wallet_status_pending: 'Kutilmoqda',
    wallet_status_claimed: 'Olingan',
    wallet_status_expired: 'Muddati o\'tgan',

    // Charity page
    charity_title: 'Xayriya',
    charity_subtitle: 'Ezgulik qilish — baraka keltiradi',
    charity_donate_btn: 'Xayriya qilish',
    charity_donated: 'Xayriya qilindi',
    charity_goal: 'Maqsad',
    charity_raised: 'Yig\'ildi',
    charity_donors: 'Xayriyachilar',
    charity_no_campaigns: 'Hozircha kampaniyalar yo\'q',
    charity_sadaqa_title: 'Sadaqa',
    charity_sadaqa_desc: 'Ixtiyoriy xayriya — ixtiyoriy miqdorda',
    charity_sadaqa_placeholder: 'Miqdor (UZS)',
    charity_sadaqa_btn: 'Sadaqa berish',
    charity_success: 'Xayriya qilindi! Barkalla!',
    charity_error: 'Xato yuz berdi',
    charity_leaderboard: 'Eng ko\'p xayriyachilar',

    // Common
    loading: 'Yuklanmoqda…',
    error: 'Xato yuz berdi',
    retry: 'Qayta urinish',
    confirm: 'Tasdiqlash',
    cancel: 'Bekor qilish',
  },
  ru: {
    tab_spin: 'Крутить',
    tab_wallet: 'Кошелёк',
    tab_charity: 'Благотворительность',

    spin_title: 'Крутите колесо!',
    spin_subtitle: 'Выиграйте приз за ваш отзыв',
    spin_button: 'Крутить',
    spin_no_spins: 'Нет доступных прокруток',
    spin_no_spins_sub: 'Отправьте отзыв на товар и получите приз!',
    spin_loading: 'Загрузка…',
    spin_available: 'Доступные прокрутки',
    spin_result_title: 'Поздравляем!',
    spin_result_subtitle: 'Вы выиграли:',
    spin_result_close: 'Закрыть',
    spin_result_no_prize: 'Не повезло, попробуйте в следующий раз!',
    spin_fair_info: 'Provably Fair: проверяется через HMAC-SHA256',
    spin_odds_title: 'Шансы выигрыша',
    spin_odds_close: 'Закрыть',
    prize_type_cashback: 'Кэшбэк',
    prize_type_discount: 'Скидка',
    prize_type_gift_card: 'Подарочная карта',
    prize_type_physical: 'Физический приз',
    prize_type_spin_again: 'Ещё одна прокрутка',
    prize_type_charity_points: 'Благотворительные баллы',
    prize_type_no_prize: 'Без приза',

    wallet_title: 'Кошелёк',
    wallet_balance: 'Баланс',
    wallet_total_won: 'Всего выиграно',
    wallet_history: 'История',
    wallet_empty: 'Пока нет выигрышей',
    wallet_reward_expires: 'Истекает:',
    wallet_status_pending: 'Ожидание',
    wallet_status_claimed: 'Получено',
    wallet_status_expired: 'Истёкло',

    charity_title: 'Благотворительность',
    charity_subtitle: 'Делать добро — приносить баракат',
    charity_donate_btn: 'Пожертвовать',
    charity_donated: 'Пожертвовано',
    charity_goal: 'Цель',
    charity_raised: 'Собрано',
    charity_donors: 'Доноры',
    charity_no_campaigns: 'Пока нет кампаний',
    charity_sadaqa_title: 'Садака',
    charity_sadaqa_desc: 'Добровольное пожертвование — на любую сумму',
    charity_sadaqa_placeholder: 'Сумма (UZS)',
    charity_sadaqa_btn: 'Пожертвовать',
    charity_success: 'Пожертвование сделано! Баракалла!',
    charity_error: 'Произошла ошибка',
    charity_leaderboard: 'Топ жертвователей',

    loading: 'Загрузка…',
    error: 'Произошла ошибка',
    retry: 'Попробовать снова',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
  },
  en: {
    tab_spin: 'Spin',
    tab_wallet: 'Wallet',
    tab_charity: 'Charity',

    spin_title: 'Spin the wheel!',
    spin_subtitle: 'Win a prize for your honest review',
    spin_button: 'Spin',
    spin_no_spins: 'No spins available',
    spin_no_spins_sub: 'Submit a product review to earn a spin!',
    spin_loading: 'Loading…',
    spin_available: 'Available spins',
    spin_result_title: 'Congratulations!',
    spin_result_subtitle: 'You won:',
    spin_result_close: 'Close',
    spin_result_no_prize: 'No luck this time — try again!',
    spin_fair_info: 'Provably Fair: verified via HMAC-SHA256',
    spin_odds_title: 'Prize odds',
    spin_odds_close: 'Close',
    prize_type_cashback: 'Cashback',
    prize_type_discount: 'Discount',
    prize_type_gift_card: 'Gift card',
    prize_type_physical: 'Physical prize',
    prize_type_spin_again: 'Spin again',
    prize_type_charity_points: 'Charity points',
    prize_type_no_prize: 'No prize',

    wallet_title: 'Wallet',
    wallet_balance: 'Balance',
    wallet_total_won: 'Total won',
    wallet_history: 'History',
    wallet_empty: 'No rewards yet',
    wallet_reward_expires: 'Expires:',
    wallet_status_pending: 'Pending',
    wallet_status_claimed: 'Claimed',
    wallet_status_expired: 'Expired',

    charity_title: 'Charity',
    charity_subtitle: 'Doing good brings barakah',
    charity_donate_btn: 'Donate',
    charity_donated: 'Donated',
    charity_goal: 'Goal',
    charity_raised: 'Raised',
    charity_donors: 'Donors',
    charity_no_campaigns: 'No campaigns yet',
    charity_sadaqa_title: 'Sadaqa',
    charity_sadaqa_desc: 'Voluntary charity — any amount',
    charity_sadaqa_placeholder: 'Amount (UZS)',
    charity_sadaqa_btn: 'Give sadaqa',
    charity_success: 'Donated! Barakallah!',
    charity_error: 'An error occurred',
    charity_leaderboard: 'Top donors',

    loading: 'Loading…',
    error: 'An error occurred',
    retry: 'Try again',
    confirm: 'Confirm',
    cancel: 'Cancel',
  },
} as const

export type StringKey = keyof typeof strings['en']

export function getLang(): Lang {
  // Prefer Telegram language, fall back to browser, then 'uz'
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code
  if (tgLang?.startsWith('ru')) return 'ru'
  if (tgLang?.startsWith('en')) return 'en'
  const browserLang = navigator.language?.toLowerCase()
  if (browserLang?.startsWith('ru')) return 'ru'
  if (browserLang?.startsWith('en')) return 'en'
  return 'uz'
}

let _lang: Lang = getLang()

export function t(key: StringKey): string {
  return (strings[_lang] as Record<string, string>)[key] ?? (strings['en'] as Record<string, string>)[key] ?? key
}

export function setLang(lang: Lang) {
  _lang = lang
}

export function currentLang(): Lang {
  return _lang
}

// Helper: localized prize name
export function prizeName(prize: { name_uz?: string; name_ru?: string; name_en?: string }): string {
  if (_lang === 'ru' && prize.name_ru) return prize.name_ru
  if (_lang === 'en' && prize.name_en) return prize.name_en
  return prize.name_uz ?? prize.name_ru ?? prize.name_en ?? '—'
}
