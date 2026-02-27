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
    tab_profile: 'Profil',

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
    spin_result_share: 'Ulashish',
    spin_result_no_prize: 'Omad kelmadi, keyingi gal!',
    spin_fair_info: 'Provably Fair: HMAC-SHA256 bilan tekshiriladi',
    spin_odds_title: 'Yutuq ehtimolliklari',
    spin_odds_close: 'Yopish',
    spin_commit_btn: 'Spin tayyorlash',
    spin_prepare: 'Tayyorlanmoqda…',
    spin_streak: 'kun ketma-ket',
    spin_total_spins: 'Jami spinlar',
    spin_next_spin: 'Keyingi spin',
    spin_recent_wins: 'So\'nggi yutuqlar',
    spin_claim_code: 'Talab kodi',
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
    wallet_filter_all: 'Barchasi',
    wallet_filter_pending: 'Kutilmoqda',
    wallet_filter_claimed: 'Olingan',
    wallet_claim_code: 'Talab kodi',
    wallet_donate_reward: 'Xayriya qilish',
    wallet_donated: 'Xayriya qilindi',
    wallet_expiry_countdown: 'qoldi',
    wallet_won_count: 'Yutuqlar soni',
    wallet_claimed_count: 'Olinganlar',
    wallet_pull_to_refresh: 'Yangilash uchun tortib oling',

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
    charity_your_donation: 'Sizning xayriyangiz',
    charity_deadline: 'Muddat:',
    charity_closed: 'Yopilgan',
    charity_completed: 'Yakunlangan',
    charity_funded: 'moliyalashtirildi',
    charity_quick_amounts: 'Tez miqdorlar',
    charity_your_rank: 'Sizning reytingingiz',

    // Profile page
    profile_title: 'Profil',
    profile_spins: 'Spinlar',
    profile_total_wins: 'Jami yutuqlar',
    profile_submissions: 'Sharhlar',
    profile_referrals: 'Tavsiyalar',
    profile_referral_code: 'Tavsiya kodi',
    profile_referral_copy: 'Havolani nusxalash',
    profile_referral_copied: 'Nusxalandi!',
    profile_referral_link: 'Tavsiya havolasi',
    profile_invite_friends: 'Do\'stlarni taklif qilish',
    profile_spin_history: 'Spin tarixi',
    profile_no_history: 'Hali spin tarixi yo\'q',
    profile_language: 'Til',
    profile_bonus_spins: 'Bonus spinlar',
    profile_referral_info: 'Har bir do\'st uchun bonus spin oling',

    // Common
    loading: 'Yuklanmoqda…',
    error: 'Xato yuz berdi',
    retry: 'Qayta urinish',
    confirm: 'Tasdiqlash',
    cancel: 'Bekor qilish',
    copy_success: 'Nusxalandi!',
    share_link: 'Havolani ulashish',
  },
  ru: {
    tab_spin: 'Крутить',
    tab_wallet: 'Кошелёк',
    tab_charity: 'Благотворительность',
    tab_profile: 'Профиль',

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
    spin_result_share: 'Поделиться',
    spin_result_no_prize: 'Не повезло, попробуйте в следующий раз!',
    spin_fair_info: 'Provably Fair: проверяется через HMAC-SHA256',
    spin_odds_title: 'Шансы выигрыша',
    spin_odds_close: 'Закрыть',
    spin_commit_btn: 'Подготовить спин',
    spin_prepare: 'Подготовка…',
    spin_streak: 'дней подряд',
    spin_total_spins: 'Всего спинов',
    spin_next_spin: 'Следующий спин',
    spin_recent_wins: 'Последние выигрыши',
    spin_claim_code: 'Код получения',
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
    wallet_filter_all: 'Все',
    wallet_filter_pending: 'Ожидание',
    wallet_filter_claimed: 'Получено',
    wallet_claim_code: 'Код получения',
    wallet_donate_reward: 'Пожертвовать',
    wallet_donated: 'Пожертвовано',
    wallet_expiry_countdown: 'осталось',
    wallet_won_count: 'Выигрышей',
    wallet_claimed_count: 'Получено',
    wallet_pull_to_refresh: 'Потяните для обновления',

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
    charity_your_donation: 'Ваше пожертвование',
    charity_deadline: 'Срок:',
    charity_closed: 'Закрыта',
    charity_completed: 'Завершена',
    charity_funded: 'профинансировано',
    charity_quick_amounts: 'Быстрые суммы',
    charity_your_rank: 'Ваш рейтинг',

    profile_title: 'Профиль',
    profile_spins: 'Спины',
    profile_total_wins: 'Всего выигрышей',
    profile_submissions: 'Отзывы',
    profile_referrals: 'Рефералы',
    profile_referral_code: 'Реферальный код',
    profile_referral_copy: 'Скопировать ссылку',
    profile_referral_copied: 'Скопировано!',
    profile_referral_link: 'Реферальная ссылка',
    profile_invite_friends: 'Пригласить друзей',
    profile_spin_history: 'История спинов',
    profile_no_history: 'Истории спинов пока нет',
    profile_language: 'Язык',
    profile_bonus_spins: 'Бонусные спины',
    profile_referral_info: 'Получайте бонусный спин за каждого друга',

    loading: 'Загрузка…',
    error: 'Произошла ошибка',
    retry: 'Попробовать снова',
    confirm: 'Подтвердить',
    cancel: 'Отмена',
    copy_success: 'Скопировано!',
    share_link: 'Поделиться ссылкой',
  },
  en: {
    tab_spin: 'Spin',
    tab_wallet: 'Wallet',
    tab_charity: 'Charity',
    tab_profile: 'Profile',

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
    spin_result_share: 'Share',
    spin_result_no_prize: 'No luck this time — try again!',
    spin_fair_info: 'Provably Fair: verified via HMAC-SHA256',
    spin_odds_title: 'Prize odds',
    spin_odds_close: 'Close',
    spin_commit_btn: 'Prepare Spin',
    spin_prepare: 'Preparing…',
    spin_streak: 'day streak',
    spin_total_spins: 'Total spins',
    spin_next_spin: 'Next spin',
    spin_recent_wins: 'Recent wins',
    spin_claim_code: 'Claim code',
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
    wallet_filter_all: 'All',
    wallet_filter_pending: 'Pending',
    wallet_filter_claimed: 'Claimed',
    wallet_claim_code: 'Claim code',
    wallet_donate_reward: 'Donate',
    wallet_donated: 'Donated',
    wallet_expiry_countdown: 'remaining',
    wallet_won_count: 'Won',
    wallet_claimed_count: 'Claimed',
    wallet_pull_to_refresh: 'Pull to refresh',

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
    charity_your_donation: 'Your donation',
    charity_deadline: 'Deadline:',
    charity_closed: 'Closed',
    charity_completed: 'Completed',
    charity_funded: 'funded',
    charity_quick_amounts: 'Quick amounts',
    charity_your_rank: 'Your rank',

    profile_title: 'Profile',
    profile_spins: 'Spins',
    profile_total_wins: 'Total wins',
    profile_submissions: 'Reviews',
    profile_referrals: 'Referrals',
    profile_referral_code: 'Referral code',
    profile_referral_copy: 'Copy link',
    profile_referral_copied: 'Copied!',
    profile_referral_link: 'Referral link',
    profile_invite_friends: 'Invite friends',
    profile_spin_history: 'Spin history',
    profile_no_history: 'No spin history yet',
    profile_language: 'Language',
    profile_bonus_spins: 'Bonus spins',
    profile_referral_info: 'Earn a bonus spin for every friend you invite',

    loading: 'Loading…',
    error: 'An error occurred',
    retry: 'Try again',
    confirm: 'Confirm',
    cancel: 'Cancel',
    copy_success: 'Copied!',
    share_link: 'Share link',
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
  localStorage.setItem('uzumbot_lang', lang)
}

export function currentLang(): Lang {
  return _lang
}

// Initialize from localStorage override
const savedLang = localStorage.getItem('uzumbot_lang') as Lang | null
if (savedLang && ['uz', 'ru', 'en'].includes(savedLang)) {
  _lang = savedLang
}

// Helper: localized prize name
export function prizeName(prize: { name_uz?: string; name_ru?: string; name_en?: string }): string {
  if (_lang === 'ru' && prize.name_ru) return prize.name_ru
  if (_lang === 'en' && prize.name_en) return prize.name_en
  return prize.name_uz ?? prize.name_ru ?? prize.name_en ?? '—'
}
