// @vitest-environment node
// Proje kapısı (kaynak düzeyi): kalıcı hareket sözleşmesi ve çevreleyen odak halkası yasağı.
// İhlalde FAIL verir. Çalışma zamanı kanıtı e2e/studio.spec.ts'tedir (hesaplanmış stil, gerçek tarayıcı).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { theme } from '../theme/theme';
import { MOTION, MOTION_RANGE } from '../theme/tokens';

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const MANTINE = join(ROOT, 'node_modules', '@mantine', 'core');

function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const files = walk(SRC).filter((p) => /\.(scss|ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p));
const styles = files.filter((p) => p.endsWith('.scss'));
const scripts = files.filter((p) => /\.tsx?$/.test(p));
const read = (p: string) => readFileSync(p, 'utf8');
const rel = (p: string) => relative(ROOT, p);
/** Yorumları çıkarır (satır numaraları korunur). */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/.*$/gm, '$1');

/** İzinli tek normal istisna dalı: az hareket tercihi. Bu bloklar süre denetiminden çıkarılır. */
function withoutReducedMotion(s: string) {
  let out = s;
  for (;;) {
    const i = out.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/);
    if (i < 0) return out;
    let depth = 0;
    let j = out.indexOf('{', i);
    for (; j < out.length; j += 1) {
      if (out[j] === '{') depth += 1;
      else if (out[j] === '}' && (depth -= 1) === 0) break;
    }
    out = out.slice(0, i) + out.slice(i, j + 1).replace(/[^\n]/g, ' ') + out.slice(j + 1);
  }
}

describe('hareket sözleşmesi: tokenlar', () => {
  it('varsayılan eğri simetrik easeInOut Cubic', () => {
    expect(MOTION.ease).toBe('cubic-bezier(.65, 0, .35, 1)');
  });
  it('süreler pozitif, sonlu ve proje aralığında', () => {
    for (const d of [MOTION.fast, MOTION.base, MOTION.slow]) {
      expect(Number.isFinite(d)).toBe(true);
      expect(d).toBeGreaterThanOrEqual(MOTION_RANGE.min);
      expect(d).toBeLessThanOrEqual(MOTION_RANGE.max);
    }
  });
});

