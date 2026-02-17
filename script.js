const workbench = document.getElementById('workbench');
const styleForm = document.getElementById('styleForm');
const emptyState = document.getElementById('emptyState');
const helperText = document.getElementById('helperText');
const familiesNode = document.getElementById('toolFamilies');
const htmlCode = document.getElementById('htmlCode');
const cssCode = document.getElementById('cssCode');
const jsCode = document.getElementById('jsCode');

let selected = null;
let dragState = null;
let alignV = null;
let alignH = null;
let themeIndex = 0;

const familyMap = {
  Bouton: ['forme', 'bordure', 'contour', 'ombre', 'couleur', 'hover', 'padding', 'icône', 'rayon', 'opacité'],
  Texte: ['police', 'taille', 'graisse', 'couleur', 'interligne', 'alignement', 'ombre', 'casse', 'espacement', 'fond'],
  Média: ['source', 'lecture auto', 'volume', 'arrondi', 'fit', 'filtre', 'rotation', 'cadre', 'caption', 'masque'],
  Position: ['x', 'y', 'largeur', 'hauteur', 'z-index', 'ancrage', 'snap', 'grille', 'groupe', 'rotation'],
  Avancé: ['animation', 'état actif', 'triggers', 'JS hook', 'ARIA', 'id', 'classe', 'opacity', 'export', 'preset'],
  Fond: ['couleur', 'gradient', 'image', 'motif', 'grille', 'luminosité', 'contraste', 'blur', 'noise', 'vignette']
};

const formConfig = [
  { key: 'width', label: 'Largeur', type: 'text', hint: 'Change la largeur de l’objet sélectionné.' },
  { key: 'height', label: 'Hauteur', type: 'text', hint: 'Change la hauteur de l’objet sélectionné.' },
  { key: 'background', label: 'Fond', type: 'color', hint: 'Applique la couleur de fond.' },
  { key: 'color', label: 'Texte', type: 'color', hint: 'Change la couleur du texte.' },
  { key: 'borderRadius', label: 'Arrondi', type: 'text', hint: 'Adoucit ou durcit les coins.' },
  { key: 'border', label: 'Bordure', type: 'text', hint: 'Définit contour épaisseur/style/couleur.' },
  { key: 'fontSize', label: 'Taille police', type: 'text', hint: 'Ajuste la taille du texte.' },
  { key: 'boxShadow', label: 'Ombre', type: 'text', hint: 'Ajoute du relief et de la profondeur.' },
  { key: 'opacity', label: 'Opacité', type: 'range', min: 0, max: 1, step: 0.05, hint: 'Rend l’élément plus transparent.' },
  { key: 'padding', label: 'Padding', type: 'text', hint: 'Ajoute de l’espace interne.' }
];

const themes = [
  ['#0d1015', 'rgba(78,245,182,0.17)', 'rgba(255,90,107,0.14)'],
  ['#17131d', 'rgba(112,162,255,0.18)', 'rgba(255,166,66,0.14)'],
  ['#11151e', 'rgba(32,219,202,0.18)', 'rgba(216,75,255,0.12)']
];

function init() {
  renderFamilies();
  seedElements();
  bindUI();
  syncCodeEditors();
  makePanelInteractive(document.getElementById('leftInspector'));
  makePanelInteractive(document.getElementById('rightActions'));
}

function renderFamilies() {
  Object.entries(familyMap).forEach(([family, tools]) => {
    tools.forEach((tool) => {
      const chip = document.createElement('div');
      chip.className = 'family-chip';
      chip.textContent = `${family} • ${tool}`;
      familiesNode.appendChild(chip);
    });
  });
}

function bindUI() {
  document.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addElement(btn.dataset.add));
  });

  document.getElementById('toggleGridBtn').addEventListener('click', () => {
    workbench.classList.toggle('grid-on');
  });

  document.getElementById('themeBtn').addEventListener('click', cycleTheme);
  document.getElementById('exportBtn').addEventListener('click', exportProject);

  document.getElementById('applyCodeBtn').addEventListener('click', (e) => {
    e.preventDefault();
    applyCodeFromEditors();
  });

  document.querySelectorAll('[data-collapse]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.collapse).classList.toggle('collapsed');
    });
  });

  workbench.addEventListener('click', (e) => {
    if (e.target === workbench) deselect();
  });
}

