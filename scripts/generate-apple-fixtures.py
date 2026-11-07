"""Generate synthetic RGB PNGs for disposable PhotoKit libraries; no personal data.
These flat patterns test enumeration/cache/persistence, NOT representative camera
decoding, Vision quality, HDR, Live Photos or iCloud. Existing native smoke supplies
video. This command never imports, removes or deletes a Photos asset.
"""
import argparse, hashlib, json, pathlib, struct, zlib

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

def png(index):
    width, height = ((320, 240) if index % 2 else (240, 320))
    rows = []
    for y in range(height):
        row = bytearray([0])
        for x in range(width):
            cell = ((x + index*7)//32) ^ ((y + index*11)//24)
            row.extend(((index*37 + cell*19)%256, (y + index*13)%256, (x + index*17)%256))
        rows.append(bytes(row))
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b''), width, height

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--count', type=int, choices=[12,1000,10000,50000], default=12)
    p.add_argument('--output', required=True)
    args = p.parse_args()
    out = pathlib.Path(args.output).resolve()
    # Never overwrite a prior library/manifest, even with the same deterministic seed.
    out.mkdir(parents=True, exist_ok=False)
    entries = []
    for i in range(args.count):
        data, width, height = png(i)
        name = f'cocowash-synthetic-{i:05d}.png'
        (out/name).write_bytes(data)
        entries.append(dict(file=name, width=width, height=height, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    (out/'manifest.json').write_text(json.dumps(dict(kind='synthetic flat RGB patterns, not real photo/video benchmarks',count=args.count,entries=entries),indent=2)+'\n',encoding='utf8')
    print(f'Generated {len(entries)} synthetic PNGs; no Photos operation performed. Output: {out}')

if __name__ == '__main__':
    main()
