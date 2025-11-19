import { NextResponse } from 'next/server'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { prisma } from '@/lib/prisma'

async function loadSeedRunner() {
  const seedModule = await import(
    pathToFileURL(path.join(process.cwd(), 'prisma', 'seed.js')).href
  )
  return seedModule.runSeed || (typeof seedModule.default === 'function' ? seedModule.default : undefined)
}

export async function POST() {
  try {
    const tableRows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    `

    const tableNames = tableRows.map((row) => row.tablename).filter(Boolean)

    if (tableNames.length > 0) {
      const quoted = tableNames.map((name) => `"${name}"`).join(', ')
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`)
    }

    const runSeed = await loadSeedRunner()

    if (!runSeed) {
      return NextResponse.json({ error: 'Seed runner not found' }, { status: 500 })
    }

    const result = await runSeed()
    return NextResponse.json({
      ok: true,
      truncatedTables: tableNames,
      result,
    })
  } catch (error) {
    console.error('Reset and seed route failed', error)
    return NextResponse.json({ error: 'Failed to reset and seed database' }, { status: 500 })
  }
}
