"""Copy approved production logos from the business repo into the static site."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = {
    'logo': ('logo', 'logos/augment-logo.png'),
    'full-logo': ('full-logo', 'logos/augment-full-logo.png'),
}


def _sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def _validate_production(source):
    schema = json.loads((source / 'schema.json').read_text())
    manifest = json.loads((source / 'manifest.json').read_text())
    expected = set(schema['files'])
    actual = {str(path.relative_to(source)) for path in source.rglob('*') if path.is_file()}
    if actual != expected:
        raise ValueError('Production tree does not match schema.json')
    if any(path.is_symlink() for path in source.rglob('*')):
        raise ValueError('Production may not contain symlinks')
    if manifest.get('contract') != schema.get('contract'):
        raise ValueError('Production manifest contract does not match schema')
    expected_roles = {spec['role']: relative for relative, spec in schema['files'].items()
                      if spec.get('role')}
    if set(manifest.get('assets', {})) != set(expected_roles):
        raise ValueError('Production manifest roles do not match schema')
    digests = []
    for role, relative in expected_roles.items():
        entry = manifest['assets'][role]
        digest = _sha256(source / relative)
        if entry.get('path') != relative or entry.get('sha256') != digest:
            raise ValueError(f'Production manifest mismatch for {role}')
        digests.append(digest)
    if len(digests) != len(set(digests)):
        raise ValueError('Production contains duplicate asset bytes')
    return manifest


def sync_brand(config_path=ROOT / 'brand.config.json', source_root=None):
    config_path = Path(config_path).resolve()
    config = json.loads(config_path.read_text())
    header = config['header_logo']
    if header not in ASSETS:
        raise ValueError('header_logo must be logo or full-logo.')
    source = Path(source_root) if source_root else config_path.parent / config['source_root']
    source = source.resolve()
    production_manifest = _validate_production(source)
    sources = {role: source / relative for role, (_, relative) in ASSETS.items()}
    missing = [str(path) for path in sources.values() if not path.is_file()]
    if missing:
        raise FileNotFoundError('Missing brand assets; no files changed:\n' + '\n'.join(missing))
    destination = config_path.parent / 'public' / 'assets' / 'brand'
    destination.mkdir(parents=True, exist_ok=True)
    for legacy_name in ('lettermark.png', 'wordmark.png', 'lockup.png'):
        legacy_path = destination / legacy_name
        if legacy_path.exists():
            legacy_path.unlink()
    for role, path in sources.items():
        shutil.copyfile(path, destination / f'{role}.png')
    shutil.copyfile(sources[header], destination / 'header.png')
    shutil.copyfile(sources['logo'], destination / 'favicon.png')
    # Keep the deployment traceable without exposing the local source path.
    deployed_assets = {role: production_manifest['assets'][production_role]['sha256']
                       for role, (production_role, _) in ASSETS.items()}
    manifest = {
        'source': 'brand/production',
        'source_manifest_sha256': _sha256(source / 'manifest.json'),
        'header_logo': header,
        'assets': deployed_assets,
    }
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return destination


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, help='Override the brand source folder.')
    args = parser.parse_args()
    try:
        destination = sync_brand(source_root=args.source_root)
    except (OSError, ValueError, KeyError) as error:
        parser.exit(1, f'{error}\n')
    print(f'Brand assets synced to {destination}')


if __name__ == '__main__':
    main()
