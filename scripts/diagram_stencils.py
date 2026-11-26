"""Original outline stencils and hand-routed, accessible README schematics.

No stock artwork, fonts, remote resources or JavaScript are embedded. The caller
supplies the same semantic nodes/edges used by the DOT and Mermaid exports.
"""
from html import escape
from xml.etree import ElementTree as ET


ICONS = {
    'clients': '''<rect x="6" y="18" width="82" height="54" rx="3" fill="#f5f5f5"/>
        <rect x="12" y="24" width="70" height="40" fill="white"/>
        <path d="M1 78H94L88 85H7Z" fill="white"/><path d="M34 78H62"/>
        <rect x="101" y="9" width="25" height="74" rx="4" fill="white"/>
        <path d="M106 18H121M108 75H119"/><path d="M20 55L44 33L72 57" stroke="#d5d5d5"/>''',
    'camera': '''<path d="M64 54V88M40 89H88"/>
        <path d="M24 20L35 10H56L64 20" fill="white"/>
        <rect x="14" y="20" width="95" height="48" rx="4" fill="#f5f5f5"/>
        <circle cx="63" cy="44" r="17" fill="white"/><circle cx="63" cy="44" r="10"/>
        <path d="M25 31H35M114 21Q127 31 114 41M119 15Q136 31 119 47"/>''',
    'router': '''<path d="M28 47V15M99 47V15M16 20Q5 30 16 40M10 14Q-8 30 10 46M111 20Q122 30 111 40M117 14Q135 30 117 46"/>
        <rect x="6" y="49" width="116" height="29" rx="3" fill="#f5f5f5"/>
        <path d="M17 59H25V68H17ZM32 59H40V68H32ZM47 59H55V68H47ZM62 59H70V68H62Z" fill="white"/>
        <circle cx="94" cy="64" r="2"/><circle cx="105" cy="64" r="2"/>
        <path d="M17 79V84H29V79M98 79V84H110V79"/>''',
    'gateway': '''<path d="M64 15V77M46 77L64 40L82 77M52 63H76M56 50H72"/>
        <circle cx="64" cy="12" r="3" fill="white"/>
        <path d="M49 8Q38 20 49 32M79 8Q90 20 79 32M39 1Q20 20 39 41M89 1Q108 20 89 41"/>
        <rect x="28" y="78" width="72" height="14" rx="2" fill="#f5f5f5"/>
        <path d="M37 84H49M56 84H68"/><circle cx="86" cy="85" r="2"/>''',
    'route': '''<rect x="8" y="9" width="112" height="78" rx="4" fill="white"/>
        <path d="M8 27H120"/><circle cx="18" cy="18" r="1.5"/><circle cx="26" cy="18" r="1.5"/>
        <path d="M64 39V54M31 68V54H97V68"/>
        <rect x="54" y="34" width="20" height="12" rx="2" fill="#f5f5f5"/>
        <rect x="21" y="67" width="20" height="12" rx="2" fill="#f5f5f5"/>
        <rect x="54" y="67" width="20" height="12" rx="2" fill="#f5f5f5"/>
        <rect x="87" y="67" width="20" height="12" rx="2" fill="#f5f5f5"/><path d="M64 54V67"/>''',
    'worker': '''<rect x="7" y="8" width="114" height="68" rx="3" fill="#f5f5f5"/>
        <rect x="14" y="15" width="100" height="53" fill="white"/>
        <path d="M52 77V86H76V77M38 87H90"/>
        <rect x="49" y="27" width="30" height="29" rx="2" fill="#f5f5f5"/>
        <path d="M57 21V27M65 21V27M73 21V27M57 56V62M65 56V62M73 56V62M43 33H49M43 41H49M43 49H49M79 33H85M79 41H85M79 49H85"/>''',
    'cloud': '''<path d="M30 77H101C131 77 133 39 108 36C107 8 70 1 54 24C36 16 19 29 20 44C-3 48 1 77 30 77Z" fill="white"/>
        <rect x="47" y="40" width="36" height="25" rx="3" fill="#f5f5f5"/>
        <path d="M55 48L50 52L55 57M75 48L80 52L75 57M68 47L63 58"/>''',
    'server': '''<rect x="25" y="5" width="78" height="84" rx="3" fill="#f5f5f5"/>
        <path d="M25 32H103M25 60H103M36 17H68M36 45H68M36 73H68M34 90V94M94 90V94"/>
        <circle cx="88" cy="19" r="3" fill="white"/><circle cx="88" cy="47" r="3" fill="white"/><circle cx="88" cy="75" r="3" fill="white"/>''',
    'browser-store': '''<rect x="4" y="8" width="99" height="70" rx="3" fill="white"/>
        <path d="M4 25H103M14 16H29M15 40H61M15 51H50M15 62H40"/>
        <path d="M65 50V83C65 96 123 96 123 83V50" fill="#f5f5f5"/>
        <ellipse cx="94" cy="50" rx="29" ry="10" fill="white"/>
        <path d="M65 65C65 78 123 78 123 65"/>''',
    'database': '''<path d="M20 18V78C20 97 108 97 108 78V18" fill="#f5f5f5"/>
        <ellipse cx="64" cy="18" rx="44" ry="14" fill="white"/>
        <path d="M20 38C20 57 108 57 108 38M20 59C20 78 108 78 108 59"/>''',
    'stock': '''<path d="M19 22L36 8H116V76L100 90H19Z" fill="#f5f5f5"/>
        <path d="M19 22H100V90M100 22L116 8M100 22V90L116 76"/>
        <path d="M27 30H92V81H27Z" fill="white"/>
        <path d="M34 30V81M85 30V81M27 37H92M27 74H92" stroke="#d0d0d0"/>
        <ellipse cx="59" cy="54" rx="3" ry="11"/>
        <path d="M56 52Q38 34 43 53L56 57M62 52Q80 34 75 53L62 57M56 59L42 67M56 63L49 73M62 59L76 67M62 63L69 73M59 42L62 35"/>
        <path d="M44 16H87"/>''',
    'release': '''<path d="M27 33L35 84Q64 98 93 84L101 33" fill="white"/>
        <ellipse cx="64" cy="33" rx="43" ry="10" fill="#f5f5f5"/>
        <path d="M43 57Q51 48 56 59T69 61M69 76Q78 66 84 75M43 80Q52 71 56 78"/>
        <path d="M64 16V2M57 9L64 2L71 9"/>
        <path d="M28 39Q17 62 35 72M101 39Q112 62 93 72"/>''',
    'clipboard': '''<path d="M47 14H24V90H106V14H83" fill="white"/>
        <rect x="45" y="7" width="40" height="17" rx="3" fill="#f5f5f5"/>
        <path d="M35 39L40 44L49 34M57 40H94M35 58L40 63L49 53M57 59H94M35 77L40 82L49 72M57 78H84"/>''',
    'trap': '''<path d="M23 31V79C23 97 105 97 105 79V31" fill="#f5f5f5"/>
        <ellipse cx="64" cy="31" rx="41" ry="14" fill="white"/>
        <path d="M48 25L57 45H71L80 25" fill="#ededed"/>
        <ellipse cx="64" cy="24" rx="16" ry="5" fill="white"/>
        <path d="M34 51H94M34 59H94M34 67H94M34 75H94M43 48V82M54 48V86M66 48V86M78 48V84M89 48V81" stroke="#c6c6c6"/>
        <path d="M105 66H119V38M114 38H124"/>''',
    'assay': '''<path d="M24 85H100M40 84V75M68 84V75M25 62H71"/>
        <path d="M60 19Q95 29 86 56Q82 72 59 75H31"/>
        <path d="M34 14L48 5L69 38L54 48ZM51 45L45 53" fill="#f5f5f5"/>
        <circle cx="80" cy="45" r="5" fill="white"/>
        <path d="M105 52H123M109 52V80Q109 90 119 87Q123 86 123 80V52M111 70H121"/>''',
    'prevalence': '''<path d="M23 7H91L109 25V90H23ZM91 7V25H109" fill="white"/>
        <path d="M37 72H94M37 81H79M44 44H88"/>
        <text x="66" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" fill="#161616" stroke="none">n+</text>
        <text x="66" y="64" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#161616" stroke="none">N</text>''',
    'health': '''<rect x="8" y="25" width="72" height="64" rx="2" fill="#f5f5f5"/>
        <path d="M20 25V10H67V25M26 68H37V89H26M48 68H60V79H48"/>
        <path d="M35 36H49V45H58V58H49V67H35V58H26V45H35Z" fill="white"/>
        <path d="M83 38H109L122 51V91H83ZM109 38V51H122M92 64H113M92 74H113M92 83H104" fill="white"/>''',
    'case-report': '''<path d="M23 7H91L109 25V90H23ZM91 7V25H109" fill="white"/>
        <path d="M36 29H68M36 42H92M36 53H80M36 67L43 75L58 60M67 70H94M67 79H86"/>''',
    'impact': '''<path d="M19 8V86H120"/>
        <rect x="33" y="42" width="18" height="43" fill="#ededed"/>
        <rect x="60" y="58" width="18" height="27" fill="white"/>
        <rect x="90" y="30" width="18" height="55" fill="#ededed"/>
        <path d="M42 32V49M36 32H48M69 48V65M63 48H75M99 19V39M93 19H105"/>''',
    'photo': '''<rect x="9" y="10" width="110" height="76" rx="3" fill="white"/>
        <path d="M18 22H29M18 22V33M110 22H99M110 22V33M18 75H29M18 75V64M110 75H99M110 75V64"/>
        <circle cx="41" cy="42" r="7" fill="#ededed"/><circle cx="81" cy="34" r="7" fill="#ededed"/>
        <circle cx="65" cy="63" r="7" fill="#ededed"/><circle cx="96" cy="60" r="7" fill="#ededed"/>''',
    'pixels': '''<path d="M12 11H82V81H12Z" fill="white"/>
        <path d="M26 11V81M40 11V81M54 11V81M68 11V81M12 25H82M12 39H82M12 53H82M12 67H82" stroke="#d0d0d0"/>
        <path d="M27 26H39V38H27ZM41 40H53V52H41ZM55 26H67V38H55Z" fill="#dedede"/>
        <circle cx="84" cy="60" r="23" fill="white"/><circle cx="84" cy="60" r="16"/>
        <path d="M101 77L120 94M76 60H92M84 52V68"/>''',
    'review': '''<rect x="4" y="9" width="84" height="61" rx="3" fill="white"/>
        <path d="M4 25H88M14 17H26M34 39L45 50L65 31M33 71V81H59V71M23 82H69"/>
        <circle cx="106" cy="50" r="11" fill="white"/>
        <path d="M87 89V81Q87 64 106 64Q125 64 125 81V89Z" fill="#f5f5f5"/>''',
    'study': '''<path d="M16 14H88V91H16Z" fill="#f5f5f5"/>
        <path d="M29 5H101V80H29Z" fill="white"/>
        <path d="M40 20H86M40 32H86M40 44H70M40 56H63M40 68H62"/>
        <rect x="73" y="58" width="45" height="32" rx="3" fill="white"/>
        <path d="M82 58V48Q82 32 108 48V58"/><circle cx="95" cy="73" r="3"/>
        <path d="M95 76V81"/>''',
    'model': '''<rect x="23" y="11" width="82" height="74" rx="3" fill="#f5f5f5"/>
        <path d="M16 24H23M16 41H23M16 58H23M16 75H23M105 24H112M105 41H112M105 58H112M105 75H112M36 4V11M55 4V11M74 4V11M93 4V11M36 85V92M55 85V92M74 85V92M93 85V92"/>
        <path d="M38 27V70H92M43 62L59 52L70 56L89 34"/>
        <circle cx="49" cy="52" r="2" fill="white"/><circle cx="67" cy="39" r="2" fill="white"/><circle cx="84" cy="49" r="2" fill="white"/>''',
    'evaluation': '''<path d="M13 10V84H119M13 38H117"/>
        <rect x="28" y="49" width="17" height="34" fill="#ededed"/>
        <rect x="56" y="25" width="17" height="58" fill="white"/>
        <circle cx="96" cy="62" r="19" fill="white"/><path d="M109 76L125 92M86 62L93 69L106 53"/>''',
    'planning': '''<rect x="12" y="8" width="91" height="79" rx="3" fill="white"/>
        <path d="M12 27H103M31 1V16M83 1V16M24 40H34V50H24ZM44 45H88M24 62H34V72H24ZM44 67H76"/>
        <path d="M90 68L100 78L120 55" stroke-width="3"/>''',
    'export': '''<path d="M17 17H83V91H17Z" fill="#f5f5f5"/>
        <path d="M28 6H78L94 22V79H28ZM78 6V22H94M40 36H80M40 48H80M40 60H63" fill="white"/>
        <path d="M75 72H124M112 60L124 72L112 84"/>''',
}


