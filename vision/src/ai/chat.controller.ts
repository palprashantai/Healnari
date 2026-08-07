import { Controller, Post, Body, Headers, HttpCode, HttpStatus, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiHeader } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { DataSource } from 'typeorm';
import { ResponseHelper } from '../common/helpers/response.helper';
import { ERROR_MESSAGES } from '../common/constants/errors.constant';

export class ChatQueryDto {
  @ApiProperty({ example: 'How many appointments are scheduled for today?', description: 'Natural language query.' })
  query: string;

  @ApiProperty({ example: 'session-uuid', required: false })
  session_id?: string;
}

/**
 * This endpoint turns free text into a database query. It is admin-only and,
 * beyond auth, never trusts the LLM's JSON directly: AiService.sanitizeQueryOptions
 * re-derives the query against a hard-coded entity/column allow-list before
 * anything reaches TypeORM. See ai.service.ts for that allow-list.
 */
@ApiTags('AI Chatbot')
@Controller('api/chat')
@ApiHeader({ name: 'Authorization', description: 'Bearer admin_token', required: true })
export class ChatController {
  constructor(
    private readonly aiService: AiService,
    private readonly dataSource: DataSource,
  ) { }

  private checkAdmin(headers: any) {
    const auth = headers['authorization'];
    if (!auth) throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    if (!auth.includes('admin')) throw new ForbiddenException(ERROR_MESSAGES.FORBIDDEN);
  }

  @ApiOperation({ summary: 'Query aggregate platform stats using natural language (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns natural language answer and the (allow-listed) query result.' })
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleChat(@Headers() headers: any, @Body() body: ChatQueryDto) {
    this.checkAdmin(headers);
    const { query } = body;

    let safeQuery;
    try {
      const parsedQuery = await this.aiService.parseQuery(query);
      safeQuery = this.aiService.sanitizeQueryOptions(parsedQuery);
    } catch (err) {
      console.error('AI query parsing/sanitization failed:', err);
      return ResponseHelper.error('Could not understand or safely execute that query.');
    }

    let rawResult;
    try {
      const repository = this.dataSource.getRepository(safeQuery.targetEntity);

      if (safeQuery.queryType === 'find') {
        rawResult = await repository.find(safeQuery.queryOptions);
      } else if (safeQuery.queryType === 'count') {
        rawResult = await repository.count(safeQuery.queryOptions);
      } else {
        rawResult = { message: 'Query type not implemented in prototype' };
      }
    } catch (err) {
      // Log full detail server-side only — never return raw DB/ORM errors to the client.
      console.error('Chat query execution failed:', err);
      return ResponseHelper.error('Something went wrong running that query.');
    }

    const finalResponse = await this.aiService.generateNaturalResponse(query, rawResult, safeQuery);

    return ResponseHelper.success(
      { answer: finalResponse, parsedQuery: safeQuery, data: rawResult },
      'Query executed successfully.',
    );
  }
}
