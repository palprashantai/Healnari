import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '@/core/filters/http-exception.filter';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use Helmet for security headers
  app.use(helmet());

  // Allow the frontend dev/prod origin to make requests
  app.enableCors({ origin: process.env.FRONTEND_URL || 'https://healnari.vercel.app' || 'http://localhost:5173' });

  // Apply Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Apply Global Exception Filter (Error Handling)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Setup Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('HealNari API')
    .setDescription('The modular backend REST API for the HealNari platform.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 5000);
}
bootstrap();
