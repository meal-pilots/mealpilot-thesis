# Evaluation: Recipe corpus quality

This chapter quantifies the ETL pipeline's output. Run after each major ingest
to compare improvements.

## Metrics

| Metric | Definition | Target |
|---|---|---|
| Total recipes | rows in `data/silver/recipes.jsonl` | 5,000-10,000 |
| Published recipes | quality_score >= 0.7 | >= 70% of total |
| % with nutrition_per_serving | not null + at least one positive macro | >= 80% |
| Mean ingredient match ratio | matched ingredients / total ingredients | >= 0.85 |
| Mean price coverage | priced ingredients / total ingredients | >= 0.80 |
| Cuisines covered | distinct cuisines | >= 15 |
| Categories balance | min(count_per_category) / max(count_per_category) | >= 0.30 |
| Dedup rate | (raw - survivors) / raw | report value (informational) |
| Median quality_score | median across all recipes | >= 0.60 |

## How to compute (sketch)

```python
import json
from collections import Counter
from pathlib import Path

silver = Path('data/silver/recipes.jsonl')
recipes = [json.loads(line) for line in silver.read_text().splitlines()]

print(f'Total: {len(recipes)}')
print(f'With nutrition: {sum(1 for r in recipes if r.get("nutrition_per_serving"))}')
print(f'Cuisines: {Counter(r.get("cuisine") for r in recipes if r.get("cuisine")).most_common()}')
print(f'Categories: {Counter(r.get("category") for r in recipes if r.get("category")).most_common()}')
```
