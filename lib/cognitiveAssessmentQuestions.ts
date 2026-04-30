export type CognitiveQuestionDomain =
  | 'pattern_abstract'
  | 'numeric_reasoning'
  | 'verbal_logic'
  | 'spatial_visual'
  | 'prioritization_decision';

export type CognitiveQuestionDifficulty = 'easy' | 'medium' | 'hard';

export type CognitiveOptionKey = 'A' | 'B' | 'C' | 'D';

export type CognitiveVisualKind =
  | 'matrix'
  | 'rotation'
  | 'cube'
  | 'mirror'
  | 'blocks';

export type CognitiveVisualSpec = {
  kind: CognitiveVisualKind;
  title: string;
  caption: string;
};

export type CognitiveAssessmentQuestion = {
  id: string;
  domain: CognitiveQuestionDomain;
  difficulty: CognitiveQuestionDifficulty;
  weight: number;
  time_limit_sec: number;
  prompt: string;
  options: Record<CognitiveOptionKey, string>;
  correct_option: CognitiveOptionKey;
  explanation: string;
  visual?: CognitiveVisualSpec;
};

export const cognitiveAssessmentQuestions: CognitiveAssessmentQuestion[] = [
  {
    id: 'AR01',
    domain: 'pattern_abstract',
    difficulty: 'easy',
    weight: 1.0,
    time_limit_sec: 55,
    prompt: 'Which option completes the matrix?',
    options: {
      A: 'Left-pointing outline arrow',
      B: 'Left-pointing solid arrow',
      C: 'Down-pointing outline arrow',
      D: 'Up-pointing outline arrow'
    },
    correct_option: 'A',
    explanation:
      'Across each row, the arrow rotates 90 degrees clockwise. Down each column, fill alternates outline, solid, outline.',
    visual: {
      kind: 'matrix',
      title: 'Arrow rotation matrix',
      caption: 'Track rotation across rows and fill style down columns.'
    }
  },
  {
    id: 'NL01',
    domain: 'numeric_reasoning',
    difficulty: 'easy',
    weight: 1.0,
    time_limit_sec: 55,
    prompt: 'Find the next number: 2, 6, 12, 20, 30, ?',
    options: { A: '38', B: '40', C: '42', D: '44' },
    correct_option: 'C',
    explanation: 'The gaps are +4, +6, +8, +10, so the next gap is +12.'
  },
  {
    id: 'SP01',
    domain: 'spatial_visual',
    difficulty: 'easy',
    weight: 1.0,
    time_limit_sec: 55,
    prompt: 'Which option shows the same object after rotation?',
    options: {
      A: 'Mirror image',
      B: 'True 90-degree rotation',
      C: '180-degree rotation with marker moved',
      D: 'Altered spacing'
    },
    correct_option: 'B',
    explanation:
      'The correct option keeps the same handedness and marker position after rotation. Mirror choices reverse the object.',
    visual: {
      kind: 'rotation',
      title: 'Rotated L-shape',
      caption: 'Preserve handedness and the dot location while rotating.'
    }
  },
  {
    id: 'VR01',
    domain: 'verbal_logic',
    difficulty: 'easy',
    weight: 1.0,
    time_limit_sec: 55,
    prompt: 'All larns are mips. All mips are tevs. Which must be true?',
    options: {
      A: 'All larns are tevs.',
      B: 'All tevs are larns.',
      C: 'No larns are tevs.',
      D: 'Some tevs are not mips.'
    },
    correct_option: 'A',
    explanation:
      'If larns are inside mips and mips are inside tevs, then larns are inside tevs.'
  },
  {
    id: 'DS01',
    domain: 'prioritization_decision',
    difficulty: 'easy',
    weight: 1.0,
    time_limit_sec: 55,
    prompt:
      'You have 5 min. A = 4 pts/2 min, B = 7 pts/3 min, C = 3 pts/1 min. Best total?',
    options: {
      A: 'A + C = 7',
      B: 'B + C = 10',
      C: 'A + B = 11',
      D: 'A + B + C = 14'
    },
    correct_option: 'C',
    explanation:
      'A and B exactly fit 5 minutes and give the highest allowed score.'
  },
  {
    id: 'AR02',
    domain: 'pattern_abstract',
    difficulty: 'easy',
    weight: 1.1,
    time_limit_sec: 60,
    prompt: 'Which option completes the matrix?',
    options: {
      A: '3 dots with top border',
      B: '2 dots with bottom border',
      C: '3 dots with bottom border',
      D: '1 dot with right border'
    },
    correct_option: 'C',
    explanation:
      'Dot count rises from 1 to 3 across each row, while the border line shifts by column.',
    visual: {
      kind: 'matrix',
      title: 'Dots and border matrix',
      caption: 'Combine the dot-count rule with the border-position rule.'
    }
  },
  {
    id: 'NL02',
    domain: 'numeric_reasoning',
    difficulty: 'easy',
    weight: 1.1,
    time_limit_sec: 60,
    prompt:
      'A score uses 2 x red + blue. If red = 7 and blue = 5, what is the score?',
    options: { A: '17', B: '18', C: '19', D: '24' },
    correct_option: 'C',
    explanation: 'Apply the rule directly: 2 x 7 + 5 = 19.'
  },
  {
    id: 'SP02',
    domain: 'spatial_visual',
    difficulty: 'easy',
    weight: 1.1,
    time_limit_sec: 60,
    prompt: 'Which net folds into the target cube?',
    options: {
      A: 'Marked faces become opposite',
      B: 'One marked face overlaps',
      C: 'Marked faces stay adjacent',
      D: 'The net leaves a gap'
    },
    correct_option: 'C',
    explanation:
      'Only one net keeps the marked faces adjacent in the same relationship as the target cube.',
    visual: {
      kind: 'cube',
      title: 'Cube net check',
      caption: 'Fold the net mentally and track the marked faces.'
    }
  },
  {
    id: 'VR02',
    domain: 'verbal_logic',
    difficulty: 'easy',
    weight: 1.1,
    time_limit_sec: 60,
    prompt: 'Page is to book as frame is to ___.',
    options: { A: 'picture', B: 'museum', C: 'glass', D: 'artist' },
    correct_option: 'A',
    explanation:
      'A page is part of a book, just as a frame surrounds and belongs with a picture.'
  },
  {
    id: 'DS02',
    domain: 'prioritization_decision',
    difficulty: 'easy',
    weight: 1.1,
    time_limit_sec: 60,
    prompt:
      'Budget 8. P costs 3 gives 5 pts; Q costs 5 gives 8; R costs 8 gives 11. Best choice?',
    options: { A: 'P + Q', B: 'R only', C: 'P only', D: 'Q only' },
    correct_option: 'A',
    explanation:
      'P + Q costs 8 and gives 13 points, which beats every single-pack option.'
  },
  {
    id: 'AR03',
    domain: 'pattern_abstract',
    difficulty: 'medium',
    weight: 1.4,
    time_limit_sec: 70,
    prompt: 'Which option completes the matrix?',
    options: {
      A: 'Square with 3 stripes',
      B: 'Pentagon with 2 stripes',
      C: 'Triangle with 3 stripes',
      D: 'Pentagon with 3 stripes'
    },
    correct_option: 'D',
    explanation:
      'Shape complexity changes across the row, and stripe count changes down the column.',
    visual: {
      kind: 'matrix',
      title: 'Shape complexity matrix',
      caption: 'Track shape sides horizontally and stripe count vertically.'
    }
  },
  {
    id: 'NL03',
    domain: 'numeric_reasoning',
    difficulty: 'medium',
    weight: 1.4,
    time_limit_sec: 70,
    prompt: 'Find the next number: 3, 9, 8, 24, 23, 69, ?',
    options: { A: '66', B: '67', C: '68', D: '70' },
    correct_option: 'C',
    explanation: 'The pattern repeats: multiply by 3, then subtract 1.'
  },
  {
    id: 'SP03',
    domain: 'spatial_visual',
    difficulty: 'medium',
    weight: 1.4,
    time_limit_sec: 70,
    prompt: 'Which option is the exact mirror image?',
    options: {
      A: 'Unchanged copy',
      B: 'Rotation',
      C: 'Mirror with wrong notch',
      D: 'True mirror image'
    },
    correct_option: 'D',
    explanation: 'A mirror flips handedness but does not rotate the figure.',
    visual: {
      kind: 'mirror',
      title: 'Mirror transform',
      caption: 'Flip across the vertical line without rotating the shape.'
    }
  },
  {
    id: 'VR03',
    domain: 'verbal_logic',
    difficulty: 'medium',
    weight: 1.4,
    time_limit_sec: 70,
    prompt: 'No sapes are rooks. All rooks are nals. Which must be true?',
    options: {
      A: 'Some nals are sapes.',
      B: 'No rooks are sapes.',
      C: 'All nals are rooks.',
      D: 'Some rooks are sapes.'
    },
    correct_option: 'B',
    explanation: 'If no sapes are rooks, then equally no rooks are sapes.'
  },
  {
    id: 'DS03',
    domain: 'prioritization_decision',
    difficulty: 'medium',
    weight: 1.4,
    time_limit_sec: 70,
    prompt:
      'Truck limit 10. A = 6 kg/9 pts, B = 4 kg/6 pts, C = 5 kg/8 pts. Best load?',
    options: { A: 'A + B', B: 'A + C', C: 'B + C', D: 'C only' },
    correct_option: 'A',
    explanation:
      'A + B hits the limit exactly and gives 15 points, which is higher than B + C with 14.'
  },
  {
    id: 'AR04',
    domain: 'pattern_abstract',
    difficulty: 'medium',
    weight: 1.5,
    time_limit_sec: 75,
    prompt: 'Which option completes the matrix?',
    options: {
      A: 'Wrong rotation, correct dot',
      B: 'Correct rotation and bottom-right dot',
      C: 'Mirrored symbol',
      D: 'Correct rotation, wrong dot'
    },
    correct_option: 'B',
    explanation:
      'The symbol rotates through the row, while the corner dot moves clockwise down the column.',
    visual: {
      kind: 'matrix',
      title: 'Symbol and corner-dot matrix',
      caption: 'Two rules operate at once: rotation and dot movement.'
    }
  },
  {
    id: 'NL04',
    domain: 'numeric_reasoning',
    difficulty: 'medium',
    weight: 1.5,
    time_limit_sec: 75,
    prompt: 'Rank = 3A + 2B. If rank = 22 and A = 4, what is B?',
    options: { A: '3', B: '4', C: '5', D: '6' },
    correct_option: 'C',
    explanation: '22 = 3 x 4 + 2B, so 22 = 12 + 2B and B = 5.'
  },
  {
    id: 'SP04',
    domain: 'spatial_visual',
    difficulty: 'medium',
    weight: 1.5,
    time_limit_sec: 75,
    prompt: 'Which top view matches the block stack?',
    options: {
      A: 'L-shaped footprint',
      B: 'Straight three-cell footprint',
      C: 'Square footprint',
      D: 'T-shaped footprint'
    },
    correct_option: 'A',
    explanation:
      'The top view shows the footprint only, not the front silhouette.',
    visual: {
      kind: 'blocks',
      title: 'Block-stack top view',
      caption: 'Ignore height and keep only occupied floor positions.'
    }
  },
  {
    id: 'VR04',
    domain: 'verbal_logic',
    difficulty: 'medium',
    weight: 1.5,
    time_limit_sec: 75,
    prompt:
      'If Mira is early, Jon is ready. If Jon is ready, the gate opens. Mira is early. What follows?',
    options: {
      A: 'Jon is late.',
      B: 'The gate opens.',
      C: 'Mira is ready.',
      D: 'Nothing follows.'
    },
    correct_option: 'B',
    explanation:
      'Use the chain step by step: Mira early leads to Jon ready, and Jon ready leads to the gate opening.'
  },
  {
    id: 'DS04',
    domain: 'prioritization_decision',
    difficulty: 'medium',
    weight: 1.5,
    time_limit_sec: 75,
    prompt:
      'Need at least 10 units. A gives 6 for $4, B gives 5 for $4, C gives 4 for $3. Cheapest mix?',
    options: { A: 'A + B', B: 'B + B', C: 'A + C', D: 'C + C + C' },
    correct_option: 'C',
    explanation:
      'A + C gives exactly 10 units for $7, which is cheaper than the other valid choices.'
  },
  {
    id: 'AR05',
    domain: 'pattern_abstract',
    difficulty: 'hard',
    weight: 1.8,
    time_limit_sec: 80,
    prompt: 'Which option completes the matrix?',
    options: {
      A: 'Large square border with inner star',
      B: 'Large circle border with inner star',
      C: 'Small square border with inner star',
      D: 'Large square border with inner dot'
    },
    correct_option: 'A',
    explanation:
      'In each row, the third tile combines the outer border from tile one with the inner mark from tile two; size increases down the grid.',
    visual: {
      kind: 'matrix',
      title: 'Rule-combination matrix',
      caption: 'Combine outer shape, inner mark, and size progression.'
    }
  },
  {
    id: 'NL05',
    domain: 'numeric_reasoning',
    difficulty: 'hard',
    weight: 1.8,
    time_limit_sec: 80,
    prompt: 'Find the next number: 12, 18, 27, 41, 62, ?',
    options: { A: '83', B: '92', C: '94', D: '98' },
    correct_option: 'B',
    explanation:
      'The gaps are +6, +9, +14, +21. Second-level gaps are +3, +5, +7, so the next is +9. Add 30 to get 92.'
  },
  {
    id: 'SP05',
    domain: 'spatial_visual',
    difficulty: 'hard',
    weight: 1.8,
    time_limit_sec: 80,
    prompt: 'Which cube can be the same cube after rotation?',
    options: {
      A: 'Mirror order of marked faces',
      B: 'Opposite faces become adjacent',
      C: 'Same adjacency and clockwise order',
      D: 'One symbol changes face'
    },
    correct_option: 'C',
    explanation:
      'The correct option preserves which marked faces are adjacent and in what clockwise order.',
    visual: {
      kind: 'cube',
      title: 'Rotated marked cube',
      caption: 'Track adjacency and clockwise face order.'
    }
  },
  {
    id: 'VR05',
    domain: 'verbal_logic',
    difficulty: 'hard',
    weight: 1.8,
    time_limit_sec: 80,
    prompt:
      'Only daxes are zems. No daxes are pons. Some rils are daxes. Which must be true?',
    options: {
      A: 'Some rils are not pons.',
      B: 'All zems are daxes.',
      C: 'Some pons are zems.',
      D: 'No rils are zems.'
    },
    correct_option: 'A',
    explanation:
      'Some rils are daxes, and no daxes are pons, so those rils are not pons.'
  },
  {
    id: 'DS05',
    domain: 'prioritization_decision',
    difficulty: 'hard',
    weight: 1.8,
    time_limit_sec: 80,
    prompt:
      'You have 6 min. M = 9 pts/4 min, N = 7 pts/3 min, P = 5 pts/2 min. Best set?',
    options: { A: 'M only', B: 'N + P', C: 'M + P', D: 'N only' },
    correct_option: 'C',
    explanation:
      'M + P fits exactly in 6 minutes and yields 14 points, the highest feasible total.'
  },
  {
    id: 'AR06',
    domain: 'pattern_abstract',
    difficulty: 'hard',
    weight: 1.9,
    time_limit_sec: 90,
    prompt: 'Which option completes the matrix?',
    options: {
      A: 'Three vertical bars with normal fill',
      B: 'Two horizontal bars with reversed fill',
      C: 'Three horizontal bars with reversed fill',
      D: 'Three diagonal bars with reversed fill'
    },
    correct_option: 'C',
    explanation:
      'Element count grows, direction changes by column, and the last column reverses the fill pattern.',
    visual: {
      kind: 'matrix',
      title: 'Three-rule matrix',
      caption: 'Track count, direction, and fill reversal together.'
    }
  },
  {
    id: 'NL06',
    domain: 'numeric_reasoning',
    difficulty: 'hard',
    weight: 1.9,
    time_limit_sec: 90,
    prompt: 'If A:B = 3:4 and B:C = 2:5, then A:C = ?',
    options: { A: '3:8', B: '3:10', C: '4:9', D: '5:12' },
    correct_option: 'B',
    explanation:
      'Match B with a common value: 3:4 becomes 6:8 and 2:5 becomes 8:20, so A:C = 6:20 = 3:10.'
  },
  {
    id: 'SP06',
    domain: 'spatial_visual',
    difficulty: 'hard',
    weight: 1.9,
    time_limit_sec: 90,
    prompt: 'Which net can fold into one closed cube?',
    options: {
      A: 'Overlaps when folded',
      B: 'Valid non-overlapping cube net',
      C: 'Leaves a missing face gap',
      D: 'Duplicates an opposite-face position'
    },
    correct_option: 'B',
    explanation:
      'A valid cube net must fold without overlap and must place each face once.',
    visual: {
      kind: 'cube',
      title: 'Valid cube net',
      caption: 'Check whether six faces fold into one closed cube.'
    }
  },
  {
    id: 'VR06',
    domain: 'verbal_logic',
    difficulty: 'hard',
    weight: 1.9,
    time_limit_sec: 90,
    prompt:
      'All ferns are plins. No plins are kets. Some dravs are ferns. Which must be true?',
    options: {
      A: 'Some dravs are not kets.',
      B: 'All dravs are plins.',
      C: 'No dravs are plins.',
      D: 'Some kets are dravs.'
    },
    correct_option: 'A',
    explanation:
      'Some dravs are ferns, all ferns are plins, and no plins are kets. Therefore those dravs are not kets.'
  },
  {
    id: 'DS06',
    domain: 'prioritization_decision',
    difficulty: 'hard',
    weight: 1.9,
    time_limit_sec: 90,
    prompt:
      'Budget 11. X costs 6 gives 9 pts; Y costs 5 gives 7; Z costs 4 gives 6. Best combo?',
    options: { A: 'X + Y', B: 'X + Z', C: 'Y + Z', D: 'X only' },
    correct_option: 'A',
    explanation:
      'X + Y costs 11 and gives 16 points, which beats every other feasible option.'
  }
];
