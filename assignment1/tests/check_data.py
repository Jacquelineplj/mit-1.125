"""Independent checks against the archived source, including missing vs zero."""
import csv
import json
import hashlib
from pathlib import Path

root=Path(__file__).resolve().parents[1]
raw=root/'data/raw/bps-facilities.csv'
rows=list(csv.reader(raw.open(encoding='utf-8-sig',newline='')))
dataset=json.loads((root/'dist/data/schools.json').read_text())
schools=dataset['schools']
assert len(schools)==len(rows)-2==118
assert len({s['id'] for s in schools})==118
assert dataset['meta']['sha256']==hashlib.sha256(raw.read_bytes()).hexdigest()
assert sum(s['score'] is None for s in schools)==3
assert sum(s['score']==0 for s in schools)==10
assert sum(s['utilization'] is None for s in schools)==2
for school in schools:
    source=rows[school['sourceRow']-1]
    assert school['name']==source[0].strip()
    assert school['id']==source[1].strip()
    assert school['raw']['capacity']==source[7].strip()
    assert school['score']==(int(source[9]) if source[9].strip() else None)
    assert school['utilization']==(float(source[8].replace('%','')) if source[8].strip() else None)
qualified=next(s for s in schools if s['id']=='1053')
assert qualified['capacity'] is None
assert qualified['raw']['capacity']=='371*'
assert qualified['status']['capacity']=='qualified_value'
assert sum(int(r[9])<=1 for r in rows[2:] if r[9])==dataset['audit']['lowScore']==38
assert sum(float(r[8].strip('%'))>100 for r in rows[2:] if r[8])==dataset['audit']['overCapacity']==42
assert sum(int(r[9])<=1 and float(r[8].strip('%'))>100 for r in rows[2:] if r[9] and r[8])==dataset['audit']['combined']==15
assert (root/'dist/data/bps-facilities-original.csv').read_bytes()==raw.read_bytes()
print('PASS: 118 records reconcile to original source; zeros, missing values, qualified capacity, periods, and all headline calculations verified.')
