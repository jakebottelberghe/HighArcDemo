import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import {SqlConnector} from "../DAL/SqlConnector"
import { User } from "../DAL/models/User";
import { Smoothie } from "../DAL/models/Smoothie";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {

    var {jwt, smoothie} = req.body;

    //Better error handling
    if(jwt.id === undefined || jwt.fullName === undefined || smoothie.Name === undefined){
        context.res = {status: 400};
        return;
    }    
    let dataSource = new SqlConnector(process.env["SqlServer"], process.env["SqlUser"], process.env["SqlPassword"], process.env["SqlDB"]);
    var user = await dataSource.getOrCreateUser(jwt.id, jwt.fullName);
    
    //Better error handling
    if(user === undefined)
    {
        context.res = {status: 400};
        return;
    }

    var newSmoothie = await dataSource.createSmoothie(user, smoothie);

    //Better error handling
    if(newSmoothie === undefined)
    {
        context.res = {status: 400};
    }
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: newSmoothie
    };

};

export default httpTrigger;