describe('hareket sözleşmesi: kaynak denetimi', () => {
  it('ham eğri yalnız token dosyasında', () => {
    const bad = files.filter((p) => basename(p) !== 'tokens.ts' && /cubic-bezier\(/.test(strip(read(p)))).map(rel);
    expect(bad).toEqual([]);
  });
  it('transition: all yok', () => {
    const bad = files.filter((p) => /transition(-property)?\s*:\s*all\b|transition:\s*['"]all\b/.test(strip(read(p)))).map(rel);
    expect(bad).toEqual([]);
  });
  /** Biçimden bağımsız: bütün transition/animation bildirimleri (satır numarasıyla). */
  const decls = (text: string) => [...text.matchAll(/(?<![\w-])(transition|animation)([a-z-]*)\s*:\s*([^;{}]+)/g)]
    .map((m) => ({ prop: m[1] + m[2], value: m[3].trim(), line: text.slice(0, m.index).split('\n').length }));
  it('geçiş ve animasyon bildirimlerinde onaysız eğri (ease, linear, steps) yok', () => {
    const bad: string[] = [];
    for (const p of styles) {
      for (const d of decls(strip(read(p)))) {
        const bare = d.value.replace(/var\([^)]*\)/g, '');
        if (/(^|[\s,])(ease|ease-in|ease-out|ease-in-out|linear)\b|steps\(/.test(bare)) bad.push(`${rel(p)}:${d.line} ${d.prop}: ${d.value}`);
      }
    }
    for (const p of scripts) {
      strip(read(p)).split('\n').forEach((line, i) => {
        if (/(timingFunction|transitionTimingFunction)\s*[:=]\s*['"`]/.test(line) || /transition:\s*['"`][^'"`]*\b(ease|linear)\b/.test(line)) bad.push(`${rel(p)}:${i + 1} ${line.trim()}`);
      });
    }
    expect(bad).toEqual([]);
  });
  it('geçiş süreleri tokenlardan (az hareket dalı hariç sabit ms/s yok)', () => {
    const bad: string[] = [];
    for (const p of styles) {
      for (const d of decls(withoutReducedMotion(strip(read(p))))) {
        if (/(^|[\s,(])\d*\.?\d+m?s\b/.test(d.value.replace(/var\([^)]*\)/g, ''))) bad.push(`${rel(p)}:${d.line} ${d.prop}: ${d.value}`);
      }
    }
    for (const p of scripts) {
      strip(read(p)).split('\n').forEach((line, i) => {
        if (/\b(duration|transitionDuration|stepTransitionDuration)\s*[:=]\s*\{?\s*\d/.test(line)) bad.push(`${rel(p)}:${i + 1} ${line.trim()}`);
      });
    }
    expect(bad).toEqual([]);
  });
  it('az hareket dalı yalnız süre tokenlarını sıfırlar', () => {
    const g = read(join(SRC, 'theme', 'global.scss'));
    const block = g.slice(g.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toMatch(/--gx-dur:\s*0ms/);
  });
  it('!important ile geçiş yalnız belgeli kütüphane adaptörlerinde (Notifications, Tour)', () => {
    const bad: string[] = [];
    for (const p of styles) {
      const s = strip(read(p));
      const re = /([^{}]+)\{([^{}]*)\}/g;
      for (let m = re.exec(s); m; m = re.exec(s)) {
        if (/transition[^;]*!important/.test(m[2]) && !/mantine-(Notifications|Notification|Tour)-/.test(m[1])) bad.push(`${rel(p)} ${m[1].trim()}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('hareket sözleşmesi: Mantine teması', () => {
  const comps = theme.components as Record<string, { defaultProps?: Record<string, unknown> }>;
  const durations = new Set<number>([MOTION.fast, MOTION.base, MOTION.slow]);
  it('açılır katmanların transitionProps değerleri tokenlardan', () => {
    for (const name of ['Popover', 'Menu', 'Tooltip', 'HoverCard', 'Combobox', 'Modal', 'Drawer']) {
      const tp = comps[name]?.defaultProps?.transitionProps as { duration: number; timingFunction: string } | undefined;
      expect(tp, name).toBeTruthy();
      expect(durations.has(tp!.duration), name).toBe(true);
      expect(tp!.timingFunction, name).toBe(MOTION.ease);
    }
  });
  it('süre ve eğri propları olan bileşenler tokenlarda', () => {
    for (const name of ['Accordion', 'Collapse', 'SegmentedControl', 'AppShell']) {
      const dp = comps[name]?.defaultProps ?? {};
      expect(durations.has(dp.transitionDuration as number), name).toBe(true);
      if (name !== 'Accordion') expect(dp.transitionTimingFunction, name).toBe(MOTION.ease);
    }
  });
});

describe('hareket sözleşmesi: Mantine iç yüzey kapsamı', () => {
  // Kullanılan bileşenler (doğrudan içe aktarılanlar + içlerinde çizilenler).
  const imported = new Set<string>();
  for (const p of scripts) {
    for (const m of read(p).matchAll(/import\s*\{([^}]+)\}\s*from\s*'@mantine\/core'/g)) {
      m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0]).filter((x) => /^[A-Z]/.test(x)).forEach((x) => imported.add(x));
    }
  }
  const INTERNAL: Record<string, string[]> = {
    Modal: ['ModalBase'], Drawer: ['ModalBase'], Select: ['Input', 'Combobox', 'ScrollArea'], TextInput: ['Input'],
    Burger: ['Burger'], Tree: [], Splitter: ['Splitter'],
  };
  const used = new Set([...imported, ...[...imported].flatMap((c) => INTERNAL[c] ?? []), 'ScrollArea', 'ModalBase', 'Input']);

  // Mantine CSS'inden: bileşen → geçiş tanımlayan parçalar.
  const css = read(join(MANTINE, 'styles.css'));
  const rules: { sel: string; body: string }[] = [];
  css.replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel: string, body: string) => { if (/transition/.test(body)) rules.push({ sel, body }); return ''; });
  const partsWithTransition = (comp: string) => {
    const dir = join(MANTINE, 'esm', 'components', comp);
    let map = '';
    try { map = read(join(dir, `${comp}.module.mjs`)); } catch { return []; }
    return [...map.matchAll(/"([^"]+)":\s*"(m_[a-z0-9]+)"/g)]
      .filter(([, , cls]) => rules.some((r) => r.sel.split(',').some((s) => new RegExp(`\\.${cls}(?![a-z0-9_])(::?[a-z-]+|:where\\([^)]*\\)|\\[[^\\]]*\\])*\\s*$`).test(s.trim()))))
      .map(([, part]) => part);
  };
  // Bilinçli istisnalar: geçişi tema propuyla (MOTION) yönetilen ya da kullanılmayan varyant parçaları.
  const ALLOW: Record<string, string> = {
    'AppShell-root': 'transitionDuration/transitionTimingFunction prop (theme.ts)',
    'AppShell-navbar': 'prop', 'AppShell-aside': 'prop', 'AppShell-header': 'prop', 'AppShell-main': 'prop', 'AppShell-footer': 'prop',
    'SegmentedControl-root': 'prop', 'SegmentedControl-label': 'prop', 'SegmentedControl-control': 'prop',
    'Accordion-item--contained': 'varyant kullanılmıyor', 'Accordion-item--separated': 'varyant kullanılmıyor',
  };
  const adapter = read(join(SRC, 'theme', 'global.scss'));

  it('kapsam denetimi boş değil (Mantine eşlemesi çözülebiliyor)', () => {
    expect(used.has('Switch')).toBe(true);
    expect(partsWithTransition('Switch')).toEqual(expect.arrayContaining(['track', 'thumb']));
    expect(partsWithTransition('Slider')).toContain('thumb');
  });
  it('kullanılan her Mantine bileşeninin geçiş yapan parçası adaptörde token ile bağlı', () => {
    const missing: string[] = [];
    for (const comp of used) {
      for (const part of partsWithTransition(comp)) {
        const key = `${comp}-${part}`;
        if (ALLOW[key]) continue;
        if (!adapter.includes(`'${key}'`) && !adapter.includes(`.mantine-${key}`)) missing.push(key);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('odak: çevreleyen halka yasağı (kaynak)', () => {
  it('odak kurallarında halka (outline ya da çevresel box-shadow) yok; tek istisna forced-colors CanvasText', () => {
    const bad: string[] = [];
    for (const p of styles) {
      const s = strip(read(p));
      const re = /([^{}]+)\{([^{}]*)\}/g;
      for (let m = re.exec(s); m; m = re.exec(s)) {
        const sel = m[1].trim();
        if (!/focus/.test(sel)) continue;
        const body = m[2];
        const outline = body.match(/outline\s*:\s*([^;]+)/);
        if (outline && !/^(none|0)\b/.test(outline[1].trim()) && !/^2px solid CanvasText$/.test(outline[1].trim())) bad.push(`${rel(p)} ${sel}: outline ${outline[1]}`);
        const shadow = body.match(/box-shadow\s*:\s*([^;]+)/);
        if (shadow && /(^|,)\s*(inset\s+)?0(px)?\s+0(px)?\s+0(px)?\s+[1-9]/.test(shadow[1])) bad.push(`${rel(p)} ${sel}: halka box-shadow ${shadow[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('forced-colors halkası yalnız klavye modu ve :focus-visible ile', () => {
    for (const p of styles) {
      const s = strip(read(p));
      for (const m of s.matchAll(/([^{}]+)\{[^{}]*outline\s*:\s*2px solid CanvasText/g)) {
        m[1].split(',').map((x) => x.trim()).filter(Boolean).forEach((sel) => {
          expect(sel, `${rel(p)} ${sel}`).toMatch(/\[data-focus='kbd'\][^,]*:focus-visible/);
        });
      }
    }
  });
  it('Mantine odak halkası kapalı', () => {
    expect(theme.focusRing).toBe('never');
  });
});
