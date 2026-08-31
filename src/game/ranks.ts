export type ProtestRank = {
  rank: "S+" | "S" | "A" | "B" | "C" | "D";
  title: string;
  badge: string;
  description: string;
  color: string;
};

export function getProtestRank(score: number): ProtestRank {
  if (score >= 50000) {
    return {
      rank: "S+",
      title: "Kryekomandant Suprem",
      badge: "👑",
      description: "Çliroi të gjithë sheshin, zbuloi mbi 60 skandale dhe theu rekordin historik!",
      color: "#ffd23f",
    };
  }
  if (score >= 32000) {
    return {
      rank: "S",
      title: "Tmerri i Fasadës & SPAK",
      badge: "🌟",
      description: "Zbuloi mbi 40 skandale me seri të pathyeshme x5!",
      color: "#ff4f8b",
    };
  }
  if (score >= 18000) {
    return {
      rank: "A",
      title: "Zëri i Sheshit",
      badge: "🥇",
      description: "Shpartalloi ministritë dhe grisi propagandën me sukses të plotë!",
      color: "#00f5b4",
    };
  }
  if (score >= 9000) {
    return {
      rank: "B",
      title: "Revolucionar Aktiv",
      badge: "🥈",
      description: "Marshues i kalitur, kap deputetët dhe mbijeton natën me dronë e gaz lotësjellës.",
      color: "#38bdf8",
    };
  }
  if (score >= 4000) {
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
