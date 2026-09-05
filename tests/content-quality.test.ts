import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import katex from "katex";
import { parseQuestionSets } from "../lib/question-schema";
import { scoreQuestion } from "../lib/quiz-engine";

const root = resolve(import.meta.dirname, "../content/question-sets");
const sets = parseQuestionSets(readdirSync(root, { recursive: true })
  .filter((name) => String(name).endsWith(".json"))
  .map((name) => JSON.parse(readFileSync(resolve(root, String(name)), "utf8"))));
const questions = sets.flatMap((set) => set.questions);
const find = (id: string) => {
  const question = questions.find((q) => q.id === id);
  assert.ok(question, `Missing reference problem: ${id}`);
  return question;
};
const close = (a: number, b: number) => Math.abs(a - b) < 1e-10;
function answers(id: string, expected: string[]) {
  const question = find(id);
  assert.deepEqual(question.options.filter((o) => o.points > 0).map((o) => o.id).sort(), expected.sort(), id);
  assert.equal(scoreQuestion(question, expected).earnedPoints, question.maxPoints);
}
function convolution(x: number[], h: number[]) {
  const y = Array<number>(x.length + h.length - 1).fill(0);
  x.forEach((a, i) => h.forEach((b, j) => { y[i + j] += a * b; }));
  return y;
}

test("every inline formula parses and mathematical names use LaTeX commands", () => {
  for (const q of questions) {
    for (const text of [q.prompt, q.explanation, ...q.options.map((o) => o.content)]) {
      for (const match of text.matchAll(/\$([^$]+)\$/g)) {
        assert.doesNotMatch(match[1], /(?<![\\A-Za-z])(omega|theta|alpha|Delta|rho|lambda|pi|sqrt|exp|sin|delta|infinity)/, q.id);
        assert.doesNotThrow(() => katex.renderToString(match[1], { throwOnError: true, strict: "error" }), q.id);
      }
    }
  }
});

test("source references name local teaching files and precise locators", () => {
  for (const q of questions) {
    for (const citation of q.source!.split(";")) {
      assert.match(citation.trim(), /^EE(?:2213|3431C|3731C) .+\.pdf, (?:pages?|slides?) \d/, q.id);
    }
    assert.doesNotMatch(q.source!, /hysteresis section|Type 1-4|consistency section|September|@/i, q.id);
  }
});

test("the answer distribution does not reveal all singles or booleans", () => {
  const positions = questions.filter((q) => q.type === "single")
    .map((q) => q.options.findIndex((o) => o.points > 0));
  assert.equal(new Set(positions).size, 4);
  const counts = [0, 1, 2, 3].map((p) => positions.filter((v) => v === p).length);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
  const booleans = questions.filter((q) => q.type === "boolean");
  const trueCount = booleans.filter((q) => q.options.find((o) => o.id === "true")!.points > 0).length;
  assert.equal(trueCount, 5);
  assert.equal(booleans.length - trueCount, 5);
  const masks = questions.filter((q) => q.type === "multiple")
    .map((q) => q.options.map((o) => o.points > 0 ? "T" : "F").join(""));
  assert.ok(new Set(masks).size >= 15, "Avoid repetitive answer masks even with shuffling disabled");
});

test("mock distractors prevent high credit from blindly selecting every response", () => {
  for (const set of sets.filter((s) => s.id.endsWith("-mock"))) {
    const multiple = set.questions.filter((q) => q.type === "multiple");
    const possible = multiple.reduce((sum, q) => sum + q.maxPoints, 0);
    const blind = multiple.reduce((sum, q) => sum + scoreQuestion(q, q.options.map((o) => o.id)).earnedPoints, 0);
    assert.ok(blind / possible <= 0.55, `${set.id}: select-all ${blind}/${possible}`);
    assert.ok(multiple.every((q) => q.options.filter((o) => o.points < 0).length >= 3));
  }
});

test("independent material calculations: plane density, absorption, Bragg geometry", () => {
  const planarDensity = (4 / 4 + 1) / 0.4 ** 2;
  assert.ok(close(planarDensity, 12.5));
  answers("ee3431c-crystal-fcc-planar-density", ["density-12-5"]);
  assert.match(find("ee3431c-crystal-fcc-planar-density").prompt, /0\.40/);
  const thicknessCm = 0.5 * 1e-4;
  const transmission = Math.exp(-2e4 * thicknessCm);
  assert.ok(close(transmission, Math.exp(-1)));
  answers("ee3431c-band-optical-penetration", ["exp-minus-one"]);
  const theta = 60 / 2 * Math.PI / 180;
  const d = 0.150 / (2 * Math.sin(theta));
  assert.ok(close(d, 0.150));
  answers("ee3431c-mock-xrd-numeric-spacing", ["bragg-angle", "spacing"]);
  assert.ok(close(2.0 - 1.4, 0.6));
  answers("ee3431c-mock-photon-thermalization", ["excess-heat", "pair-remains"]);
});

test("independent constrained-gradient and landmark calculations", () => {
  const [x, y] = [1, 1];
  const gradient = [2 * (x - 3), 4 * (y + 1)];
  const next = [x, y].map((v, i) => Math.max(0, Math.min(10, v - 0.5 * gradient[i])));
  assert.deepEqual(next, [3, 0]);
  answers("ee2213-optimization-projected-two-dimensional", ["three-zero"]);
  assert.equal(Math.abs(11 - 4), 7);
  answers("ee2213-informed-landmark-bound", ["bound-seven", "admissible"]);
});

