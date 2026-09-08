import serverless from 'serverless-http'
import { createApp } from '../../server/app'
export const handler = serverless(createApp())
