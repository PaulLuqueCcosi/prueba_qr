export class InvalidMatrixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMatrixError';
  }
}
