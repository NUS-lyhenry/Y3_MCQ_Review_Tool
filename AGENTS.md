# AI question-set authoring

This repository is the canonical source for Y3 MCQ Review. The public website never edits question content at runtime. Only repository updates publish new or revised sets.

## Add or update a set

1. Read `lib/question-schema.ts` before authoring.
2. Create one file at `content/question-sets/<course-code>/<set-id>.json`.
3. Use stable lowercase kebab-case IDs for sets, questions, and options.
4. Increase a question's positive integer `revision` whenever its prompt, answer options, scoring, image, or explanation changes. Do not reuse an ID for a different question.
5. For each question, positive option points must total `maxPoints`. Incorrect options may be zero or negative. The final score is clamped from zero to `maxPoints`.
6. Single-choice and boolean questions must have exactly one positive option. Multiple-choice questions must have at least two positive options. Boolean questions must have exactly two options.
7. Write prompts, option content, and explanations in Markdown. Raw HTML and Markdown images are not rendered. Use the dedicated `image` field for question images.
8. Store images in `public/question-assets/<course-code>/<set-id>/` as PNG, JPEG, or WebP. Set `image.src` to its root-relative path and provide useful `image.alt` text.
9. Run `npm run validate:content`, `npm test`, `npm run lint`, and `npm run build`.
10. Commit the validated source to `main`, push it to GitHub, and republish the same commit to GPT Sites.

## Example shape

```json
{
  "id": "topic-review",
  "courseCode": "COURSE1000",
  "courseName": "Course name",
  "title": "Topic review",
  "description": "What this set covers.",
  "tags": ["topic"],
  "updatedAt": "2026-09-04T00:00:00+08:00",
  "questions": [
    {
      "id": "concept-check",
      "revision": 1,
      "type": "single",
      "prompt": "Question in **Markdown**.",
      "options": [
        { "id": "a", "content": "Correct option", "points": 1 },
        { "id": "b", "content": "Distractor", "points": 0 }
      ],
      "maxPoints": 1,
      "explanation": "Explain why the answer is correct.",
      "source": "Optional lecture or page reference"
    }
  ]
}
```

Do not add placeholder, demo, or invented course content unless the user explicitly requests it.

## Content-quality review

- Use only the user-authorized local lecture/tutorial sources. Do not read personal completed notebooks or publish source slides, screenshots, assignments or copied diagrams. Source citations should name a teaching PDF plus a page/slide or question locator; do not invent section names.
- State assumptions that affect correctness (e.g. intrinsic semiconductor at 0 K, spin versus spatial states, zero-state LTI response, graph direction/tie rules, Haar sign and boundary conventions).
- Use genuine LaTeX commands inside math delimiters. Validate every formula with KaTeX, not just JSON schema checks.
- Derive numeric answers independently. Include plausible misconception-based distractors and explain their errors. Vary the number and position of correct answers. Do not make every boolean True or put every single-choice answer first.
- Preserve the announced +1/-0.5 multiple-response marking. Improve distractors rather than silently changing grading to discourage selecting everything.
- The content-quality tests include independent reference calculations for selected problems. When changing their input data, update the reference calculation and manually cross-check it; tests cannot prove every conceptual answer is correct.
- For a substantially new problem, use a new question ID at revision 1. For an edit to the same problem, increment its revision; source-only locator corrections do not require resetting question statistics.
- `scripts/generate-question-diagrams.py` regenerates the three corrected original diagrams from geometric data using Pillow. It reads no course images. Inspect generated diagrams, their labels, and matching alt text before committing.
