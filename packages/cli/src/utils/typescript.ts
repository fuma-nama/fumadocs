import { Project } from 'ts-morph';

export function createEmptyProject(): Project {
  return new Project({
    compilerOptions: {},
  });
}
