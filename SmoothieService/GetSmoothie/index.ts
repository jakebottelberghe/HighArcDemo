import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import {SqlConnector} from "../DAL/SqlConnector"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    
    let dataSource = new SqlConnector(process.env["SqlServer"], process.env["SqlUser"], process.env["SqlPassword"]);
    let data = await dataSource.getSmoothieWithIngredients(context.bindingData.id);
    if(data === undefined)
    {
        context.res = {status: 404};
    } else {
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: data
        };
    }

};

export default httpTrigger;