function seedElements() {
  addElement('button', { x: 40, y: 40 });
  addElement('text', { x: 220, y: 42 });
  addElement('post', { x: 80, y: 170 });
}

function addElement(type, pos = {}) {
  const item = document.createElement(type === 'container' ? 'section' : 'div');
  item.className = 'canvas-item';
  item.style.left = `${pos.x ?? 80}px`;
  item.style.top = `${pos.y ?? 90}px`;
  item.style.width = '180px';
  item.style.minHeight = '44px';

  if (type === 'button') {
    item.innerHTML = '<button>Bouton éditable</button>';
  } else if (type === 'text') {
    item.innerHTML = '<div class="editable">Double-cliquez pour éditer ce texte.</div>';
  } else if (type === 'image') {
    item.innerHTML = '<img alt="Image locale" src="./assets/placeholder-image.svg" /><div class="editable">Chemin image modifiable</div>';
    item.style.width = '220px';
  } else if (type === 'video') {
    item.innerHTML = '<video controls src="./assets/demo-video.mp4"></video><div class="editable">Chemin vidéo modifiable</div>';
    item.style.width = '260px';
  } else if (type === 'post') {
    item.innerHTML = document.getElementById('postTemplate').innerHTML;
    item.style.width = '220px';
  } else {
    item.innerHTML = '<div class="editable">Conteneur modulaire</div>';
    item.style.width = '280px';
    item.style.height = '140px';
  }

  makeElementInteractive(item);
  workbench.appendChild(item);
  selectElement(item);
  syncCodeEditors();
}

function makeElementInteractive(item) {
  const resizer = document.createElement('div');
  resizer.className = 'resizer';
  item.appendChild(resizer);

  item.addEventListener('mousedown', (e) => {
    if (e.target === resizer) {
      dragState = {
        mode: 'resize',
        item,
        startX: e.clientX,
        startY: e.clientY,
        startW: item.offsetWidth,
        startH: item.offsetHeight
      };
    } else {
      dragState = {
        mode: 'move',
        item,
        offsetX: e.clientX - item.offsetLeft,
        offsetY: e.clientY - item.offsetTop
      };
      selectElement(item);
    }
  });

  item.querySelectorAll('.editable').forEach((editable) => {
    editable.addEventListener('dblclick', () => {
      editable.contentEditable = 'true';
      editable.focus();
      item.classList.add('editing');
    });
    editable.addEventListener('blur', () => {
      editable.contentEditable = 'false';
      item.classList.remove('editing');
      syncCodeEditors();
    });
  });

  item.addEventListener('click', (e) => {
    e.stopPropagation();
    selectElement(item);
  });
}

window.addEventListener('mousemove', (e) => {
  if (!dragState) return;
  const { item, mode } = dragState;
  if (mode === 'move') {
    item.style.left = `${Math.max(0, e.clientX - dragState.offsetX)}px`;
    item.style.top = `${Math.max(0, e.clientY - dragState.offsetY - 70)}px`;
    showAlignments(item);
  }
  if (mode === 'resize') {
    item.style.width = `${Math.max(80, dragState.startW + (e.clientX - dragState.startX))}px`;
    item.style.height = `${Math.max(36, dragState.startH + (e.clientY - dragState.startY))}px`;
  }
});

window.addEventListener('mouseup', () => {
  if (dragState) syncCodeEditors();
  dragState = null;
  clearAlignments();
});

function showAlignments(active) {
  clearAlignments();
  const activeRect = active.getBoundingClientRect();
  [...workbench.children].forEach((el) => {
    if (el === active || !el.classList.contains('canvas-item')) return;
    const rect = el.getBoundingClientRect();
    if (Math.abs(rect.left - activeRect.left) < 6) {
      alignV = document.createElement('div');
      alignV.className = 'alignment-line vertical';
      alignV.style.left = `${active.offsetLeft}px`;
      workbench.appendChild(alignV);
    }
    if (Math.abs(rect.top - activeRect.top) < 6) {
      alignH = document.createElement('div');
      alignH.className = 'alignment-line horizontal';
      alignH.style.top = `${active.offsetTop}px`;
      workbench.appendChild(alignH);
    }
  });
}

function clearAlignments() {
  alignV?.remove();
  alignH?.remove();
  alignV = null;
  alignH = null;
}

