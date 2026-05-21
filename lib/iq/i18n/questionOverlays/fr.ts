import type { QuestionOverlayMap } from '@/lib/iq/i18n/questionOverlays/types';

export const IQ_QUESTION_OVERLAY_FR: QuestionOverlayMap = {
  AR01: {
    prompt: 'Quelle option complète la matrice ?',
    options: {
      A: 'Flèche en contour pointant vers la gauche',
      B: 'Flèche pleine pointant vers la gauche',
      C: 'Flèche en contour pointant vers le bas',
      D: 'Flèche en contour pointant vers le haut'
    },
    explanation:
      'Sur chaque ligne, la flèche tourne de 90 degrés dans le sens horaire. Sur chaque colonne, le remplissage alterne contour, plein, contour.',
    visual: {
      title: 'Matrice de rotation de flèches',
      caption: 'Suivez la rotation sur les lignes et le style de remplissage sur les colonnes.'
    }
  },
  NL01: {
    prompt: 'Trouvez le nombre suivant : 2, 6, 12, 20, 30, ?',
    options: { A: '38', B: '40', C: '42', D: '44' },
    explanation: 'Les écarts sont +4, +6, +8, +10, donc le prochain écart est +12.'
  },
  SP01: {
    prompt: 'Quelle option montre le même objet après rotation ?',
    options: {
      A: 'Image miroir',
      B: 'Vraie rotation de 90 degrés',
      C: 'Rotation de 180 degrés avec marqueur déplacé',
      D: 'Espacement modifié'
    },
    explanation:
      'La bonne option conserve la même chiralité et la position du marqueur après rotation. Les choix miroir inversent l\'objet.',
    visual: {
      title: 'Forme en L rotée',
      caption: 'Conservez la chiralité et l\'emplacement du point lors de la rotation.'
    }
  },
  VR01: {
    prompt: 'Tous les larns sont des mips. Tous les mips sont des tevs. Que doit-on conclure ?',
    options: {
      A: 'Tous les larns sont des tevs.',
      B: 'Tous les tevs sont des larns.',
      C: 'Aucun larn n\'est tev.',
      D: 'Certains tevs ne sont pas des mips.'
    },
    explanation:
      'Si les larns sont inclus dans les mips et les mips dans les tevs, alors les larns sont inclus dans les tevs.'
  },
  DS01: {
    prompt:
      'Vous avez 5 min. A = 4 pts/2 min, B = 7 pts/3 min, C = 3 pts/1 min. Meilleur total ?',
    options: {
      A: 'A + C = 7',
      B: 'B + C = 10',
      C: 'A + B = 11',
      D: 'A + B + C = 14'
    },
    explanation:
      'A et B remplissent exactement 5 minutes et donnent le score maximal autorisé.'
  },
  AR02: {
    prompt: 'Quelle option complète la matrice ?',
    options: {
      A: '3 points avec bordure supérieure',
      B: '2 points avec bordure inférieure',
      C: '3 points avec bordure inférieure',
      D: '1 point avec bordure droite'
    },
    explanation:
      'Le nombre de points passe de 1 à 3 sur chaque ligne, tandis que la ligne de bordure se déplace par colonne.',
    visual: {
      title: 'Matrice de points et bordures',
      caption: 'Combinez la règle du nombre de points avec la règle de position de la bordure.'
    }
  },
  NL02: {
    prompt:
      'Un score utilise 2 x rouge + bleu. Si rouge = 7 et bleu = 5, quel est le score ?',
    options: { A: '17', B: '18', C: '19', D: '24' },
    explanation: 'Appliquez la règle directement : 2 x 7 + 5 = 19.'
  },
  SP02: {
    prompt: 'Quel patron se plie en le cube cible ?',
    options: {
      A: 'Les faces marquées deviennent opposées',
      B: 'Une face marquée se superpose',
      C: 'Les faces marquées restent adjacentes',
      D: 'Le patron laisse un trou'
    },
    explanation:
      'Un seul patron garde les faces marquées adjacentes dans la même relation que le cube cible.',
    visual: {
      title: 'Vérification du patron de cube',
      caption: 'Pliez mentalement le patron et suivez les faces marquées.'
    }
  },
  VR02: {
    prompt: 'Page est à livre comme cadre est à ___.',
    options: { A: 'tableau', B: 'musée', C: 'verre', D: 'artiste' },
    explanation:
      'Une page fait partie d\'un livre, tout comme un cadre entoure et appartient à un tableau.'
  },
  DS02: {
    prompt:
      'Budget 8. P coûte 3 donne 5 pts ; Q coûte 5 donne 8 ; R coûte 8 donne 11. Meilleur choix ?',
    options: { A: 'P + Q', B: 'R seulement', C: 'P seulement', D: 'Q seulement' },
    explanation:
      'P + Q coûte 8 et donne 13 points, ce qui dépasse chaque option à un seul paquet.'
  },
  AR03: {
    prompt: 'Quelle option complète la matrice ?',
    options: {
      A: 'Carré avec 3 rayures',
      B: 'Pentagone avec 2 rayures',
      C: 'Triangle avec 3 rayures',
      D: 'Pentagone avec 3 rayures'
    },
    explanation:
      'La complexité de la forme change sur la ligne, et le nombre de rayures change sur la colonne.',
    visual: {
      title: 'Matrice de complexité des formes',
      caption: 'Suivez les côtés de la forme horizontalement et le nombre de rayures verticalement.'
    }
  },
  NL03: {
    prompt: 'Trouvez le nombre suivant : 3, 9, 8, 24, 23, 69, ?',
    options: { A: '66', B: '67', C: '68', D: '70' },
    explanation: 'Le motif se répète : multiplier par 3, puis soustraire 1.'
  },
  SP03: {
    prompt: 'Quelle option est l\'image miroir exacte ?',
    options: {
      A: 'Copie inchangée',
      B: 'Rotation',
      C: 'Miroir avec encoche incorrecte',
      D: 'Vraie image miroir'
    },
    explanation: 'Un miroir inverse la chiralité mais ne fait pas tourner la figure.',
    visual: {
      title: 'Transformation miroir',
      caption: 'Retournez le long de la ligne verticale sans faire tourner la forme.'
    }
  },
  VR03: {
    prompt: 'Aucun sapes n\'est rook. Tous les rooks sont nals. Que doit-on conclure ?',
    options: {
      A: 'Certains nals sont sapes.',
      B: 'Aucun rook n\'est sapes.',
      C: 'Tous les nals sont rooks.',
      D: 'Certains rooks sont sapes.'
    },
    explanation: 'Si aucun sapes n\'est rook, alors aucun rook n\'est sapes non plus.'
  },
  DS03: {
    prompt:
      'Limite du camion 10. A = 6 kg/9 pts, B = 4 kg/6 pts, C = 5 kg/8 pts. Meilleure charge ?',
    options: { A: 'A + B', B: 'A + C', C: 'B + C', D: 'C seulement' },
    explanation:
      'A + B atteint la limite exactement et donne 15 points, ce qui est supérieur à B + C avec 14.'
  },
  AR04: {
    prompt: 'Quelle option complète la matrice ?',
    options: {
      A: 'Mauvaise rotation, point correct',
      B: 'Rotation correcte et point en bas à droite',
      C: 'Symbole en miroir',
      D: 'Rotation correcte, mauvais point'
    },
    explanation:
      'Le symbole tourne le long de la ligne, tandis que le point d\'angle se déplace dans le sens horaire le long de la colonne.',
    visual: {
      title: 'Matrice symbole et point d\'angle',
      caption: 'Deux règles fonctionnent en même temps : rotation et déplacement du point.'
    }
  },
  NL04: {
    prompt: 'Rang = 3A + 2B. Si rang = 22 et A = 4, quelle est la valeur de B ?',
    options: { A: '3', B: '4', C: '5', D: '6' },
    explanation: '22 = 3 x 4 + 2B, donc 22 = 12 + 2B et B = 5.'
  },
  SP04: {
    prompt: 'Quelle vue de dessus correspond à la pile de blocs ?',
    options: {
      A: 'Empreinte en forme de L',
      B: 'Empreinte rectiligne de trois cases',
      C: 'Empreinte carrée',
      D: 'Empreinte en forme de T'
    },
    explanation:
      'La vue de dessus montre uniquement l\'empreinte, pas la silhouette de face.',
    visual: {
      title: 'Vue de dessus de la pile de blocs',
      caption: 'Ignorez la hauteur et ne gardez que les positions occupées au sol.'
    }
  },
  VR04: {
    prompt:
      'Si Mira est en avance, Jon est prêt. Si Jon est prêt, la porte s\'ouvre. Mira est en avance. Que conclut-on ?',
    options: {
      A: 'Jon est en retard.',
      B: 'La porte s\'ouvre.',
      C: 'Mira est prête.',
      D: 'Rien ne suit.'
    },
    explanation:
      'Utilisez la chaîne étape par étape : Mira en avance mène à Jon prêt, et Jon prêt mène à l\'ouverture de la porte.'
  },
  DS04: {
    prompt:
      'Il faut au moins 10 unités. A donne 6 pour 4 $, B donne 5 pour 4 $, C donne 4 pour 3 $. Mélange le moins cher ?',
    options: { A: 'A + B', B: 'B + B', C: 'A + C', D: 'C + C + C' },
    explanation:
      'A + C donne exactement 10 unités pour 7 $, ce qui est moins cher que les autres choix valides.'
  },
  AR05: {
    prompt: 'Quelle option complète la matrice ?',
    options: {
      A: 'Grande bordure carrée avec étoile intérieure',
      B: 'Grande bordure circulaire avec étoile intérieure',
      C: 'Petite bordure carrée avec étoile intérieure',
      D: 'Grande bordure carrée avec point intérieur'
    },
    explanation:
      'Sur chaque ligne, la troisième tuile combine la bordure extérieure de la tuile un avec la marque intérieure de la tuile deux ; la taille augmente vers le bas de la grille.',
    visual: {
      title: 'Matrice de combinaison de règles',
      caption: 'Combinez la forme extérieure, la marque intérieure et la progression de taille.'
    }
  },
  NL05: {
    prompt: 'Trouvez le nombre suivant : 12, 18, 27, 41, 62, ?',
    options: { A: '83', B: '92', C: '94', D: '98' },
    explanation:
      'Les écarts sont +6, +9, +14, +21. Les écarts de second niveau sont +3, +5, +7, donc le suivant est +9. Ajoutez 30 pour obtenir 92.'
  },
  SP05: {
    prompt: 'Quel cube peut être le même cube après rotation ?',
    options: {
      A: 'Ordre miroir des faces marquées',
      B: 'Les faces opposées deviennent adjacentes',
      C: 'Même adjacence et ordre horaire',
      D: 'Un symbole change de face'
    },
    explanation:
      'La bonne option préserve quelles faces marquées sont adjacentes et dans quel ordre horaire.',
    visual: {
      title: 'Cube marqué roté',
      caption: 'Suivez l\'adjacence et l\'ordre horaire des faces.'
    }
  },
  VR05: {
    prompt:
      'Seuls les daxes sont zems. Aucun daxes n\'est pons. Certains rils sont daxes. Que doit-on conclure ?',
    options: {
      A: 'Certains rils ne sont pas pons.',
      B: 'Tous les zems sont daxes.',
      C: 'Certains pons sont zems.',
      D: 'Aucun rils n\'est zems.'
    },
    explanation:
      'Certains rils sont daxes, et aucun daxes n\'est pons, donc ces rils ne sont pas pons.'
  },
  DS05: {
    prompt:
      'Vous avez 6 min. M = 9 pts/4 min, N = 7 pts/3 min, P = 5 pts/2 min. Meilleur ensemble ?',
    options: { A: 'M seulement', B: 'N + P', C: 'M + P', D: 'N seulement' },
    explanation:
      'M + P tient exactement en 6 minutes et rapporte 14 points, le total maximal réalisable.'
  },
  AR06: {
    prompt: 'Quelle option complète la matrice ?',
    options: {
      A: 'Trois barres verticales avec remplissage normal',
      B: 'Deux barres horizontales avec remplissage inversé',
      C: 'Trois barres horizontales avec remplissage inversé',
      D: 'Trois barres diagonales avec remplissage inversé'
    },
    explanation:
      'Le nombre d\'éléments augmente, la direction change par colonne, et la dernière colonne inverse le motif de remplissage.',
    visual: {
      title: 'Matrice à trois règles',
      caption: 'Suivez ensemble le décompte, la direction et l\'inversion du remplissage.'
    }
  },
  NL06: {
    prompt: 'Si A:B = 3:4 et B:C = 2:5, alors A:C = ?',
    options: { A: '3:8', B: '3:10', C: '4:9', D: '5:12' },
    explanation:
      'Alignez B sur une valeur commune : 3:4 devient 6:8 et 2:5 devient 8:20, donc A:C = 6:20 = 3:10.'
  },
  SP06: {
    prompt: 'Quel patron peut se plier en un cube fermé ?',
    options: {
      A: 'Se superpose lors du pliage',
      B: 'Patron de cube valide sans superposition',
      C: 'Laisse un trou de face manquante',
      D: 'Duplique une position de face opposée'
    },
    explanation:
      'Un patron de cube valide doit se plier sans superposition et placer chaque face une seule fois.',
    visual: {
      title: 'Patron de cube valide',
      caption: 'Vérifiez si six faces se plient en un cube fermé.'
    }
  },
  VR06: {
    prompt:
      'Tous les ferns sont plins. Aucun plins n\'est kets. Certains dravs sont ferns. Que doit-on conclure ?',
    options: {
      A: 'Certains dravs ne sont pas kets.',
      B: 'Tous les dravs sont plins.',
      C: 'Aucun dravs n\'est plins.',
      D: 'Certains kets sont dravs.'
    },
    explanation:
      'Certains dravs sont ferns, tous les ferns sont plins, et aucun plins n\'est kets. Par conséquent, ces dravs ne sont pas kets.'
  },
  DS06: {
    prompt:
      'Budget 11. X coûte 6 donne 9 pts ; Y coûte 5 donne 7 ; Z coûte 4 donne 6. Meilleure combinaison ?',
    options: { A: 'X + Y', B: 'X + Z', C: 'Y + Z', D: 'X seulement' },
    explanation:
      'X + Y coûte 11 et donne 16 points, ce qui dépasse toutes les autres options réalisables.'
  }
};
