#!/usr/bin/env python3
"""Generate a minimal ELF-like binary file for testing.

This writes a file that starts with the ELF magic and a valid 64-bit
little-endian identification header, followed by zero padding. It
is sufficient for tools that only need to detect an ELF file.

Usage: python3 generate_minimal_elf.py [output_path]
"""
import sys
from pathlib import Path


def generate(path: Path, size: int = 4096) -> None:
    # ELF64 little-endian identification
    e_ident = bytes([
        0x7F, 0x45, 0x4C, 0x46,  # 0x7F 'E' 'L' 'F'
        2,  # EI_CLASS: ELFCLASS64
        1,  # EI_DATA: ELFDATA2LSB
        1,  # EI_VERSION
        0,  # EI_OSABI
    ])
    # Pad e_ident to 16 bytes
    e_ident = e_ident + bytes(16 - len(e_ident))

    # Minimal ELF header remainder (zeros for simplicity)
    header_rest = bytes(64 - len(e_ident))

    payload = e_ident + header_rest

    # Pad to requested size
    if len(payload) < size:
        payload += bytes(size - len(payload))

    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(payload)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("../sample_firmwares/empty.elf")
    out = out.resolve()
    generate(out)
    print(f"Wrote minimal ELF-like file to: {out}")


if __name__ == "__main__":
    main()
