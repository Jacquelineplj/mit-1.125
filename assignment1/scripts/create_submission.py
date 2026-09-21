"""Package the existing verified snapshot and a one-page methodology note."""
from pathlib import Path
import csv
import json
import shutil
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.pagesizes import letter
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'submission_materials'
OUT.mkdir(exist_ok=True)
data = json.loads((ROOT/'dist/data/schools.json').read_text())
assert data['audit']['records'] == 118
shutil.copyfile(ROOT/'dist/data/schools-cleaned.csv', OUT/'01_collected_dataset.csv')
shutil.copyfile(ROOT/'data/raw/bps-facilities.csv', OUT/'01_original_BPS_source.csv')

sections = [
('Purpose and intended user',
 'The Boston School Facilities & Student Experience Explorer helps BPS capital planning and facilities staff identify school or campus records for closer review. Principals and community representatives are secondary users. Its purpose is to guide site visits and needs assessments, not to allocate funding automatically.'),
('Source and collection',
 'The dataset was downloaded from the Google spreadsheet linked on the official BPS Long-Term Facilities Planning page [1, 2]. The sheet states “Last Updated 11/8/2025”; this project accessed it on September 21, 2026. BPS combines administrative measures with facilities assessments. Its planning memo [3] explains that building walkthroughs, floor plans, and condition assessments informed the Building Experience Score. This project collected no new student responses.'),
('Coverage, variables, and periods',
 'The snapshot contains 118 school/campus records with distinct source codes, not necessarily 118 unique schools or buildings. The cleaned CSV contains names, codes, addresses, neighborhoods, grade groups, capacity (places), enrollment (students), building score (0-4), utilization (%), and chronic absenteeism (%). Higher scores indicate more support for the BPS educational-space framework. Utilization and absenteeism are five-year averages; component years are unspecified. Enrollment, capacity, and score reference dates are also unspecified. Percentages are stored as percentage points: 102 means 102%, not 1.02.'),
('Preparation and analysis',
 'The original CSV is preserved. The processing script standardizes numeric values, retains identifiers as strings and source row numbers, and treats blank or unavailable values as null. Three scores and two utilization values are missing. Capacity “371*” is unresolved: the cleaned numeric field is blank and capacity_status is qualified_value; the original retains the annotation. Campus records remain separate, and capacity is never summed. Filters update unweighted counts and percentages using valid records as denominators.'),
('Findings and practical use',
 'Of 115 scored records, 38 (33.0%) score 0-1. Of 116 utilization records, 42 (36.2%) exceed 100% historical average utilization. Both signals occur in 15 of 114 complete pairs. These project-defined screening rules support two actions: assess learning-space needs at lower-scoring sites, and verify current enrollment and room use where historical utilization is high. Confirm campus status and involve school communities before acting.'),
('Limitations and uncertainty',
 'The snapshot includes campuses that may have moved, merged, or closed. Shared facilities, rounded values, missing data, and mixed dates limit comparisons. Missing results are not zero. Student survey data were not reliably matched and are not included; absenteeism is not a proxy for student experience. Future survey integration must address nonresponse and privacy suppression. Descriptive patterns cannot prove causation, current overcrowding, overall school quality, or the benefits of a particular renovation.'),
]
refs=[
 ('1. BPS official publishing page','https://www.bostonpublicschools.org/about-bps/capital-planning/ltfp/data'),
 ('2. BPS decision-making metrics spreadsheet','https://docs.google.com/spreadsheets/d/1RF_ESvlj6yPa_asWnxC1i8vuiIHomR6c1kCVJ6wlumQ/edit?gid=387430590'),
 ('3. BPS facilities rubric and building models memo','https://resources.finalsite.net/images/v1728696391/bostonpublicschoolsorg/xs6soln38fh8vphhgglu/finallongtermfacilitiesplanrubricandbuildingmodelsmemo.pdf'),
]
title='Boston School Facilities Explorer'
subtitle='DATA & METHODOLOGY NOTE | SEPTEMBER 21, 2026'
text=title+'\n'+subtitle+'\n\n'+'\n\n'.join(h+'\n'+b for h,b in sections)+'\n\nSources (accessed September 21, 2026)\n'+'\n'.join(label+'\n'+url for label,url in refs)+'\n'
(OUT/'02_data_and_methodology_note.txt').write_text(text)
reflection='''SHORT REFLECTION: WHAT THE DATA SUPPORTS - AND WHAT IT CANNOT PROVE

This project showed me that public facilities data are most useful as a starting point for asking better questions. The BPS snapshot supports descriptive comparisons of reported building scores and historical utilization. It identifies 15 of 114 complete records where a score of 0-1 coincides with utilization above 100%. That overlap gives planners a defensible reason to investigate those sites, while the separate measures help explain why a record deserves attention.

However, identifying a need for review is different from proving which investment should come first. Five-year averages may hide recent changes, and the spreadsheet's update date is not the measurement date of every variable. Campus records are not equivalent to unique schools or buildings. A low facilities score does not establish poor teaching, low student satisfaction, or structural danger. Missing values indicate gaps in evidence, not necessarily poor conditions.

Most importantly, this version cannot answer whether better facilities improve student belonging or safety. School-level survey results were not reliably matched, and even a correlation would not establish causation. Renovation costs and evidence about intervention effects are also absent, so the website cannot estimate returns on investment.

I would therefore use the explorer to prioritize current site assessments and conversations with students and staff. Before recommending a specific project, I would verify current campus status, update room-use and enrollment information, and add comparable, privacy-protected student feedback. The main value is transparent evidence for follow-up, rather than an automatic ranking of schools.
'''
(OUT/'03_short_reflection.txt').write_text(reflection)

