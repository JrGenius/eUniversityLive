import { execSync } from 'node:child_process'

export default function setup() {
  const url = process.env.TEST_DATABASE_URL || 'postgresql://euniv:euniv@localhost:5455/euniv_live_test'
  process.env.DATABASE_URL = url
  execSync('npx prisma migrate deploy', { stdio: 'pipe', env: { ...process.env, DATABASE_URL: url } })
}
