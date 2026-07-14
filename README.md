# AP Assembly Elections — 2014 · 2019 · 2024

A data analytics project tracing how an 11-point vote swing reshaped Andhra Pradesh's Legislative Assembly across three elections. Raw ECI results are cleaned and modeled in PostgreSQL, explored in Power BI, and shipped as a public, interactive web report.

**Live site:** https://shaikshoaib-git.github.io/AP_Election_2014_24/web_page/

## What's inside

- **Party standings** — seats and vote share for every party, 2014 / 2019 / 2024
- **Vote share vs. seat share divergence chart** — visualizing YSRCP's disproportionate seat losses despite a modest vote-share drop
- **Constituency-wise searchable results table** — all 175 constituencies, filterable by year and party
- **AP constituency seat map** — geographic view of winners by year
- **Party transitions** — how seats flowed between parties across successive elections
- **YSRCP deep dive** — a case-study section on the party's rise and fall
- **20 closest margins of 2024**
- **Seats to watch / outlook** — what the three-election trend suggests for 2029
- **Spoiler-effect analysis** — constituencies where a residual Congress vote cost YSRCP the seat

## Repository structure

```
├── data_set/
│   ├── candidates.csv              # Raw candidate-level results (votes, party, constituency)
│   ├── constituencies.csv          # Raw constituency-level results (winner, runner-up, margin)
│   ├── clean_candidates.csv        # Cleaned/standardized candidate data
│   └── clean_constituencies.csv    # Cleaned/standardized constituency data
├── chart/
│   ├── ap.pbix                     # Power BI dashboard
│   └── clean_candidates_2019.pbix  # Power BI workbook (2019 cycle)
├── web_page/                       # Static site deployed to GitHub Pages
│   ├── index.html                  # Page markup + styling
│   ├── script.js                   # Chart rendering and interactivity
│   ├── data.js                     # Pre-parsed election data embedded for offline use
│   ├── candidates_detail.json
│   ├── grid_map.json               # Constituency-to-map-grid layout
│   ├── summary.json / transitions.json / ysrcp_analysis.json
│   └── candidates.csv / standings.csv
├── clean..ipynb                    # Jupyter notebook: cleaning/standardizing raw CSVs with pandas
├── election_db.sql                 # PostgreSQL schema (candidates, constituencies tables)
├── seat_won_parties.sql            # Analysis queries (seats per party, margins, closest contests)
└── .github/workflows/static.yml    # GitHub Actions workflow — auto-deploys web_page/ to GitHub Pages
```

## Tech stack

- **Data engineering:** Python (pandas) for cleaning; ECI result CSVs as source data
- **Database:** PostgreSQL — normalized `candidates` and `constituencies` tables with analysis queries (seat counts, winning margins, closest contests)
- **Visualization / BI:** Power BI (`.pbix` dashboards)
- **Web:** Static HTML/CSS/JS site with hand-rolled SVG charts (divergence chart, seat map, trend lines) — no external charting library, no backend; all data is embedded in `data.js` so the page runs straight from the filesystem
- **Deployment:** GitHub Pages via GitHub Actions

## Running locally

The web report has no build step or backend — open it directly in a browser:

```bash
git clone https://github.com/SHAIKSHOAIB-GIT/AP_Election_2014_24.git
cd AP_Election_2014_24/web_page
open index.html   # or just double-click the file
```

For the data-cleaning notebook:

```bash
pip install pandas sqlalchemy psycopg2-binary
jupyter notebook clean..ipynb
```

For the database layer, load `election_db.sql` into PostgreSQL, then run the queries in `seat_won_parties.sql`.

## Data source

Results are sourced from the Election Commission of India (ECI) for the Andhra Pradesh Legislative Assembly elections of 2014, 2019, and 2024.
