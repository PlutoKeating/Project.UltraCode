# UltraCode UI Evaluation Rubric

## Required Evidence

For every evaluated sprint, record the actual URL, viewport, interactions performed, console/page errors, and screenshot paths. A criterion not exercised is `NOT_VERIFIED`, never `PASS`.

At minimum, evaluate one desktop viewport and one narrow mobile viewport, the primary user journey, navigation between all relevant pages, and every interactive control in the sprint contract.

## Scores

Score each dimension from 0 to 10 and justify the score with observed evidence.

### 1. Design Coherence

- Color, typography, spacing, layout, imagery, and motion form one intentional visual language.
- Shared navigation, controls, content hierarchy, and page transitions remain consistent across pages.
- The design supports the product's content and tone rather than decorating it arbitrarily.

### 2. Originality

- Show deliberate art direction and custom decisions appropriate to the brief.
- Penalize unmodified stock components, generic dashboard/card compositions, default purple-gradient AI styling, filler content, and superficial visual novelty.
- Originality never excuses unusable interaction.

### 3. Craft

- Check typographic hierarchy, readable measure, alignment, spacing rhythm, contrast, focus states, icon consistency, and visual clipping.
- Check desktop and narrow mobile layouts, text wrapping, overflow, touch targets, and content order.
- Check loading, empty, error, hover, focus, active, and disabled states required by the contract.

### 4. Functional Usability

- Complete the real primary user journey through browser interactions.
- Verify visible feedback, state changes, navigation, forms, keyboard behavior, and error handling required by the contract.
- Check that controls are not decorative, links reach real destinations, and users can understand the next action without guessing.
- Check accessible names, labels, semantic controls, and basic keyboard operation.

## Hard Gates

The sprint is `REJECT` if any of the following occurs:

- Any required user journey or acceptance criterion fails.
- Functionality is below 8, craft below 7, coherence below 7, or originality below 6.
- A required desktop/mobile check or core interaction is `NOT_VERIFIED`.
- There is horizontal page overflow at a required viewport, an unreachable primary action, a broken navigation path, or an uncaught page error in the core journey.
- Evidence is fabricated, a screenshot is substituted for required interaction, or the evaluator relies on the generator's self-assessment.

## Verdict Format

| Criterion | Score or NOT_VERIFIED | Evidence | Finding |
| --- | --- | --- | --- |
| Design coherence |  |  |  |
| Originality |  |  |  |
| Craft |  |  |  |
| Functional usability |  |  |  |

Return `APPROVE` only when every hard gate passes and every required acceptance criterion has direct evidence. Otherwise return `REJECT` with severity-ordered, actionable findings.
