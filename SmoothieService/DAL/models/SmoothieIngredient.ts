import { Ingredient } from "./Ingredient";
import { Measure } from "./Measure";
import { Smoothie } from "./Smoothie";

export class SmoothieIngredient
{
    Id: number;
    Smoothie: Smoothie;
    Measure: Measure;
    Amount: number;
    Ingredient: Ingredient;
}