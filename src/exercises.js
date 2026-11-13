const poses = {
  pushup: [
    '<circle cx="28" cy="67" r="8"/><path d="M38 68 75 73 102 73M47 70 58 88 76 90M53 71 68 76 76 90M100 73 110 75"/>',
    '<circle cx="28" cy="66" r="8"/><path d="M38 67 75 73 102 73M47 69 55 82 75 84M53 70 66 76 75 84M100 73 110 75"/>'
  ],
  incline: [
    '<path d="M60 91h51M69 91V76M105 91V76"/><circle cx="22" cy="57" r="8"/><path d="M32 58 67 68 92 77M41 61 55 77 67 82M44 62 63 71 67 82M90 77 110 84"/>',
    '<path d="M60 91h51M69 91V76M105 91V76"/><circle cx="22" cy="57" r="8"/><path d="M32 58 67 68 92 77M41 61 53 73 66 79M44 62 61 70 66 79M90 77 110 84"/>'
  ],
  row: [
    '<circle cx="43" cy="42" r="8"/><path d="M49 49 75 69 99 73M63 59 53 75 41 83M64 60 83 76 89 82M97 73 112 78"/><path d="M79 73h16l-2 12H81z"/>' ,
    '<circle cx="43" cy="42" r="8"/><path d="M49 49 75 69 99 73M63 59 68 76 77 80M64 60 85 69 90 78M97 73 112 78"/><path d="M79 66h16l-2 12H81z"/>'
  ],
  squat: [
    '<circle cx="67" cy="31" r="8"/><path d="M67 40 68 63M68 49 51 58 45 72M68 49 83 57 88 70M68 63 55 83 52 95M68 63 81 82 87 94"/>',
    '<circle cx="67" cy="41" r="8"/><path d="M67 50 67 68M67 56 48 64 39 76M67 56 85 64 94 76M67 68 52 77 57 94M67 68 83 77 78 94"/>'
  ],
  plank: [
    '<circle cx="26" cy="63" r="8"/><path d="M36 64 72 69 103 70M44 65 53 81 74 84M51 66 65 71 74 84M102 70 112 74"/>',
    '<circle cx="26" cy="63" r="8"/><path d="M36 64 72 69 103 70M44 65 53 81 74 84M51 66 65 71 74 84M102 70 112 74"/>'
  ],
  bridge: [
    '<circle cx="27" cy="80" r="8"/><path d="M36 80 60 82 78 88 101 88M61 82 75 90 84 95M91 88 102 91"/>',
    '<circle cx="27" cy="80" r="8"/><path d="M36 80 61 61 79 58 101 82M61 61 68 83 79 91M91 76 102 86"/>'
  ],
  calf: [
    '<circle cx="67" cy="29" r="8"/><path d="M67 38 67 63M67 48 53 59M67 48 81 59M67 63 58 84 58 94M67 63 76 84 76 94"/>',
    '<circle cx="67" cy="26" r="8"/><path d="M67 35 67 60M67 46 53 57M67 46 81 57M67 60 58 81 58 88M67 60 76 81 76 88"/><path d="M51 94h14M70 94h14"/>'
  ],
  tibialis: [
    '<circle cx="58" cy="28" r="8"/><path d="M58 37v24m0-15L43 55 34 65M58 61 75 70 76 87M58 61 47 79 37 86M76 87h17"/>',
    '<circle cx="58" cy="28" r="8"/><path d="M58 37v24m0-15L43 55 34 65M58 61 75 70 76 79M58 61 47 79 37 86M76 79 91 69"/>'
  ],
  deadbug: [
    '<circle cx="26" cy="78" r="8"/><path d="M36 78 61 78 82 80M48 78 50 54 44 46M53 78 56 60 66 54M81 80 91 59 102 53M81 80 93 91 106 91"/>',
    '<circle cx="26" cy="78" r="8"/><path d="M36 78 61 78 82 80M48 78 50 57 42 63M53 78 57 58 69 53M81 80 94 58 105 53M81 80 91 91 101 91"/>'
  ],
  snow: [
    '<circle cx="29" cy="67" r="8"/><path d="M38 69 75 73 102 73M48 70 40 57 31 49M52 71 43 84 33 91M100 73 110 75"/>',
    '<circle cx="29" cy="67" r="8"/><path d="M38 69 75 73 102 73M48 70 53 52 66 45M52 71 58 88 70 95M100 73 110 75"/>'
  ],
  bird: [
    '<circle cx="36" cy="51" r="8"/><path d="M44 54 69 68 91 68M54 59 48 78 42 86M60 62 69 78 81 82M88 68 96 80 106 81"/>',
    '<circle cx="36" cy="51" r="8"/><path d="M44 54 69 68 91 68M54 59 48 78 42 86M60 62 72 77 84 78M88 68 101 54 113 49"/>'
  ],
  superman: [
    '<circle cx="29" cy="68" r="8"/><path d="M38 69 68 73 98 73M47 70 35 60 27 55M50 71 38 82 30 85M97 73 111 75"/>',
    '<circle cx="29" cy="68" r="8"/><path d="M38 69 68 68 98 72M47 69 34 51 25 47M50 70 37 56 29 52M97 72 111 75"/>'
  ],
  yraise: [
    '<circle cx="29" cy="67" r="8"/><path d="M38 69 75 73 102 73M49 70 43 58 35 51M53 71 49 83 40 90M100 73 110 75"/>',
    '<circle cx="29" cy="67" r="8"/><path d="M38 69 75 73 102 73M49 70 36 53 27 47M53 71 49 54 42 46M100 73 110 75"/>'
  ],
  curl: [
    '<circle cx="67" cy="29" r="8"/><path d="M67 38 67 62M67 47 49 57 49 72M67 47 83 58 83 72M67 62 57 84 56 95M67 62 77 84 78 95M44 74h11l-1 11h-9z"/>',
    '<circle cx="67" cy="29" r="8"/><path d="M67 38 67 62M67 47 49 57 54 69M67 47 83 58 78 69M54 69 61 72M78 69 72 72M67 62 57 84 56 95M67 62 77 84 78 95M56 68h15l-1 12H57z"/>'
  ],
  closegrip: [
    '<path d="M60 91h51M69 91V76M105 91V76"/><circle cx="22" cy="57" r="8"/><path d="M32 58 67 68 92 77M41 61 53 76 67 81M44 62 61 70 67 81M90 77 110 84"/>',
    '<path d="M60 91h51M69 91V76M105 91V76"/><circle cx="22" cy="57" r="8"/><path d="M32 58 67 68 92 77M41 61 52 72 67 78M44 62 60 68 67 78M90 77 110 84"/>'
  ]
};

