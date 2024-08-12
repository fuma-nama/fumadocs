# @fuma-docs/openapi

## 5.0.3

### Patch Changes

- 96c9dda: Change Heading scroll margins
- c094fef: Fix compatibility issues on other content sources
- Updated dependencies [96c9dda]
- Updated dependencies [ba588a2]
- Updated dependencies [96c9dda]
- Updated dependencies [ec983a3]
  - fumadocs-core@13.2.0
  - fumadocs-ui@13.2.0

## 5.0.2

### Patch Changes

- 22549cd: Add authorization properties to examples

## 5.0.1

### Patch Changes

- 444af27: Fix self-referencing schema types
- 90af678: Reduce initial loaded bundle size

## 5.0.0

### Major Changes

- 971817c: **Migrate to React Server Component**

  The API reference page is now a server component.
  The MDX generator will only generate a small MDX file, and the rest will be handled by our `APIPage` component.

  ```mdx
  ---
  title: Delete Api
  full: true
  method: POST
  route: /v1/apis.deleteApi
  ---

  <APIPage
    operations={[{ path: '/v1/apis.deleteApi', method: 'post' }]}
    hasHead={false}
  />
  ```

  - Markdown/MDX content is still supported, but will be processed in the server component (during runtime) instead.
  - Your Remark/Rehype plugins (e.g. Rehype Code) configured in Fumadocs MDX or other source providers, will **not** be shared. Fumadocs OpenAPI uses a separate MDX processor instance.
  - `APIPage` component will fetch the OpenAPI Schema when being rendered. **On Vercel**, if it relies on the file system, ensure the page **will not** be re-rendered after build.

  Please refer to documentation for the new usage.

### Minor Changes

- 480d211: Change output path logic
- 4bf9851: Support to group pages by tags
- 3874ab5: Support Go Sample Request
- 3874ab5: Replace Response Table of Tabs

### Patch Changes

- 4bf9851: Improve Curl example generator
- Updated dependencies [f280191]
- Updated dependencies [61ef42c]
- Updated dependencies [deae4dd]
- Updated dependencies [c8910c4]
- Updated dependencies [c8910c4]
- Updated dependencies [6c42960]
  - fumadocs-core@13.1.0
  - fumadocs-ui@13.1.0

## 4.4.2

### Patch Changes

- Updated dependencies [37bbfff]
- Updated dependencies [e7c52f2]
  - fumadocs-core@13.0.7
  - fumadocs-ui@13.0.7

## 4.4.1

### Patch Changes

- Updated dependencies [1622e36]
  - fumadocs-ui@13.0.6
  - fumadocs-core@13.0.6

## 4.4.0

### Minor Changes

- b109e44: Improve generated sample requests

### Patch Changes

- Updated dependencies [2cf65f6]
  - fumadocs-core@13.0.5
  - fumadocs-ui@13.0.5

## 4.3.1

### Patch Changes

- d987912: Show current request pathname in Playground
- 0146572: Fix empty params

## 4.3.0

### Minor Changes

- 5acebdd: Support grouping output by folders (per operation)
- 744bd24: Support accessing context information on custom frontmatter
- 6bb9d2d: Support integration with Fumadocs Source API

### Patch Changes

- 744bd24: Fix generate files on `operation` mode
- Updated dependencies [5355391]
  - fumadocs-core@13.0.4
  - fumadocs-ui@13.0.4

## 4.2.2

### Patch Changes

- Updated dependencies [978342f]
  - fumadocs-core@13.0.3
  - fumadocs-ui@13.0.3

## 4.2.1

### Patch Changes

- Updated dependencies [4819820]
  - fumadocs-core@13.0.2
  - fumadocs-ui@13.0.2

## 4.2.0

### Minor Changes

- dfcc61f: Implement multipart form data

### Patch Changes

- f2b540a: Fix `fetch` problems on API Playground

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
