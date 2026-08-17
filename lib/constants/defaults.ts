/**
 * Default dynamic configuration applied when a new organization is
 * created. Nothing here is hard-coded in calculations — it is only
 * initial data; members can edit everything afterwards.
 */

export interface DefaultCategory {
  name: string;
  isFood: boolean;
  sortOrder: number;
}

export interface DefaultMealType {
  name: string;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: "Rent", isFood: false, sortOrder: 0 },
  { name: "Electricity", isFood: false, sortOrder: 1 },
  { name: "Water", isFood: false, sortOrder: 2 },
  { name: "WiFi", isFood: false, sortOrder: 3 },
  { name: "Gas", isFood: false, sortOrder: 4 },
  { name: "Grocery", isFood: true, sortOrder: 5 },
  { name: "Cooking", isFood: true, sortOrder: 6 },
  { name: "Maintenance", isFood: false, sortOrder: 7 },
  { name: "Others", isFood: false, sortOrder: 8 },
];

export const DEFAULT_MEAL_TYPES: readonly DefaultMealType[] = [
  { name: "Breakfast", sortOrder: 0 },
  { name: "Lunch", sortOrder: 1 },
  { name: "Dinner", sortOrder: 2 },
];

/** Initial meal weights: Breakfast 20 / Lunch 40 / Dinner 40. */
export const DEFAULT_MEAL_WEIGHTS: Record<string, number> = {
  Breakfast: 20,
  Lunch: 40,
  Dinner: 40,
};

export const DEFAULT_PAYMENT_METHODS: readonly string[] = [
  "Cash",
  "bKash",
  "Nagad",
  "Bank",
  "Other",
];

export const DEFAULT_SUBSCRIPTION_PLAN = "FREE";
