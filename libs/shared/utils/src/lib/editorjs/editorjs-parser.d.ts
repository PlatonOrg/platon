declare module 'editorjs-parser' {
  export default class EdjsParser {
    constructor(config?: any, customParsers?: any);
    parse(data: any): string;
  }
}
