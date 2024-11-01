import picocolors from 'picocolors';
import type { ValidateError } from '@/validate';

/**
 * Print validation errors
 */
export function printErrors(
  errors: ValidateError[],
  throwError: boolean = false,
) {
  let totalErrors = 0;
  const logs: string[] = [];

  for (const error of errors) {
    logs.push(
      picocolors.bold(picocolors.redBright(`Invalid URLs in ${error.file}:`)),
    );

    error.detected.forEach(([content, line, column, reason]) => {
      logs.push(
        `${picocolors.bold(content)}: ${reason} at line ${line} column ${column}`,
      );
    });
    logs.push(picocolors.dim('------'));

    totalErrors += error.detected.length;
  }

  const summary = `${errors.length} errored file, ${totalErrors} errors`;
  logs.push(
    picocolors.bold(
      totalErrors > 0
        ? picocolors.redBright(summary)
        : picocolors.greenBright(summary),
    ),
  );

  if (throwError && totalErrors > 0) {
    console.error(logs.join('\n'));
    process.exit(1);
  } else {
    console.log(logs.join('\n'));
  }
}
