import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import {SqlConnector} from "../DAL/SqlConnector"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    
    console.log(`${process.env["SqlServer"]}, ${process.env["SqlUser"]}, ${process.env["SqlPassword"]}`);
    let dataSource = new SqlConnector(process.env["SqlServer"], process.env["SqlUser"], process.env["SqlPassword"]);
    let data = await dataSource.getAllIngredients();
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: data
    };

};

export default httpTrigger;