// lessons.js — раздел «Планы уроков» / "Lesson plans" в учительском кабинете.
// Каталог готовых уроков (S&S ОГЭ/ЕГЭ Lab) по темам + блок «Эта неделя» (по активной
// теме тренажёра). Урок открывается в полноэкранном iframe БЕЗ возврата в общее меню
// (только закрыть ✕) — библиотека не «утекает». Язык UI = язык экзамена (ЕГЭ — англ.).
import { el, mount } from '../js/ui.js';
import { EXAM } from '../js/exam.js';
import { getActiveTheme } from '../js/vocab_srs.js';
import { TOKENS } from './lesson_tokens.js';

const EN = EXAM.lang === 'en';
// Уроки раздаёт воркер ss-lessons ТОЛЬКО учителям (настоящий paywall): доступ по
// подписанному токену (получен при входе по учительскому паролю, лежит в localStorage).
const LESSONS_WORKER = 'https://ss-lessons.o-sintsova.workers.dev';
const teacherTok = () => { try { return localStorage.getItem('ss_teacher_tok') || ''; } catch (e) { return ''; } };

// 12 тем курса: slug папки + имена (ru/en) + возможные ключи активной темы тренажёра
const THEMES = [
  { slug: 'family-friends',      ru: 'Семья и друзья',       en: 'Friends & family',     keys: ['family_friends'] },
  { slug: 'education-school',    ru: 'Образование и школа',  en: 'Education & school',   keys: ['school'] },
  { slug: 'food-eating',         ru: 'Еда',                  en: 'Food & eating',        keys: ['food'] },
  { slug: 'health-sport',        ru: 'Здоровье и спорт',     en: 'Health & sport',       keys: ['health_sport'] },
  { slug: 'hobbies-free-time',   ru: 'Хобби и досуг',        en: 'Hobbies & free time',  keys: ['hobbies_leisure', 'hobbies'] },
  { slug: 'science-technology',  ru: 'Наука и технологии',   en: 'Science & technology', keys: ['technology', 'science_history', 'science'] },
  { slug: 'mass-media',          ru: 'СМИ',                  en: 'Mass media',           keys: ['media', 'mass_media'] },
  { slug: 'nature-ecology',      ru: 'Природа и экология',   en: 'Nature & ecology',     keys: ['nature_ecology', 'nature'] },
  { slug: 'travelling',          ru: 'Путешествия',          en: 'Travelling',           keys: ['travelling', 'travel'] },
  { slug: 'work-professions',    ru: 'Работа и профессии',   en: 'Work & professions',   keys: ['career', 'work', 'professions'] },
  { slug: 'books-films',         ru: 'Книги и фильмы',       en: 'Books & films',        keys: ['books_films'] },
  { slug: 'holidays-traditions', ru: 'Праздники и традиции', en: 'Holidays & traditions',keys: ['holidays_traditions'] },
];
const LBL = EN
  ? ['Lesson 1 · Vocabulary · Reading · Listening', 'Lesson 2 · Grammar · Writing', 'Lesson 3 · Speaking']
  : ['Урок 1 · Лексика · Чтение · Аудио', 'Урок 2 · Грамматика · Письмо', 'Урок 3 · Говорение'];
const TX = EN ? {
  title: '📚 Lesson plans',
  sub: 'S&S ЕГЭ Lab · interactive 90-min lessons on real FIPI tasks',
  week: 'This week — ', all: 'All topics', close: '✕ Close',
  note: 'Lessons open here, in the cabinet. A single-lesson link can be opened on a big screen.',
} : {
  title: '📚 Планы уроков',
  sub: 'S&S ОГЭ Lab · интерактивные уроки 90 мин на реальном ФИПИ',
  week: 'Эта неделя — ', all: 'Все темы', close: '✕ Закрыть',
  note: 'Уроки открываются здесь, в кабинете. Ссылку на отдельный урок можно открыть на большом экране.',
};
const nameOf = (th) => (EN ? th.en : th.ru);

