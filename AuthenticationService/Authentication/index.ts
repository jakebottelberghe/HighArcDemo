import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import {encode} from "js-base64"

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    let {fullName, admin} = req.body;
    let encodeUserName = encode(fullName, false);
   context.res = {
        body: { 
            jtw: { 
                id: encodeUserName,
                fullName,
                isAdmin: admin !== undefined
            }}};

};

export default httpTrigger;