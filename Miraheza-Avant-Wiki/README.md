# Miraheza Avant Wiki Dump

This folder stores the raw Avantpedia/Miraheze export and extracted wiki text used as source material for AG-GS Avant Wiki lore porting.

## Contents

- `avantpediawiki.xml`: raw MediaWiki XML export.
- `2022AGMap.png`: 2022 map reference for modern-era lore placement.
- `2003AGMap.png`: 2003 map reference.
- `pages/`: extracted `.wiki` source pages from useful MediaWiki namespaces.

## Extraction

Generated with:

```powershell
python scripts\extract_miraheze_xml.py Miraheza-Avant-Wiki\avantpediawiki.xml Miraheza-Avant-Wiki\pages --clean
```

Extraction kept namespaces:

- `0` Main articles: 94
- `6` File pages: 110
- `10` Template pages: 272
- `12` Help pages: 0
- `14` Category pages: 4
- `828` Module pages: 205

Ignored namespaces are not needed for AG-GS lore porting.
