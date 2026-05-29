#!/usr/bin/env node
/**
 * Code Structure Conservation Analyzer
 * 
 * Main experiment runner. Executes all 5 experiments and outputs results.
 */

const fs = require('fs');
const path = require('path');
const { parseFile, parseSource, CallGraph } = require('./src/graph');
const { analyzeConservation, compareConservation, computeEigenvalues, buildWeightedLaplacian, computeConservation } = require('./src/conservation');

const SAMPLES = path.join(__dirname, 'samples');
const RESULTS = path.join(__dirname, 'results');

// Ensure results dir
if (!fs.existsSync(RESULTS)) fs.mkdirSync(RESULTS, { recursive: true });

// ─── ASCII Plotter ──────────────────────────────────────────────────

function barChart(title, data, width = 50) {
  // data: [{ label, value, max? }]
  const maxVal = Math.max(...data.map(d => Math.abs(d.value)));
  const lines = [`\n  ╔══ ${title} ══╗\n`];

  for (const d of data) {
    const barLen = maxVal > 0 ? Math.round((Math.abs(d.value) / maxVal) * width) : 0;
    const bar = '█'.repeat(barLen) + '░'.repeat(width - barLen);
    const sign = d.value < 0 ? '-' : '';
    lines.push(`  ${d.label.padEnd(20)} │${bar}│ ${sign}${d.value.toFixed(4)}`);
  }
  lines.push('');
  return lines.join('\n');
}

function spectrumPlot(title, eigenvalues) {
  if (!eigenvalues || eigenvalues.length === 0) return `\n  [${title}] No eigenvalues\n`;

  const width = 50;
  const maxEv = Math.max(...eigenvalues.map(e => Math.abs(e)));
  const lines = [`\n  ┌─── ${title} (Spectrum) ───┐\n`];

  for (let i = 0; i < eigenvalues.length; i++) {
    const ev = eigenvalues[i];
    const barLen = maxEv > 0 ? Math.round((Math.abs(ev) / maxEv) * width) : 0;
    const bar = '▓'.repeat(barLen) + '░'.repeat(width - barLen);
    lines.push(`  λ${String(i).padStart(2)} = ${ev.toFixed(4).padStart(10)} │${bar}│`);
  }

  // Conservation ratio visualization
  const n = eigenvalues.length;
  const halfIdx = Math.floor(n / 2);
  const lowE = eigenvalues.slice(0, halfIdx).reduce((s, e) => s + e * e, 0);
  const totalE = eigenvalues.reduce((s, e) => s + e * e, 0);
  const ratio = totalE > 0 ? lowE / totalE : 0;

  lines.push(`\n  Low-mode energy:  ${(ratio * 100).toFixed(1)}%`);
  lines.push(`  High-mode energy: ${((1 - ratio) * 100).toFixed(1)}%`);
  lines.push('');
  return lines.join('\n');
}

// ─── Experiment 1: Clean vs Spaghetti ───────────────────────────────

function experiment1() {
  console.log('\n' + '═'.repeat(70));
  console.log('  EXPERIMENT 1: Well-Structured vs Spaghetti Code');
  console.log('═'.repeat(70));
  console.log('\n  Hypothesis: Clean modular code has HIGHER conservation');
  console.log('  than tangled spaghetti code.\n');

  const cleanGraph = parseFile(path.join(SAMPLES, 'clean-http.js'));
  const spaghettiGraph = parseFile(path.join(SAMPLES, 'spaghetti-http.js'));

  console.log(`  Clean module:      ${cleanGraph.nodes.size} functions, ${cleanGraph.edges.length} call edges`);
  console.log(`  Spaghetti module:  ${spaghettiGraph.nodes.size} functions, ${spaghettiGraph.edges.length} call edges`);

  const cleanResult = analyzeConservation(cleanGraph);
  const spaghettiResult = analyzeConservation(spaghettiGraph);

  console.log('\n' + barChart('Conservation Scores', [
    { label: 'Clean (modular)', value: cleanResult.conservation.score },
    { label: 'Spaghetti', value: spaghettiResult.conservation.score },
  ]));

  console.log(barChart('Spectral Flatness', [
    { label: 'Clean (modular)', value: cleanResult.conservation.spectralFlatness },
    { label: 'Spaghetti', value: spaghettiResult.conservation.spectralFlatness },
  ]));

  console.log(barChart('Smoothness', [
    { label: 'Clean (modular)', value: cleanResult.conservation.smoothness },
    { label: 'Spaghetti', value: spaghettiResult.conservation.smoothness },
  ]));

  console.log(spectrumPlot('Clean Module', cleanResult.conservation.eigenvalues));
  console.log(spectrumPlot('Spaghetti Module', spaghettiResult.conservation.eigenvalues));

  const hypothesisConfirmed = cleanResult.conservation.score > spaghettiResult.conservation.score;
  console.log(`  ✓ HYPOTHESIS ${hypothesisConfirmed ? 'CONFIRMED' : 'REFUTED'}: Clean score = ${cleanResult.conservation.score.toFixed(4)}, Spaghetti = ${spaghettiResult.conservation.score.toFixed(4)}`);
  console.log(`    Δ = ${(cleanResult.conservation.score - spaghettiResult.conservation.score).toFixed(4)}`);

  return { clean: cleanResult, spaghetti: spaghettiResult, confirmed: hypothesisConfirmed };
}

