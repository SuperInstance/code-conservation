/**
 * Code → Call Graph builder
 * Parses Python and JS source into call graphs with complexity attributes.
 */

const fs = require('fs');
const path = require('path');

// ─── Graph Data Structure ───────────────────────────────────────────

class CallGraph {
  constructor(name = 'unnamed') {
    this.name = name;
    this.nodes = new Map(); // id -> { name, complexity, lines, language }
    this.edges = [];        // { from, to, weight }
  }

  addNode(id, attrs = {}) {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { name: id, complexity: 1, lines: 1, ...attrs });
    } else {
      Object.assign(this.nodes.get(id), attrs);
    }
    return this;
  }

  addEdge(from, to, weight = 1) {
    // Aggregate weights for duplicate edges
    const existing = this.edges.find(e => e.from === from && e.to === to);
    if (existing) {
      existing.weight += weight;
    } else {
      this.edges.push({ from, to, weight });
    }
    return this;
  }

  getAdjacency() {
    const adj = new Map();
    for (const [id] of this.nodes) adj.set(id, []);
    for (const e of this.edges) {
      if (adj.has(e.from)) adj.get(e.from).push({ to: e.to, weight: e.weight });
    }
    return adj;
  }

  summary() {
    return { name: this.name, nodes: this.nodes.size, edges: this.edges.length };
  }
}

// ─── JavaScript Parser (regex-based, lightweight) ───────────────────