navy=colors.HexColor('#152e49'); teal=colors.HexColor('#147d79')
styles={
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=20,leading=24,textColor=navy,spaceAfter=7),
 'sub':ParagraphStyle('sub',fontName='Helvetica-Bold',fontSize=8.5,leading=11,textColor=teal,spaceAfter=14),
 'head':ParagraphStyle('head',fontName='Helvetica-Bold',fontSize=10.5,leading=13,textColor=navy,spaceBefore=7,spaceAfter=3),
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10,leading=13.2,textColor=colors.HexColor('#263746'),alignment=TA_LEFT),
 'ref':ParagraphStyle('ref',fontName='Helvetica',fontSize=8.5,leading=11.5,textColor=teal),
}
def escape(s):
 return s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('“','"').replace('”','"')
story=[Paragraph(title,styles['title']),Paragraph(subtitle,styles['sub'])]
for heading,body in sections:
 story.extend([Paragraph(heading,styles['head']),Paragraph(escape(body),styles['body'])])
story.append(Paragraph('Sources - clickable links; accessed September 21, 2026',styles['head']))
for label,url in refs:
 story.append(Paragraph(f'<link href="{escape(url)}" color="#147d79">{escape(label)}</link>',styles['ref']))
pdf=OUT/'02_data_and_methodology_note.pdf'
doc=SimpleDocTemplate(str(pdf),pagesize=letter,rightMargin=44,leftMargin=44,topMargin=34,bottomMargin=34,title='Boston School Facilities - Data and Methodology',author='Boston School Facilities Explorer')
doc.build(story)
reader=PdfReader(pdf)
assert len(reader.pages)==1, f'Expected one page, got {len(reader.pages)}'
assert len(list(csv.DictReader((OUT/'01_collected_dataset.csv').open())))==118
assert (OUT/'01_original_BPS_source.csv').read_bytes()==(ROOT/'data/raw/bps-facilities.csv').read_bytes()
(OUT/'README.txt').write_text('''SUBMISSION MATERIALS

01_collected_dataset.csv: cleaned analysis dataset, 118 school/campus records.
01_original_BPS_source.csv: unmodified BPS source, including original fields and qualifiers.
02_data_and_methodology_note.pdf: one-page English note with clickable source links.
02_data_and_methodology_note.txt: editable text of the same note, with full source URLs.
03_short_reflection.txt: short English reflection on supported interpretations and limits.

CSV conventions: percentages are percentage points; e.g. 102 means 102%.
Blank numeric cells mean unavailable or qualified, never zero. Score 0 is valid.
The qualified capacity 371* is blank in the cleaned capacity column; capacity_status
marks it as qualified_value. Consult the original source for the raw annotation.
SourceRow refers to the source sheet's row number. Import id as text to preserve
letter suffixes. Records are not guaranteed to represent unique schools/buildings.

Source update: November 8, 2025. Accessed: September 21, 2026.
Measurement periods vary; see the methodology note. No student survey results merged.
''')
print(f'Created {OUT}; verified 118 CSV records and a one-page PDF.')
