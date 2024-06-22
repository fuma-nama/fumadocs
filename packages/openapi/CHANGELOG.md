# @fuma-docs/openapi

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