// ─── Experiment 2: Progressive Degradation ──────────────────────────

function experiment2() {
  console.log('\n' + '═'.repeat(70));
  console.log('  EXPERIMENT 2: Refactoring Detection via Progressive Degradation');
  console.log('═'.repeat(70));
  console.log('\n  Take clean code, progressively degrade it. Track conservation drop.\n');

  // Start with clean code and create degradation levels
  const levels = [
    {
      name: 'Level 0: Clean',
      code: `
function parseInput(raw) { return raw.trim().split(','); }
function validateInput(parts) { return parts.length === 3; }
function transformData(parts) { return { name: parts[0], value: Number(parts[1]) }; }
function formatOutput(item) { return item.name + ': ' + item.value; }
function processItem(raw) {
  const parts = parseInput(raw);
  if (!validateInput(parts)) return null;
  const data = transformData(parts);
  return formatOutput(data);
}
function runAll(inputs) { return inputs.map(processItem).filter(Boolean); }
`
    },
    {
      name: 'Level 1: Mild coupling',
      code: `
function parseInput(raw) { return raw.trim().split(','); }
function validateInput(parts) { return parts.length === 3; }
function transformData(parts) {
  validateInput(parts);
  return { name: parts[0], value: Number(parts[1]) };
}
function formatOutput(item) { return item.name + ': ' + item.value; }
function processItem(raw) {
  const parts = parseInput(raw);
  const data = transformData(parts);
  formatOutput(data);
  validateInput(parts);
  return formatOutput(data);
}
function runAll(inputs) {
  const results = inputs.map(processItem).filter(Boolean);
  formatOutput(results[0]);
  return results;
}
`
    },
    {
      name: 'Level 2: Cross-cutting calls',
      code: `
function parseInput(raw) {
  validateInput(raw.split(','));
  return raw.trim().split(',');
}
function validateInput(parts) {
  if (parts.length < 2) {
    formatOutput({ name: 'error', value: 0 });
    return false;
  }
  transformData(parts);
  return parts.length === 3;
}
function transformData(parts) {
  parseInput(parts.join(','));
  validateInput(parts);
  return { name: parts[0], value: Number(parts[1]) };
}
function formatOutput(item) {
  transformData([item.name, String(item.value)]);
  return item.name + ': ' + item.value;
}
function processItem(raw) {
  parseInput(raw);
  validateInput(raw.split(','));
  transformData(raw.split(','));
  formatOutput({ name: 'x', value: 1 });
  return null;
}
function runAll(inputs) {
  processItem(inputs[0]);
  parseInput(inputs[0]);
  return [];
}
`
    },
    {
      name: 'Level 3: Maximum spaghetti',
      code: `
function parseInput(raw) {
  validateInput(raw.split(','));
  transformData([raw]);
  formatOutput(null);
  runAll([raw]);
  validateInput(raw.split(','));
  processItem(raw);
  return raw.trim().split(',');
}
function validateInput(parts) {
  parseInput(parts.join(','));
  formatOutput({ name: 'err' });
  transformData(parts);
  runAll(parts);
  processItem(parts[0]);
  return parts.length === 3;
}
function transformData(parts) {
  parseInput(parts.join(','));
  validateInput(parts);
  formatOutput(null);
  runAll(parts);
  processItem('');
  return { name: parts[0] };
}
function formatOutput(item) {
  parseInput('x');
  validateInput([]);
  transformData([]);
  runAll([]);
  processItem('');
  return item;
}
function processItem(raw) {
  parseInput(raw);
  validateInput([]);
  transformData([]);
  formatOutput(null);
  runAll([raw]);
  return raw;
}
function runAll(inputs) {
  parseInput(inputs[0]);
  validateInput([]);
  transformData([]);
  formatOutput(null);
  processItem('');
  return [];
}
`
    }
  ];

  const results = [];
  for (const level of levels) {
    const graph = parseSource(level.code, 'javascript', level.name);
    const analysis = analyzeConservation(graph);
    results.push({
      name: level.name,
      score: analysis.conservation.score,
      nodes: graph.nodes.size,
      edges: graph.edges.length,
      eigenvalues: analysis.conservation.eigenvalues
    });
  }

  console.log(barChart('Conservation vs Degradation Level', results.map(r => ({
    label: r.name,
    value: r.score
  }))));

  console.log('\n  Degradation trajectory:');
  for (const r of results) {
    const bar = '●'.repeat(Math.round(r.score * 30));
    console.log(`    ${r.name.padEnd(30)} ${bar} ${r.score.toFixed(4)}`);
  }

  const monotonic = results.every((r, i) => i === 0 || r.score <= results[i - 1].score);
  console.log(`\n  ${monotonic ? '✓' : '✗'} Conservation ${monotonic ? 'decreases monotonically' : 'does NOT decrease monotonically'} with degradation`);

  return { results, monotonic };
}

