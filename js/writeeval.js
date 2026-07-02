// writeeval.js — ИИ-проверка письма (DeepSeek через воркер). Общая для раздела «Письмо» и ДЗ.
// opts = { lang:'ru'|'en', sectionId:'writing'|'email'|'essay', criteria:[{code,name,max}], max, words:[min,max], stim }

import { fetchRetry, parseModelJSON } from './net.js';
import { loadJSON } from './data.js';

const WORKER = 'https://oge-eval.o-sintsova.workers.dev'; // прокси DeepSeek

export async function evalWriting(text, opts) {
  const { lang, sectionId, criteria, max, words, stim, essayKind } = opts;
  const [wMin, wMax] = words || [100, 140];
  // допуск объёма по ФИПИ ±10%: в этих границах балл за объём НЕ снижается
  const wLo = Math.round(wMin * 0.9), wHi = Math.round(wMax * 1.1);
  // Правило ФИПИ: при превышении допуска проверяются только ПЕРВЫЕ wMax слов.
  // Реализуем детерминированно — реально обрезаем текст, чтобы модель не зачла лишнее (вопросы/подпись за лимитом).
  const wordsArr = (text || '').trim().split(/\s+/).filter(Boolean);
  const wcN = wordsArr.length;
  const overLimit = wcN > wHi;
  const assessed = overLimit ? wordsArr.slice(0, wMax).join(' ') : (text || '');
  const critSpec = criteria.map((c) => `${c.code} (max ${c.max}): ${c.name}`).join('; ');
  const critJson = criteria.map((c) => `{"code":"${c.code}","name":"${c.name}","score":<0-${c.max}>,"max":${c.max},"comment":"<...>"}`).join(',');

  // Задание может отсутствовать (свободная проверка реальной работы) — тогда К1 оцениваем по самому ответу, осторожно.
  const hasStim = stim && String(stim).trim().length > 5;
  const stimEn = hasStim
    ? `Prompt the student answered:\n"""${stim}"""`
    : `No task prompt was provided. Judge К1 (communicative task) from the student's writing ITSELF, conservatively: for an email/letter check the correct opening, closing phrase and name, politeness, and that the student asks 3 clear questions (EGE email); for a data essay check that the reported facts and comparisons are consistent with the figures the student cites and that all plan points are present. Do NOT invent specific required questions; when unsure, give К1 the LOWER score.`;
  const stimRu = hasStim
    ? `Контекст письма друга: ${stim}`
    : `Задание НЕ указано. Оцени К1 по самому письму, ОСТОРОЖНО: проверь обращение, завершающую фразу и подпись, нормы вежливости (благодарность, ссылка на контакты) и полноту/связность ответов по смыслу. Не выдумывай конкретные вопросы друга; в спорном случае ставь К1 НИЖЕ.`;
  const conserveEn = ' Grade strictly and never overscore. BUT do NOT invent errors: penalise only GENUINE mistakes. Correct, standard English — natural phrasing, acceptable synonyms, valid collocations (e.g. "turn something into"), a slightly less formal but correct word — must NOT be marked as an error. If you are not sure something is truly a mistake, do NOT count it. Award the full score for a criterion when it is genuinely met (a clean, complete answer deserves full marks).';
  const conserveRu = ' Оценивай строго и не завышай. НО не выдумывай ошибок: снижай балл только за РЕАЛЬНЫЕ ошибки. Корректный стандартный английский — естественные обороты, допустимые синонимы, нормальные сочетания (например «turn something into»), чуть менее формальное, но верное слово — НЕ помечай как ошибку. Если не уверен(а), что это действительно ошибка, — НЕ считай её ошибкой. Ставь полный балл за критерий, если он реально выполнен (чистый, полный ответ заслуживает максимума).';

  // Единый источник правил оценивания — app/data/scoring.json (checkRubric по заданию).
  const examKey = lang === 'en' ? 'ege' : 'oge';
  const taskKey = sectionId === 'essay' ? 'task38_opinion' : (sectionId === 'email' ? 'task37_email' : 'task35_letter');
  let rubric = '';
  try { const sc = await loadJSON('scoring'); rubric = (((sc || {})[examKey] || {})[taskKey] || {}).checkRubric || ''; } catch {}
  // Легаси «Моё мнение» (старый формат эссе) — в scoring.json нет, задаём краткую рубрику.
  if (sectionId === 'essay' && essayKind === 'opinion') {
    rubric = 'OLD opinion-essay format (NO data table — do NOT require figures). Plan: 1) intro stating the problem; 2) the student\'s opinion + 2-3 reasons; 3) an opposing opinion + 1-2 reasons; 4) why the student disagrees; 5) conclusion restating the position. К1 (max 3) content & all 5 plan points; К2 (max 3) organisation, paragraphs, linkers; К3 (max 3) vocabulary; К4 (max 3) grammar; К5 (max 2) spelling & punctuation (apostrophe = punctuation).';
  }
  if (!rubric) rubric = 'Grade strictly by the official ФИПИ-2026 criteria listed above; if К1 (communicative task) is 0, the whole task scores 0.';

  let sys, user;
  if (lang === 'en') {
    const kind = sectionId !== 'essay'
      ? 'task 37, a personal email'
      : (essayKind === 'opinion' ? 'an opinion essay (OLD format)' : 'task 38, a data-based project essay on survey data (a table or a pie chart)');
    sys = 'You are a strict but kind English exam examiner. You assess a student\'s writing strictly by the official ФИПИ-2026 criteria and reply ONLY with valid JSON, no markdown. All comments must be IN ENGLISH at B1 level — short and clear.';
    user =
`Task: ${kind}.
Criteria: ${critSpec}
Word limit: ${wMin}-${wMax} words. Tolerance ±10%: ${wLo}-${wHi} words is fine — do NOT lower the score for length within ${wLo}-${wHi}. Under ${wLo} → the whole task scores 0. Over ${wHi} → assess ONLY the first ${wMax} words; anything after that cut-off does NOT exist.

GRADING RUBRIC (ФИПИ-2026 — apply strictly):
${rubric}

${stimEn}

Student's writing (${wcN} words${overLimit ? `, OVER the limit — only the first ${wMax} words below are assessed; the rest was cut and does NOT count (missing closing/sign-off or questions beyond the cut lower К1 and К2)` : ''}):
"""${assessed}"""

Return JSON exactly like this:
{"totalScore":<sum 0-${max}>,"criteria":[${critJson}],"verdict":"<1-2 sentences in English, encouraging>","errors":[{"quote":"<exact phrase from the text>","what":"<what is wrong, in English>","fix":"<correct version>"}],"corrected":"<the full corrected text>"}
Score every criterion within its max; totalScore = sum. Be THOROUGH finding language errors: re-read every sentence for missing/extra articles, subject-verb agreement, prepositions, word order, word choice and spelling. A weak text usually has 5+ errors — do NOT stop at 1-2; list the 4-6 most serious in "errors". IMPORTANT (official rule): if К1 (solving the communicative task) is 0, the whole task scores 0 — set every other criterion to 0 and totalScore = 0.${conserveEn}`;
  } else {
    sys = 'Ты строгий экзаменатор ОГЭ по английскому. Оцениваешь личное письмо (задание 35) строго по официальным критериям ФИПИ-2026. Возвращаешь ТОЛЬКО валидный JSON, без markdown. Комментарии — по-русски.';
    user =
`Критерии: ${critSpec}. Объём ${wMin}–${wMax} слов (норма ${wLo}–${wHi}; меньше ${wLo} → всё задание 0; больше ${wHi} → проверяются только первые ${wMax} слов).

РУБРИКА ОЦЕНИВАНИЯ (ФИПИ-2026 — применяй строго):
${rubric}

${stimRu}

Письмо ученика (${wcN} слов${overLimit ? `, ПРЕВЫШЕН лимит — ниже показаны только первые ${wMax} слов; остальное обрезано и НЕ засчитывается (отсутствие концовки/подписи за обрезкой снижают К1 и К2)` : ''}):
"""${assessed}"""

Верни JSON строго так:
{"totalScore":<сумма 0-${max}>,"criteria":[${critJson}],"verdict":"<1-2 предложения по-русски>","errors":[{"quote":"<точная фраза>","what":"<что не так>","fix":"<как правильно>"}],"corrected":"<полный исправленный текст>"}
totalScore = сумма по критериям. Сначала найди ВСЕ ошибки (артикли, согласование, предлоги, порядок слов, время, выбор слова, орфография, пунктуация), затем выставь баллы строго по числу ошибок из рубрики. ВАЖНО: если К1=0 (задача не решена), то ВСЁ задание = 0 — остальные критерии 0 и totalScore=0.${conserveRu}`;
  }

  // эссе длиннее (200-250 слов + corrected) → больше токенов, иначе JSON обрывается
  const maxTok = sectionId === 'essay' ? 3500 : 2400;
  const r = await fetchRetry(WORKER, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', max_tokens: maxTok, temperature: 0,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }] }),
  }, { timeoutMs: 60000, tries: 2 });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
  if (!d.choices || !d.choices[0]) throw new Error('empty response');
  return parseModelJSON(d.choices[0].message.content);
}
