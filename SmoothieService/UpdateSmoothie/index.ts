import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import {SqlConnector} from "../DAL/SqlConnector"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    const {jwt, smoothie} = req.body;
    // Should not be trusting user input :) 
    if(jwt.id !== smoothie.User.UserKey)
    {
        context.res = {status: 400};
        return;
    }
    let dataSource = new SqlConnector(process.env["SqlServer"], process.env["SqlUser"], process.env["SqlPassword"]);
    await dataSource.clearIngredients(smoothie.Id);
    await dataSource.addIngredientsToSmoothie(smoothie.Id, smoothie.Ingredients);
    await dataSource.updateSmoothieName(smoothie.Id, smoothie.Name);

    context.res = {status: 200};
};

export default httpTrigger;