// ─── Experiment 3: Bug Prediction ──────────────────────────────────

function experiment3() {
  console.log('\n' + '═'.repeat(70));
  console.log('  EXPERIMENT 3: Bug Prediction — Low Conservation → More Bugs?');
  console.log('═'.repeat(70));
  console.log('\n  Inject known anti-patterns and measure conservation vs "bug count".\n');

  const testCases = [
    {
      name: 'No bugs (clean)',
      bugCount: 0,
      code: `
function initialize(config) { return { ...config, ready: true }; }
function fetchData(source) { return { data: [], source }; }
function processData(data, filter) { return data.filter(filter); }
function saveResults(results, dest) { return { saved: results.length, dest }; }
function notify(message) { return { sent: true, message }; }
function runPipeline(config) {
  const state = initialize(config);
  const raw = fetchData(state.source);
  const processed = processData(raw.data, state.filter);
  saveResults(processed, state.output);
  notify('Pipeline complete');
  return processed;
}
`
    },
    {
      name: '1 bug (missing null check)',
      bugCount: 1,
      code: `
function initialize(config) { return { ...config, ready: true }; }
function fetchData(source) { return { data: null, source }; }
function processData(data, filter) { return data.filter(filter); }
function saveResults(results, dest) { return { saved: results.length, dest }; }
function notify(message) { return { sent: true, message }; }
function runPipeline(config) {
  const state = initialize(config);
  const raw = fetchData(state.source);
  const processed = processData(raw.data, state.filter);
  saveResults(processed, state.output);
  notify('Pipeline complete');
  return processed;
}
`
    },
    {
      name: '3 bugs (anti-patterns)',
      bugCount: 3,
      code: `
function initialize(config) { return { ...config, ready: true }; }
function fetchData(source) { 
  initialize(source);
  processData([], null);
  return { data: null, source }; 
}
function processData(data, filter) { 
  fetchData(null);
  saveResults([], null);
  return data.filter(filter); 
}
function saveResults(results, dest) { 
  processData(results, null);
  fetchData(dest);
  return { saved: results.length, dest }; 
}
function notify(message) { 
  initialize(null);
  return { sent: true, message }; 
}
function runPipeline(config) {
  const state = initialize(config);
  const raw = fetchData(state.source);
  const processed = processData(raw.data, state.filter);
  saveResults(processed, state.output);
  notify('Pipeline complete');
  return processed;
}
`
    },
    {
      name: '5 bugs (severe anti-patterns)',
      bugCount: 5,
      code: `
function initialize(config) { 
  fetchData(null);
  processData(null, null);
  return { ...config, ready: true }; 
}
function fetchData(source) { 
  initialize(source);
  processData([], null);
  saveResults([], null);
  notify('error');
  return { data: null, source }; 
}
function processData(data, filter) { 
  fetchData(null);
  saveResults([], null);
  notify('processing');
  initialize(null);
  return data.filter(filter); 
}
function saveResults(results, dest) { 
  processData(results, null);
  fetchData(dest);
  notify('saved');
  initialize(dest);
  return { saved: results.length, dest }; 
}
function notify(message) { 
  initialize(null);
  fetchData(null);
  processData([], null);
  saveResults([], null);
  return { sent: true, message }; 
}
function runPipeline(config) {
  initialize(config);
  fetchData(null);
  processData(null, null);
  saveResults([], null);
  notify('broken');
  return null;
}
`
    }
  ];

  const results = testCases.map(tc => {
    const graph = parseSource(tc.code, 'javascript', tc.name);
    const analysis = analyzeConservation(graph);
    return {
      name: tc.name,
      bugs: tc.bugCount,
      conservation: analysis.conservation.score,
      spectralFlatness: analysis.conservation.spectralFlatness,
      smoothness: analysis.conservation.smoothness
    };
  });

  console.log(barChart('Conservation vs Bug Count', results.map(r => ({
    label: `${r.name} (${r.bugs} bugs)`,
    value: r.conservation
  }))));

  console.log('\n  Bug correlation analysis:');
  for (const r of results) {
    const bugIcon = '🐛'.repeat(r.bugs) || '✓';
    const bar = '●'.repeat(Math.round(r.conservation * 30));
    console.log(`    ${r.name.padEnd(35)} ${bar} ${r.conservation.toFixed(4)}  ${bugIcon}`);
  }

  // Check correlation
  const conservationScores = results.map(r => r.conservation);
  const bugCounts = results.map(r => r.bugs);
  const meanC = conservationScores.reduce((a, b) => a + b) / conservationScores.length;
  const meanB = bugCounts.reduce((a, b) => a + b) / bugCounts.length;
  let num = 0, denC = 0, denB = 0;
  for (let i = 0; i < results.length; i++) {
    const dc = conservationScores[i] - meanC;
    const db = bugCounts[i] - meanB;
    num += dc * db;
    denC += dc * dc;
    denB += db * db;
  }
  const correlation = denC > 0 && denB > 0 ? num / Math.sqrt(denC * denB) : 0;

  console.log(`\n  Pearson correlation (conservation vs bugs): ${correlation.toFixed(4)}`);
  console.log(`  ${correlation < -0.5 ? '✓' : '✗'} ${correlation < -0.5 ? 'Strong negative correlation: low conservation predicts more bugs' : 'Weak correlation'}`);

  return { results, correlation };
}

