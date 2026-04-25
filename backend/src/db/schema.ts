export function quoteIdentifier(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error("Invalid database schema name");
  }

  return `"${value}"`;
}
