import { ObjectExpression, ObjectProperty, Visitor, type Program } from 'oxc-parser';

/**
 * Add path to the `pages` array in tanstack start vite config.
 *
 * If the `pages` property doesn't exist, create one.
 */
export function addTanstackPrerender(configFileAst: Program, paths: string[]) {
  new Visitor({
    CallExpression(node) {
      if (node.callee.type === 'Identifier' && node.callee.name === 'tanstackStart') {
        const argment = node.arguments[0];

        if (argment.type === 'ObjectExpression') {
          const prop = argment.properties.find(
            (prop): prop is ObjectProperty =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'pages',
          );

          function toItem(path: string): ObjectExpression {
            return {
              type: 'ObjectExpression',
              start: -1,
              end: -1,
              properties: [
                {
                  type: 'Property',
                  kind: 'init',
                  computed: false,
                  method: false,
                  shorthand: false,
                  start: -1,
                  end: -1,
                  key: {
                    type: 'Identifier',
                    name: 'path',
                    start: -1,
                    end: -1,
                  },
                  value: {
                    type: 'Literal',
                    value: path,
                    raw: '',
                    start: -1,
                    end: -1,
                  },
                },
              ],
            };
          }

          if (prop && prop.value.type === 'ArrayExpression') {
            for (const path of paths) {
              prop.value.elements.push(toItem(path));
            }
          } else {
            argment.properties.push({
              type: 'Property',
              kind: 'init',
              start: -1,
              end: -1,
              computed: false,
              method: false,
              shorthand: false,
              key: { type: 'Identifier', name: 'pages', start: -1, end: -1 },
              value: {
                type: 'ArrayExpression',
                start: -1,
                end: -1,
                elements: paths.map(toItem),
              },
            });
          }
        }
      }
    },
  }).visit(configFileAst);
}
