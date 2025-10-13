import { Coordonate } from "./coordonate";

export class NextCoordonate implements Coordonate{
    x : number;
    y : number;
    status : boolean;
    constructor(x:number, y : number, status : boolean) {
        this.x = x;
        this.y = y;
        this.status = status
    }
}