import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { DataSource } from 'typeorm';

export class ChatQueryDto {
  @ApiProperty({ example: 'How many appointments are scheduled for today?', description: 'Natural language query.' })
  query: string;

  @ApiProperty({ example: 'session-uuid', required: false })
  session_id?: string;
}

@ApiTags('AI Chatbot')
@Controller('api/chat')
export class ChatController {
  constructor(
    private readonly aiService: AiService,
    private readonly dataSource: DataSource,
  ) {}

  @ApiOperation({ summary: 'Query the database using natural language' })
  @ApiResponse({ status: 200, description: 'Returns natural language answer and raw JSON data.' })
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleChat(@Body() body: ChatQueryDto) {
    const { query } = body;

    const parsedQuery = await this.aiService.parseQuery(query);

    let rawResult;
    try {
      const repository = this.dataSource.getRepository(parsedQuery.targetEntity);

      if (parsedQuery.queryType === 'find') {
        rawResult = await repository.find(parsedQuery.queryOptions);
      } else if (parsedQuery.queryType === 'count') {
        rawResult = await repository.count(parsedQuery.queryOptions);
      } else {
        rawResult = { message: "Query type not implemented in prototype" };
      }
    } catch(err) {
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
}
