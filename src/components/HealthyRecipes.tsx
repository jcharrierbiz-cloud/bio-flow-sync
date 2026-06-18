import { useState } from "react";
import { Clock, Flame, Leaf, ChefHat, X, Zap, Heart, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Recipe {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  time: number; // minutes
  kcal: number;
  protein: number;
  category: "Énergie" | "Récup" | "Focus" | "Light" | "Force";
  difficulty: "Facile" | "Moyen";
  gradient: string;
  ingredients: string[];
  steps: string[];
  benefits: string[];
  bestMoment: string;
}

const RECIPES: Recipe[] = [
  {
    id: "1",
    emoji: "🥣",
    name: "Bowl Avoine Banane Amandes",
    tagline: "Le carburant idéal du matin",
    time: 7,
    kcal: 420,
    protein: 14,
    category: "Énergie",
    difficulty: "Facile",
    gradient: "from-energy/30 to-ai-violet/20",
    ingredients: [
      "60g flocons d'avoine",
      "250ml lait d'amande",
      "1 banane mûre",
      "20g amandes effilées",
      "1 c. à café miel",
      "Cannelle au goût",
    ],
    steps: [
      "Verser l'avoine et le lait dans une casserole, chauffer 4 min à feu doux.",
      "Trancher la banane, ajouter dans le bowl chaud.",
      "Parsemer d'amandes, filet de miel et cannelle.",
    ],
    benefits: ["IG bas", "Riche en fibres", "Magnésium"],
    bestMoment: "Petit-déj 7h-9h",
  },
  {
    id: "2",
    emoji: "🥗",
    name: "Buddha Bowl Quinoa Poulet",
    tagline: "Équilibre parfait protéines/glucides",
    time: 20,
    kcal: 540,
    protein: 38,
    category: "Force",
    difficulty: "Facile",
    gradient: "from-intensity/30 to-warning/20",
    ingredients: [
      "120g quinoa",
      "150g blanc de poulet",
      "100g pois chiches",
      "1/2 avocat",
      "Épinards frais",
      "Citron, huile d'olive",
    ],
    steps: [
      "Cuire le quinoa 12 min dans l'eau bouillante salée.",
      "Snacker le poulet à la poêle 4 min/face, trancher.",
      "Composer le bowl, assaisonner citron/huile d'olive.",
    ],
    benefits: ["Protéines complètes", "Récupération musculaire", "Satiété"],
    bestMoment: "Déjeuner 12h-14h",
  },
  {
    id: "3",
    emoji: "🍳",
    name: "Omelette Épinards Feta",
    tagline: "Express, riche en protéines",
    time: 8,
    kcal: 320,
    protein: 26,
    category: "Force",
    difficulty: "Facile",
    gradient: "from-warning/30 to-energy/20",
    ingredients: [
      "3 œufs frais",
      "Poignée d'épinards",
      "40g feta émiettée",
      "1 c. à café huile d'olive",
      "Poivre, herbes de Provence",
    ],
    steps: [
      "Battre les œufs, ajouter herbes et poivre.",
      "Faire tomber les épinards à la poêle 1 min.",
      "Verser les œufs, ajouter la feta, plier après 2 min.",
    ],
    benefits: ["Riche en B12", "Faible IG", "Saturation rapide"],
    bestMoment: "Midi ou soir",
  },
  {
    id: "4",
    emoji: "🐟",
    name: "Saumon Patate Douce Brocoli",
    tagline: "Oméga-3 + récup totale",
    time: 25,
    kcal: 580,
    protein: 36,
    category: "Récup",
    difficulty: "Facile",
    gradient: "from-energy/30 to-intensity/20",
    ingredients: [
      "150g pavé de saumon",
      "200g patate douce",
      "150g brocolis",
      "Citron, huile d'olive",
      "Ail, paprika fumé",
    ],
    steps: [
      "Couper la patate douce en cubes, four 200°C 20 min.",
      "Vapeur des brocolis 6 min al dente.",
      "Saumon à la poêle 3 min/face, citron pour finir.",
    ],
    benefits: ["Oméga-3 EPA/DHA", "Anti-inflammatoire", "Vitamine A"],
    bestMoment: "Dîner post-entraînement",
  },
  {
    id: "5",
    emoji: "🥑",
    name: "Toast Avocat Œuf Poché",
    tagline: "Brunch performance",
    time: 10,
    kcal: 380,
    protein: 18,
    category: "Énergie",
    difficulty: "Moyen",
    gradient: "from-ai-violet/30 to-energy/20",
    ingredients: [
      "1 tranche pain complet épais",
      "1/2 avocat mûr",
      "1 œuf frais",
      "Vinaigre blanc",
      "Piment d'Espelette, citron",
    ],
    steps: [
      "Pocher l'œuf 3 min dans l'eau vinaigrée.",
      "Écraser l'avocat avec citron et piment sur le pain grillé.",
      "Déposer l'œuf poché, fleur de sel.",
    ],
    benefits: ["Bons lipides", "Choline", "Énergie stable"],
    bestMoment: "Brunch 10h-12h",
  },
  {
    id: "6",
    emoji: "🍜",
    name: "Soupe Miso Tofu Soba",
    tagline: "Réconfort + protéines végétales",
    time: 15,
    kcal: 410,
    protein: 22,
    category: "Light",
    difficulty: "Facile",
    gradient: "from-energy/30 to-ai-violet/20",
    ingredients: [
      "80g nouilles soba",
      "100g tofu ferme",
      "2 c. à soupe pâte miso",
      "Champignons shiitake",
      "Wakame, oignon vert",
    ],
    steps: [
      "Cuire les soba selon paquet, réserver.",
      "Chauffer 600ml d'eau, dissoudre le miso hors du feu.",
      "Ajouter tofu en dés, shiitake, wakame, soba.",
    ],
    benefits: ["Probiotiques", "Faible calorie", "Hydratant"],
    bestMoment: "Dîner léger",
  },
  {
    id: "7",
    emoji: "🥤",
    name: "Smoothie Vert Performance",
    tagline: "Boost vitaminé express",
    time: 4,
    kcal: 260,
    protein: 20,
    category: "Focus",
    difficulty: "Facile",
    gradient: "from-energy/30 to-warning/20",
    ingredients: [
      "1 banane",
      "1 poignée épinards",
      "30g whey vanille (ou skyr)",
      "1 c. à soupe beurre amande",
      "250ml lait d'amande",
    ],
    steps: [
      "Tout mettre dans le blender.",
      "Mixer 45 s à pleine puissance.",
      "Servir immédiatement bien frais.",
    ],
    benefits: ["Anti-oxydants", "Récup rapide", "Focus mental"],
    bestMoment: "Post-séance ou collation",
  },
  {
    id: "8",
    emoji: "🍛",
    name: "Curry Lentilles Corail",
    tagline: "Protéines végé + fibres",
    time: 22,
    kcal: 480,
    protein: 24,
    category: "Récup",
    difficulty: "Facile",
    gradient: "from-warning/30 to-intensity/20",
    ingredients: [
      "150g lentilles corail",
      "200ml lait de coco",
      "1 oignon, 2 gousses ail",
      "1 c. à soupe curry, gingembre",
      "Tomate concassée 200g",
    ],
    steps: [
      "Faire revenir oignon, ail, gingembre 3 min.",
      "Ajouter épices, tomate, lait de coco, lentilles + 300ml eau.",
      "Mijoter 15 min jusqu'à texture crémeuse.",
    ],
    benefits: ["Fer végétal", "Satiété longue", "Magnésium"],
    bestMoment: "Déjeuner ou dîner",
  },
  {
    id: "9",
    emoji: "🥚",
    name: "Skyr Fruits Rouges Granola",
    tagline: "Collation haute protéine",
    time: 3,
    kcal: 290,
    protein: 22,
    category: "Light",
    difficulty: "Facile",
    gradient: "from-ai-violet/30 to-intensity/20",
    ingredients: [
      "200g skyr nature",
      "80g fruits rouges (frais ou surgelés)",
      "30g granola maison",
      "1 c. à café miel",
      "Quelques graines de chia",
    ],
    steps: [
      "Verser le skyr dans un bol.",
      "Ajouter fruits rouges, granola, miel.",
      "Saupoudrer de graines de chia.",
    ],
    benefits: ["Caséine longue absorption", "Faible sucre", "Anti-oxydants"],
    bestMoment: "Collation 16h ou soir",
  },
  {
    id: "10",
    emoji: "🍝",
    name: "Pâtes Complètes Pesto Pois",
    tagline: "Glucides intelligents avant effort",
    time: 12,
    kcal: 510,
    protein: 20,
    category: "Énergie",
    difficulty: "Facile",
    gradient: "from-energy/30 to-warning/20",
    ingredients: [
      "100g pâtes complètes",
      "100g petits pois",
      "2 c. à soupe pesto basilic",
      "30g parmesan",
      "Pignons, citron",
    ],
    steps: [
      "Cuire les pâtes al dente avec les petits pois 8 min.",
      "Égoutter, garder 2 c. à soupe d'eau de cuisson.",
      "Mélanger avec pesto, parmesan, pignons, zeste citron.",
    ],
    benefits: ["IG modéré", "Énergie durable", "Magnésium"],
    bestMoment: "2-3h avant l'effort",
  },
];

const CATEGORY_STYLES: Record<Recipe["category"], { color: string; icon: typeof Zap }> = {
  Énergie: { color: "bg-energy/15 text-energy border-energy/25", icon: Zap },
  Récup: { color: "bg-ai-violet/15 text-ai-violet border-ai-violet/25", icon: Heart },
  Focus: { color: "bg-warning/15 text-warning border-warning/25", icon: Sparkles },
  Light: { color: "bg-foreground/10 text-foreground border-foreground/15", icon: Leaf },
  Force: { color: "bg-intensity/15 text-intensity border-intensity/25", icon: Flame },
};

export default function HealthyRecipes() {
  const [open, setOpen] = useState<Recipe | null>(null);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4 text-energy" />
          <h2 className="text-sm font-semibold text-foreground">Recettes saines</h2>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai-violet/15 text-ai-violet border border-ai-violet/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Sélection IA
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground -mt-1">
        10 recettes rapides analysées pour ton énergie et ta récup.
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
        {RECIPES.map((r) => {
          const CatIcon = CATEGORY_STYLES[r.category].icon;
          return (
            <button
              key={r.id}
              onClick={() => setOpen(r)}
              className={`shrink-0 w-44 snap-start rounded-2xl p-3 text-left border border-glass-border bg-gradient-to-br ${r.gradient} hover:scale-[1.02] hover:border-energy/40 transition-all`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl drop-shadow">{r.emoji}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${CATEGORY_STYLES[r.category].color} flex items-center gap-1`}>
                  <CatIcon className="w-2.5 h-2.5" />
                  {r.category}
                </span>
              </div>
              <p className="text-[13px] font-semibold text-foreground leading-tight line-clamp-2">
                {r.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                {r.tagline}
              </p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-glass-border/50">
                <span className="flex items-center gap-1 text-[10px] text-foreground">
                  <Clock className="w-2.5 h-2.5 text-energy" />
                  <span className="mono">{r.time}'</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] text-foreground">
                  <Flame className="w-2.5 h-2.5 text-intensity" />
                  <span className="mono">{r.kcal}</span>
                </span>
                <span className="text-[10px] text-foreground mono ml-auto">{r.protein}g P</span>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-card border-glass-border">
          {open && (
            <>
              <DialogHeader>
                <div className={`-mx-6 -mt-6 mb-2 px-6 pt-6 pb-4 rounded-t-lg bg-gradient-to-br ${open.gradient}`}>
                  <div className="flex items-start justify-between">
                    <span className="text-5xl drop-shadow-lg">{open.emoji}</span>
                    <button
                      onClick={() => setOpen(null)}
                      className="w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <DialogTitle className="text-foreground text-lg mt-2">{open.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground">{open.tagline}</p>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Temps", value: `${open.time}'`, icon: Clock, color: "text-energy" },
                    { label: "Kcal", value: open.kcal, icon: Flame, color: "text-intensity" },
                    { label: "Prot", value: `${open.protein}g`, icon: Zap, color: "text-warning" },
                    { label: "Niveau", value: open.difficulty, icon: ChefHat, color: "text-ai-violet" },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary/60 rounded-lg p-2 text-center">
                      <s.icon className={`w-3.5 h-3.5 mx-auto ${s.color}`} />
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
                      <p className="text-xs font-bold text-foreground mono">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {open.benefits.map((b, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-energy/10 text-energy border border-energy/20">
                      ✓ {b}
                    </span>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Ingrédients</p>
                  <ul className="space-y-1 bg-secondary/40 rounded-xl p-3">
                    {open.ingredients.map((ing, i) => (
                      <li key={i} className="text-[12px] text-foreground flex gap-2">
                        <span className="text-energy">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Étapes</p>
                  <ol className="space-y-2">
                    {open.steps.map((step, i) => (
                      <li key={i} className="text-[12px] text-foreground flex gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-energy/15 text-energy text-[10px] font-bold flex items-center justify-center mono">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="bg-ai-violet/10 border border-ai-violet/20 rounded-xl p-3 flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-ai-violet shrink-0 mt-0.5" />
                  <p className="text-[11px] text-foreground">
                    <span className="text-ai-violet font-semibold">Timing optimal :</span> {open.bestMoment}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
