---
'fumadocs-mdx': major
---

**Enable `remark-image` plugin by default**

You can add image embeds easily. They will be converted to static image imports.

```mdx
![banner](/image.png)
```

Become: 

```mdx
import img_banner from "../../public/image.png"

<img alt='banner' src={img_banner} />
```