function illustration(kind) {
  const frames = poses[kind] || poses.pushup;
  const bg = `exerciseBg-${kind}`;
  return `<svg class="exercise-art" viewBox="0 0 270 130" role="img" aria-label="Illustration en deux étapes du mouvement">
    <defs><linearGradient id="${bg}" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#263329"/><stop offset="1" stop-color="#1a221c"/></linearGradient></defs>
    <rect class="art-panel" x="5" y="8" width="126" height="112" rx="14" fill="url(#${bg})"/><rect class="art-panel" x="139" y="8" width="126" height="112" rx="14" fill="url(#${bg})"/>
    <path d="M17 100h103M151 100h103" stroke="#4b594b" stroke-width="2" stroke-linecap="round"/>
    <circle cx="20" cy="22" r="9" fill="#344234"/><circle cx="154" cy="22" r="9" fill="#344234"/>
    <text x="20" y="25" text-anchor="middle" fill="#d2e7b0" font-size="8" font-weight="700" font-family="system-ui">1</text><text x="154" y="25" text-anchor="middle" fill="#d2e7b0" font-size="8" font-weight="700" font-family="system-ui">2</text>
    <g class="pose-figure" transform="translate(8 4)" fill="none" stroke="#c6ed7d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${frames[0]}</g>
    <g class="pose-figure" transform="translate(142 4)" fill="none" stroke="#c6ed7d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${frames[1]}</g>
    <path class="motion-cue" d="M114 42h9m-4-4 4 4-4 4"/><path class="motion-cue" d="M248 42h9m-4-4 4 4-4 4"/>
    <text x="68" y="115" text-anchor="middle" fill="#9ba99a" font-size="8" font-weight="700" letter-spacing=".7" font-family="system-ui">POSITION DE DÉPART</text><text x="202" y="115" text-anchor="middle" fill="#9ba99a" font-size="8" font-weight="700" letter-spacing=".7" font-family="system-ui">FIN DU GESTE</text>
  </svg>`;
}

const item = (id, name, category, kind, muscles, description, steps, errors, tips, easier, harder, dosage) => ({
  id, name, category, illustration: illustration(kind), muscles, description, steps, errors, tips, easier, harder, dosage
});

