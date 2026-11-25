const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

export const extractEmails = (content: string, hasHeader: boolean = false): { valid: string[]; invalid: string[] } => {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  const startIdx = hasHeader ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    // Try to find email in CSV columns
    const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));

    let found = false;
    for (const part of parts) {
      if (isValidEmail(part)) {
        const normalized = part.toLowerCase().trim();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          valid.push(normalized);
        }
        found = true;
        break;
      }
    }

    if (!found && line.length > 0 && !line.startsWith('#')) {
      // Check if the whole line is an email
      const trimmed = line.trim();
      if (isValidEmail(trimmed)) {
        const normalized = trimmed.toLowerCase();
        if (!seen.has(normalized)) {
          seen.add(normalized);
          valid.push(normalized);
        }
      } else if (i > 0 || !hasHeader) {
        invalid.push(line);
      }
    }
  }

  return { valid, invalid };
};

export const parseRecipientFile = (content: string, filename: string): { valid: string[]; invalid: string[]; duplicatesRemoved: number } => {
  const isCSV = filename.toLowerCase().endsWith('.csv');
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length === 0) {
    return { valid: [], invalid: [], duplicatesRemoved: 0 };
  }

  // Detect if first line is a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = isCSV && (firstLine.includes('email') || firstLine.includes('mail') || firstLine.includes('address'));

  const allEmails: string[] = [];
  const invalid: string[] = [];

  const startIdx = hasHeader ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));

    let found = false;
    for (const part of parts) {
      if (isValidEmail(part)) {
        allEmails.push(part.toLowerCase().trim());
        found = true;
        break;
      }
    }

    if (!found && line.length > 0) {
      invalid.push(line);
    }
  }

  const uniqueEmails = [...new Set(allEmails)];
  const duplicatesRemoved = allEmails.length - uniqueEmails.length;

  return { valid: uniqueEmails, invalid, duplicatesRemoved };
};
