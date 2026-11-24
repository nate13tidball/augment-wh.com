"""Static smoke checks for the modeling page's presentation contract."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re
import unittest

PUBLIC = Path(__file__).parent / 'public'

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.links, self.blocks, self.copy = [], [], [], []
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.links.append(attrs[key])
        if tag in ('p', 'li'):
            self.blocks.append([tag, ''])
    def handle_data(self, data):
        for block in self.blocks:
            block[1] += data
    def handle_endtag(self, tag):
        if self.blocks and self.blocks[-1][0] == tag:
            self.copy.append(' '.join(self.blocks.pop()[1].split()))

class ModelingPageSmoke(unittest.TestCase):
    def setUp(self):
        self.html = (PUBLIC / 'modeling-demos/index.html').read_text()
        self.page = Page(self.html)
    def test_local_links_assets_and_anchors(self):
        self.assertEqual(len(self.page.ids), len(set(self.page.ids)))
        for link in self.page.links:
            url = urlsplit(link)
            # Vercel injects this platform asset; the public-only local server does not.
            if url.scheme or url.netloc or url.path == '/_vercel/insights/script.js':
                continue
            target = PUBLIC / url.path.lstrip('/') if url.path else PUBLIC / 'modeling-demos/index.html'
            if target.is_dir():
                target /= 'index.html'
            self.assertTrue(target.is_file(), link)
            if url.fragment:
                self.assertIn(url.fragment, Page(target.read_text()).ids, link)
    def test_concise_neutral_copy_and_contact(self):
        self.assertIn('<link rel="canonical" href="https://aaugment.io/modeling-demos/">', self.html)
        self.assertNotIn('noindex', self.html)
        self.assertNotIn('href="/dev/"', self.html)
        for text in self.page.copy:
            self.assertLessEqual(len(text.split()), 20, text)
            self.assertNotRegex(text, r'(?i)\b(?:you|your|we|our|my)\b')
        self.assertNotRegex(self.html, r'(?i)illustrative')
        self.assertIn('href="/#contact"', self.html.split('<footer')[1])
        self.assertIn('tabindex="0" role="region" aria-label="Cell utilization comparison"', self.html)
    def test_readable_type_and_header_layout(self):
        for name in ('slider.css', 'market.css', 'concepts.css', 'dispatch.css'):
            css = (PUBLIC / 'modeling-demos' / name).read_text()
            for size in re.findall(r'font-size:\s*(\d+(?:\.\d+)?)px', css):
                self.assertGreaterEqual(float(size), 16, name)
        css = (PUBLIC / 'modeling-demos/slider.css').read_text()
        self.assertNotIn('.model-demo-page .site-header {', css)
        self.assertIn('site-theme-change', (PUBLIC / 'modeling-demos/demo.js').read_text())