class Canvas:
    def __init__(self, name, title, description, width, height, nodes, edges):
        self.name, self.width, self.height = name, width, height
        self.nodes = {key: label for key, label, _ in nodes}
        self.edges = {(a, b): (label, dashed) for a, b, label, dashed in edges}
        self.drawn_nodes, self.drawn_edges = set(), set()
        self.parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="figure-title figure-description">
<title id="figure-title">{escape(title)}</title>
<desc id="figure-description">{escape(description)}</desc>
<defs>
  <marker id="arrow" viewBox="0 0 9 9" refX="8" refY="4.5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1 1L8 4.5L1 8" fill="none" stroke="#292929" stroke-width="1.1" stroke-linejoin="round"/></marker>
  {''.join(f'<symbol id="icon-{key}" viewBox="0 0 128 96">{value}</symbol>' for key, value in ICONS.items())}
</defs>
<rect width="{width}" height="{height}" fill="white"/>
<g fill="none" stroke="#292929" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">''']

    def text(self, x, y, text, size=18, weight='400', anchor='middle', muted=False, spacing=None, halo=False):
        attrs = f' letter-spacing="{spacing}"' if spacing else ''
        if halo:
            attrs += ' stroke="white" stroke-width="7" paint-order="stroke"'
        else:
            attrs += ' stroke="none"'
        colour = '#565656' if muted else '#161616'
        self.parts.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Arial, Helvetica, sans-serif" font-size="{size}" font-weight="{weight}" fill="{colour}"{attrs}>{escape(text)}</text>')

    def header(self, title, subtitle):
        self.text(48, 57, title, 34, '600', anchor='start')
        self.text(48, 94, subtitle, 20, anchor='start', muted=True)

    def rule(self, y):
        self.parts.append(f'<path d="M48 {y}H{self.width - 48}" stroke="#d5d5d5" stroke-width="1"/>')

    def section(self, y, title):
        self.text(48, y, title, 15, '600', anchor='start', spacing='1.7')

    def node(self, ident, x, y, icon, heading, details=(), status=''):
        assert ident in self.nodes and ident not in self.drawn_nodes, ident
        self.drawn_nodes.add(ident)
        self.parts.append(f'<g id="node-{ident}"><title>{escape(self.nodes[ident])}</title>')
        self.parts.append(f'<use href="#icon-{icon}" x="{x - 64}" y="{y - 48}" width="128" height="96"/>')
        self.text(x, y + 75, heading, 22, '500')
        baseline = y + 106
        if status:
            self.text(x, y + 99, status.upper(), 13, '600', muted=True, spacing='1.3')
            baseline = y + 127
        for i, line in enumerate(details):
            self.text(x, baseline + i * 26, line)
        self.parts.append('</g>')

    def connect(self, source, target, points, caption=(), at=None, anchor='middle'):
        key = source, target
        assert key in self.edges and key not in self.drawn_edges, key
        self.drawn_edges.add(key)
        label, dashed = self.edges[key]
        attr = ' stroke-dasharray="7 6"' if dashed else ''
        points_text = ' '.join(f'{x},{y}' for x, y in points)
        self.parts.append(f'<g id="edge-{source}-{target}"><title>{escape(source + " to " + target + (": " + label if label else ""))}</title>')
        self.parts.append(f'<polyline points="{points_text}" marker-end="url(#arrow)"{attr}/>')
        self.parts.append(f'<circle cx="{points[0][0]}" cy="{points[0][1]}" r="2.6" fill="white"/>')
        if caption:
            assert at is not None
            for i, line in enumerate(caption):
                self.text(at[0], at[1] + 24 * i, line, 17, anchor=anchor, halo=True)
        self.parts.append('</g>')

    def footer(self, y, lines):
        self.rule(y)
        for i, line in enumerate(lines):
            self.text(48, y + 32 + 27 * i, line, 18, anchor='start', muted=True)

    def svg(self):
        assert self.drawn_nodes == set(self.nodes), self.drawn_nodes ^ set(self.nodes)
        assert self.drawn_edges == set(self.edges), self.drawn_edges ^ set(self.edges)
        svg = '\n'.join(self.parts) + '\n</g>\n</svg>\n'
        ET.fromstring(svg)
        return svg


