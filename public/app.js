import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm';

env.allowLocalModels = false;

const els = {
  input: document.getElementById('q'),
  status: document.getElementById('status'),
  resultados: document.getElementById('resultados'),
  abertura: document.getElementById('abertura'),
  template: document.getElementById('t-card'),
};

const TOP_N = 5;
const LIMIAR = 0.25;

const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

const fmtScore = (s) => `${Math.round(s * 100)}%`;

const renderCard = (v, score) => {
  const node = els.template.content.cloneNode(true);
  node.querySelector('.card-expressao').textContent = v.expressao;
  node.querySelector('.card-score').textContent = `afinidade ${fmtScore(score)}`;
  node.querySelector('.card-intencao').textContent = v.intencao;
  node.querySelector('.campo-significado p').textContent = v.significado ?? '';

  const setOrHide = (cls, val) => {
    const campo = node.querySelector(`.${cls}`);
    if (!val) {
      campo.hidden = true;
      return;
    }
    campo.querySelector('p').textContent = val;
  };
  setOrHide('campo-origem', v.origem);
  setOrHide('campo-metafora', v.metafora_visual);

  const exemplosUl = node.querySelector('.campo-exemplos ul');
  const exemplosCampo = node.querySelector('.campo-exemplos');
  if (v.exemplos?.length) {
    for (const ex of v.exemplos) {
      const li = document.createElement('li');
      li.textContent = `“${ex}”`;
      exemplosUl.appendChild(li);
    }
  } else {
    exemplosCampo.hidden = true;
  }

  const eqCampo = node.querySelector('.campo-equivalente');
  if (v.equivalente_estrangeiro?.expressao) {
    const eq = v.equivalente_estrangeiro;
    const partes = [`${eq.expressao} (${eq.idioma})`];
    if (eq.traducao_literal) partes.push(`— literalmente: ${eq.traducao_literal}`);
    eqCampo.querySelector('p').textContent = partes.join(' ');
  } else {
    eqCampo.hidden = true;
  }

  const meta = node.querySelector('.campo-meta');
  const reg = meta.querySelector('.meta-registro');
  const tags = meta.querySelector('.meta-tags');
  const freq = meta.querySelector('.meta-frequencia');
  reg.textContent = v.registro_emocional ? `tom: ${v.registro_emocional}` : '';
  tags.textContent = v.tags?.length ? v.tags.join(' · ') : '';
  freq.textContent = v.frequencia_de_uso ? `uso ${v.frequencia_de_uso.replace('_', ' ')}` : '';
  if (!reg.textContent && !tags.textContent && !freq.textContent) {
    meta.hidden = true;
  }

  return node;
};

const buscar = (queryEmb, verbetes) => {
  const scored = verbetes.map((v) => ({ v, s: dot(queryEmb, v.embedding) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.filter((x) => x.s >= LIMIAR).slice(0, TOP_N);
};

const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const main = async () => {
  els.status.textContent = 'Carregando o acervo de ditados…';
  const res = await fetch('verbetes.json');
  if (!res.ok) throw new Error('falha ao carregar verbetes.json');
  const { model, verbetes } = await res.json();

  els.status.textContent = `Preparando a busca (modelo ~50MB, baixa só na primeira vez)…`;
  const embed = await pipeline('feature-extraction', model, {
    quantized: true,
    progress_callback: (p) => {
      if (p.status === 'progress' && p.file?.endsWith('onnx')) {
        const pct = Math.round((p.loaded / p.total) * 100);
        els.status.textContent = `Baixando o modelo de linguagem… ${pct}%`;
      }
    },
  });

  els.status.textContent = `Acervo pronto. ${verbetes.length} verbetes carregados.`;
  els.input.disabled = false;
  els.input.focus();

  const rodar = async (q) => {
    const query = q.trim();
    if (!query) {
      els.resultados.innerHTML = '';
      els.abertura.hidden = false;
      return;
    }
    els.abertura.hidden = true;
    els.status.textContent = 'Pensando…';
    const out = await embed(query, { pooling: 'mean', normalize: true });
    const queryEmb = Array.from(out.data);
    const hits = buscar(queryEmb, verbetes);

    els.resultados.innerHTML = '';
    if (hits.length === 0) {
      els.status.textContent = 'Nenhum verbete combinou bem. Tente reformular a intenção.';
      return;
    }
    els.status.textContent = `${hits.length} ${hits.length === 1 ? 'verbete' : 'verbetes'} encontrados.`;
    for (const { v, s } of hits) {
      els.resultados.appendChild(renderCard(v, s));
    }
  };

  const rodarDebounced = debounce(rodar, 250);
  els.input.addEventListener('input', (e) => rodarDebounced(e.target.value));

  for (const btn of document.querySelectorAll('.abertura-sugestoes button')) {
    btn.addEventListener('click', () => {
      els.input.value = btn.dataset.q;
      els.input.focus();
      rodar(btn.dataset.q);
    });
  }
};

main().catch((err) => {
  console.error(err);
  els.status.textContent = `Erro ao iniciar: ${err.message}`;
});
