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
  antagonist?: "edi" | "sali";
};

export type MinistryObstacle = {
  emri: string;
};

export type GroundObstacle = {
  lloj: "ministri" | "letra" | "podium";
  emri: string;
  texture: "ministri" | "leter-1" | "leter-2" | "leter-3" | "podium" | "edi-character" | "sali-character";
  antagonist?: "edi" | "sali";
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

// Unified Master Satirical Pool: Government Propaganda + Arrogant MPs + Protest Slogans
export const sheshiIRevolucionitPool: ObstaclePool = {
  slogane: [
    // Slogans strictly requested by user + latest satirical themes
    {
      slogan: "RNBNB",
      eVerteta: "Rama n'burg, Berisha n'burg!",
      pike: 30,
    },
    {
      slogan: "RAMA KU? BURG!",
      eVerteta: "Berisha ku? Burg! Të gjithë ku? Burg!",
      pike: 35,
    },
    {
      slogan: "BERISHA KU? BURG!",
      eVerteta: "Të gjithë ku? Burg!",
      pike: 35,
    },
    {
      slogan: "TË GJITHË KU? BURG!",
      eVerteta: "Rama n'burg, Berisha n'burg!",
      pike: 35,
    },
    {
      slogan: "ZEQINE, ZEQINE!",
      eVerteta: "3 milionë jemi ne, ti nuk di të numërosh, shko n'shkollë të mësosh!",
      pike: 40,
    },
    {
      slogan: "TI NUK DI TË NUMËROSH!",
      eVerteta: "Zeqine, shko n'shkollë të mësosh!",
      pike: 40,
    },
    {
      slogan: "3 MILIONË JEMI NE!",
      eVerteta: "Zeqine, nuk di të numërosh!",
      pike: 40,
    },
    {
      slogan: "IKBELA HAJDUTI!",
      eVerteta: "20 milionë euro për 1 kilometër asfalt!",
      pike: 46,
    },
    {
      slogan: "BLENDI GUSHA!",
      eVerteta: "Gonxhja me targa VIP dhe patenta me zarf!",
      pike: 42,
    },
    {
      slogan: "ÇOHUNI NGA KAFJA!",
      eVerteta: "Revolucioni nuk bëhet me makiato në lokal!",
      pike: 42,
    },
    {
      slogan: "POSHTË PATRONAZHISTËT!",
      eVerteta: "Të dhënat tona personale nuk shiten me tender!",
      pike: 45,
    },
    {
      slogan: "SUFLLAQE PËR VOTË!",
      eVerteta: "Sufllaqja e partisë me qepë e pa mish!",
      pike: 38,
    },
    {
      slogan: "BIDOOO HALEJA!",
      eVerteta: "Debat me ulërima në studio TV pa asnjë kuptim!",
      pike: 40,
    },
    {
      slogan: "TAO TAO RENDI!",
      eVerteta: "Siguria me patrullim imagjinar dhe kamera ERTV!",
      pike: 40,
    },
    {
      slogan: "PIKTORI PLAK!",
      eVerteta: "Fasada me çitjane dhe kulla mbi pronat publike!",
      pike: 45,
    },
  ],

  njerez: [
    // The Antagonists & Characters of the Parody
    {
      emri: "Piktori Plak (Edi Rama)",
      roli: "Kryearkitekt i Surrelit",
      thirrje: "ÇITJANE DHE FASADË ME BOJË!",
      eVerteta: "Rama n'burg! Pikturoi kullën mbi park.",
      pike: 55,
      antagonist: "edi",
    },
    {
      emri: "Ikbela Hajduti (Belinda Balluku)",
      roli: "Mbretëresha e Asfaltit Elektoral",
      thirrje: "TUNELI DHE 20 MILIONË EURO PËR KILOMETËR!",
      eVerteta: "asfalti më i shtrenjtë në Evropë që çahet me shi",
      pike: 52,
    },
    {
      emri: "Sali Berisha",
      roli: "Lider i Ballkonit",
      thirrje: "FOLTORE PA LIMIT DHE DITË E NATË!",
      eVerteta: "Berisha n'burg!",
      pike: 50,
      antagonist: "sali",
    },
    {
      emri: "Blendi Gusha (Gonxhja)",
      roli: "Monopolisti i Patentave & Targave VIP",
      thirrje: "TARGA ME POROSI DHE KARTON ME TEST!",
      eVerteta: "koncesionet e patentave dhe automjeteve pa fund",
      pike: 47,
    },
    {
      emri: "Tao Tao",
      roli: "Ministri i Sigurisë Imagjinare",
      thirrje: "GJITHÇKA NË KONTROLL NË SHEVRAN!",
      eVerteta: "patrullon me xhama të zinj dhe eskortë",
      pike: 46,
    },
    {
      emri: "Bidooo Haleja",
      roli: "Debatuesi pa Filtër",
      thirrje: "BIDOOO, Ç'PO THUA NË STUDIO?!",
      eVerteta: "u përplas me mikrofon në transmetim direkt",
      pike: 44,
    },
    {
      emri: "Shpërndarësi i Sufllaqeve",
      roli: "Financier Elektoral",
      thirrje: "MERRE NJË SUFLLAQE ME QEPË!",
      eVerteta: "këmbeu të ardhmen për një panine të ftohtë",
      pike: 38,
    },
    {
      emri: "Patronazhisti me Laptop",
      roli: "Spiun Dixhital i Lagjes",
      thirrje: "E DI ÇFARË KAFEJE KE PIRË MËNGJES!",
      eVerteta: "i doli lista e të dhënave në Telegram",
      pike: 42,
    },
    {
      emri: "Revolucionari i Kafes",
      roli: "Komentator Makiatoje",
      thirrje: "ÇOHUNI NGA KAFJA... NESËR!",
      eVerteta: "ka 4 orë ulur duke parë TikTok",
      pike: 35,
    },
    // Top Political Figures & Scandal Protagonists
    {
      emri: "Tigri i Arratisur",
      roli: "Ish-zv.Kryeministër",
      thirrje: "S'MË GJENI DOT NË ZVICËR!",
      eVerteta: "u arratis me dosjen e inceneratorëve",
      pike: 48,
    },
    {
      emri: "Drejtor 5D",
      roli: "Tenderues i Vetes",
      thirrje: "TENDERIN E FITOVA ME MERITË!",
      eVerteta: "ishte vetë pronari i kompanisë fituese",
      pike: 46,
    },
    {
      emri: "Ish-Ministri i Sterilizimit",
      roli: "Koncesionar Mjekësor",
      thirrje: "PROCEDURAT ISHIN PERFEKTE!",
      eVerteta: "gërshërët kushtuan sa një vilë",
      pike: 45,
    },
    {
      emri: "Deputeti me Syze Dielli",
      roli: "Ekspert i Komploteve",
      thirrje: "PAGUHEN NGA JASHTË!",
      eVerteta: "vetë ka vilë në Zvicër",
      pike: 38,
    },
    {
      emri: "Zëdhënësi i Regjimit",
      roli: "Numërues Turmash",
      thirrje: "ISHIN VETËM 12 VETA!",
      eVerteta: "sheshi ishte i mbushur plot",
      pike: 36,
    },
    {
      emri: "Deputetja e Çantës",
      roli: "Aristokrate Parlamenti",
      thirrje: "KUSH JANË KËTA ME ÇADRA?",
      eVerteta: "çanta bën 8 rroga minimale",
      pike: 37,
    },
    {
      emri: "Zoti Tender",
      roli: "Mik i Procedurave",
      thirrje: "GARË E NDERSHME!",
      eVerteta: "fituesi u shpall para garës",
      pike: 36,
    },
  ],

  ministri: [
    { emri: "Ministria e Ikbela Hajdutit dhe Asfaltit" },
    { emri: "Ministria e Blendi Gushës dhe Patentave" },
    { emri: "Ministria e Sufllaqeve Elektorale" },
    { emri: "Ministria e Tao Tao dhe Rendit" },
    { emri: "Ministria e Çohuni nga Kafja" },
    { emri: "Ministria e Pikturave në Surrel" },
    { emri: "Ministria e Inceneratorëve pa Tym" },
    { emri: "Ministria e Drejtorëve 5D" },
    { emri: "Ministria e Kullave mbi Park" },
    { emri: "Ministria e Sterilizimit të Florinjtë" },
    { emri: "Ministria e Portit me Jahte" },
  ],

  pengesaToke: [
    { lloj: "ministri", emri: "Ministria e Ikbela Hajdutit", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Sufllaqeve Elektorale", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Pikturave në Surrel", texture: "ministri" },
    { lloj: "letra", emri: "Fatura e Asfaltit të Ikbelës (20M€/km)", texture: "leter-1" },
    { lloj: "letra", emri: "Koncesioni i Patentave të Gonxhes", texture: "leter-2" },
    { lloj: "letra", emri: "Fatura e 100,000 Sufllaqeve", texture: "leter-3" },
    { lloj: "podium", emri: "Podiumi i Asfaltit të Ikbelës", texture: "podium" },
    { lloj: "podium", emri: "Foltore me megafon e Ballkonit", texture: "podium" },
  ],

  rreziqeAjri: [
    { lloj: "dron", emri: "Droni i vëzhgimit të Patronazhistëve", texture: "dron" },
    { lloj: "mikrofon", emri: "Mikrofoni pa filtër i Bidooo Halesë", texture: "mikrofon" },
    { lloj: "kamera", emri: "Kamera e ERTV me filtër bukurie", texture: "kamera" },
    { lloj: "dron", emri: "Droni me sufllaqe elektorale", texture: "dron" },
    { lloj: "kamera", emri: "Kamera e kronikës së gatshme", texture: "kamera" },
  ],

  dokumente: [
    {
      titull: "Dosja e Asfaltit të Ikbelës",
      eVerteta: "20 milionë euro për kilometër që çahet me shiun e parë",
      pike: 52,
    },
    {
      titull: "Koncesioni i Targave VIP (Gonxhja)",
      eVerteta: "targa të personalizuara me miliona lekë fitim privat",
      pike: 48,
    },
    {
      titull: "Fatura e 100,000 Sufllaqeve",
      eVerteta: "sufllaqe elektorale me faturë nga taksat tona",
      pike: 48,
    },
    {
      titull: "Baza e Patronazhistëve",
      eVerteta: "të dhënat tona personale në dorë të partisë",
      pike: 46,
    },
    {
      titull: "Transkripti: Bidooo Haleja",
      eVerteta: "debat pa asnjë fakt, vetëm të bërtitura në studio",
      pike: 44,
    },
    {
      titull: "Manuali: Çohuni nga Kafja",
      eVerteta: "thirrja për marshim që zgjoi sheshin",
      pike: 45,
    },
    {
      titull: "Plani i Tao Tao për Rendin",
      eVerteta: "premtime boshe para kamerave të gatshme",
      pike: 44,
    },
    {
      titull: "Tabloja e Piktori Plak",
      eVerteta: "kulla 50-katëshe e fshehur pas pikturës abstrakte",
      pike: 50,
    },
    {
      titull: "Dosja e Incineratorëve",
      eVerteta: "miliona euro për plehra imagjinare",
      pike: 50,
    },
    {
      titull: "Dosja 5D (Tenderat Vetes)",
      eVerteta: "drejtorët e bashkisë i dhanë tenderin vetes",
      pike: 48,
    },
    {
      titull: "Koncesioni i Sterilizimit",
      eVerteta: "gërshërët kirurgjikale me çmim floriri",
      pike: 46,
    },
    {
      titull: "Porti i Durrësit",
      eVerteta: "jahte e kulla në vend të portit publik",
      pike: 48,
    },
  ],
};

// Aliases for backwards compatibility
export const pengesatQytetiISloganeve = sheshiIRevolucionitPool;
export const pengesatLagjjaEEkraneve = sheshiIRevolucionitPool;
