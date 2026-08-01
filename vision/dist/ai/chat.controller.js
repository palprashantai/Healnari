"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = exports.ChatQueryDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const ai_service_1 = require("./ai.service");
const typeorm_1 = require("typeorm");
class ChatQueryDto {
    query;
    session_id;
}
exports.ChatQueryDto = ChatQueryDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'How many appointments are scheduled for today?', description: 'Natural language query.' }),
    __metadata("design:type", String)
], ChatQueryDto.prototype, "query", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'session-uuid', required: false }),
    __metadata("design:type", String)
], ChatQueryDto.prototype, "session_id", void 0);
let ChatController = class ChatController {
    aiService;
    dataSource;
    constructor(aiService, dataSource) {
        this.aiService = aiService;
        this.dataSource = dataSource;
    }
    async handleChat(body) {
        const { query } = body;
        const parsedQuery = await this.aiService.parseQuery(query);
        let rawResult;
        try {
            const repository = this.dataSource.getRepository(parsedQuery.targetEntity);
            if (parsedQuery.queryType === 'find') {
                rawResult = await repository.find(parsedQuery.queryOptions);
            }
            else if (parsedQuery.queryType === 'count') {
                rawResult = await repository.count(parsedQuery.queryOptions);
            }
            else {
                rawResult = { message: "Query type not implemented in prototype" };
            }
        }
        catch (err) {
            console.error(err);
            rawResult = { error: err.message };
        }
        const finalResponse = await this.aiService.generateNaturalResponse(query, rawResult, parsedQuery);
        return {
            success: true,
            answer: finalResponse,
            parsedQuery,
            data: rawResult
        };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Query the database using natural language' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns natural language answer and raw JSON data.' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ChatQueryDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "handleChat", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('AI Chatbot'),
    (0, common_1.Controller)('api/chat'),
    __metadata("design:paramtypes", [ai_service_1.AiService,
        typeorm_1.DataSource])
], ChatController);
//# sourceMappingURL=chat.controller.js.map