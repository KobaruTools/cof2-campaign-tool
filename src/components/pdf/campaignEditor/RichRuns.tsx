/**
 * Rend une suite de `PdfTextRun` (résolus par `richTextToPdfRuns.ts`) en `<Text>`
 * `@react-pdf/renderer` : le seul style qui survit à l'impression est le gras (PER-201,
 * cf. note de tête de `richTextToPdfRuns.ts`).
 */
import { Text } from '@react-pdf/renderer';
import type { StyleProp } from '@react-pdf/types';
import type { PdfTextRun } from '@/lib/character/pdfExport/richTextToPdfRuns';
import { styles } from './styles';

export function RichRuns({ runs, style }: { runs: PdfTextRun[]; style?: StyleProp }) {
  return (
    <Text style={style ?? styles.rankText}>
      {runs.map((run, i) =>
        run.bold ? (
          <Text key={i} style={{ fontWeight: 700 }}>
            {run.text}
          </Text>
        ) : (
          <Text key={i}>{run.text}</Text>
        ),
      )}
    </Text>
  );
}
