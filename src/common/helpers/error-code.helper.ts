export function generateErrorCode(
  controllerPrefix: string,
  index: number,
): string {
  return `${controllerPrefix}${String(index).padStart(3, '0')}`;
}

export const ErrorCodeConfig = {
  codes: new Map<string, Map<string, string>>(),

  register(controllerName: string, methodCodes: Record<string, string>): void {
    this.codes.set(controllerName, new Map(Object.entries(methodCodes)));
  },

  get(controllerName: string, methodName: string): string | undefined {
    return this.codes.get(controllerName)?.get(methodName);
  },
};