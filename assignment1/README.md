# Boston School Facilities & Student Experience Explorer

Assignment 1 for the **MIT 1.125 course**. A desktop-first decision-support website for BPS capital planners, facilities staff, principals, and community representatives. It helps identify school/campus records for further assessment rather than making funding or school-closure decisions.

## Run locally

No npm installation or build is needed. With Python 3 installed, run from this folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173/ in a browser. Keep the server running while using the website. The site loads its local dataset through HTTP; opening `index.html` directly as a file will not work reliably. All application assets are local; there are no external font, chart, analytics, or API dependencies.

## What is included

- Original BPS CSV and cleaned JSON/CSV, with source-row traceability and SHA-256 checksum.
- Score distribution, selectable scatterplot, sortable school table, and 2–4-record comparison.
- Searchable school dropdown with keyboard selection and filters synchronized with indicators, findings, and recommendations.
- A dedicated `methodology.html` page for methodology, source URLs, dates, definitions, missing-value treatment, limitations, and data downloads.
- Keyboard controls, accessible chart-point labels, textual data alternatives, error and empty states.
- Optional feature-detected WebMCP filter tool; unsupported browsers keep the normal interface.

## Sources and snapshot

Publisher: Boston Public Schools.

- [Official facilities publishing page](https://www.bostonpublicschools.org/about-bps/capital-planning/ltfp/data)
- [Planning spreadsheet](https://docs.google.com/spreadsheets/d/1RF_ESvlj6yPa_asWnxC1i8vuiIHomR6c1kCVJ6wlumQ/edit?gid=387430590)
- [Score methodology memo](https://resources.finalsite.net/images/v1728696391/bostonpublicschoolsorg/xs6soln38fh8vphhgglu/finallongtermfacilitiesplanrubricandbuildingmodelsmemo.pdf)
- [Optional 2026 survey source](https://www.bostonpublicschools.org/students-families/surveys/past-survey-results/2025-2026)

Accessed September 21, 2026. The CSV source header states “Last Updated 11/8/2025.” This is a source update date, not the measurement year for all fields.

The 118 records have distinct source codes but include campuses belonging to the same school. They must not be interpreted as 118 unique schools or buildings. The source includes historical records for changed/closed schools. Current operating status has not been verified. No records are silently discarded.

The survey page links to Panorama and PDF reports. No verified bulk extract or school-to-campus crosswalk was obtained, so survey results are not merged. Absenteeism is retained in downloads but is not used as a proxy for student experience. The public survey landing page is linked above; its HTML snapshot is not included in this repository.

## Reproduce the data

```sh
python3 scripts/prepare_data.py
```

This parses the unchanged CSV snapshot and writes the public data assets to `dist/data/`. It does not contact external services. Detailed per-field raw values and missing/qualified status are retained in JSON.

To collect a new snapshot, first archive the existing original CSV and generated data, then download the official CSV:

```sh
curl -L --fail 'https://docs.google.com/spreadsheets/d/1RF_ESvlj6yPa_asWnxC1i8vuiIHomR6c1kCVJ6wlumQ/export?format=csv&gid=387430590' -o data/raw/bps-facilities.csv
python3 scripts/prepare_data.py
```

Before presenting an updated website, inspect changed columns/definitions and update the snapshot/access dates, source metadata, methodology, and data-dependent text in `scripts/prepare_data.py`, `dist/index.html`, and `dist/app.js`. This is a curated snapshot, not a live feed. The script intentionally asserts record shape and score range rather than guessing how to handle an incompatible schema.

## Calculations and data decisions

- Lower-score count: valid records with score ≤1. Percentage denominator: all valid scores in the active selection.
- Above-capacity count: valid reported five-year average utilization >100%. Denominator: valid utilization records.
- Combined signal: both conditions among records with both measures.
- These are project screening rules, not official BPS prioritization categories.
- Missing and unavailable values become null, never zero. An actual score of zero remains valid.
- `371*` capacity for Margarita Muñiz Academy is a qualified raw value. Without the footnote, it is excluded from numeric comparisons and displayed with its qualification.
- Utilization remains the source’s five-year average; it is never recalculated from enrollment/capacity.
- Capacity and enrollment have unspecified reference dates. No capacity totals or composite school rankings are produced.
- The scatterplot adds deterministic horizontal spreading to points for readability; score values remain integer categories. Vertical positions are unchanged.
- No duplicate codes or normalized exact street addresses were found. This does not establish absence of shared buildings. The source explicitly labels Horace Mann as shared with Warren-Prescott. Related campus names are flagged for review, not merged.
- Changing filters drops hidden selections so that comparisons stay within the active selection. Sorting always places missing numeric values last.

## Validation

```sh
python3 tests/check_data.py
node --check dist/app.js
```

Browser verification is in `tests/browser.cjs`; run with Playwright installed and the local server running. Set `PLAYWRIGHT_MODULE` to a bundled Playwright module path if needed. It checks filters, counts, sort order, comparison limits, keyboard point selection, qualified values, empty/error states, local downloads, and desktop layouts. Screenshots go to `tests/output/` (ignored by Git).

## Limitations

Mixed dates, rounded source values, missing fields, building/campus ambiguity, and changing school status constrain conclusions. Scores measure space support for an educational framework, not overall school quality, engineering safety, or individual satisfaction. The aggregate data cannot establish causation or intervention benefits. The website recommends verifying current conditions and involving students before taking investment decisions. BPS suppresses survey results below participation/group thresholds; future survey integration must preserve those rules and consider nonresponse bias.

The website is publicly deployed at https://boston-school-facilities-explorer.aware-betta-8380.chatgpt.site/ and is not an official BPS product.
