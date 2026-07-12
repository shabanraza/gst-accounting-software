export class InvalidCsvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidCsvError'
  }
}

function parseLine(line: string): Array<string> {
  const fields: Array<string> = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (insideQuotes) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else if (char === '"') {
        insideQuotes = false
      } else {
        current += char
      }
      continue
    }

    if (char === '"') {
      insideQuotes = true
    } else if (char === ',') {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields
}

export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const lines = csvText
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    throw new InvalidCsvError('CSV text has no rows')
  }

  const headers = parseLine(lines[0]).map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const values = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? ''
    })
    return row
  })
}
