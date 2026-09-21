# MIT 1.125 — Course Assignments

This repository is used for coursework for **MIT 1.125**.

## Assignment 1: Boston School Facilities & Student Experience Explorer

The complete project is in [`assignment1/`](assignment1/). It uses official Boston Public Schools public data to help facilities planners identify school/campus records for further assessment.

**Live website:** https://boston-school-facilities-explorer.aware-betta-8380.chatgpt.site/

- `assignment1/dist/`: website source and browser-ready data.
- `assignment1/data/raw/`: original public BPS CSV.
- `assignment1/scripts/`: reproducible data processing and submission document generation.
- `assignment1/submission_materials/`: collected datasets, one-page methodology note, and short reflection.
- `assignment1/tests/`: data validation and browser checks.

### Run Assignment 1 locally

```sh
cd assignment1
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173/. See the [assignment README](assignment1/README.md) for sources, methodology, and limitations.

This is an educational project, not an official BPS product. Source data remain attributed to Boston Public Schools.
