# @fuma-docs/openapi

## 4.1.1

### Patch Changes

- fumadocs-core@13.0.1
- fumadocs-ui@13.0.1

## 4.1.0

### Minor Changes

- abf84bb: Support to customise/disable TypeScript Response generation
- 40728a1: Support custom fields (auth, query, header, path and body)

### Patch Changes

- Updated dependencies [89190ae]
- Updated dependencies [b02eebf]
- Updated dependencies [09c3103]
- Updated dependencies [f868018]
- Updated dependencies [8aebeab]
- Updated dependencies [c684c00]
- Updated dependencies [8aebeab]
- Updated dependencies [0377bb4]
- Updated dependencies [e8e6a17]
- Updated dependencies [c8964d3]
- Updated dependencies [c901e6b]
- Updated dependencies [daa7d3c]
- Updated dependencies [c714eaa]
- Updated dependencies [89190ae]
- Updated dependencies [b02eebf]
- Updated dependencies [b02eebf]
- Updated dependencies [4373231]
  - fumadocs-ui@13.0.0
  - fumadocs-core@13.0.0

## 4.0.6

### Patch Changes

- Updated dependencies [a332bee]
  - fumadocs-ui@12.5.6
  - fumadocs-core@12.5.6

## 4.0.5

### Patch Changes

- Updated dependencies [3519e6c]
  - fumadocs-ui@12.5.5
  - fumadocs-core@12.5.5

## 4.0.4

### Patch Changes

- Updated dependencies [fccdfdb]
- Updated dependencies [2ffd5ea]
  - fumadocs-core@12.5.4
  - fumadocs-ui@12.5.4

## 4.0.3

### Patch Changes

- Updated dependencies [5d963f4]
  - fumadocs-ui@12.5.3

## 4.0.2

### Patch Changes

- 0c8eddf: Fix overlap of navbar and api info
- Updated dependencies [a5c34f0]
  - fumadocs-ui@12.5.2

## 4.0.1

### Patch Changes

- Updated dependencies [c5d20d0]
- Updated dependencies [3d8f6cf]
  - fumadocs-ui@12.5.1

## 4.0.0

### Major Changes

- ad143e1: Move UI implementation from `fumadocs-ui` to `fumadocs-openapi`.

  **why:** Allow a better organization of packages.

  **migrate:**

  This package is now Tailwind CSS only, you need to use it in conjunction with the official Tailwind CSS plugin.

  Add the package to `content` under your Tailwind CSS configuration.

  ```js
  import { createPreset, presets } from 'fumadocs-ui/tailwind-plugin';

  /** @type {import('tailwindcss').Config} */
  export default {
    content: [
      './node_modules/fumadocs-ui/dist/**/*.js',
      './node_modules/fumadocs-openapi/dist/**/*.js',
    ],
    presets: [createPreset()],
  };
  ```

  Re-generate MDX files if needed.

### Minor Changes

- ad143e1: Implement OpenAPI playground
- ad143e1: Support passing base url to Root component

### Patch Changes

- ad143e1: Combine `allOf` into one object schema
- Updated dependencies [b9fa99d]
- Updated dependencies [a4bcaa7]
- Updated dependencies [d1c7405]
  - fumadocs-ui@12.5.0

## 3.3.0

### Minor Changes

- b1b154e: Display object types mentioned in schema
- 81fde3f: Support complex types & self-referencing types

## 3.2.0

### Minor Changes

- 0e420cb: Support generating custom code examples

## 3.1.3

### Patch Changes

- 464e44c: Improve example request URL generation

## 3.1.2

### Patch Changes

- 78acd55: Use full mode on docs pages by default on OpenAPI generated pages

## 3.1.1

### Patch Changes

- 318eaf9: Support generating files per operation

## 3.1.0

### Minor Changes

- 3bdc786: Support JavaScript request example
- 3bdc786: Support generating Authorization (`security`) section