// ─── Experiment 4: Language Comparison ──────────────────────────────

function experiment4() {
  console.log('\n' + '═'.repeat(70));
  console.log('  EXPERIMENT 4: Language Comparison — Python vs JS vs Rust-style');
  console.log('═'.repeat(70));
  console.log('\n  Compare conservation across languages in similar codebases.\n');

  // Parse clean samples in different languages
  const jsGraph = parseFile(path.join(SAMPLES, 'clean-http.js'));
  const pyGraph = parseFile(path.join(SAMPLES, 'clean-python.py'));
  const rustStyleGraph = parseFile(path.join(SAMPLES, 'clean-rust-style.py'));

  const jsResult = analyzeConservation(jsGraph);
  const pyResult = analyzeConservation(pyGraph);
  const rustResult = analyzeConservation(rustStyleGraph);

  console.log(barChart('Conservation by Language', [
    { label: 'JavaScript', value: jsResult.conservation.score },
    { label: 'Python', value: pyResult.conservation.score },
    { label: 'Rust-style', value: rustResult.conservation.score },
  ]));

  console.log(barChart('Spectral Flatness by Language', [
    { label: 'JavaScript', value: jsResult.conservation.spectralFlatness },
    { label: 'Python', value: pyResult.conservation.spectralFlatness },
    { label: 'Rust-style', value: rustResult.conservation.spectralFlatness },
  ]));

  console.log(barChart('Smoothness by Language', [
    { label: 'JavaScript', value: jsResult.conservation.smoothness },
    { label: 'Python', value: pyResult.conservation.smoothness },
    { label: 'Rust-style', value: rustResult.conservation.smoothness },
  ]));

  const ranked = [
    { lang: 'JavaScript', score: jsResult.conservation.score },
    { lang: 'Python', score: pyResult.conservation.score },
    { lang: 'Rust-style', score: rustResult.conservation.score },
  ].sort((a, b) => b.score - a.score);

  console.log(`\n  Ranking: ${ranked.map(r => `${r.lang} (${r.score.toFixed(4)})`).join(' > ')}`);

  return { js: jsResult, py: pyResult, rust: rustResult, ranked };
}

