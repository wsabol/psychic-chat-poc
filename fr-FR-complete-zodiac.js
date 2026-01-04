// Traductions complètes en français pour les 12 signes du zodiaque avec planètes, compatibilité et numéros de chance
export const completeZodiacTranslations = {
  aries: {
    planet: "Mars",
    rulingPlanet: "Mars",
    compatibility: {
      mostCompatible: ["Lion", "Sagittaire", "Gémeaux", "Verseau"],
      leastCompatible: ["Cancer", "Capricorne"],
      soulmate: "Lion"
    },
    luckyElements: {
      numbers: [1, 8, 17, 21, 31],
      colors: ["Rouge", "Orange", "Jaune Vif", "Écarlate"],
      days: ["Mardi", "Dimanche"],
      stones: ["Diamant", "Rubis", "Pierre de Sang", "Jaspe Rouge"],
      metals: ["Fer", "Acier"]
    }
  },
  taurus: {
    planet: "Vénus",
    rulingPlanet: "Vénus",
    compatibility: {
      mostCompatible: ["Vierge", "Capricorne", "Cancer", "Poissons"],
      leastCompatible: ["Lion", "Verseau"],
      soulmate: "Vierge"
    },
    luckyElements: {
      numbers: [2, 6, 9, 12, 24],
      colors: ["Vert", "Rose", "Tons Terre", "Bleu Pastel"],
      days: ["Vendredi", "Lundi"],
      stones: ["Émeraude", "Quartz Rose", "Saphir", "Agate Mouche"],
      metals: ["Cuivre", "Laiton"]
    }
  },
  gemini: {
    planet: "Mercure",
    rulingPlanet: "Mercure",
    compatibility: {
      mostCompatible: ["Balance", "Verseau", "Bélier", "Lion"],
      leastCompatible: ["Vierge", "Poissons"],
      soulmate: "Balance"
    },
    luckyElements: {
      numbers: [5, 7, 14, 16, 23],
      colors: ["Jaune", "Argent", "Bleu Clair", "Blanc"],
      days: ["Mercredi", "Samedi"],
      stones: ["Agate", "Citrine", "Alexandrite", "Perle"],
      metals: ["Mercure", "Argent"]
    }
  },
  cancer: {
    planet: "Lune",
    rulingPlanet: "Lune",
    compatibility: {
      mostCompatible: ["Scorpion", "Poissons", "Taureau", "Vierge"],
      leastCompatible: ["Bélier", "Balance"],
      soulmate: "Scorpion"
    },
    luckyElements: {
      numbers: [2, 7, 11, 16, 20],
      colors: ["Argent", "Blanc", "Vert Marin", "Bleu Pâle"],
      days: ["Lundi", "Jeudi"],
      stones: ["Pierre de Lune", "Perle", "Rubis", "Émeraude"],
      metals: ["Argent", "Platine"]
    }
  },
  leo: {
    planet: "Soleil",
    rulingPlanet: "Soleil",
    compatibility: {
      mostCompatible: ["Bélier", "Sagittaire", "Gémeaux", "Balance"],
      leastCompatible: ["Taureau", "Scorpion"],
      soulmate: "Bélier"
    },
    luckyElements: {
      numbers: [1, 3, 10, 19, 28],
      colors: ["Or", "Orange", "Jaune", "Rouge"],
      days: ["Dimanche", "Mardi"],
      stones: ["Rubis", "Péridot", "Sardoine", "Diamant"],
      metals: ["Or", "Laiton"]
    }
  },
  virgo: {
    planet: "Mercure",
    rulingPlanet: "Mercure",
    compatibility: {
      mostCompatible: ["Taureau", "Capricorne", "Cancer", "Scorpion"],
      leastCompatible: ["Gémeaux", "Sagittaire"],
      soulmate: "Taureau"
    },
    luckyElements: {
      numbers: [6, 15, 20, 27, 34],
      colors: ["Bleu Marine", "Gris", "Marron", "Vert"],
      days: ["Mercredi", "Samedi"],
      stones: ["Saphir", "Cornaline", "Jade", "Jaspe"],
      metals: ["Mercure", "Nickel"]
    }
  },
  libra: {
    planet: "Vénus",
    rulingPlanet: "Vénus",
    compatibility: {
      mostCompatible: ["Gémeaux", "Verseau", "Lion", "Sagittaire"],
      leastCompatible: ["Cancer", "Capricorne"],
      soulmate: "Gémeaux"
    },
    luckyElements: {
      numbers: [6, 15, 24, 33, 42],
      colors: ["Rose", "Bleu", "Couleurs Pastel", "Blanc"],
      days: ["Vendredi", "Dimanche"],
      stones: ["Opale", "Lapis-lazuli", "Jade", "Corail"],
      metals: ["Cuivre", "Bronze"]
    }
  },
  scorpio: {
    planet: "Pluton",
    rulingPlanet: "Mars/Pluton",
    compatibility: {
      mostCompatible: ["Cancer", "Poissons", "Vierge", "Capricorne"],
      leastCompatible: ["Lion", "Verseau"],
      soulmate: "Cancer"
    },
    luckyElements: {
      numbers: [8, 13, 18, 27, 36],
      colors: ["Rouge Profond", "Noir", "Marron Foncé", "Pourpre Foncé"],
      days: ["Mardi", "Jeudi"],
      stones: ["Topaze", "Obsidienne", "Grenat", "Rubis"],
      metals: ["Fer", "Acier"]
    }
  },
  sagittarius: {
    planet: "Jupiter",
    rulingPlanet: "Jupiter",
    compatibility: {
      mostCompatible: ["Bélier", "Lion", "Balance", "Verseau"],
      leastCompatible: ["Vierge", "Poissons"],
      soulmate: "Lion"
    },
    luckyElements: {
      numbers: [3, 9, 21, 30, 39],
      colors: ["Pourpre", "Turquoise", "Orange", "Jaune"],
      days: ["Jeudi", "Dimanche"],
      stones: ["Turquoise", "Améthyste", "Topaze", "Saphir"],
      metals: ["Étain", "Bronze"]
    }
  },
  capricorn: {
    planet: "Saturne",
    rulingPlanet: "Saturne",
    compatibility: {
      mostCompatible: ["Taureau", "Vierge", "Scorpion", "Poissons"],
      leastCompatible: ["Bélier", "Balance"],
      soulmate: "Taureau"
    },
    luckyElements: {
      numbers: [8, 10, 26, 35, 44],
      colors: ["Noir", "Marron", "Vert Foncé", "Bleu Marine"],
      days: ["Samedi", "Mardi"],
      stones: ["Grenat", "Onyx", "Rubis", "Émeraude"],
      metals: ["Plomb", "Argent"]
    }
  },
  aquarius: {
    planet: "Uranus",
    rulingPlanet: "Saturne/Uranus",
    compatibility: {
      mostCompatible: ["Gémeaux", "Balance", "Bélier", "Sagittaire"],
      leastCompatible: ["Taureau", "Scorpion"],
      soulmate: "Gémeaux"
    },
    luckyElements: {
      numbers: [4, 11, 22, 29, 38],
      colors: ["Bleu Électrique", "Argent", "Pourpre", "Vert Néon"],
      days: ["Mercredi", "Samedi"],
      stones: ["Améthyste", "Aigue-marine", "Fluorite", "Labradorite"],
      metals: ["Aluminium", "Uranium"]
    }
  },
  pisces: {
    planet: "Neptune",
    rulingPlanet: "Jupiter/Neptune",
    compatibility: {
      mostCompatible: ["Cancer", "Scorpion", "Taureau", "Capricorne"],
      leastCompatible: ["Gémeaux", "Sagittaire"],
      soulmate: "Scorpion"
    },
    luckyElements: {
      numbers: [7, 12, 16, 25, 34],
      colors: ["Vert Marin", "Lavande", "Argent", "Bleu Eau"],
      days: ["Lundi", "Jeudi"],
      stones: ["Améthyste", "Aigue-marine", "Pierre de Lune", "Jade"],
      metals: ["Platine", "Étain"]
    }
  }
};
