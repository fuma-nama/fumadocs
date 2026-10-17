const body = `  "quoted" """" \`\${x}\` \\ "# 
	tabbed	
ends with ""`

fetch("http://localhost:8080/hello_world?search=ai", {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    "authorization": "Bearer",
    "if-none-match": "\"etag\"",
    "cookie": "mode=light"
  },
  body
})