export interface Word {
    word: string;
    clue: string;
    startX?: number;
    startY?: number;
    direction?: 'across' | 'down';
    number?: number
}
