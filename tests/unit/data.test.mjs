// Data integrity: the 130 questions are well-formed, the SQL seed matches them,
// and every answer matches the official answer keys (PDFs + SWAYAM page for week 12).
// Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const Q = JSON.parse(readFileSync(new URL("src/data/questions.json", root), "utf8"));
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

test("there are 130 questions, 10 per week, weeks 0–12", () => {
  assert.equal(Q.length, 130);
  for (let w = 0; w <= 12; w++) assert.equal(Q.filter((q) => q.week === w).length, 10, `week ${w}`);
});

test("ids are unique and follow week*100 + n", () => {
  assert.equal(new Set(Q.map((q) => q.id)).size, Q.length);
  for (let w = 0; w <= 12; w++) {
    const ids = Q.filter((q) => q.week === w).map((q) => q.id);
    assert.deepEqual(ids, Array.from({ length: 10 }, (_, i) => w * 100 + i + 1));
  }
});

test("every question has text, 2 or 4 distinct options and a valid answer", () => {
  for (const q of Q) {
    assert.ok(q.q.trim().length > 5, `q${q.id} text`);
    assert.ok([2, 4].includes(q.options.length), `q${q.id} option count`);
    assert.ok(q.options.every((o) => o.trim().length > 0), `q${q.id} empty option`);
    assert.equal(new Set(q.options.map(norm)).size, q.options.length, `q${q.id} duplicate options`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `q${q.id} answer index`);
    if (q.options.length === 2) assert.deepEqual(q.options, ["True", "False"], `q${q.id} true/false`);
  }
});

test("supabase/seed.sql is in sync with questions.json", () => {
  const seed = readFileSync(new URL("supabase/seed.sql", root), "utf8");
  const rows = [...seed.matchAll(/^\s+\((\d+), (\d+), '((?:[^']|'')*)', '((?:[^']|'')*)'::jsonb, (\d)\)/gm)];
  assert.equal(rows.length, 130, "row count");
  for (const [, id, week, prompt, opts, ans] of rows) {
    const q = Q.find((x) => x.id === +id);
    assert.ok(q, `seed id ${id} missing from json`);
    assert.equal(+week, q.week);
    assert.equal(prompt.replace(/''/g, "'"), q.q);
    assert.deepEqual(JSON.parse(opts.replace(/''/g, "'")), q.options);
    assert.equal(+ans, q.answer, `answer for ${id}`);
  }
  const setup = readFileSync(new URL("supabase/setup.sql", root), "utf8");
  assert.ok(setup.includes(seed.split("\n")[2]), "setup.sql contains the seed");
});

// ---------- cross-check against the official PDFs (needs pdftotext; skipped otherwise) ----------
const PDFS = {
  0: "00.Assignement_Psy.pdf",
  1: "01.Assignement_Psy.pdf",
  2: "02.Assignement_Psy.pdf",
  3: "Assignement 3. Solution.pdf",
  4: "04.Assignement_Psy.pdf",
  5: "05.Assignement_Psy.pdf",
  6: "06.Assignement.pdf",
  7: "7 assignment-Psy.of L.pdf",
  8: "08.Assignement.pdf",
  9: "09.Assignement_Psy.pdf",
  10: "10.Assignement_Psy.pdf",
  11: "11.Assignement_Psy.pdf",
};
let hasPdftotext = true;
try {
  execFileSync("pdftotext", ["-v"], { stdio: "ignore" });
} catch (e) {
  hasPdftotext = e.code !== "ENOENT"; // pdftotext -v exits non-zero but exists
}

for (const [week, file] of Object.entries(PDFS)) {
  const path = new URL(file, root);
  test(`week ${week} answers match ${file}`, { skip: !hasPdftotext || !existsSync(path) ? "pdftotext or PDF not available" : false }, () => {
    const text = execFileSync("pdftotext", ["-layout", fileURLToPath(path), "-"], { encoding: "utf8" });
    // "Ans. D= text" lines, possibly wrapped onto the next line
    const lines = text.split(/\r?\n/);
    const keys = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/Ans\.?\s*([a-dA-D])?\s*=\s*(.+)$/);
      if (!m) continue;
      let t = m[2].trim();
      const next = (lines[i + 1] || "").trim();
      if (next && !/^(Solution|\d+\)|QUESTION|\*+END)/.test(next)) t += " " + next;
      keys.push(norm(t));
    }
    const ours = Q.filter((q) => q.week === +week);
    assert.equal(keys.length, 10, "found 10 answer lines");
    ours.forEach((q, i) => {
      const a = norm(q.options[q.answer]);
      assert.ok(keys[i].startsWith(a) || a.startsWith(keys[i]), `W${week} Q${i + 1}: key "${keys[i]}" vs ours "${a}"`);
    });
  });
}

// ---------- week 12: accepted answers from the saved SWAYAM page ----------
const swayam = new URL("../Course_ Psychology of Learning _ SWAYAM.html", root);
test("week 12 answers match the SWAYAM accepted answers", { skip: existsSync(swayam) ? false : "SWAYAM page not available" }, () => {
  const html = readFileSync(swayam, "utf8").replace(/<[^>]+>/g, "\n");
  const letters = [...html.matchAll(/Accepted answer is\s*\n\s*([A-D])\./g)].map((m) => "ABCD".indexOf(m[1]));
  const wk12 = Q.filter((q) => q.week === 12).map((q) => q.answer);
  assert.deepEqual(letters.slice(-10), wk12);
});
