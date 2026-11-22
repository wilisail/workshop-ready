"""Render original monochrome stencil figures and editable semantic sources.

Run `python scripts/render-readme-diagrams.py` from the repository. Uses only the
Python standard library. SVG styling/layout lives in diagram_stencils.py; DOT and
Mermaid export the same complete semantic nodes and edges as editable flowcharts.
"""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
from diagram_stencils import render

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'docs' / 'figures'
DEST.mkdir(parents=True, exist_ok=True)


def figure(name, title, description, nodes, edges, ranks=(), note=''):
    q = json.dumps
    dot = [f'digraph {name.replace("-", "_")} {{',
           'graph [bgcolor="white", rankdir=TB, pad="0.35", nodesep="0.32", ranksep="0.6", splines=polyline, fontname="DejaVu Sans", fontsize=18, labelloc=t, labeljust=l];',
           f'label={q(title)};',
           'node [shape=box, style="filled", fillcolor="white", color="black", fontcolor="black", fontname="DejaVu Sans", fontsize=15, penwidth=1.3, margin="0.16,0.12"];',
           'edge [color="black", fontcolor="black", fontname="DejaVu Sans", fontsize=12, penwidth=1.2, arrowsize=0.75];']
    mermaid = ['flowchart TD']
    for ident, label, future in nodes:
        dot.append(f'{ident} [label={q(label)}' + (', style="filled,dashed"' if future else '') + '];')
        mermaid.append(f'    {ident}[{q(label.replace(chr(10), " / "))}]')
    for source, target, label, dashed in edges:
        attrs = []
        if label:
            attrs.append('label=' + q(label))
        if dashed:
            attrs.append('style=dashed')
        dot.append(f'{source} -> {target}' + (' [' + ', '.join(attrs) + ']' if attrs else '') + ';')
        text = f'|{q(label.replace(chr(10), " / "))}|' if label else ''
        mermaid.append(f'    {source} ' + ('-.->' if dashed else '-->') + f'{text} {target}')
    for rank in ranks:
        dot.append('{ rank=same; ' + '; '.join(rank) + '; }')
    if note:
        dot.append('note [shape=plaintext, fontsize=12, label=' + q(note) + '];')
        dot.append('{ rank=sink; note; }')
    dot.append('}')
    dot_path = DEST / (name + '.dot')
    dot_path.write_text('\n'.join(dot) + '\n', encoding='utf-8')
    (DEST / (name + '.mmd')).write_text('\n'.join(mermaid) + '\n', encoding='utf-8')
    svg_path = DEST / (name + '.svg')
    svg_path.write_text(render(name, title, description, nodes, edges), encoding='utf-8')
    ET.parse(svg_path)


figure('network-stack', '1. Network stack: transport and execution are separate choices',
       'Staff browsers or future field devices communicate over premises or remote links. Current computation runs in a browser worker or Vercel function. An internal AI server and shared institutional records are proposed.',
       [
           ('staff', 'Staff browser [current]\nPhone / laptop', False),
           ('field', 'Field camera or sensor [future]\nRelease container / adult trap', True),
           ('premises', 'Same-premises link [reference]\nEthernet / Wi-Fi\nNearby BLE sensor uses a gateway', False),
           ('remote', 'Remote uplink [reference]\nPhotos: cellular / private radio bridge\nSmall readings: LoRaWAN + gateway', False),
           ('routing', 'Application and route choice [current]\nSelect a permitted execution target', False),
           ('device', 'Device worker [current]\nSmall bead CV / numeric ML', False),
           ('vercel', 'Vercel function [current]\nSmall bead CV', False),
           ('internal', 'Internal AI service [future]\nShared on-premises compute', True),
           ('browserstore', 'Browser records [current]\nIndexedDB / localStorage', False),
           ('sharedstore', 'Institutional records [future]\nLocal database / image archive', True),
       ],
       [
           ('staff', 'premises', '', False), ('field', 'remote', '', True),
           ('premises', 'routing', 'web access', False),
           ('remote', 'routing', 'ingestion adapter needed', True),
           ('routing', 'device', 'device route', False), ('routing', 'vercel', 'hosted route', False),
           ('routing', 'internal', 'intranet route needed', True),
           ('device', 'browserstore', 'reviewed result', False),
           ('vercel', 'browserstore', 'returned to browser', False),
           ('internal', 'sharedstore', 'shared persistence', True),
       ],
       [('staff', 'field'), ('premises', 'remote'), ('device', 'vercel', 'internal'), ('browserstore', 'sharedstore')],
       'Current/future/reference labels distinguish component status. Dashed routes: future integration.\nPhysical network equipment and remote ingestion are not deployed by this prototype.')

