import { NextResponse } from 'next/server'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export async function POST() {
  try {
    const seedModule = await import(pathToFileURL(path.join(process.cwd(), 'prisma', 'seed.js')).href)
    const runSeed: (() => Promise<unknown>) | undefined =
      seedModule.runSeed || (typeof seedModule.default === 'function' ? seedModule.default : undefined)

    if (!runSeed) {
      return NextResponse.json({ error: 'Seed runner not found' }, { status: 500 })
    }

    const result = await runSeed()
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    console.error('Seeder route failed', error)
    return NextResponse.json({ error: 'Failed to seed database' }, { status: 500 })
  }
}
