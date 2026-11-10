# portfolio

Min personliga sajt på GitHub Pages: ett 3D-rum (Three.js) som är startsidan, där varje föremål är ett
projekt eller ett intresse, och ett cv i form av en logg. Ren HTML/CSS/ES-moduler, inget byggsteg.
Three.js laddas från jsDelivr (`three@0.170.0`) via en importmap i `index.html` (ändras importmapen måste
`sha256` i CSP-metataggen räknas om). Utan WebGL blir sidan ett vanligt dokument med guiden och cv:t.

Allt innehåll ligger i `data/`:

- `data/cv.json` – cv:t (visas i cv-lådan, `#cv`)
- `data/projects.json` – föremålen i rummet och listan i guiden

## Lägg till ett projekt

Lägg till ett objekt i listan i `data/projects.json`:

```json
{
  "id": "mitt-projekt",
  "title": "mitt projekt",
  "kind": "pcb",
  "category": "projekt",
  "slot": "desk-front",
  "summary": "Kort beskrivning.",
  "tech": ["C", "FPGA"],
  "url": "https://github.com/willevic2002/mitt-projekt",
  "year": 2026
}
```

- `id`: unikt, bara `a-z`, `0-9` och `-`.
- `category`: `projekt` eller `intresse`. Saknas den, eller är den okänd, blir det `projekt`.
- `kind`: vilket föremål som ritas: `mower`, `pcb`, `thermometer`, `devboard`, `phone`, `chip`, `book` eller `box`
  (reserv). Alias: `board` = `pcb`, `robot` = `mower`. Okänt eller saknat värde blir `box`.
- `slot` (valfri): fäst föremålet på en viss plats. Ankarna är `desk-left`, `desk-mid`, `desk-right`, `desk-front`,
  `sill`, `floor-rug`, `floor-corner`, `drawers-top` och `shelf-0` till `shelf-6`. Utan `slot` (eller om platsen är
  upptagen) väljs kindens förvalda plats, annars nästa lediga hylla.
- `url` är valfri och måste börja med `https://`. Utan `url` visas "ingen publik länk".
- `summary` kan vara `"TODO..."` (visas markerat tills du fyller i det). Alla `tech`-värden visas på kortet.
- Max 15 föremål placeras i rummet (en plats var). Fler hamnar ändå i guiden, och konsolen varnar en gång med
  `projects: N > 15`.

## Lägg till ett intresse

Samma format som ett projekt, med `"category": "intresse"`. Intressen listas under rubriken "intressen" i guiden
och får ett föremål i rummet (välj `kind`, eller `box`). Rubriken syns bara när det finns minst ett intresse.

## Länkar och navigation

`#p=<id>` öppnar ett projekt direkt, `#skrivbord` startar vid skrivbordet och `#cv` öppnar cv-lådan.

## Redigera cv:t

Ändra `data/cv.json`. Datum är `"YYYY"` eller `"YYYY-MM"`; `"end": null` betyder pågår (visas som `nu`).
Allt som börjar med `TODO` visas markerat så att du ser vad som saknas. Hitta aldrig på uppgifter.
Kontaktlänkar får vara `https://` eller `mailto:`. Telefonnummer publiceras inte.

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
