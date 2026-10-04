"""Copy a selected logo release from the business repo into the static site."""
import argparse
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = {
    'lettermark': ('lettermark', 'aa'),
    'wordmark': ('wordmark', 'augment-wh'),
    'lockup': ('lockups', 'augment-wh-lockup'),
}


def sync_brand(config_path=ROOT / 'brand.config.json', source_root=None, version=None):
    config_path = Path(config_path).resolve()
    config = json.loads(config_path.read_text())
    version = version or config['version']
    if not re.fullmatch(r'v[1-9][0-9]*', version):
        raise ValueError('Version must be v1, v2, etc.')
    header = config['header_logo']
    if header not in ASSETS:
        raise ValueError('header_logo must be lettermark, wordmark, or lockup.')
    source = Path(source_root) if source_root else config_path.parent / config['source_root']
    source = source.resolve()
    sources = {role: source / folder / f'{stem}-{version}.png'
               for role, (folder, stem) in ASSETS.items()}
    missing = [str(path) for path in sources.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError('Missing brand assets; no files changed:\n' + '\n'.join(missing))
    destination = config_path.parent / 'public' / 'assets' / 'brand'
    destination.mkdir(parents=True, exist_ok=True)
    for role, path in sources.items():
        shutil.copyfile(path, destination / f'{role}.png')
    shutil.copyfile(sources[header], destination / 'header.png')
    shutil.copyfile(sources['lettermark'], destination / 'favicon.png')
    # Keep the deployment traceable without exposing the local source path.
    manifest = {'version': version, 'header_logo': header}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if version != config['version']:
        config['version'] = version
        config_path.write_text(json.dumps(config, indent=2) + '\n')
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, help='Override the brand source folder.')
    parser.add_argument('--version', help='Select and save a version such as v2.')
    args = parser.parse_args()
    try:
        destination = sync_brand(source_root=args.source_root, version=args.version)
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'{error}\n')
    print(f'Brand assets synced to {destination}')


if __name__ == '__main__':
    main()
