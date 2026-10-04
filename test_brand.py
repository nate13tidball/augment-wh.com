import json
import tempfile
import unittest
from pathlib import Path

from scripts.sync_brand import ASSETS, sync_brand


class BrandTests(unittest.TestCase):
    def test_version_switch_and_missing_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / 'brand'
            site = root / 'site'
            site.mkdir()
            config = site / 'brand.config.json'
            config.write_text(json.dumps({'source_root': '../brand', 'version': 'v1', 'header_logo': 'lockup'}))
            for version in ('v1', 'v2'):
                for role, (folder, stem) in ASSETS.items():
                    (source / folder).mkdir(parents=True, exist_ok=True)
                    (source / folder / f'{stem}-{version}.png').write_bytes(f'{role}-{version}'.encode())
            destination = sync_brand(config)
            self.assertEqual((destination / 'header.png').read_bytes(), b'lockup-v1')
            self.assertEqual((destination / 'favicon.png').read_bytes(), b'lettermark-v1')
            sync_brand(config, version='v2')
            self.assertEqual((destination / 'header.png').read_bytes(), b'lockup-v2')
            self.assertEqual(json.loads(config.read_text())['version'], 'v2')
            before = {path.name: path.read_bytes() for path in destination.iterdir()}
            with self.assertRaises(FileNotFoundError):
                sync_brand(config, version='v3')
            self.assertEqual(before, {path.name: path.read_bytes() for path in destination.iterdir()})
            self.assertEqual(json.loads(config.read_text())['version'], 'v2')

    def test_invalid_selections_do_not_create_assets(self):
        with tempfile.TemporaryDirectory() as temporary:
            config = Path(temporary) / 'brand.config.json'
            for version, header in (('../v1', 'lockup'), ('v1', 'unknown')):
                config.write_text(json.dumps({'source_root': '../brand', 'version': version, 'header_logo': header}))
                with self.assertRaises(ValueError):
                    sync_brand(config)
                self.assertFalse((config.parent / 'public').exists())


if __name__ == '__main__':
    unittest.main()
