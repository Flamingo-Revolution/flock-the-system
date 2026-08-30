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
    // MPs making fun of protesters & caricatures
    {
      emri: "Deputeti me Kafe",
      roli: "Komentator nga Lokali",
      thirrje: "PROTESTONI SA TË DONI!",
      eVerteta: "kafja kushton 500 lekë",
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
      eVerteta: "salla është krejt bosh",
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
      emri: "Deputeti Po-Po",
      roli: "Ngritës Automatik Dore",
      thirrje: "PLOTËSISHT DAKORD!",
      eVerteta: "s'e lexoi as titullin",
      pike: 27,
    },
    {
      emri: "Zoti Tender",
      roli: "Mik i Procedurave",
      thirrje: "GARË E NDERSHME!",
      eVerteta: "fituesi u shpall para garës",
      pike: 36,
    },
    {
      emri: "Analisti Gjithmonë",
      roli: "Komentator me Porosi",
      thirrje: "KAM BURIME SEKRETE!",
      eVerteta: "nga grupi i WhatsApp-it",
      pike: 31,
    },
  ],

  ministri: [
    { emri: "Ministria e Premtimeve të Pafundme" },
    { emri: "Ministria e Kullave mbi Park" },
    { emri: "Ministria e Shiriteve të Kuq" },
    { emri: "Ministria e Formularëve pa Fund" },
    { emri: "Ministria e Koncesioneve 35-Vjeçare" },
    { emri: "Ministria e Gazit Lotsjellës" },
    { emri: "Ministria e Asfaltit Elektoral" },
    { emri: "Ministria e Sportelit të Mbyllur" },
    { emri: "Ministria e Peticioneve të Humbura" },
    { emri: "Ministria e Transparencës me Fjalëkalim" },
  ],

  pengesaToke: [
    { lloj: "ministri", emri: "Ministria e Premtimeve të Pafundme", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Kullave mbi Park", texture: "ministri" },
    { lloj: "ministri", emri: "Ministria e Shiriteve të Kuq", texture: "ministri" },
    { lloj: "letra", emri: "Peticioni i qytetarëve në kosh", texture: "leter-1" },
    { lloj: "letra", emri: "Formulari 17B me katër vula", texture: "leter-2" },
    { lloj: "letra", emri: "Dosja e tenderit sekret", texture: "leter-3" },
    { lloj: "podium", emri: "Podiumi i fjalimeve boshe", texture: "podium" },
    { lloj: "podium", emri: "Konferenca e arsyetimeve", texture: "podium" },
  ],

  rreziqeAjri: [
    { lloj: "dron", emri: "Droni i vëzhgimit të protestës", texture: "dron" },
    { lloj: "mikrofon", emri: "Mikrofoni me pyetje të miratuara", texture: "mikrofon" },
    { lloj: "kamera", emri: "Kamera me regji qendrore", texture: "kamera" },
    { lloj: "dron", emri: "Droni me tender 500 mijë euro", texture: "dron" },
    { lloj: "kamera", emri: "Kamera e kronikës së gatshme", texture: "kamera" },
  ],

  dokumente: [
    { titull: "Koncesioni 35-vjeçar", eVerteta: "fituesi u shpall dje", pike: 28 },
    { titull: "Fatura e asfaltit elektoral", eVerteta: "tre herë më shtrenjtë", pike: 26 },
    { titull: "Peticioni i protestës", eVerteta: "u arkivua në kosh", pike: 30 },
    { titull: "Raporti sekret i sheshit", eVerteta: "protesta po shtohet", pike: 32 },
  ],
};

// Aliases for backwards compatibility
export const pengesatQytetiISloganeve = sheshiIRevolucionitPool;
export const pengesatLagjjaEEkraneve = sheshiIRevolucionitPool;
