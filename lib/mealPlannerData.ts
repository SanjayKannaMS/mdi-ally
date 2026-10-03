export type Diet = 'Vegetarian' | 'Non-Vegetarian' | 'Vegan';

export interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  mealType: string;
  diet: Diet;
  subtype: string;
  carbs: number;
  fiber: number;
  protein: number;
  emoji: string;
  imageUrl?: string;
  desc: string;
  ingredients: string[];
  steps: string[];
}

/** One meal type's macro targets and how many recipe options to suggest for it. */
export interface MealSlot {
  mealType: string;
  carbs: number;
  fiber: number;
  protein: number;
  count: number;
}

export const CUISINES = [
  'Continental',
  'American',
  'Asian',
  'Indian',
  'Italian',
  'Mexican',
  'Mediterranean',
  'Middle Eastern',
  'Latin American',
] as const;

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Smoothie', 'Dessert'] as const;

export const DIET_SUBTYPES: Record<Diet, string[]> = {
  Vegetarian: ['Dairy & Paneer', 'Plant-Based Protein', 'Nuts & Seeds', 'Grains & Veggies'],
  'Non-Vegetarian': ['Chicken', 'Beef', 'Mutton/Goat', 'Fish', 'Seafood', 'Pork', 'Eggs'],
  Vegan: ['Plant-Based Protein', 'Nuts & Seeds', 'Grains & Veggies'],
};

export const CUISINE_STYLES: Record<string, string> = {
  Continental: 'bg-indigo-50 text-indigo-700',
  American: 'bg-sky-50 text-sky-700',
  Asian: 'bg-rose-50 text-rose-700',
  Indian: 'bg-amber-50 text-amber-700',
  Italian: 'bg-emerald-50 text-emerald-700',
  Mexican: 'bg-orange-50 text-orange-700',
  Mediterranean: 'bg-cyan-50 text-cyan-700',
  'Middle Eastern': 'bg-fuchsia-50 text-fuchsia-700',
  'Latin American': 'bg-lime-50 text-lime-700',
};

