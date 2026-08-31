export type ProtestRank = {
  rank: "S+" | "S" | "A" | "B" | "C" | "D";
  title: string;
  badge: string;
  description: string;
  color: string;
};

export function getProtestRank(score: number): ProtestRank {
  if (score >= 28000) {
    return {
      rank: "S+",
      title: "Kryekomandant Suprem",
      badge: "👑",
      description: "Çliroi të gjithë sheshin, futi regjimin në burg dhe theu rekordin!",
      color: "#ffd23f",
    };
  }
  if (score >= 18000) {
    return {
      rank: "S",
      title: "Tmerri i Fasadës & SPAK",
      badge: "🌟",
      description: "Zbuloi mbi 35 skandale me seri të pathyeshme!",
      color: "#ff4f8b",
    };
  }
  if (score >= 10000) {
    return {
      rank: "A",
      title: "Zëri i Sheshit",
      badge: "🥇",
      description: "Shpartalloi ministritë dhe grisi propagandën me sukses të plotë!",
      color: "#00f5b4",
    };
  }
  if (score >= 5000) {
    return {
      rank: "B",
      title: "Revolucionar Aktiv",
      badge: "🥈",
      description: "Marshues i rregullt, kap deputetët dhe mbijeton natën me dronë.",
      color: "#38bdf8",
    };
  }
  if (score >= 2000) {
    return {
      rank: "C",
      title: "Pankartëmbajtës",
      badge: "🥉",
      description: "Fillestar me kurajë, por u përplas me faturat e shtrenjta.",
      color: "#a855f7",
    };
  }
  return {
    rank: "D",
    title: "Ngeli te Kafja",
    badge: "☕",
    description: "Piu 3 makiato te lokali dhe harroi të niste marshimin!",
    color: "#94a3b8",
  };
}

export function generateCertificateCode(score: number): string {
  const hash = Math.abs(Math.sin(score + 1042) * 100000) | 0;
  return `#FLOCK-${String(hash).padStart(5, "0")}`;
}
