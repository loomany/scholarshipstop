import type { QuestionOverlayMap } from '@/lib/iq/i18n/questionOverlays/types';

export const IQ_QUESTION_OVERLAY_ES: QuestionOverlayMap = {
  AR01: {
    prompt: '¿Qué opción completa la matriz?',
    options: {
      A: 'Flecha de contorno apuntando a la izquierda',
      B: 'Flecha sólida apuntando a la izquierda',
      C: 'Flecha de contorno apuntando hacia abajo',
      D: 'Flecha de contorno apuntando hacia arriba'
    },
    explanation:
      'En cada fila, la flecha rota 90 grados en sentido horario. En cada columna, el relleno alterna contorno, sólido, contorno.',
    visual: {
      title: 'Matriz de rotación de flechas',
      caption: 'Sigue la rotación entre filas y el estilo de relleno entre columnas.'
    }
  },
  NL01: {
    prompt: 'Encuentra el siguiente número: 2, 6, 12, 20, 30, ?',
    options: { A: '38', B: '40', C: '42', D: '44' },
    explanation: 'Las diferencias son +4, +6, +8, +10, así que la siguiente diferencia es +12.'
  },
  SP01: {
    prompt: '¿Qué opción muestra el mismo objeto después de una rotación?',
    options: {
      A: 'Imagen especular',
      B: 'Rotación real de 90 grados',
      C: 'Rotación de 180 grados con marcador movido',
      D: 'Espaciado alterado'
    },
    explanation:
      'La opción correcta mantiene la misma quiralidad y posición del marcador tras la rotación. Las opciones especulares invierten el objeto.',
    visual: {
      title: 'Forma en L rotada',
      caption: 'Conserva la quiralidad y la ubicación del punto al rotar.'
    }
  },
  VR01: {
    prompt: 'Todos los larns son mips. Todos los mips son tevs. ¿Qué debe ser cierto?',
    options: {
      A: 'Todos los larns son tevs.',
      B: 'Todos los tevs son larns.',
      C: 'Ningún larn es tev.',
      D: 'Algunos tevs no son mips.'
    },
    explanation:
      'Si los larns están dentro de los mips y los mips están dentro de los tevs, entonces los larns están dentro de los tevs.'
  },
  DS01: {
    prompt:
      'Tienes 5 min. A = 4 pts/2 min, B = 7 pts/3 min, C = 3 pts/1 min. ¿Mejor total?',
    options: {
      A: 'A + C = 7',
      B: 'B + C = 10',
      C: 'A + B = 11',
      D: 'A + B + C = 14'
    },
    explanation:
      'A y B encajan exactamente en 5 minutos y dan la puntuación máxima permitida.'
  },
  AR02: {
    prompt: '¿Qué opción completa la matriz?',
    options: {
      A: '3 puntos con borde superior',
      B: '2 puntos con borde inferior',
      C: '3 puntos con borde inferior',
      D: '1 punto con borde derecho'
    },
    explanation:
      'El número de puntos aumenta de 1 a 3 en cada fila, mientras que la línea del borde se desplaza por columna.',
    visual: {
      title: 'Matriz de puntos y bordes',
      caption: 'Combina la regla del conteo de puntos con la regla de posición del borde.'
    }
  },
  NL02: {
    prompt:
      'Una puntuación usa 2 x rojo + azul. Si rojo = 7 y azul = 5, ¿cuál es la puntuación?',
    options: { A: '17', B: '18', C: '19', D: '24' },
    explanation: 'Aplica la regla directamente: 2 x 7 + 5 = 19.'
  },
  SP02: {
    prompt: '¿Qué desarrollo plano se pliega en el cubo objetivo?',
    options: {
      A: 'Las caras marcadas quedan opuestas',
      B: 'Una cara marcada se superpone',
      C: 'Las caras marcadas permanecen adyacentes',
      D: 'El desarrollo deja un hueco'
    },
    explanation:
      'Solo un desarrollo mantiene las caras marcadas adyacentes en la misma relación que el cubo objetivo.',
    visual: {
      title: 'Comprobación de desarrollo de cubo',
      caption: 'Pliega mentalmente el desarrollo y sigue las caras marcadas.'
    }
  },
  VR02: {
    prompt: 'Página es a libro como marco es a ___.',
    options: { A: 'cuadro', B: 'museo', C: 'vidrio', D: 'artista' },
    explanation:
      'Una página es parte de un libro, así como un marco rodea y pertenece a un cuadro.'
  },
  DS02: {
    prompt:
      'Presupuesto 8. P cuesta 3 da 5 pts; Q cuesta 5 da 8; R cuesta 8 da 11. ¿Mejor opción?',
    options: { A: 'P + Q', B: 'Solo R', C: 'Solo P', D: 'Solo Q' },
    explanation:
      'P + Q cuesta 8 y da 13 puntos, lo que supera todas las opciones de un solo paquete.'
  },
  AR03: {
    prompt: '¿Qué opción completa la matriz?',
    options: {
      A: 'Cuadrado con 3 rayas',
      B: 'Pentágono con 2 rayas',
      C: 'Triángulo con 3 rayas',
      D: 'Pentágono con 3 rayas'
    },
    explanation:
      'La complejidad de la forma cambia a lo largo de la fila, y el número de rayas cambia en la columna.',
    visual: {
      title: 'Matriz de complejidad de formas',
      caption: 'Sigue los lados de la forma horizontalmente y el número de rayas verticalmente.'
    }
  },
  NL03: {
    prompt: 'Encuentra el siguiente número: 3, 9, 8, 24, 23, 69, ?',
    options: { A: '66', B: '67', C: '68', D: '70' },
    explanation: 'El patrón se repite: multiplicar por 3, luego restar 1.'
  },
  SP03: {
    prompt: '¿Qué opción es la imagen especular exacta?',
    options: {
      A: 'Copia sin cambios',
      B: 'Rotación',
      C: 'Espejo con muesca incorrecta',
      D: 'Imagen especular verdadera'
    },
    explanation: 'Un espejo invierte la quiralidad pero no rota la figura.',
    visual: {
      title: 'Transformación especular',
      caption: 'Voltea a través de la línea vertical sin rotar la forma.'
    }
  },
  VR03: {
    prompt: 'Ningún sapes es rook. Todos los rooks son nals. ¿Qué debe ser cierto?',
    options: {
      A: 'Algunos nals son sapes.',
      B: 'Ningún rook es sapes.',
      C: 'Todos los nals son rooks.',
      D: 'Algunos rooks son sapes.'
    },
    explanation: 'Si ningún sapes es rook, entonces igualmente ningún rook es sapes.'
  },
  DS03: {
    prompt:
      'Límite del camión 10. A = 6 kg/9 pts, B = 4 kg/6 pts, C = 5 kg/8 pts. ¿Mejor carga?',
    options: { A: 'A + B', B: 'A + C', C: 'B + C', D: 'Solo C' },
    explanation:
      'A + B alcanza el límite exactamente y da 15 puntos, que es más que B + C con 14.'
  },
  AR04: {
    prompt: '¿Qué opción completa la matriz?',
    options: {
      A: 'Rotación incorrecta, punto correcto',
      B: 'Rotación correcta y punto abajo a la derecha',
      C: 'Símbolo reflejado',
      D: 'Rotación correcta, punto incorrecto'
    },
    explanation:
      'El símbolo rota a lo largo de la fila, mientras que el punto de esquina se mueve en sentido horario por la columna.',
    visual: {
      title: 'Matriz de símbolo y punto de esquina',
      caption: 'Dos reglas operan a la vez: rotación y movimiento del punto.'
    }
  },
  NL04: {
    prompt: 'Rango = 3A + 2B. Si rango = 22 y A = 4, ¿cuál es B?',
    options: { A: '3', B: '4', C: '5', D: '6' },
    explanation: '22 = 3 x 4 + 2B, entonces 22 = 12 + 2B y B = 5.'
  },
  SP04: {
    prompt: '¿Qué vista superior coincide con la pila de bloques?',
    options: {
      A: 'Huella en forma de L',
      B: 'Huella recta de tres celdas',
      C: 'Huella cuadrada',
      D: 'Huella en forma de T'
    },
    explanation:
      'La vista superior muestra solo la huella, no la silueta frontal.',
    visual: {
      title: 'Vista superior de pila de bloques',
      caption: 'Ignora la altura y conserva solo las posiciones ocupadas en el suelo.'
    }
  },
  VR04: {
    prompt:
      'Si Mira llega temprano, Jon está listo. Si Jon está listo, la puerta se abre. Mira llega temprano. ¿Qué se deduce?',
    options: {
      A: 'Jon llega tarde.',
      B: 'La puerta se abre.',
      C: 'Mira está lista.',
      D: 'No se deduce nada.'
    },
    explanation:
      'Usa la cadena paso a paso: Mira temprano lleva a Jon listo, y Jon listo lleva a que se abra la puerta.'
  },
  DS04: {
    prompt:
      'Se necesitan al menos 10 unidades. A da 6 por $4, B da 5 por $4, C da 4 por $3. ¿Mezcla más barata?',
    options: { A: 'A + B', B: 'B + B', C: 'A + C', D: 'C + C + C' },
    explanation:
      'A + C da exactamente 10 unidades por $7, que es más barato que las otras opciones válidas.'
  },
  AR05: {
    prompt: '¿Qué opción completa la matriz?',
    options: {
      A: 'Borde cuadrado grande con estrella interior',
      B: 'Borde circular grande con estrella interior',
      C: 'Borde cuadrado pequeño con estrella interior',
      D: 'Borde cuadrado grande con punto interior'
    },
    explanation:
      'En cada fila, la tercera ficha combina el borde exterior de la ficha uno con la marca interior de la ficha dos; el tamaño aumenta hacia abajo en la cuadrícula.',
    visual: {
      title: 'Matriz de combinación de reglas',
      caption: 'Combina forma exterior, marca interior y progresión de tamaño.'
    }
  },
  NL05: {
    prompt: 'Encuentra el siguiente número: 12, 18, 27, 41, 62, ?',
    options: { A: '83', B: '92', C: '94', D: '98' },
    explanation:
      'Las diferencias son +6, +9, +14, +21. Las diferencias de segundo nivel son +3, +5, +7, así que la siguiente es +9. Suma 30 para obtener 92.'
  },
  SP05: {
    prompt: '¿Qué cubo puede ser el mismo cubo después de una rotación?',
    options: {
      A: 'Orden especular de caras marcadas',
      B: 'Caras opuestas se vuelven adyacentes',
      C: 'Misma adyacencia y orden horario',
      D: 'Un símbolo cambia de cara'
    },
    explanation:
      'La opción correcta preserva qué caras marcadas son adyacentes y en qué orden horario.',
    visual: {
      title: 'Cubo marcado rotado',
      caption: 'Sigue la adyacencia y el orden horario de las caras.'
    }
  },
  VR05: {
    prompt:
      'Solo los daxes son zems. Ningún daxes es pons. Algunos rils son daxes. ¿Qué debe ser cierto?',
    options: {
      A: 'Algunos rils no son pons.',
      B: 'Todos los zems son daxes.',
      C: 'Algunos pons son zems.',
      D: 'Ningún rils es zems.'
    },
    explanation:
      'Algunos rils son daxes, y ningún daxes es pons, así que esos rils no son pons.'
  },
  DS05: {
    prompt:
      'Tienes 6 min. M = 9 pts/4 min, N = 7 pts/3 min, P = 5 pts/2 min. ¿Mejor conjunto?',
    options: { A: 'Solo M', B: 'N + P', C: 'M + P', D: 'Solo N' },
    explanation:
      'M + P encaja exactamente en 6 minutos y produce 14 puntos, el total máximo factible.'
  },
  AR06: {
    prompt: '¿Qué opción completa la matriz?',
    options: {
      A: 'Tres barras verticales con relleno normal',
      B: 'Dos barras horizontales con relleno invertido',
      C: 'Tres barras horizontales con relleno invertido',
      D: 'Tres barras diagonales con relleno invertido'
    },
    explanation:
      'El número de elementos crece, la dirección cambia por columna, y la última columna invierte el patrón de relleno.',
    visual: {
      title: 'Matriz de tres reglas',
      caption: 'Sigue el conteo, la dirección y la inversión del relleno juntos.'
    }
  },
  NL06: {
    prompt: 'Si A:B = 3:4 y B:C = 2:5, entonces A:C = ?',
    options: { A: '3:8', B: '3:10', C: '4:9', D: '5:12' },
    explanation:
      'Iguala B con un valor común: 3:4 se convierte en 6:8 y 2:5 se convierte en 8:20, así que A:C = 6:20 = 3:10.'
  },
  SP06: {
    prompt: '¿Qué desarrollo plano se puede plegar en un cubo cerrado?',
    options: {
      A: 'Se superpone al plegarse',
      B: 'Desarrollo válido de cubo sin superposición',
      C: 'Deja un hueco de cara faltante',
      D: 'Duplica una posición de cara opuesta'
    },
    explanation:
      'Un desarrollo válido de cubo debe plegarse sin superposición y debe colocar cada cara una vez.',
    visual: {
      title: 'Desarrollo válido de cubo',
      caption: 'Comprueba si seis caras se pliegan en un cubo cerrado.'
    }
  },
  VR06: {
    prompt:
      'Todos los ferns son plins. Ningún plins es kets. Algunos dravs son ferns. ¿Qué debe ser cierto?',
    options: {
      A: 'Algunos dravs no son kets.',
      B: 'Todos los dravs son plins.',
      C: 'Ningún dravs es plins.',
      D: 'Algunos kets son dravs.'
    },
    explanation:
      'Algunos dravs son ferns, todos los ferns son plins, y ningún plins es kets. Por lo tanto, esos dravs no son kets.'
  },
  DS06: {
    prompt:
      'Presupuesto 11. X cuesta 6 da 9 pts; Y cuesta 5 da 7; Z cuesta 4 da 6. ¿Mejor combinación?',
    options: { A: 'X + Y', B: 'X + Z', C: 'Y + Z', D: 'Solo X' },
    explanation:
      'X + Y cuesta 11 y da 16 puntos, lo que supera todas las demás opciones factibles.'
  }
};
