# portfolio

Min personliga sajt på GitHub Pages: ett cv i form av en logg, och mitt skrivbord i 3D (Three.js)
där projekten står på en hylla. Ren HTML/CSS/ES-moduler, inget byggsteg. Three.js laddas från
jsDelivr (`three@0.170.0`) via en importmap i `index.html`.

Allt innehåll ligger i `data/`:

- `data/cv.json` – cv:t
- `data/projects.json` – projekten (hyllan och listan genereras härifrån)

## Lägg till ett projekt

Lägg till ett objekt i listan i `data/projects.json`:

```json
{
  "id": "mitt-projekt",
  "title": "mitt projekt",
  "kind": "board",
  "summary": "Kort beskrivning.",
  "tech": ["C", "FPGA"],
  "url": "https://github.com/willevic2002/mitt-projekt",
  "year": 2026
}
```

- `id`: unikt, bara `a-z`, `0-9` och `-`.
- `kind`: `chip`, `board`, `robot`, `book` eller `box`. Okänt eller saknat värde blir `box`.
- `url` är valfri och måste börja med `https://`. Utan `url` visas "ingen publik länk".
- `summary` kan vara `"TODO"` (visas markerat tills du fyller i det). Första `tech`-värdet visas som språk.
- Max 12 projekt hamnar på hyllan (två rader); alla visas i listan.

## Redigera cv:t

Ändra `data/cv.json`. Datum är `"YYYY"` eller `"YYYY-MM"`; `"end": null` betyder pågår (visas som `nu`).
Allt som börjar med `TODO` visas markerat så att du ser vad som saknas. Hitta aldrig på uppgifter.

## Kör lokalt

```sh
python3 -m http.server 8000
# öppna http://localhost:8000/
```

(Moduler och `fetch` fungerar inte via `file://`.)

## Publicera på GitHub Pages

1. Pusha repot till GitHub.
2. Settings → Pages → Build and deployment → Source: *Deploy from a branch*.
3. Välj branch `main` och mapp `/ (root)`, spara.
4. Sajten ligger på `https://willevic2002.github.io/<repo>/`. Alla sökvägar är relativa, så undersökvägen fungerar.

`.nojekyll` gör att Pages serverar filerna som de är.
