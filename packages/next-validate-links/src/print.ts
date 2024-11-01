import picocolors from 'picocolors';
import type { ValidateError } from '@/validate';

export function printErrors(errors: ValidateError[]) {
  let totalErrors = 0;

  for (const error of errors) {
    console.error(
      picocolors.bold(picocolors.redBright(`Invalid URLs in ${error.file}:`)),
    );

    error.detected.forEach(([content, line, column]) => {
      console.error(
        `${picocolors.bold(content)} at line ${line}, column ${column}`,
      );
    });
    console.error(picocolors.dim('------'));

    totalErrors += error.detected.length;
  }
  const summary = `${errors.length} errored file, ${totalErrors} errors`;

  console.log(
    picocolors.bold(
      totalErrors > 0
        ? picocolors.redBright(summary)
        : picocolors.greenBright(summary),
    ),
  );
}
