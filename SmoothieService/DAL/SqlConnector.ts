//import * as sql from "mssql"
import { Connection, Request, TYPES } from "tedious"
import { Smoothie } from "./models/Smoothie";
import { Ingredient } from "./models/Ingredient";
import { Measure } from "./models/Measure";
import { User } from "./models/User";
import { SmoothieIngredient } from "./models/SmoothieIngredient";
import { SimpleSmoothie } from "./models/SimpleSmoothie";

export class SqlConnector {
    // private connection: Connection;
    private configuration;
    constructor(server: string, userName: string, password: string) {
        this.configuration = {
            authentication: {
                options: {
                    userName,
                    password
                },
                type: "default"
            },
            server,
            options: {
                encrypt: true, // for azure
                database: 'smoothieService'
            }
        };
    }

    async getAllIngredients(): Promise<Array<Ingredient>> {
        return this.runSqlCommand<Array<Ingredient>>((resolve, reject) => {
            var ingredients = new Array<Ingredient>();
            let request = new Request('SELECT * FROM [dbo].[Ingredients]', (err, numRows) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                console.log(`Rows read ${numRows}`);
                resolve(ingredients);
            });
            request.on('row', (columns) => {
                var [{ value: Id }, { value: Name }] = columns;
                ingredients.push({ Id, Name });
            });
            return request;
        });
    }

    async getAllMeasures(): Promise<Measure> {
        return this.runSqlCommand<Measure>((resolve, reject) => {
            var measurements = new Array<Measure>();
            let request = new Request('SELECT * FROM [dbo].[Measures]', (err, numRows) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                console.log(`Rows read ${numRows}`);
                resolve(measurements);
            });
            request.on('row', (columns) => {
                var [{ value: Id }, { value: FullName }, { value: Abbreviation }] = columns;
                measurements.push({ Id, FullName, Abbreviation });
            });
            return request;
        });
    }
    async getSmoothie(smoothieId: number): Promise<Smoothie> {
        const sqlGetSmoothie = 'Select [sm].[Id] as SmoothieId,\
                [sm].[Name] as SmoothieName,\
                [us].[Id] as UserId,\
                [us].[FullName] as UserName,\
                [us].[UserKey] as UserKey\
            FROM [Smoothie] as sm\
                INNER JOIN [Users] as us WITH (NOLOCK) ON [us].[Id] = [sm].[User]\
            Where [sm].[Id] = @smoothieId';

        return this.runSqlCommand<Smoothie>((resolve, reject) => {
            let smoothie = new Smoothie();
            let request = new Request(sqlGetSmoothie, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(smoothie);
            })
            request.addParameter("smoothieId", TYPES.Int, smoothieId);
            request.on('row', (columns) => {
                var [{ value: SmoothieId }, { value: SmoothieName }, { value: UserId }, { value: FullName }, { value: UserKey }] = columns;
                smoothie.Id = SmoothieId;
                smoothie.Name = SmoothieName;
                smoothie.User = { Id: UserId, FullName, UserKey };
            });
            return request;
        });
    }

    async getSmoothieWithIngredients(smoothieId: number): Promise<Smoothie> {
        const sqlGetIngredients = 'SELECT\
                [ig].[Id] as IngredientId,\
                [ig].[Name] as IngredientName,\
                [smi].[Amount],\
                [smi].[Id] as SmoothieIngId,\
                [me].[Id] as MeasureId,\
                [me].[FullName] as MeusureFullName,\
                [me].[Abbreviation]\
            FROM [Smoothie] as sm WITH (NOLOCK)\
                INNER JOIN [SmoothieIngredient] as smi WITH (NOLOCK) ON [smi].[Smoothie] = [sm].[Id]\
                INNER JOIN [Measures] as me WITH (NOLOCK) ON [me].[Id] = [smi].[Measure]\
                INNER JOIN [Ingredients] as ig WITH (NOLOCK) ON [ig].[Id] = [smi].[Ingredient]\
            Where [sm].Id = @smoothieId';

        let smoothie = await this.getSmoothie(smoothieId);
        console.log(smoothie);
        return this.runSqlCommand<Smoothie>((resolve, reject) => {
            let request = new Request(sqlGetIngredients, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(smoothie);
            })
            request.addParameter("smoothieId", TYPES.Int, smoothieId);
            request.on('row', (columns) => {
                var [{ value: IngredientId },
                    { value: IngredientName },
                    { value: Amount },
                    { value: SmoothieIngredientId },
                    { value: MeasureId },
                    { value: MeasureName },
                    { value: MeasureAbbreviation }] = columns;

                let newIngredient = {
                    Id: SmoothieIngredientId,
                    Smoothie: null,
                    Measure: {
                        Id: MeasureId,
                        FullName: MeasureName,
                        Abbreviation: MeasureAbbreviation
                    },
                    Amount,
                    Ingredient: {
                        Id: IngredientId,
                        Name: IngredientName
                    }
                };
                smoothie.Ingredients.push(newIngredient);
            });
            return request;
        });
    }

    async getOrCreateUser(userId, userName): Promise<User> {
        var user = await this.getUser(userId);
        if (user === undefined) {
            await this.runSqlCommand((resolve, reject) => {
                const addUser = 'INSERT INTO [Users] (FUllName, UserKey) VALUES (@fullName, @userKey)';
                let request = new Request(addUser, (err) => {
                    if (err) {
                        console.log(err);
                        reject(err);
                        return;
                    }
                    resolve(true);
                })
                request.addParameter("fullName", TYPES.NVarChar, userName);
                request.addParameter("userKey", TYPES.NVarChar, userId);
                return request;
            });

            user = await this.getUser(userId);
        }
        return Promise.resolve<User>(user);
    }

    async getUser(userId): Promise<User> {
        return this.runSqlCommand((resolve, reject) => {
            const getUserSql = 'SELECT Id, FullName, UserKey FROM [Users] WHERE UserKey = @userId';
            let userDbo: User;
            let request = new Request(getUserSql, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(userDbo);
            })
            request.addParameter("userId", TYPES.NVarChar, userId);
            request.on('row', (columns) => {
                var [{ value: Id }, { value: FullName }, { value: UserKey }] = columns;
                userDbo = { Id, FullName, UserKey };
            });
            return request;
        });
    }

    async createSmoothie(user: User, smoothie: { Name: string }): Promise<Smoothie> {
        await this.runSqlCommand<boolean>((resolve, reject) => {
            const sqlCreateSmoothie = 'INSERT INTO [Smoothie] ([User], [Name]) VALUES (@user, @name)';
            let request = new Request(sqlCreateSmoothie, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(true);
            })
            request.addParameter("name", TYPES.NVarChar, smoothie.Name);
            request.addParameter("user", TYPES.Int, user.Id);
            return request;
        });

        let smoothieId = await this.runSqlCommand<number>((resolve, reject) => {
            const sqlCreateSmoothie = 'SELECT [Id] FROM [Smoothie] where [User] = @user AND [Name] = @name';
            let newSmoothieId = -1;
            let request = new Request(sqlCreateSmoothie, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(newSmoothieId);
            })
            request.addParameter("name", TYPES.NVarChar, smoothie.Name);
            request.addParameter("user", TYPES.Int, user.Id);
            request.on("row", (column) => {
                newSmoothieId = column[0].value;
            })
            return request;
        });
        if (smoothieId !== undefined) {
            return this.getSmoothie(smoothieId);
        }
        return Promise.resolve<Smoothie>(null);
    }

    async clearIngredients(smoothieId): Promise<boolean> {
        return this.runSqlCommand<boolean>((resolve, reject) => {
            const sqlCreateSmoothie = 'DELETE FROM [SmoothieIngredient] WHERE [Smoothie] = @smoothieId';
            let request = new Request(sqlCreateSmoothie, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(true);
            })
            request.addParameter("smoothieId", TYPES.Int, smoothieId);
            return request;
        });
    }
    async addIngredientsToSmoothie(smoothieId: number, ingredients: Array<SmoothieIngredient>) {
        let promises = new Array<Promise<boolean>>();
        for (let ingredient of ingredients) {
            promises.push(this.addIngredientToSmoothie(smoothieId, ingredient));
        }
        return await Promise.all(promises);
    }

    async addIngredientToSmoothie(smoothieId, ingredient: SmoothieIngredient): Promise<boolean> {
        return this.runSqlCommand<boolean>((resolve, reject) => {
            const addIngredientSql = 'INSERT INTO SmoothieIngredient (Smoothie, Measure, Amount, Ingredient) Values (@smoothieId, @measureId, @amount, @ingredientId)';
            let request = new Request(addIngredientSql, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(true);
            })
            request.addParameter("smoothieId", TYPES.Int, smoothieId);
            request.addParameter("measureId", TYPES.Int, ingredient.Measure.Id);
            request.addParameter("amount", TYPES.Float, ingredient.Amount);
            request.addParameter("ingredientId", TYPES.Int, ingredient.Ingredient.Id);
            return request;
        });
    }

    async addIngredient(ingredientName): Promise<boolean>{
        return this.runSqlCommand<boolean>((resolve, reject) => {
            const addIngredientSql = 'INSERT INTO Ingredients (Name) Values (@name)';
            let request = new Request(addIngredientSql, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(true);
            })
            request.addParameter("name", TYPES.NVarChar, ingredientName);
            return request;
        });
    }

    async addMeasure(measureName: string, measureAbbreviation: string): Promise<boolean>{
        return this.runSqlCommand<boolean>((resolve, reject) => {
            const addIngredientSql = 'INSERT INTO Measures (FullName, Abbreviation) Values (@name, @abbreviation)';
            let request = new Request(addIngredientSql, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(true);
            })
            request.addParameter("name", TYPES.NVarChar, measureName);
            request.addParameter("abbreviation", TYPES.NVarChar, measureAbbreviation);
            return request;
        });
    }

    async updateSmoothieName(smoothieId: string, smoothieName: string): Promise<boolean>{
        return this.runSqlCommand<boolean>((resolve, reject) => {
            const addIngredientSql = 'UPDATE Smoothie SET [Name] = @name WHERE [Id] = @id';
            let request = new Request(addIngredientSql, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(true);
            })
            request.addParameter("name", TYPES.NVarChar, smoothieName);
            request.addParameter("id", TYPES.NVarChar, smoothieId);
            return request;
        });
    }
    async deleteSmoothie(smoothieId: number): Promise<boolean> {
        await this.clearIngredients(smoothieId);

        return this.runSqlCommand<boolean>((resolve, reject) => {
            const sqlCreateSmoothie = 'DELETE FROM [Smoothie] WHERE [id] = @smoothieId';
            let request = new Request(sqlCreateSmoothie, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(true);
            })
            request.addParameter("smoothieId", TYPES.Int, smoothieId);
            return request;
        });
    }

    async getAllSmoothiesForUser(userId: number): Promise<Array<SimpleSmoothie>> {

        let response = await this.runSqlCommand<Array<SimpleSmoothie>>((resolve, reject) => {
            const sqlCreateSmoothie = 'SELECT [Id], [Name], [User] FROM [Smoothie] WHERE [user] = @userId';
            let smoothieList = new Array<SimpleSmoothie>();
            let request = new Request(sqlCreateSmoothie, (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                resolve(smoothieList);
            })
            request.addParameter("userId", TYPES.Int, userId);
            
            request.on("row", (columns) => {
                var [{ value: Id }, { value: Name }, { value: User }] = columns;
                smoothieList.push({Id, Name, User});
            })

            return request;
        });
        
        return response.length > 0 ? response : null;
    }

    async runSqlCommand<Type>(requestGenerator: Function): Promise<Type> {
        return new Promise<Type>((resolve, reject) => {
            var connect = new Connection(this.configuration);
            connect.on('connect', (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                var ingredients = new Array<Ingredient>();
                let request = requestGenerator(resolve, reject);
                connect.execSql(request);
            });
            connect.connect();
        });
    }
}