## 3.0.0

### Major Changes

- 284a571: **Renew Generate API.**

  **why:** Improve flexibility.

  **migrate:**

  Removed the `render` option from `generate`, `generateFiles` and `generateTags`, use `frontmatter` to customise frontmatter, `imports` to customise imports.

- 284a571: **Support Custom MDX Renderer.**

  **why:** Allow people to customise how the MDX file is generated.

  **migrate:**

  Changed the output of MDX files, the new structure requires components:

  - Root
  - API
  - APIInfo
  - APIExample
  - Responses
  - Response
  - ExampleResponse
  - TypeScriptResponse
  - Property
  - ObjectCollapsible
  - ResponseTypes

  ````mdx
  <API>

  <APIInfo method={"GET"} route={"/pets/{petId}"}>

  ## Info for a specific pet

  ### Path Parameters

  <Property name={"petId"} type={"string"} required={true} deprecated={false}>

  The id of the pet to retrieve

  </Property>

  | Status code | Description                          |
  | ----------- | ------------------------------------ |
  | `200`       | Expected response to a valid request |
  | `default`   | unexpected error                     |

  </APIInfo>

  <APIExample>

  ```bash title="curl"
  curl -X GET "http://petstore.swagger.io/pets/string"
  ```

  <Responses items={["200","default"]}>

  <Response value={"200"}>

  <ResponseTypes>

  <ExampleResponse>

  ```json
  {
    "id": 0,
    "name": "string",
    "tag": "string"
  }
  ```

  </ExampleResponse>

  <TypeScriptResponse>

  ```ts
  export interface Response {
    id: number;
    name: string;
    tag?: string;
  }
  ```

  </TypeScriptResponse>

  </ResponseTypes>

  </Responses>

  </APIExample>

  </API>
  ````

## 2.0.5

### Patch Changes

- bcc05d6: Fix docs typo

## 2.0.4

### Patch Changes

- 310e0ab: Fix multi-line frontmatter

## 2.0.3

### Patch Changes

- 1d3917f: Fix nullable types cannot be detected

## 2.0.2

### Patch Changes

- 9681cc3: Add put method key

## 2.0.1

### Patch Changes

- 8ef2b68: Bump deps

## 2.0.0

### Major Changes

- eacd7b0b: **Remove support for bin usages**

  why: It is more flexible and faster to write a script directly.

  migrate: Create a script named `scripts/generate-docs.mjs`:

  ```js
  import { generateFiles } from 'fumadocs-openapi';

  void generateFiles({
    input: ['./petstore.yaml'],
    output: './content/docs',
  });
  ```

  Execute it with `node ./scripts/generate-docs.mjs`.

## 1.1.0

### Minor Changes

- 8665888: Added patterns support to config Inputs.

## 1.0.1

### Patch Changes

- 6c5a39a: Rename Git repository to `fumadocs`

## 1.0.0

### Major Changes

- 2b11c20: **Rename to Fumadocs**

  `next-docs-zeta` -> `fumadocs-core`

  `next-docs-ui` -> `fumadocs-ui`

  `next-docs-mdx` -> `fumadocs-mdx`

  `@fuma-docs/openapi` -> `fumadocs-openapi`

  `create-next-docs-app` -> `create-fumadocs-app`

## 0.1.0

### Minor Changes

- 45a52ae: **Support generating docs for OpenAPI schema**

  In `openapi.config.js`:

  ```js
  /**
   * @type {import("@fuma-docs/openapi").Config}
   */
  module.exports = {
    input: ['./petstore.yaml'],
    output: './content/docs',
    per: 'tag',
    render: (title, description) => {
      return {
        frontmatter: [
          '---',
          `title: ${title}`,
          `description: ${description}`,
          'toc: false',
          '---',
        ].join('\n'),
      };
    },
  };
  ```

  Run `fuma-docs-openapi` to generate.
