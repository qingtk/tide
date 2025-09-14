// Tide app script
let editor; // OverType instance (array element)

function initEditor() {
  // OverType returns an array of instances
  // Create OverType inside the #editor container
  const opts = {
    placeholder: 'Start typing markdown...',
    value: '# Welcome to Tide\n\nStart writing **markdown** here!',
    toolbar: true,
    showStats: false,
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'cave' : 'solar',
    onChange: (value, instance) => {
      // Use OverType's clean HTML to match the editor preview exactly
      try {
        const clean = instance.getCleanHTML();
        document.getElementById('preview-inner').innerHTML = clean || '';
      } catch (e) {
        // Fallback to marked if OverType method isn't available
        document.getElementById('preview-inner').innerHTML = marked.parse(value || '');
      }
    }
  };

  const instances = OverType.init('#editor', opts);
  if (instances && instances.length) {
    editor = instances[0];
    // initial render using OverType clean HTML when available
    try {
      document.getElementById('preview-inner').innerHTML = editor.getCleanHTML() || '';
    } catch (e) {
      document.getElementById('preview-inner').innerHTML = marked.parse(editor.getValue() || '');
    }
  }
}

function wireButtons() {
  document.getElementById('save-file').addEventListener('click', async () => {
    const path = document.getElementById('file-path').value || 'notes.md';
    const content = editor ? editor.getValue() : '';
    // Try Neutralino filesystem save if available
    if (window.Neutralino && Neutralino.filesystem) {
      try {
        await Neutralino.filesystem.writeFile({path, data: content});
        alert('Saved ' + path);
        return;
      } catch (e) {
        console.error(e);
        alert('Failed to save via Neutralino: ' + e.message);
      }
    }

    // Fallback: download blob
    const blob = new Blob([content], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = path;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('open-docs').addEventListener('click', () => {
    // open docsify preview in default browser window
    const docsUrl = 'docs/index.html';
    if (window.Neutralino && Neutralino.os && Neutralino.os.open) {
      // Neutralino expects absolute or relative file URI; try opening via app server path
      Neutralino.os.open({uri: docsUrl}).catch(err => {
        console.error('Neutralino open failed', err);
        window.open(docsUrl, '_blank');
      });
    } else {
      window.open(docsUrl, '_blank');
    }
  });

  // Open file: try Neutralino filesystem for native open, fallback to hidden input
  document.getElementById('open-file').addEventListener('click', async () => {
    // Neutralino path-based open
    if (window.Neutralino && Neutralino.os && Neutralino.filesystem) {
      try {
        // Show a native file picker via HTML input because Neutralino doesn't provide an OS-level open dialog cross-platform consistently
        // Attempt to read a default path if provided
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,text/markdown,text/plain';
        input.addEventListener('change', async (ev) => {
          const file = ev.target.files[0];
          if (!file) return;
          const text = await file.text();
          if (editor && typeof editor.setValue === 'function') editor.setValue(text);
          document.getElementById('file-path').value = file.name || '';
          // update preview
          try{ document.getElementById('preview-inner').innerHTML = editor.getCleanHTML(); } catch(e){ document.getElementById('preview-inner').innerHTML = marked.parse(editor.getValue()||''); }
        });
        input.click();
        return;
      } catch (e) {
        console.error('Neutralino open fallback failed', e);
      }
    }

    // Browser fallback: hidden input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,text/markdown,text/plain';
    input.addEventListener('change', async (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const text = await file.text();
      if (editor && typeof editor.setValue === 'function') editor.setValue(text);
      document.getElementById('file-path').value = file.name || '';
      try{ document.getElementById('preview-inner').innerHTML = editor.getCleanHTML(); } catch(e){ document.getElementById('preview-inner').innerHTML = marked.parse(editor.getValue()||''); }
    });
    input.click();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  wireButtons();
});

// ---------- Resizer and Theme Support ----------
function setupSplitter() {
  const splitter = document.getElementById('splitter');
  const editorPane = document.querySelector('.editor');
  const previewPane = document.querySelector('.preview');
  let isDragging = false;

  const startX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

  splitter.addEventListener('mousedown', (e) => {
    isDragging = true;
    document.body.style.userSelect = 'none';
  });
  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
      persistSplit();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const totalWidth = splitter.parentElement.clientWidth;
    const x = startX(e) - splitter.parentElement.getBoundingClientRect().left;
    const leftPercent = Math.max(15, Math.min(85, (x / totalWidth) * 100));
    editorPane.style.flex = `0 0 ${leftPercent}%`;
    previewPane.style.flex = `1 1 ${100 - leftPercent}%`;
    // Try to refresh OverType editor if available
    refreshEditor();
  });

  // touch support
  splitter.addEventListener('touchstart', (e) => { isDragging = true; });
  window.addEventListener('touchend', () => { if (isDragging) { isDragging = false; persistSplit(); } });
  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const totalWidth = splitter.parentElement.clientWidth;
    const x = startX(e) - splitter.parentElement.getBoundingClientRect().left;
    const leftPercent = Math.max(15, Math.min(85, (x / totalWidth) * 100));
    editorPane.style.flex = `0 0 ${leftPercent}%`;
    previewPane.style.flex = `1 1 ${100 - leftPercent}%`;
    refreshEditor();
  });

  // keyboard accessibility: arrow keys move splitter
  splitter.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const editorStyle = window.getComputedStyle(editorPane);
      const current = parseFloat(editorStyle.flexBasis) || (editorPane.clientWidth / splitter.parentElement.clientWidth) * 100;
      const delta = e.key === 'ArrowLeft' ? -2 : 2;
      const leftPercent = Math.max(15, Math.min(85, current + delta));
      editorPane.style.flex = `0 0 ${leftPercent}%`;
      previewPane.style.flex = `1 1 ${100 - leftPercent}%`;
      refreshEditor();
      persistSplit();
    }
  });

  // restore saved split
  const saved = localStorage.getItem('tide.split');
  if (saved) {
    try {
      const left = parseFloat(saved);
      if (!isNaN(left)) {
        editorPane.style.flex = `0 0 ${left}%`;
        previewPane.style.flex = `1 1 ${100 - left}%`;
      }
    } catch (e) { }
  }

  function persistSplit(){
    const editorStyle = window.getComputedStyle(editorPane);
    const basis = parseFloat(editorStyle.flexBasis) || (editorPane.clientWidth / splitter.parentElement.clientWidth) * 100;
    localStorage.setItem('tide.split', basis.toString());
  }
}

function refreshEditor(){
  try{
    if (!editor) return;
    // Prefer instance-level theme switch or reinit to refresh layout
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'cave' : 'solar';
    if (typeof editor.setTheme === 'function'){
      editor.setTheme(theme);
    } else if (typeof editor.reinit === 'function'){
      // Reinitialize to force layout refresh; preserve existing value via options
      editor.reinit({});
    }
  }catch(e){
    console.warn('Failed to refresh editor', e);
  }
}

function setupTheme() {
  const btn = document.getElementById('theme-toggle');
  const theme = localStorage.getItem('tide.theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('tide.theme', next);
  });

  function applyTheme(t){
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    // refresh editor to ensure colors/layout are applied
    setTimeout(()=>{ refreshEditor(); }, 50);
  }
}

// initialize extra UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupSplitter();
  setupTheme();
});
