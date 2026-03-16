import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in .env')
}

const adapter = new PrismaPg({ connectionString })

const prisma = new PrismaClient({
  adapter,
})

async function main() {
  const account = await prisma.account.upsert({
    where: {
      id: 'seed-account-1',
    },
    update: {},
    create: {
      id: 'seed-account-1',
      companyName: 'Demo HR Account',
      amoAccountId: '12345678',
      amoDomain: 'demohr',
      status: 'active',
    },
  })

  const vacancy = await prisma.vacancy.upsert({
    where: {
      id: 'seed-vacancy-1',
    },
    update: {},
    create: {
      id: 'seed-vacancy-1',
      accountId: account.id,
      name: 'Sales Manager',
      hhVacancyId: 'hh-vacancy-001',
      jobDescription: 'Looking for a sales manager with CRM experience',
      companyDescription: 'Demo company for HR scoring widget',
    },
  })

  const candidate = await prisma.candidate.upsert({
  where: {
    id: 'seed-candidate-1',
  },
  update: {
    amoLeadId: '33245477',
  },
  create: {
    id: 'seed-candidate-1',
    accountId: account.id,
    vacancyId: vacancy.id,
    amoLeadId: '33245477',
    fullName: 'Ivan Petrov',
    age: 28,
    gender: 'male',
    city: 'Moscow',
    resumeText: 'Experienced sales manager with CRM and B2B background',
  },
})

  await prisma.vacancyHardRules.upsert({
    where: { vacancyId: vacancy.id },
    update: {},
    create: {
      vacancyId: vacancy.id,
      ageFrom: 18,
      ageTo: 45,
      gender: null,
      allowedCitiesJson: ['Москва', 'Санкт-Петербург', 'Dubai'],
      minExperienceYears: 1,
      salaryMax: 250000,
    },
  })

  await prisma.vacancySoftRules.upsert({
    where: { vacancyId: vacancy.id },
    update: {},
    create: {
      vacancyId: vacancy.id,
      mustHaveJson: ['CRM experience', 'B2B sales'],
      niceToHaveJson: ['English B2+', 'Team lead experience'],
      advantagesJson: ['Fast learner', 'Proactive'],
      risksJson: ['Job hopping', 'No relevant industry experience'],
      hrComments: 'Looking for someone who can start immediately',
    },
  })

  await prisma.vacancyAutoRejectSettings.upsert({
    where: { vacancyId: vacancy.id },
    update: {},
    create: {
      vacancyId: vacancy.id,
      rejectOnHardFail: true,
      rejectOnSoftFail: false,
      softRejectThreshold: 30,
    },
  })

  await prisma.scoringRun.upsert({
    where: {
      id: 'seed-scoring-run-1',
    },
    update: {},
    create: {
      id: 'seed-scoring-run-1',
      candidateId: candidate.id,
      vacancyId: vacancy.id,
      hardFilterPassed: true,
      hardRejectReason: null,
      score: 78,
      summary: 'Candidate looks promising for the first interview stage',
      status: 'scored',
    },
  })

  console.log('Seed completed successfully')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })