"""Generate the four evaluation charts referenced by ../main.tex.

Outputs (PNG, 200 dpi, publication style):
    figures/charts/category-distribution.png
    figures/charts/time-distribution.png
    figures/charts/candidate-funnel.png
    figures/charts/cpsat-before-after.png

Data sources:
    - Category and time distributions are computed from the 5,000-row bootstrap
      sample at ../../backend/data/recipes_enriched.jsonl. The sample mirrors
      the shape of the full ~90k corpus; absolute scales are noted in the
      chart captions in main.tex.
    - The candidate-pool funnel uses representative scenario numbers (two
      adults, 7 days, 3 meals/day, blocked lamb and garlic) consistent with
      Chapter 9 of the thesis.
    - The CP-SAT before/after numbers (calorie gap 2616.72 -> 47.72 kcal,
      protein gap 317.22 -> 4.71 g) are reproduced from the same scenario.

Usage:
    cd docs/diploma
    .venv/bin/python scripts/build_charts.py
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib-cache")

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
from matplotlib.ticker import MaxNLocator

SCRIPT_DIR = Path(__file__).resolve().parent
DIPLOMA_DIR = SCRIPT_DIR.parent
REPO_ROOT = DIPLOMA_DIR.parent.parent
JSONL_PATH = REPO_ROOT / "backend" / "data" / "recipes_enriched.jsonl"
OUT_DIR = DIPLOMA_DIR / "figures" / "charts"
OUT_DIR.mkdir(parents=True, exist_ok=True)

plt.rcParams.update(
    {
        "font.family": "serif",
        "font.serif": ["Times New Roman", "Liberation Serif", "DejaVu Serif"],
        "font.size": 11,
        "axes.titlesize": 12,
        "axes.labelsize": 11,
        "xtick.labelsize": 10,
        "ytick.labelsize": 10,
        "legend.fontsize": 10,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "grid.alpha": 0.25,
        "grid.linestyle": "--",
        "figure.dpi": 100,
        "savefig.dpi": 200,
        "savefig.bbox": "tight",
    }
)

PRIMARY = "#1f3a5f"
SECONDARY = "#b04a4a"
ACCENT = "#5e8c61"
NEUTRAL = "#7a7a7a"

CATEGORY_TRANSLATE = {
    "Завтрак": "Breakfast",
    "Обед": "Lunch",
    "Ужин": "Dinner",
    "Перекус": "Snack",
}


def load_recipes() -> list[dict]:
    if not JSONL_PATH.exists():
        sys.stderr.write(f"ERROR: data file not found: {JSONL_PATH}\n")
        sys.exit(2)
    out: list[dict] = []
    with JSONL_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def chart_category_distribution(recipes: list[dict]) -> Path:
    raw_counts = Counter(r.get("category") for r in recipes if r.get("category"))
    order = ["Breakfast", "Lunch", "Dinner", "Snack"]
    counts = {label: 0 for label in order}
    for ru, n in raw_counts.items():
        en = CATEGORY_TRANSLATE.get(ru, ru)
        if en in counts:
            counts[en] += n
        else:
            counts[en] = n

    labels = list(counts.keys())
    values = [counts[label] for label in labels]
    total = sum(values) or 1

    fig, ax = plt.subplots(figsize=(7.5, 4.2))
    bars = ax.bar(labels, values, color=[PRIMARY, ACCENT, SECONDARY, NEUTRAL], width=0.62)
    for bar, value in zip(bars, values):
        pct = 100 * value / total
        ax.annotate(
            f"{value:,}\n({pct:.1f}%)",
            xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
            xytext=(0, 6),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=9,
        )

    ax.set_ylabel("Number of recipes (sample n = 5,000)")
    ax.set_title("Recipe category distribution")
    ax.yaxis.set_major_locator(MaxNLocator(integer=True))
    ax.set_ylim(top=max(values) * 1.18 if values else 1)
    ax.set_xlabel("")

    out_path = OUT_DIR / "category-distribution.png"
    fig.savefig(out_path)
    plt.close(fig)
    return out_path


def chart_time_distribution(recipes: list[dict]) -> Path:
    times = [r.get("total_time_minutes", 0) or 0 for r in recipes]
    times = [t for t in times if t and t > 0]

    bins = [(0, 15), (15, 30), (30, 45), (45, 60), (60, 90), (90, 120), (120, 180), (180, 1000)]
    labels = ["<15", "15-30", "30-45", "45-60", "60-90", "90-120", "120-180", ">180"]
    counts = []
    for lo, hi in bins:
        counts.append(sum(1 for t in times if lo <= t < hi))
    total = sum(counts) or 1

    fig, ax = plt.subplots(figsize=(8.0, 4.4))
    bars = ax.bar(labels, counts, color=PRIMARY, width=0.7)
    for bar, value in zip(bars, counts):
        pct = 100 * value / total
        if pct < 0.5:
            continue
        ax.annotate(
            f"{value}\n({pct:.0f}%)",
            xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=8,
        )
    ax.set_xlabel("Total preparation time (minutes)")
    ax.set_ylabel("Number of recipes (sample n = 5,000)")
    ax.set_title("Recipe preparation-time distribution")
    ax.set_ylim(top=max(counts) * 1.18 if counts else 1)

    out_path = OUT_DIR / "time-distribution.png"
    fig.savefig(out_path)
    plt.close(fig)
    return out_path


def chart_candidate_funnel() -> Path:
    stages = [
        ("Published recipes", 90_000),
        ("Category filter (B/L/D)", 80_000),
        ("Quality gate ($\\geq$0.7)", 56_000),
        ("Constraint fit (allergy/time/budget)", 14_500),
        ("Per-category top-20 shortlist", 60),
    ]
    labels = [s[0] for s in stages]
    values = [s[1] for s in stages]

    fig, ax = plt.subplots(figsize=(8.2, 4.6))
    y_pos = range(len(stages))
    bars = ax.barh(y_pos, values, color=[PRIMARY, PRIMARY, ACCENT, SECONDARY, "#404040"], height=0.62)
    ax.set_yticks(list(y_pos))
    ax.set_yticklabels(labels)
    ax.invert_yaxis()
    ax.set_xscale("log")
    ax.set_xlabel("Recipes remaining (log scale)")
    ax.set_title("Candidate-pool funnel on a representative scenario")

    for bar, value in zip(bars, values):
        ax.annotate(
            f"{value:,}",
            xy=(bar.get_width(), bar.get_y() + bar.get_height() / 2),
            xytext=(6, 0),
            textcoords="offset points",
            va="center",
            ha="left",
            fontsize=10,
        )

    ax.set_xlim(left=10, right=values[0] * 3)
    ax.grid(axis="x", which="both", linestyle="--", alpha=0.25)
    ax.grid(axis="y", visible=False)

    out_path = OUT_DIR / "candidate-funnel.png"
    fig.savefig(out_path)
    plt.close(fig)
    return out_path


def chart_cpsat_before_after() -> Path:
    metrics = ["Calorie target gap (kcal)", "Protein target gap (g)"]
    deterministic = [2616.72, 317.22]
    cp_sat = [47.72, 4.71]

    fig, axes = plt.subplots(1, 2, figsize=(8.6, 4.3))

    for ax, name, det, cps in zip(axes, metrics, deterministic, cp_sat):
        bars = ax.bar(["Deterministic", "CP-SAT"], [det, cps], color=[SECONDARY, ACCENT], width=0.55)
        ax.set_title(name)
        ax.set_ylabel("Absolute gap (lower is better)")
        for bar, value in zip(bars, [det, cps]):
            ax.annotate(
                f"{value:,.2f}",
                xy=(bar.get_x() + bar.get_width() / 2, bar.get_height()),
                xytext=(0, 4),
                textcoords="offset points",
                ha="center",
                va="bottom",
                fontsize=10,
                fontweight="bold",
            )
        ax.set_ylim(top=max(det, cps) * 1.20)

    fig.suptitle("Macro target fit: deterministic vs CP-SAT planner", fontsize=12, y=1.02)

    out_path = OUT_DIR / "cpsat-before-after.png"
    fig.savefig(out_path)
    plt.close(fig)
    return out_path


def main() -> None:
    recipes = load_recipes()
    print(f"Loaded {len(recipes):,} recipes from {JSONL_PATH}")

    paths = [
        chart_category_distribution(recipes),
        chart_time_distribution(recipes),
        chart_candidate_funnel(),
        chart_cpsat_before_after(),
    ]
    print("Wrote:")
    for p in paths:
        size = p.stat().st_size
        print(f"  {p.relative_to(DIPLOMA_DIR)}  ({size/1024:.1f} KB)")


if __name__ == "__main__":
    main()
