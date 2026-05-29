const { CallGraph, parseJS, parsePython, parseRust, parseSource } = require('../src/graph');
const { buildWeightedLaplacian, computeEigenvalues, computeConservation, analyzeConservation, compareConservation } = require('../src/conservation');

// === CallGraph tests ===

test('CallGraph add nodes and edges', () => {
  const g = new CallGraph('test');
  g.addNode('a', { complexity: 2 });
  g.addNode('b', { complexity: 3 });
  g.addEdge('a', 'b', 1);
  expect(g.nodes.size).toBe(2);
  expect(g.edges.length).toBe(1);
  expect(g.edges[0].weight).toBe(1);
});

test('CallGraph aggregates duplicate edges', () => {
  const g = new CallGraph('test');
  g.addNode('a');
  g.addNode('b');
  g.addEdge('a', 'b', 1);
  g.addEdge('a', 'b', 1);
  expect(g.edges.length).toBe(1);
  expect(g.edges[0].weight).toBe(2);
});

test('CallGraph summary', () => {
  const g = new CallGraph('test');
  g.addNode('a');
  g.addNode('b');
  g.addEdge('a', 'b');
  const s = g.summary();
  expect(s.name).toBe('test');
  expect(s.nodes).toBe(2);
  expect(s.edges).toBe(1);
});

test('CallGraph getAdjacency', () => {
  const g = new CallGraph('test');
  g.addNode('a');
  g.addNode('b');
  g.addEdge('a', 'b', 2);
  const adj = g.getAdjacency();
  expect(adj.get('a').length).toBe(1);
  expect(adj.get('a')[0].to).toBe('b');
  expect(adj.get('a')[0].weight).toBe(2);
});

// === Parser tests ===

test('parseJS finds functions and calls', () => {
  const src = `
    function foo() { bar(); baz(); }
    function bar() { return 1; }
    function baz() { foo(); }
  `;
  const g = parseJS(src, 'test');
  expect(g.nodes.has('foo')).toBe(true);
  expect(g.nodes.has('bar')).toBe(true);
  expect(g.nodes.has('baz')).toBe(true);
  // foo calls bar and baz
  const fooEdges = g.edges.filter(e => e.from === 'foo');
  expect(fooEdges.length).toBe(2);
});

test('parsePython finds defs and calls', () => {
  const src = `
def add(a, b):
    return a + b

def main():
    result = add(1, 2)
    print(result)
`;
  const g = parsePython(src, 'test');
  expect(g.nodes.has('add')).toBe(true);
  expect(g.nodes.has('main')).toBe(true);
  const mainEdges = g.edges.filter(e => e.from === 'main');
  expect(mainEdges.length).toBe(1);
  expect(mainEdges[0].to).toBe('add');
});

test('parseRust finds fns', () => {
  const src = `
pub fn add(a: i32, b: i32) -> i32 { a + b }
fn main() { let x = add(1, 2); }
`;
  const g = parseRust(src, 'test');
  expect(g.nodes.has('add')).toBe(true);
  expect(g.nodes.has('main')).toBe(true);
});

test('parseSource dispatches correctly', () => {
  const js = 'function hello() { world(); }';
  const g = parseSource(js, 'javascript', 'test');
  expect(g.nodes.has('hello')).toBe(true);
});

// === Conservation analysis tests ===

test('analyzeConservation single node', () => {
  const g = new CallGraph('single');
  g.addNode('only', { complexity: 1 });
  const result = analyzeConservation(g);
  expect(result.conservation.score).toBe(1.0);
});

test('analyzeConservation multi-node graph', () => {
  const g = new CallGraph('multi');
  g.addNode('a', { complexity: 2 });
  g.addNode('b', { complexity: 3 });
  g.addNode('c', { complexity: 1 });
  g.addEdge('a', 'b', 1);
  g.addEdge('b', 'c', 1);
  const result = analyzeConservation(g);
  expect(result.conservation.score).toBeGreaterThanOrEqual(0);
  expect(result.conservation.score).toBeLessThanOrEqual(1);
  expect(result.eigenvalueCount).toBeGreaterThan(0);
});

test('compareConservation', () => {
  const gA = new CallGraph('a');
  gA.addNode('x', { complexity: 1 });
  gA.addNode('y', { complexity: 1 });
  gA.addEdge('x', 'y', 1);

  const gB = new CallGraph('b');
  gB.addNode('x', { complexity: 1 });

  const result = compareConservation(gA, gB, 'multi', 'single');
  expect(result.winner).toBeDefined();
  expect(typeof result.delta).toBe('number');
});

test('computeConservation with eigenvalues', () => {
  const eigs = [0.1, 0.5, 1.0, 2.0, 4.0];
  const result = computeConservation(eigs);
  expect(result.score).toBeGreaterThanOrEqual(0);
  expect(result.score).toBeLessThanOrEqual(1);
  expect(result.spectralFlatness).toBeGreaterThan(0);
  expect(result.smoothness).toBeGreaterThan(0);
});

test('buildWeightedLaplacian produces symmetric matrix', () => {
  const g = new CallGraph('sym');
  g.addNode('a', { complexity: 2 });
  g.addNode('b', { complexity: 3 });
  g.addEdge('a', 'b', 1);
  const { L, n } = buildWeightedLaplacian(g);
  expect(n).toBe(2);
  // Check symmetry
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      expect(Math.abs(L[i][j] - L[j][i])).toBeLessThan(1e-10);
    }
  }
});
