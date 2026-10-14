(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'biosphere-slides-workspace-v1';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const seedDeck = window.BIOSPHERE_BAI32_SEED;

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
      if (Array.isArray(saved)) {
        // Replace the older bundled draft with the current, researched 20-slide deck.
        const personalDecks = saved.filter(deck => deck && deck.id !== seedDeck.id && !deck.isSeed);
        return [seedDeck, ...personalDecks];
      }
      return [seedDeck];
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

  function renderVisual(type) {
    const captions = {
      digestive: 'HỆ TIÊU HÓA', greeting: 'CÙNG BẮT ĐẦU', team: 'NHÓM THỰC HIỆN',
      pathway: 'ĐƯỜNG ĐI CỦA THỨC ĂN', balance: 'DINH DƯỠNG HỢP LÝ', overview: '5 VẤN ĐỀ CẦN BIẾT',
      tooth: 'SÂU RĂNG', toothcare: 'CHĂM SÓC RĂNG', stomach: 'DẠ DÀY · TÁ TRÀNG',
      stomachcare: 'KHÁM VÀ ĐIỀU TRỊ ĐÚNG', water: 'TIÊU CHẢY', watercare: 'NƯỚC SẠCH · BÙ NƯỚC',
      food: 'THỰC PHẨM AN TOÀN', foodsafety: 'CHỌN · LÀM SẠCH · NẤU · BẢO QUẢN',
      fiber: 'CHẤT XƠ · NƯỚC · VẬN ĐỘNG', comparison: 'NHẬN BIẾT DẤU HIỆU',
      habits: 'THÓI QUEN HẰNG NGÀY', sources: 'NGUỒN ĐÁNG TIN CẬY', closing: 'XIN CẢM ƠN'
    };
    const drawings = {
      digestive: '<svg viewBox="0 0 360 390" role="img"><defs><linearGradient id="torso" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#baf6d2" stop-opacity=".55"/><stop offset="1" stop-color="#5ad79a" stop-opacity=".08"/></linearGradient><linearGradient id="organ" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffc3a9"/><stop offset="1" stop-color="#e87979"/></linearGradient></defs><path d="M120 47 Q138 18 180 21 Q222 18 240 47 L270 95 251 145 242 316 Q180 348 118 316 L109 145 90 95Z" fill="url(#torso)" stroke="#a9f4cc" stroke-opacity=".55" stroke-width="2"/><path d="M170 57 C174 82 173 100 176 119" fill="none" stroke="#f5c69a" stroke-width="13" stroke-linecap="round"/><path d="M177 112 C214 101 232 123 214 149 C204 163 185 166 184 187 C182 211 222 209 221 183" fill="none" stroke="url(#organ)" stroke-width="18" stroke-linecap="round"/><path d="M142 145 Q164 126 182 145 Q198 155 181 174" fill="none" stroke="#f6ac9a" stroke-width="12" stroke-linecap="round"/><path d="M145 195 C128 208 137 230 151 228 C169 226 163 209 178 207 C196 205 194 226 179 232 C162 239 150 251 163 263 C178 278 195 254 209 265 C226 279 205 294 189 289 C175 284 166 302 181 310 C197 318 217 306 220 292" fill="none" stroke="#ffd1ba" stroke-width="10" stroke-linecap="round"/><path d="M134 191 Q117 216 128 265 Q139 287 155 282 M226 192 Q242 218 230 264 Q222 287 207 281" fill="none" stroke="#80e5b3" stroke-width="10" stroke-linecap="round"/><path d="M180 309 L180 326" stroke="#80e5b3" stroke-width="7" stroke-linecap="round"/><circle cx="176" cy="114" r="5" fill="#d7ffe7"/><circle cx="220" cy="180" r="5" fill="#d7ffe7"/><circle cx="146" cy="251" r="4" fill="#d7ffe7"/><circle cx="210" cy="291" r="4" fill="#d7ffe7"/></svg>',
      tooth: '<svg viewBox="0 0 360 320" role="img"><defs><linearGradient id="enamel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffef1"/><stop offset=".56" stop-color="#c9f8dc"/><stop offset="1" stop-color="#65dca2"/></linearGradient></defs><path d="M105 64 C72 43 43 65 48 105 C52 133 69 147 82 181 C92 208 98 261 120 261 C141 261 138 204 158 180 C176 160 187 180 196 211 C208 252 222 267 237 251 C255 232 258 179 280 141 C305 98 285 62 253 58 C223 54 204 72 181 74 C154 77 129 52 105 64Z" fill="url(#enamel)" stroke="#effff4" stroke-width="3"/><path d="M182 77 Q166 115 178 146 Q186 166 175 187" fill="none" stroke="#e87979" stroke-width="15" stroke-linecap="round"/><path d="M177 78 Q194 104 190 128" fill="none" stroke="#ffba88" stroke-width="7" stroke-linecap="round"/><g fill="#80e5b3" stroke="#d7ffea" stroke-width="2"><circle cx="59" cy="64" r="9"/><circle cx="292" cy="74" r="7"/><circle cx="306" cy="119" r="10"/><circle cx="70" cy="150" r="6"/></g><g stroke="#9af0bd" stroke-width="3" stroke-linecap="round"><path d="M48 42l-7-8m18 5 2-10m236 54 10-2m-16 32 7 7"/></g></svg>',
      stomach: '<svg viewBox="0 0 360 330" role="img"><defs><linearGradient id="stomachFill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffc4ad"/><stop offset=".55" stop-color="#e98689"/><stop offset="1" stop-color="#9e526f"/></linearGradient></defs><path d="M145 35 C140 68 146 87 166 105 C193 128 214 131 248 124 C280 118 303 139 297 171 C289 215 249 240 222 262 C195 284 151 276 120 246 C92 219 78 178 94 145 C105 122 126 118 126 93 L124 38Z" fill="url(#stomachFill)" stroke="#ffd9cb" stroke-width="3"/><path d="M147 60 C146 92 166 118 189 136 C218 157 250 152 274 161" fill="none" stroke="#7d3e60" stroke-width="11" stroke-linecap="round"/><path d="M111 171 Q132 144 149 172 Q160 192 177 181 Q194 169 208 194 Q224 219 251 202" fill="none" stroke="#ffd0bb" stroke-width="8" stroke-linecap="round"/><circle cx="232" cy="176" r="15" fill="#7e3657" stroke="#ffb9a2" stroke-width="6"/><circle cx="153" cy="206" r="12" fill="#7e3657" stroke="#ffb9a2" stroke-width="5"/><g fill="#a3f0c0"><circle cx="67" cy="87" r="5"/><circle cx="303" cy="84" r="7"/><circle cx="68" cy="246" r="8"/></g></svg>',
      water: '<svg viewBox="0 0 360 330" role="img"><defs><linearGradient id="drop" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d4fff0"/><stop offset="1" stop-color="#51b9e4"/></linearGradient></defs><path d="M180 38 C155 83 104 133 104 185 C104 231 137 263 180 263 C223 263 256 231 256 185 C256 133 205 83 180 38Z" fill="url(#drop)" fill-opacity=".9" stroke="#edfff7" stroke-width="3"/><path d="M139 185 C139 211 156 229 178 231" fill="none" stroke="#ffffff" stroke-opacity=".85" stroke-width="8" stroke-linecap="round"/><circle cx="82" cy="91" r="7" fill="#9af0bd"/><circle cx="280" cy="107" r="10" fill="#9af0bd"/><circle cx="294" cy="226" r="5" fill="#e7fff3"/><circle cx="68" cy="230" r="11" fill="#4fbcdf" fill-opacity=".6"/></svg>',
      food: '<svg viewBox="0 0 360 320" role="img"><defs><linearGradient id="plate" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#baf6d2" stop-opacity=".25"/><stop offset="1" stop-color="#7fc3df" stop-opacity=".08"/></linearGradient></defs><circle cx="178" cy="166" r="124" fill="url(#plate)" stroke="#b9f6d3" stroke-width="3"/><circle cx="178" cy="166" r="98" fill="none" stroke="#e8fff1" stroke-opacity=".5" stroke-width="2"/><path d="M178 68 A98 98 0 0 1 276 166 L178 166Z" fill="#f4c66f" fill-opacity=".9"/><path d="M178 166 L276 166 A98 98 0 0 1 178 264Z" fill="#5fcf98" fill-opacity=".9"/><path d="M178 166 L178 264 A98 98 0 0 1 80 166Z" fill="#df8b87" fill-opacity=".9"/><path d="M178 166 L80 166 A98 98 0 0 1 178 68Z" fill="#9cdcf0" fill-opacity=".9"/><circle cx="138" cy="115" r="15" fill="#fff6d8"/><circle cx="219" cy="116" r="15" fill="#fff6d8"/><circle cx="222" cy="205" r="15" fill="#fff6d8"/><circle cx="133" cy="211" r="15" fill="#fff6d8"/><path d="M177 47v-16m-16 10 6 8m26-8-6 8" stroke="#8ce8b5" stroke-width="3" stroke-linecap="round"/></svg>',
      safety: '<svg viewBox="0 0 360 330" role="img"><defs><linearGradient id="shield" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#baf6d2"/><stop offset="1" stop-color="#4bcf91"/></linearGradient></defs><path d="M180 34 L275 67 V148 C275 213 232 257 180 285 C128 257 85 213 85 148 V67Z" fill="url(#shield)" fill-opacity=".88" stroke="#e9fff2" stroke-width="3"/><path d="M133 157 L164 188 L226 118" fill="none" stroke="#0c3524" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><circle cx="65" cy="72" r="7" fill="#9af0bd"/><circle cx="291" cy="219" r="11" fill="#9af0bd"/><circle cx="287" cy="83" r="5" fill="#dfffee"/></svg>',
      fiber: '<svg viewBox="0 0 360 330" role="img"><defs><linearGradient id="apple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffdb8a"/><stop offset="1" stop-color="#e57b77"/></linearGradient></defs><path d="M169 82 C135 56 89 79 91 126 C94 178 133 229 162 226 C177 225 182 216 196 225 C226 241 266 176 265 126 C264 82 222 62 189 83 C181 89 176 88 169 82Z" fill="url(#apple)" stroke="#ffe9c3" stroke-width="3"/><path d="M178 78 C176 58 184 42 203 35" fill="none" stroke="#9af0bd" stroke-width="9" stroke-linecap="round"/><path d="M200 47 Q225 34 237 53 Q219 70 200 64Z" fill="#76d99e"/><path d="M272 145 L307 145 L298 252 Q290 270 281 252Z" fill="#8fd9f0" fill-opacity=".8" stroke="#e8fff7" stroke-width="3"/><path d="M276 197 Q289 188 302 197" fill="none" stroke="#d9fff3" stroke-width="4"/><g fill="#b5f5ce"><circle cx="68" cy="80" r="7"/><circle cx="303" cy="93" r="6"/><circle cx="71" cy="231" r="10"/></g></svg>',
      abstract: '<svg viewBox="0 0 360 330" role="img"><circle cx="180" cy="165" r="120" fill="#7ce7ad" fill-opacity=".07" stroke="#bcf8d4" stroke-opacity=".65" stroke-width="2"/><circle cx="180" cy="165" r="91" fill="none" stroke="#bcf8d4" stroke-opacity=".38" stroke-width="1.5" stroke-dasharray="5 8"/><path d="M109 175 C127 99 226 91 246 154 C264 210 197 250 149 214 C122 194 132 146 177 139 C215 133 229 173 204 192" fill="none" stroke="#8eeab5" stroke-width="5" stroke-linecap="round"/><circle cx="110" cy="175" r="9" fill="#e5fff0"/><circle cx="246" cy="154" r="9" fill="#b2f4ce"/><circle cx="204" cy="192" r="9" fill="#79d8f2"/><path d="M180 23v18m0 248v18M38 165h18m248 0h18" stroke="#baf6d2" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/><circle cx="180" cy="165" r="25" fill="#a6f2c5" fill-opacity=".2"/></svg>'
    };
    const aliases = {
      greeting: 'abstract', team: 'abstract', pathway: 'digestive', balance: 'food', overview: 'abstract',
      toothcare: 'tooth', stomachcare: 'stomach', watercare: 'water', foodsafety: 'safety',
      comparison: 'abstract', habits: 'safety', sources: 'abstract', closing: 'abstract'
    };
    const image = drawings[type] || drawings[aliases[type]] || drawings.abstract;
    return '<aside class="slide-art"><div class="art-orbit"></div><div class="art-illustration">' + image + '</div><div class="art-caption">' + escapeHTML(captions[type] || 'BIOSPHERE / SCIENCE') + '</div></aside>';
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
      const state = deck.status === 'ready' ? 'HOÀN THIỆN' : 'BẢN NHÁP';
      const slideCount = Array.isArray(deck.slides) ? deck.slides.length : 0;
      return `
        <article class="deck-card">
          <div class="deck-cover">
            <div class="cover-top"><span>${formatSubject(deck.subject)}</span><span>${String(position + 1).padStart(2, '0')} / ${escapeHTML(deck.date || 'LOCAL')}</span></div>
            <div class="cover-title">${escapeHTML(deck.title)}</div>
            <div class="cover-foot"><span>BIOSPHERE / SLIDES</span><span>${deck.isSeed ? 'BÀI 32 · 20 TRANG' : 'BẢN NHÁP'}</span></div>
          </div>
          <div class="deck-body">
            <h3>${escapeHTML(deck.title)}</h3>
            <p>${escapeHTML(deck.description || 'Bản nháp bài thuyết trình.')}</p>
            <div class="tags"><span class="tag">${formatSubject(deck.subject)}</span><span class="tag">${slideCount} trang</span><span class="tag">${state}</span></div>
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
    const pointHtml = slide.points?.length
      ? '<div class="slide-points">' + slide.points.map((point, i) => '<div class="slide-point"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' + escapeHTML(point) + '</span></div>').join('') + '</div>'
      : '';
    const sourceHtml = slide.note ? '<div class="slide-source">' + escapeHTML(slide.note) + '</div>' : '';
    const linksHtml = slide.links?.length
      ? '<div class="slide-links"><div class="slide-links-title">TÀI LIỆU TRỰC TUYẾN</div>' + slide.links.map(link => '<a href="' + escapeHTML(link.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(link.label) + ' <span aria-hidden="true">↗</span></a>').join('') + '</div>'
      : '';
    $('#slideStage').innerHTML =
      '<article class="slide-page">' +
        '<div class="slide-layout">' +
          '<section class="slide-content">' +
            '<div class="slide-kicker">' + escapeHTML(slide.kicker || 'BIOSPHERE / SLIDE') + '</div>' +
            '<h1 class="slide-title">' + escapeHTML(slide.title || currentDeck.title) + '</h1>' +
            '<p class="slide-subtitle">' + escapeHTML(slide.subtitle || 'Bổ sung sau khi kiểm chứng tài liệu.') + '</p>' +
            pointHtml + sourceHtml +
          '</section>' +
          '<div class="slide-side-content">' + (slide.visual ? renderVisual(slide.visual) : '') + linksHtml + '</div>' +
        '</div>' +
      '</article>';

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
    $('#shareExplanation').textContent = deck.isSeed
      ? 'Bài Bài 32 được đóng gói cùng website nên người nhận có thể mở liên kết trên thiết bị khác. Lưu ý: liên kết hiện chưa có mật khẩu; bản nháp hoặc tệp nhập khác vẫn chỉ lưu trên thiết bị này.'
      : 'Đây là đường dẫn mẫu. Bản nháp này chỉ lưu trên thiết bị hiện tại nên người nhận ở thiết bị khác chưa thể xem nội dung.';
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

  $('.brand').addEventListener('click', event => {
    event.preventDefault();
    showView('library');
  });

  $('#slideStage').addEventListener('click', event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left + bounds.width / 2) goPrevious();
    else goNext();
  });

  $('#searchDecks').addEventListener('input', renderDecks);
  $('#createForm').addEventListener('submit', event => {
    event.preventDefault();
    makeDeck(new FormData(event.currentTarget), event.currentTarget.dataset.template || 'science');
    event.currentTarget.dataset.template = 'science';
  });
  $('#jsonImport').addEventListener('change', () => {
    const file = $('#jsonImport').files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast('Tệp vượt quá giới hạn 2 MB.');
      $('#jsonImport').value = '';
      return;
    }
    importDeck();
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