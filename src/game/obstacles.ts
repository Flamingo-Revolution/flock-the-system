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
    // Slogans strictly requested by user
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
  ],

  njerez: [
    // The 2 Antagonists of the Revolution
    {
      emri: "Edi Rama",
      roli: "Kryeministër i Fasadës",
      thirrje: "S'KA PROTESTË, KA ERTV!",
      eVerteta: "Rama n'burg!",
      pike: 50,
      antagonist: "edi",
    },
    {
      emri: "Sali Berisha",
      roli: "Lider i Ballkonit",
      thirrje: "FOLTORE PA LIMIT!",
      eVerteta: "Berisha n'burg!",
      pike: 50,
      antagonist: "sali",
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
      emri: "Patronazhisti i Lagjes",
      roli: "Spiun Dixhital",
      thirrje: "E DI KU PUNON TI!",
      eVerteta: "i iku lidhja e internetit",
      pike: 38,
    },
    {
      emri: "Deputeti me Kafe",
      roli: "Komentator nga Lokali",
      thirrje: "PROTESTONI SA TË DONI!",
      eVerteta: "kafja e tij bën 500 lekë",
      pike: 35,
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
      emri: "Kryetari i Komisionit",
      roli: "Arkivues Plehrash",
      thirrje: "S'KA KËRKESA ZYRTARE!",
      eVerteta: "i hodhi peticionet në kosh",
      pike: 34,
    },
    {
      emri: "Këshilltari me Kostum",
      roli: "Mbrojtës i Fasadës",
      thirrje: "S'DINË PSE PROTESTOJNË!",
      eVerteta: "s'e kupton as vetë ligjin",
      pike: 32,
    },
    {
      emri: "Deputeti i Sallës Bosh",
      roli: "Orator Vetmitar",
      thirrje: "PO FLAS ME POPULLIN!",
      eVerteta: "në sallë vetëm roja",
      pike: 30,
    },
    {
      emri: "Zoti Shirit",
      roli: "Prerës Ceremonial",
      thirrje: "E HAPËM OBJEKTIN!",
      eVerteta: "nuk ka drita as ujë",
      pike: 28,
    },
    {
      emri: "Zonja Selfie",
      roli: "Drejtoreshë Instagrami",
      thirrje: "DOLI BUKUR FOTOJA!",
      eVerteta: "rruga u shemb të nesërmen",
      pike: 29,
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
    { emri: "Ministria e Inceneratorëve pa Tym" },
    { emri: "Ministria e Drejtorëve 5D" },
    { emri: "Ministria e Kullave mbi Park" },
    { emri: "Ministria e Sterilizimit të Florinjtë" },
    { emri: "Ministria e Koncesioneve 99-Vjeçare" },
    { emri: "Ministria e Gazit Lotsjellës" },
    { emri: "Ministria e Portit me Jahte" },
    { emri: "Ministria e Asfaltit Elektoral" },
    { emri: "Ministria e Peticioneve në Kosh" },
    { emri: "Ministria e Transparencës me Fjalëkalim" },
  ],

  pengesaToke: [
    { lloj: "ministri", emri: "Ministria e Inceneratorëve pa Tym", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Drejtorëve 5D", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Kullave mbi Park", texture: "ministri" },
    { lloj: "letra", emri: "Dosja e Incineratorëve", texture: "leter-1" },
    { lloj: "letra", emri: "Dosja 5D me tendera fiktivë", texture: "leter-2" },
    { lloj: "letra", emri: "Fatura e darkës në New York", texture: "leter-3" },
    { lloj: "podium", emri: "Podiumi i fjalimeve boshe", texture: "podium" },
    { lloj: "podium", emri: "Foltore me megafon", texture: "podium" },
  ],

  rreziqeAjri: [
    { lloj: "dron", emri: "Droni i vëzhgimit të protestës", texture: "dron" },
    { lloj: "mikrofon", emri: "Mikrofoni me pyetje të miratuara", texture: "mikrofon" },
    { lloj: "kamera", emri: "Kamera e ERTV me filtër bukurie", texture: "kamera" },
    { lloj: "dron", emri: "Droni me tender 500 mijë euro", texture: "dron" },
    { lloj: "kamera", emri: "Kamera e kronikës së gatshme", texture: "kamera" },
  ],

  dokumente: [
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
    {
      titull: "Koncesioni i Check-Up",
      eVerteta: "analiza fiktive me paratë e taksave",
      pike: 42,
    },
    {
      titull: "Baza e Patronazhistëve",
      eVerteta: "të dhënat tona në dorë të partisë",
      pike: 44,
    },
    {
      titull: "Fatura e Steak-ut në NY",
      eVerteta: "darkë luksoze me faturë shteti",
      pike: 45,
    },
    {
      titull: "Kulla 60-Katëshe te Sahati",
      eVerteta: "kulla private mbulon qytetin",
      pike: 42,
    },
    {
      titull: "Peticioni i Protestuesve",
      eVerteta: "u arkivua në kosh të plehrave",
      pike: 35,
    },
    {
      titull: "Raporti Sekret i Sheshit",
      eVerteta: "protesta po shtohet çdo minutë",
      pike: 40,
    },
  ],
};

// Aliases for backwards compatibility
export const pengesatQytetiISloganeve = sheshiIRevolucionitPool;
export const pengesatLagjjaEEkraneve = sheshiIRevolucionitPool;
