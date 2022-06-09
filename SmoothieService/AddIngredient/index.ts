import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import {SqlConnector} from "../DAL/SqlConnector"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    
    let dataSource = new SqlConnector(process.env["SqlServer"], process.env["SqlUser"], process.env["SqlPassword"], process.env["SqlDB"]);
    let {ingredient} = req.body;
    await dataSource.addIngredient(ingredient);

    context.res = {
        status: 200
    };
};

export default httpTrigger;