export const exercises = [
  item('pushups', 'Pompes', 'Pectoraux', 'pushup', ['Pectoraux', 'triceps', 'épaules avant', 'sangle abdominale'], 'Garde le corps aligné et descends avec contrôle. Une amplitude confortable compte davantage que le nombre.', ['Place les mains un peu plus larges que les épaules, sous la poitrine.', 'Contracte doucement le ventre et les fessiers pour garder une ligne stable.', 'Plie les coudes en diagonale et approche la poitrine du sol.', 'Pousse le sol pour revenir sans verrouiller brutalement les coudes.'], ['Creuser le bas du dos.', 'Écarter les coudes à 90°.', 'Laisser tomber la tête ou raccourcir le mouvement.'], ['Expire en poussant. Arrête la série avant que la posture ne se dégrade.', 'Garde 1 à 2 répétitions en réserve.'], 'Pompes inclinées contre un mur ou une table stable.', 'Pompes au sol avec descente lente de 3 secondes.', '2 séries · 4 à 6 répétitions'),
  item('backpack-row', 'Rowing avec sac à dos', 'Dos', 'row', ['Grand dorsal', 'milieu du dos', 'biceps', 'épaules arrière'], 'Tire le sac vers les côtes en gardant le dos long. Commence avec un sac léger et fermé.', ['Tiens le sac à deux mains, pieds largeur du bassin.', 'Pousse les hanches en arrière et incline le buste, dos neutre.', 'Tire les coudes vers l’arrière, près du corps.', 'Redescends le sac lentement sans arrondir le dos.'], ['Arrondir le bas du dos.', 'Donner un à-coup avec le buste.', 'Hausser les épaules vers les oreilles.'], ['Regarde quelques mètres devant toi.', 'La charge doit rester facile à contrôler du début à la fin.'], 'Rowing sans charge, en marquant une pause en haut.', 'Ajouter une petite charge au sac ou ralentir la descente.', '2 séries · 8 à 12 répétitions'),
  item('squats', 'Squats au poids du corps', 'Jambes', 'squat', ['Quadriceps', 'fessiers', 'ischio-jambiers', 'tronc'], 'Assieds les hanches entre les jambes à une profondeur qui reste confortable et stable.', ['Place les pieds à peu près largeur des épaules, pointes légèrement ouvertes.', 'Pousse les hanches en arrière et plie les genoux.', 'Garde les pieds au sol et les genoux orientés vers les orteils.', 'Pousse le sol pour te redresser en soufflant.'], ['Genoux qui s’effondrent vers l’intérieur.', 'Talons qui décollent.', 'Descendre plus bas que ta mobilité ne le permet.'], ['Utilise une chaise comme repère de profondeur.', 'Garde le poids réparti sur tout le pied.'], 'Se relever d’une chaise avec les mains en appui si besoin.', 'Squat avec pause d’une seconde en bas.', '2 séries · 12 répétitions'),
  item('plank', 'Gainage avant-bras', 'Abdominaux et gainage', 'plank', ['Abdominaux', 'obliques', 'épaules', 'fessiers'], 'Maintiens une ligne stable des épaules aux chevilles, sans chercher à tenir jusqu’à l’épuisement.', ['Place les avant-bras au sol, coudes sous les épaules.', 'Recule les pieds et serre doucement les fessiers.', 'Garde le ventre engagé et respire calmement.', 'Pose les genoux avant que le bas du dos ne s’affaisse.'], ['Laisser le bassin tomber.', 'Bloquer la respiration.', 'Monter les hanches trop haut.'], ['Des séries courtes et propres sont plus utiles qu’un maintien forcé.', 'Pense à pousser le sol avec les avant-bras.'], 'Gainage sur les genoux.', 'Tendre un bras brièvement en alternance.', '2 séries · 20 secondes'),
  item('glute-bridge', 'Pont fessier', 'Fessiers', 'bridge', ['Fessiers', 'ischio-jambiers', 'abdominaux'], 'Pousse dans les talons et serre les fessiers en haut sans cambrer exagérément.', ['Allonge-toi sur le dos, genoux pliés et pieds à plat.', 'Place les pieds à distance confortable des fessiers.', 'Pousse les talons et monte le bassin jusqu’à aligner hanches et épaules.', 'Redescends lentement en gardant le contrôle.'], ['Pousser surtout sur la pointe des pieds.', 'Cambrer pour monter plus haut.', 'Laisser les genoux s’écarter.'], ['Expire pendant la montée.', 'Fais une courte pause en haut.'], 'Réduire l’amplitude et monter le bassin progressivement.', 'Pont avec pause de 2 secondes en haut.', '2 séries · 12 répétitions'),
  item('calf-raises', 'Élévations des mollets', 'Mollets', 'calf', ['Mollets', 'chevilles'], 'Monte sur la pointe des pieds de façon régulière, avec un appui léger pour l’équilibre.', ['Tiens-toi près d’un mur ou d’une chaise stable.', 'Garde les pieds parallèles et le poids réparti.', 'Monte lentement sur les pointes.', 'Redescends sans rebondir.'], ['Rebondir en bas.', 'Se pencher sur les mains.', 'Tourner les chevilles vers l’extérieur.'], ['Marque une pause en haut et en bas.', 'Utilise un appui uniquement pour l’équilibre.'], 'Faire le mouvement assis, sans charge.', 'Faire une jambe à la fois avec un appui stable.', '2 séries · 15 répétitions'),
  item('tibialis-raises', 'Relevés des pointes de pieds', 'Jambes', 'tibialis', ['Tibiaux antérieurs'], 'Dos près d’un mur, relève l’avant des pieds sans décoller les talons, puis redescends lentement.', ['Place-toi près d’un mur stable, pieds écartés à la largeur du bassin.', 'Garde les talons au sol et le buste confortable.', 'Ramène les orteils vers les tibias sans basculer le corps.', 'Redescends doucement et arrête si la cheville devient douloureuse.'], ['Basculer le buste en arrière pour aider le mouvement.', 'Faire des à-coups.', 'Continuer malgré une douleur à la cheville.'], ['Commence par une petite amplitude et quelques répétitions.', 'Un appui léger au mur peut aider à garder l’équilibre.'], 'Assis, relever doucement les pointes de pieds.', 'Ajouter une répétition seulement si le geste reste facile et contrôlé.', '2 séries · 8 à 12 répétitions'),
  item('dead-bug', 'Dead bug', 'Abdominaux et gainage', 'deadbug', ['Abdominaux profonds', 'obliques', 'fléchisseurs de hanche'], 'Déplace bras et jambe opposés sans laisser le bas du dos se décoller du sol.', ['Allonge-toi, bras vers le plafond et genoux au-dessus des hanches.', 'Expire et rapproche doucement les côtes du bassin.', 'Allonge un bras et la jambe opposée vers le sol.', 'Reviens puis alterne de côté.'], ['Creuser le bas du dos.', 'Aller trop vite ou trop loin.', 'Bloquer la respiration.'], ['Réduis l’amplitude si le dos se décolle.', 'Garde un rythme lent et régulier.'], 'Ne bouger qu’un bras ou qu’une jambe à la fois.', 'Tendre la jambe plus près du sol en gardant le dos stable.', '2 séries · 8 répétitions par côté'),
  item('incline-pushups', 'Pompes inclinées', 'Pectoraux', 'incline', ['Pectoraux', 'triceps', 'épaules', 'tronc'], 'Une variante de pompe plus accessible. Plus le support est haut, plus l’exercice est facile.', ['Pose les mains sur un support stable, hauteur poitrine ou taille.', 'Recule les pieds et aligne le corps.', 'Approche la poitrine du support en contrôlant la descente.', 'Repousse le support et garde le corps gainé.'], ['Choisir un support instable.', 'Laisser les hanches s’affaisser.', 'Faire un demi-mouvement trop rapide.'], ['Vérifie la stabilité du support avant de commencer.', 'Ajuste la hauteur pour garder 2 répétitions en réserve.'], 'Pompes au mur.', 'Utiliser un support un peu plus bas.', '2 séries · 5 répétitions'),
  item('reverse-snow-angels', 'Oiseaux inversés au sol', 'Épaules', 'snow', ['Épaules arrière', 'trapèzes moyens', 'haut du dos'], 'Allongé sur le ventre, fais glisser les bras en arc de cercle en gardant la nuque relâchée.', ['Allonge-toi sur le ventre, front posé sur une serviette.', 'Tends les bras en diagonale, pouces vers le plafond.', 'Déplace lentement les bras vers les hanches sans hausser les épaules.', 'Reviens au départ avec contrôle.'], ['Forcer l’amplitude.', 'Hausser les épaules.', 'Creuser fortement le bas du dos.'], ['Garde une amplitude sans douleur.', 'Les mains peuvent rester proches du sol.'], 'Faire le mouvement avec les coudes pliés.', 'Marquer une pause de 2 secondes près des hanches.', '2 séries · 8 à 10 répétitions'),
  item('bird-dog', 'Bird dog', 'Dos', 'bird', ['Dos', 'fessiers', 'abdominaux', 'épaules'], 'Depuis quatre appuis, allonge le bras et la jambe opposés sans faire pivoter le bassin.', ['Place les mains sous les épaules et les genoux sous les hanches.', 'Engage doucement le ventre et regarde le sol.', 'Tends un bras et la jambe opposée à hauteur du buste.', 'Reviens au centre et change de côté.'], ['Tourner le bassin.', 'Lever la jambe trop haut.', 'Creuser le dos ou retenir son souffle.'], ['Imagine un verre posé sur le bas du dos.', 'Commence par de petits mouvements.'], 'Tendre seulement un bras ou une jambe.', 'Tenir la position 3 secondes sans bouger le bassin.', '2 séries · 6 répétitions par côté'),
  item('superman', 'Superman doux', 'Dos', 'superman', ['Érecteurs du rachis', 'fessiers', 'épaules arrière'], 'Une petite extension contrôlée du haut du corps et des jambes. Garde une amplitude très modérée.', ['Allonge-toi sur le ventre, front près du sol et bras allongés.', 'Contracte doucement le ventre et les fessiers.', 'Décolle légèrement une main et le pied opposé, ou les deux bras.', 'Repose lentement et relâche.'], ['Lever haut le buste en forçant le bas du dos.', 'Jeter la tête en arrière.', 'Continuer malgré une gêne lombaire.'], ['Privilégie une amplitude minimale.', 'Arrête immédiatement si tu ressens une douleur.'], 'Lever un bras à la fois sans décoller les jambes.', 'Tenir un petit décollement 2 secondes.', '2 séries · 6 répétitions contrôlées'),
  item('prone-y-raise', 'Élévations en Y au sol', 'Épaules', 'yraise', ['Épaules arrière', 'trapèzes', 'stabilisateurs des omoplates'], 'Allongé sur le ventre, lève légèrement les bras en forme de Y pour activer le haut du dos.', ['Allonge-toi sur le ventre, bras en Y et pouces vers le plafond.', 'Garde le front près du sol et les épaules loin des oreilles.', 'Décolle légèrement les mains en rapprochant les omoplates.', 'Redescends doucement.'], ['Hausser les épaules.', 'Lever les mains trop haut.', 'Creuser le bas du dos.'], ['Le mouvement est petit et vient des omoplates.', 'Aucune charge n’est nécessaire.'], 'Faire le mouvement bras pliés en W.', 'Tenir chaque répétition 2 secondes en haut.', '2 séries · 8 répétitions'),
  item('backpack-curl', 'Curl avec sac à dos', 'Biceps', 'curl', ['Biceps', 'avant-bras'], 'Tiens un sac léger par sa poignée et plie les coudes sans balancer le buste.', ['Tiens le sac près du corps, bras détendus.', 'Garde les coudes près des côtes.', 'Plie les coudes pour remonter le sac sans élan.', 'Redescends lentement jusqu’à presque tendre les bras.'], ['Balancer le dos.', 'Laisser les coudes partir vers l’avant.', 'Choisir une charge difficile à contrôler.'], ['Commence avec un sac presque vide.', 'Garde les poignets dans le prolongement des avant-bras.'], 'Faire le mouvement sans charge ou avec une bouteille légère.', 'Ajouter un peu de charge uniquement si les deux séries restent faciles.', '2 séries · 8 à 12 répétitions'),
  item('close-grip-incline', 'Pompes inclinées prise serrée', 'Triceps', 'closegrip', ['Triceps', 'pectoraux', 'épaules'], 'Une pompe inclinée avec les mains un peu plus rapprochées pour solliciter davantage les triceps.', ['Choisis une table stable et pose les mains sous les épaules.', 'Recule les pieds, corps aligné.', 'Plie les coudes près du buste et approche la poitrine du support.', 'Repousse sans verrouiller les coudes.'], ['Rapprocher exagérément les mains.', 'Écarter les coudes.', 'Utiliser un support instable.'], ['Une prise à largeur d’épaules est suffisante.', 'Arrête si les poignets deviennent inconfortables.'], 'Pompes au mur avec les mains rapprochées.', 'Baisser légèrement la hauteur du support.', '2 séries · 5 à 8 répétitions')
];

export const categories = ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Abdominaux et gainage', 'Jambes', 'Fessiers', 'Mollets'];
export const workouts = {
  A: ['pushups', 'backpack-row', 'squats', 'plank', 'reverse-snow-angels'],
  B: ['backpack-row', 'glute-bridge', 'calf-raises', 'dead-bug', 'incline-pushups', 'bird-dog']
};
export const exerciseById = Object.fromEntries(exercises.map(exercise => [exercise.id, exercise]));

