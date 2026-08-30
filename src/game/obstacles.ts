export type SloganObstacle = {
  slogan: string;
  eVerteta: string;
  pike: number;
};

export type PersonObstacle = {
  emri: string;
  roli: string;
  thirrje: string;
  eVerteta: string;
  pike: number;
};

export type MinistryObstacle = {
  emri: string;
};

export type GroundObstacle = {
  lloj: "ministri" | "letra" | "podium";
  emri: string;
  texture: "ministri" | "leter-1" | "leter-2" | "leter-3" | "podium";
};

export type AirHazard = {
  lloj: "dron" | "mikrofon" | "kamera";
  emri: string;
  texture: "dron" | "mikrofon" | "kamera";
};

export type DocumentCollectible = {
  titull: string;
  eVerteta: string;
  pike: number;
};

export type ObstaclePool = {
  slogane: SloganObstacle[];
  njerez: PersonObstacle[];
  ministri: MinistryObstacle[];
  pengesaToke: GroundObstacle[];
  rreziqeAjri: AirHazard[];
  dokumente: DocumentCollectible[];
};

/*
 * Shto pengesat/objektivat ketu.
 *
 * Mund te shtosh sa te duash:
 * - slogane qe lojtari i zbulon ne ajer
 * - njerez/personazhe qe lojtari i kap per pike
 * - ministri qe dalin si pengesa ne toke
 * - pengesaToke: ministri, letra, podiume
 * - rreziqeAjri: drone, mikrofona, kamera
 * - dokumente qe japin pike si koleksione
 *
 * Keshille: mbaji tekstet te shkurtra. Shenjat shfaqen ne telefon.
 */

