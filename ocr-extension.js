/* English Vocabulary Agent — browser-based OCR enhancement.
   OCR: Tesseract.js 7, loaded on demand. No real Notion / Gmail integration. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style = document.createElement('style');
  style.textContent = `
    .ocr-box{margin:0 0 18px;border:1px solid #adc9f2;border-radius:13px;background:#f4f8ff;padding:14px}
    .ocr-box h3{margin:0 0 5px;font-size:16px;color:#123970}
    .ocr-line{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:11px 0}
    .ocr-line button{font-size:13px}.ocr-line input[type=file]{max-width:100%;padding:8px;background:#fff}
    .ocr-preview{display:none;max-width:100%;max-height:250px;object-fit:contain;background:#fff;border:1px solid #cbd8eb;border-radius:8px;margin:10px 0}
    .ocr-preview.visible{display:block}.ocr-progress{width:100%;height:12px;accent-color:#2665d4}
    .ocr-raw{min-height:115px;resize:vertical;font:13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
    .ocr-sub{font-weight:800;font-size:13px;color:#194374;margin:14px 0 6px}
    .ocr-review{margin:12px 0;padding:13px;background:#fff;border:1px solid #cad8ed;border-radius:12px}
    .ocr-entry{display:grid;grid-template-columns:1fr 1.6fr auto;align-items:end;gap:8px;padding:11px 0;border-bottom:1px solid #e6edf8}
    .ocr-entry:last-child{border-bottom:none}.ocr-entry label{font-size:11px;color:#60728e;font-weight:700}
    .ocr-entry input{margin-top:4px;font-size:13px;padding:8px}.ocr-entry .ocr-del{padding:8px 10px;background:#ffecee;color:#a32245;border:0;border-radius:9px}
    .ocr-helper{font-size:12px;color:#526b8f;line-height:1.55}
    .ocr-status{font-size:12px;color:#245a9a;margin-top:7px;overflow-wrap:anywhere}
    .ocr-status.error{color:#b0273c}.ocr-status.success{color:#166a44}
    .sample-option{font-weight:800;color:#244d8d;font-size:13px;margin:18px 0 6px}
    @media(max-width:570px){.ocr-entry{grid-template-columns:1fr}.ocr-entry .ocr-del{justify-self:start}}
  `;
  document.head.append(style);
  const sourceLabel = document.querySelector('label[for="source"]');
  if (!sourceLabel || !$('save') || typeof renderStage !== 'function') return;
  const box = document.createElement('section');
  box.id = 'ocr-workspace';
  box.className = 'ocr-box';
  box.innerHTML = `
    <h3>Option A — Real OCR from an uploaded image</h3>
    <p class="ocr-helper">Upload a PNG, JPG or WebP image containing printed English vocabulary. OCR runs in your browser using Tesseract.js; review the results before saving. The OCR engine and English model download on first use.</p>
    <label class="small" for="ocr-file">Image to read (maximum 10 MB)</label>
    <div class="ocr-line"><input id="ocr-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload image for OCR" /></div>
    <img id="ocr-image-preview" class="ocr-preview" alt="Preview of the image selected for OCR" />
    <div class="ocr-line"><button type="button" id="ocr-run" class="button" disabled>Read text from image</button><button type="button" id="ocr-sample-download" class="button secondary">Download sample image (PNG)</button></div>
    <progress id="ocr-progress" class="ocr-progress" value="0" max="100" hidden></progress>
    <div id="ocr-status" class="ocr-status" role="status" aria-live="polite">Select an image to enable OCR.</div>
    <div id="ocr-results" hidden>
      <div class="ocr-sub">Recognised text — editable</div>
      <label class="small" for="ocr-raw">Check spelling and line breaks, then extract vocabulary candidates.</label>
      <textarea id="ocr-raw" class="ocr-raw" spellcheck="true" aria-label="Recognised OCR text"></textarea>
      <div class="ocr-line"><button class="button secondary" id="ocr-parse" type="button">Extract vocabulary candidates</button><button class="button secondary" id="ocr-add-manual" type="button">Add a term manually</button></div>
      <p class="ocr-helper">One term per line works best. For passages, known sample-dictionary terms are suggested. Unknown terms need your own definition; OCR recognises text but is not a dictionary or language model.</p>
    </div>
    <div id="ocr-review" class="ocr-review" hidden>
      <div class="ocr-sub" style="margin-top:0">Review before saving</div>
      <p class="ocr-helper">Edit each term and its definition. A definition is required before saving to the local library. Duplicates will be skipped.</p>
      <div id="ocr-rows"></div>
    </div>
  `;
  const sampleHeading = document.createElement('div');
  sampleHeading.className = 'sample-option';
  sampleHeading.textContent = 'Option B — Original sample-text workflow (no OCR)';
  sourceLabel.parentNode.insertBefore(box, sourceLabel);
  sourceLabel.parentNode.insertBefore(sampleHeading, sourceLabel);
  const title = document.querySelector('.grid > section.panel .sectionhead h2');
  if (title) title.textContent = '1. Extract vocabulary from an image or sample';
  const heroBadge = document.querySelector('.hero .demo');
  if (heroBadge) heroBadge.textContent = 'REAL OCR · INTEGRATIONS SIMULATED';
  const notice = document.querySelector('.notice');
  if (notice) notice.innerHTML = '<strong>Live OCR enabled:</strong> Image-to-text recognition uses Tesseract.js in the browser. The included sample sources are still simulated. Notion updates, Gmail sending and scheduled automations are <strong>not connected</strong>. Saved vocabulary resides in this browser’s local storage.';
  const statLabel = $('sources-count')?.nextElementSibling;
  if (statLabel) statLabel.textContent = 'Sample text sources';
  const fileInput = $('ocr-file');
  const status = $('ocr-status');
  const runButton = $('ocr-run');
  const preview = $('ocr-image-preview');
  let file = null;
  let previewUrl = null;
  let worker = null;
  let workerPromise = null;
  let libPromise = null;
  let running = false;
  let reviewingOCR = false;
  const maxSize = 10 * 1024 * 1024;
  function setStatus(message, variant = '') {
    status.textContent = message;
    status.className = 'ocr-status' + (variant ? ' ' + variant : '');
  }
  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    preview.removeAttribute('src');
    preview.classList.remove('visible');
  }
  function loadLibrary() {
    if (window.Tesseract && typeof window.Tesseract.createWorker === 'function') return Promise.resolve();
    if (libPromise) return libPromise;
    libPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
      script.onload = () => window.Tesseract?.createWorker ? resolve() : reject(new Error('The OCR engine did not initialise.'));
      script.onerror = () => { script.remove(); reject(new Error('Unable to load the OCR library. Check your internet connection.')); };
      document.head.appendChild(script);
    }).catch(error => { libPromise = null; throw error; });
    return libPromise;
  }
  function getWorker() {
    if (worker) return Promise.resolve(worker);
    if (workerPromise) return workerPromise;
    workerPromise = (async () => {
      await loadLibrary();
      const newWorker = await window.Tesseract.createWorker('eng', 1, {
        logger: msg => {
          if (!running) return;
          const percent = Math.round(Math.max(0, Math.min(1, Number(msg.progress) || 0)) * 100);
          $('ocr-progress').value = percent;
          setStatus(`${msg.status || 'Processing'}${percent ? ' — ' + percent + '%' : ''}`);
        }
      });
      worker = newWorker;
      return worker;
    })().catch(error => { workerPromise = null; throw error; });
    return workerPromise;
  }
  fileInput.addEventListener('change', () => {
    clearPreview();
    $('ocr-results').hidden = true;
    $('ocr-review').hidden = true;
    reviewingOCR = false;
    file = fileInput.files?.[0] || null;
    if (!file) { runButton.disabled = true; setStatus('Select an image to enable OCR.'); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > maxSize || file.size === 0) {
      file = null;
      runButton.disabled = true;
      fileInput.value = '';
      setStatus('Please choose a PNG, JPG or WebP image smaller than 10 MB.', 'error');
      return;
    }
    previewUrl = URL.createObjectURL(file);
    preview.src = previewUrl;
    preview.classList.add('visible');
    runButton.disabled = running;
    setStatus(`Ready to read ${file.name}. The first run downloads OCR engine files.`);
  });
  function clean(s) { return String(s).replace(/^\s*(?:[\d]{1,3}[.)-]|[•●▪*])\s*/, '').replace(/^["'“”]+|["'“”]+$/g, '').trim(); }
  function normal(s) { return String(s).trim().toLocaleLowerCase('en'); }
  function known(term) { return items.find(item => normal(item.term) === normal(term)); }
  function parseVocabulary(text) {
    const out = new Map();
    const add = (term, definition = '') => {
      term = clean(term);
      if (!/\p{L}/u.test(term) || term.length > 65 || term.split(/\s+/).length > 7) return;
      const key = normal(term);
      if (out.has(key)) return;
      const example = known(term);
      out.set(key, example
        ? {...example, sample_source: 'Uploaded OCR image'}
        : {term, part_of_speech: 'To review', definition: definition || '', example_sentence: '', sample_source: 'Uploaded OCR image', category: 'OCR review'});
    };
    const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
    for (const line of lines) {
      const parts = line.split(/\s+(?:—|–|-|:)\s+|:\s+/);
      if (parts.length > 1 && parts[0].split(/\s+/).length <= 5) {
        add(parts[0], parts.slice(1).join(' — ').slice(0, 400));
      } else if (line.length <= 60 && line.split(/\s+/).length <= 5) {
        add(line);
      }
    }
    for (const term of items) {
      const escaped = term.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('(^|[^A-Za-z])' + escaped + '(?=$|[^A-Za-z])', 'i').test(text)) add(term.term);
    }
    return [...out.values()];
  }
  function renderRows() {
    const root = $('ocr-rows');
    root.innerHTML = stage.length ? stage.map((item, i) => `
      <div class="ocr-entry" data-index="${i}">
        <label>Word or phrase<input class="ocr-term" data-index="${i}" value="${escapeHtml(item.term)}" aria-label="Vocabulary term ${i+1}" /></label>
        <label>Definition (required)<input class="ocr-definition" data-index="${i}" value="${escapeHtml(item.definition)}" placeholder="Enter a meaning" aria-label="Definition for term ${i+1}" /></label>
        <button class="ocr-del" type="button" data-index="${i}" aria-label="Remove term ${i+1}">Remove</button>
      </div>
    `).join('') : '<p class="ocr-helper">No candidates detected. Edit the raw OCR text or select “Add a term manually”.</p>';
    root.querySelectorAll('.ocr-term').forEach(input => input.addEventListener('input', () => {
      stage[Number(input.dataset.index)].term = input.value;
      renderStage();
    }));
    root.querySelectorAll('.ocr-definition').forEach(input => input.addEventListener('input', () => {
      stage[Number(input.dataset.index)].definition = input.value;
      renderStage();
    }));
    root.querySelectorAll('.ocr-del').forEach(button => button.addEventListener('click', () => {
      stage.splice(Number(button.dataset.index), 1);
      renderRows();
      renderStage();
    }));
    $('ocr-review').hidden = false;
  }
  function updateCandidates() {
    const raw = $('ocr-raw').value.trim();
    if (!raw) {
      setStatus('OCR text is empty. Upload a clearer image or enter text to review.', 'error');
      return;
    }
    reviewingOCR = true;
    stage = parseVocabulary(raw);
    renderStage();
    renderRows();
    $('extract-status').textContent = `${stage.length} candidate(s) from OCR — review before saving`;
    setStatus(`Recognised text reviewed: ${stage.length} candidate(s). Complete missing definitions before saving.`, 'success');
  }
  $('ocr-parse').addEventListener('click', updateCandidates);
  $('ocr-add-manual').addEventListener('click', () => {
    reviewingOCR = true;
    stage.push({term:'',part_of_speech:'To review',definition:'',example_sentence:'',sample_source:'Uploaded OCR image',category:'OCR review'});
    renderStage();
    renderRows();
    $('ocr-review').querySelector('.ocr-term:last-of-type')?.focus();
  });
  runButton.addEventListener('click', async () => {
    if (!file || running) return;
    running = true;
    runButton.disabled = true;
    $('ocr-progress').hidden = false;
    $('ocr-progress').value = 0;
    setStatus('Loading English OCR model…');
    try {
      const w = await getWorker();
      const result = await w.recognize(file);
      const text = String(result?.data?.text || '').trim();
      $('ocr-raw').value = text;
      $('ocr-results').hidden = false;
      if (!text) {
        $('ocr-review').hidden = true;
        setStatus('No readable text found. Use a sharper, higher-contrast image or enter text manually.', 'error');
      } else {
        updateCandidates();
      }
    } catch (error) {
      console.error('OCR error', error);
      setStatus(`OCR unavailable: ${error.message || error}. Check your internet connection and retry.`, 'error');
    } finally {
      running = false;
      runButton.disabled = !file;
      $('ocr-progress').hidden = true;
    }
  });
  $('ocr-sample-download').addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1100; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,1100,600);
    ctx.fillStyle = '#111827'; ctx.font = 'bold 43px Arial'; ctx.fillText('English Vocabulary — Sample OCR Image', 55, 80);
    ctx.font = '35px Arial';
    ['meticulous', 'streamline', 'traceability', 'at a glance', 'clarify'].forEach((word, i) => ctx.fillText(word, 85, 175 + i * 75));
    ctx.font = '23px Arial'; ctx.fillStyle = '#485569';
    ctx.fillText('Fictional terms for testing real OCR in the GitHub portfolio demo.', 55, 565);
    canvas.toBlob(blob => {
      if (!blob) { setStatus('Sample image could not be generated.', 'error'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'sample-vocabulary-for-ocr.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Sample PNG downloaded. Upload it above and click Read text from image.', 'success');
    }, 'image/png');
  });
  $('save').addEventListener('click', event => {
    if (!reviewingOCR || !stage.length) return;
    const invalid = stage.findIndex(row => !String(row.term).trim() || !String(row.definition).trim());
    if (invalid !== -1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      setStatus('Please complete every term and definition before adding vocabulary to the local library.', 'error');
      const row = $('ocr-rows').querySelector(`[data-index="${invalid}"]`);
      row?.querySelector(!String(stage[invalid].term).trim() ? '.ocr-term' : '.ocr-definition')?.focus();
    }
  }, true);
  function switchToSamples() {
    reviewingOCR = false;
    $('ocr-review').hidden = true;
    $('extract-status').textContent = 'Sample terms loaded (no OCR)';
  }
  $('extract').addEventListener('click', switchToSamples);
  $('source').addEventListener('change', () => { reviewingOCR = false; $('ocr-review').hidden = true; });
  $('reset').addEventListener('click', () => {
    clearPreview();
    file = null;
    fileInput.value = '';
    runButton.disabled = true;
    reviewingOCR = false;
    $('ocr-results').hidden = true;
    $('ocr-review').hidden = true;
    $('ocr-progress').hidden = true;
    setStatus('Select an image to enable OCR.');
  });
})();