// ─── Experiment 5: Analyze moo-spectral.js ─────────────────────────

function experiment5() {
  console.log('\n' + '═'.repeat(70));
  console.log('  EXPERIMENT 5: The Moo Connection — Analyze Our Own Code');
  console.log('═'.repeat(70));
  console.log('\n  Analyze moo-spectral.js and conservation codebases.\n');

  // Check if moo-spectral.js exists
  const mooPath = path.join(__dirname, '..', 'moo-spectral.js');
  const mooExists = fs.existsSync(mooPath);

  if (mooExists) {
    console.log('  Found moo-spectral.js — analyzing...\n');
    const mooGraph = parseFile(mooPath);
    const mooResult = analyzeConservation(mooGraph);

    console.log(`  moo-spectral.js: ${mooGraph.nodes.size} functions, ${mooGraph.edges.length} edges`);
    console.log(`  Conservation score: ${mooResult.conservation.score.toFixed(4)}`);
    console.log(spectrumPlot('moo-spectral.js', mooResult.conservation.eigenvalues));

    return { found: true, result: mooResult };
  } else {
    console.log('  moo-spectral.js not found. Creating synthetic moo-style code...\n');

    // Create a synthetic spectral analysis module
    const syntheticMoo = `
function tokenize(source) {
  const tokens = [];
  let pos = 0;
  while (pos < source.length) {
    if (source[pos] === ' ') { pos++; continue; }
    tokens.push(source[pos]);
    pos++;
  }
  return tokens;
}
function computeFrequencies(tokens) {
  const freq = {};
  for (const t of tokens) { freq[t] = (freq[t] || 0) + 1; }
  return freq;
}
function buildSpectrum(freq) {
  const values = Object.values(freq);
  const total = values.reduce((a, b) => a + b, 0);
  return values.map(v => v / total);
}
function spectralFlatness(spectrum) {
  const n = spectrum.length;
  const logSum = spectrum.reduce((s, v) => s + Math.log(v + 1e-10), 0);
  const geoMean = Math.exp(logSum / n);
  const ariMean = spectrum.reduce((s, v) => s + v, 0) / n;
  return geoMean / (ariMean + 1e-10);
}
function spectralCentroid(spectrum) {
  let weightedSum = 0;
  let total = 0;
  for (let i = 0; i < spectrum.length; i++) {
    weightedSum += i * spectrum[i];
    total += spectrum[i];
  }
  return total > 0 ? weightedSum / total : 0;
}
function spectralRolloff(spectrum, threshold) {
  const total = spectrum.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  for (let i = 0; i < spectrum.length; i++) {
    cumulative += spectrum[i];
    if (cumulative >= total * threshold) return i;
  }
  return spectrum.length;
}
function analyzeSpectral(source) {
  const tokens = tokenize(source);
  const freq = computeFrequencies(tokens);
  const spectrum = buildSpectrum(freq);
  const flatness = spectralFlatness(spectrum);
  const centroid = spectralCentroid(spectrum);
  const rolloff = spectralRolloff(spectrum, 0.85);
  return { flatness, centroid, rolloff, tokenCount: tokens.length };
}
`;

    const syntheticGraph = parseSource(syntheticMoo, 'javascript', 'moo-spectral-synthetic');
    const syntheticResult = analyzeConservation(syntheticGraph);

    console.log(`  Synthetic moo-spectral: ${syntheticGraph.nodes.size} functions, ${syntheticGraph.edges.length} edges`);
    console.log(`  Conservation score: ${syntheticResult.conservation.score.toFixed(4)}`);
    console.log(spectrumPlot('moo-spectral (synthetic)', syntheticResult.conservation.eigenvalues));

    // Also analyze our own conservation.js
    const conservationCode = fs.readFileSync(path.join(__dirname, 'src', 'conservation.js'), 'utf-8');
    const consGraph = parseSource(conservationCode, 'javascript', 'conservation.js');
    const consResult = analyzeConservation(consGraph);

    console.log(`\n  Our conservation.js: ${consGraph.nodes.size} functions, ${consGraph.edges.length} edges`);
    console.log(`  Conservation score: ${consResult.conservation.score.toFixed(4)}`);
    console.log(spectrumPlot('conservation.js (self-analysis)', consResult.conservation.eigenvalues));

    console.log(barChart('Self-Analysis: Our Code', [
      { label: 'moo-spectral', value: syntheticResult.conservation.score },
      { label: 'conservation.js', value: consResult.conservation.score },
    ]));

    return { found: false, moo: syntheticResult, conservation: consResult };
  }
}

