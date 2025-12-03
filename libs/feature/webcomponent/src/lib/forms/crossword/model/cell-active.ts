import { CellActiveInterface } from "../model/cell-active-interface";

let CellActive = class CellActive implements CellActiveInterface{
    sizeOfWordActive : number; /* taille du case (mot) passé en paramètre */
    orientationWordActive : string;
    x : number;
    y : number
    constructor(size : number, orientation : string, x : number, y : number) {
        this.sizeOfWordActive = size;
        this.orientationWordActive = orientation;
        this.x = x;
        this.y = y
    }
    

}
export default CellActive