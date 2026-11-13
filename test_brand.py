import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.sync_brand import ASSETS, sync_brand


class BrandTests(unittest.TestCase):
    @staticmethod
    def write_production(source):
        source.mkdir(parents=True)
        files = {
            'schema.json': {'kind': 'schema'},
            'manifest.json': {'kind': 'manifest'},
        }
        assets = {}
        for website_role, (production_role, relative) in ASSETS.items():
            path = source / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(website_role.encode())
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            files[relative] = {'kind': 'image', 'role': production_role}
            assets[production_role] = {'path': relative, 'sha256': digest}
        schema = {'contract': 'test-brand-production', 'files': files}
        (source / 'schema.json').write_text(json.dumps(schema))
        manifest = {'contract': schema['contract'], 'assets': assets}
        (source / 'manifest.json').write_text(json.dumps(manifest))

    def test_sync_and_missing_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'brand' / 'production'
            site = root / 'site'
            site.mkdir()
            config = site / 'brand.config.json'
            config.write_text(json.dumps({'source_root': '../brand/production', 'header_logo': 'full-logo'}))
            self.write_production(source)
            destination = sync_brand(config)
            self.assertEqual((destination / 'header.png').read_bytes(), b'full-logo')
            self.assertEqual((destination / 'favicon.png').read_bytes(), b'logo')
            before = {path.name: path.read_bytes() for path in destination.iterdir()}
            (source / ASSETS['full-logo'][1]).unlink()
            with self.assertRaisesRegex(ValueError, 'does not match schema'):
                sync_brand(config)
            self.assertEqual(before, {path.name: path.read_bytes() for path in destination.iterdir()})

    def test_invalid_selections_do_not_create_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            config = Path(temporary) / 'brand.config.json'
            config.write_text(json.dumps({'source_root': '../brand/production', 'header_logo': 'unknown'}))
            with self.assertRaises(ValueError):
                sync_brand(config)
            self.assertFalse((config.parent / 'public').exists())


if __name__ == '__main__':
    unittest.main()
