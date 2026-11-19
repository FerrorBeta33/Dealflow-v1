// Keep the existing query call sites parameterized while pg uses $1, $2, ... .
// Question marks inside SQL string literals or quoted identifiers are not parameters.
export function placeholders(sql) {
  let quote = '';
  let index = 0;
  let result = '';
  for (let position = 0; position < sql.length; position++) {
    const character = sql[position];
    if (quote) {
      result += character;
      if (character === quote) {
        if (sql[position + 1] === quote) result += sql[++position];
        else quote = '';
      }
    } else if (character === "'" || character === '"') {
      quote = character;
      result += character;
    } else result += character === '?' ? `$${++index}` : character;
  }
  return result;
}
