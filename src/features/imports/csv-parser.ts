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

function parseDelimitedLine(line: string, delimiter: string): Array<string> {
  if (delimiter === ',') {
    return parseLine(line)
  }

  return line.split(delimiter).map((field) => field.trim().replace(/^"|"$/g, ''))
}

export function detectDelimiter(text: string): ',' | '\t' {
  const firstLine = text.split(/\r\n|\r|\n/).find((line) => line.trim().length > 0)
  if (!firstLine) {
    return ','
  }

  const tabCount = (firstLine.match(/\t/g) ?? []).length
  const commaCount = (firstLine.match(/,/g) ?? []).length
  return tabCount > commaCount ? '\t' : ','
}

export function parseDelimitedRows(
  text: string,
  delimiter = detectDelimiter(text),
): Array<Record<string, string>> {
  const lines = text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    throw new InvalidCsvError('Delimited text has no rows')
  }

  const headers = parseDelimitedLine(lines[0], delimiter).map((header) =>
    header.trim(),
  )

  return lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? ''
    })
    return row
  })
}

export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  return parseDelimitedRows(csvText, detectDelimiter(csvText))
}
