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

| Status code | Description |
| ----------- | ----------- |
| `200` | Expected response to a valid request |
| `default` | unexpected error |

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
