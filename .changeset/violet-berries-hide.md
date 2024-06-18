---
'fumadocs-openapi': major
---

**Support Custom MDX Renderer.**

**why:** Allow people to customise how the MDX file is generated.

**migrate:**

Changed the output of MDX files, the new structure requires components:

- Root
- API
- APIInfo
- APIExample
- ResponseTabs
- ResponseTab
- ExampleResponse
- TypeScriptResponse
- Property
- ObjectCollapsible

````mdx
<API>

<APIInfo method={"GET"} route={"/pets"}>

## List all pets

### Query Parameters

<Property name={"limit"} type={"integer"} required={false} deprecated={false}>

How many items to return at one time (max 100)

</Property>

| Status code | Description |
| ----------- | ----------- |
| `200` | A paged array of pets |
| `default` | unexpected error |

</APIInfo>

<APIExample>

```bash title="curl"
curl -X GET "http://petstore.swagger.io/pets"
```

<ResponseTabs items={["200","default"]}>

<ResponseTab value={"200"}>

<ExampleResponse>

```json
[
  {
    "id": 0,
    "name": "string",
    "tag": "string"
  }
]
```

</ExampleResponse>

<TypeScriptResponse>

```ts
/**
 * @maxItems 100
 */
export type Response = {
  id: number;
  name: string;
  tag?: string;
}[];
```

</TypeScriptResponse>

</ResponseTab>

</ResponseTabs>

</APIExample>

</API>
````