test("independent A* simulation checks the improved parent and stale entry handling", () => {
  const edges: Record<string, [string, number][]> = {
    S: [["A", 2], ["B", 1]], A: [["G", 4]], B: [["A", 0.5], ["G", 8]], G: [],
  };
  const h: Record<string, number> = { S: 4, A: 3, B: 3.5, G: 0 };
  let sequence = 0;
  const frontier = [{ state: "S", g: 0, sequence: sequence++, path: ["S"] }];
  const best: Record<string, number> = { S: 0 };
  const popped: string[] = [];
  let solution = frontier[0];
  while (frontier.length) {
    frontier.sort((a, b) => (a.g + h[a.state]) - (b.g + h[b.state]) || a.sequence - b.sequence);
    const node = frontier.shift()!;
    if (node.g !== best[node.state]) continue;
    popped.push(node.state);
    if (node.state === "G") { solution = node; break; }
    for (const [state, cost] of edges[node.state]) {
      const g = node.g + cost;
      if (g < (best[state] ?? Infinity)) {
        best[state] = g;
        frontier.push({ state, g, sequence: sequence++, path: [...node.path, state] });
      }
    }
  }
  assert.deepEqual(popped, ["S", "B", "A", "G"]);
  assert.deepEqual(solution.path, ["S", "B", "A", "G"]);
  assert.equal(solution.g, 5.5);
  assert.equal(best.A + h.A, 4.5);
  answers("ee2213-mock-astar-graph-trace", ["pop-order", "path-cost", "replacement"]);
});

test("independent convolution agrees with the rational-transform output", () => {
  assert.deepEqual(convolution([1, 2, 1], [1, -1]), [1, 1, -1, -1]);
  assert.deepEqual(convolution([1, 2], [2, 1]), [2, 5, 2]);
  const h = Array.from({ length: 12 }, (_, n) => 3 * 0.5 ** n);
  const x = Array.from({ length: 12 }, (_, n) => (-0.25) ** n);
  const direct = convolution(x, h);
  for (let n = 0; n < 12; n++) assert.ok(close(direct[n], 2 * 0.5 ** n + (-0.25) ** n));
  answers("ee3731c-dtft-rational-output", ["partial-fractions"]);
  const coefficients = [0.25, 0.25, 0.25, 0.25];
  const real = coefficients.reduce((s, a, n) => s + a * Math.cos(-Math.PI / 2 * n), 0);
  const imag = coefficients.reduce((s, a, n) => s + a * Math.sin(-Math.PI / 2 * n), 0);
  assert.ok(Math.hypot(real, imag) < 1e-10);
  answers("ee3731c-dtft-four-tap-average", ["dc-one", "zero-quarter", "delay-one-half"]);
});

test("independent Kaiser order and ideal-filter limiting value", () => {
  const beta = 0.1102 * (60 - 8.7);
  const order = Math.ceil((60 - 8) / (2.285 * 0.2 * Math.PI));
  assert.ok(close(beta, 5.65326));
  assert.equal(order, 37);
  assert.equal(order + 1, 38);
  answers("ee3731c-filter-kaiser-numeric-order", ["beta", "order", "length"]);
  assert.ok(close((Math.PI / 3) / Math.PI, 1 / 3));
  assert.ok(close(Math.sin(Math.PI / 3) / Math.PI, Math.sqrt(3) / (2 * Math.PI)));
  answers("ee3731c-mock-shifted-ideal-lowpass", ["centre", "neighbour", "symmetry"]);
});

test("independent normalized Haar transform and aligned cycle-spinning reconstruction", () => {
  const x = [3, 7, 8, 2];
  const a = [0, 1].map((k) => (x[2 * k] + x[2 * k + 1]) / Math.SQRT2);
  const d = [0, 1].map((k) => (x[2 * k] - x[2 * k + 1]) / Math.SQRT2);
  assert.ok(close(a[0], 5 * Math.SQRT2) && close(a[1], 5 * Math.SQRT2));
  assert.ok(close(d[0], -2 * Math.SQRT2) && close(d[1], 3 * Math.SQRT2));
  assert.ok(close([...a, ...d].reduce((s, v) => s + v * v, 0), 126));
  const recovered = a.flatMap((value, k) => [(value + d[k]) / Math.SQRT2, (value - d[k]) / Math.SQRT2]);
  assert.ok(recovered.every((v, i) => close(v, x[i])));
  answers("ee3731c-filter-haar-coefficients", ["approximation", "detail", "energy"]);
  const pairMean = (v: number[]) => [0, 2].flatMap((i) => [(v[i] + v[i + 1]) / 2, (v[i] + v[i + 1]) / 2]);
  const signal = [2, 6, 9, 15];
  const first = pairMean(signal);
  const shifted = pairMean([signal[3], ...signal.slice(0, 3)]);
  const aligned = [...shifted.slice(1), shifted[0]];
  const result = first.map((v, i) => (v + aligned[i]) / 2);
  assert.deepEqual(first, [4, 4, 12, 12]);
  assert.deepEqual(aligned, [8.5, 7.5, 7.5, 8.5]);
  assert.deepEqual(result, [6.25, 5.75, 9.75, 10.25]);
  answers("ee3731c-mock-cycle-spin-reconstruction", ["branch-zero", "branch-aligned", "final"]);
});

test("loss current and zero-response qualifications stay explicit", () => {
  answers("ee3431c-mock-loss-and-heating", ["in-phase-loss", "power-conductance"]);
  assert.match(find("ee3431c-dielectric-loss-origin").explanation, /IN PHASE/);
  assert.match(find("ee3731c-dtft-exponential-eigenfunction").explanation, /zero sequence/);
  assert.match(find("ee3731c-filter-ideal-impulse").explanation, /one FIR design method/);
});
