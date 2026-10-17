const query = `# \`backticks\` \${x} $HOME !bang 'single' "double" \\ "# "##
query Tricky($text: String! = "say \\"hi\\" \\\\ \${x}") {
  echo(text: "日本語 🎉 \\n é 'single' \`tick\` $HOME !bang")
  block: echo(text: """
    "quoted" \\""" escaped, \\"""" four quotes, "#"## end with a quote "
  """)
  empty: echo(text: """""")
}
# ends with a quote "`;

const variables = {
  "text": "q\"uote 'single' \\ `tick` ${x} $HOME !bang \"# \"## \"\"\" é 🎉\nnewline",
  "large": 2147483648,
  "list": [
    true,
    null,
    10.5
  ]
};

const response = await fetch("https://api.example.com/graphql", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Tricky": "\"dq\" 'sq' \\ `tick` ${x} $HOME !bang \"#"
  },
  body: JSON.stringify({ query, variables }),
});

console.log(await response.json());