def network(c):
    c.header('1. Network system setup', 'Transport carries the data. Execution determines which computer analyses it.')
    c.connect('staff', 'premises', [(222, 185), (389, 185)])
    c.connect('field', 'remote', [(917, 185), (1104, 185)])
    c.connect('premises', 'routing', [(455, 354), (455, 436), (614, 436)], ['Web access'], (533, 416))
    c.connect('remote', 'routing', [(1170, 354), (1170, 436), (746, 436)], ['Ingestion adapter needed'], (963, 416))
    c.connect('routing', 'device', [(656, 581), (656, 612), (220, 612), (220, 650)], ['Device route'], (330, 600))
    c.connect('routing', 'vercel', [(680, 581), (680, 650)], ['Hosted route'], (706, 628), anchor='start')
    c.connect('routing', 'internal', [(704, 581), (704, 612), (1140, 612), (1140, 650)], ['Intranet route needed'], (1007, 600))
    c.connect('device', 'browserstore', [(220, 845), (220, 890), (445, 890), (445, 932)], ['Reviewed result'], (304, 876))
    c.connect('vercel', 'browserstore', [(680, 875), (680, 910), (445, 910), (445, 932)], ['Returned to browser'], (582, 896))
    c.connect('internal', 'sharedstore', [(1140, 845), (1140, 932)], ['Shared persistence'], (1170, 895), anchor='start')
    c.node('staff', 155, 185, 'clients', 'Staff browser', ['Phone / laptop'], 'current')
    c.node('field', 850, 185, 'camera', 'Field camera / sensor', ['At release container / adult trap'], 'future')
    c.node('premises', 455, 185, 'router', 'Premises network', ['Ethernet / Wi-Fi', 'Nearby BLE needs a gateway'], 'reference pattern')
    c.node('remote', 1170, 185, 'gateway', 'Remote uplink', ['Photos: cellular / radio bridge', 'Small readings: LoRaWAN + gateway'], 'reference pattern')
    c.node('routing', 680, 436, 'route', 'Application + route choice', ['Preference + service metadata check'], 'current')
    c.node('device', 220, 698, 'worker', 'Device worker', ['Small bead CV / numeric ML'], 'current')
    c.node('vercel', 680, 698, 'cloud', 'Vercel function', ['GET metadata / POST reduced pixels', 'Small bead CV'], 'current')
    c.node('internal', 1140, 698, 'server', 'Internal AI service', ['Shared on-premises compute'], 'future')
    c.node('browserstore', 445, 980, 'browser-store', 'Browser records', ['IndexedDB / localStorage'], 'current')
    c.node('sharedstore', 1140, 980, 'database', 'Institutional records', ['Local database / image archive'], 'future')
    c.footer(1150, ['GET checks service metadata. POST counts reduced pixels. Device counting uploads no image.',
                    'Dashed routes: future integration. Field equipment, shared sync and intranet service are not deployed.'])