export const pengesatQytetiISloganeve: ObstaclePool = {
  slogane: [
    { slogan: "REFORME E MADHE", eVerteta: "e njejta radhe", pike: 10 },
    { slogan: "PUNE 24/7", eVerteta: "sporteli mbyllur", pike: 12 },
    { slogan: "TRANSPARENCE", eVerteta: "PDF i skanuar", pike: 14 },
    { slogan: "PROGRES 100%", eVerteta: "gabim 404", pike: 16 },
    { slogan: "LEJE E SHPEJTE", eVerteta: "prit vitin 2031", pike: 18 },
    { slogan: "HAPJE MADHESHTORE", eVerteta: "vetem shiriti", pike: 20 },
    { slogan: "QYTET SMART", eVerteta: "wifi pa fjalekalim", pike: 14 },
    { slogan: "ZERO BUROKRACI", eVerteta: "formulari 17B", pike: 17 },
    { slogan: "KONSULTIM PUBLIK", eVerteta: "u be ne heshtje", pike: 19 },
    { slogan: "INVESTIM HISTORIK", eVerteta: "boje fasade", pike: 20 },
    { slogan: "RRUGE E RE", eVerteta: "gropa me emer", pike: 15 },
    { slogan: "PLAN I QARTE", eVerteta: "slide bosh", pike: 18 },
    { slogan: "NDRYSHIM REAL", eVerteta: "logo e re", pike: 16 },
    { slogan: "PORTAL MODERN", eVerteta: "nuk hapet", pike: 21 },
    { slogan: "AFER QYTETARIT", eVerteta: "dera mbyllur", pike: 14 },
    { slogan: "MERITOKRACI", eVerteta: "kusheriri fiton", pike: 24 },
    { slogan: "LLOGARIDHENIE", eVerteta: "mungon fatura", pike: 22 },
    { slogan: "AFAT REKORD", eVerteta: "ora pa bateri", pike: 17 },
    { slogan: "SHERBIM VIP", eVerteta: "radhes i thone luks", pike: 19 },
    { slogan: "FITORJA JUAJ", eVerteta: "fatura juaj", pike: 20 },
    { slogan: "PROGRAM I RI", eVerteta: "copy paste", pike: 18 },
    { slogan: "NUK KA KOSTO", eVerteta: "ka tre tarifa", pike: 21 },
    { slogan: "KRYER ME SUKSES", eVerteta: "u shty prape", pike: 16 },
    { slogan: "DIALOG I HAPUR", eVerteta: "mikrofoni fikur", pike: 18 },
    { slogan: "SHTETI DIGJITAL", eVerteta: "printeri s'punon", pike: 23 },
  ],
  njerez: [
    {
      emri: "Zoti Shirit",
      roli: "Preres Ceremonial",
      thirrje: "E HAPEM!",
      eVerteta: "nuk punon ende",
      pike: 30,
    },
    {
      emri: "Zonja Selfie",
      roli: "Drejtore Fasade",
      thirrje: "DOLI BUKUR!",
      eVerteta: "projekti jo",
      pike: 28,
    },
    {
      emri: "Deputeti Po-Po",
      roli: "Ngrites Dore",
      thirrje: "PLOTESISHT DAKORD",
      eVerteta: "s'e lexoi",
      pike: 26,
    },
    {
      emri: "Keshilltari Urime",
      roli: "Ekspert i Duartrokitjes",
      thirrje: "URIME POPULL!",
      eVerteta: "asgje s'ndryshoi",
      pike: 25,
    },
    {
      emri: "Doktor PowerPoint",
      roli: "Strateg Vizual",
      thirrje: "SHIHNI GRAFIKUN",
      eVerteta: "boshti mungon",
      pike: 29,
    },
    {
      emri: "Zoti Tender",
      roli: "Mik i Procedurave",
      thirrje: "GJITHCKA E RREGULLT",
      eVerteta: "fituesi dihej",
      pike: 34,
    },
    {
      emri: "Zonja Afat",
      roli: "Shtyrese Profesionale",
      thirrje: "JAVEN TJETER",
      eVerteta: "prej tre vitesh",
      pike: 28,
    },
    {
      emri: "Inspektor Foto",
      roli: "Verifikues Instagrami",
      thirrje: "E KONTROLLUAM",
      eVerteta: "nga makina",
      pike: 27,
    },
    {
      emri: "Analisti Gjithmone",
      roli: "Komentator Emergjence",
      thirrje: "KAM BURIME",
      eVerteta: "nga grupi i chatit",
      pike: 31,
    },
    {
      emri: "Zonja Statistike",
      roli: "Magjistare Numrash",
      thirrje: "RRITJE REKORD",
      eVerteta: "me krahasim gabim",
      pike: 32,
    },
    {
      emri: "Zoti Protokoll",
      roli: "Roje e Dosjes",
      thirrje: "NUK ESHTE FORMATI",
      eVerteta: "as vete s'e di",
      pike: 26,
    },
    {
      emri: "Drejtor Lapsi",
      roli: "Firmetar Rezerv",
      thirrje: "PO E FIRMOS",
      eVerteta: "me laps",
      pike: 25,
    },
  ],
  ministri: [
    { emri: "Ministria e Premtimeve te Pafundme" },
    { emri: "Ministria e Reformave te Vonuara" },
    { emri: "Ministria e Buzeqeshjeve Publike" },
    { emri: "Ministria e Shiriteve te Kuq" },
    { emri: "Ministria e Formulareve pa Fund" },
    { emri: "Ministria e Projektit Pilot te Perjetshem" },
    { emri: "Ministria e Radheve te Organizuara Keq" },
    { emri: "Ministria e Fotove Para Puneve" },
    { emri: "Ministria e Parkimeve Imagjinare" },
    { emri: "Ministria e Asfaltit Sezonal" },
    { emri: "Ministria e Sportelit te Mbyllur" },
    { emri: "Ministria e Kerkesave te Humbura" },
    { emri: "Ministria e Njoftimeve pa Date" },
    { emri: "Ministria e Strategjise se Neserme" },
    { emri: "Ministria e Transparences me Fjalekalim" },
  ],
  pengesaToke: [
    { lloj: "ministri", emri: "Ministria e Premtimeve te Pafundme", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Shiriteve te Kuq", texture: "ministri" },
    { lloj: "letra", emri: "Dosja qe do vetem nje firme tjeter", texture: "leter-1" },
    { lloj: "letra", emri: "Formulari 17B me tre shtojca", texture: "leter-2" },
    { lloj: "letra", emri: "Procesverbali qe humbi ne printer", texture: "leter-3" },
    { lloj: "podium", emri: "Podiumi i fjaleve te medha", texture: "podium" },
    { lloj: "podium", emri: "Konferenca per punen qe s'ka nisur", texture: "podium" },
  ],
  rreziqeAjri: [
    { lloj: "dron", emri: "Droni i ceremonive", texture: "dron" },
    { lloj: "mikrofon", emri: "Mikrofoni pa pergjigje", texture: "mikrofon" },
    { lloj: "kamera", emri: "Kamera qe zgjedh kendin", texture: "kamera" },
    { lloj: "dron", emri: "Droni me bateri tenderi", texture: "dron" },
    { lloj: "kamera", emri: "Kamera e fasades", texture: "kamera" },
  ],
  dokumente: [
    { titull: "Fatura e harruar", eVerteta: "nuk ishte falas", pike: 24 },
    { titull: "Aneksi sekret", eVerteta: "ishte publik vetem per miq", pike: 26 },
    { titull: "Lista e fituesve", eVerteta: "u shkrua para konkursit", pike: 28 },
    { titull: "Raporti final", eVerteta: "copy paste me logo te re", pike: 25 },
  ],
};

export const pengesatLagjjaEEkraneve: ObstaclePool = {
  slogane: [
    { slogan: "LAJM I FUNDIT", eVerteta: "video e vjeter", pike: 14 },
    { slogan: "SONDAZH I RI", eVerteta: "kampion: 7 veta", pike: 16 },
    { slogan: "FAKT I PASTER", eVerteta: "sponsor anonim", pike: 18 },
    { slogan: "EKRAN I DREJTE", eVerteta: "mikrofoni fikur", pike: 20 },
    { slogan: "SINJAL I QARTE", eVerteta: "zhurme totale", pike: 22 },
    { slogan: "BURIME ZYRTARE", eVerteta: "nje status", pike: 17 },
    { slogan: "DEBAT I LIRE", eVerteta: "pyetjet u zgjodhen", pike: 21 },
    { slogan: "OPINION I PAVARUR", eVerteta: "reklame e maskuar", pike: 24 },
    { slogan: "EKSKLUZIVE", eVerteta: "e kishte te gjithe", pike: 16 },
    { slogan: "LIVE NGA VENDI", eVerteta: "nga studio", pike: 18 },
    { slogan: "ANALIZE E THELLE", eVerteta: "tre fjali", pike: 15 },
    { slogan: "PANEL BALANCUAR", eVerteta: "kater miq", pike: 19 },
    { slogan: "KAMERA FLET", eVerteta: "montazhi bertet", pike: 22 },
    { slogan: "FAKTE NE EKRAN", eVerteta: "font i madh", pike: 18 },
    { slogan: "POPULLI E DO", eVerteta: "komentet u mbyllen", pike: 23 },
    { slogan: "ZGJIDHJE TANI", eVerteta: "pas reklames", pike: 20 },
    { slogan: "NJE BURIM THA", eVerteta: "burimi: kushuriri", pike: 21 },
    { slogan: "INTERVISTE E FORTE", eVerteta: "pa pyetje", pike: 24 },
    { slogan: "NUMRA TE MEDHENJ", eVerteta: "pa perqindje", pike: 17 },
    { slogan: "E VERTETA JONE", eVerteta: "versioni 6", pike: 19 },
    { slogan: "TRANSMETIM I PLOTE", eVerteta: "u pre fundi", pike: 20 },
    { slogan: "NEUTRALITET", eVerteta: "me muzike heroike", pike: 22 },
    { slogan: "EKRAN KOMBETAR", eVerteta: "telekomande private", pike: 23 },
    { slogan: "PA KOMENT", eVerteta: "me titull gjigant", pike: 18 },
  ],
  njerez: [
    {
      emri: "Moderatori Blic",
      roli: "Drejtues Paneli",
      thirrje: "KOHA MBAROI",
      eVerteta: "pyetja sapo nisi",
      pike: 30,
    },
    {
      emri: "Analisti i Perhershem",
      roli: "I Ftuar Cdo Nate",
      thirrje: "E PARASHIKOVA",
      eVerteta: "pas ngjarjes",
      pike: 32,
    },
    {
      emri: "Zonja Titull",
      roli: "Shkruese Alarmesh",
      thirrje: "TRONDITET VENDI",
      eVerteta: "u hap nje dosje",
      pike: 29,
    },
    {
      emri: "Kameramani Heroik",
      roli: "Gjetes Kendi",
      thirrje: "DUKET PLOT",
      eVerteta: "kornize e ngushte",
      pike: 27,
    },
    {
      emri: "Zoti Sufler",
      roli: "Lexues Mesazhesh",
      thirrje: "KAM NJE PYETJE",
      eVerteta: "ia sollen gati",
      pike: 30,
    },
    {
      emri: "Zonja Breaking",
      roli: "Alarm Kombetar",
      thirrje: "URGJENTE!",
      eVerteta: "njoftim rutine",
      pike: 28,
    },
    {
      emri: "Eksperti Grafik",
      roli: "Rritje me Ngjyra",
      thirrje: "VIJA SHKON LART",
      eVerteta: "grafiku eshte kthyer",
      pike: 33,
    },
    {
      emri: "Gazetari Copy",
      roli: "Specialist Paste",
      thirrje: "BURIMET TONA",
      eVerteta: "email zyrtar",
      pike: 26,
    },
    {
      emri: "Zoti Mikrofon",
      roli: "Mbajtes Zhurme",
      thirrje: "POPULLI FLET",
      eVerteta: "vetem ai flet",
      pike: 27,
    },
    {
      emri: "Zonja Audienca",
      roli: "Matese Duartrokitjesh",
      thirrje: "SALLA SHPERTHEN",
      eVerteta: "ishin 12 veta",
      pike: 31,
    },
    {
      emri: "Regjisori Dram",
      roli: "Mjeshter Muzike",
      thirrje: "MOMENT HISTORIK",
      eVerteta: "efekt zanor",
      pike: 28,
    },
    {
      emri: "Zoti Ekskluziv",
      roli: "Mbledhes Thashethemesh",
      thirrje: "VETEM KETU",
      eVerteta: "ne tre kanale",
      pike: 29,
    },
  ],
  ministri: [
    { emri: "Ministria e Ekraneve te Medha" },
    { emri: "Ministria e Burimeve Anonime" },
    { emri: "Ministria e Pyetjeve te Miratuara" },
    { emri: "Ministria e Sondazheve me Shtate Veta" },
    { emri: "Ministria e Mikrofonave te Fikur" },
    { emri: "Ministria e Titujve qe Bertasin" },
    { emri: "Ministria e Kamerave me Kend te Mire" },
    { emri: "Ministria e Opinionit te Sponsorizuar" },
    { emri: "Ministria e Paneleve te Njeanshme" },
    { emri: "Ministria e Grafikeve pa Bosht" },
    { emri: "Ministria e Lajmit te Ricikluar" },
    { emri: "Ministria e Reklamave me Flamur" },
    { emri: "Ministria e Heshtjes me Zhurme" },
    { emri: "Ministria e Transmetimit te Prere" },
    { emri: "Ministria e Klikimeve Patriotike" },
  ],
  pengesaToke: [
    { lloj: "ministri", emri: "Ministria e Ekraneve te Medha", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Titujve qe Bertasin", texture: "ministri" },
    { lloj: "letra", emri: "Sondazhi me kampion familjar", texture: "leter-1" },
    { lloj: "letra", emri: "Transkripti me pyetje te prera", texture: "leter-2" },
    { lloj: "letra", emri: "Njoftimi i korrigjuar kater here", texture: "leter-3" },
    { lloj: "podium", emri: "Podiumi i panelit neutral", texture: "podium" },
    { lloj: "podium", emri: "Fjalimi pas reklames", texture: "podium" },
  ],
  rreziqeAjri: [
    { lloj: "dron", emri: "Droni LIVE nga studio", texture: "dron" },
    { lloj: "mikrofon", emri: "Mikrofoni qe nderpret", texture: "mikrofon" },
    { lloj: "kamera", emri: "Kamera e zoom-it dramatik", texture: "kamera" },
    { lloj: "mikrofon", emri: "Mikrofoni i pyetjes se miratuar", texture: "mikrofon" },
    { lloj: "kamera", emri: "Kamera e titullit gjigant", texture: "kamera" },
  ],
  dokumente: [
    { titull: "Burimi anonim", eVerteta: "ishte nje screenshot", pike: 24 },
    { titull: "Kontrata e reklamave", eVerteta: "opinion me sponsor", pike: 27 },
    { titull: "Grafiku pa bosht", eVerteta: "vija shkonte ku donte", pike: 25 },
    { titull: "Script-i i panelit", eVerteta: "debat me radhe fjalesh", pike: 29 },
  ],
};
