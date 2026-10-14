(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'biosphere-slides-workspace-v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const seedDeck = {
    id: 'khtn8-bai32-scaffold',
    title: 'Các bệnh liên quan đến đường tiêu hóa',
    subject: 'biology',
    status: 'draft',
    date: '2026-10-14',
    description: 'KHTN 8 · Tập 1 · Bài 32 · Mục V và VI. Khung chờ đối chiếu sách giáo khoa.',
    isSeed: true,
    slides: [
      {
        kicker: 'KHTN 8 · TẬP 1 · BÀI 32',
        title: 'Các bệnh liên quan đến đường tiêu hóa',
        subtitle: 'Khung trình chiếu ban đầu. Nội dung kiến thức sẽ được bổ sung sau khi đối chiếu sách và yêu cầu của giáo viên.',
        points: [],
        note: 'BIOLOGY / DRAFT'
      },
      {
        kicker: 'MỤC V–VI · CHỜ ĐỐI CHIẾU',
        title: 'Nội dung theo sách giáo khoa',
        subtitle: 'Trang này đang để chờ có chủ đích. Cần xem đúng mục V và VI trong SGK KHTN 8 trước khi xác định tên bệnh và thông tin cần trình bày.',
        points: [
          'Xác định chính xác tiêu đề và nội dung từng mục.',
          'Ghi lại yêu cầu cụ thể của giáo viên.',
          'Chỉ bổ sung thông tin đã kiểm tra theo tài liệu.'
        ],
        note: 'SOURCE CHECK REQUIRED'
      },
      {
        kicker: 'CẤU TRÚC TRÌNH BÀY',
        title: 'Một trang chiếu, một trọng tâm',
        subtitle: 'Nội dung sẽ được biên tập ngắn gọn để dễ theo dõi trên màn hình lớp học.',
        points: [
          'Tiêu đề rõ ràng và dễ ghi nhớ.',
          'Hình minh họa phù hợp với nội dung.',
          'Thuật ngữ và kết luận bám sát nguồn.'
        ],
        note: 'SLIDE STRUCTURE'
      },
      {
        kicker: 'TÀI LIỆU THAM KHẢO',
        title: 'Ưu tiên thông tin chính xác',
        subtitle: 'Chưa có kết luận hay thông tin bệnh học nào được tự điền vào bản nháp này.',
        points: [
          'SGK Khoa học Tự nhiên 8, tập 1.',
          'Đề bài và hướng dẫn của giáo viên.',
          'Nguồn tham khảo bổ sung sẽ ghi rõ xuất xứ.'
        ],
        note: 'PENDING TEXTBOOK REVIEW'
      }
    ]
  };

  let decks = loadDecks();
  let activeFilter = 'all';
  let activeView = 'library';
  let currentDeck = null;
  let slideIndex = 0;
  let motionEnabled = !reducedMotion.matches;
  let previousFocus = null;

  function loadDecks() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return Array.isArray(saved) && saved.length ? saved : [seedDeck];
    } catch {
      return [seedDeck];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
      return true;
    } catch {
      toast('Không thể lưu: bộ nhớ trình duyệt có thể đã đầy.');
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function formatSubject(subject) {
    return subject === 'biology' ? 'SINH HỌC' : subject === 'science' ? 'KHOA HỌC TỰ NHIÊN' : 'HỌC TẬP';
  }

  function toast(message) {
    const region = $('#toastRegion');
    const item = document.createElement('div');
    item.className = 'toast';
    item.textContent = message;
    region.append(item);
    window.setTimeout(() => item.remove(), 2800);
  }

  function renderDecks() {
    const query = $('#searchDecks').value.trim().toLocaleLowerCase('vi');
    const filtered = decks.filter(deck => {
      const searchable = (deck.title + ' ' + deck.description + ' ' + formatSubject(deck.subject)).toLocaleLowerCase('vi');
      const matchesQuery = searchable.includes(query);
      const matchesFilter = activeFilter === 'all'
        || (activeFilter === 'draft' ? deck.status === 'draft' : deck.subject === activeFilter);
      return matchesQuery && matchesFilter;
    });

    $('#allCount').textContent = String(decks.length).padStart(2, '0');
    $('#deckGrid').innerHTML = filtered.map((deck, position) => {
      const state = deck.status === 'ready' ? 'ĐANG HOÀN THIỆN' : 'BẢN NHÁP';
      const slideCount = Array.isArray(deck.slides) ? deck.slides.length : 0;
      return `
        <article class="deck-card">
          <div class="deck-cover">
            <div class="cover-top"><span>${formatSubject(deck.subject)}</span><span>${String(position + 1).padStart(2, '0')} / ${escapeHTML(deck.date || 'LOCAL')}</span></div>
            <div class="cover-title">${escapeHTML(deck.title)}</div>
            <div class="cover-foot"><span>BIOSPHERE / SLIDES</span><span>${deck.isSeed ? 'KHUNG NỘI DUNG' : 'BẢN NHÁP'}</span></div>
          </div>
          <div class="deck-body">
            <h3>${escapeHTML(deck.title)}</h3>
            <p>${escapeHTML(deck.description || 'Bản nháp bài thuyết trình.')}</p>
            <div class="tags"><span class="tag">${formatSubject(deck.subject)}</span><span class="tag">${slideCount} trang mẫu</span><span class="tag">${state}</span></div>
            <div class="card-foot"><small>${escapeHTML(deck.date || 'LOCAL')}</small><div><button class="small-btn" data-share="${escapeHTML(deck.id)}">Chia sẻ</button> <button class="small-btn" data-present="${escapeHTML(deck.id)}">Trình chiếu ↗</button></div></div>
          </div>
        </article>`;
    }).join('');

    $('#emptyState').classList.toggle('hidden', filtered.length > 0);
    $('#deckGrid').classList.toggle('hidden', filtered.length === 0);
  }

  function showView(view, updateURL = true) {
    if (!['library', 'templates', 'settings'].includes(view)) view = 'library';
    activeView = view;
    $$('[data-view-panel]').forEach(panel => {
      const visible = panel.dataset.viewPanel === view;
      panel.hidden = !visible;
      panel.classList.toggle('active', visible);
    });
    $$('[data-view]').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    $('#mainNav').classList.remove('open');
    if (updateURL && location.hash.slice(1) !== view) history.pushState({ view }, '', '#' + view);
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }

  function openModal(id) {
    const modal = $('#' + id);
    if (!modal) return;
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('input,select,textarea,button')?.focus();
  }

  function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!$('.modal-backdrop:not([hidden])') && $('#presentationViewer').hidden) document.body.style.overflow = '';
    previousFocus?.focus?.();
  }

  function makeDeck(formData, template = 'science') {
    const title = String(formData.get('title') || '').trim();
    if (!title) return;
    const subject = String(formData.get('subject') || 'biology');
    const description = String(formData.get('description') || '').trim() || 'Bản nháp mới — bổ sung nội dung sau khi đối chiếu tài liệu.';
    const deck = {
      id: 'deck-' + Date.now().toString(36),
      title,
      subject,
      status: String(formData.get('status') || 'draft'),
      date: new Date().toISOString().slice(0, 10),
      description,
      template,
      isSeed: false,
      slides: [
        { kicker: formatSubject(subject), title, subtitle: description, points: [], note: 'BIOLOGY / DRAFT' },
        { kicker: 'Ý CHÍNH / 01', title: 'Thông tin đã kiểm chứng', subtitle: 'Bổ sung nội dung sau khi đối chiếu tài liệu và yêu cầu của giáo viên.', points: ['Ý chính thứ nhất — chờ tài liệu.', 'Ý chính thứ hai — chờ tài liệu.', 'Nguồn tham khảo — ghi rõ xuất xứ.'], note: 'DRAFT / VERIFY SOURCES' },
        { kicker: 'TỔNG KẾT', title: 'Điều cần ghi nhớ', subtitle: 'Tóm lược nội dung rút ra từ tài liệu nguồn.', points: ['Nhắc lại nội dung trọng tâm.', 'Nêu điều người nghe cần nhớ.'], note: 'DRAFT' }
      ]
    };
    decks.unshift(deck);
    persist();
    renderDecks();
    closeModal($('#createModal'));
    $('#createForm').reset();
    showView('library');
    toast('Đã tạo bản nháp trên thiết bị này.');
    return deck;
  }

  function present(id) {
    const requested = decks.find(deck => deck.id === id);
    if (!requested) {
      toast('Không tìm thấy bản nháp này trên thiết bị.');
      return;
    }
    currentDeck = requested;
    slideIndex = 0;
    $('#presentationViewer').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#viewerDeckTitle').textContent = currentDeck.title;
    renderSlide();
    if (location.hash !== '#present/' + encodeURIComponent(currentDeck.id)) {
      history.pushState({ presentation: currentDeck.id }, '', '#present/' + encodeURIComponent(currentDeck.id));
    }
  }

  function renderSlide() {
    if (!currentDeck) return;
    const slides = Array.isArray(currentDeck.slides) && currentDeck.slides.length ? currentDeck.slides : seedDeck.slides;
    slideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
    const slide = slides[slideIndex];

    $('#slideStage').innerHTML = `
      <article class="slide-page">
        <div class="slide-content">
          <div class="slide-kicker">${escapeHTML(slide.kicker || 'BIOSPHERE / SLIDE')}</div>
          <h1 class="slide-title">${escapeHTML(slide.title || currentDeck.title)}</h1>
          <p class="slide-subtitle">${escapeHTML(slide.subtitle || 'Bổ sung sau khi kiểm chứng tài liệu.')}</p>
          ${slide.points?.length ? '<div class="slide-points">' + slide.points.map((point, i) => '<div class="slide-point"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' + escapeHTML(point) + '</span></div>').join('') + '</div>' : ''}
        </div>
      </article>`;

    const label = String(slideIndex + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    $('#viewerSlideCaption').textContent = label;
    $('#viewerProgress').style.width = ((slideIndex + 1) / slides.length * 100) + '%';
    $('#slidePrev').disabled = slideIndex === 0;
    $('#slideNext').disabled = slideIndex === slides.length - 1;
    $('#viewerPlayMotion').setAttribute('aria-pressed', String(motionEnabled));
    $('#presentationViewer').classList.toggle('motion-off', !motionEnabled);
  }

  function goNext() {
    if (!currentDeck || slideIndex >= currentDeck.slides.length - 1) return;
    slideIndex += 1;
    renderSlide();
  }

  function goPrevious() {
    if (!currentDeck || slideIndex <= 0) return;
    slideIndex -= 1;
    renderSlide();
  }

  async function exitPresentation() {
    const viewer = $('#presentationViewer');
    if (viewer.hidden) return;
    if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* fullscreen may already have closed */ }
    }
    viewer.hidden = true;
    document.body.style.overflow = '';
    currentDeck = null;
    if (!['library', 'templates', 'settings'].includes(location.hash.slice(1))) {
      history.replaceState({ view: activeView }, '', '#' + activeView);
    }
  }

  async function toggleFullscreen() {
    const viewer = $('#presentationViewer');
    try {
      if (!document.fullscreenElement) {
        if (viewer.requestFullscreen) await viewer.requestFullscreen();
        else toast('Trình duyệt này chưa hỗ trợ toàn màn hình.');
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast('Không thể bật toàn màn hình. Hãy thử qua menu của trình duyệt.');
    }
  }

  function shareDeck(id) {
    const deck = decks.find(item => item.id === id);
    if (!deck) return;
    const url = new URL(location.href);
    url.hash = 'present/' + encodeURIComponent(id);
    $('#shareUrl').value = url.toString();
    $('#shareExplanation').textContent = 'Đây là đường dẫn mẫu. Bản nháp hiện lưu trên thiết bị này nên người nhận ở thiết bị khác chưa thể xem nội dung.';
    openModal('shareModal');
  }

  function exportDeck(id) {
    const deck = decks.find(item => item.id === id);
    if (!deck) return;
    const blob = new Blob([JSON.stringify({ format: 'biosphere-deck', version: 1, presentation: deck }, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = deck.title.replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 60) + '.json';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
    toast('Đã xuất bài thuyết trình dạng JSON.');
  }

  function importDeck() {
    const file = $('#jsonImport').files?.[0];
    if (!file) {
      toast('Hãy chọn tệp JSON trước.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('Tệp vượt quá giới hạn 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result));
        const deck = payload.presentation || payload;
        if (typeof deck.title !== 'string' || !Array.isArray(deck.slides) || deck.slides.length < 1) {
          throw new Error('invalid presentation');
        }
        deck.id = 'import-' + Date.now().toString(36);
        deck.isSeed = false;
        deck.status = 'draft';
        decks.unshift(deck);
        persist();
        renderDecks();
        closeModal($('#importModal'));
        $('#jsonImport').value = '';
        showView('library');
        toast('Đã nhập bài vào thư viện cục bộ.');
      } catch {
        toast('Tệp không đúng định dạng BioSphere JSON.');
      }
    };
    reader.onerror = () => toast('Không thể đọc tệp. Hãy thử lại.');
    reader.readAsText(file);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const light = theme === 'light';
    $('#themeToggle').textContent = light ? '☀' : '◐';
    $('#settingsTheme').classList.toggle('on', light);
    $('#settingsTheme').setAttribute('aria-checked', String(light));
    try { localStorage.setItem('biosphere-theme', theme); } catch { /* theme remains active this session */ }
  }

  function toggleTheme() {
    setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  }

  function setMotion(enabled) {
    motionEnabled = Boolean(enabled);
    $('#settingsMotion').classList.toggle('on', motionEnabled);
    $('#settingsMotion').setAttribute('aria-checked', String(motionEnabled));
    $('#viewerPlayMotion').setAttribute('aria-pressed', String(motionEnabled));
    $('#presentationViewer').classList.toggle('motion-off', !motionEnabled);
  }

  // Shared event delegation avoids accumulating listeners when the library rerenders.
  document.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (!target) return;

    if (target.matches('[data-present]')) present(target.dataset.present);
    if (target.matches('[data-share]')) shareDeck(target.dataset.share);
    if (target.matches('[data-export]')) exportDeck(target.dataset.export);
    if (target.matches('[data-view]')) showView(target.dataset.view);
    if (target.matches('[data-filter]')) {
      activeFilter = target.dataset.filter;
      $$('[data-filter]').forEach(button => button.classList.toggle('active', button === target));
      renderDecks();
    }
    if (target.matches('[data-template]')) {
      openModal('createModal');
      const templateSelect = $('#createForm select[name="subject"]');
      templateSelect.value = 'science';
      $('#createForm').dataset.template = target.dataset.template;
    }
    if (target.matches('[data-close-modal]')) closeModal(target.closest('.modal-backdrop'));
    if (target.id === 'createOpen' || target.id === 'heroCreate' || target.id === 'emptyCreate') openModal('createModal');
    if (target.id === 'heroSample') present(seedDeck.id);
    if (target.id === 'importOpen') openModal('importModal');
    if (target.id === 'mobileMenu') $('#mainNav').classList.toggle('open');
    if (target.id === 'themeToggle') toggleTheme();
    if (target.id === 'settingsTheme') toggleTheme();
    if (target.id === 'settingsMotion') setMotion(!motionEnabled);
    if (target.id === 'viewerPlayMotion') {
      setMotion(!motionEnabled);
      toast(motionEnabled ? 'Đã bật chuyển động' : 'Đã giảm chuyển động');
    }
    if (target.id === 'slidePrev') goPrevious();
    if (target.id === 'slideNext') goNext();
    if (target.id === 'viewerClose' || target.id === 'viewerExit') exitPresentation();
    if (target.id === 'viewerFullscreen') toggleFullscreen();
    if (target.id === 'resetLocal') {
      decks = [seedDeck];
      persist();
      renderDecks();
      toast('Đã khôi phục khung bài mẫu.');
    }
    if (target.id === 'copyShare') {
      navigator.clipboard?.writeText($('#shareUrl').value).then(
        () => toast('Đã sao chép liên kết.'),
        () => { $('#shareUrl').select(); toast('Hãy sao chép liên kết đã chọn.'); }
      ) || ($('#shareUrl').select(), toast('Hãy sao chép liên kết đã chọn.'));
    }
  });

  $('#searchDecks').addEventListener('input', renderDecks);
  $('#createForm').addEventListener('submit', event => {
    event.preventDefault();
    makeDeck(new FormData(event.currentTarget), event.currentTarget.dataset.template || 'science');
    event.currentTarget.dataset.template = 'science';
  });
  $('#jsonImport').addEventListener('change', () => {
    const file = $('#jsonImport').files?.[0];
    if (file && file.size > 2 * 1024 * 1024) toast('Tệp vượt quá giới hạn 2 MB.');
  });
  $('#importModal').addEventListener('click', event => {
    if (event.target.id === 'importModal') closeModal(event.currentTarget);
    if (event.target.id === 'jsonImport') event.stopPropagation();
  });
  $('#importOpen').addEventListener('dblclick', importDeck);
  $('#shareModal').addEventListener('click', event => {
    if (event.target.id === 'shareModal') closeModal(event.currentTarget);
  });

  document.addEventListener('keydown', event => {
    const viewerOpen = !$('#presentationViewer').hidden;
    if (viewerOpen) {
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) {
        event.preventDefault();
        goNext();
      } else if (['ArrowLeft', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        goPrevious();
      } else if (event.key === 'Escape' && !document.fullscreenElement) {
        exitPresentation();
      }
      return;
    }
    if (event.key === 'Escape') $$('.modal-backdrop:not([hidden])').forEach(closeModal);
  });

  window.addEventListener('popstate', () => {
    const hash = location.hash.slice(1);
    if (!$('#presentationViewer').hidden) {
      $('#presentationViewer').hidden = true;
      document.body.style.overflow = '';
      currentDeck = null;
    }
    if (hash.startsWith('present/')) {
      const id = decodeURIComponent(hash.slice('present/'.length));
      if (decks.some(deck => deck.id === id)) present(id);
      else showView('library', false);
    } else {
      showView(hash, false);
    }
  });

  reducedMotion.addEventListener?.('change', event => {
    if (event.matches) setMotion(false);
  });

  try {
    const savedTheme = localStorage.getItem('biosphere-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    else setTheme('dark');
  } catch {
    setTheme('dark');
  }
  renderDecks();

  const initialHash = location.hash.slice(1);
  if (initialHash.startsWith('present/')) {
    const id = decodeURIComponent(initialHash.slice('present/'.length));
    if (decks.some(deck => deck.id === id)) present(id);
    else showView('library', false);
  } else {
    showView(initialHash, false);
  }
})();