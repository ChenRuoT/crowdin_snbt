import { FileInfo, TranslationEntry } from './types';

/**
 * Retrieve and parse the JSON content from the provided `FileInfo` structure.
 *
 * The function supports two mutually exclusive sources:
 * 1.  `content`   – Base64 encoded string that will be decoded and parsed.
 * 2.  `contentUrl` – Remote URL that will be fetched via HTTP `GET`.
 *
 * @throws When neither source is available or when the content cannot be
 *         fetched/parsed.
 */
export async function getContent(file: FileInfo): Promise<string> {
  if (file.content) {
    try {
      return Buffer.from(file.content, 'base64').toString();
    } catch (error) {
      throw new Error(
        `Failed to parse file content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  if (file.contentUrl) {
    try {
      const response = await fetch(file.contentUrl);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      throw new Error(
        `Failed to load content from ${file.contentUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  throw new Error('File object must contain either content or contentUrl');
}

/**
 * Resolve the array of `TranslationEntry` objects that should be used for the
 * current build/export operation.
 *
 * The caller can either inline the strings directly (`req.strings`) or provide
 * a link to a JSON file (`req.stringsUrl`). The helper normalises both cases
 * so that the rest of the pipeline receives an in-memory array.
 *
 * @throws When neither `strings` nor `stringsUrl` is provided or when the
 *         remote resource fails to load.
 */
export async function getStringsForExport(req: {
  strings?: TranslationEntry[];
  stringsUrl?: string;
}): Promise<TranslationEntry[]> {
  if (!req.strings && !req.stringsUrl) {
    throw new Error('Received invalid data: strings not found');
  }

  if (req.strings) {
    return req.strings;
  }

  if (req.stringsUrl) {
    try {
      const response = await fetch(req.stringsUrl);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(
        `Failed to load strings from ${req.stringsUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  return [];
}

/**
 * Safely obtain a translation string for the requested language or return the
 * fallback value when a translation is missing.
 */
export function getTranslation(
  translations: TranslationEntry[],
  stringId: string,
  languageId: string,
  fallbackTranslation: string
): string {
  const translation = translations.find(
    t => t.identifier === stringId && t.translations && t.translations[languageId]
  );

  return translation?.translations[languageId]?.text || fallbackTranslation;
}