// Photos are Wikimedia Commons files, downloaded once into public/recipes/ by
// scripts/download-recipe-images.mjs (hotlinking them gets rate-limited with HTTP 429).
// The local name must match localName() in that script.
function localRecipeImage(file: string): string {
  const name = decodeURIComponent(file).replace(/\.[a-z]+$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `/recipes/${name}.jpg`;
}

const IMG = localRecipeImage;

export const RECIPES: Recipe[] = [
  {
    id: 'cont-1', name: 'Avocado & Poached Egg Sourdough', cuisine: 'Continental', mealType: 'Breakfast',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 30, fiber: 7, protein: 15, emoji: '🥑',
    imageUrl: IMG('Avocado_toast_with_eggs_(28508171495).jpg'),
    desc: 'Artisan sourdough toast with mashed avocado, poached eggs, and microgreens.',
    ingredients: ['2 slices artisan sourdough', '1 ripe Hass avocado', '2 large organic eggs', '1 tsp lemon juice', 'Salt, pepper, & microgreens'],
    steps: ['Toast sourdough slices until golden and crisp.', 'Mash avocado with lemon juice, salt, and pepper.', 'Poach eggs in simmering water for 3 minutes.', 'Spread avocado on toast and top with poached eggs.'],
  },
  {
    id: 'cont-2', name: 'Herb Grilled Chicken & Quinoa Salad', cuisine: 'Continental', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 36, fiber: 8, protein: 40, emoji: '🍗',
    imageUrl: IMG('Biaggi%E2%80%99s_Chopped_Chicken_Salad.jpg'),
    desc: 'Tender grilled chicken breast over fluffy quinoa, mixed greens, and light vinaigrette.',
    ingredients: ['180g chicken breast', '1 cup cooked quinoa', '2 cups mixed greens', '1 tbsp olive oil', 'Balsamic dressing'],
    steps: ['Season chicken with herbs and grill until 165°F.', 'Cook quinoa according to package.', 'Toss greens with olive oil and balsamic.', 'Serve warm chicken over quinoa and salad.'],
  },
  {
    id: 'cont-3', name: 'Baked Atlantic Salmon & Asparagus', cuisine: 'Continental', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 10, fiber: 5, protein: 38, emoji: '🐟',
    imageUrl: IMG('Baked_fillet_with_asparagous.JPG'),
    desc: 'Oven-roasted salmon with garlic herbs and tender crisp asparagus spears.',
    ingredients: ['200g salmon fillet', '10 spears asparagus', '1 tbsp olive oil', '2 cloves minced garlic', 'Lemon wedges'],
    steps: ['Preheat oven to 400°F.', 'Arrange salmon and asparagus on baking sheet.', 'Drizzle with olive oil, garlic, salt, and pepper.', 'Bake 12-15 minutes until flaky.'],
  },
  {
    id: 'cont-4', name: 'Prosciutto & Melon Bites', cuisine: 'Continental', mealType: 'Snack',
    diet: 'Non-Vegetarian', subtype: 'Pork', carbs: 15, fiber: 2, protein: 10, emoji: '🍈',
    imageUrl: IMG('Prosciutto_di_Parma_e_melone.jpg'),
    desc: 'Sweet cantaloupe melon wrapped in savory cured continental prosciutto.',
    ingredients: ['150g cantaloupe chunks', '50g sliced prosciutto', 'Fresh mint leaves'],
    steps: ['Cut cantaloupe into cubes.', 'Wrap each cube with prosciutto.', 'Garnish with mint leaves.'],
  },
  {
    id: 'cont-5', name: 'Green Power Berry Smoothie', cuisine: 'Continental', mealType: 'Smoothie',
    diet: 'Vegan', subtype: 'Nuts & Seeds', carbs: 28, fiber: 6, protein: 20, emoji: '🫐',
    imageUrl: IMG('Gr%C3%BCnes_Smoothie.jpg'),
    desc: 'Spinach, mixed berries, almond milk, and plant protein.',
    ingredients: ['1 cup baby spinach', '1/2 cup frozen berries', '1 scoop plant protein', '1 cup almond milk'],
    steps: ['Blend almond milk and spinach until smooth.', 'Add berries and protein powder.', 'Blend on high and serve.'],
  },
  {
    id: 'cont-6', name: 'Dark Chocolate & Raspberry Mousse', cuisine: 'Continental', mealType: 'Dessert',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 24, fiber: 4, protein: 5, emoji: '🍫',
    imageUrl: IMG('Chocolate_Mousse.jpg'),
    desc: 'Velvety dark chocolate mousse garnished with fresh raspberries.',
    ingredients: ['50g 85% dark chocolate', '100g Greek yogurt', '1 tsp honey', '1/4 cup raspberries'],
    steps: ['Melt dark chocolate.', 'Whisk into Greek yogurt with honey.', 'Chill 30 minutes and top with raspberries.'],
  },

  {
    id: 'amer-1', name: 'Classic Protein Oatmeal & Berries', cuisine: 'American', mealType: 'Breakfast',
    diet: 'Vegan', subtype: 'Grains & Veggies', carbs: 45, fiber: 8, protein: 22, emoji: '🥣',
    imageUrl: IMG('Oatmeal_with_Blueberries_(5076894938)_2.jpg'),
    desc: 'Rolled oats cooked with cinnamon, topped with fresh blueberries and plant protein.',
    ingredients: ['1/2 cup rolled oats', '1 cup water or milk', '1 scoop plant protein', '1/2 cup blueberries', 'Cinnamon'],
    steps: ['Simmer oats and liquid for 5 minutes.', 'Stir in protein powder and cinnamon.', 'Top with blueberries.'],
  },
  {
    id: 'amer-2', name: 'Turkey Club Wrap with Greens', cuisine: 'American', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 38, fiber: 5, protein: 35, emoji: '🌯',
    imageUrl: IMG('Turkey_Pepperoni_Sandwich_wraps.jpg'),
    desc: 'Lean sliced turkey breast, crisp lettuce, tomato, and light mayo in wheat wrap.',
    ingredients: ['1 whole wheat tortilla', '150g sliced turkey', 'Lettuce & tomato', '1 tbsp light mayo'],
    steps: ['Lay tortilla flat.', 'Spread mayo and layer turkey, lettuce, tomato.', 'Roll tightly and slice.'],
  },
  {
    id: 'amer-3', name: 'Lean Grass-Fed Beef Burger Bowl', cuisine: 'American', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Beef', carbs: 20, fiber: 6, protein: 45, emoji: '🥩',
    imageUrl: IMG('Gourmet_Burger_Kitchen_hamburger.jpg'),
    desc: 'Deconstructed beef patty served over mixed greens, pickles, tomato, and sauce.',
    ingredients: ['180g lean ground beef patty', '2 cups Romaine lettuce', 'Tomatoes & pickles', '1 tbsp burger sauce'],
    steps: ['Cook beef patty in skillet.', 'Bed greens, tomatoes, pickles in bowl.', 'Slice patty and serve over greens with sauce.'],
  },
  {
    id: 'amer-4', name: 'Greek Yogurt & Almond Butter Dip', cuisine: 'American', mealType: 'Snack',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 12, fiber: 3, protein: 16, emoji: '🍎',
    imageUrl: IMG('Greek_yoghurt_with_honey.jpg'),
    desc: 'Greek yogurt whipped with almond butter and honey with apple slices.',
    ingredients: ['150g Greek yogurt', '1 tbsp almond butter', '1 tsp honey', '1 sliced apple'],
    steps: ['Mix Greek yogurt, almond butter, honey.', 'Slice apple into wedges.', 'Dip apple into dip.'],
  },
  {
    id: 'amer-5', name: 'Peanut Butter Banana Smoothie', cuisine: 'American', mealType: 'Smoothie',
    diet: 'Vegan', subtype: 'Nuts & Seeds', carbs: 40, fiber: 5, protein: 25, emoji: '🍌',
    imageUrl: IMG('Banana_Smoothie.jpg'),
    desc: 'Ripe banana, natural peanut butter, oat milk, and chocolate protein.',
    ingredients: ['1 banana', '1 tbsp peanut butter', '1 scoop chocolate plant protein', '1 cup oat milk'],
    steps: ['Add ingredients to blender.', 'Blend 45 seconds until smooth.'],
  },
  {
    id: 'amer-6', name: 'Baked Apple Cinnamon Crisp', cuisine: 'American', mealType: 'Dessert',
    diet: 'Vegan', subtype: 'Grains & Veggies', carbs: 32, fiber: 6, protein: 4, emoji: '🍏',
    imageUrl: IMG('Vegan_apple_crumble_(8293111737).jpg'),
    desc: 'Warm sliced apples baked with a crunchy oat and cinnamon crumble.',
    ingredients: ['1 large apple sliced', '2 tbsp rolled oats', '1 tsp coconut oil', 'Cinnamon & stevia'],
    steps: ['Toss apples with cinnamon in ramekin.', 'Mix oats, oil, stevia and scatter on top.', 'Bake 375°F for 20 minutes.'],
  },

  {
    id: 'asia-1', name: 'Tofu & Scallion Congee', cuisine: 'Asian', mealType: 'Breakfast',
    diet: 'Vegan', subtype: 'Plant-Based Protein', carbs: 35, fiber: 3, protein: 14, emoji: '🍚',
    imageUrl: IMG('Cantonese_rice_porridge.JPG'),
    desc: 'Warm savory rice porridge infused with ginger, scallions, and silken tofu.',
    ingredients: ['1/3 cup jasmine rice', '3 cups veggie broth', '100g silken tofu', 'Ginger & scallions'],
    steps: ['Simmer rice and broth 35 minutes.', 'Add ginger and tofu last 5 minutes.', 'Garnish with scallions.'],
  },
  {
    id: 'asia-2', name: 'Teriyaki Chicken & Broccoli Bowl', cuisine: 'Asian', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 48, fiber: 6, protein: 38, emoji: '🥦',
    imageUrl: IMG('Chicken_Teriyaki_(with_rice_and_slaw)_at_Toshi%E2%80%99s_Teriyaki_Grill,_Seattle,_Washington.jpg'),
    desc: 'Grilled chicken breast with steamed broccoli and brown rice in teriyaki glaze.',
    ingredients: ['170g chicken breast', '1 cup steamed broccoli', '1 cup brown rice', '2 tbsp teriyaki sauce'],
    steps: ['Cook brown rice and steam broccoli.', 'Pan-sear chicken and slice.', 'Assemble bowl and drizzle teriyaki.'],
  },
  {
    id: 'asia-3', name: 'Pan-Seared Ginger Shrimp & Bok Choy', cuisine: 'Asian', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Seafood', carbs: 14, fiber: 5, protein: 42, emoji: '🍤',
    imageUrl: IMG('Buttered_Shrimp.jpg'),
    desc: 'Succulent shrimp sautéed with fresh ginger, garlic, and baby bok choy.',
    ingredients: ['200g shrimp', '2 heads baby bok choy', '1 tbsp sesame oil', 'Garlic & ginger'],
    steps: ['Heat sesame oil in wok.', 'Sauté garlic, ginger, and shrimp until pink.', 'Add bok choy, cover and steam 3 minutes.'],
  },
  {
    id: 'asia-4', name: 'Edamame with Sea Salt', cuisine: 'Asian', mealType: 'Snack',
    diet: 'Vegan', subtype: 'Plant-Based Protein', carbs: 14, fiber: 6, protein: 12, emoji: '🫛',
    imageUrl: IMG('Edamame_with_salt.JPG'),
    desc: 'Steamed young green soybeans sprinkled with flaky sea salt.',
    ingredients: ['1.5 cups frozen edamame pods', 'Flaky sea salt'],
    steps: ['Steam edamame 4 minutes.', 'Drain and sprinkle with sea salt.'],
  },
  {
    id: 'asia-5', name: 'Matcha Green Tea Protein Smoothie', cuisine: 'Asian', mealType: 'Smoothie',
    diet: 'Vegan', subtype: 'Plant-Based Protein', carbs: 22, fiber: 4, protein: 22, emoji: '🍵',
    imageUrl: IMG('Matcha_Green_Tea_Latte_(35487991553).jpg'),
    desc: 'Ceremonial grade matcha powder blended with coconut water and vanilla protein.',
    ingredients: ['1 tsp matcha powder', '1 scoop vanilla plant protein', '1 cup coconut water', 'Ice'],
    steps: ['Pulse coconut water and matcha.', 'Add protein and ice. Blend until frothy.'],
  },
  {
    id: 'asia-6', name: 'Mango Sticky Rice (Light)', cuisine: 'Asian', mealType: 'Dessert',
    diet: 'Vegan', subtype: 'Grains & Veggies', carbs: 42, fiber: 3, protein: 5, emoji: '🥭',
    imageUrl: IMG('Mango_sticy_rice_(3859549574).jpg'),
    desc: 'Fresh sweet mango slices served over sticky rice with light coconut drizzle.',
    ingredients: ['1/2 cup sticky rice', '1/2 cup diced mango', '2 tbsp light coconut milk', '1 tsp coconut sugar'],
    steps: ['Warm sticky rice.', 'Whisk coconut milk and sugar, drizzle over rice.', 'Top with mango.'],
  },

  {
    id: 'ind-1', name: 'Spiced Moong Dal Chilla', cuisine: 'Indian', mealType: 'Breakfast',
    diet: 'Vegetarian', subtype: 'Plant-Based Protein', carbs: 32, fiber: 7, protein: 16, emoji: '🫓',
    desc: 'Savory lentil pancakes spiced with cumin, cilantro, and green chilies.',
    ingredients: ['1/2 cup soaked moong dal paste', 'Cumin, cilantro, chili', '1 tsp ghee'],
    steps: ['Blend soaked moong dal into batter.', 'Pour on hot pan like a pancake.', 'Cook with ghee until crisp.'],
  },
  {
    id: 'ind-2', name: 'Tandoori Chicken & Chickpea Salad', cuisine: 'Indian', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 35, fiber: 9, protein: 42, emoji: '🍗',
    imageUrl: IMG('Grilled_Tandoori_chicken.jpg'),
    desc: 'Yogurt-marinated tandoori chicken chunks served over spiced chickpea salad.',
    ingredients: ['170g chicken breast in tandoori spices', '1/2 cup boiled chickpeas', 'Cucumber, tomato, lemon'],
    steps: ['Marinate chicken in yogurt and spices, bake 400°F for 18 mins.', 'Toss chickpeas, cucumber, tomato with lemon.', 'Serve chicken over salad.'],
  },
  {
    id: 'ind-3', name: 'Palak Paneer with Spinach & Dal', cuisine: 'Indian', mealType: 'Dinner',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 22, fiber: 8, protein: 30, emoji: '🥬',
    imageUrl: IMG('Palak_Paneer_(Cottage_cheese_in_spinach_gravy).jpg'),
    desc: 'Creamy pureed spinach curry with Indian paneer cubes and yellow dal.',
    ingredients: ['100g paneer cubes', '2 cups pureed spinach', '1/3 cup yellow dal', 'Garlic, ginger, spices'],
    steps: ['Sauté garlic, ginger, onions.', 'Add spinach puree and yellow dal, simmer 5 mins.', 'Fold in paneer cubes.'],
  },
  {
    id: 'ind-4', name: 'Roasted Spiced Makhana', cuisine: 'Indian', mealType: 'Snack',
    diet: 'Vegetarian', subtype: 'Nuts & Seeds', carbs: 20, fiber: 4, protein: 6, emoji: '🍿',
    desc: 'Crispy lotus seeds roasted with turmeric, black pepper, and minimal ghee.',
    ingredients: ['2 cups fox nuts', '1 tsp ghee', 'Turmeric, salt, pepper'],
    steps: ['Heat ghee in pan on low.', 'Roast makhana 6-8 minutes until crisp.', 'Toss with spices.'],
  },
  {
    id: 'ind-5', name: 'Cardamom Mango Lassi Shake', cuisine: 'Indian', mealType: 'Smoothie',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 30, fiber: 3, protein: 24, emoji: '🥭',
    imageUrl: IMG('Wikipedia-Stammtisch_Augsburg_2021-09-19_Mango_Lassi_(cropped).JPG'),
    desc: 'Fresh mango pulp blended with Greek yogurt, cardamom, and protein.',
    ingredients: ['1/2 cup mango pulp', '150g Greek yogurt', '1 scoop vanilla protein', 'Cardamom'],
    steps: ['Combine ingredients in blender with ice.', 'Blend until smooth and frothy.'],
  },
  {
    id: 'ind-6', name: 'Cardamom Scented Kheer', cuisine: 'Indian', mealType: 'Dessert',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 38, fiber: 2, protein: 7, emoji: '🍚',
    imageUrl: IMG('Kheer_Rice_Pudding_Indian_Sweet_Buffalo_New_York.jpg'),
    desc: 'Traditional simmered rice pudding flavored with crushed cardamom and pistachios.',
    ingredients: ['1/2 cup cooked basmati rice', '1 cup low-fat milk', '1 tbsp pistachios', 'Cardamom & sweetener'],
    steps: ['Simmer rice and milk until thick.', 'Stir in sweetener and cardamom.', 'Garnish with pistachios.'],
  },

  {
    id: 'ital-1', name: 'Caprese Toast with Tomatoes & Basil', cuisine: 'Italian', mealType: 'Breakfast',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 28, fiber: 4, protein: 14, emoji: '🍅',
    desc: 'Toasted Italian bread with fresh mozzarella slices, vine tomatoes, and pesto.',
    ingredients: ['2 slices ciabatta', '60g mozzarella', '1 vine tomato', 'Pesto & balsamic glaze'],
    steps: ['Toast ciabatta.', 'Layer with mozzarella and tomatoes.', 'Drizzle with pesto and balsamic.'],
  },
  {
    id: 'ital-2', name: 'Chicken & White Bean Minestrone', cuisine: 'Italian', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 40, fiber: 10, protein: 36, emoji: '🍲',
    imageUrl: IMG('Minestrone_soup.jpg'),
    desc: 'Hearty Italian soup loaded with cannellini beans, zucchini, and shredded chicken.',
    ingredients: ['150g shredded chicken', '1/2 cup cannellini beans', 'Zucchini, carrots, tomatoes in broth'],
    steps: ['Simmer broth with carrots and zucchini.', 'Add beans, chicken, and herbs.', 'Simmer 15 minutes.'],
  },
  {
    id: 'ital-3', name: 'Baked Cod with Tomato Ragout', cuisine: 'Italian', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 16, fiber: 5, protein: 38, emoji: '🐟',
    imageUrl: IMG('Baked_fillet_with_asparagous.JPG'),
    desc: 'Fresh white cod fillet baked in garlic, caper, olive, and cherry tomato sauce.',
    ingredients: ['200g cod fillet', '1 cup cherry tomatoes', 'Capers & olives', 'Garlic & olive oil'],
    steps: ['Preheat oven to 390°F.', 'Surround cod with tomatoes, capers, olives, oil.', 'Bake 15 minutes.'],
  },
  {
    id: 'ital-4', name: 'Ricotta & Fig Bruschetta', cuisine: 'Italian', mealType: 'Snack',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 18, fiber: 3, protein: 9, emoji: '🍞',
    desc: 'Whole grain toast spread with whipped ricotta and fresh fig slices.',
    ingredients: ['1 slice whole grain toast', '50g whipped ricotta', '2 fresh figs', '1 tsp honey'],
    steps: ['Toast bread.', 'Spread ricotta over toast.', 'Top with figs and honey.'],
  },
  {
    id: 'ital-5', name: 'Espresso Almond Protein Shake', cuisine: 'Italian', mealType: 'Smoothie',
    diet: 'Vegan', subtype: 'Nuts & Seeds', carbs: 18, fiber: 4, protein: 26, emoji: '☕',
    imageUrl: IMG('Alamo_Drafthouse_Midnight_Espresso_Milkshake.jpg'),
    desc: 'Rich espresso shot blended with almond milk, ice, and chocolate protein.',
    ingredients: ['1 shot espresso', '1 scoop chocolate protein', '1 cup almond milk', 'Ice'],
    steps: ['Brew espresso and cool.', 'Blend espresso, almond milk, protein, ice.'],
  },
  {
    id: 'ital-6', name: 'Classic Lemon Ricotta Parfait', cuisine: 'Italian', mealType: 'Dessert',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 22, fiber: 2, protein: 12, emoji: '🍋',
    imageUrl: IMG('Lemoncurd.jpg'),
    desc: 'Sweetened whipped ricotta infused with lemon zest and crushed pistachios.',
    ingredients: ['100g part-skim ricotta', '1 tsp lemon zest', '1 tsp honey', '1 tbsp pistachios'],
    steps: ['Whip ricotta with lemon zest and honey.', 'Spoon into glass.', 'Top with crushed pistachios.'],
  },

  {
    id: 'mex-1', name: 'Huevos Rancheros Bowl', cuisine: 'Mexican', mealType: 'Breakfast',
    diet: 'Non-Vegetarian', subtype: 'Eggs', carbs: 34, fiber: 8, protein: 18, emoji: '🍳',
    imageUrl: IMG('Huevos_Rancheros_(11494813583).jpg'),
    desc: 'Sunny-side eggs over black beans, roasted salsa, and baked corn tortilla strips.',
    ingredients: ['2 eggs', '1/2 cup black beans', '2 baked corn tortillas', 'Salsa & cilantro'],
    steps: ['Warm black beans in bowl.', 'Fry or poach eggs and place on beans.', 'Top with salsa and tortilla strips.'],
  },
  {
    id: 'mex-2', name: 'Chicken Fajita Power Bowl', cuisine: 'Mexican', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 38, fiber: 7, protein: 40, emoji: '🌮',
    desc: 'Sizzling grilled chicken breast with bell peppers, onions, and cilantro-lime rice.',
    ingredients: ['180g chicken strips', 'Bell peppers & onions', '3/4 cup cilantro-lime brown rice', 'Fajita spices'],
    steps: ['Sauté chicken with peppers and onions.', 'Prepare cilantro-lime rice.', 'Combine rice and fajita mix in bowl.'],
  },
  {
    id: 'mex-3', name: 'Baja Lime Grilled Fish Tacos', cuisine: 'Mexican', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 32, fiber: 6, protein: 36, emoji: '🌮',
    imageUrl: IMG('Wahoo%27s_fish_tacos_(23290043054).jpg'),
    desc: 'Corn tortillas filled with lime-marinated grilled fish and crunchy cabbage slaw.',
    ingredients: ['200g white fish', '3 corn tortillas', 'Cabbage slaw & lime', 'Light yogurt crema'],
    steps: ['Season fish with lime and chili, grill.', 'Warm tortillas.', 'Assemble tacos with slaw and crema.'],
  },
  {
    id: 'mex-4', name: 'Guacamole & Baked Tortilla Chips', cuisine: 'Mexican', mealType: 'Snack',
    diet: 'Vegan', subtype: 'Nuts & Seeds', carbs: 18, fiber: 6, protein: 4, emoji: '🥑',
    imageUrl: IMG('Guasacaca_and_tortilla_chips.jpg'),
    desc: 'Fresh chunky avocado guacamole served with crispy baked corn tortilla chips.',
    ingredients: ['1 avocado mashed', 'Tomatoes, onions, lime', '30g baked tortilla chips'],
    steps: ['Mash avocado with lime, tomatoes, onions.', 'Serve with baked tortilla chips.'],
  },

  {
    id: 'med-1', name: 'Greek Yogurt & Walnut Honey Bowl', cuisine: 'Mediterranean', mealType: 'Breakfast',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 26, fiber: 3, protein: 22, emoji: '🍯',
    imageUrl: IMG('Greek_yoghurt_with_honey.jpg'),
    desc: 'Strained Greek yogurt topped with crunchy walnuts and wild Greek honey.',
    ingredients: ['180g Greek yogurt', '15g walnuts', '1 tbsp honey'],
    steps: ['Scoop Greek yogurt into bowl.', 'Top with chopped walnuts and honey drizzle.'],
  },
  {
    id: 'med-2', name: 'Mediterranean Grilled Chicken Salad', cuisine: 'Mediterranean', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 22, fiber: 6, protein: 38, emoji: '🥗',
    imageUrl: IMG('Flickr_-_cyclonebill_-_Gr%C3%A6sk_salat,_grillet_kylling_og_br%C3%B8d.jpg'),
    desc: 'Crisp greens with cucumbers, olives, feta cheese, and grilled chicken.',
    ingredients: ['170g grilled chicken', 'Cucumbers, tomatoes, red onion', '30g feta & olives', 'Olive oil & oregano'],
    steps: ['Chop cucumbers, tomatoes, onions.', 'Add chicken, feta, olives.', 'Dress with olive oil and lemon.'],
  },
  {
    id: 'med-3', name: 'Lemon Herb Baked Halibut', cuisine: 'Mediterranean', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 12, fiber: 4, protein: 40, emoji: '🐟',
    imageUrl: IMG('Baked_fillet_with_asparagous.JPG'),
    desc: 'Tender halibut baked with lemon slices, garlic, oregano, and olive oil.',
    ingredients: ['200g halibut fillet', 'Lemon slices & oregano', 'Olive oil & garlic'],
    steps: ['Preheat oven to 400°F.', 'Top halibut with garlic, oregano, lemon.', 'Bake 15 minutes.'],
  },

  {
    id: 'me-1', name: 'Shakshuka with Poached Eggs', cuisine: 'Middle Eastern', mealType: 'Breakfast',
    diet: 'Non-Vegetarian', subtype: 'Eggs', carbs: 25, fiber: 6, protein: 18, emoji: '🍳',
    imageUrl: IMG('Shakshuka1.jpg'),
    desc: 'Eggs poached in a spiced tomato, bell pepper, and cumin sauce.',
    ingredients: ['2 eggs', '1 cup crushed tomatoes', 'Bell peppers, onions, cumin'],
    steps: ['Sauté onions and peppers.', 'Add tomatoes and spices, simmer.', 'Crack eggs into sauce, cover and poach.'],
  },
  {
    id: 'me-2', name: 'Herb Chicken Skewers & Tabbouleh', cuisine: 'Middle Eastern', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 32, fiber: 7, protein: 40, emoji: '🍢',
    imageUrl: IMG('Chicken_Tikka_Kebab.jpg'),
    desc: 'Grilled marinated chicken skewers served with fresh bulgur parsley tabbouleh.',
    ingredients: ['180g chicken skewers', '1/2 cup tabbouleh salad', 'Garlic sauce'],
    steps: ['Grill chicken skewers until charred.', 'Prepare fresh tabbouleh salad.', 'Serve together with garlic sauce.'],
  },

  {
    id: 'lat-1', name: 'Arepa with Shredded Beef & Avocado', cuisine: 'Latin American', mealType: 'Breakfast',
    diet: 'Non-Vegetarian', subtype: 'Beef', carbs: 38, fiber: 5, protein: 24, emoji: '🫓',
    imageUrl: IMG('Typical_breakfast_in_Venezuela.jpg'),
    desc: 'Crispy corn meal arepa stuffed with savory shredded beef and avocado.',
    ingredients: ['1 corn arepa', '100g shredded beef', '1/4 avocado'],
    steps: ['Warm arepa on skillet.', 'Slice open and stuff with shredded beef and avocado.'],
  },
  {
    id: 'lat-2', name: 'Peruvian Ceviche with Sweet Potato', cuisine: 'Latin American', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 26, fiber: 4, protein: 38, emoji: '🐟',
    imageUrl: IMG('Ceviche_misto.JPG'),
    desc: 'Fresh white fish cured in lime juice with red onion, cilantro, and sweet potato.',
    ingredients: ['200g white fish cubed', 'Lime juice & red onion', '1/2 cup boiled sweet potato'],
    steps: ['Cure fish in lime juice 20 minutes.', 'Toss with red onion and cilantro.', 'Serve with boiled sweet potato.'],
  },

  {
    id: 'cont-7', name: 'Smoked Salmon Bagel', cuisine: 'Continental', mealType: 'Breakfast',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 38, fiber: 2, protein: 22, emoji: '🥯',
    imageUrl: IMG("Bagels%27n%27Lox.jpg"),
    desc: 'A toasted sesame bagel piled high with cold-smoked salmon.',
    ingredients: ['1 sesame bagel', '80g smoked salmon', '1 tbsp cream cheese'],
    steps: ['Toast the bagel.', 'Spread cream cheese on both halves.', 'Layer smoked salmon on top.'],
  },
  {
    id: 'cont-8', name: 'Falafel & Hummus Wrap', cuisine: 'Continental', mealType: 'Lunch',
    diet: 'Vegan', subtype: 'Plant-Based Protein', carbs: 42, fiber: 9, protein: 14, emoji: '🧆',
    imageUrl: IMG('Falafel_%26_Hummus_Wrap_-_Lavash_2024-08-19.jpg'),
    desc: 'Crispy falafel, hummus, and greens rolled in a soft lavash wrap.',
    ingredients: ['1 lavash wrap', '4 falafel balls', '2 tbsp hummus', 'Mixed greens & red cabbage'],
    steps: ['Spread hummus over the wrap.', 'Add falafel, greens, and cabbage.', 'Roll tightly and slice in half.'],
  },
  {
    id: 'cont-9', name: 'Roasted Chicken & Potatoes', cuisine: 'Continental', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 26, fiber: 4, protein: 40, emoji: '🍗',
    imageUrl: IMG('Roasted_Chicken%2C_Butterflied%2C_on_Potatoes%2C_Baking_Pan_01.jpg'),
    desc: 'A whole herb-roasted chicken baked over golden potatoes.',
    ingredients: ['1 whole chicken, butterflied', '500g baby potatoes', '2 tbsp olive oil', 'Rosemary & thyme'],
    steps: ['Toss potatoes with oil and herbs in a roasting pan.', 'Lay chicken on top, season well.', 'Roast at 425°F for 45-50 minutes.'],
  },
  {
    id: 'amer-7', name: 'Loaded Vegetable Omelette Plate', cuisine: 'American', mealType: 'Breakfast',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 20, fiber: 5, protein: 18, emoji: '🍳',
    imageUrl: IMG('Omelette_de_verduras.jpg'),
    desc: 'A folded vegetable omelette served with beans, tortilla, and fresh veggies.',
    ingredients: ['3 eggs', 'Bell peppers & mushrooms', '1/4 cup refried beans', 'Cucumber & tomato slices'],
    steps: ['Sauté peppers and mushrooms.', 'Pour in beaten eggs and fold once set.', 'Serve alongside beans, cucumber, and tomato.'],
  },
  {
    id: 'amer-8', name: 'BBQ Chicken Plate with Collard Greens', cuisine: 'American', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 30, fiber: 5, protein: 38, emoji: '🍗',
    imageUrl: IMG('BBQ_Chicken_(5)_(24403339768).jpg'),
    desc: 'Smoky barbecue chicken served Southern-style with collard greens and macaroni.',
    ingredients: ['200g BBQ chicken', '1 cup collard greens', '1/2 cup macaroni & cheese'],
    steps: ['Grill or bake chicken with BBQ sauce.', 'Simmer collard greens until tender.', 'Serve chicken alongside greens and macaroni.'],
  },
  {
    id: 'amer-9', name: 'Grilled Salmon with Avocado & Greens', cuisine: 'American', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 12, fiber: 6, protein: 36, emoji: '🐟',
    imageUrl: IMG('Grilled_plated_salmon_fillet.jpg'),
    desc: 'Blackened grilled salmon over greens with avocado and cherry tomatoes.',
    ingredients: ['200g salmon fillet', '2 cups mixed greens', '1/2 avocado', 'Cherry tomatoes & lemon'],
    steps: ['Season and grill salmon until charred.', 'Plate over greens with avocado and tomatoes.', 'Finish with a squeeze of lemon.'],
  },
  {
    id: 'asia-7', name: 'Miso Soup with Tofu', cuisine: 'Asian', mealType: 'Breakfast',
    diet: 'Vegan', subtype: 'Plant-Based Protein', carbs: 10, fiber: 2, protein: 10, emoji: '🍲',
    imageUrl: IMG('Miso_Soup.jpg'),
    desc: 'A warm, savory miso broth with silken tofu and seaweed.',
    ingredients: ['2 cups dashi or veggie broth', '2 tbsp miso paste', '100g silken tofu, cubed', 'Dried wakame seaweed'],
    steps: ["Warm the broth (don't boil).", 'Whisk in miso paste until dissolved.', 'Add tofu and seaweed, simmer 2 minutes.'],
  },
  {
    id: 'asia-8', name: 'Beef & Broccoli Stir Fry', cuisine: 'Asian', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Beef', carbs: 30, fiber: 5, protein: 34, emoji: '🥦',
    imageUrl: IMG('Broccoli_beef_(5457397534).jpg'),
    desc: 'Tender sliced beef and broccoli in a savory garlic sauce over rice.',
    ingredients: ['180g sliced beef', '2 cups broccoli florets', '1 cup steamed rice', 'Garlic, ginger, soy sauce'],
    steps: ['Stir-fry beef until browned, set aside.', 'Stir-fry broccoli with garlic and ginger.', 'Combine with sauce and beef, serve over rice.'],
  },
  {
    id: 'asia-9', name: 'Salmon Poke Bowl', cuisine: 'Asian', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Fish', carbs: 40, fiber: 4, protein: 28, emoji: '🍣',
    imageUrl: IMG('Salmon_Poke.jpg'),
    desc: 'Cubed raw salmon over rice with avocado, cabbage, and a creamy drizzle.',
    ingredients: ['150g sushi-grade salmon, cubed', '1 cup cooked rice', '1/2 avocado', 'Shredded cabbage & nori'],
    steps: ['Scoop rice into a bowl.', 'Top with salmon, avocado, and cabbage.', 'Garnish with nori and a drizzle of sauce.'],
  },
  {
    id: 'ind-7', name: 'Vegetable Upma', cuisine: 'Indian', mealType: 'Breakfast',
    diet: 'Vegan', subtype: 'Grains & Veggies', carbs: 38, fiber: 5, protein: 8, emoji: '🍛',
    imageUrl: IMG('Rava_Upma_(Suji_or_Semolina_Upma).JPG'),
    desc: 'A savory semolina porridge cooked with mustard seeds and mixed vegetables.',
    ingredients: ['1/2 cup semolina (rava)', 'Mixed vegetables (peas, carrots, peppers)', 'Mustard seeds & curry leaves', '1 tsp oil'],
    steps: ['Dry roast semolina, set aside.', 'Sauté mustard seeds, curry leaves, and vegetables.', 'Add water and semolina, stir until thickened.'],
  },
  {
    id: 'ind-8', name: 'Chana Masala (Chickpea Curry)', cuisine: 'Indian', mealType: 'Lunch',
    diet: 'Vegan', subtype: 'Plant-Based Protein', carbs: 45, fiber: 12, protein: 16, emoji: '🍛',
    imageUrl: IMG('Chana_masala.jpg'),
    desc: 'Chickpeas simmered in a tangy tomato-onion masala.',
    ingredients: ['1.5 cups cooked chickpeas', '1 cup tomato-onion masala', 'Cilantro & lemon', 'Cumin, coriander, garam masala'],
    steps: ['Sauté onions and spices until fragrant.', 'Add tomatoes and simmer into a thick sauce.', 'Stir in chickpeas, simmer 10 minutes, garnish with cilantro.'],
  },
  {
    id: 'ind-9', name: 'Chicken Tikka Masala with Naan', cuisine: 'Indian', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 48, fiber: 4, protein: 38, emoji: '🍛',
    imageUrl: IMG('Chicken_Tikka_Masala-01.jpg'),
    desc: 'Grilled marinated chicken in a creamy tomato curry, served with rice and naan.',
    ingredients: ['200g chicken, marinated & grilled', '1 cup tomato-cream curry sauce', '3/4 cup basmati rice', '1 piece garlic naan'],
    steps: ['Grill marinated chicken until charred.', 'Simmer chicken in tomato-cream sauce.', 'Serve with rice and warm naan.'],
  },
  {
    id: 'ital-7', name: 'Italian Vegetable Frittata', cuisine: 'Italian', mealType: 'Breakfast',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 14, fiber: 3, protein: 18, emoji: '🍳',
    imageUrl: IMG('Frittata.jpg'),
    desc: 'A baked egg frittata loaded with tomatoes, onion, and herbs.',
    ingredients: ['4 eggs', 'Diced tomatoes & onion', '2 tbsp grated Parmesan', 'Fresh basil'],
    steps: ['Whisk eggs with cheese and herbs.', 'Sauté vegetables in an oven-safe pan.', 'Pour in eggs and bake at 375°F until set.'],
  },
  {
    id: 'ital-8', name: 'Caprese Chicken Panini', cuisine: 'Italian', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 36, fiber: 3, protein: 34, emoji: '🥪',
    desc: 'Grilled chicken, mozzarella, tomato, and basil pressed in ciabatta.',
    ingredients: ['150g grilled chicken breast', '2 slices ciabatta', 'Fresh mozzarella & tomato', 'Basil & balsamic glaze'],
    steps: ['Layer chicken, mozzarella, tomato, and basil on ciabatta.', 'Press in a panini press until golden.', 'Drizzle with balsamic glaze before serving.'],
  },
  {
    id: 'ital-9', name: 'Spaghetti Bolognese', cuisine: 'Italian', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Beef', carbs: 62, fiber: 5, protein: 32, emoji: '🍝',
    imageUrl: IMG('Spaghetti_bolognese.jpg'),
    desc: 'Classic spaghetti tossed in a slow-simmered beef and tomato ragù.',
    ingredients: ['100g spaghetti', '150g ground beef', '1 cup tomato sauce', 'Onion, garlic, oregano'],
    steps: ['Brown beef with onion and garlic.', 'Add tomato sauce and oregano, simmer 20 minutes.', 'Toss with cooked spaghetti.'],
  },
  {
    id: 'mex-5', name: 'Horchata (Rice Milk Drink)', cuisine: 'Mexican', mealType: 'Smoothie',
    diet: 'Vegan', subtype: 'Grains & Veggies', carbs: 34, fiber: 1, protein: 2, emoji: '🥛',
    imageUrl: IMG('Horchata_de_arroz.jpg'),
    desc: 'A chilled, cinnamon-spiced rice milk drink.',
    ingredients: ['1 cup rice, soaked & blended', '2 cups water', '1 tbsp sugar', 'Cinnamon'],
    steps: ['Blend soaked rice with water and cinnamon.', 'Strain through cheesecloth.', 'Sweeten to taste and serve over ice.'],
  },
  {
    id: 'mex-6', name: 'Churros with Chocolate Dip', cuisine: 'Mexican', mealType: 'Dessert',
    diet: 'Vegetarian', subtype: 'Grains & Veggies', carbs: 40, fiber: 2, protein: 5, emoji: '🍩',
    imageUrl: IMG('Chocolate_churro.jpg'),
    desc: 'Crispy cinnamon-sugar churros served with warm chocolate sauce.',
    ingredients: ['4 churros', '2 tbsp cinnamon sugar', '1/4 cup melted chocolate'],
    steps: ['Fry or bake churros until golden.', 'Toss in cinnamon sugar.', 'Serve with warm chocolate for dipping.'],
  },
  {
    id: 'mex-7', name: 'Carne Asada Burrito', cuisine: 'Mexican', mealType: 'Lunch',
    diet: 'Non-Vegetarian', subtype: 'Beef', carbs: 46, fiber: 6, protein: 36, emoji: '🌯',
    imageUrl: IMG('Carne-asada-burrito.jpg'),
    desc: 'Grilled marinated steak, rice, and beans wrapped in a warm flour tortilla.',
    ingredients: ['150g grilled carne asada', '1 large flour tortilla', '1/2 cup rice', '1/4 cup beans'],
    steps: ['Grill and slice marinated steak.', 'Warm tortilla and layer with rice, beans, and steak.', 'Fold and wrap tightly.'],
  },
  {
    id: 'mex-8', name: 'Chicken Enchiladas', cuisine: 'Mexican', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Chicken', carbs: 40, fiber: 7, protein: 34, emoji: '🌯',
    imageUrl: IMG('Chicken_Enchiladas_with_red_sauce%2C_red_rice%2C_black_beans%2C_and_avocado.jpg'),
    desc: 'Chicken-filled tortillas baked in red sauce with cheese, rice, and beans.',
    ingredients: ['2 corn tortillas, chicken-filled', '1/2 cup red enchilada sauce', '1/4 cup shredded cheese', 'Rice, black beans & avocado'],
    steps: ['Roll chicken in tortillas and place in a baking dish.', 'Top with sauce and cheese, bake until bubbly.', 'Serve with rice, beans, and avocado.'],
  },
  {
    id: 'med-4', name: 'Hummus with Warm Flatbread', cuisine: 'Mediterranean', mealType: 'Snack',
    diet: 'Vegan', subtype: 'Plant-Based Protein', carbs: 24, fiber: 6, protein: 8, emoji: '🫓',
    imageUrl: IMG('Homemade_hummus_and_pita_01.jpg'),
    desc: 'Creamy hummus served with warm grilled flatbread.',
    ingredients: ['1/2 cup hummus', '1 piece flatbread', 'Olive oil & paprika'],
    steps: ['Warm flatbread on a skillet.', 'Spread hummus on a plate, drizzle with olive oil and paprika.', 'Serve alongside warm flatbread.'],
  },
  {
    id: 'med-5', name: 'Pomegranate Yogurt Smoothie', cuisine: 'Mediterranean', mealType: 'Smoothie',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 28, fiber: 2, protein: 14, emoji: '🍹',
    desc: 'Greek yogurt blended with pomegranate juice and honey.',
    ingredients: ['150g Greek yogurt', '1/2 cup pomegranate juice', '1 tsp honey', 'Ice'],
    steps: ['Combine all ingredients in a blender.', 'Blend until smooth.', 'Serve chilled.'],
  },
  {
    id: 'med-6', name: 'Baklava', cuisine: 'Mediterranean', mealType: 'Dessert',
    diet: 'Vegetarian', subtype: 'Nuts & Seeds', carbs: 32, fiber: 2, protein: 5, emoji: '🥮',
    imageUrl: IMG('Baklava.jpg'),
    desc: 'Layers of flaky filo pastry, chopped nuts, and honey syrup.',
    ingredients: ['4 sheets filo pastry', '1/4 cup chopped walnuts & pistachios', '2 tbsp melted butter', 'Honey syrup'],
    steps: ['Layer filo sheets with butter and nuts.', 'Bake at 350°F until golden.', 'Soak in honey syrup while warm.'],
  },
  {
    id: 'me-3', name: 'Lamb Kebab Skewers with Rice Pilaf', cuisine: 'Middle Eastern', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Mutton/Goat', carbs: 42, fiber: 4, protein: 36, emoji: '🍢',
    imageUrl: IMG('Afghani_lamb_kebab.jpg'),
    desc: 'Grilled lamb and vegetable skewers over saffron rice pilaf with yogurt sauce.',
    ingredients: ['180g lamb, skewered & grilled', 'Bell peppers & tomatoes', '3/4 cup saffron rice pilaf', 'Yogurt sauce & lemon'],
    steps: ['Skewer lamb with peppers and tomatoes, grill until charred.', 'Prepare saffron rice pilaf.', 'Serve skewers over rice with yogurt sauce and lemon.'],
  },
  {
    id: 'me-4', name: 'Stuffed Grape Leaves (Dolma)', cuisine: 'Middle Eastern', mealType: 'Snack',
    diet: 'Vegan', subtype: 'Grains & Veggies', carbs: 26, fiber: 4, protein: 4, emoji: '🍃',
    imageUrl: IMG('Stuffed_grape_leaves.jpg'),
    desc: 'Grape leaves rolled around a seasoned rice and herb filling.',
    ingredients: ['12 grape leaves', '1/2 cup rice', 'Fresh herbs, lemon, olive oil'],
    steps: ['Mix rice with herbs, lemon, and oil.', 'Roll filling into grape leaves.', 'Simmer rolls in water until tender.'],
  },
  {
    id: 'me-5', name: 'Rosewater Rice Pudding (Muhallabia)', cuisine: 'Middle Eastern', mealType: 'Dessert',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 34, fiber: 1, protein: 6, emoji: '🍮',
    imageUrl: IMG('Mhallabiyyeh_(Arabic_milk_pudding).jpg'),
    desc: 'A silky milk pudding scented with rosewater and topped with pistachios.',
    ingredients: ['2 cups milk', '3 tbsp rice flour or cornstarch', '2 tbsp sugar', 'Rosewater & crushed pistachios'],
    steps: ['Whisk milk, starch, and sugar over low heat until thickened.', 'Stir in rosewater.', 'Chill and top with pistachios and dried rose petals.'],
  },
  {
    id: 'lat-3', name: 'Grilled Churrasco Steak with Rice & Beans', cuisine: 'Latin American', mealType: 'Dinner',
    diet: 'Non-Vegetarian', subtype: 'Beef', carbs: 44, fiber: 8, protein: 40, emoji: '🥩',
    imageUrl: IMG('Food_plates%2C_Mania_de_Churrasco.jpg'),
    desc: 'Grilled churrasco steak served with white rice and stewed red beans.',
    ingredients: ['200g churrasco steak', '3/4 cup white rice', '1/2 cup stewed red beans', 'Salad & lemon'],
    steps: ['Grill steak to desired doneness, rest, and slice.', 'Serve alongside rice and beans.', 'Add a side salad and lemon wedge.'],
  },
  {
    id: 'lat-4', name: 'Plantain Chips', cuisine: 'Latin American', mealType: 'Snack',
    diet: 'Vegan', subtype: 'Grains & Veggies', carbs: 24, fiber: 2, protein: 1, emoji: '🍌',
    imageUrl: IMG('Plantain_chips.jpg'),
    desc: 'Thin-sliced fried plantains, crisp and lightly salted.',
    ingredients: ['1 green plantain, thinly sliced', 'Oil for frying', 'Salt'],
    steps: ['Slice plantain very thin.', 'Fry until golden and crisp.', 'Drain and season with salt.'],
  },
  {
    id: 'lat-5', name: 'Tres Leches Cake', cuisine: 'Latin American', mealType: 'Dessert',
    diet: 'Vegetarian', subtype: 'Dairy & Paneer', carbs: 42, fiber: 1, protein: 6, emoji: '🍰',
    imageUrl: IMG('Tres_leches_cake.jpg'),
    desc: 'A sponge cake soaked in three kinds of milk, topped with whipped cream.',
    ingredients: ['1 slice sponge cake', '1/4 cup mixed evaporated, condensed & whole milk', 'Whipped cream', 'Cherry garnish'],
    steps: ['Poke holes in the cake and pour the milk mixture over it.', 'Chill until the milk is absorbed.', 'Top with whipped cream and a cherry.'],
  },
];
