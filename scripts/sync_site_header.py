"""Synchronize the shared header into every HTML page; --check detects drift."""
import argparse
import re
from html import escape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADER = ROOT / 'scripts/site_header.html'
HEAD = '''<!-- shared-site-assets:start -->
  <script src="/assets/site/theme.js"></script>
  <link rel="stylesheet" href="/assets/site/site.css">
  <script defer src="/assets/site/site.js"></script>
  <script defer src="/assets/site/header-access.js"></script>
  <!-- shared-site-assets:end -->'''

class PageLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = {}
        self.anchor = None
        self.text = []
        self.ids = set()
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        if tag == 'a':
            self.anchor = attrs.get('href', '')
            self.text = []
    def handle_data(self, data):
        if self.anchor is not None:
            self.text.append(data)
    def handle_endtag(self, tag):
        if tag == 'a' and self.anchor is not None:
            if self.anchor.startswith('#') and self.anchor not in ('#', '#main', '#preview'):
                label = ' '.join(''.join(self.text).split())
                if label:
                    label = {'Our approach': 'Approach', 'Our team': 'Team', 'How we work': 'Process'}.get(label, label)
                    self.links.setdefault(self.anchor, label)
            self.anchor = None

def render(path):
    text = path.read_text()
    source = re.sub(r'<!-- shared-header:start -->.*?<!-- shared-header:end -->\s*', '', text, flags=re.S)
    source = re.sub(r'<!-- shared-site-assets:start -->.*?<!-- shared-site-assets:end -->\s*', '', source, flags=re.S)
    parser = PageLinks()
    parser.feed(source)
    links = ''.join(f'<a href="{escape(href, quote=True)}">{escape(label)}</a>'
                    for href, label in parser.links.items() if href[1:] in parser.ids)
    page_nav = f'<nav aria-label="On this page"><p class="wh-menu-heading">On this page</p>{links}</nav>' if links else ''
    dev_nav = ''
    if path.relative_to(ROOT / 'public').parts[0] == 'dev':
        dev_nav = '<nav aria-label="Development" data-admin-only hidden><p class="wh-menu-heading">Development</p><a href="/dev/">Page tree</a><a href="/dev/analytics">Analytics</a><a href="/dev/login/">Admin account</a></nav>'
    header = HEADER.read_text().replace('{{PAGE_NAV}}', page_nav).replace('{{DEV_NAV}}', dev_nav).rstrip()
    header = '\n'.join(line.rstrip() for line in header.splitlines())
    source = source.replace('</head>', HEAD + '\n</head>', 1)
    return re.sub(r'(<body\b[^>]*>)\s*', lambda m: m[1] + '\n' + header + '\n', source, count=1)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    changed = []
    for path in sorted((ROOT / 'public').rglob('*.html')):
        updated = render(path)
        if updated != path.read_text():
            changed.append(str(path.relative_to(ROOT)))
            if not args.check:
                path.write_text(updated)
    if args.check and changed:
        parser.exit(1, 'Shared header drift: ' + ', '.join(changed) + '\n')
    print(f'Shared header: {len(changed)} pages {"need updates" if args.check else "updated"}.')

if __name__ == '__main__':
    main()
