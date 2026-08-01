export declare class AiService {
    private genAI;
    private openaiClient;
    constructor();
    private getSystemPrompt;
    private cleanResponse;
    parseQuery(userQuery: string, history?: any[]): Promise<any>;
    generateNaturalResponse(userQuery: string, dbResult: any, parsedQuery: any): Promise<string>;
}
