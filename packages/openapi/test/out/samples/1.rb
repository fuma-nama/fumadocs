require 'net/http'

uri = URI('http://localhost:8080/hello_world?search=ai')
body = '{
  "id": "id",
  "note": "it\'s \\"quoted\\" \\\\ `a` ${b}"
}'
request = Net::HTTP::Get.new(uri)
request['authorization'] = 'Bearer'
request['if-none-match'] = '"etag"'
request['Cookie'] = 'mode=light'
request['Content-Type'] = 'application/json'
request.body = body

response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|
  http.request(request)
end

puts response.body