import requests

query = """# `backticks` ${x} $HOME !bang 'single' "double" \\ "# "##
query Tricky($text: String! = "say \\"hi\\" \\\\ ${x}") {
  echo(text: "日本語 🎉 \\n é 'single' `tick` $HOME !bang")
  block: echo(text: \"""
    "quoted" \\\""" escaped, \\\"\""" four quotes, "#"## end with a quote "
  \""")
  empty: echo(text: \"\"\"\""")
}
# ends with a quote \""""

variables = {
    "text": "q\"uote 'single' \\ `tick` ${x} $HOME !bang \"# \"## \"\"\" é 🎉\nnewline",
    "large": 2147483648,
    "list": [
        True,
        None,
        10.5
    ]
}

response = requests.post(
    "https://api.example.com/graphql",
    json={"query": query, "variables": variables},
    headers={"X-Tricky": "\"dq\" 'sq' \\ `tick` ${x} $HOME !bang \"#"},
)

print(response.json())