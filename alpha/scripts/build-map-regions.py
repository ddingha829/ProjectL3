"""Derive display-only Korean parent regions from the bundled SGIS dong snapshot.

Requires shapely 2.x. Natural Earth 110m input is only used for other countries.
Run with PYTHONPATH=.test-data/geo-tools and a downloaded source file below.
"""
import json
import hashlib
from pathlib import Path
from collections import defaultdict
from shapely import make_valid, union_all
from shapely.geometry import shape, mapping

root = Path(__file__).resolve().parents[1]
source = root / 'public/maps/admin-dong/20261001'
dest = root / 'public/maps/admin-regions/20261001'
dest.mkdir(parents=True, exist_ok=True)

def rounded(value):
    if isinstance(value, (list, tuple)):
        return [rounded(x) for x in value]
    return round(value, 5) if isinstance(value, float) else value

def feature(code, name, geom, tolerance):
    geom = geom.simplify(tolerance, preserve_topology=True)
    return dict(type='Feature', properties=dict(code=code, name=name, label=name),
                bbox=rounded(geom.bounds), geometry=rounded(dict(mapping(geom))))

districts, provinces = [], defaultdict(list)
province_names = {}
for file in sorted(source.glob('[0-9]*.json')):
    data = json.loads(file.read_text(encoding='utf-8'))
    code = file.stem
    name = data['features'][0]['properties']['name'].rsplit(' ', 1)[0]
    geom = union_all([make_valid(shape(f['geometry'])) for f in data['features']], grid_size=0.00001)
    districts.append(feature(code, name, geom, 0.00012))
    provinces[code[:2]].append(geom)
    province_names[code[:2]] = name.split(' ')[0]

province_geoms = {code: union_all(parts, grid_size=0.00001) for code, parts in provinces.items()}
province_features = [feature(code, province_names[code], geom, 0.0005) for code, geom in province_geoms.items()]
korea = feature('KOR', '대한민국', union_all(list(province_geoms.values()), grid_size=0.00001), 0.001)
world_source = root / '.test-data/countries-source.geojson'
world_bytes = world_source.read_bytes()
expected_hash = '6866c877d39cba9c357620878839b336d569f8c662d3cfab4cb1dbe2d39c977f'
assert hashlib.sha256(world_bytes).hexdigest() == expected_hash, 'Natural Earth input changed; review before rebuilding'
countries = []
for item in json.loads(world_bytes)['features']:
    p = item['properties']
    if p['ADM0_A3'] == 'KOR':
        countries.append(korea)
    else:
        countries.append(feature(p['ADM0_A3'], p.get('NAME_KO') or p['NAME'], shape(item['geometry']), 0.005))

for tier, features in [('district', districts), ('province', province_features), ('country', countries)]:
    path = dest / f'{tier}.json'
    path.write_text(json.dumps(dict(type='FeatureCollection', features=features), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{tier}: {len(features)} regions, {path.stat().st_size:,} bytes')