function selectElement(el) {
  selected?.classList.remove('selected');
  selected = el;
  selected.classList.add('selected');
  renderStyleForm();
}

function deselect() {
  selected?.classList.remove('selected');
  selected = null;
  styleForm.classList.add('hidden');
  emptyState.classList.remove('hidden');
}

function renderStyleForm() {
  if (!selected) return;
  emptyState.classList.add('hidden');
  styleForm.classList.remove('hidden');
  styleForm.innerHTML = '';

  formConfig.forEach((field) => {
    const wrap = document.createElement('label');
    wrap.textContent = field.label;
    const input = document.createElement('input');
    input.type = field.type;
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.step !== undefined) input.step = field.step;

    const current = getComputedStyle(selected)[field.key] || selected.style[field.key] || '';
    if (field.type === 'color') {
      input.value = rgbToHex(current) || '#ffffff';
    } else if (field.type === 'range') {
      input.value = selected.style[field.key] || 1;
    } else {
      input.value = selected.style[field.key] || current;
    }

    input.addEventListener('input', () => {
      selected.style[field.key] = input.value;
      helperText.textContent = `Vous modifiez « ${field.label} » : ${field.hint}`;
      syncCodeEditors();
    });

    wrap.appendChild(input);
    styleForm.appendChild(wrap);
  });
}

function rgbToHex(rgb) {
  const m = rgb.match(/\d+/g);
  if (!m || m.length < 3) return null;
  return `#${m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

function syncCodeEditors() {
  htmlCode.value = workbench.innerHTML;
  cssCode.value = `.workbench {\n  min-height: calc(100vh - 200px);\n}\n.canvas-item {\n  position: absolute;\n}`;
  jsCode.value = `// Interactions dynamiques gérées par script.js\nconsole.log('Air/code Lab prêt');`;
}

function applyCodeFromEditors() {
  workbench.innerHTML = htmlCode.value;
  document.getElementById('dynamicStyle')?.remove();
  const styleTag = document.createElement('style');
  styleTag.id = 'dynamicStyle';
  styleTag.textContent = cssCode.value;
  document.head.appendChild(styleTag);

  document.getElementById('dynamicScript')?.remove();
  const scriptTag = document.createElement('script');
  scriptTag.id = 'dynamicScript';
  scriptTag.textContent = jsCode.value;
  document.body.appendChild(scriptTag);

  workbench.querySelectorAll('.canvas-item').forEach(makeElementInteractive);
}

function cycleTheme() {
  themeIndex = (themeIndex + 1) % themes.length;
  const [bg, c1, c2] = themes[themeIndex];
  document.documentElement.style.setProperty('--bg', bg);
  document.body.style.background = `radial-gradient(circle at 15% 25%, ${c1}, transparent 30%), radial-gradient(circle at 85% 15%, ${c2}, transparent 28%), ${bg}`;
}

function exportProject() {
  const packageText = `<!-- index.html -->\n${buildExportHTML()}\n\n/* styles.css */\n${cssCode.value}\n\n// script.js\n${jsCode.value}`;
  const blob = new Blob([packageText], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'air-code-lab-export.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildExportHTML() {
  return `<!doctype html>\n<html lang="fr">\n<head><meta charset="UTF-8"><title>Export Air/code Lab</title></head>\n<body>\n${workbench.innerHTML}\n</body></html>`;
}

function makePanelInteractive(panel) {
  const handle = panel.querySelector('.drag-handle');
  let state = null;

  handle.addEventListener('mousedown', (e) => {
    const rect = panel.getBoundingClientRect();
    panel.style.position = 'fixed';
    panel.style.zIndex = 9999;
    state = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  });

  const resizer = document.createElement('div');
  resizer.className = 'resizer';
  panel.appendChild(resizer);

  resizer.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, w: panel.offsetWidth, h: panel.offsetHeight };
    const onMove = (ev) => {
      panel.style.width = `${Math.max(260, start.w + (ev.clientX - start.x))}px`;
      panel.style.height = `${Math.max(180, start.h + (ev.clientY - start.y))}px`;
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  window.addEventListener('mousemove', (e) => {
    if (!state) return;
    panel.style.left = `${e.clientX - state.dx}px`;
    panel.style.top = `${e.clientY - state.dy}px`;
  });

  window.addEventListener('mouseup', () => {
    state = null;
  });
}

init();
