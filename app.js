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
  let soundEnabled = true;
  let previousFocus = null;
  let quizSession = { deckId: null, slideIndex: -1, questionIndex: 0, answers: {}, score: 0 };
  let quizAudioContext = null;
  let atmosphereRunning = false;
  let atmosphereFrame = 0;
  let atmosphereLastPaint = 0;
  let atmosphereWidth = 0;
  let atmosphereHeight = 0;
  let atmosphereDpr = 1;
  let atmosphereParticles = [];
  let atmospherePointer = { x: 0.5, y: 0.5 };
  let atmosphereCanvasContext = null;

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
      digestive: "HỆ TIÊU HÓA", greeting: "CÙNG BẮT ĐẦU", team: "NHÓM THỰC HIỆN",
      pathway: "ĐƯỜNG ĐI CỦA THỨC ĂN", absorption: "LÔNG RUỘT NON · HẤP THỤ", balance: "DINH DƯỠNG HỢP LÝ", overview: "5 VẤN ĐỀ CẦN BIẾT",
      tooth: "SÂU RĂNG", toothcare: "CHĂM SÓC RĂNG", stomach: "DẠ DÀY · TÁ TRÀNG",
      stomachcare: "KHÁM VÀ ĐIỀU TRỊ ĐÚNG", water: "TIÊU CHẢY", watercare: "NƯỚC SẠCH · BÙ NƯỚC",
      food: "THỰC PHẨM AN TOÀN", foodsafety: "CHỌN · LÀM SẠCH · NẤU · BẢO QUẢN",
      fiber: "CHẤT XƠ · NƯỚC · VẬN ĐỘNG", comparison: "NHẬN BIẾT DẤU HIỆU",
      habits: "THÓI QUEN HẰNG NGÀY", sources: "NGUỒN ĐÁNG TIN CẬY", closing: "XIN CẢM ƠN"
    };
    const drawings = {
      digestive: '<svg viewBox="0 0 400 400" role="img" aria-label="Minh họa hệ tiêu hóa dạng 3D"><defs><linearGradient id="torso3d" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d3ffe8" stop-opacity=".55"/><stop offset=".48" stop-color="#65dca4" stop-opacity=".22"/><stop offset="1" stop-color="#1e7f5b" stop-opacity=".06"/></linearGradient><linearGradient id="gut3d" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd8bc"/><stop offset=".48" stop-color="#f19d99"/><stop offset="1" stop-color="#9e526f"/></linearGradient><filter id="soft3d"><feGaussianBlur stdDeviation="10"/></filter></defs><ellipse cx="210" cy="333" rx="105" ry="18" fill="#0c090f" opacity=".5" filter="url(#soft3d)"/><path d="M133 41 Q150 20 200 25 Q250 20 267 41 L314 113 L281 163 L272 331 Q200 364 128 331 L119 163 L86 113Z" fill="#56c997" opacity=".12" stroke="#a6f4ce" stroke-opacity=".7" stroke-width="2"/><path d="M136 48 Q154 28 200 33 Q246 28 264 48 L297 114 L271 153 L263 322 Q200 348 137 322 L129 153 L103 114Z" fill="url(#torso3d)" stroke="#d3ffe9" stroke-opacity=".4" stroke-width="2"/><path d="M191 65 C193 82 196 100 196 123" fill="none" stroke="#ffe2c5" stroke-width="14" stroke-linecap="round"/><path d="M195 116 C230 101 257 123 244 152 C234 176 211 177 211 201 C211 224 250 224 252 197" fill="none" stroke="url(#gut3d)" stroke-width="21" stroke-linecap="round"/><path d="M146 144 Q176 125 194 145 Q206 158 188 178" fill="none" stroke="#efaa99" stroke-width="15" stroke-linecap="round"/><path d="M151 198 C129 213 143 239 161 234 C183 229 169 211 190 208 C214 205 211 232 190 239 C169 246 157 266 177 278 C198 291 214 262 231 275 C251 291 225 311 204 300 C186 291 171 314 191 327 C211 339 235 326 239 304" fill="none" stroke="#ffcab6" stroke-width="13" stroke-linecap="round"/><path d="M140 194 Q118 219 130 274 Q143 300 163 293 M257 198 Q279 223 267 272 Q258 299 240 291" fill="none" stroke="#83e4b4" stroke-width="13" stroke-linecap="round"/><path d="M201 326 L201 342" stroke="#79ddb0" stroke-width="8" stroke-linecap="round"/><ellipse cx="159" cy="92" rx="33" ry="10" fill="#e7fff3" opacity=".16" transform="rotate(-25 159 92)"/><circle class="svg-pulse" cx="196" cy="122" r="7" fill="#ecfff5"/><circle class="svg-pulse delay-2" cx="251" cy="197" r="7" fill="#ffcab6"/><circle class="svg-pulse delay-3" cx="158" cy="264" r="6" fill="#b0f5cd"/></svg>',
      greeting: '<svg viewBox="0 0 400 400" role="img" aria-label="Khung cảnh chào mừng với các lớp kính nổi"><defs><linearGradient id="glassA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ceffdf" stop-opacity=".8"/><stop offset="1" stop-color="#55cda0" stop-opacity=".1"/></linearGradient><linearGradient id="glassB" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8cdef4" stop-opacity=".6"/><stop offset="1" stop-color="#8cdef4" stop-opacity=".04"/></linearGradient></defs><ellipse cx="205" cy="333" rx="115" ry="22" fill="#000" opacity=".28"/><g class="svg-float-slow" transform="rotate(-12 154 171)"><rect x="66" y="91" width="157" height="191" rx="24" fill="#39b782" opacity=".23" stroke="#cbffe4" stroke-opacity=".7" stroke-width="2"/><rect x="77" y="102" width="135" height="169" rx="18" fill="url(#glassA)" stroke="#ddfff0" stroke-opacity=".55"/><circle cx="144" cy="151" r="24" fill="#e4fff1" fill-opacity=".78"/><path d="M105 223 Q144 171 184 223" fill="#a4f4c9" fill-opacity=".7"/><path d="M99 246h87" stroke="#eafff2" stroke-opacity=".72" stroke-width="5" stroke-linecap="round"/></g><g class="svg-float" transform="rotate(11 256 207)"><rect x="189" y="117" width="139" height="175" rx="21" fill="#57cde1" fill-opacity=".2" stroke="#d3f9ff" stroke-opacity=".6" stroke-width="2"/><rect x="200" y="128" width="117" height="153" rx="15" fill="url(#glassB)"/><path d="M225 211 l21 23 43-50" fill="none" stroke="#edfffb" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M223 253h71" stroke="#dbfff3" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"/></g><g fill="#bdffdc"><path class="svg-sparkle" d="M278 65l6 16 16 6-16 6-6 16-6-16-16-6 16-6z"/><path class="svg-sparkle delay-2" d="M86 55l4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/></g><circle cx="333" cy="168" r="7" fill="#94e8f7" class="svg-pulse"/></svg>',
      team: '<svg viewBox="0 0 400 400" role="img" aria-label="Ba thành viên trong các khối kính nổi"><defs><linearGradient id="avatar1" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d6ffe8"/><stop offset="1" stop-color="#58ce98"/></linearGradient><linearGradient id="avatar2" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ccf6ff"/><stop offset="1" stop-color="#65bde2"/></linearGradient><linearGradient id="avatar3" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe3d6"/><stop offset="1" stop-color="#e88c9c"/></linearGradient></defs><ellipse cx="200" cy="329" rx="132" ry="25" fill="#000" opacity=".28"/><ellipse cx="200" cy="302" rx="114" ry="20" fill="#83e9b6" fill-opacity=".1" stroke="#acffd1" stroke-opacity=".35"/><g class="svg-float-slow" transform="translate(20 4)"><rect x="60" y="104" width="108" height="180" rx="25" fill="#76e1b1" fill-opacity=".12" stroke="#b6ffda" stroke-opacity=".55"/><circle cx="114" cy="152" r="28" fill="url(#avatar1)" stroke="#e8fff2" stroke-opacity=".8" stroke-width="2"/><path d="M78 256 Q77 205 114 205 Q151 205 150 256Z" fill="url(#avatar1)"/><path d="M96 149 Q113 118 133 148" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/></g><g class="svg-float" transform="translate(2 -15)"><rect x="146" y="70" width="108" height="218" rx="25" fill="#79dff2" fill-opacity=".15" stroke="#d1f9ff" stroke-opacity=".6"/><circle cx="200" cy="130" r="31" fill="url(#avatar2)" stroke="#f0ffff" stroke-opacity=".8" stroke-width="2"/><path d="M160 250 Q160 187 200 187 Q240 187 240 250Z" fill="url(#avatar2)"/><path d="M181 127 Q199 97 219 126" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/></g><g class="svg-float-slow" transform="translate(20 7)"><rect x="234" y="119" width="108" height="165" rx="25" fill="#f1a1aa" fill-opacity=".12" stroke="#ffd5df" stroke-opacity=".55"/><circle cx="288" cy="162" r="27" fill="url(#avatar3)" stroke="#fff0f3" stroke-opacity=".8" stroke-width="2"/><path d="M252 258 Q252 212 288 212 Q324 212 324 258Z" fill="url(#avatar3)"/><path d="M270 160 Q287 132 307 158" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="5" stroke-linecap="round"/></g><circle cx="75" cy="74" r="6" fill="#c2ffdd"/><circle cx="325" cy="90" r="8" fill="#a5eafa"/><path d="M79 89 L110 104 M312 104 L290 122" stroke="#b5f6d3" stroke-opacity=".55" stroke-dasharray="4 6"/></svg>',
      pathway: '<svg viewBox="0 0 400 400" role="img" aria-label="Các cơ quan theo hành trình tiêu hóa"><defs><linearGradient id="nodeA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e5fff0"/><stop offset="1" stop-color="#6ad9a6"/></linearGradient><linearGradient id="nodeB" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd9bf"/><stop offset="1" stop-color="#d97883"/></linearGradient></defs><path d="M65 100 C167 37 264 77 324 153 S286 278 191 309 S91 247 112 213" fill="none" stroke="#9aefc2" stroke-opacity=".42" stroke-width="3" stroke-dasharray="6 9"/><g class="svg-float-slow"><circle cx="94" cy="93" r="43" fill="#41bd8a" fill-opacity=".18" stroke="#c5ffe0" stroke-opacity=".65" stroke-width="2"/><circle cx="94" cy="93" r="32" fill="url(#nodeA)"/><path d="M80 82 Q94 73 108 82 Q119 95 101 107 Q90 115 82 103" fill="none" stroke="#197853" stroke-width="5" stroke-linecap="round"/><circle cx="305" cy="140" r="47" fill="#dd8893" fill-opacity=".14" stroke="#ffd7cf" stroke-opacity=".65" stroke-width="2"/><path d="M291 105 C290 123 304 128 316 130 C334 134 336 159 320 174 C304 189 277 174 277 153 C277 140 288 137 288 126Z" fill="url(#nodeB)"/><circle cx="217" cy="302" r="49" fill="#62d6a1" fill-opacity=".14" stroke="#bdffda" stroke-opacity=".65" stroke-width="2"/><path d="M190 282 Q176 300 192 318 Q208 333 221 311 Q236 294 250 310 Q266 324 247 337" fill="none" stroke="#bbfbd4" stroke-width="9" stroke-linecap="round"/></g><g class="svg-float"><circle cx="130" cy="220" r="29" fill="#a4e5f3" fill-opacity=".2" stroke="#d5fbff" stroke-width="2"/><path d="M117 204v32 M130 204v32 M143 204v32" stroke="#b8f3ff" stroke-width="4" stroke-linecap="round"/><circle cx="277" cy="264" r="23" fill="#8ae7b4" fill-opacity=".2" stroke="#d0ffe4" stroke-width="2"/><path d="M266 264l8 8 15-17" fill="none" stroke="#d4ffe7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g><g fill="#d6ffea"><path class="svg-sparkle" d="M215 76l5 13 13 5-13 5-5 13-5-13-13-5 13-5z"/><circle cx="65" cy="283" r="5"/><circle cx="344" cy="218" r="6"/></g></svg>',
      absorption: '<svg viewBox="0 0 400 400" role="img" aria-label="Lông ruột non và các hạt chất dinh dưỡng được hấp thụ"><defs><linearGradient id="villiBase" x1="0" y1="0" x2="0.9" y2="1"><stop stop-color="#ffd8c9"/><stop offset=".52" stop-color="#e98c9d"/><stop offset="1" stop-color="#964b79"/></linearGradient><radialGradient id="nutrientGlow"><stop stop-color="#fbfff0"/><stop offset=".46" stop-color="#b8f7d2"/><stop offset="1" stop-color="#52c99a"/></radialGradient></defs><ellipse cx="204" cy="328" rx="137" ry="20" fill="#000" opacity=".26"/><path d="M61 278 C92 251 124 292 154 269 S216 289 247 266 S308 282 339 259 L339 307 L61 307Z" fill="#9f557e" opacity=".75"/><path d="M62 268 C94 241 126 282 156 259 S218 279 249 256 S310 272 338 249" fill="none" stroke="#ffd9cf" stroke-width="20" stroke-linecap="round"/><g class="svg-float-slow" fill="url(#villiBase)" stroke="#ffdccc" stroke-width="3"><path d="M87 260 C73 233 70 205 84 184 C96 165 115 182 115 202 C115 223 105 244 105 264Z"/><path d="M128 263 C111 231 115 199 133 172 C150 147 170 172 165 196 C161 222 151 244 151 268Z"/><path d="M177 260 C164 230 165 199 184 178 C204 158 220 182 213 208 C207 231 202 246 201 264Z"/><path d="M222 257 C211 228 218 199 237 177 C256 155 274 181 265 207 C259 230 248 245 248 262Z"/><path d="M273 254 C262 229 273 205 288 189 C306 169 322 195 311 220 C304 238 297 247 297 259Z"/></g><g fill="none" stroke="#7edcb3" stroke-width="5" stroke-linecap="round"><path d="M97 250 C99 224 92 214 92 196"/><path d="M143 250 C144 219 151 203 148 186"/><path d="M191 246 C187 225 195 206 198 192"/><path d="M239 244 C241 219 248 206 250 191"/><path d="M287 241 C283 226 296 214 299 205"/></g><g class="svg-float"><circle cx="103" cy="130" r="13" fill="url(#nutrientGlow)"/><circle cx="160" cy="111" r="10" fill="#ffcf81"/><circle cx="214" cy="135" r="15" fill="url(#nutrientGlow)"/><circle cx="268" cy="109" r="11" fill="#8dddf2"/><circle cx="310" cy="150" r="8" fill="#ffd0a2"/></g><g fill="none" stroke="#c6ffdf" stroke-width="2.5" stroke-dasharray="4 8"><path d="M105 149 Q115 157 127 166"/><path d="M163 127 Q168 143 174 161"/><path d="M214 154 Q217 163 221 174"/><path d="M266 126 Q263 147 263 166"/><path d="M308 166 Q306 178 303 188"/></g><g fill="#e3fff0"><path class="svg-sparkle" d="M64 83l5 14 14 5-14 5-5 14-5-14-14-5 14-5z"/><path class="svg-sparkle delay-2" d="M324 67l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"/></g></svg>',
      balance: '<svg viewBox="0 0 400 400" role="img" aria-label="Đĩa dinh dưỡng cân bằng với thực phẩm nhiều màu"><defs><linearGradient id="plateOuter" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0fff5" stop-opacity=".8"/><stop offset=".4" stop-color="#9aeac2" stop-opacity=".3"/><stop offset="1" stop-color="#2c996e" stop-opacity=".12"/></linearGradient><linearGradient id="veg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b5f2a3"/><stop offset="1" stop-color="#29996b"/></linearGradient><linearGradient id="protein" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffc8a5"/><stop offset="1" stop-color="#c86175"/></linearGradient></defs><ellipse cx="202" cy="324" rx="126" ry="24" fill="#000" opacity=".3"/><ellipse class="svg-float-slow" cx="200" cy="196" rx="134" ry="127" fill="#071a12" opacity=".55" transform="translate(0 13)"/><circle class="svg-float" cx="200" cy="184" r="132" fill="url(#plateOuter)" stroke="#dcfff0" stroke-width="4"/><circle cx="200" cy="184" r="108" fill="#102d21" stroke="#d2ffe6" stroke-opacity=".55" stroke-width="3"/><path d="M200 76 A108 108 0 0 1 308 184 L200 184Z" fill="#eec66d"/><path d="M200 184 L308 184 A108 108 0 0 1 200 292Z" fill="url(#veg)"/><path d="M200 184 L200 292 A108 108 0 0 1 92 184Z" fill="url(#protein)"/><path d="M200 184 L92 184 A108 108 0 0 1 200 76Z" fill="#79cfe8"/><g fill="#fff9e7" stroke="#e0ad71" stroke-width="2"><circle cx="160" cy="125" r="13"/><circle cx="181" cy="141" r="11"/><circle cx="236" cy="133" r="13"/><circle cx="257" cy="151" r="9"/></g><g fill="#e4ffe7"><ellipse cx="239" cy="211" rx="22" ry="13" transform="rotate(-35 239 211)"/><ellipse cx="263" cy="236" rx="21" ry="12" transform="rotate(33 263 236)"/><ellipse cx="226" cy="244" rx="19" ry="12" transform="rotate(-12 226 244)"/></g><g fill="#ffdfc8"><ellipse cx="147" cy="223" rx="22" ry="13" transform="rotate(-30 147 223)"/><ellipse cx="170" cy="250" rx="22" ry="13" transform="rotate(20 170 250)"/><ellipse cx="133" cy="254" rx="16" ry="10" transform="rotate(55 133 254)"/></g><path d="M200 48v17m-16-11 6 12m26-12-6 12" stroke="#d3ffe7" stroke-width="3" stroke-linecap="round"/></svg>',
      overview: '<svg viewBox="0 0 400 400" role="img" aria-label="Năm quả cầu đại diện cho năm bệnh"><defs><radialGradient id="sphereMint" cx=".3" cy=".22" r=".8"><stop stop-color="#eafff1"/><stop offset=".35" stop-color="#81e5b3"/><stop offset="1" stop-color="#16744f"/></radialGradient><radialGradient id="sphereCoral" cx=".3" cy=".22" r=".8"><stop stop-color="#fff0e6"/><stop offset=".42" stop-color="#ffa9a5"/><stop offset="1" stop-color="#a84766"/></radialGradient><radialGradient id="sphereBlue" cx=".3" cy=".22" r=".8"><stop stop-color="#e9fdff"/><stop offset=".4" stop-color="#8edff0"/><stop offset="1" stop-color="#3a75ad"/></radialGradient></defs><ellipse cx="205" cy="330" rx="133" ry="20" fill="#000" opacity=".25"/><g class="svg-float-slow"><circle cx="200" cy="129" r="58" fill="url(#sphereMint)" stroke="#dbffeb" stroke-opacity=".72" stroke-width="2"/><ellipse cx="183" cy="111" rx="21" ry="12" fill="#fff" opacity=".26" transform="rotate(-30 183 111)"/><path d="M181 127h37m-30-12v25m22-25v25" stroke="#0c6b48" stroke-width="6" stroke-linecap="round"/><circle cx="111" cy="223" r="46" fill="url(#sphereCoral)" stroke="#ffe1dc" stroke-opacity=".8" stroke-width="2"/><path d="M91 227 Q108 191 126 225 M104 214l-6 24" fill="none" stroke="#953c5f" stroke-width="6" stroke-linecap="round"/><circle cx="285" cy="223" r="46" fill="url(#sphereBlue)" stroke="#e4fcff" stroke-opacity=".8" stroke-width="2"/><path d="M285 186 C276 205 264 218 264 235 C264 264 306 264 306 235 C306 218 294 205 285 186Z" fill="#e4fcff" fill-opacity=".86"/><circle cx="154" cy="309" r="35" fill="url(#sphereBlue)" stroke="#e4fcff" stroke-opacity=".7" stroke-width="2"/><path d="M138 298l16 20 18-24" fill="none" stroke="#215b87" stroke-width="5" stroke-linecap="round"/><circle cx="244" cy="309" r="35" fill="url(#sphereCoral)" stroke="#ffe1dc" stroke-opacity=".7" stroke-width="2"/><path d="M228 309h32m-16-16v32" stroke="#913c5c" stroke-width="5" stroke-linecap="round"/></g><circle cx="88" cy="89" r="5" fill="#d8ffea"/><circle cx="317" cy="92" r="8" fill="#94def2"/><circle cx="333" cy="282" r="5" fill="#ffcabf"/></svg>',
      tooth: '<svg viewBox="0 0 400 400" role="img" aria-label="Răng sâu minh họa có chiều sâu"><defs><linearGradient id="enamel3d" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffef3"/><stop offset=".4" stop-color="#d9ffe8"/><stop offset=".8" stop-color="#88ddb6"/><stop offset="1" stop-color="#3c9d77"/></linearGradient><linearGradient id="cavity3d" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a64e60"/><stop offset="1" stop-color="#54283f"/></linearGradient></defs><ellipse cx="208" cy="324" rx="101" ry="22" fill="#000" opacity=".34"/><path d="M122 62 C82 40 53 74 60 117 C67 161 91 190 106 237 C115 269 123 300 145 297 C169 294 165 236 190 208 C207 189 219 212 230 251 C242 291 258 311 277 291 C295 273 297 217 323 167 C348 117 324 66 286 59 C251 53 230 80 201 80 C169 80 145 47 122 62Z" transform="translate(13 14)" fill="#155b44" opacity=".75"/><path class="svg-float" d="M122 62 C82 40 53 74 60 117 C67 161 91 190 106 237 C115 269 123 300 145 297 C169 294 165 236 190 208 C207 189 219 212 230 251 C242 291 258 311 277 291 C295 273 297 217 323 167 C348 117 324 66 286 59 C251 53 230 80 201 80 C169 80 145 47 122 62Z" fill="url(#enamel3d)" stroke="#f5fff8" stroke-width="4"/><path d="M202 80 Q181 113 198 145 Q209 165 194 192" fill="none" stroke="url(#cavity3d)" stroke-width="20" stroke-linecap="round"/><path d="M193 83 Q215 110 211 131" fill="none" stroke="#fff" stroke-opacity=".58" stroke-width="7" stroke-linecap="round"/><ellipse cx="132" cy="107" rx="31" ry="13" fill="#fff" opacity=".47" transform="rotate(-30 132 107)"/><g fill="#f3a1a6" stroke="#ffe3e0" stroke-width="2"><circle cx="79" cy="61" r="9"/><circle cx="322" cy="92" r="8"/><circle cx="334" cy="148" r="11"/></g><g class="svg-sparkle" stroke="#9df3c1" stroke-width="3" stroke-linecap="round"><path d="M57 198v18m-9-9h18"/><path d="M321 233v16m-8-8h16"/></g></svg>',
      toothcare: '<svg viewBox="0 0 400 400" role="img" aria-label="Bàn chải làm sạch răng với các bọt sáng"><defs><linearGradient id="cleanTooth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffef5"/><stop offset=".6" stop-color="#c7fbe0"/><stop offset="1" stop-color="#6ccca1"/></linearGradient><linearGradient id="brushHandle" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e8fff2"/><stop offset="1" stop-color="#67d8a1"/></linearGradient></defs><ellipse cx="199" cy="326" rx="111" ry="19" fill="#000" opacity=".3"/><path d="M123 82 C90 61 69 94 77 128 C84 158 101 187 111 226 C119 254 128 279 147 278 C168 277 165 228 187 202 C202 184 217 209 226 242 C236 277 251 296 267 277 C284 257 289 211 309 170 C333 125 312 83 281 77 C251 70 230 95 205 94 C172 93 143 68 123 82Z" fill="url(#cleanTooth)" stroke="#effff6" stroke-width="3"/><path d="M72 284 L233 122 Q246 110 258 122 Q268 132 256 146 L93 308 Q77 310 72 296Z" fill="url(#brushHandle)" stroke="#e8fff3" stroke-width="2"/><path d="M231 124l24-24 35 35-24 24Z" fill="#dffaf0" stroke="#9decc4" stroke-width="3"/><g stroke="#4cbb8c" stroke-width="4" stroke-linecap="round"><path d="M244 116l14-13m-4 21 14-13m-4 21 14-13"/></g><g fill="#b1f4d0" stroke="#effff5" stroke-width="2"><circle cx="96" cy="63" r="12"/><circle cx="316" cy="80" r="8"/><circle cx="325" cy="214" r="14"/><circle cx="86" cy="193" r="7"/></g><path class="svg-sparkle" d="M304 264l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" fill="#dcfff0"/></svg>',
      stomach: '<svg viewBox="0 0 400 400" role="img" aria-label="Dạ dày có vùng niêm mạc tổn thương"><defs><linearGradient id="stomach3d" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd8c4"/><stop offset=".38" stop-color="#f19b9a"/><stop offset=".75" stop-color="#ce718b"/><stop offset="1" stop-color="#803b63"/></linearGradient><radialGradient id="ulcer"><stop stop-color="#6a294b"/><stop offset=".65" stop-color="#b94f72"/><stop offset="1" stop-color="#e68c97"/></radialGradient></defs><ellipse cx="207" cy="327" rx="118" ry="23" fill="#000" opacity=".32"/><path d="M155 48 C151 78 153 100 177 119 C202 138 229 139 264 131 C302 122 324 147 314 184 C303 230 263 254 236 281 C205 310 158 295 128 265 C97 234 80 197 99 158 C110 137 133 129 135 102 L134 49Z" transform="translate(11 10)" fill="#713c66" opacity=".55"/><path class="svg-float" d="M155 48 C151 78 153 100 177 119 C202 138 229 139 264 131 C302 122 324 147 314 184 C303 230 263 254 236 281 C205 310 158 295 128 265 C97 234 80 197 99 158 C110 137 133 129 135 102 L134 49Z" fill="url(#stomach3d)" stroke="#ffdfd0" stroke-width="4"/><path d="M158 71 C157 101 174 128 201 145 C232 166 267 160 292 171" fill="none" stroke="#7a345a" stroke-width="15" stroke-linecap="round"/><path d="M111 181 Q131 151 151 180 Q163 202 184 188 Q205 174 222 201 Q238 225 270 206" fill="none" stroke="#ffd8c7" stroke-width="10" stroke-linecap="round"/><ellipse cx="242" cy="188" rx="22" ry="27" fill="url(#ulcer)" stroke="#ffd0c0" stroke-width="4" transform="rotate(21 242 188)"/><ellipse cx="153" cy="218" rx="17" ry="20" fill="url(#ulcer)" stroke="#ffd0c0" stroke-width="4" transform="rotate(-12 153 218)"/><ellipse cx="122" cy="118" rx="29" ry="12" fill="#fff" opacity=".18" transform="rotate(-36 122 118)"/><g class="svg-pulse" fill="#ffd9c8"><circle cx="280" cy="97" r="6"/><circle cx="93" cy="244" r="7"/></g></svg>',
      stomachcare: '<svg viewBox="0 0 400 400" role="img" aria-label="Dạ dày được bảo vệ bởi tấm khiên y tế"><defs><linearGradient id="careShield" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d8ffea"/><stop offset=".55" stop-color="#73dfac"/><stop offset="1" stop-color="#23855e"/></linearGradient><linearGradient id="careStomach" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd6c4"/><stop offset="1" stop-color="#c96d8b"/></linearGradient></defs><ellipse cx="205" cy="331" rx="117" ry="20" fill="#000" opacity=".3"/><path d="M204 41 L322 84 V181 C322 250 270 298 204 333 C138 298 86 250 86 181 V84Z" fill="#59d59c" fill-opacity=".12" stroke="#c1ffdc" stroke-opacity=".6" stroke-width="3"/><path class="svg-float-slow" d="M204 58 L304 94 V178 C304 236 259 279 204 308 C149 279 104 236 104 178 V94Z" fill="url(#careShield)" fill-opacity=".87" stroke="#eafff1" stroke-width="3"/><path d="M174 111 C172 137 179 150 196 164 C217 182 239 176 259 173 C282 171 291 193 280 216 C265 247 236 264 215 278 C191 294 162 273 145 252 C128 231 122 204 136 183 C145 168 160 163 160 143 L160 111Z" fill="url(#careStomach)" stroke="#fff0e8" stroke-width="3"/><circle cx="232" cy="217" r="13" fill="#994461" stroke="#ffd0c0" stroke-width="4"/><path d="M202 110v44m-22-22h44" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M202 110v44m-22-22h44" stroke="#2c9d6c" stroke-width="5" stroke-linecap="round"/><circle cx="75" cy="116" r="7" fill="#b4f4d0"/><circle cx="333" cy="262" r="9" fill="#b3edff"/></svg>',
      water: '<svg viewBox="0 0 400 400" role="img" aria-label="Giọt nước trong suốt ba chiều"><defs><linearGradient id="waterOuter" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edfff8"/><stop offset=".24" stop-color="#b8f5ff"/><stop offset=".6" stop-color="#5fc5ec"/><stop offset="1" stop-color="#3679bd"/></linearGradient><linearGradient id="waterInner" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".84"/><stop offset="1" stop-color="#9fe8ff" stop-opacity=".05"/></linearGradient></defs><ellipse cx="205" cy="331" rx="95" ry="20" fill="#000" opacity=".28"/><path class="svg-float" d="M200 48 C171 97 108 163 108 226 C108 282 148 321 200 321 C252 321 292 282 292 226 C292 163 229 97 200 48Z" transform="translate(12 13)" fill="#266ca4" opacity=".58"/><path class="svg-float" d="M200 42 C171 91 108 157 108 220 C108 276 148 315 200 315 C252 315 292 276 292 220 C292 157 229 91 200 42Z" fill="url(#waterOuter)" stroke="#e6ffff" stroke-width="4"/><path d="M159 212 C159 247 177 271 205 274" fill="none" stroke="url(#waterInner)" stroke-width="15" stroke-linecap="round"/><ellipse cx="164" cy="152" rx="26" ry="49" fill="#fff" opacity=".27" transform="rotate(31 164 152)"/><g fill="#dffbff" stroke="#fff" stroke-opacity=".65" stroke-width="2"><circle cx="95" cy="105" r="10"/><circle cx="311" cy="132" r="14"/><circle cx="314" cy="254" r="7"/><circle cx="82" cy="260" r="6"/></g><path class="svg-sparkle" d="M294 67l7 18 18 7-18 7-7 18-7-18-18-7 18-7z" fill="#baf4ff"/></svg>',
      watercare: '<svg viewBox="0 0 400 400" role="img" aria-label="Ly nước và gói bù nước minh họa"><defs><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edffff" stop-opacity=".8"/><stop offset=".48" stop-color="#9bdef4" stop-opacity=".27"/><stop offset="1" stop-color="#5a9fd5" stop-opacity=".18"/></linearGradient><linearGradient id="ors" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffefb8"/><stop offset="1" stop-color="#e9ad5f"/></linearGradient></defs><ellipse cx="205" cy="330" rx="125" ry="20" fill="#000" opacity=".3"/><g class="svg-float-slow"><path d="M126 90h110l-10 203q-4 24-23 24h-47q-19 0-23-24Z" fill="url(#glass)" stroke="#ddfbff" stroke-width="4"/><path d="M131 183h100l-5 97q-3 20-18 20h-50q-15 0-18-20Z" fill="#6fd1ee" fill-opacity=".75"/><ellipse cx="181" cy="183" rx="50" ry="8" fill="#d6f8ff" fill-opacity=".55"/><path d="M146 120l7 150" stroke="#fff" stroke-opacity=".5" stroke-width="7" stroke-linecap="round"/></g><g class="svg-float" transform="rotate(9 279 230)"><path d="M244 143h81l-8 153q-1 12-14 12h-36q-13 0-14-12Z" fill="url(#ors)" stroke="#fff0c5" stroke-width="3"/><path d="M243 163h82" stroke="#d39a4b" stroke-width="3"/><rect x="256" y="208" width="57" height="49" rx="7" fill="#fff9e7" fill-opacity=".82"/><path d="M268 224h32m-32 10h25m-25 10h29" stroke="#c88d4f" stroke-width="3" stroke-linecap="round"/></g><circle cx="100" cy="104" r="9" fill="#a8eafa"/><path d="M301 91l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" fill="#d9ffeb" class="svg-sparkle"/></svg>',
      food: '<svg viewBox="0 0 400 400" role="img" aria-label="Mâm thực phẩm tươi nhiều màu"><defs><linearGradient id="foodPlate" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eafff1" stop-opacity=".9"/><stop offset=".5" stop-color="#8be5b5" stop-opacity=".32"/><stop offset="1" stop-color="#297d5a" stop-opacity=".2"/></linearGradient><linearGradient id="tomato" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffbab1"/><stop offset="1" stop-color="#c94c70"/></linearGradient><linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b7f3a5"/><stop offset="1" stop-color="#238f61"/></linearGradient></defs><ellipse cx="203" cy="324" rx="131" ry="24" fill="#000" opacity=".28"/><ellipse cx="200" cy="194" rx="137" ry="130" fill="#11412d" opacity=".65" transform="translate(0 13)"/><ellipse class="svg-float" cx="200" cy="184" rx="137" ry="130" fill="url(#foodPlate)" stroke="#e4fff0" stroke-width="4"/><ellipse cx="200" cy="184" rx="113" ry="106" fill="#0e2118" stroke="#baf5d1" stroke-opacity=".55" stroke-width="3"/><g class="svg-float-slow"><circle cx="151" cy="134" r="36" fill="url(#tomato)"/><path d="M151 100l-6 13 13-4 8 10-2-16" fill="#7ee0a5"/><ellipse cx="238" cy="128" rx="28" ry="38" fill="#f4d082" transform="rotate(22 238 128)"/><path d="M222 112l31 31m-22-44 31 31" stroke="#fff0b6" stroke-opacity=".7" stroke-width="5"/><g fill="url(#leaf)" stroke="#c7ffc0" stroke-width="2"><ellipse cx="247" cy="206" rx="24" ry="39" transform="rotate(35 247 206)"/><ellipse cx="216" cy="219" rx="21" ry="36" transform="rotate(-20 216 219)"/><ellipse cx="267" cy="234" rx="21" ry="31" transform="rotate(52 267 234)"/></g><path d="M124 205q-7-48 28-57q35 17 19 56q-16 31-47 1Z" fill="#b9e9fb"/><path d="M129 193l32-30m-28 51 35-31" stroke="#f2fcff" stroke-width="4"/><circle cx="146" cy="251" r="22" fill="#ffc28f"/><circle cx="146" cy="251" r="12" fill="#f9e5a8"/><circle cx="177" cy="267" r="18" fill="#b0e9f3"/></g><g fill="#e5fff0"><circle cx="93" cy="115" r="5"/><circle cx="303" cy="91" r="7"/><circle cx="315" cy="258" r="5"/></g></svg>',
      foodsafety: '<svg viewBox="0 0 400 400" role="img" aria-label="Thực phẩm an toàn được bảo vệ bằng khiên 3D"><defs><linearGradient id="safeShield" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eafff1"/><stop offset=".45" stop-color="#83e8b3"/><stop offset="1" stop-color="#2d9668"/></linearGradient><linearGradient id="safePlate" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4fff6"/><stop offset="1" stop-color="#64c99b"/></linearGradient></defs><ellipse cx="203" cy="326" rx="125" ry="22" fill="#000" opacity=".3"/><ellipse cx="160" cy="253" rx="82" ry="31" fill="#0d3423" stroke="#b9f8d3" stroke-opacity=".6" stroke-width="3"/><ellipse cx="160" cy="245" rx="79" ry="29" fill="url(#safePlate)" stroke="#e5fff0" stroke-width="3"/><circle cx="136" cy="237" r="17" fill="#ffb4ac"/><ellipse cx="176" cy="233" rx="13" ry="23" fill="#edcf82" transform="rotate(25 176 233)"/><path d="M199 38 L309 80 V167 C309 231 261 276 199 309 C137 276 89 231 89 167 V80Z" transform="translate(13 12)" fill="#12472f" opacity=".58"/><path class="svg-float" d="M199 38 L309 80 V167 C309 231 261 276 199 309 C137 276 89 231 89 167 V80Z" fill="url(#safeShield)" fill-opacity=".9" stroke="#eafff1" stroke-width="4"/><path d="M145 169l35 36 76-86" fill="none" stroke="#126b49" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><path d="M147 164l33 35 73-82" fill="none" stroke="#edfff4" stroke-opacity=".65" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><g fill="#b9f7d2"><circle cx="76" cy="116" r="7"/><circle cx="327" cy="225" r="9"/></g></svg>',
      fiber: '<svg viewBox="0 0 400 400" role="img" aria-label="Táo, rau xanh và nước cho hệ tiêu hóa"><defs><linearGradient id="apple3d" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffedb1"/><stop offset=".45" stop-color="#ffad87"/><stop offset="1" stop-color="#be536d"/></linearGradient><linearGradient id="glassBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#edffff" stop-opacity=".7"/><stop offset="1" stop-color="#63bce8" stop-opacity=".4"/></linearGradient></defs><ellipse cx="204" cy="325" rx="118" ry="22" fill="#000" opacity=".29"/><g class="svg-float"><path d="M175 100 C143 74 97 95 91 141 C83 197 126 258 161 257 C181 257 187 244 203 257 C233 280 283 210 278 151 C274 104 230 77 196 100 C188 106 181 106 175 100Z" transform="translate(9 9)" fill="#863d58" opacity=".55"/><path d="M175 100 C143 74 97 95 91 141 C83 197 126 258 161 257 C181 257 187 244 203 257 C233 280 283 210 278 151 C274 104 230 77 196 100 C188 106 181 106 175 100Z" fill="url(#apple3d)" stroke="#ffe6c8" stroke-width="4"/><path d="M185 96 C181 71 192 52 216 44" fill="none" stroke="#a6eeb7" stroke-width="10" stroke-linecap="round"/><path d="M202 58 Q238 35 253 62 Q228 86 202 76Z" fill="#75d9a0" stroke="#caffdc" stroke-width="2"/></g><g class="svg-float-slow" transform="rotate(8 286 243)"><path d="M273 169h65l-8 136q-1 15-13 15h-25q-12 0-13-15Z" fill="url(#glassBlue)" stroke="#e7ffff" stroke-width="3"/><path d="M277 235h58l-5 65q-1 10-10 10h-26q-9 0-10-10Z" fill="#70d1ed" fill-opacity=".6"/><ellipse cx="305" cy="235" rx="29" ry="6" fill="#edffff" fill-opacity=".65"/></g><g fill="#8ce5a8" stroke="#d6ffe3" stroke-width="2"><ellipse cx="85" cy="264" rx="19" ry="35" transform="rotate(-24 85 264)"/><ellipse cx="112" cy="277" rx="17" ry="29" transform="rotate(42 112 277)"/></g><circle cx="303" cy="117" r="8" fill="#9eeef5"/><path class="svg-sparkle" d="M91 77l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" fill="#c9ffdc"/></svg>',
      comparison: '<svg viewBox="0 0 400 400" role="img" aria-label="Năm thẻ nổi so sánh các bệnh tiêu hóa"><defs><linearGradient id="tileMint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e5fff0"/><stop offset="1" stop-color="#69d9a4"/></linearGradient><linearGradient id="tileRose" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe4d9"/><stop offset="1" stop-color="#da8197"/></linearGradient><linearGradient id="tileBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e1fbff"/><stop offset="1" stop-color="#75c9e5"/></linearGradient></defs><ellipse cx="203" cy="330" rx="137" ry="20" fill="#000" opacity=".26"/><g class="svg-float-slow" transform="rotate(-12 118 152)"><rect x="65" y="75" width="105" height="145" rx="19" fill="#1c694a" opacity=".7" transform="translate(6 8)"/><rect x="65" y="75" width="105" height="145" rx="19" fill="url(#tileMint)" stroke="#eafff1" stroke-width="2"/><circle cx="118" cy="131" r="26" fill="#f9fff9" fill-opacity=".62"/><path d="M104 122h28m-22-9v22m16-22v22" stroke="#218257" stroke-width="5" stroke-linecap="round"/><path d="M90 175h56" stroke="#2a9667" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/></g><g class="svg-float" transform="rotate(8 208 176)"><rect x="157" y="96" width="103" height="148" rx="18" fill="#5e315a" opacity=".6" transform="translate(6 8)"/><rect x="157" y="96" width="103" height="148" rx="18" fill="url(#tileRose)" stroke="#fff0ec" stroke-width="2"/><circle cx="208" cy="151" r="25" fill="#fff8f3" fill-opacity=".62"/><path d="M194 150q-3-19 15-22q22 2 21 20q-4 17-24 20q-13-2-12-18" fill="none" stroke="#bb5d78" stroke-width="5"/><path d="M181 201h54" stroke="#ba5674" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/></g><g class="svg-float-slow" transform="rotate(-5 291 212)"><rect x="252" y="144" width="91" height="133" rx="18" fill="#275f7d" opacity=".65" transform="translate(5 8)"/><rect x="252" y="144" width="91" height="133" rx="18" fill="url(#tileBlue)" stroke="#edffff" stroke-width="2"/><circle cx="297" cy="195" r="21" fill="#fff" fill-opacity=".72"/><path d="M297 178c-8 14-15 22-15 29q0 15 15 15t15-15c0-7-7-15-15-29Z" fill="#57a9d5"/><path d="M269 245h56" stroke="#4294bc" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/></g><circle cx="77" cy="270" r="9" fill="#a3edc2"/><circle cx="330" cy="94" r="7" fill="#a8ebfa"/><path class="svg-sparkle" d="M218 56l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill="#d8ffea"/></svg>',
      habits: '<svg viewBox="0 0 400 400" role="img" aria-label="Sáu thói quen sức khỏe xoay quanh lõi trung tâm"><defs><radialGradient id="habitCore" cx=".28" cy=".22" r=".85"><stop stop-color="#eafff1"/><stop offset=".4" stop-color="#89e8b5"/><stop offset="1" stop-color="#23865e"/></radialGradient><linearGradient id="habitBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e8fcff"/><stop offset="1" stop-color="#6cc6e5"/></linearGradient></defs><ellipse cx="205" cy="321" rx="125" ry="24" fill="#000" opacity=".26"/><ellipse cx="200" cy="192" rx="133" ry="115" fill="none" stroke="#a9f4cb" stroke-opacity=".35" stroke-width="2" stroke-dasharray="5 8" transform="rotate(-18 200 192)"/><circle class="svg-float" cx="200" cy="192" r="65" fill="url(#habitCore)" stroke="#e9fff2" stroke-width="4"/><path d="M171 192l20 20 40-45" fill="none" stroke="#176947" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><g class="svg-float-slow"><circle cx="94" cy="102" r="31" fill="url(#habitBlue)" stroke="#f0ffff" stroke-width="2"/><path d="M80 101q14-19 28 0l-3 14H83Z" fill="#4ea7cd"/><circle cx="301" cy="102" r="31" fill="#f5cd80" stroke="#fff4d0" stroke-width="2"/><path d="M289 108q12-30 24 0q-12 17-24 0" fill="#f3fff0"/><circle cx="324" cy="225" r="31" fill="#e9a0aa" stroke="#ffe9ec" stroke-width="2"/><path d="M311 225h26m-13-13v26" stroke="#974961" stroke-width="5" stroke-linecap="round"/><circle cx="249" cy="305" r="31" fill="#93e8ae" stroke="#e7fff0" stroke-width="2"/><path d="M236 303q13-15 26 0m-22 7q9 6 18 0" fill="none" stroke="#2b8e5d" stroke-width="4" stroke-linecap="round"/><circle cx="77" cy="238" r="31" fill="url(#habitBlue)" stroke="#f0ffff" stroke-width="2"/><path d="M67 227l10 11-10 12m20-23-10 11 10 12" fill="none" stroke="#4a9fca" stroke-width="4" stroke-linecap="round"/><circle cx="151" cy="312" r="31" fill="#e6b1e9" stroke="#f9e7ff" stroke-width="2"/><path d="M139 312h24m-12-12v24" stroke="#9657a1" stroke-width="4" stroke-linecap="round"/></g><g stroke="#b8f8d3" stroke-opacity=".65" stroke-width="2"><path d="M119 124l37 36M275 124l-29 36M299 211l-33-8M237 280l-14-29M102 253l45-31M166 287l18-33"/></g><circle cx="201" cy="105" r="5" fill="#dffff0"/></svg>',
      sources: '<svg viewBox="0 0 400 400" role="img" aria-label="Sổ tay khoa học và tài liệu tham khảo ba chiều"><defs><linearGradient id="bookCover" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d4ffe6"/><stop offset=".52" stop-color="#6edda7"/><stop offset="1" stop-color="#267b59"/></linearGradient><linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffef1"/><stop offset="1" stop-color="#d1efdd"/></linearGradient><linearGradient id="bookBlue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dffaff"/><stop offset="1" stop-color="#67bfe0"/></linearGradient></defs><ellipse cx="201" cy="324" rx="129" ry="21" fill="#000" opacity=".28"/><g class="svg-float-slow" transform="rotate(-9 166 205)"><rect x="80" y="94" width="146" height="218" rx="14" fill="#246b4e" transform="translate(8 9)"/><rect x="80" y="94" width="146" height="218" rx="14" fill="url(#bookCover)" stroke="#eafff1" stroke-width="3"/><rect x="93" y="109" width="120" height="188" rx="7" fill="url(#paper)"/><path d="M109 141h86m-86 20h78m-78 20h87m-87 20h65" stroke="#79b799" stroke-width="5" stroke-linecap="round"/><circle cx="153" cy="248" r="26" fill="#b1efc9"/><path d="M137 251l12 12 23-28" fill="none" stroke="#27875d" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g><g class="svg-float" transform="rotate(11 261 208)"><rect x="220" y="128" width="100" height="173" rx="13" fill="#316e8a" opacity=".8" transform="translate(6 8)"/><rect x="220" y="128" width="100" height="173" rx="13" fill="url(#bookBlue)" stroke="#e8fdff" stroke-width="3"/><path d="M237 159h65m-65 15h54m-54 15h60" stroke="#efffff" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"/><circle cx="270" cy="238" r="24" fill="#fff" fill-opacity=".65"/><path d="M259 239l8 8 16-19" fill="none" stroke="#468eb4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g><g fill="#b9f5d1"><circle cx="70" cy="78" r="7"/><circle cx="327" cy="97" r="9"/></g><path class="svg-sparkle" d="M300 61l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" fill="#d9fff0"/></svg>',
      closing: '<svg viewBox="0 0 400 400" role="img" aria-label="Cảnh kết thúc với ánh sáng và những dải chuyển động"><defs><radialGradient id="closingCore"><stop stop-color="#e9fff1" stop-opacity=".95"/><stop offset=".45" stop-color="#82eab3" stop-opacity=".5"/><stop offset="1" stop-color="#4ac58e" stop-opacity="0"/></radialGradient><linearGradient id="ribbonA" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d7ffe9"/><stop offset=".48" stop-color="#81e4b1"/><stop offset="1" stop-color="#3d9fce"/></linearGradient></defs><ellipse cx="203" cy="333" rx="124" ry="19" fill="#000" opacity=".24"/><circle cx="200" cy="190" r="132" fill="url(#closingCore)"/><ellipse class="svg-float-slow" cx="200" cy="192" rx="99" ry="125" fill="none" stroke="#aaf5ca" stroke-opacity=".65" stroke-width="2" transform="rotate(35 200 192)"/><ellipse class="svg-float" cx="200" cy="192" rx="125" ry="78" fill="none" stroke="#92e5f0" stroke-opacity=".75" stroke-width="3" transform="rotate(-34 200 192)"/><ellipse cx="200" cy="192" rx="78" ry="120" fill="none" stroke="#effff5" stroke-opacity=".3" stroke-width="2" transform="rotate(67 200 192)"/><circle cx="200" cy="190" r="50" fill="url(#ribbonA)" stroke="#eafff2" stroke-width="3"/><path d="M172 190l19 19 39-42" fill="none" stroke="#196b49" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><g fill="#e5fff0"><path class="svg-sparkle" d="M108 71l7 18 18 7-18 7-7 18-7-18-18-7 18-7z"/><path class="svg-sparkle delay-2" d="M304 251l5 13 13 5-13 5-5 13-5-13-13-5 13-5z"/><circle cx="306" cy="95" r="6"/><circle cx="83" cy="258" r="5"/></g></svg>'
    };
    const fallback = drawings.digestive;
    const image = drawings[type] || fallback;
    const safeType = /^[a-z]+$/.test(type) ? type : "digestive";
    const sceneNumber = String(Object.keys(captions).indexOf(type) + 1).padStart(2, "0");
    return '<aside class="slide-art scene scene--' + safeType + '" aria-label="' + escapeHTML(captions[type] || "Minh họa khoa học") + '">' +
      '<div class="art-backplane"></div><div class="art-orbit art-orbit--one"></div><div class="art-orbit art-orbit--two"></div>' +
      '<div class="art-bloom art-bloom--a"></div><div class="art-bloom art-bloom--b"></div>' +
      '<div class="art-illustration">' + image + '</div>' +
      '<div class="art-glass-chip"><span></span> BIOLOGY / 3D VISUAL</div>' +
      '<div class="art-caption"><i></i><span>' + escapeHTML(captions[type] || "BIOSPHERE / SCIENCE") + '</span><b>' + sceneNumber + '</b></div>' +
    '</aside>';
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
            ${deck.slides?.[0]?.image ? '<img class="deck-cover-photo" src="' + escapeHTML(deck.slides[0].image) + '" alt="" loading="lazy" decoding="async" data-fallback="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1000&q=70">' : ''}
            <div class="deck-cover-shade"></div>
            <div class="cover-top"><span>${formatSubject(deck.subject)}</span><span>${String(position + 1).padStart(2, '0')} / ${escapeHTML(deck.date || 'LOCAL')}</span></div>
            <div class="cover-title">${escapeHTML(deck.title)}</div>
            <div class="cover-foot"><span>BIOSPHERE / SLIDES</span><span>${deck.isSeed ? 'BÀI 32 · TƯƠNG TÁC' : 'BẢN NHÁP'}</span></div>
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
    attachLiveImageFallbacks($('#deckGrid'));
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
  attachLiveImageFallbacks(document);
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
    startStageAtmosphere();
    $('#viewerDeckTitle').textContent = currentDeck.title;
    renderSlide();
    if (location.hash !== '#present/' + encodeURIComponent(currentDeck.id)) {
      history.pushState({ presentation: currentDeck.id }, '', '#present/' + encodeURIComponent(currentDeck.id));
    }
  }

  function renderPhoto(slide) {
    const fallback = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=75';
    const url = String(slide.image || '').trim();
    if (!url) return renderVisual(slide.visual);
    const credit = slide.imageCredit || 'Nguồn ảnh được ghi kèm';
    const source = slide.imageSourceUrl || url;
    const palette = slide.palette || 'ocean';
    const photoTotal = currentDeck?.slides?.length || 20;
    const photoNo = String(slideIndex + 1).padStart(2, '0') + ' / ' + String(photoTotal).padStart(2, '0');
    const supports = Array.isArray(slide.supportImages) ? slide.supportImages.slice(0, 2) : [];
    const supportMarkup = supports.length ? '<div class="photo-support-stack">' + supports.map((item, i) =>
      '<a class="photo-support-card photo-support-card--' + (i + 1) + '" href="' + escapeHTML(item.sourceUrl || item.url || source) + '" target="_blank" rel="noopener noreferrer" aria-label="' + escapeHTML(item.alt || 'Mở nguồn ảnh bổ sung') + '">' +
        '<img class="photo-support-image" src="' + escapeHTML(item.url || '') + '" alt="' + escapeHTML(item.alt || '') + '" loading="eager" decoding="async" data-fallback="' + fallback + '">' +
      '</a>'
    ).join('') + '</div>' : '';
    return '<aside class="photo-scene" data-palette="' + escapeHTML(palette) + '" aria-label="' + escapeHTML(slide.imageAlt || 'Ảnh minh họa thực tế') + '">' +
      '<div class="photo-halo photo-halo--one"></div><div class="photo-halo photo-halo--two"></div>' +
      '<div class="photo-frame">' +
        '<img class="live-photo" src="' + escapeHTML(url) + '" alt="' + escapeHTML(slide.imageAlt || 'Ảnh thực tế liên quan đến nội dung') + '" loading="eager" decoding="async" fetchpriority="high" referrerpolicy="no-referrer" data-fallback="' + fallback + '">' +
        '<div class="photo-color-wash"></div><div class="photo-vignette"></div>' +
        '<div class="photo-topline"><span><i></i> ẢNH THỰC / LIVE SOURCE</span><b>' + photoNo + '</b></div>' +
        '<div class="photo-bottomline"><div class="photo-caption-copy"><span>FIELD VISUAL</span><strong>' + escapeHTML(slide.imageAlt || 'Ảnh minh họa') + '</strong></div>' +
        '<a class="photo-source-link" href="' + escapeHTML(source) + '" target="_blank" rel="noopener noreferrer" aria-label="Mở nguồn ảnh: ' + escapeHTML(credit) + '">Nguồn ảnh <span>↗</span></a></div>' +
        '<div class="photo-focus-ring"></div>' +
      '</div>' + supportMarkup +
      '<div class="photo-credit-line"><span><i></i> SOURCE / ATTRIBUTION</span><strong>' + escapeHTML(credit) + '</strong></div>' +
      '<div class="photo-scanline"></div>' +
    '</aside>';
  }

  function attachLiveImageFallbacks(root = document) {
    $('.live-photo, .photo-support-image, .deck-cover-photo, .hero-photo-img', root).forEach(img => {
      if (img.dataset.fallbackBound === '1') return;
      img.dataset.fallbackBound = '1';
      img.addEventListener('error', () => {
        const fallback = img.dataset.fallback;
        if (fallback && img.dataset.fallbackUsed !== '1' && img.src !== fallback) {
          img.dataset.fallbackUsed = '1';
          img.src = fallback;
          return;
        }
        img.classList.add('photo-load-failed');
        img.closest('.photo-frame, .photo-support-card, .deck-cover, .hero-photo-card')?.classList.add('photo-failed');
      });
    });
  }

  function warmAdjacentPhotos() {
    if (!currentDeck || typeof Image === 'undefined') return;
    const slides = Array.isArray(currentDeck.slides) ? currentDeck.slides : [];
    [slideIndex - 1, slideIndex + 1].forEach(index => {
      const url = slides[index]?.image;
      if (url && index >= 0 && index < slides.length) {
        const preload = new Image();
        preload.decoding = 'async';
        preload.src = url;
      }
    });
  }

  function renderQuiz(slide) {
    const questions = Array.isArray(slide.quizQuestions) ? slide.quizQuestions : [];
    if (!questions.length) return '';
    if (quizSession.deckId !== currentDeck.id || quizSession.slideIndex !== slideIndex) {
      quizSession = { deckId: currentDeck.id, slideIndex, questionIndex: 0, answers: {}, score: 0 };
    }
    const total = questions.length;
    const index = quizSession.questionIndex;
    if (index >= total) {
      const percent = Math.round((quizSession.score / total) * 100);
      const resultLabel = percent === 100 ? 'Xuất sắc — cả lớp nắm bài rất chắc!' : percent >= 60 ? 'Tốt lắm — cùng xem lại những câu còn sai nhé.' : 'Chưa sao — mình xem lời giải, rồi thử lại nhé!';
      const recap = questions.map((question, i) => {
        const chosen = quizSession.answers[i];
        const right = chosen === question.correctIndex;
        return '<div class="quiz-recap-row ' + (right ? 'is-correct' : 'is-wrong') + '"><span class="quiz-recap-icon">' + (right ? '✓' : '↺') + '</span><div><strong>Câu ' + (i + 1) + '</strong><p>' + escapeHTML(question.options[question.correctIndex]) + '</p></div></div>';
      }).join('');
      return '<section class="quiz-panel quiz-results"><div class="quiz-panel-top"><span><i></i> KẾT QUẢ THỬ THÁCH</span><b>' + total + ' CÂU</b></div>' +
        '<div class="quiz-score-orb"><span>ĐIỂM CỦA EM</span><strong>' + quizSession.score + '<small>/' + total + '</small></strong><div class="quiz-score-meter"><i style="width:' + percent + '%"></i></div></div>' +
        '<h3>' + resultLabel + '</h3><p class="quiz-result-subtitle">Mỗi câu trả lời là một cơ hội để nhớ kiến thức lâu hơn.</p>' +
        '<div class="quiz-recap-list">' + recap + '</div><button class="quiz-action quiz-action-primary" data-quiz-restart><span>↻</span> Chơi lại từ đầu</button></section>';
    }
    const question = questions[index];
    const hasAnswer = Object.prototype.hasOwnProperty.call(quizSession.answers, index);
    const selected = hasAnswer ? quizSession.answers[index] : null;
    const correct = hasAnswer && selected === question.correctIndex;
    const options = question.options.map((option, optionIndex) => {
      const isCorrect = hasAnswer && optionIndex === question.correctIndex;
      const isSelected = hasAnswer && optionIndex === selected;
      const stateClass = isCorrect ? ' is-correct' : isSelected ? ' is-wrong' : '';
      const symbol = isCorrect ? '<span class="quiz-option-result">✓</span>' : isSelected ? '<span class="quiz-option-result">×</span>' : '<span class="quiz-option-letter">' + String.fromCharCode(65 + optionIndex) + '</span>';
      return '<button class="quiz-answer' + stateClass + '" data-quiz-answer="' + optionIndex + '" ' + (hasAnswer ? 'disabled ' : '') + 'aria-pressed="' + String(isSelected) + '">' + symbol + '<span class="quiz-answer-text">' + escapeHTML(option) + '</span><span class="quiz-answer-shimmer"></span></button>';
    }).join('');
    const feedback = hasAnswer
      ? '<div class="quiz-feedback ' + (correct ? 'is-correct' : 'is-wrong') + '" role="status"><span class="quiz-feedback-icon">' + (correct ? '✓' : '↺') + '</span><div><strong>' + (correct ? 'Chính xác! +1 điểm' : 'Chưa đúng — cùng xem đáp án nhé') + '</strong><p>' + escapeHTML(question.explanation) + '</p></div></div>' +
        '<button class="quiz-action quiz-action-primary" data-quiz-next>' + (index === total - 1 ? 'Xem kết quả' : 'Câu tiếp theo') + ' <span>→</span></button>'
      : '<div class="quiz-encouragement"><span>◉</span> Chọn A, B, C hoặc D — đáp án sẽ được mở sau khi em chọn.</div>';
    return '<section class="quiz-panel" aria-label="Câu hỏi tương tác">' +
      '<div class="quiz-panel-top"><span><i></i> LỚP HỌC TƯƠNG TÁC</span><b>CÂU ' + String(index + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') + '</b></div>' +
      '<div class="quiz-progress"><i style="width:' + (((index + (hasAnswer ? 1 : 0)) / total) * 100) + '%"></i></div>' +
      '<div class="quiz-question-label"><span>THỬ THÁCH KIẾN THỨC</span><strong>' + escapeHTML(question.question) + '</strong></div>' +
      '<div class="quiz-answers">' + options + '</div>' + feedback +
      '<div class="quiz-score-strip"><span><i>✦</i> ĐIỂM HIỆN TẠI</span><strong>' + quizSession.score + ' <small>/ ' + total + '</small></strong><span class="quiz-sound-hint">' + (soundEnabled ? '♫ Âm thanh bật' : '♪ Âm thanh tắt') + '</span></div>' +
    '</section>';
  }

  function answerQuiz(optionIndex) {
    const slide = currentDeck?.slides?.[slideIndex];
    if (!slide?.interactiveQuiz || !Array.isArray(slide.quizQuestions)) return;
    const index = quizSession.questionIndex;
    const question = slide.quizQuestions[index];
    if (!question || Object.prototype.hasOwnProperty.call(quizSession.answers, index)) return;
    const isCorrect = Number(optionIndex) === question.correctIndex;
    quizSession.answers[index] = Number(optionIndex);
    if (isCorrect) quizSession.score += 1;
    playQuizSound(isCorrect);
    renderSlide();
  }

  function nextQuizQuestion() {
    const slide = currentDeck?.slides?.[slideIndex];
    if (!slide?.interactiveQuiz) return;
    quizSession.questionIndex = Math.min(quizSession.questionIndex + 1, slide.quizQuestions.length);
    playSlideSound(true);
    renderSlide();
  }

  function restartQuiz() {
    const slide = currentDeck?.slides?.[slideIndex];
    if (!slide?.interactiveQuiz) return;
    quizSession = { deckId: currentDeck.id, slideIndex, questionIndex: 0, answers: {}, score: 0 };
    playQuizSound(true, true);
    renderSlide();
  }

  function playQuizSound(correct, soft = false) {
    if (!soundEnabled) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      quizAudioContext ||= new AudioCtor();
      const context = quizAudioContext;
      if (context.state === 'suspended') context.resume();
      const now = context.currentTime;
      const tones = correct ? (soft ? [523, 659] : [523, 659, 784]) : [246, 185];
      tones.forEach((frequency, i) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startAt = now + i * (correct ? 0.105 : 0.09);
        oscillator.type = correct ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(soft ? 0.026 : 0.045, startAt + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.18);
      });
    } catch {
      // Browsers may block audio until the first user gesture; the quiz still works silently.
    }
  }

  function playSlideSound(forward = true) {
    if (!soundEnabled) return;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      quizAudioContext ||= new AudioCtor();
      const context = quizAudioContext;
      if (context.state === 'suspended') context.resume();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(forward ? 360 : 440, now);
      oscillator.frequency.exponentialRampToValueAtTime(forward ? 570 : 330, now + 0.105);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.014, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch {
      // Sound is optional; navigation must continue without it.
    }
  }

  function toggleQuizSound() {
    soundEnabled = !soundEnabled;
    try { localStorage.setItem('biosphere-quiz-sound', soundEnabled ? 'on' : 'off'); } catch { /* session-only toggle */ }
    const button = $('#viewerSound');
    button?.setAttribute('aria-pressed', String(soundEnabled));
    if (button) button.textContent = soundEnabled ? '♫' : '♪';
    button?.setAttribute('aria-label', soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh');
    button?.setAttribute('title', soundEnabled ? 'Âm thanh slide và phản hồi đúng/sai đang bật' : 'Âm thanh slide và phản hồi đúng/sai đang tắt');
    renderSlide();
    if (soundEnabled) playQuizSound(true, true);
  }

  function initStageAtmosphere() {
    const canvas = $('#stageAtmosphere');
    if (!canvas || typeof canvas.getContext !== 'function') return;
    atmosphereCanvasContext = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!atmosphereCanvasContext) return;
    resizeStageAtmosphere();
    window.addEventListener('resize', resizeStageAtmosphere, { passive: true });
    $('#presentationViewer').addEventListener('pointermove', event => {
      const bounds = $('#presentationViewer').getBoundingClientRect();
      atmospherePointer.x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
      atmospherePointer.y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / Math.max(1, bounds.height)));
      $('#slideStage').style.setProperty('--parallax-x', ((atmospherePointer.x - 0.5) * 2).toFixed(3));
      $('#slideStage').style.setProperty('--parallax-y', ((atmospherePointer.y - 0.5) * 2).toFixed(3));
    }, { passive: true });
  }

  function resizeStageAtmosphere() {
    const canvas = $('#stageAtmosphere');
    if (!canvas || !atmosphereCanvasContext) return;
    const viewer = $('#presentationViewer');
    atmosphereWidth = Math.max(1, viewer.clientWidth);
    atmosphereHeight = Math.max(1, viewer.clientHeight);
    atmosphereDpr = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(atmosphereWidth * atmosphereDpr);
    canvas.height = Math.round(atmosphereHeight * atmosphereDpr);
    atmosphereCanvasContext.setTransform(atmosphereDpr, 0, 0, atmosphereDpr, 0, 0);
    const mobile = window.matchMedia('(max-width: 650px)').matches;
    const count = mobile ? 24 : 54;
    atmosphereParticles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * atmosphereWidth,
      y: Math.random() * atmosphereHeight,
      vx: (Math.random() - 0.5) * (mobile ? 0.14 : 0.24),
      vy: (Math.random() - 0.5) * (mobile ? 0.12 : 0.19),
      r: Math.random() * 1.4 + 0.5,
      phase: Math.random() * Math.PI * 2,
      index: i
    }));
  }

  function drawStageAtmosphere(timestamp) {
    if (!atmosphereRunning || !atmosphereCanvasContext) return;
    if (document.hidden || !motionEnabled || reducedMotion.matches || $('#presentationViewer').hidden) {
      atmosphereFrame = window.requestAnimationFrame(drawStageAtmosphere);
      return;
    }
    if (timestamp - atmosphereLastPaint < 33) {
      atmosphereFrame = window.requestAnimationFrame(drawStageAtmosphere);
      return;
    }
    atmosphereLastPaint = timestamp;
    const context = atmosphereCanvasContext;
    const stage = $('#slideStage');
    const palette = stage?.dataset.palette || 'spectrum';
    const colors = {
      ocean: ['91,229,231','113,142,255'], coral: ['255,143,166','255,206,146'],
      violet: ['210,160,255','123,145,255'], amber: ['255,197,108','255,130,158'],
      cyan: ['104,231,243','164,166,255'], magenta: ['242,160,231','125,223,247'],
      lime: ['193,239,145','106,220,202'], rose: ['255,159,181','255,210,143'],
      pink: ['255,159,198','188,160,255'], ruby: ['255,150,157','197,165,255'],
      blue: ['117,182,255','140,228,245'], aqua: ['118,240,243','141,185,255'],
      orange: ['255,194,119','255,135,157'], gold: ['255,218,125','155,237,183'],
      indigo: ['155,169,255','255,159,208'], teal: ['118,232,207','123,184,255'],
      spectrum: ['139,232,244','231,161,255']
    };
    const pair = colors[palette] || colors.spectrum;
    context.clearRect(0, 0, atmosphereWidth, atmosphereHeight);
    const time = timestamp * 0.00025;
    const mobile = atmosphereWidth < 700;
    const linkDistance = mobile ? 74 : 116;
    for (let i = 0; i < atmosphereParticles.length; i++) {
      const particle = atmosphereParticles[i];
      particle.x += particle.vx + (atmospherePointer.x * atmosphereWidth - particle.x) * 0.000008;
      particle.y += particle.vy + Math.sin(time + particle.phase) * 0.12;
      if (particle.x < -8) particle.x = atmosphereWidth + 8;
      if (particle.x > atmosphereWidth + 8) particle.x = -8;
      if (particle.y < -8) particle.y = atmosphereHeight + 8;
      if (particle.y > atmosphereHeight + 8) particle.y = -8;
      for (let j = i + 1; j < atmosphereParticles.length; j++) {
        const other = atmosphereParticles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < linkDistance) {
          context.strokeStyle = 'rgba(' + pair[(i + j) % 2] + ',' + ((1 - distance / linkDistance) * 0.14).toFixed(3) + ')';
          context.lineWidth = 0.6;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.stroke();
        }
      }
      context.beginPath();
      context.fillStyle = 'rgba(' + pair[particle.index % 2] + ',' + (0.38 + Math.sin(time * 3 + particle.phase) * 0.12).toFixed(3) + ')';
      context.arc(particle.x + (atmospherePointer.x - 0.5) * 5, particle.y + (atmospherePointer.y - 0.5) * 5, particle.r, 0, Math.PI * 2);
      context.fill();
    }
    atmosphereFrame = window.requestAnimationFrame(drawStageAtmosphere);
  }

  function startStageAtmosphere() {
    if (!atmosphereCanvasContext || atmosphereRunning || !motionEnabled || reducedMotion.matches) return;
    atmosphereRunning = true;
    atmosphereLastPaint = 0;
    atmosphereFrame = window.requestAnimationFrame(drawStageAtmosphere);
  }

  function stopStageAtmosphere() {
    atmosphereRunning = false;
    if (atmosphereFrame) window.cancelAnimationFrame(atmosphereFrame);
    atmosphereFrame = 0;
    if (atmosphereCanvasContext) atmosphereCanvasContext.clearRect(0, 0, atmosphereWidth, atmosphereHeight);
  }

  function renderSlide() {
    if (!currentDeck) return;
    const slides = Array.isArray(currentDeck.slides) && currentDeck.slides.length ? currentDeck.slides : seedDeck.slides;
    slideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
    const slide = slides[slideIndex];
    if (!slide.interactiveQuiz) quizSession = { deckId: null, slideIndex: -1, questionIndex: 0, answers: {}, score: 0 };
    const pointHtml = !slide.interactiveQuiz && slide.points?.length
      ? '<div class="slide-points">' + slide.points.map((point, i) => '<div class="slide-point"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' + escapeHTML(point) + '</span></div>').join('') + '</div>'
      : '';
    const quizHtml = slide.interactiveQuiz ? renderQuiz(slide) : '';
    const sourceHtml = slide.note && !slide.interactiveQuiz ? '<div class="slide-source">' + escapeHTML(slide.note) + '</div>' : '';
    const linksHtml = slide.links?.length
      ? '<div class="slide-links"><div class="slide-links-title">TÀI LIỆU TRỰC TUYẾN</div>' + slide.links.map(link => '<a href="' + escapeHTML(link.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(link.label) + ' <span aria-hidden="true">↗</span></a>').join('') + '</div>'
      : '';
    const palette = slide.palette || 'spectrum';
    $('#slideStage').dataset.palette = palette;
    $('#slideStage').innerHTML =
      '<article class="slide-page" data-palette="' + escapeHTML(palette) + '">' +
        '<div class="slide-layout">' +
          '<section class="slide-content">' +
            '<div class="slide-kicker">' + escapeHTML(slide.kicker || 'BIOSPHERE / SLIDE') + '</div>' +
            '<h1 class="slide-title">' + escapeHTML(slide.title || currentDeck.title) + '</h1>' +
            '<p class="slide-subtitle">' + escapeHTML(slide.subtitle || 'Bổ sung sau khi kiểm chứng tài liệu.') + '</p>' +
            pointHtml + quizHtml + sourceHtml + linksHtml +
          '</section>' +
          '<div class="slide-side-content">' + (slide.image ? renderPhoto(slide) : (slide.visual ? renderVisual(slide.visual) : '')) + '</div>' +
        '</div>' +
      '</article>';
    attachLiveImageFallbacks($('#slideStage'));
    warmAdjacentPhotos();
    const label = String(slideIndex + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    $('#slideStage').dataset.slideIndex = String(slideIndex + 1);
    $('#slideStage').dataset.slideCount = String(slides.length);
    $('#viewerSlideCaption').textContent = label;
    const photoCounter = $('#slideStage .photo-topline b');
    if (photoCounter) photoCounter.textContent = label;
    $('#viewerProgress').style.width = ((slideIndex + 1) / slides.length * 100) + '%';
    $('#viewerProgress').setAttribute('aria-valuenow', String(slideIndex + 1));
    $('#viewerProgress').setAttribute('aria-valuemax', String(slides.length));
    $('#viewerSound')?.setAttribute('aria-pressed', String(soundEnabled));
    if ($('#viewerSound')) $('#viewerSound').textContent = soundEnabled ? '♫' : '♪';
    $('#slidePrev').disabled = slideIndex === 0;
    $('#slideNext').disabled = slideIndex === slides.length - 1;
    $('#viewerPlayMotion').setAttribute('aria-pressed', String(motionEnabled));
    $('#presentationViewer').classList.toggle('motion-off', !motionEnabled);
    if (motionEnabled) startStageAtmosphere();
    else stopStageAtmosphere();
  }

  function goNext() {
    if (!currentDeck || slideIndex >= currentDeck.slides.length - 1) return;
    slideIndex += 1;
    playSlideSound(true);
    renderSlide();
  }

  function goPrevious() {
    if (!currentDeck || slideIndex <= 0) return;
    slideIndex -= 1;
    playSlideSound(false);
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
    stopStageAtmosphere();
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
    if (motionEnabled) startStageAtmosphere();
    else stopStageAtmosphere();
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
    if (target.matches('[data-quiz-answer]')) answerQuiz(Number(target.dataset.quizAnswer));
    if (target.matches('[data-quiz-next]')) nextQuizQuestion();
    if (target.matches('[data-quiz-restart]')) restartQuiz();
    if (target.id === 'viewerSound') toggleQuizSound();
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
    if (event.target.closest('a, button, input, select, textarea')) return;
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
      const control = event.target.closest?.('button, a, input, select, textarea, [role="button"]');
      if (control) {
        if (control.matches('[data-quiz-answer]') && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
          const choices = $('[data-quiz-answer]', $('#slideStage'));
          const index = choices.indexOf(control);
          const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
          const nextChoice = choices[index + direction];
          if (nextChoice) {
            event.preventDefault();
            nextChoice.focus();
          }
        }
        if (event.key === 'Escape' && !document.fullscreenElement) exitPresentation();
        return;
      }
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
    if (event.key === 'Escape') $('.modal-backdrop:not([hidden])').forEach(closeModal);
  });

  window.addEventListener('popstate', () => {
    const hash = location.hash.slice(1);
    if (!$('#presentationViewer').hidden) {
      $('#presentationViewer').hidden = true;
      document.body.style.overflow = '';
      stopStageAtmosphere();
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopStageAtmosphere();
    else if (!$('#presentationViewer').hidden && motionEnabled && !reducedMotion.matches) startStageAtmosphere();
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
  try { soundEnabled = localStorage.getItem('biosphere-quiz-sound') !== 'off'; } catch { soundEnabled = true; }
  if ($('#viewerSound')) {
    $('#viewerSound').textContent = soundEnabled ? '♫' : '♪';
    $('#viewerSound').setAttribute('aria-pressed', String(soundEnabled));
    $('#viewerSound').setAttribute('aria-label', soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh');
  }
  initStageAtmosphere();

  const initialHash = location.hash.slice(1);
  if (initialHash.startsWith('present/')) {
    const id = decodeURIComponent(initialHash.slice('present/'.length));
    if (decks.some(deck => deck.id === id)) present(id);
    else showView('library', false);
  } else {
    showView(initialHash, false);
  }
})();