def evidence(c):
    c.header('2. Wolbachia field evidence', 'Three observation streams with different questions and reference methods.')
    for y, label in [(145, 'RELEASE QUALITY'), (435, 'ADULT INFECTION'), (725, 'HEALTH IMPACT')]:
        c.section(y, label)
    c.rule(396)
    c.rule(686)
    for source, target, a, b, y in [
        ('stock', 'release', 320, 614, 216), ('release', 'qa', 746, 1034, 216),
        ('trap', 'assay', 320, 614, 506), ('assay', 'prevalence', 746, 1034, 506),
        ('health', 'casequality', 320, 614, 796), ('casequality', 'impact', 746, 1034, 796),
    ]:
        c.connect(source, target, [(a, y), (b, y)])
    c.node('stock', 254, 216, 'stock', 'Wolbachia mosquito stock', ['Laboratory programme [1, 2]'])
    c.node('release', 680, 216, 'release', 'Release container (MRC)', ['Eggs → larvae → pupae → adults', 'Releases mosquitoes; does not capture'])
    c.node('qa', 1100, 216, 'clipboard', 'Stage-aware container QA', ['Counts / condition / dates', 'Emergence / outcome assessed separately'])
    c.node('trap', 254, 506, 'trap', 'Adult mosquito monitoring', ['BG-Sentinel trap example [1, 2]'])
    c.node('assay', 680, 506, 'assay', 'Identification + lab assay', ['PCR / qPCR / validated method', 'Not diagnosed from a photograph'])
    c.node('prevalence', 1100, 506, 'prevalence', 'Wolbachia prevalence', ['Positive specimens / specimens tested', 'Keep sample, place and date'])
    c.node('health', 254, 796, 'health', 'Dengue surveillance', ['Dated and located health records [3]'])
    c.node('casequality', 680, 796, 'case-report', 'Case definition + reporting', ['Lab confirmation where required', 'Population / intervention context'])
    c.node('impact', 1100, 796, 'impact', 'Impact evaluation', ['Comparator / design / uncertainty', 'Separate from container-count trends'])
    c.footer(973, ['Reference field workflows [1–3], not a rearing or release protocol. See the README references.',
                   'Fewer visible larvae alone do not establish successful adult emergence or reduced dengue.'])


