# Rregullat e Lojës

## Mekanika Kryesore

Loja është mobile-first dhe luhet me prekje.

- Prek ekranin për ta ngritur flamingon.
- Skena lëviz automatikisht nga e djathta në të majtë.
- Flamingoja nuk ecën majtas-djathtas; lojtari kontrollon vetëm ngritjen.
- Nëse nuk prek ekranin, graviteti e ul flamingon poshtë.
- Përplasja me shtyllat e propagandës ose tokën heq një jetë.
- Kur mbarojnë jetët, raundi ndalet dhe mund të riniset me prekje ose me butonin `Rinis`.

## Objektivi

Lojtari duhet të kalojë mes pengesave dhe të mbledhë shenjat e zbulimit.

- Çdo shenjë ka një slogan publik dhe një të vërtetë të fshehur.
- Kur flamingoja prek shenjën, slogani zbulohet dhe lojtari merr pikë.
- Sa më shumë shenja të merren radhazi, aq më e lartë bëhet seria.
- Nëse një shenjë kalon pa u marrë, seria kthehet në `x1`.
- Faza kalohet kur arrihet numri i kërkuar i zbulimeve.

## Kontrollet

- Mobile: prekje në ekran.
- Tastierë: `Space` ose `Enter` për fluturim.
- `P`: pauzë / vazhdo.
- `R`: rinis fazën.

## Gjuha dhe Emërtimet

Të gjitha tekstet e dukshme në lojë duhet të jenë në shqip.

- Emrat e fazave në shqip.
- Mesazhet e statusit në shqip.
- Sloganet dhe zbulimet në shqip.
- Butonat dhe statistikat në shqip.

Kodi mund të përdorë emra teknikë në anglisht kur kjo e bën mirëmbajtjen më të qartë, por përvoja e lojtarit duhet të jetë shqip.

## Lista e Pengesave

Pengesat dhe objektivat shtohen te `src/game/obstacles.ts`.

- `slogane`: shenja që lojtari mbledh për të zbuluar të vërtetën.
- `njerez`: personazhe/persona që shfaqen si objektiva në ajër.
- `ministri`: ndërtesa ministrish që shfaqen si pengesa në tokë.

Mund të shtosh sa të duash elemente në secilën listë. Loja i merr me radhë dhe pastaj i përsërit.

## Kufijtë e Përmbajtjes

Loja është satirë politike dhe institucionale.

- Përdor emra fiktivë, role të përgjithshme dhe slogane parodike.
- Mos përdor emra realë personash pa një vendim të qartë editorial.
- Satira duhet të godasë propagandën, mashtrimin publik dhe absurditetin institucional.
- Toni duhet të mbetet arcade, i shpejtë dhe i lexueshëm në telefon.
