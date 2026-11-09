/** An error whose message is safe and useful to show to the person using the app. */
export class HandrailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HandrailError'
  }
}

export class GitNotFoundError extends HandrailError {
  constructor() {
    super('Git is not installed, or Handrail cannot find it. Install Git and restart Handrail.')
    this.name = 'GitNotFoundError'
  }
}

export class GitError extends Error {
  constructor(
    message: string,
    readonly args: readonly string[],
    readonly exitCode: number | null,
    readonly stderr: string
  ) {
    super(message)
    this.name = 'GitError'
  }

  get command(): string {
    return ['git', ...this.args].join(' ')
  }
}