def workflow(c):
    c.header('3. Prototype data flow', 'Review observations, evaluate the model, and plan inspections with human decisions.')
    c.connect('photo', 'counter', [(286, 180), (614, 180)])
    c.connect('counter', 'review', [(746, 180), (1074, 180)])
    c.connect('review', 'qa', [(1140, 350), (1140, 427)], ['Manual QA entry', 'No automatic image-to-QA link'], (1107, 369), anchor='end')
    c.connect('qa', 'study', [(1074, 475), (746, 475)])
    c.connect('study', 'model', [(614, 475), (286, 475)])
    c.connect('model', 'evaluation', [(220, 647), (220, 737)])
    c.connect('qa', 'planning', [(1140, 647), (1140, 686), (1000, 686), (1000, 737)], ['Condition / completeness / age'], (1140, 670))
    c.connect('study', 'planning', [(680, 647), (680, 697), (960, 697), (960, 737)], ['Optional study evidence'], (812, 681))
    c.connect('evaluation', 'planning', [(286, 785), (914, 785)], ['Optional historical context', 'Scores do not rank the queue'], (600, 747))
    c.connect('evaluation', 'export', [(220, 955), (220, 985), (600, 985), (600, 1012)])
    c.connect('planning', 'export', [(980, 955), (980, 985), (648, 985), (648, 1012)])
    c.node('photo', 220, 180, 'photo', 'Saved image', ['Generated bead proxy / user photo'], 'current')
    c.node('counter', 680, 180, 'pixels', 'Pixel counter', ['Vercel CPU / browser worker', 'Not a trained larvae detector'], 'current')
    c.node('review', 1140, 180, 'review', 'Human image review', ['Accept / correct / reject', 'Keep estimate and review history'], 'current')
    c.node('qa', 1140, 475, 'clipboard', 'Container QA record', ['Dated stage counts and conditions', 'Outcome assessed separately'], 'current')
    c.node('study', 680, 475, 'study', 'Study + pinned snapshot', ['Unit / target / reference / missingness'], 'current')
    c.node('model', 220, 475, 'model', 'Numeric model', ['Later failed / satisfactory QA', 'Earlier observations only'], 'experimental')
    c.node('evaluation', 220, 785, 'evaluation', 'Held-out evaluation', ['Grouped / chronological partition', 'Two baselines + failure recall'], 'current')
    c.node('planning', 980, 785, 'planning', 'Inspection queue', ['Rules + available evidence', 'Human accept / defer / dismiss'], 'current')
    c.node('export', 624, 1060, 'export', 'Reviewable exports', ['Pinned inputs / methods / versions', 'Reasons and decision history'], 'current')
    c.footer(1250, ['Dashed route: contextual evidence, not automated ranking. Case charts are separate synthetic context.',
                    'Model results demonstrate an evaluation pipeline; they do not establish useful field prediction.'])


def render(name, title, description, nodes, edges):
    layout, size = {
        'network-stack': (network, (1360, 1240)),
        'wolbachia-evidence': (evidence, (1360, 1065)),
        'review-and-ml': (workflow, (1360, 1340)),
    }[name]
    canvas = Canvas(name, title, description, *size, nodes, edges)
    layout(canvas)
    return canvas.svg()