function parseJS(source, name = 'js-module') {
  const graph = new CallGraph(name);
  const lines = source.split('\n');

  // Find function definitions
  const funcRegex = /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|(\w+)\s*:\s*(?:async\s+)?function)/g;
  const funcDefs = [];
  let m;
  while ((m = funcRegex.exec(source)) !== null) {
    funcDefs.push({ name: m[1] || m[2] || m[3], index: m.index });
  }

  // For each function, estimate its body and find calls
  for (let i = 0; i < funcDefs.length; i++) {
    const fn = funcDefs[i];
    const startIdx = fn.index;
    const endIdx = i + 1 < funcDefs.length ? funcDefs[i + 1].index : source.length;
    const body = source.slice(startIdx, endIdx);
    const bodyLines = body.split('\n');

    // Cyclomatic complexity: count branches + 1
    let complexity = 1;
    const branchWords = /\b(if|else|for|while|case|catch|&&|\|\||\.then\(|\.catch\(|try)\b/g;
    const branches = body.match(branchWords);
    if (branches) complexity += branches.length;
    complexity = Math.max(1, complexity);

    graph.addNode(fn.name, {
      complexity,
      lines: bodyLines.length,
      language: 'javascript'
    });

    // Find function calls within this body
    const callRegex = /\b(\w+)\s*\(/g;
    let cm;
    while ((cm = callRegex.exec(body)) !== null) {
      const callee = cm[1];
      // Skip keywords
      if (['if', 'for', 'while', 'switch', 'return', 'function', 'const', 'let', 'var', 'new', 'typeof', 'catch', 'throw', 'class', 'async', 'await', 'else', 'case', 'try'].includes(callee)) continue;
      if (callee === fn.name) continue; // skip self-calls for simplicity
      graph.addEdge(fn.name, callee, 1);
    }
  }

  return graph;
}

// ─── Python Parser (regex-based, lightweight) ───────────────────────

function parsePython(source, name = 'py-module') {
  const graph = new CallGraph(name);
  const lines = source.split('\n');

  // Find function/class method definitions
  const funcRegex = /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(/gm;
  const funcDefs = [];
  let m;
  while ((m = funcRegex.exec(source)) !== null) {
    funcDefs.push({ name: m[2], indent: m[1].length, index: m.index, lineNum: source.slice(0, m.index).split('\n').length });
  }

  for (let i = 0; i < funcDefs.length; i++) {
    const fn = funcDefs[i];
    // Body extends until next function with same or less indentation
    const startIdx = fn.index;
    let endIdx = source.length;
    for (let j = i + 1; j < funcDefs.length; j++) {
      if (funcDefs[j].indent <= fn.indent) {
        endIdx = funcDefs[j].index;
        break;
      }
    }
    const body = source.slice(startIdx, endIdx);
    const bodyLines = body.split('\n');

    // Cyclomatic complexity
    let complexity = 1;
    const branchWords = /\b(if|elif|else|for|while|except|and|or|with)\b/g;
    const branches = body.match(branchWords);
    if (branches) complexity += branches.length;
    complexity = Math.max(1, complexity);

    graph.addNode(fn.name, {
      complexity,
      lines: bodyLines.length,
      language: 'python'
    });

    // Find function calls
    const callRegex = /\b(\w+)\s*\(/g;
    let cm;
    while ((cm = callRegex.exec(body)) !== null) {
      const callee = cm[1];
      if (['if', 'for', 'while', 'return', 'def', 'class', 'print', 'range', 'len', 'str', 'int', 'float', 'list', 'dict', 'set', 'tuple', 'type', 'isinstance', 'hasattr', 'getattr', 'super', 'raise', 'except', 'with', 'async', 'await', 'True', 'False', 'None'].includes(callee)) continue;
      if (callee === fn.name) continue;
      graph.addEdge(fn.name, callee, 1);
    }
  }

  return graph;
}

// ─── Rust Parser (simplified) ───────────────────────────────────────

function parseRust(source, name = 'rust-module') {
  const graph = new CallGraph(name);

  const funcRegex = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g;
  const funcDefs = [];
  let m;
  while ((m = funcRegex.exec(source)) !== null) {
    funcDefs.push({ name: m[1], index: m.index });
  }

  for (let i = 0; i < funcDefs.length; i++) {
    const fn = funcDefs[i];
    const startIdx = fn.index;
    const endIdx = i + 1 < funcDefs.length ? funcDefs[i + 1].index : source.length;
    const body = source.slice(startIdx, endIdx);
    const bodyLines = body.split('\n');

    let complexity = 1;
    const branchWords = /\b(if|else|match|for|while|loop|&&|\|\||\?\s)/g;
    const branches = body.match(branchWords);
    if (branches) complexity += branches.length;
    complexity = Math.max(1, complexity);

    graph.addNode(fn.name, {
      complexity,
      lines: bodyLines.length,
      language: 'rust'
    });

    const callRegex = /\b(\w+)\s*\(/g;
    let cm;
    while ((cm = callRegex.exec(body)) !== null) {
      const callee = cm[1];
      if (['if', 'for', 'while', 'return', 'fn', 'let', 'mut', 'pub', 'struct', 'enum', 'impl', 'use', 'mod', 'match', 'Some', 'None', 'Ok', 'Err', 'println', 'vec', 'Box', 'Arc', 'Rc', 'new', 'Self', 'self', 'where', 'as', 'async', 'await', 'move'].includes(callee)) continue;
      if (callee === fn.name) continue;
      graph.addEdge(fn.name, callee, 1);
    }
  }

  return graph;
}

// ─── Unified Parser ─────────────────────────────────────────────────

function parseFile(filePath) {
  const ext = path.extname(filePath);
  const name = path.basename(filePath, ext);
  const source = fs.readFileSync(filePath, 'utf-8');

  switch (ext) {
    case '.js': case '.mjs': return parseJS(source, name);
    case '.py': return parsePython(source, name);
    case '.rs': return parseRust(source, name);
    default: throw new Error(`Unsupported language: ${ext}`);
  }
}

function parseSource(source, language, name = 'module') {
  switch (language) {
    case 'javascript': case 'js': return parseJS(source, name);
    case 'python': case 'py': return parsePython(source, name);
    case 'rust': case 'rs': return parseRust(source, name);
    default: throw new Error(`Unsupported language: ${language}`);
  }
}

module.exports = { CallGraph, parseJS, parsePython, parseRust, parseFile, parseSource };