// ─── Run All Experiments ────────────────────────────────────────────

function main() {
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║  CODE STRUCTURE CONSERVATION ANALYZER                              ║');
  console.log('║  "Is well-structured code more conserved than spaghetti?"           ║');
  console.log('╚' + '═'.repeat(68) + '╝');

  const allResults = {};

  try {
    allResults.experiment1 = experiment1();
  } catch (e) { console.error('  Experiment 1 failed:', e.message); }

  try {
    allResults.experiment2 = experiment2();
  } catch (e) { console.error('  Experiment 2 failed:', e.message); }

  try {
    allResults.experiment3 = experiment3();
  } catch (e) { console.error('  Experiment 3 failed:', e.message); }

  try {
    allResults.experiment4 = experiment4();
  } catch (e) { console.error('  Experiment 4 failed:', e.message); }

  try {
    allResults.experiment5 = experiment5();
  } catch (e) { console.error('  Experiment 5 failed:', e.message); }

  // ─── Summary ────────────────────────────────────────────────────

  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║  SUMMARY                                                            ║');
  console.log('╠' + '═'.repeat(68) + '╣');

  if (allResults.experiment1) {
    const e1 = allResults.experiment1;
    console.log(`║  Exp 1 (Clean vs Spaghetti): ${e1.confirmed ? '✓ CONFIRMED' : '✗ REFUTED'.padEnd(39)} ║`);
  }
  if (allResults.experiment2) {
    const e2 = allResults.experiment2;
    console.log(`║  Exp 2 (Degradation): ${e2.monotonic ? 'Monotonic decrease' : 'Non-monotonic'.padEnd(43)} ║`);
  }
  if (allResults.experiment3) {
    const e3 = allResults.experiment3;
    console.log(`║  Exp 3 (Bug prediction): r = ${e3.correlation.toFixed(4)}${(e3.correlation < -0.5 ? ' (significant)' : '').padEnd(28)} ║`);
  }
  if (allResults.experiment4) {
    const e4 = allResults.experiment4;
    const top = e4.ranked[0];
    console.log(`║  Exp 4 (Languages): ${top.lang} wins (${top.score.toFixed(4)})${''.padEnd(25)} ║`);
  }
  if (allResults.experiment5) {
    console.log(`║  Exp 5 (Self-analysis): Complete${''.padEnd(38)} ║`);
  }

  console.log('╚' + '═'.repeat(68) + '╝\n');

  // Save results
  fs.writeFileSync(path.join(RESULTS, 'full-results.json'), JSON.stringify(allResults, null, 2));
  console.log('  Results saved to results/full-results.json\n');

  // Generate summary plot data for external visualization
  const plotData = {
    title: 'Code Conservation Analysis',
    experiments: {
      'clean-vs-spaghetti': allResults.experiment1 ? {
        clean: allResults.experiment1.clean.conservation.score,
        spaghetti: allResults.experiment1.spaghetti.conservation.score
      } : null,
      'degradation': allResults.experiment2 ? allResults.experiment2.results.map(r => ({
        level: r.name, score: r.score
      })) : null,
      'bugs': allResults.experiment3 ? allResults.experiment3.results.map(r => ({
        name: r.name, bugs: r.bugs, conservation: r.conservation
      })) : null
    }
  };
  fs.writeFileSync(path.join(RESULTS, 'plot-data.json'), JSON.stringify(plotData, null, 2));
}

main();
