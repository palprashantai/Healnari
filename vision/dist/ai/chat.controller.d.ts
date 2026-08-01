import { AiService } from './ai.service';
import { DataSource } from 'typeorm';
export declare class ChatQueryDto {
    query: string;
    session_id?: string;
}
export declare class ChatController {
    private readonly aiService;
    private readonly dataSource;
    constructor(aiService: AiService, dataSource: DataSource);
    handleChat(body: ChatQueryDto): Promise<{
        success: boolean;
        answer: string;
        parsedQuery: any;
        data: any;
    }>;
}
