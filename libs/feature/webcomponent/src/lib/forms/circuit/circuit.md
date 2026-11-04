Le composant **Circuit** affiche un schéma électrique décrit en JSON. Le même JSON sert à dessiner le schéma et, côté correcteur, à reconstituer le circuit : deux bornes posées au même point de la grille sont reliées. Il est facile de construire ce JSON dans un `builder` ou un `grader` Python ou JavaScript.

Le composant a deux usages :

- **figure** (`disabled: true`) : schéma d'un énoncé, d'une correction ou d'un retour, avec les interrupteurs dans la position choisie par l'auteur ;
- **saisie** : l'élève clique sur un interrupteur (clic gauche) pour le faire passer à la position suivante. Le correcteur reçoit dans `value` la position de **tous** les interrupteurs, par identifiant.

Le clavier fonctionne aussi : chaque interrupteur est un bouton (Tab pour l'atteindre, Entrée ou Espace pour le manœuvrer).

### Exemple

```json
{
  "unit": 40,
  "elements": [
    { "type": "V", "id": "E", "from": [0, 4], "to": [0, 0], "value": 12, "u": "E" },
    { "type": "switch", "id": "K1", "from": [0, 0], "to": [3, 0] },
    { "type": "lamp", "id": "L1", "from": [3, 0], "to": [3, 4] },
    { "type": "wire", "points": [[3, 4], [0, 4]] }
  ]
}
```

Avec `value: {"K1": 1}`, l'interrupteur est dessiné fermé. Après un clic de l'élève, le correcteur lit `{"K1": 0}`.

### Grille et connexions

Les positions sont données en **unités de grille** (`unit` pixels par unité, 40 par défaut ; l'axe des y est orienté vers le bas). Trois règles déterminent les connexions :

- deux bornes (ou sommets de fil) au même point sont reliées ;
- une borne posée **à l'intérieur d'un fil** est reliée à ce fil (jonction en T, un point est dessiné) ;
- deux fils qui se croisent sans sommet commun ne sont **pas** reliés.

Une borne posée sur le corps d'un dipôle n'est pas reliée : c'est presque toujours une erreur de dessin. Les erreurs de description (type inconnu, identifiant en double, interrupteur sans `id`…) s'affichent au-dessus du schéma.

### Dipôles (`from`, `to`)

| type | symbole | remarques |
|---|---|---|
| `R`, `Z`, `Rvar` | résistance, impédance, résistance variable | `value` en Ω |
| `L`, `C`, `Cpol` | bobine, condensateur, condensateur polarisé | `value` en H, F |
| `V`, `battery` | source de tension continue, pile | `from` = borne −, `to` = borne + |
| `Vac` | source sinusoïdale | |
| `I` | source de courant | le courant sort par `to` |
| `Vdep`, `Idep` | sources commandées (losange) | |
| `diode`, `led`, `zener` | diodes | `from` = anode, `to` = cathode |
| `lamp`, `motor`, `fuse` | lampe, moteur, fusible | |
| `ammeter`, `voltmeter` | ampèremètre, voltmètre | |
| `switch`, `push` | interrupteur, bouton poussoir | **manœuvrables** : 0 ouvert, 1 fermé |

Propriétés communes : `id`, `label` (libellé ; par défaut tiré de l'identifiant, `R1` → R₁ ; `""` pour le masquer), `value` (nombre affiché avec son unité et son préfixe, ou texte), `show_value: false`, `value_label` (texte affiché à la place de la valeur), `label_side` / `value_side` (`"left"`, `"right"`).

Annotations : `u` (flèche de tension, en convention récepteur pour les récepteurs et générateur pour les sources) et `i` (flèche de courant sur le fil, de `from` vers `to`). Chacune accepte un texte (`"u": "U_R"`) ou un objet `{"label": "U_R", "dir": -1, "side": "left"}`. `"i_at": "to"` place la flèche de courant du côté de `to`. `"lit": true` dessine une lampe ou une DEL allumée.

### Éléments placés (`at`, `rot`, `flip`)

`rot` tourne l'élément (0, 90, 180, 270, sens horaire) ; `flip: true` le retourne (par exemple pour placer l'entrée + d'un AOP en haut).

| type | bornes (repère local) | rôle |
|---|---|---|
| `gnd` | `p` (0,0) | masse |
| `rail` | `p` (0,0) | alimentation (« +15 V ») : `value`, `label` |
| `terminal` | `p` (0,0) | borne d'entrée ou de sortie (petit cercle) |
| `node` | — | nom d'un nœud (`label`), point de jonction |
| `selector` | `c` (0,0) ; `t0`…`tn−1` en (2, 2k−(n−1)) | commutateur à `throws` positions (2 par défaut), **manœuvrable** ; `labels` ; `off: true` ajoute une position sans contact (−1) |
| `toggle` | `p` (0,0) | entrée logique 0/1, **manœuvrable** |
| `probe` | `p` (0,0) | sortie logique (voyant) |
| `clock` | `p` (0,0) | horloge |
| `npn`, `pnp` | `B` (−1,0), `C` (0,−1), `E` (0,1) | transistors bipolaires |
| `nmos`, `pmos` | `G` (−1,0), `D` (0,−1), `S` (0,1) | transistors MOS |
| `opamp` | `inm` (−2,−1), `inp` (−2,1), `out` (2,0) | amplificateur opérationnel |
| `and`, `or`, `nand`, `nor`, `xor`, `xnor` | `a`, `b` (−2,∓1), `out` (2,0) | portes ; `inputs`: 2 à 4 |
| `not`, `buf` | `a` (−2,0), `out` (2,0) | inverseur, tampon |
| `transformer` | `p1` (−1,−1), `p2` (−1,1), `s1` (1,−1), `s2` (1,1) | transformateur |
| `block` | `in` (−w/2,0), `out` (w/2,0) ou `pins` | bloc (`w`, `h`, `text`) ; `pins: [{"name", "at", "label", "clock"}]` pour une bascule, un compteur… |
| `sum` | `w`, `e`, `n`, `s` à 0,5 du centre | comparateur de schéma-bloc ; `signs: {"w": "+", "s": "-"}` |
| `text` | — | texte libre (`text`) |
| `iarrow` | — | flèche de courant sur un fil (`dir`: right, left, up, down) |

Les portes logiques sont dessinées à l'américaine ; `"gates": "iec"` au niveau du schéma (ou `"style": "iec"` sur une porte) donne les symboles rectangulaires (&, ≥1, =1).

### Fils et flèches

- `wire` : `points` (au moins deux points), `arrow` (`"end"`, `"start"`, `"both"`) pour les schémas-blocs, `label`.
- `varrow` : flèche de tension entre deux points quelconques (`from`, `to`, `label`, `offset`, `side`). La pointe est du côté de `to`.

### Libellés

Les libellés acceptent les indices et exposants (`R_1`, `V_{CC}`, `x^2`), la barre (`\overline{Q}`) et quelques lettres grecques (`\omega`, `\beta`, `\Delta`…).

### Valeur transmise au correcteur

```json
{ "K1": 1, "K2": 0, "S": 2, "a": 1 }
```

Toutes les positions sont présentes, même celles que l'élève n'a pas touchées. Une position absente ou invalide est remplacée par la position initiale (`state` dans le schéma). Un interrupteur `"fixed": true` est dessiné mais ne peut pas être manœuvré.

**Le correcteur ne doit faire confiance qu'à `value`** : le navigateur renvoie aussi `schema`, que l'élève peut modifier. Le correcteur reconstruit son propre schéma (par exemple en relançant le générateur avec la même graine).

### Correction en Python

Le template « Électronique » fournit la bibliothèque `elec.py` : elle reconstitue le circuit à partir du même JSON, le résout (continu, sinusoïdal, logique) et vérifie un objectif (« la lampe L2 est allumée », « la sortie S vaut 1 »). Sans cette bibliothèque, il suffit de comparer `value` aux positions attendues.