export function renderLessons(container, opts) {
  const examId = EXAM.id === 'ege' ? 'ege' : 'oge';
  const base = '/lessons-' + examId + '/';                 // /lessons-oge/ или /lessons-ege/
  let active; try { active = getActiveTheme(); } catch { active = null; }
  const weekTheme = active ? THEMES.find((th) => th.keys.includes(active)) : null;

  function openLesson(theme, n) {
    const tok = ((TOKENS[examId] || {})[theme.slug] || [])[n - 1];
    // адрес урока за воркером + подписанный учительский токен; без него воркер отдаёт «замок»
    const url = LESSONS_WORKER + '/l/' + tok + '?exam=' + examId + '&t=' + encodeURIComponent(teacherTok());
    const frame = el('iframe', { src: url, style: { flex: '1', width: '100%', border: '0' } });
    let ov;
    const btnStyle = { font: '700 13px sans-serif', border: '0', borderRadius: '8px', padding: '6px 12px', background: 'rgba(255,255,255,.18)', color: '#fff', cursor: 'pointer', flex: 'none' };
    const copyBtn = el('button', {
      style: btnStyle, text: EN ? '🔗 Copy link' : '🔗 Ссылка',
      onclick: () => { try { navigator.clipboard.writeText(url); copyBtn.textContent = EN ? '✓ Copied' : '✓ Скопировано'; setTimeout(() => { copyBtn.textContent = EN ? '🔗 Copy link' : '🔗 Ссылка'; }, 1500); } catch (e) {} },
    });
    const bar = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#6C3FC5', color: '#fff', font: '700 13px -apple-system,Segoe UI,sans-serif' } }, [
      el('span', { style: { marginRight: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, text: nameOf(theme) + ' · ' + LBL[n - 1] }),
      tok ? copyBtn : null,
      el('button', { style: btnStyle, text: TX.close, onclick: () => ov.remove() }),
    ]);
    ov = el('div', { style: { position: 'fixed', inset: '0', zIndex: '9999', background: '#fff', display: 'flex', flexDirection: 'column' } }, [bar, frame]);
    document.body.appendChild(ov);
  }

  function lessonCard(theme, highlight) {
    return el('div', { style: { background: '#fff', border: '1px solid ' + (highlight ? '#6C3FC5' : '#e7e7f0'), borderRadius: '14px', padding: '14px 14px 10px', boxShadow: '0 2px 12px rgba(108,63,197,.06)' } }, [
      el('div', { style: { fontWeight: '800', fontSize: '15px', color: '#6C3FC5', marginBottom: '8px' }, text: nameOf(theme) }),
      ...[1, 2, 3].map((n) => el('button', {
        style: { display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', margin: '5px 0', borderRadius: '9px', border: '1px solid transparent', background: '#f5f3fb', color: '#1A1A2E', font: '600 13px -apple-system,Segoe UI,sans-serif', cursor: 'pointer' },
        text: LBL[n - 1], onclick: () => openLesson(theme, n),
      })),
    ]);
  }

  const blocks = [
    el('div', { class: 'tch-top' }, [
      el('button', { class: 'back', text: '←', onclick: opts.goHome }),
      el('div', { class: 'tch-h' }, [el('div', { class: 'tch-t', text: TX.title }), el('div', { class: 'tch-sub', text: TX.sub })]),
    ]),
  ];
  if (weekTheme) {
    blocks.push(el('div', { style: { margin: '14px 0 6px', fontWeight: '800', color: '#6C3FC5' }, text: '⭐ ' + TX.week + nameOf(weekTheme) }));
    blocks.push(lessonCard(weekTheme, true));
  }
  blocks.push(el('div', { style: { margin: '20px 0 8px', fontWeight: '800', fontSize: '13px', color: '#5b5b73', textTransform: 'uppercase', letterSpacing: '.04em' }, text: TX.all }));
  blocks.push(el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '12px' } }, THEMES.map((th) => lessonCard(th, false))));
  blocks.push(el('div', { style: { textAlign: 'center', color: '#aaa', fontSize: '11px', margin: '22px 0 0' }, text: TX.note }));

  mount(container, el('div', { class: 'tch', style: { padding: '0 14px 40px' } }, blocks));
}