figure('wolbachia-evidence', '2. Wolbachia field evidence: three distinct observation streams',
       'Release containers produce mosquitoes and supply stage-aware QA observations. Adult monitoring traps supply specimens for species identification and laboratory infection assays. Dengue surveillance supplies clinical outcomes for a separate epidemiological design. None of these measurements substitutes for another.',
       [
           ('stock', 'Laboratory Wolbachia stock\nReference field programme [1, 2]', False),
           ('trap', 'Adult mosquito monitoring\nBG-Sentinel trap example [1, 2]', False),
           ('health', 'Dengue surveillance\nDated, located health records [3]', False),
           ('release', 'Mosquito release container (MRC)\nEggs > larvae > pupae > adults\nReleases mosquitoes; not a capture trap', False),
           ('assay', 'Species identification + lab assay\nPCR / qPCR or other validated method\nInfection is not read from a photograph', False),
           ('casequality', 'Case definition and reporting\nLaboratory confirmation where required\nPopulation / intervention context', False),
           ('qa', 'Stage-aware container QA\nCounts / condition / dates\nSeparate emergence or outcome assessment', False),
           ('prevalence', 'Wolbachia prevalence\nPositive specimens / specimens tested\nRetain sample, place and date', False),
           ('impact', 'Epidemiological impact evaluation\nComparator, study design, uncertainty\nDistinct from a container-count trend', False),
       ],
       [('stock', 'release', '', False), ('release', 'qa', '', False),
        ('trap', 'assay', '', False), ('assay', 'prevalence', '', False),
        ('health', 'casequality', '', False), ('casequality', 'impact', '', False)],
       [('stock', 'trap', 'health'), ('release', 'assay', 'casequality'), ('qa', 'prevalence', 'impact')],
       'Reference workflow, not a rearing/release protocol. Paper numbers refer to the README references.\nFewer visible larvae alone do not establish successful adult emergence or reduced dengue.')

figure('review-and-ml', '3. Prototype data flow: review, evaluate, then plan inspections',
       'Saved bead images are counted and reviewed. QA records are entered separately with stage and outcome context; there is no automatic image-to-QA link. A recorded study supports a small numeric model and held-out baseline comparisons. Inspection priorities are rule-based, with human decisions and audit exports.',
       [
           ('photo', 'Saved image [current]\nGenerated bead proxy / user photo', False),
           ('counter', 'Pixel counter [current]\nVercel CPU or browser worker\nNot a trained larvae detector', False),
           ('review', 'Human image review [current]\nAccept / correct / reject\nRetain estimate and review history', False),
           ('qa', 'Container QA record [current]\nDated stage counts and conditions\nOutcome assessed separately', False),
           ('study', 'Study plan + pinned snapshot [current]\nUnit / target / reference / missingness', False),
           ('model', 'Numeric model [experimental]\nLater failed vs satisfactory QA\nUse earlier observations only', False),
           ('evaluation', 'Held-out evaluation [current]\nGrouped / chronological partition\nTwo baselines + failure recall', False),
           ('planning', 'Inspection queue [current]\nRules + available evidence\nHuman accept / defer / dismiss', False),
           ('export', 'Reviewable exports [current]\nPinned inputs / methods / versions\nReasons and decision history', False),
       ],
       [('photo', 'counter', '', False), ('counter', 'review', '', False),
        ('review', 'qa', 'manual entry; no automatic link', False),
        ('qa', 'study', '', False), ('study', 'model', '', False),
        ('model', 'evaluation', '', False),
        ('qa', 'planning', 'condition / completeness / age', False),
        ('study', 'planning', 'optional study evidence', False),
        ('evaluation', 'planning', 'optional historical context;\nscores do not rank the queue', True),
        ('evaluation', 'export', '', False), ('planning', 'export', '', False)],
       [('evaluation', 'planning')],
       'Dashed arrow: contextual evidence, not automated ranking. Case charts are separate synthetic context.\nCurrent model results demonstrate an evaluation pipeline, not useful field prediction.')

print('Rendered three original outline-stencil SVG figures with matching semantic DOT and Mermaid sources.')
