import { SmoothieIngredient } from "./SmoothieIngredient";
import { User } from "./User";

export class Smoothie
{
    constructor(){
        this.Ingredients = new Array<SmoothieIngredient>();
    }
    Id: number;
    User: User;
    Name: string;
    Ingredients: Array<SmoothieIngredient>;
}