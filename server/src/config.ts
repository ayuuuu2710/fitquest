import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  APP_BASE_URL: z.string().url().default('http://localhost:5173'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  RESEND_API_KEY: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
  EMAIL_FROM: z.preprocess((value) => value === '' ? undefined : value, z.string().min(3).optional()),
  USDA_API_KEY: z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional()),
}).superRefine((environment, context) => {
  if (environment.NODE_ENV === 'production' && !environment.MONGODB_URI) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'MONGODB_URI is required in production.', path: ['MONGODB_URI'] })
  }
  if (environment.NODE_ENV === 'production' && !environment.APP_BASE_URL.startsWith('https://')) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'APP_BASE_URL must use HTTPS in production.', path: ['APP_BASE_URL'] })
  }
})

const parsedEnvironment = environmentSchema.safeParse(process.env)

if (!parsedEnvironment.success) {
  const issueList = parsedEnvironment.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
  throw new Error(`Invalid server configuration: ${issueList}`)
}

export const config = {
  nodeEnv: parsedEnvironment.data.NODE_ENV,
  port: parsedEnvironment.data.PORT,
  clientOrigin: parsedEnvironment.data.CLIENT_ORIGIN,
  mongoUri: parsedEnvironment.data.MONGODB_URI,
  appBaseUrl: parsedEnvironment.data.APP_BASE_URL,
  sessionTtlDays: parsedEnvironment.data.SESSION_TTL_DAYS,
  resendApiKey: parsedEnvironment.data.RESEND_API_KEY,
  emailFrom: parsedEnvironment.data.EMAIL_FROM,
  usdaApiKey: parsedEnvironment.data.USDA_API_KEY,
}
