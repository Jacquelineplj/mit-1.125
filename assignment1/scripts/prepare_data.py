"""Rebuild browser data from the untouched BPS CSV (Python standard library only)."""
import csv
import hashlib
import json
import re
import shutil
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/raw/bps-facilities.csv'
OUT = ROOT / 'dist/data'
SOURCE = 'https://docs.google.com/spreadsheets/d/1RF_ESvlj6yPa_asWnxC1i8vuiIHomR6c1kCVJ6wlumQ/edit?gid=387430590'
PAGE = 'https://www.bostonpublicschools.org/about-bps/capital-planning/ltfp/data'
rows = list(csv.reader(RAW.open(encoding='utf-8-sig', newline='')))
header = rows[1]
fields = {'name':'School Name', 'id':'School Code', 'address':'Address', 'city':'City, State Zip', 'grades':'Grades Served', 'level':'Grade Level', 'neighborhood':'Neighborhood', 'capacity':'Capacity', 'utilization':'Utilization (5 year avg)', 'score':'Building Experience Score (0-4)', 'enrollment':'Enrollment', 'absenteeism':'Chronically Absent 10% or More\n(5 year average)'}
numeric = {'capacity','utilization','score','enrollment','absenteeism'}

def parse_number(raw):
    value = raw.strip()
    if not value:
        return None, 'missing'
    if value in {'-', '—', 'N/A', 'NA'}:
        return None, 'unavailable'
    if value.lower() in {'suppressed','<10','*','**'}:
        return None, 'suppressed_or_flagged'
    if not re.fullmatch(r'[\d,]+(?:\.\d+)?%?', value):
        return None, 'qualified_value'
    return float(value.replace(',','').replace('%','')), 'available'

schools=[]
for row_number, row in enumerate(rows[2:], start=3):
    if not any(row):
        continue
    assert len(row) == len(header), f'Unexpected column count at row {row_number}'
    source = dict(zip(header, row))
    school = {'sourceRow':row_number, 'raw':{}, 'status':{}, 'notes':[]}
    for key, column in fields.items():
        raw = source[column].strip()
        school['raw'][key] = raw
        if key in numeric:
            school[key], school['status'][key] = parse_number(raw)
        else:
            school[key] = raw
    assert school['id'] and school['name']
    assert school['score'] is None or school['score'] in range(5)
    if school['status']['capacity'] == 'qualified_value':
        school['notes'].append('Capacity is reported as '+school['raw']['capacity']+'. The footnote is not explained in the CSV export; excluded from numeric comparisons.')
    if 'shared' in school['name'].lower():
        school['notes'].append('The source name explicitly identifies a shared facility. Addresses alone do not reliably identify shared buildings.')
    if any(t in school['name'] for t in ['Eliot K-8', 'Kennedy Academy', 'Kilmer K-8', 'Henderson K-12', 'Roosevelt K-8', 'Shaw-Taylor', 'Melvin H. King']):
        school['notes'].append('Potential multi-site school or related campus: retained as a separate source record, not consolidated.')
    schools.append(school)
counts=Counter(s['id'] for s in schools)
assert all(v==1 for v in counts.values()), 'Duplicate source codes require review'
addresses=Counter(re.sub(r'[^a-z0-9]','',s['address'].lower()) for s in schools)
score_valid=[s for s in schools if s['score'] is not None]
util_valid=[s for s in schools if s['utilization'] is not None]
both=[s for s in schools if s['score'] is not None and s['utilization'] is not None]
audit={'records':len(schools),'uniqueCodes':len(counts),'scoreDistribution':dict(sorted(Counter(int(s['score']) for s in score_valid).items())), 'missingScore':len(schools)-len(score_valid),'missingUtilization':len(schools)-len(util_valid),'lowScore':sum(s['score']<=1 for s in score_valid),'overCapacity':sum(s['utilization']>100 for s in util_valid),'combined':sum(s['score']<=1 and s['utilization']>100 for s in both),'pairedValid':len(both),'duplicateNormalizedAddresses':[a for a,n in addresses.items() if n>1], 'qualifiedCapacity':[s['id'] for s in schools if s['status']['capacity']=='qualified_value']}
meta={'publisher':'Boston Public Schools','title':'Decision-Making Metrics for BPS Long-Term Facilities Planning','sourceUrl':SOURCE,'landingUrl':PAGE,'sourceUpdatedLabel':rows[0][0],'sourceUpdated':'2025-11-08','accessed':'2026-09-21','unitOfObservation':'School / campus record as listed by BPS, not necessarily a unique school or building','measurementPeriod':'Mixed periods; utilization and absenteeism are five-year averages. Exact component years and enrollment/capacity reference dates are not specified in the CSV.','sha256':hashlib.sha256(RAW.read_bytes()).hexdigest(),'surveyIncluded':False,'surveyNote':'The 2026 public survey page was reviewed. School-level results are linked through an interactive dashboard and PDF reports; a reliable bulk extract and campus crosswalk have not been verified. No survey data have been merged.','collection':'The project downloaded the official sheet as CSV. BPS describes assessing physical spaces for educational adequacy; Building Experience Scores draw on building walkthroughs, floor plans, and facilities assessments. The sheet also compiles administrative measures. Detailed collection protocols and reference dates for each administrative field are not specified in the CSV.'}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'schools.json').write_text(json.dumps({'meta':meta,'audit':audit,'schools':schools},indent=2,ensure_ascii=False)+'\n')
(OUT/'sources.json').write_text(json.dumps(meta,indent=2)+'\n')
shutil.copyfile(RAW, OUT/'bps-facilities-original.csv')
with (OUT/'schools-cleaned.csv').open('w',newline='',encoding='utf-8') as f:
    writer=csv.writer(f); writer.writerow([*fields,'sourceRow','capacity_status'])
    for s in schools:
        writer.writerow([s[k] if s[k] is not None else '' for k in fields]+[s['sourceRow'],s['status']['capacity']])
print(json.dumps(audit,indent=2))
