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
