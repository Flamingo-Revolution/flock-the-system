# Rregullat e Lojes

## Mekanika Kryesore

Loja eshte mobile-first dhe luhet me prekje, ne stilin T-Rex Runner.

- Prek ekranin per ta bere flamingon te kerceje.
- Prekja ruhet per pak caste para uljes, qe kercimi te ndihet i drejte ne telefon.
- Skena leviz automatikisht nga e djathta ne te majte.
- Flamingoja vrapon ne toke dhe ka vetem nje kercim ne ajer.
- Nese nuk prek ekranin, flamingoja vazhdon te vrapoje ne toke.
- Perplasja me pengesa toke ose rreziqe ajri e mbyll raundin.
- Pas perplasjes, raundi mund te riniset me prekje ose me butonin `Rinis`.

## Objektivi

Lojtari duhet te vrapoje, te kerceje mbi pengesa dhe te mbledhe objektivat satirike.

- Shenjat kane nje slogan publik dhe nje te vertete te fshehur.
- Njerezit jane karikatura fiktive qe japin pike kur kapen.
- Dokumentet zbulojne prova/parodi dhe japin pike.
- Kur flamingoja prek nje objektiv, teksti zbulohet dhe lojtari merr pike.
- Sa me shume objektiva te merren radhazi, aq me e larte behet seria.
- Nese nje objektiv kalon pa u marre, seria kthehet ne `x1`.
- Faza kalohet kur arrihet numri i kerkuar i zbulimeve.
- Gjate vrapimit, pengesat qendrojne vizualisht te pastra; batutat shfaqen ne zbulime dhe ne perplasje.

## Llojet e Pengesave

Pengesat ndahen qarte sipas pozicionit dhe sjelljes.

- `pengesaToke`: ministri, letra, podiume.
- `rreziqeAjri`: drone, mikrofona, kamera.
- `slogane`: shenja/parulla qe mblidhen ne ajer.
- `njerez`: karikatura/personazhe fiktive qe mblidhen per pike.
- `dokumente`: dosje, fatura, raporte dhe prova satirike.

Te gjitha listat redaktohen te `src/game/obstacles.ts`. Mund te shtosh sa te duash elemente; loja i merr me radhe dhe pastaj i perserit.

Rreziqet e ajrit hapen me vone ne raund, pasi ritmi baze i kercimeve eshte vendosur.

## Asetet

Asetet reale te lojes ruhen ne `public/assets/`.

- `public/assets/background/`: silueta e Tiranes dhe sfondet.
- `public/assets/characters/`: flamingoja dhe animimet baze.
- `public/assets/obstacles/`: pengesat kryesore.
- `public/assets/ground/`: ministri, letra, podiume, toka.
- `public/assets/hazards/`: drone, mikrofona, kamera.
- `public/assets/collectibles/`: shenja, dokumente, njerez.

Keto SVG/PNG mund te zevendesohen me art final pa ndryshuar logjiken e lojes, per sa kohe ruhen emrat ose perditesohet `createGame.ts`.

## Kontrollet

- Mobile: prekje ne ekran per kercim.
- Tastiere: `Space` ose `Enter` per kercim.
- `P`: pauze / vazhdo.
- `R`: rinis fazen.

## Gjuha dhe Emertimet

Te gjitha tekstet e dukshme ne loje duhet te jene ne shqip.

- Emrat e fazave ne shqip.
- Mesazhet e statusit ne shqip.
- Sloganet dhe zbulimet ne shqip.
- Butonat dhe statistikat ne shqip.
- Ministrite, personazhet, dokumentet dhe rreziqet ne shqip.

Kodi mund te perdore emra teknike ne anglisht kur kjo e ben mirembajtjen me te qarte, por pervoja e lojtarit duhet te jete shqip.

## Kufijte e Permbajtjes

Loja eshte satire politike dhe institucionale.

- Perdor emra fiktive, role te pergjithshme dhe slogane parodike.
- Mos perdor emra reale personash pa nje vendim te qarte editorial.
- Satira duhet te godase propaganden, mashtrimin publik dhe absurditetin institucional.
- Toni duhet te mbetet arcade, i shpejte dhe i lexueshem ne telefon.
