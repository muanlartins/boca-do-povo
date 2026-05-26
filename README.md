# Boca do Povo

> Acervo de ditados, provérbios e expressões populares brasileiras, catalogados pela **intenção** do que se quer dizer.

Dicionários convencionais indexam pela gíria: você sabe a expressão, eles te dão o significado. Aqui o caminho é inverso. Você descreve o que está sentindo — *"quero dizer que tô garantindo a minha antes de pensar nos outros"* — e o acervo devolve as expressões que cabem ali, com origem, exemplo de uso e equivalentes em outras línguas.

A busca é semântica: não exige palavras-chave exatas, entende sinônimos e paráfrases.

## Como funciona

- Cada verbete é um arquivo JSON em [`data/verbetes/`](data/verbetes/), rico em campos (intenção, significado, origem, metáfora visual, exemplos, tom emocional, equivalente estrangeiro, etc).
- Um script de build ([`src/build.mjs`](src/build.mjs)) lê todos os verbetes e gera um **embedding** (vetor de 384 dimensões) para o campo `intenção + significado + exemplos` usando o modelo multilíngue [`paraphrase-multilingual-MiniLM-L12-v2`](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2).
- O resultado é um único arquivo `public/verbetes.json` com os verbetes e seus vetores.
- No navegador, o mesmo modelo é carregado via [Transformers.js](https://huggingface.co/docs/transformers.js) (cacheado no IndexedDB após a primeira visita) e gera o embedding da query do usuário em tempo real. A busca é uma multiplicação de cossenos contra todos os verbetes.

Não há backend. Tudo é estático e hospedado no GitHub Pages.

## Estrutura

```
boca-do-povo/
├── data/verbetes/         # um JSON por ditado, fonte da verdade
├── schema.json            # schema dos verbetes (referência)
├── src/build.mjs          # gera public/verbetes.json com embeddings
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js             # busca semântica no client
│   └── verbetes.json      # gerado pelo build (não versionado)
└── .github/workflows/deploy.yml
```

## Rodar localmente

```bash
npm install
npm run build      # gera public/verbetes.json
npm run serve      # serve public/ em http://localhost:8080
```

Use `npm run dev` para os dois em sequência.

## Contribuir com um verbete

1. Crie um arquivo em `data/verbetes/<slug>.json` seguindo o schema.
2. O `id` deve bater com o nome do arquivo (kebab-case, sem acento).
3. Campos obrigatórios: `id`, `expressao`, `intencao`, `significado`.
4. Campos opcionais (mas recomendados): `origem`, `metafora_visual`, `exemplos`, `tags`, `registro_emocional`, `frequencia_de_uso`, `equivalente_estrangeiro`.
5. Abra um PR. O deploy roda automático no merge.

Diretrizes editoriais:

- O campo `intencao` é o coração do verbete e o que move a busca. Escreva como descrição da situação ou sentimento, não como definição de dicionário.
- Aceita-se múltiplos ditados com a mesma intenção — fazem parte do valor do acervo (sinônimos populares).
- Foco em ditados clássicos e expressões consagradas. Gírias muito recentes ou regionais de nicho podem ficar de fora num primeiro momento.

## Stack

- **Embeddings:** [`Xenova/paraphrase-multilingual-MiniLM-L12-v2`](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2) (384-dim, quantizado, ~50MB)
- **Browser ML:** [Transformers.js](https://github.com/xenova/transformers.js)
- **Tipografia:** Playfair Display + Inter (Google Fonts)
- **Hospedagem:** GitHub Pages via Actions

## Licença

MIT para o código. CC BY-SA 4.0 para o conteúdo dos verbetes.
