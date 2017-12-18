export class NotImplementedError extends Error {
  constructor(message) {
    super(`not implemented${message ? `: ${message}` : ''}`)
  }
}
