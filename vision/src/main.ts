import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './core/filters/http-exception.filter';
import helmet from 'helmet';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://healnari.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://healnari-api.onrender.com',
  'https://healnari.onrender.com'
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use Helmet for security headers
  app.use(helmet());

  // Allow the frontend dev/prod origin(s) to make requests.
  // FRONTEND_URL may hold a single origin or a comma-separated list; it is
  // merged with the known defaults so a misconfigured/missing env var on the
  // host (e.g. Render) never silently locks out the deployed frontend.
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = Array.from(new Set([...envOrigins, ...DEFAULT_ALLOWED_ORIGINS]));

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

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

  const port = process.env.PORT || 5000;
  await app.listen(port);

  const url = await app.getUrl();
  console.log(`Swagger docs available at ${url}/api/docs`);
}
bootstrap();
