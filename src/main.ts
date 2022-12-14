import { resolve } from 'path';
import { fileURLToPath } from 'url'
import { spawn } from 'node:child_process'

import { getInput } from '@actions/core'

const nodePath = resolve(process.argv[1]);
const modulePath = resolve(fileURLToPath(import.meta.url))

export const run = async (): Promise<void> => {
  /**
   * name of the machine to access
   */
  const machineId = (
    getInput('machineName')
    || process.env.GITHUB_RUN_ID
    || `machine-${Date.now()}`
  ).slice(0, 20)

  /**
   * The time until the action continues the build of the machine
   * does not get authorised
   */
  const timeout = (
    parseInt(getInput('timeout'), 10)
    || 30 * 1000 // default 30s
  )

  /**
   * name the machine as an individual command so that we don't
   * get prompt when launching the server
   */
  const child = spawn(
    'code-server',
    ['--accept-server-license-terms', 'rename', '--name', machineId],
    { stdio: [process.stdin, process.stdout, process.stderr] }
  )

  const startServer = await new Promise<boolean>((resolve, reject) => {
    const t = setTimeout(() => resolve(false), timeout)

    child.on('exit', (exit) => {
      clearTimeout(t)
      return exit === 0
        ? resolve(true)
        : reject(new Error('Failed to set machine name'))
    })
  })

  if (!startServer) {
    console.log('Timeout reached, continuing the build')
    return process.exit(0)
  }

  spawn('code-server', ['--accept-server-license-terms'], {
    stdio: [process.stdin, process.stdout, process.stderr]
  })
}

/**
 * only run action if module is called through Node
 */
if (nodePath.endsWith('dist/index.js')) {
  run()
}
