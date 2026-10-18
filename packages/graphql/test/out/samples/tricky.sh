curl -X POST 'https://api.example.com/graphql' \
  -H 'Content-Type: application/json' \
  -H 'X-Tricky: "dq" '\''sq'\'' \ `tick` ${x} $HOME !bang "#' \
  -d '{
  "query": "# `backticks` ${x} $HOME !bang '\''single'\'' \"double\" \\ \"# \"##\nquery Tricky($text: String! = \"say \\\"hi\\\" \\\\ ${x}\") {\n  echo(text: \"日本語 🎉 \\n é '\''single'\'' `tick` $HOME !bang\")\n  block: echo(text: \"\"\"\n    \"quoted\" \\\"\"\" escaped, \\\"\"\"\" four quotes, \"#\"## end with a quote \"\n  \"\"\")\n  empty: echo(text: \"\"\"\"\"\")\n}\n# ends with a quote \"",
  "variables": {
    "text": "q\"uote '\''single'\'' \\ `tick` ${x} $HOME !bang \"# \"## \"\"\" é 🎉\nnewline",
    "large": 2147483648,
    "list": [
      true,
      null,
      10.5
    ]
  }
}'