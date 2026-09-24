// ─── Compatibilité anciens navigateurs (iPad 2 → iOS 9.3.5 / Safari 9) ──
// Le build est un unique fichier HTML : on ne peut pas s'appuyer sur
// @vitejs/plugin-legacy (qui produit des chunks séparés). À la place :
//   1. chaque module de src/ passe par Babel (useBuiltIns: 'usage') pour
//      importer les polyfills core-js réellement utilisés ;
//   2. le bundle final est ré-transpilé en ES5 puis minifié en ES5 ;
//   3. le <script type="module"> devient un script classique en fin de <body> ;
//   4. le CSS reçoit des replis (clamp, gap flex, backdrop-filter…).
import { transformAsync } from '@babel/core';
import { transformWithEsbuild, type Plugin } from 'vite';
import type { AcceptedPlugin, Declaration, Rule } from 'postcss';

export const LEGACY_TARGETS = 'ios_saf >= 9, safari >= 9';

const SRC_RE = /\/src\/.*\.[jt]sx?$/;

export function legacyJs(): Plugin {
  return {
    name: 'athan:legacy-js',
    apply: 'build',
    enforce: 'post',

    async transform(code, id) {
      if (!SRC_RE.test(id.split('?')[0])) return null;
      const res = await transformAsync(code, {
        filename: id,
        babelrc: false,
        configFile: false,
        sourceType: 'module',
        presets: [['@babel/preset-env', {
          targets: LEGACY_TARGETS,
          modules: false,
          useBuiltIns: 'usage',
          corejs: '3.50',
        }]],
      });
      return res?.code ? { code: res.code, map: res.map } : null;
    },

    // generateBundle (et non renderChunk) : le renderChunk esbuild de Vite
    // passe en dernier et réintroduirait de la syntaxe ES2015+.
    // Ce plugin doit précéder viteSingleFile() pour agir avant l'inlining.
    async generateBundle(_opts, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'chunk') {
          const res = await transformAsync(file.code, {
            babelrc: false,
            configFile: false,
            sourceType: 'script',
            compact: false,
            presets: [['@babel/preset-env', { targets: LEGACY_TARGETS, modules: false }]],
          });
          const es5 = await transformWithEsbuild(res?.code ?? file.code, file.fileName, {
            target: 'es5',
            minify: true,
            legalComments: 'none',
          });
          file.code = es5.code;
          file.map = null;
        } else if (file.fileName.endsWith('.html')) {
          // Script classique en fin de <body> : il doit s'exécuter après #root
          const scripts: string[] = [];
          const html = String(file.source).replace(/\s*<script type="module"[^>]*?( src="[^"]*")[^>]*><\/script>/g, (_m, src: string) => {
            scripts.push(`<script${src}></script>`);
            return '';
          });
          file.source = html.replace('</body>', `${scripts.join('\n')}\n</body>`);
        }
      }
    },
  };
}

// ─── CSS ──────────────────────────────────────────────────────────
// clamp()  → valeur de repli (terme central) déclarée avant.
// gap flex → .no-flexgap (détecté dans main.tsx) : marges entre enfants.
// backdrop-filter → préfixe -webkit-.
export function legacyCss(): AcceptedPlugin {
  return {
    postcssPlugin: 'athan-legacy-css',
    Once(root) {
      const gapRules: Rule[] = [];

      root.walkDecls((decl: Declaration) => {
        const { prop, value } = decl;

        if (/^clamp\(/.test(value)) {
          const args = splitArgs(value.slice(6, -1));
          if (args.length === 3) decl.cloneBefore({ value: args[1] });
        }

        if (prop === 'backdrop-filter') {
          const parent = decl.parent;
          let prefixed = false;
          parent?.each(n => { if (n.type === 'decl' && n.prop === '-webkit-backdrop-filter') prefixed = true; });
          if (!prefixed) decl.cloneBefore({ prop: '-webkit-backdrop-filter' });
        }

        if (prop === 'gap' && decl.parent?.type === 'rule') gapRules.push(decl.parent as Rule);
      });

      for (const rule of gapRules) {
        let display = '', direction = 'row', gap = '';
        rule.each(n => {
          if (n.type !== 'decl') return;
          if (n.prop === 'display') display = n.value;
          if (n.prop === 'flex-direction') direction = n.value;
          if (n.prop === 'gap') gap = n.value.split(/\s+/)[0];
        });
        if (!/flex/.test(display) || !gap) continue;
        const side = direction.startsWith('column') ? 'margin-top' : 'margin-left';
        const selector = rule.selectors.map(s => `.no-flexgap ${s} > * + *`).join(', ');
        const fallback = rule.clone({ selector, nodes: [] });
        fallback.append({ prop: side, value: gap });
        rule.after(fallback);
      }
    },
  };
}

function splitArgs(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
