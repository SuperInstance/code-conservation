/**
 * Conservation Analysis Engine
 * 
 * Measures how well "complexity" is conserved across a call graph.
 * 
 * The key insight from physics: if complexity flows through a call graph
 * the way energy flows through a network, well-structured code should
 * show HIGH conservation (complexity is distributed predictably),
 * while spaghetti code should show LOW conservation (complexity leaks,
 * concentrates unpredictably).
 * 
 * We measure conservation via spectral graph theory:
 * - Build the graph Laplacian weighted by complexity
 * - Compute eigenvalues (the "spectrum")
 * - Conservation = ratio of energy in low modes vs high modes
 * - Well-structured graphs have smooth spectra (high conservation)
 * - Chaotic graphs have noisy spectra (low conservation)
 */

const { CallGraph } = require('./graph');

// ─── Laplacian Construction ─────────────────────────────────────────

function buildWeightedLaplacian(graph) {
  const ids = Array.from(graph.nodes.keys());
  const n = ids.length;
  const idx = new Map(ids.map((id, i) => [id, i]));

  // Initialize matrix
  const L = Array.from({ length: n }, () => new Float64Array(n));

  // Add edge weights (complexity-weighted)
  for (const e of graph.edges) {
    const i = idx.get(e.from);
    const j = idx.get(e.to);
    if (i === undefined || j === undefined) continue;

    const fromComplexity = graph.nodes.get(e.from)?.complexity || 1;
    const toComplexity = graph.nodes.get(e.to)?.complexity || 1;
    const weight = e.weight * Math.sqrt(fromComplexity * toComplexity);

    L[i][i] += weight;
    L[j][j] += weight;
    L[i][j] -= weight;
    L[j][i] -= weight;
  }

  // Add self-loop based on own complexity (so isolated nodes contribute)
  for (const [id, attrs] of graph.nodes) {
    const i = idx.get(id);
    L[i][i] += attrs.complexity * 0.1; // regularization
  }

  return { L, ids, n };
}

// ─── Power Iteration Eigenvalue Solver ──────────────────────────────

function matVecMul(M, v, n) {
  const result = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += M[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
}

function normalize(v) {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm);
  if (norm < 1e-12) return v;
  const result = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) result[i] = v[i] / norm;
  return result;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Compute top-k eigenvalues using power iteration with deflation.
 * Returns eigenvalues sorted descending.
 */
function computeEigenvalues(L, n, k = Math.min(10, n)) {
  const eigenvalues = [];
  const eigenvectors = [];
  const currentL = L.map(row => Float64Array.from(row));

  for (let ev = 0; ev < k; ev++) {
    // Random initial vector
    let v = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = Math.random() - 0.5;
    v = normalize(v);

    // Power iteration
    let eigenvalue = 0;
    for (let iter = 0; iter < 200; iter++) {
      const Lv = matVecMul(currentL, v, n);
      const newEigenvalue = dot(v, Lv);
      v = normalize(Lv);

      if (Math.abs(newEigenvalue - eigenvalue) < 1e-8 * Math.abs(eigenvalue + 1e-10)) {
        eigenvalue = newEigenvalue;
        break;
      }
      eigenvalue = newEigenvalue;
    }

    eigenvalues.push(eigenvalue);
    eigenvectors.push(v);

    // Deflate
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        currentL[i][j] -= eigenvalue * v[i] * v[j];
      }
    }
  }

  return eigenvalues.sort((a, b) => a - b); // ascending for Laplacian
}

// ─── Conservation Metrics ───────────────────────────────────────────

/**
 * Compute conservation score from eigenvalues.
 * 
 * Conservation = smoothness of eigenvalue distribution.
 * In physics, a conserved system has eigenvalues that follow
 * a predictable pattern (e.g., Weyl's law).
 * 
 * We measure: how much of the spectral energy is in the "smooth" modes?
 * High ratio = high conservation = well-structured.
 */
function computeConservation(eigenvalues) {
  if (eigenvalues.length < 2) return { score: 1.0, details: {} };

  const n = eigenvalues.length;

  // 1. Spectral flatness (geometric mean / arithmetic mean of eigenvalues)
  // Higher = more uniform/conserved
  const shifted = eigenvalues.map(e => e + 1e-10); // avoid log(0)
  const logSum = shifted.reduce((s, e) => s + Math.log(e), 0);
  const geoMean = Math.exp(logSum / n);
  const ariMean = shifted.reduce((s, e) => s + e, 0) / n;
  const spectralFlatness = geoMean / (ariMean + 1e-10);

  // 2. Conservation ratio: energy in first half of modes vs total
  const halfIdx = Math.floor(n / 2);
  const lowEnergy = eigenvalues.slice(0, halfIdx).reduce((s, e) => s + e * e, 0);
  const totalEnergy = eigenvalues.reduce((s, e) => s + e * e, 0);
  const conservationRatio = totalEnergy > 0 ? lowEnergy / totalEnergy : 0;

  // 3. Smoothness: how well eigenvalues fit a smooth curve
  // Compare actual eigenvalues to evenly-spaced (Weyl-like) distribution
  const eMin = eigenvalues[0];
  const eMax = eigenvalues[n - 1];
  let smoothnessError = 0;
  for (let i = 0; i < n; i++) {
    const expected = eMin + (eMax - eMin) * (i / (n - 1));
    smoothnessError += (eigenvalues[i] - expected) ** 2;
  }
  const smoothnessErrorNorm = smoothnessError / (n * Math.max((eMax - eMin) ** 2, 1e-10));
  const smoothness = 1 - Math.min(1, Math.sqrt(smoothnessErrorNorm));

  // 4. Overall conservation: weighted combination
  const score = 0.3 * spectralFlatness + 0.3 * conservationRatio + 0.4 * smoothness;

  return {
    score,
    spectralFlatness,
    conservationRatio,
    smoothness,
    eigenvalues: [...eigenvalues],
    details: { geoMean, ariMean, lowEnergy, totalEnergy, eMin, eMax }
  };
}

// ─── Full Analysis Pipeline ─────────────────────────────────────────

function analyzeConservation(graph, numEigenvalues = null) {
  const { L, ids, n } = buildWeightedLaplacian(graph);

  if (n < 2) {
    return {
      graph: graph.summary(),
      conservation: { score: 1.0, spectralFlatness: 1.0, conservationRatio: 1.0, smoothness: 1.0, eigenvalues: [0], details: {} },
      note: 'Single-node graph — trivially conserved'
    };
  }

  const k = numEigenvalues || Math.min(Math.max(3, Math.floor(n * 0.8)), n);
  const eigenvalues = computeEigenvalues(L, n, k);
  const conservation = computeConservation(eigenvalues);

  return {
    graph: graph.summary(),
    conservation,
    laplacianSize: n,
    eigenvalueCount: k
  };
}

/**
 * Compare two graphs' conservation scores.
 */
function compareConservation(graphA, graphB, labelA = 'A', labelB = 'B') {
  const resultA = analyzeConservation(graphA);
  const resultB = analyzeConservation(graphB);

  return {
    [labelA]: { score: resultA.conservation.score, ...resultA.conservation, graph: resultA.graph },
    [labelB]: { score: resultB.conservation.score, ...resultB.conservation, graph: resultB.graph },
    winner: resultA.conservation.score > resultB.conservation.score ? labelA : labelB,
    delta: Math.abs(resultA.conservation.score - resultB.conservation.score)
  };
}

module.exports = {
  buildWeightedLaplacian,
  computeEigenvalues,
  computeConservation,
  analyzeConservation,
  compareConservation
};
