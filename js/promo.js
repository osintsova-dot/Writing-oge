/* promo.js — общий скрипт промо-страниц: меню, появления, wow-интерактив,
   модалка «установи на телефон» + переход в демо (oge/ege.html?key=DEMO). */
(function () {
  // год в футере
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // ссылка на VK-сообщество в футере (единым куском для всех страниц)
  var fl = document.querySelector('.foot-links');
  if (fl) {
    var vk = document.createElement('a');
    vk.href = 'https://vk.com/speaksmile_oge_ege';
    vk.target = '_blank'; vk.rel = 'noopener';
    vk.textContent = 'ВКонтакте';
    fl.appendChild(vk);
  }

  // мобильное меню
  var tg = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (tg && links) tg.addEventListener('click', function () { links.classList.toggle('open'); });

  // появления на скролле
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!reduce) {
    // герой: медовый блик за курсором
    var hero = document.querySelector('.hero');
    if (hero) hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    // 3D-наклон карточек
    document.querySelectorAll('.tilt-card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(720px) rotateY(' + (px * 9).toFixed(2) + 'deg) rotateX(' + (-py * 9).toFixed(2) + 'deg) translateY(-6px)';
        card.style.boxShadow = '0 22px 50px rgba(108,63,197,.22)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; card.style.boxShadow = ''; });
    });
  }

  // ===== Модалка «установи на телефон» + переход в демо =====
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var modal = document.createElement('div');
  modal.className = 'imodal';
  modal.innerHTML =
    '<div class="imodal-card" role="dialog" aria-modal="true">' +
      '<h3 class="im-title">📲 Установи как приложение</h3>' +
      '<div class="im-sub">Чтобы заниматься было удобно: на весь экран, офлайн, иконка S&amp;S на «Домашнем». Это по желанию — можно и просто открыть.</div>' +
      '<div class="iplat"><button data-plat="ios">iPhone (Safari)</button><button data-plat="android">Android (Chrome)</button></div>' +
      '<div class="isteps"></div>' +
      '<div class="im-go btns" style="flex-direction:column;gap:10px">' +
        '<a class="btn btn-p im-oge" style="justify-content:center" href="./oge.html?key=DEMO">Открыть ОГЭ →</a>' +
        '<a class="btn btn-ghost im-ege" style="justify-content:center" href="./ege.html?key=DEMO">Открыть ЕГЭ →</a>' +
      '</div>' +
      '<span class="im-later">Позже</span>' +
    '</div>';
  document.body.appendChild(modal);
  // ссылки и заголовок модалки настраиваются под роль (ученик/учитель) при открытии
  var imTitle = modal.querySelector('.im-title');
  var imOge = modal.querySelector('.im-oge');
  var imEge = modal.querySelector('.im-ege');

  var STEPS = {
    ios: ['Внизу Safari нажми «Поделиться» (квадрат со стрелкой вверх).', 'Выбери «На экран „Домой“».', 'Готово — иконка S&amp;S появится на экране телефона.'],
    android: ['В Chrome открой меню (три точки ⋮ вверху справа).', 'Нажми «Установить приложение» (или «Добавить на главный экран»).', 'Готово — S&amp;S появится среди приложений.']
  };
  var stepsBox = modal.querySelector('.isteps');
  function renderSteps(plat) {
    modal.querySelectorAll('.iplat button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-plat') === plat); });
    stepsBox.innerHTML = STEPS[plat].map(function (s, i) {
      return '<div class="istep"><span class="n">' + (i + 1) + '</span><span>' + s + '</span></div>';
    }).join('');
  }
  modal.querySelectorAll('.iplat button').forEach(function (b) {
    b.addEventListener('click', function () { renderSteps(b.getAttribute('data-plat')); });
  });
  renderSteps(isIOS ? 'ios' : 'android');

  // role: 'teacher' → демо-доступ в кабинет учителя (?key=DEMO#/teacher, без секретного кода);
  // иначе обычный ученический демо-доступ.
  function openModal(role) {
    var teacher = role === 'teacher';
    var frag = teacher ? '#/teacher' : '';
    imOge.setAttribute('href', './oge.html?key=DEMO' + frag);
    imEge.setAttribute('href', './ege.html?key=DEMO' + frag);
    imOge.textContent = (teacher ? 'Открыть кабинет ОГЭ' : 'Открыть ОГЭ') + ' →';
    imEge.textContent = (teacher ? 'Открыть кабинет ЕГЭ' : 'Открыть ЕГЭ') + ' →';
    imTitle.textContent = (teacher ? '🧑‍🏫 Кабинет учителя — демо' : '📲 Установи как приложение');
    modal.classList.add('open');
  }
  function closeModal() { modal.classList.remove('open'); }
  modal.querySelector('.im-later').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  // все «.openapp» открывают модалку (вместо прямого перехода); data-role="teacher" → демо-кабинет
  document.querySelectorAll('.openapp').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); openModal(a.getAttribute('data-role')); });
  });
})();
